import * as z from "zod";

import {
  REST_BUCKETS,
  RETIREMENT_REASONS,
  TELEMETRY_MAX_RESPONSE_MS,
} from "../telemetry.js";
import { itemStatisticsRulesShape } from "../profile/schema.js";
import { isoSchema } from "./primitives.js";

/**
 * The telemetry DTO schemas (architecture.md 9.2). Strict, so an event that
 * carries anything beyond its five fields — an account id, a device id, a
 * timestamp — is rejected rather than stored. DTOs, so absent from
 * `CONTENT_SCHEMAS` (ADR 20).
 */

/** Item ids are short; the bound keeps a hostile batch from being large. */
const wireIdSchema = z.string().min(1).max(128);

export const telemetryEventShape = z.strictObject({
  itemId: wireIdSchema,
  correct: z.boolean(),
  responseMs: z.number().int().nonnegative().max(TELEMETRY_MAX_RESPONSE_MS),
  bankVersion: z.number().int().positive(),
  restBucket: z.literal(REST_BUCKETS),
});

const proportionSchema = z.number().min(0).max(1);

export const itemVerdictShape = z.strictObject({
  itemId: wireIdSchema,
  responses: z.number().int().positive(),
  proportionCorrect: proportionSchema,
  pointBiserial: z.number().min(-1).max(1).nullable(),
  trusted: z.strictObject({ difficulty: z.boolean(), discrimination: z.boolean() }),
  reasons: z.array(z.enum(RETIREMENT_REASONS)),
});

export const itemStatisticsReportShape = z.strictObject({
  generatedAt: isoSchema,
  bankVersion: z.number().int().positive(),
  events: z.number().int().nonnegative(),
  rules: itemStatisticsRulesShape,
  verdicts: z.array(itemVerdictShape),
});

export const telemetryEventSchema = telemetryEventShape.readonly();
export const itemStatisticsReportSchema = itemStatisticsReportShape.readonly();
