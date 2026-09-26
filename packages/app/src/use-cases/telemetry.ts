import type { SessionId } from "@palier/domain";

import type {
  ExamRunStore,
  ItemRepository,
  TelemetryConsent,
  TelemetrySink,
  TelemetryStore,
} from "../ports/index.js";
import { TELEMETRY_MAX_BATCH, TelemetryRejectedError, TelemetryUnavailableError } from "../ports/index.js";
import { examTelemetryEvents } from "./exam-telemetry-events.js";
import { UnknownExamRunError } from "./exam-run.js";
import { ExamNotSubmittedError, rescoreExam } from "./submit-exam.js";

/**
 * Opt-in anonymous item telemetry (product-requirements.md §15): `record` and `flush`
 * from `implementation-plan.md` §3.3, as use cases over the two telemetry ports
 * (progress.md D92).
 *
 * **What is sent** is one event per answered item of a submitted mock exam, pilots
 * included, since they are the items that most need statistics. Each event is the item
 * id, right or wrong, the response time, the bank version and the rest bucket, and
 * nothing that identifies the person, the device or the run.
 *
 * **Where it comes from** is the stored run and its rescore, which after a sync is the
 * winning copy (D80), and never its attempts: a concurrent double submission can leave
 * attempts for answers the winning run does not hold.
 */

export type TelemetryDeps = {
  readonly telemetry: TelemetryStore;
};

export type RecordExamTelemetryRequest = {
  readonly runId: SessionId;
};

export type RecordExamTelemetryDeps = TelemetryDeps & {
  readonly items: ItemRepository;
  readonly examRuns: ExamRunStore;
};

/**
 * Queue a submitted run's events. The caller decides whether consent allows it:
 * `submitExam` at the first submit, `setTelemetryConsent` for the exam the prompt was
 * shown on.
 */
export const recordExamTelemetry = async (
  request: RecordExamTelemetryRequest,
  deps: RecordExamTelemetryDeps,
): Promise<number> => {
  const run = await deps.examRuns.get(request.runId);
  if (run === null) throw new UnknownExamRunError(request.runId);
  if (run.submittedAt === null) throw new ExamNotSubmittedError(request.runId);
  const result = await rescoreExam(request, deps);
  const events = examTelemetryEvents(run, result, await deps.items.bankVersion());
  await deps.telemetry.enqueue(events);
  return events.length;
};

/** This device's choice, `"unasked"` until the post-exam prompt is answered. */
export const telemetryConsent = (deps: TelemetryDeps): Promise<TelemetryConsent> =>
  deps.telemetry.consent();

export type SetTelemetryConsentRequest = {
  readonly consent: TelemetryConsent;
  /** The exam the prompt was shown on. Opting in there shares that exam too. */
  readonly runId?: SessionId;
};

/**
 * Record this device's choice.
 *
 * - **Turning it on from the prompt shares the exam the prompt was shown on**, since
 *   that is the exam whose case it makes. Only when it was not already on: an exam
 *   submitted while sharing was on was queued at submit, and is not queued twice.
 * - **Turning it off empties the queue.** Nothing waiting is sent after a no.
 */
export const setTelemetryConsent = async (
  request: SetTelemetryConsentRequest,
  deps: RecordExamTelemetryDeps,
): Promise<void> => {
  if (request.consent === "off") {
    await deps.telemetry.clear();
    await deps.telemetry.setConsent("off");
    return;
  }
  const before = await deps.telemetry.consent();
  await deps.telemetry.setConsent(request.consent);
  if (request.consent === "on" && before !== "on" && request.runId !== undefined) {
    await recordExamTelemetry({ runId: request.runId }, deps);
  }
};

export type FlushTelemetryDeps = TelemetryDeps & {
  readonly sink: TelemetrySink;
};

export type FlushTelemetryResult = {
  /** Events the service accepted. */
  readonly sent: number;
  /** Events in a batch the service refused as malformed, dropped rather than retried. */
  readonly dropped: number;
  /** True when a batch could not be delivered and waits for the next flush. */
  readonly pending: boolean;
};

/**
 * Send what is queued, oldest first, in batches of at most `TELEMETRY_MAX_BATCH`.
 *
 * - A batch leaves the queue **only after the service answered it**. If the device dies
 *   in between, the next flush sends it again: an event can arrive twice, never not at
 *   all. At pilot scale a duplicate moves a proportion by a response; a loss would be
 *   silent.
 * - An undeliverable batch stops the flush and stays queued (`pending`).
 * - A batch the service **refused** is dropped and the flush goes on, so one bad batch
 *   (from an older build, say) cannot hold the queue up for good.
 * - Any other failure is a defect, and is thrown.
 * - Nothing is sent unless this device's consent is `"on"`.
 */
export const flushTelemetry = async (deps: FlushTelemetryDeps): Promise<FlushTelemetryResult> => {
  if ((await deps.telemetry.consent()) !== "on") return { sent: 0, dropped: 0, pending: false };
  let sent = 0;
  let dropped = 0;
  for (;;) {
    const batch = await deps.telemetry.take(TELEMETRY_MAX_BATCH);
    if (batch.length === 0) return { sent, dropped, pending: false };
    let accepted = true;
    try {
      await deps.sink.send(batch.map((queued) => queued.event));
    } catch (error) {
      if (error instanceof TelemetryUnavailableError) return { sent, dropped, pending: true };
      if (!(error instanceof TelemetryRejectedError)) throw error;
      accepted = false;
    }
    await deps.telemetry.remove(batch.map((queued) => queued.id));
    if (accepted) sent += batch.length;
    else dropped += batch.length;
  }
};
