import { openAiProvider, PROMPT_VERSION } from "@palier/adapters/openai";
import type { FetchLike } from "@palier/adapters/openai";
import type { GenerateItemsRequest, ReviewRequest, WritingRequest } from "@palier/domain";

/**
 * The eval harness's schema-conformance rate (Phase 4 CI gate, progress.md D112): of the
 * completions the live API really sent, the share the adapter accepts on the first try, with no
 * retry. The fixtures are `@palier/testing`'s recorded runs, read by path (`loadRecordedRuns`),
 * because the factory may import only domain and the openai adapter. The headline rate is over
 * the runs recorded on the prompts that ship (`PROMPT_VERSION`); older runs are reported beside
 * it, so a prompt fix shows as a before and after.
 */

export const CONFORMANCE_METHODS = ["generateItems", "reviewItem", "assessWriting"] as const;
export type ConformanceMethod = (typeof CONFORMANCE_METHODS)[number];

/** A recorded completion as the factory reads it: only what a replay needs. */
export type RecordedCompletionData = {
  readonly method: ConformanceMethod;
  readonly model: string;
  readonly request: unknown;
  readonly content: string;
  readonly usage: { readonly prompt_tokens: number; readonly completion_tokens: number };
};

export type RecordedRunData = {
  readonly file: string;
  readonly promptVersion: string;
  readonly completions: readonly RecordedCompletionData[];
};

export type ConformanceCount = { readonly total: number; readonly conformant: number; readonly rate: number };

export type ConformanceReport = {
  readonly promptVersion: string;
  /** The runs the headline is measured on: those recorded on `promptVersion`. */
  readonly measuredOn: readonly string[];
  readonly byMethod: Readonly<Record<ConformanceMethod, ConformanceCount>>;
  readonly rate: number;
  /** Runs on older prompts, each with its own count. */
  readonly earlier: readonly (ConformanceCount & { readonly file: string; readonly promptVersion: string })[];
};

/** Whether the adapter accepts this completion, as it arrived, with no retry. */
export const acceptsOnFirstTry = async (completion: RecordedCompletionData): Promise<boolean> => {
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
    models: { passage: model, draft: model, review: model, assess: model },
    fetchImpl,
    maxRetries: 0,
  });
  const call =
    completion.method === "generateItems"
      ? () => provider.generateItems(completion.request as GenerateItemsRequest)
      : completion.method === "reviewItem"
        ? () => provider.reviewItem(completion.request as ReviewRequest)
        : () => provider.assessWriting(completion.request as WritingRequest);
  return call().then(
    () => true,
    () => false,
  );
};

const countOf = (verdicts: readonly boolean[]): ConformanceCount => {
  const conformant = verdicts.filter(Boolean).length;
  return { total: verdicts.length, conformant, rate: verdicts.length === 0 ? 0 : conformant / verdicts.length };
};

export const schemaConformance = async (
  runs: readonly RecordedRunData[],
  promptVersion: string = PROMPT_VERSION,
): Promise<ConformanceReport> => {
  const judged = await Promise.all(
    runs.map(async (run) => ({
      run,
      verdicts: await Promise.all(run.completions.map(async (c) => ({ method: c.method, ok: await acceptsOnFirstTry(c) }))),
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
