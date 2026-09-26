import type { TelemetryEvent } from "@palier/domain";
import { TELEMETRY_MAX_RESPONSE_MS } from "@palier/domain";
import { type ExamResult, restBuckets } from "@palier/engine";

import type { ExamRun } from "../ports/index.js";

/**
 * The events a submitted exam contributes: one per answered item, in the order they
 * were answered. An unanswered item has no response time and nothing to report, but
 * it still counts as wrong in everyone else's rest bucket.
 */
export const examTelemetryEvents = (
  run: ExamRun,
  result: ExamResult,
  bankVersion: number,
): readonly TelemetryEvent[] => {
  const buckets = restBuckets(result);
  const correct = new Map(result.items.map((item) => [item.itemId, item.correct]));
  return run.answers.flatMap((answer) => {
    const restBucket = buckets.get(answer.itemId);
    // An answer to an item the form does not hold was refused when it was written.
    if (restBucket === undefined) return [];
    return [
      {
        itemId: answer.itemId,
        correct: correct.get(answer.itemId) === true,
        responseMs: Math.min(TELEMETRY_MAX_RESPONSE_MS, Math.max(0, Math.round(answer.msToConfirm))),
        bankVersion,
        restBucket,
      },
    ];
  });
};
