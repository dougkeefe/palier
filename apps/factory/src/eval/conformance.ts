import { openAiProvider, PROMPT_VERSION } from "@palier/adapters/openai";
import type { FetchLike } from "@palier/adapters/openai";
import type { ExaminerTurnRequest, GenerateItemsRequest, ReviewRequest, WritingRequest } from "@palier/domain";

/**
 * The eval harness's schema-conformance rate (Phase 4 CI gate, progress.md D112): of the calls
 * the live API answered, the share whose **first reply** the adapter accepts, with no retry. A
 * retry's own reply is replayed too (the gate holds it), but it is not a first try, so it never
 * counts toward the rate: a prompt whose first replies all fail scores 0, however well the
 * retries do. A run in which a call failed outright is never recorded (the recorder stops). The fixtures are `@palier/testing`'s recorded runs, read by path (`loadRecordedRuns`),
 * because the factory may import only domain and the openai adapter. The headline rate is over
 * the runs recorded on the prompts that ship (`PROMPT_VERSION`); older runs are reported beside
 * it, so a prompt fix shows as a before and after.
 */

/**
 * The methods whose replies are a prompt's structured output, and so have a conformance rate.
 * The examiner joined with Phase 5 Slice 2 (progress.md D117).
 */
export const CONFORMANCE_METHODS = ["generateItems", "reviewItem", "assessWriting", "examinerTurn"] as const;
export type ConformanceMethod = (typeof CONFORMANCE_METHODS)[number];

/**
 * Every method the recorder keeps. A transcription and a voice are recorded too, for the
 * adapter's replay gate, but no prompt writes them, so they have no conformance rate (D117).
 */
export const RECORDED_METHODS = [...CONFORMANCE_METHODS, "transcribe", "speak"] as const;
export type RecordedMethod = (typeof RECORDED_METHODS)[number];

const conformanceMethods: ReadonlySet<RecordedMethod> = new Set(CONFORMANCE_METHODS);

/** A recorded completion as the factory reads it: only what a replay needs. */
export type RecordedCompletionData = {
  readonly method: RecordedMethod;
  readonly model: string;
  /** 1 for a call's first reply, 2 for the adapter's one retry. */
  readonly attempt: number;
  readonly request: unknown;
  readonly content: string;
  readonly usage: { readonly prompt_tokens: number; readonly completion_tokens: number };
};

/** A completion a prompt wrote, which is what a conformance rate is over. */
export type StructuredCompletionData = RecordedCompletionData & { readonly method: ConformanceMethod };

export type RecordedRunData = {
  readonly file: string;
  readonly promptVersion: string;
  readonly completions: readonly RecordedCompletionData[];
};

/** First replies, how many the adapter accepted, and the share; `rate` is null when nothing was measured. */
export type ConformanceCount = { readonly total: number; readonly conformant: number; readonly rate: number | null };

export type ConformanceReport = {
  readonly promptVersion: string;
  /** The runs the headline is measured on: those recorded on `promptVersion`. */
  readonly measuredOn: readonly string[];
  readonly byMethod: Readonly<Record<ConformanceMethod, ConformanceCount>>;
  /** Null when no run was recorded on `promptVersion`: nothing measured is not the same as all refused. */
  readonly rate: number | null;
  /** Runs on older prompts, each with its own count. */
  readonly earlier: readonly (ConformanceCount & { readonly file: string; readonly promptVersion: string })[];
};

/** Whether the adapter accepts this structured completion, as it arrived, with no retry. */
export const acceptsOnFirstTry = async (completion: StructuredCompletionData): Promise<boolean> => {
  const fetchImpl: FetchLike = () =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ choices: [{ message: { content: completion.content } }], usage: completion.usage }),
      text: () => Promise.resolve(""),
    });
  const { model } = completion;
  const provider = openAiProvider({
    apiKey: "sk-replay-not-a-key",
    models: { passage: model, draft: model, review: model, assess: model, examiner: model },
    fetchImpl,
    maxRetries: 0,
  });
  const calls: Readonly<Record<ConformanceMethod, () => Promise<unknown>>> = {
    generateItems: () => provider.generateItems(completion.request as GenerateItemsRequest),
    reviewItem: () => provider.reviewItem(completion.request as ReviewRequest),
    assessWriting: () => provider.assessWriting(completion.request as WritingRequest),
    examinerTurn: () => provider.examinerTurn(completion.request as ExaminerTurnRequest),
  };
  const call = calls[completion.method];
  return call().then(
    () => true,
    () => false,
  );
};

const countOf = (verdicts: readonly boolean[]): ConformanceCount => {
  const conformant = verdicts.filter(Boolean).length;
  return { total: verdicts.length, conformant, rate: verdicts.length === 0 ? null : conformant / verdicts.length };
};

export const schemaConformance = async (
  runs: readonly RecordedRunData[],
  promptVersion: string = PROMPT_VERSION,
): Promise<ConformanceReport> => {
  const judged = await Promise.all(
    runs.map(async (run) => ({
      run,
      // First replies only: a retry is the adapter recovering, not the prompt conforming.
      verdicts: await Promise.all(
        run.completions
          .filter((c): c is StructuredCompletionData => c.attempt === 1 && conformanceMethods.has(c.method))
          .map(async (c) => ({ method: c.method, ok: await acceptsOnFirstTry(c) })),
      ),
    })),
  );
  const current = judged.filter((j) => j.run.promptVersion === promptVersion);
  const all = current.flatMap((j) => j.verdicts);
  const byMethod = Object.fromEntries(
    CONFORMANCE_METHODS.map((method) => [method, countOf(all.filter((v) => v.method === method).map((v) => v.ok))]),
  ) as Record<ConformanceMethod, ConformanceCount>;
  return {
    promptVersion,
    measuredOn: current.map((j) => j.run.file).sort(),
    byMethod,
    rate: countOf(all.map((v) => v.ok)).rate,
    earlier: judged
      .filter((j) => j.run.promptVersion !== promptVersion)
      .map((j) => ({ file: j.run.file, promptVersion: j.run.promptVersion, ...countOf(j.verdicts.map((v) => v.ok)) }))
      .sort((a, b) => (a.file < b.file ? -1 : 1)),
  };
};
