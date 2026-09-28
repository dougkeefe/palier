import type { AnswerSource, CandidateAnswer, ExaminerQuestion } from "@palier/app";

/** What the screen is told: the question waiting for an answer, or none while the examiner works. */
export type Waiting = ExaminerQuestion | null;

export type AnswerBridge = {
  /** The `AnswerSource` the practice session is started with. */
  readonly source: AnswerSource;
  /** Hear each question as it comes to wait for an answer, and `null` once it stops waiting. */
  readonly subscribe: (listener: (waiting: Waiting) => void) => () => void;
  /** Give the waiting question its answer. False when no question waits, so a late tap does nothing. */
  readonly submit: (answer: CandidateAnswer) => boolean;
};

/**
 * The browser's `AnswerSource` (progress.md D118, D119): a bridge between the practice session,
 * which asks and waits, and the screen, which shows the question and hands back the recorder's
 * clip or the typed words. Plain data and callbacks, so it is tested without a DOM; the recording
 * itself is `lib/oral/recorder.ts`'s.
 */
export const answerBridge = (): AnswerBridge => {
  let pending: { readonly resolve: (answer: CandidateAnswer) => void } | null = null;
  const listeners = new Set<(waiting: Waiting) => void>();
  const publish = (waiting: Waiting) => {
    for (const listener of listeners) listener(waiting);
  };
  return {
    source: {
      answer: (question, signal) =>
        new Promise<CandidateAnswer>((resolve, reject) => {
          const mine = { resolve };
          pending = mine;
          signal.addEventListener(
            "abort",
            () => {
              if (pending === mine) {
                pending = null;
                publish(null);
              }
              reject(new Error("The session stopped waiting for an answer."));
            },
            { once: true },
          );
          publish(question);
        }),
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    submit: (answer) => {
      const current = pending;
      if (current === null) return false;
      pending = null;
      publish(null);
      current.resolve(answer);
      return true;
    },
  };
};
