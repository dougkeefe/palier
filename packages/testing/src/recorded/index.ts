import type {
  ExaminerTurnRequest,
  GenerateItemsRequest,
  Lang,
  OralRequest,
  ReviewRequest,
  SpeechRequest,
  WritingRequest,
} from "@palier/domain";

import assessWriting from "./openai/assessWriting.json" with { type: "json" };
import examinerTurn from "./openai/examinerTurn.json" with { type: "json" };
import generateItems from "./openai/generateItems.json" with { type: "json" };
import reviewItemPromptV3 from "./openai/reviewItem-prompt-v3.json" with { type: "json" };
import reviewItem from "./openai/reviewItem.json" with { type: "json" };
import speak from "./openai/speak.json" with { type: "json" };
import transcribe from "./openai/transcribe.json" with { type: "json" };

/**
 * The AI schema-conformance fixtures (Phase 4 CI gates, progress.md D112): completions recorded
 * from the live API by `pnpm --filter @palier/web live-smoke --record`, never hand-written. Each
 * keeps the port request it answered, the message content exactly as it arrived, the tokens it
 * billed, and whether the adapter accepted it without a retry.
 *
 * The adapter's fast-lane test replays every one and requires the same verdict, so a schema or
 * adapter change that would refuse real model output (or accept what it refused) fails CI. The
 * factory's eval reads the same files by path for its conformance rate, since it may not import
 * this package.
 *
 * The turn loop's three joined with Phase 5 Slice 2 (progress.md D117). An `examinerTurn` is a
 * completion like the others. A `transcribe` keeps the transcription's JSON body as it arrived, and
 * its request describes the clip rather than carrying it: no audio is ever committed. A `speak`
 * keeps what arrived as `{ "contentType", "bytes" }`, for the same reason.
 *
 * `assessOral` joins with Slice 3 (progress.md D122), and is **not recorded yet**: the nightly
 * smoke's call becomes `assessOral.json`, and the stability recording's five `assessOral-stability.json`,
 * each when the human first runs it on a funded key. A fixture is recorded, never hand-written (D112).
 */

/** A transcription's request as recorded: the clip described, never kept (D117). */
export type RecordedTranscribeRequest = {
  readonly lang: Lang;
  readonly durationMs: number;
  readonly audio: { readonly type: string; readonly bytes: number };
};

/** What a recorded voice answered with: its content type and its size, not its audio (D117). */
export type RecordedSpeech = { readonly contentType: string; readonly bytes: number };

/** One completion as OpenAI sent it. The web recorder writes this shape. */
export type RecordedCompletion = {
  readonly method: "generateItems" | "reviewItem" | "assessWriting" | "examinerTurn" | "transcribe" | "speak" | "assessOral";
  readonly model: string;
  /** The port request the call was made with, so a replay makes the same call. */
  readonly request:
    | GenerateItemsRequest
    | ReviewRequest
    | WritingRequest
    | ExaminerTurnRequest
    | RecordedTranscribeRequest
    | SpeechRequest
    | OralRequest;
  /** 1 for the first completion of a call, 2 for the adapter's one retry. */
  readonly attempt: number;
  /**
   * The message content exactly as it arrived: what the adapter parses. A transcription's whole
   * JSON body; a voice's `RecordedSpeech` as JSON.
   */
  readonly content: string;
  readonly usage: { readonly prompt_tokens: number; readonly completion_tokens: number };
  /** Whether the adapter accepted this completion without a retry. */
  readonly conformant: boolean;
};

/** One recorded file: the run it came from and its completions. */
export type RecordedRun = {
  readonly file: string;
  readonly recordedAt: string;
  /** The adapter's `PROMPT_VERSION` when it was recorded, so a rate can describe the prompts that ship. */
  readonly promptVersion: string;
  readonly completions: readonly RecordedCompletion[];
};

const METHODS = new Set(["generateItems", "reviewItem", "assessWriting", "examinerTurn", "transcribe", "speak", "assessOral"]);

/** A hand edit, or a recorder that changed shape, fails here rather than as a confusing replay. */
export const runOf = (file: string, raw: unknown): RecordedRun => {
  const { recordedAt, promptVersion, completions } = raw as { recordedAt?: unknown; promptVersion?: unknown; completions?: unknown };
  if (typeof recordedAt !== "string" || typeof promptVersion !== "string" || !Array.isArray(completions)) {
    throw new Error(`${file} is not a recorded run`);
  }
  for (const [index, c] of (completions as Partial<Record<keyof RecordedCompletion, unknown>>[]).entries()) {
    if (
      !METHODS.has(c.method as string) ||
      typeof c.model !== "string" ||
      typeof c.content !== "string" ||
      typeof c.conformant !== "boolean" ||
      typeof c.attempt !== "number" ||
      typeof c.request !== "object" ||
      c.request === null
    ) {
      throw new Error(`${file}: completion ${String(index)} is not a recorded completion`);
    }
  }
  return { file, recordedAt, promptVersion, completions: completions as RecordedCompletion[] };
};

/** Every recorded run, the prompt-version-3 reviews that found the band-scale defect included. */
export const RECORDED_RUNS: readonly RecordedRun[] = [
  runOf("generateItems.json", generateItems),
  runOf("reviewItem.json", reviewItem),
  runOf("reviewItem-prompt-v3.json", reviewItemPromptV3),
  runOf("assessWriting.json", assessWriting),
  runOf("examinerTurn.json", examinerTurn),
  runOf("transcribe.json", transcribe),
  runOf("speak.json", speak),
];

/** Every recorded completion, across the runs. */
export const recordedCompletions = (): readonly RecordedCompletion[] => RECORDED_RUNS.flatMap((run) => run.completions);
