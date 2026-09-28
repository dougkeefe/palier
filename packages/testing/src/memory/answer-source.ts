import type { AnswerSource, CandidateAnswer, ExaminerQuestion } from "@palier/app";

export type MemoryAnswerSource = {
  readonly answers: AnswerSource;
  /** Every question the candidate was shown, in order. */
  readonly questions: () => readonly ExaminerQuestion[];
  /** Let `count` more scripted answers be given as they are asked for. */
  readonly release: (count: number) => void;
  /** Resolves once the source is waiting and has nothing it may give. */
  readonly idle: () => Promise<void>;
  /** Refuse the answer being waited for, and every later one, as a microphone that went away would. */
  readonly fail: (error: Error) => void;
};

type Waiting = { readonly resolve: (answer: CandidateAnswer) => void; readonly reject: (error: unknown) => void };

/**
 * A scripted candidate for the turn-based transport (progress.md D118): each question is
 * answered with the next scripted answer, once it is released (all of them, unless
 * `released` says fewer), and otherwise waits. A wait rejects when the transport aborts it,
 * as the port says, or when `fail` is called. Clock-free and vitest-free, like every memory
 * double.
 */
export const memoryAnswerSource = (
  script: readonly CandidateAnswer[],
  options: { readonly released?: number } = {},
): MemoryAnswerSource => {
  const left = [...script];
  const questions: ExaminerQuestion[] = [];
  let allowed = options.released ?? script.length;
  let waiting: Waiting | null = null;
  let failure: Error | null = null;
  let quiet: (() => void)[] = [];

  // Only ever reached with nothing it may give: `giveIfAllowed` hands over an answer it can.
  const settleQuiet = (): void => {
    if (waiting === null) return;
    for (const done of quiet.splice(0)) done();
  };

  const giveIfAllowed = (): void => {
    if (waiting === null) return;
    if (failure !== null) {
      const current = waiting;
      waiting = null;
      current.reject(failure);
      return;
    }
    const next = allowed > 0 ? left.shift() : undefined;
    if (next === undefined) {
      settleQuiet();
      return;
    }
    allowed -= 1;
    const current = waiting;
    waiting = null;
    current.resolve(next);
  };

  return {
    answers: {
      answer: (question, signal) =>
        new Promise<CandidateAnswer>((resolve, reject) => {
          questions.push(question);
          waiting = { resolve, reject };
          signal.addEventListener(
            "abort",
            () => {
              waiting = null;
              reject(new Error("The session stopped waiting for an answer."));
            },
            { once: true },
          );
          giveIfAllowed();
        }),
    },
    questions: () => questions,
    release: (count) => {
      allowed += count;
      giveIfAllowed();
    },
    idle: () =>
      new Promise<void>((resolve) => {
        quiet = [...quiet, resolve];
        settleQuiet();
      }),
    fail: (error) => {
      failure = error;
      giveIfAllowed();
    },
  };
};
