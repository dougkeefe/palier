import type { ExamForm, FormId, ItemId, ItemResponse, SessionId } from "@palier/domain";

import type { Clock, ExamAnswer, ExamRun, ExamRunStore, ItemRepository } from "../ports/index.js";

/**
 * The in-progress half of a mock exam (implementation-plan.md §7 Phase 3): start
 * a run on a form, answer and flag its items, checkpoint the clock, and resume.
 * `submit-exam.ts` holds the other half.
 *
 * Four rules hold across every use case here:
 *
 * - **Every write is a checkpoint.** An answer or a flag carries the elapsed exam
 *   time and is persisted at once, because product-requirements.md §14 says
 *   "session state is checkpointed every item". `checkpointExam` is for the
 *   moments with no answer in them, such as a timer tick or the tab hiding.
 * - **Elapsed time never goes backwards.** A run keeps the larger of its stored
 *   `elapsedMs` and the one it is given, so a stale tab cannot give time back.
 * - **A submitted run is closed.** Any write to one throws, so an answer cannot
 *   land after the result has been seen.
 * - **The run id arrives in the request** (progress.md D39). Nothing here mints one.
 */

export type ExamRunDeps = {
  readonly clock: Clock;
  readonly items: ItemRepository;
  readonly examRuns: ExamRunStore;
};

/** The form id did not resolve in the bank. */
export class UnknownFormError extends Error {
  constructor(readonly formId: FormId) {
    super(`No exam form with id ${formId} is in the bank, so the exam cannot run on it.`);
    this.name = "UnknownFormError";
  }
}

/** The run id did not resolve in the store. */
export class UnknownExamRunError extends Error {
  constructor(readonly runId: SessionId) {
    super(`No exam run with id ${runId} exists.`);
    this.name = "UnknownExamRunError";
  }
}

/** A write reached a run that has already been submitted. */
export class ExamAlreadySubmittedError extends Error {
  constructor(readonly runId: SessionId) {
    super(`Exam run ${runId} has already been submitted, so it can no longer change.`);
    this.name = "ExamAlreadySubmittedError";
  }
}

/** An answer or a flag named an item that is not on the run's form. */
export class ExamItemNotOnFormError extends Error {
  constructor(
    readonly runId: SessionId,
    readonly itemId: ItemId,
  ) {
    super(`Item ${itemId} is not on the form of exam run ${runId}.`);
    this.name = "ExamItemNotOnFormError";
  }
}

/** Load a run that may still be written to, or throw. */
export const openRun = async (runId: SessionId, examRuns: ExamRunStore): Promise<ExamRun> => {
  const run = await examRuns.get(runId);
  if (run === null) throw new UnknownExamRunError(runId);
  if (run.submittedAt !== null) throw new ExamAlreadySubmittedError(runId);
  return run;
};

export const formOf = async (id: FormId, items: ItemRepository): Promise<ExamForm> => {
  const form = await items.form(id);
  if (form === null) throw new UnknownFormError(id);
  return form;
};

/**
 * The larger of the stored and the reported elapsed time. A negative or
 * non-finite report is a caller bug, not a clock reading, so it throws rather
 * than poisoning the run: `Math.max` with a `NaN` is `NaN`.
 */
export const laterElapsed = (stored: number, reported: number): number => {
  if (!Number.isFinite(reported) || reported < 0) {
    throw new RangeError(`An elapsed exam time of ${reported} ms is not a duration.`);
  }
  return Math.max(stored, reported);
};

const checkpoint = (run: ExamRun, elapsedMs: number, now: string): ExamRun => ({
  ...run,
  elapsedMs: laterElapsed(run.elapsedMs, elapsedMs),
  checkpointedAt: now,
});

const requireOnForm = async (run: ExamRun, itemId: ItemId, items: ItemRepository): Promise<void> => {
  const form = await formOf(run.formId, items);
  if (!form.itemIds.includes(itemId)) throw new ExamItemNotOnFormError(run.id, itemId);
};

export type StartExamRequest = {
  readonly runId: SessionId;
  readonly formId: FormId;
  /**
   * The multiplier on the form's time limit, such as 1.5 for extra time (D84,
   * ruling 3). Absent means 1. It is a study parameter, so it is a request field
   * (D42), and the value offered is the caller's product choice.
   */
  readonly timeAllowance?: number;
};

/** An allowance below 1 would shorten the exam, and a non-finite one would never end it. */
const checkAllowance = (allowance: number): void => {
  if (!Number.isFinite(allowance) || allowance < 1) {
    throw new RangeError(`A time allowance multiplies the time limit and is at least 1; got ${allowance}.`);
  }
};

/** The run's time limit, with its allowance, in milliseconds. */
export const runLimitMs = (run: ExamRun, form: ExamForm): number =>
  form.timeLimitMinutes * 60_000 * (run.timeAllowance ?? 1);

export type StartExamResult = {
  readonly run: ExamRun;
  readonly form: ExamForm;
};

/**
 * Open a run on a form, with no answers and no time used. A retried start with
 * the same run id returns the stored run instead of resetting it, so a double
 * tap can never wipe answers already given.
 *
 * An allowance of 1 is the default and is not written, so a run without extra
 * time is byte-identical to one written before allowances existed.
 */
export const startExam = async (
  request: StartExamRequest,
  deps: ExamRunDeps,
): Promise<StartExamResult> => {
  if (request.timeAllowance !== undefined) checkAllowance(request.timeAllowance);
  const form = await formOf(request.formId, deps.items);

  const existing = await deps.examRuns.get(request.runId);
  if (existing !== null) return { run: existing, form };

  const now = deps.clock.now();
  const run: ExamRun = {
    id: request.runId,
    formId: form.id,
    startedAt: now,
    answers: [],
    flagged: [],
    elapsedMs: 0,
    checkpointedAt: now,
    submittedAt: null,
    ...(request.timeAllowance !== undefined && request.timeAllowance !== 1
      ? { timeAllowance: request.timeAllowance }
      : {}),
  };
  await deps.examRuns.put(run);
  return { run, form };
};

export type AnswerExamItemRequest = {
  readonly runId: SessionId;
  readonly itemId: ItemId;
  readonly response: ItemResponse;
  readonly msToFirstSelect: number;
  readonly msToConfirm: number;
  /** The candidate changed their choice within the item before confirming. */
  readonly changedAnswer: boolean;
  readonly elapsedMs: number;
};

/**
 * Record or replace the answer to one item, checkpointing in the same write.
 *
 * `changedAnswer` is sticky. It is true when the request says so, when the item
 * already had a different answer, or when an earlier answer to it had already
 * wavered. Coming back to an item and settling on the first choice is still low
 * confidence (product-requirements.md §6.5).
 */
export const answerExamItem = async (
  request: AnswerExamItemRequest,
  deps: ExamRunDeps,
): Promise<ExamRun> => {
  const run = await openRun(request.runId, deps.examRuns);
  await requireOnForm(run, request.itemId, deps.items);

  const now = deps.clock.now();
  const previous = run.answers.find((a) => a.itemId === request.itemId);
  const answer: ExamAnswer = {
    itemId: request.itemId,
    response: request.response,
    msToFirstSelect: request.msToFirstSelect,
    msToConfirm: request.msToConfirm,
    changedAnswer:
      request.changedAnswer ||
      (previous !== undefined && (previous.changedAnswer || previous.response !== request.response)),
    answeredAt: now,
  };
  const answers =
    previous === undefined
      ? [...run.answers, answer]
      : run.answers.map((a) => (a.itemId === request.itemId ? answer : a));

  const next = checkpoint({ ...run, answers }, request.elapsedMs, now);
  await deps.examRuns.put(next);
  return next;
};

export type FlagExamItemRequest = {
  readonly runId: SessionId;
  readonly itemId: ItemId;
  /** Set rather than toggled, so a retried flag lands in the same state. */
  readonly flagged: boolean;
  readonly elapsedMs: number;
};

/** Flag an item for review before submitting, or clear its flag. */
export const flagExamItem = async (
  request: FlagExamItemRequest,
  deps: ExamRunDeps,
): Promise<ExamRun> => {
  const run = await openRun(request.runId, deps.examRuns);
  await requireOnForm(run, request.itemId, deps.items);

  const others = run.flagged.filter((id) => id !== request.itemId);
  const flagged = request.flagged ? [...others, request.itemId] : others;

  const next = checkpoint({ ...run, flagged }, request.elapsedMs, deps.clock.now());
  await deps.examRuns.put(next);
  return next;
};

export type CheckpointExamRequest = {
  readonly runId: SessionId;
  readonly elapsedMs: number;
};

/** Persist the elapsed exam time with nothing else changing. */
export const checkpointExam = async (
  request: CheckpointExamRequest,
  deps: Pick<ExamRunDeps, "clock" | "examRuns">,
): Promise<ExamRun> => {
  const run = await openRun(request.runId, deps.examRuns);
  const next = checkpoint(run, request.elapsedMs, deps.clock.now());
  await deps.examRuns.put(next);
  return next;
};

export type ResumeExamRequest = {
  /** The run to resume. Absent means the most recently started unsubmitted one. */
  readonly runId?: SessionId;
};

export type ResumeExamResult = {
  readonly run: ExamRun;
  readonly form: ExamForm;
  /**
   * Exam time left: the form's limit, times the run's allowance, less the elapsed
   * time, and never negative. It comes from `elapsedMs` and not from the wall
   * clock, so the exam resumes "with the clock as it was"
   * (product-requirements.md §14).
   */
  readonly remainingMs: number;
};

const resumable = (run: ExamRun, form: ExamForm): ResumeExamResult => ({
  run,
  form,
  remainingMs: Math.max(0, runLimitMs(run, form) - run.elapsedMs),
});

/** Newest first, by code unit, as every store orders ids (D73). */
export const descending = (a: string, b: string): number => (a < b ? 1 : a > b ? -1 : 0);

/**
 * The newest unsubmitted run whose form the bank still ships, with its time left.
 * A run on a form a later bank dropped cannot be resumed or scored, and nothing
 * discards a run yet (D87), so it is passed over rather than allowed to wedge the
 * picker and the runner for good (D89).
 */
const newestOpen = async (deps: Pick<ExamRunDeps, "items" | "examRuns">): Promise<ResumeExamResult | null> => {
  // The store's own read first, which is indexed, and the ordinary case.
  const newest = await deps.examRuns.unsubmitted();
  if (newest === null) return null;
  const form = await deps.items.form(newest.formId);
  if (form !== null) return resumable(newest, form);

  // Only when the newest is stranded, look further back through every run.
  const older = (await deps.examRuns.all())
    .filter((run) => run.submittedAt === null && run.id !== newest.id)
    .sort((a, b) => descending(a.startedAt, b.startedAt) || descending(a.id, b.id));
  for (const run of older) {
    const form = await deps.items.form(run.formId);
    if (form !== null) return resumable(run, form);
  }
  return null;
};

/**
 * The run a candidate could pick back up, read without writing anything: the
 * most recently started unsubmitted run, or null. The exam picker shows it as
 * "resume your exam in progress", and looking must not count as a pause.
 */
export const examInProgress = async (
  deps: Pick<ExamRunDeps, "items" | "examRuns">,
): Promise<ResumeExamResult | null> => newestOpen(deps);

/**
 * Pick a run back up. With no id, it takes the newest run that can still be
 * resumed, and returns null when there is none, which is the ordinary case and
 * not an error. With an id, an unknown or already-submitted run, or one whose
 * form has left the bank, throws, since the caller named something that cannot
 * be resumed.
 *
 * A resume of a run whose clock has started counts as a pause, and the count is
 * written with a checkpoint (D84, ruling 1). A run with no exam time used yet is
 * one being opened for the first time, straight after `startExam`, so it is not
 * counted. Neither is its first load after a crash in the first instant, which
 * cost the candidate nothing.
 */
export const resumeExam = async (
  request: ResumeExamRequest,
  deps: ExamRunDeps,
): Promise<ResumeExamResult | null> => {
  let resumed: ResumeExamResult;
  if (request.runId === undefined) {
    const latest = await newestOpen(deps);
    if (latest === null) return null;
    resumed = latest;
  } else {
    const named = await openRun(request.runId, deps.examRuns);
    resumed = resumable(named, await formOf(named.formId, deps.items));
  }

  const { run } = resumed;
  if (run.elapsedMs === 0) return resumed;

  const paused: ExamRun = { ...run, resumes: (run.resumes ?? 0) + 1, checkpointedAt: deps.clock.now() };
  await deps.examRuns.put(paused);
  return { ...resumed, run: paused };
};
