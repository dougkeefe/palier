import type { Lang, TargetBand, WritingPrompt } from "@palier/domain";

import type { IdGenerator, WritingStore, WritingSubmission } from "../ports/index.js";
import { type MeteredAiDeps, withAiProvider } from "./api-key.js";

/**
 * The writing workshop (product-requirements.md §8.7, progress.md D105–D108). Writing is
 * saved first and assessed second, so a failed call keeps the text and the request can be
 * made again with the same submission. Submissions stay on the device [R12]: the store is
 * never synced or exported (D106).
 */

export type WritingDeps = {
  /** The prompt library, parsed once at the composition root (D107). */
  readonly prompts: readonly WritingPrompt[];
  readonly writing: WritingStore;
};

export type SaveWritingDeps = WritingDeps & {
  readonly ids: IdGenerator;
  readonly clock: MeteredAiDeps["clock"];
};

export type WritingFeedbackDeps = WritingDeps & MeteredAiDeps;

export type SaveWritingRequest = {
  readonly promptId: string;
  readonly text: string;
};

export type WritingFeedbackRequest = {
  readonly submissionId: string;
  readonly targetBand: TargetBand;
  /** The interface language, which the evidence and rules are written in. */
  readonly feedbackLang: Lang;
};

/** A submission or a save names a prompt the library does not have. */
export class UnknownWritingPromptError extends Error {
  constructor(promptId: string) {
    super(`No writing prompt has the id "${promptId}".`);
    this.name = "UnknownWritingPromptError";
  }
}

/** Feedback was asked for a submission this device does not hold. */
export class UnknownWritingSubmissionError extends Error {
  constructor(submissionId: string) {
    super(`No writing submission has the id "${submissionId}".`);
    this.name = "UnknownWritingSubmissionError";
  }
}

/** There is nothing to assess: the text is empty or only whitespace. */
export class EmptyWritingError extends Error {
  constructor() {
    super("There is no writing to assess.");
    this.name = "EmptyWritingError";
  }
}

const promptOf = (deps: WritingDeps, promptId: string): WritingPrompt => {
  const prompt = deps.prompts.find((candidate) => candidate.id === promptId);
  if (prompt === undefined) throw new UnknownWritingPromptError(promptId);
  return prompt;
};

/** The library, in the order it is authored. */
export const writingPrompts = (deps: Pick<WritingDeps, "prompts">): readonly WritingPrompt[] =>
  deps.prompts;

/**
 * Keep a piece of writing as a new, unassessed submission. Every save is new, because an
 * assessment's offsets point into the exact text it assessed (D106). The text is kept as
 * written; only a text that is all whitespace is refused.
 */
export const saveWriting = async (
  request: SaveWritingRequest,
  deps: SaveWritingDeps,
): Promise<WritingSubmission> => {
  promptOf(deps, request.promptId);
  if (request.text.trim() === "") throw new EmptyWritingError();
  const submission: WritingSubmission = {
    id: deps.ids.ulid(),
    promptId: request.promptId,
    text: request.text,
    writtenAt: deps.clock.now(),
    assessment: null,
  };
  await deps.writing.put(submission);
  return submission;
};

/**
 * Ask for feedback on a saved submission: one `assessWriting` call through
 * `withAiProvider`, so it is metered as `writing-feedback` (D101), then the assessment is
 * stored with the submission. If the call fails it rethrows and the submission stays
 * unassessed. A submission that already has feedback returns it and spends nothing, so a
 * double tap never pays twice.
 */
export const requestWritingFeedback = async (
  request: WritingFeedbackRequest,
  deps: WritingFeedbackDeps,
): Promise<WritingSubmission> => {
  const submission = await deps.writing.get(request.submissionId);
  if (submission === null) throw new UnknownWritingSubmissionError(request.submissionId);
  if (submission.assessment !== null) return submission;
  const prompt = promptOf(deps, submission.promptId);
  const assessment = await withAiProvider(deps, "writing-feedback", (ai) =>
    ai.assessWriting({
      task: prompt.task,
      wordTarget: prompt.wordTarget,
      text: submission.text,
      targetBand: request.targetBand,
      lang: prompt.lang,
      feedbackLang: request.feedbackLang,
    }),
  );
  const assessed: WritingSubmission = { ...submission, assessment };
  await deps.writing.put(assessed);
  return assessed;
};

/** This device's submissions, newest first. */
export const writingHistory = (deps: Pick<WritingDeps, "writing">): Promise<readonly WritingSubmission[]> =>
  deps.writing.all();
