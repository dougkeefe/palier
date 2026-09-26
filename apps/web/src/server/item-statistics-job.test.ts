import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";

import { itemId, itemStatisticsReportSchema, parseExamProfileOrThrow } from "@palier/domain";
import { syntheticTelemetry } from "@palier/testing";
import { describe, expect, it } from "vitest";

import { EVENTS_SQL, bankItems, buildReport, eventsFromRows, reportText, runItemStatistics } from "./item-statistics-job";

const require = createRequire(import.meta.url);
const PROFILE_PATH = require.resolve("@palier/content/profiles/psc-sle.json");
const CONTENT_DIR = dirname(dirname(PROFILE_PATH));
const profile = parseExamProfileOrThrow(JSON.parse(readFileSync(PROFILE_PATH, "utf8")));

/** Real ids from the committed v2 bank. */
const IN_BANK = ["5TLP701HFB7A9FKR8F7H", "B3KE3DTNID48H1RP2JVD"];

describe("buildReport — Phase 3 exit criterion 3 on synthetic data", () => {
  const set = syntheticTelemetry();
  const report = buildReport({ events: set.events, items: set.items, bankVersion: 2, profile, generatedAt: "2026-10-01T06:00:00.000Z" });

  it("retires exactly the too-easy item and the reversed key, each for its own reason", () => {
    const retired = report.verdicts.filter((verdict) => verdict.reasons.length > 0);
    expect(retired.map((v) => [v.itemId, v.reasons])).toEqual([
      [set.reversedKey, ["low-discrimination"]],
      [set.tooEasy, ["too-easy"]],
    ]);
  });

  it("reads the too-easy item's known proportion, and the reversed key's negative correlation", () => {
    const byId = new Map(report.verdicts.map((v) => [v.itemId, v]));
    expect(byId.get(set.tooEasy)?.proportionCorrect).toBe(0.98);
    expect(byId.get(set.reversedKey)?.pointBiserial).toBeLessThan(0);
  });

  it("judges every item with events, trusting both checks at 300 responses each", () => {
    expect(report.verdicts).toHaveLength(set.items.length);
    expect(report.verdicts.every((v) => v.trusted.difficulty && v.trusted.discrimination)).toBe(true);
  });

  it("writes a report the domain schema accepts, carrying the profile's rules and the counts", () => {
    expect(itemStatisticsReportSchema.safeParse(report).success).toBe(true);
    expect(report).toMatchObject({ generatedAt: "2026-10-01T06:00:00.000Z", bankVersion: 2, events: set.events.length, rules: profile.itemStatistics });
  });
});

describe("eventsFromRows", () => {
  it("reads a row as either driver returns it, numbers as numbers or as strings", () => {
    const rows = [
      { item_id: "a", correct: true, response_ms: 900, rest_bucket: 2, bank_version: 2 },
      { item_id: "b", correct: false, response_ms: "1200", rest_bucket: "0", bank_version: "2" },
    ];
    expect(eventsFromRows(rows)).toEqual([
      { itemId: "a", correct: true, responseMs: 900, restBucket: 2, bankVersion: 2 },
      { itemId: "b", correct: false, responseMs: 1200, restBucket: 0, bankVersion: 2 },
    ]);
  });

  it("stops on a row the schema refuses, rather than count a corrupt statistic", () => {
    expect(() => eventsFromRows([{ item_id: "a", correct: true, response_ms: 900, rest_bucket: 9, bank_version: 2 }])).toThrow();
  });

  it("selects exactly the five event columns, and nothing that could identify anyone", () => {
    expect(EVENTS_SQL).toBe(
      "select item_id, correct, response_ms, rest_bucket, bank_version from telemetry_events order by id",
    );
  });
});

describe("reportText", () => {
  it("writes two-space JSON with a trailing newline, so a rerun diffs cleanly", () => {
    const report = buildReport({ events: [], items: [], bankVersion: 2, profile, generatedAt: "2026-10-01T06:00:00.000Z" });
    const text = reportText(report);
    expect(text.endsWith("}\n")).toBe(true);
    expect(text).toContain('\n  "bankVersion": 2,');
    expect(JSON.parse(text)).toEqual(report);
  });
});

describe("bankItems and runItemStatistics — over the committed bank", () => {
  it("reads items from the committed bank through the bank adapter, passing over an unknown id", async () => {
    const items = await bankItems(CONTENT_DIR, 2, [...IN_BANK, "not-in-any-bank"]);
    expect(items.map((item) => item.id).sort()).toEqual([...IN_BANK].sort());
  });

  it("judges the bank's items from the events, and gives no verdict for an item the bank lacks", async () => {
    const events = [IN_BANK[0], "not-in-any-bank"].flatMap((id) =>
      Array.from({ length: 3 }, () => ({ itemId: itemId(id ?? ""), correct: true, responseMs: 900, bankVersion: 2, restBucket: 2 as const })),
    );

    const report = await runItemStatistics({
      readEvents: () => Promise.resolve(events),
      contentDir: CONTENT_DIR,
      bankVersion: 2,
      profile,
      now: () => new Date("2026-10-01T06:00:00.000Z"),
    });

    expect(report.events).toBe(6);
    expect(report.verdicts.map((v) => v.itemId)).toEqual([IN_BANK[0]]);
    expect(report.verdicts[0]).toMatchObject({ responses: 3, trusted: { difficulty: false, discrimination: false }, reasons: [] });
  });
});
