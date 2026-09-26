import type { Item, ItemStatisticsReport, ItemVerdict } from "@palier/domain";
import { itemId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { applyStatistics } from "./carry.js";
import type { CarriedBank } from "./run.js";

const anItem = (id: string, over: Partial<Item> = {}): Item =>
  ({ id: itemId(id), status: "published", skill: "reading", ...over }) as Item;

const aVerdict = (id: string, over: Partial<ItemVerdict> = {}): ItemVerdict => ({
  itemId: itemId(id),
  responses: 120,
  proportionCorrect: 0.55,
  pointBiserial: 0.32,
  trusted: { difficulty: true, discrimination: true },
  reasons: [],
  ...over,
});

const aReport = (verdicts: readonly ItemVerdict[]): ItemStatisticsReport => ({
  generatedAt: "2026-10-01T06:00:00.000Z",
  bankVersion: 2,
  events: 999,
  rules: { pCorrectMin: 0.15, pCorrectMax: 0.95, pointBiserialMin: 0, minResponsesDifficulty: 30, minResponsesDiscrimination: 100 },
  verdicts,
});

const carried: CarriedBank = { items: [anItem("keep"), anItem("drop"), anItem("unseen")], passages: [] };

describe("applyStatistics", () => {
  it("carries the bank unchanged when there is no report", () => {
    expect(applyStatistics(carried, null)).toBe(carried);
  });

  it("gives every judged item its statistics, dated by the report", () => {
    const out = applyStatistics(carried, aReport([aVerdict("keep")]));
    expect(out.items[0]).toEqual({
      ...anItem("keep"),
      stats: { responses: 120, proportionCorrect: 0.55, pointBiserial: 0.32, updatedAt: "2026-10-01T06:00:00.000Z" },
    });
  });

  it("retires an item the report gives a reason, and keeps it in the bank", () => {
    const out = applyStatistics(carried, aReport([aVerdict("drop", { reasons: ["low-discrimination"], pointBiserial: -0.4 })]));
    expect(out.items.map((i) => [i.id, i.status])).toEqual([
      ["keep", "published"],
      ["drop", "retired"],
      ["unseen", "published"],
    ]);
  });

  it("carries a null point-biserial as null, never as a number it is not", () => {
    const out = applyStatistics(carried, aReport([aVerdict("keep", { pointBiserial: null })]));
    expect(out.items[0]?.stats?.pointBiserial).toBeNull();
  });

  it("leaves an item the report did not judge untouched, and never publishes a retired one", () => {
    const retired: CarriedBank = { items: [anItem("old", { status: "retired" })], passages: [] };
    expect(applyStatistics(retired, aReport([])).items).toEqual(retired.items);
  });
});
