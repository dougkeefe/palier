import { describe, expect, it } from "vitest";

import { itemStatisticsReportSchema, telemetryEventSchema } from "../schemas/telemetry.js";
import { TELEMETRY_MAX_RESPONSE_MS } from "../telemetry.js";
import { readProfile } from "./read-profile.js";

const anEvent = (over: Record<string, unknown> = {}) => ({
  itemId: "fr-read-0001",
  correct: true,
  responseMs: 41_250,
  bankVersion: 2,
  restBucket: 3,
  ...over,
});

const aVerdict = (over: Record<string, unknown> = {}) => ({
  itemId: "fr-read-0001",
  responses: 120,
  proportionCorrect: 0.5,
  pointBiserial: 0.31,
  trusted: { difficulty: true, discrimination: true },
  reasons: [],
  ...over,
});

const aReport = (over: Record<string, unknown> = {}) => ({
  generatedAt: "2026-10-01T06:00:00.000Z",
  bankVersion: 2,
  events: 120,
  rules: (readProfile() as Record<string, unknown>)["itemStatistics"],
  verdicts: [aVerdict()],
  ...over,
});

const accepts = (value: unknown): boolean => telemetryEventSchema.safeParse(value).success;

describe("telemetryEventSchema", () => {
  it("accepts an event of exactly the five fields", () => {
    expect(accepts(anEvent())).toBe(true);
  });

  it("rejects an event that carries an identity, because the schema is strict", () => {
    expect(accepts(anEvent({ deviceId: "d-1" }))).toBe(false);
    expect(accepts(anEvent({ accountId: "a-1" }))).toBe(false);
    expect(accepts(anEvent({ ts: "2026-09-25T10:00:00.000Z" }))).toBe(false);
  });

  it("accepts every quintile bucket and nothing outside them", () => {
    for (const restBucket of [0, 1, 2, 3, 4]) expect(accepts(anEvent({ restBucket }))).toBe(true);
    expect(accepts(anEvent({ restBucket: 5 }))).toBe(false);
    expect(accepts(anEvent({ restBucket: -1 }))).toBe(false);
    expect(accepts(anEvent({ restBucket: 2.5 }))).toBe(false);
  });

  it("bounds the response time to a whole number up to three hours", () => {
    expect(accepts(anEvent({ responseMs: 0 }))).toBe(true);
    expect(accepts(anEvent({ responseMs: TELEMETRY_MAX_RESPONSE_MS }))).toBe(true);
    expect(accepts(anEvent({ responseMs: TELEMETRY_MAX_RESPONSE_MS + 1 }))).toBe(false);
    expect(accepts(anEvent({ responseMs: -1 }))).toBe(false);
    expect(accepts(anEvent({ responseMs: 1.5 }))).toBe(false);
  });

  it("rejects an empty or oversized item id", () => {
    expect(accepts(anEvent({ itemId: "" }))).toBe(false);
    expect(accepts(anEvent({ itemId: "x".repeat(129) }))).toBe(false);
  });

  it("rejects a bank version that is not a positive whole number", () => {
    expect(accepts(anEvent({ bankVersion: 0 }))).toBe(false);
  });

  it("rejects a missing field", () => {
    const { correct: _dropped, ...rest } = anEvent();
    expect(accepts(rest)).toBe(false);
  });
});

describe("itemStatisticsReportSchema", () => {
  const parses = (value: unknown): boolean => itemStatisticsReportSchema.safeParse(value).success;

  it("accepts a report with the profile's rules", () => {
    expect(parses(aReport())).toBe(true);
  });

  it("accepts a verdict with no point-biserial, for an item with no variance", () => {
    expect(parses(aReport({ verdicts: [aVerdict({ pointBiserial: null })] }))).toBe(true);
  });

  it("rejects an unknown retirement reason", () => {
    expect(parses(aReport({ verdicts: [aVerdict({ reasons: ["three-reports"] })] }))).toBe(false);
  });

  it("rejects a verdict with no responses, since a verdict needs an event", () => {
    expect(parses(aReport({ verdicts: [aVerdict({ responses: 0 })] }))).toBe(false);
  });

  it("rejects rules the profile would reject", () => {
    const rules = { ...(aReport().rules as Record<string, unknown>), pCorrectMin: 0.99 };
    expect(parses(aReport({ rules }))).toBe(false);
  });
});
