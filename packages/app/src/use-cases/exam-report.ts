import type { ExamForm, ExamProfile, Item, ItemId, SessionId } from "@palier/domain";
import { type ExamResult, scheduleReview } from "@palier/engine";

import type { Clock, ExamRun, ExamRunStore, ItemRepository, ScheduleStore } from "../ports/index.js";
import { UnknownItemError } from "./answer-item.js";
import { descending, formOf } from "./exam-run.js";
import { rescoreExam } from "./submit-exam.js";

/**
 * What the results screen and the readiness card read about submitted mock exams
 * (product-requirements.md §8.2 zone A, §8.5), and the one write the results
 * screen makes: "add to review queue".
 *
 * Every result here is rescored from the stored run (ADR 16). Nothing is cached,
 * so a result read here always equals the one `submitExam` returned.
 */

export type ExamReportRequest = {
  readonly runId: SessionId;
};

/**
 * There is deliberately no "which items are queued" here. A submit queues wrong
 * scored answers and never a pilot (D41), so any screen keyed to the queue would
 * single out the wrong pilots, and pilots are never revealed (D84 ruling 9, D89).
 */
export type ExamReportDeps = {
  readonly items: ItemRepository;
  readonly examRuns: ExamRunStore;
};

export type ExamReport = {
  readonly run: ExamRun;
  readonly form: ExamForm;
  /** The form's items as the bank holds them, in form order. */
  readonly items: readonly Item[];
  readonly result: ExamResult;
  /**
   * Another run on the same form was submitted before this one. The candidate has
   * seen these items, so the result reads high (D84, ruling 2).
   */
  readonly retake: boolean;
};

/**
 * Everything the results screen shows for one submitted run. An unknown or
 * unsubmitted run throws, as `rescoreExam` does.
 */
export const examReport = async (request: ExamReportRequest, deps: ExamReportDeps): Promise<ExamReport> => {
  const result = await rescoreExam(request, deps);
  // rescoreExam has just read and checked the run, so it is present and submitted.
  const run = (await deps.examRuns.get(request.runId)) as ExamRun;
  const form = await formOf(run.formId, deps.items);
  // `byIds` answers in the order asked (the ItemRepository contract), so this is form order.
  const items = await deps.items.byIds(form.itemIds);

  const submittedAt = run.submittedAt as string;
  const retake = (await deps.examRuns.all()).some(
    (other) =>
      other.id !== run.id &&
      other.formId === run.formId &&
      other.submittedAt !== null &&
      (other.submittedAt < submittedAt || (other.submittedAt === submittedAt && other.id < run.id)),
  );

  return { run, form, items, result, retake };
};

export type LatestExamResult = {
  readonly run: ExamRun;
  readonly form: ExamForm;
  readonly result: ExamResult;
};

/**
 * The most recently submitted mock exam, rescored, or null when there is none:
 * the readiness card's exam half, "C, 39 of 50. C starts at 38." (§8.2). A run
 * whose form, or any of whose items, has left the bank cannot be scored and is
 * passed over, so one such run can never take the home screen down with it (D89).
 */
export const latestExamResult = async (
  deps: Pick<ExamReportDeps, "items" | "examRuns">,
): Promise<LatestExamResult | null> => {
  const submitted = (await deps.examRuns.all())
    .filter((run) => run.submittedAt !== null)
    .sort((a, b) => descending(a.submittedAt as string, b.submittedAt as string) || descending(a.id, b.id));

  for (const run of submitted) {
    const form = await deps.items.form(run.formId);
    if (form === null) continue;
    const bank = await deps.items.byIds(form.itemIds);
    if (bank.length !== form.itemIds.length) continue;
    const result = await rescoreExam({ runId: run.id }, deps);
    return { run, form, result };
  }
  return null;
};

/** Every exam form the bank ships, for the exam picker. */
export const examForms = async (deps: Pick<ExamReportDeps, "items">): Promise<readonly ExamForm[]> =>
  deps.items.forms();

export type QueueForReviewRequest = {
  readonly itemId: ItemId;
};

export type QueueForReviewDeps = {
  readonly clock: Clock;
  readonly items: ItemRepository;
  readonly schedule: ScheduleStore;
  readonly profile: ExamProfile;
};

/**
 * Put an item in the review queue from the results screen (§8.5: "one-tap add
 * to review queue"). The entry is the one a wrong answer gets: box 1, due after
 * the profile's first interval (ADR 8). An item already queued is left alone,
 * so a second tap cannot reset its box. A retired item is reopened.
 *
 * Returns whether the item was newly queued.
 */
export const queueForReview = async (
  request: QueueForReviewRequest,
  deps: QueueForReviewDeps,
): Promise<boolean> => {
  const existing = await deps.schedule.get(request.itemId);
  if (existing !== null && existing.due !== null) return false;

  const [item] = await deps.items.byIds([request.itemId]);
  if (item === undefined) throw new UnknownItemError(request.itemId);

  const review = scheduleReview(
    deps.profile,
    1,
    { correct: false, changedAnswer: false, slow: false },
    deps.clock.now(),
  );
  await deps.schedule.put({ itemId: item.id, due: review.due, skill: item.skill, box: review.box });
  return true;
};
