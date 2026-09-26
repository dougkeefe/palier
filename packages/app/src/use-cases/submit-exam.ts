import type { ExamProfile, ItemId, ItemResponse, SessionId } from "@palier/domain";
import { attemptId } from "@palier/domain";
import { type ExamResult, scoreExam } from "@palier/engine";

import type {
  AttemptStore,
  Clock,
  ExamAnswer,
  ExamRun,
  ExamRunStore,
  ItemRepository,
  ScheduleStore,
  TelemetryStore,
} from "../ports/index.js";
import { recordHash } from "../sync/records.js";
import { answerItem, recordAttempt } from "./answer-item.js";
import { examTelemetryEvents } from "./exam-telemetry-events.js";
import { UnknownExamRunError, formOf, laterElapsed } from "./exam-run.js";

/**
 * The closing half of a mock exam: submit a run, and rescore a submitted one.
 *
 * **The result is never stored** (ADR 16). `submitExam` returns what
 * `rescoreExam` computes, and a later reader rescores. That is safe because a
 * form, and the `bandCuts` it carries, never change, and `scoreExam` is pure.
 * It is also what makes scoring idempotent (Phase 3 exit criterion 4): the
 * stored run is the only input.
 */

export type RescoreExamRequest = {
  readonly runId: SessionId;
};

export type RescoreExamDeps = {
  readonly items: ItemRepository;
  readonly examRuns: ExamRunStore;
};

/** Only a submitted run has a result. An in-progress one is still changing. */
export class ExamNotSubmittedError extends Error {
  constructor(readonly runId: SessionId) {
    super(`Exam run ${runId} has not been submitted, so it has no result yet.`);
    this.name = "ExamNotSubmittedError";
  }
}

const scoreRun = async (run: ExamRun, items: ItemRepository): Promise<ExamResult> => {
  const form = await formOf(run.formId, items);
  const bank = await items.byIds(form.itemIds);
  const responses = new Map<ItemId, ItemResponse>(run.answers.map((a) => [a.itemId, a.response]));
  return scoreExam(form, bank, responses);
};

/** Score a submitted run from what is stored. Two calls always agree. */
export const rescoreExam = async (
  request: RescoreExamRequest,
  deps: RescoreExamDeps,
): Promise<ExamResult> => {
  const run = await deps.examRuns.get(request.runId);
  if (run === null) throw new UnknownExamRunError(request.runId);
  if (run.submittedAt === null) throw new ExamNotSubmittedError(request.runId);
  return scoreRun(run, deps.items);
};

export type SubmitExamRequest = {
  readonly runId: SessionId;
  readonly elapsedMs: number;
};

export type SubmitExamDeps = RescoreExamDeps & {
  readonly clock: Clock;
  readonly attempts: AttemptStore;
  readonly schedule: ScheduleStore;
  readonly profile: ExamProfile;
  /** Where a submitted exam's events queue, when this device shares them (§15). */
  readonly telemetry?: TelemetryStore;
};

export type SubmitExamResult = {
  readonly run: ExamRun;
  readonly result: ExamResult;
};

/**
 * The attempt an exam answer becomes. Its id is derived, not minted
 * (progress.md D80): the run, the item, and a hash of the answer itself.
 *
 * - A retried submit derives the same ids, so it appends nothing twice (D44).
 * - Two devices that submit the same synced answers derive the same ids for
 *   byte-identical attempts, because the attempt's `ts` is the answer's
 *   `answeredAt` and not the moment of submission.
 * - Two devices that submitted *different* answers to one item derive different
 *   ids. Both attempts are kept, as a union, and neither overwrites the other.
 *   Attempts are append-only, so one id carrying two contents could never
 *   converge.
 */
export const examAttemptId = (runId: SessionId, answer: ExamAnswer) =>
  attemptId(`${runId}:${answer.itemId}:${recordHash(answer)}`);

/**
 * Close a run: record its answers as attempts, then stamp `submittedAt` once.
 *
 * - **One attempt per answered item**, with `mode: "exam"`, stamped with the
 *   answer's `answeredAt`. An unanswered item has no response to record, and
 *   `scoreExam` counts it wrong.
 * - **Scored items go through `answerItem`**, so a wrong or wavering answer
 *   enters the review queue by the D41 rule. `slow` is false: an exam has no
 *   per-item speed judgement, and the caller owns that threshold (D40).
 * - **Pilot items record their attempt and are never scheduled.** D41 assigned
 *   this to SubmitExam, because only the form knows which items are pilots.
 * - **Attempts first, then the stamp.** If the device dies between the two, a
 *   retry replays the attempts as no-ops and then stamps. A submitted run, from
 *   this device or synced from another, replays the same way and keeps its first
 *   `submittedAt`.
 */
export const submitExam = async (
  request: SubmitExamRequest,
  deps: SubmitExamDeps,
): Promise<SubmitExamResult> => {
  const run = await deps.examRuns.get(request.runId);
  if (run === null) throw new UnknownExamRunError(request.runId);
  const form = await formOf(run.formId, deps.items);
  const pilots = new Set<ItemId>(form.pilotItemIds);

  for (const answer of run.answers) {
    // The attempt is stamped with when the answer was given, so it is the same record
    // on every device that submits it (D80).
    const at = { ...deps, clock: { now: () => answer.answeredAt } };
    const attempt = {
      attemptId: examAttemptId(run.id, answer),
      itemId: answer.itemId,
      response: answer.response,
      sessionId: run.id,
      mode: "exam" as const,
      msToFirstSelect: answer.msToFirstSelect,
      msToConfirm: answer.msToConfirm,
      changedAnswer: answer.changedAnswer,
    };
    // Sequential on purpose, so a replay writes in the same order as the first pass.
    if (pilots.has(answer.itemId)) {
      await recordAttempt(attempt, at);
    } else {
      await answerItem({ ...attempt, slow: false }, at);
    }
  }

  if (run.submittedAt !== null) return { run, result: await scoreRun(run, deps.items) };

  const now = deps.clock.now();
  const submitted: ExamRun = {
    ...run,
    elapsedMs: laterElapsed(run.elapsedMs, request.elapsedMs),
    checkpointedAt: now,
    submittedAt: now,
  };
  await deps.examRuns.put(submitted);
  const result = await scoreRun(submitted, deps.items);
  await queueTelemetry(submitted, result, deps);
  return { run: submitted, result };
};

/**
 * Queue the exam's telemetry, at the first submit only and only while this device
 * shares it (progress.md D92). A replay, or a run synced in already submitted, never
 * queues, so one device sends one exam once.
 *
 * **Telemetry never costs a submission.** The run is stored before this runs, and a
 * failure here is swallowed: the exam is the user's, the events are the bank's.
 */
const queueTelemetry = async (run: ExamRun, result: ExamResult, deps: SubmitExamDeps): Promise<void> => {
  const telemetry = deps.telemetry;
  if (telemetry === undefined) return;
  try {
    if ((await telemetry.consent()) !== "on") return;
    await telemetry.enqueue(examTelemetryEvents(run, result, await deps.items.bankVersion()));
  } catch {
    // Deliberately empty: see above.
  }
};
