import type { Attempt, AttemptMode, Item, ItemId, TargetBand } from "@palier/domain";
import { attemptId, itemId, sessionId } from "@palier/domain";
import { describe, expect, it, vi } from "vitest";

import type { AttemptStore, ItemRepository } from "../ports/index.js";
import { type DiagnosticReadoutDeps, diagnosticReadout } from "./diagnostic-readout.js";

// Local fixtures rather than @palier/testing (progress.md D37).

const NOW = "2026-03-01T00:00:00.000Z";

const makeItem = (id: ItemId, targetBand: TargetBand): Item => ({
  id,
  version: 1,
  skill: "reading",
  lang: "fr",
  type: "cloze",
  stem: { en: "s", fr: "s" },
  options: [
    { id: "a", text: "a", rationale: { en: "x", fr: "x" } },
    { id: "b", text: "b", rationale: { en: "x", fr: "x" } },
    { id: "c", text: "c", rationale: { en: "x", fr: "x" } },
    { id: "d", text: "d", rationale: { en: "x", fr: "x" } },
  ],
  key: "a",
  explanation: { en: "e", fr: "e" },
  subSkill: "main-idea",
  targetBand,
  topic: "human-resources",
  tags: [],
  provenance: { origin: "generated" },
  status: "published",
  createdAt: NOW,
  updatedAt: NOW,
});

let seq = 0;
const anAttempt = (over: Partial<Attempt> & { mode: AttemptMode; correct: boolean }): Attempt => {
  seq += 1;
  return {
    id: attemptId(`att-${String(seq).padStart(4, "0")}`),
    itemId: itemId(`item-${String(seq).padStart(4, "0")}`),
    bankVersion: 1,
    skill: "reading",
    sessionId: sessionId("session-1"),
    chosen: "a",
    msToFirstSelect: 1_000,
    msToConfirm: 2_000,
    changedAnswer: false,
    ts: `2026-03-01T00:${String(seq % 60).padStart(2, "0")}:00.000Z`,
    ...over,
  };
};

/** `n` band-B diagnostic attempts, the first `correct` of them right. */
const bandBDiagnostics = (n: number, correct: number): readonly Attempt[] =>
  Array.from({ length: n }, (_, i) => anAttempt({ mode: "diagnostic", correct: i < correct }));

/** A repository resolving exactly the given items by id (order preserved, misses dropped). */
const itemsOf = (bank: readonly Item[]): ItemRepository => ({
  byIds: vi.fn((ids: readonly ItemId[]) =>
    Promise.resolve(
      ids
        .map((id) => bank.find((item) => item.id === id))
        .filter((item): item is Item => item !== undefined),
    ),
  ),
  query: vi.fn(() => Promise.resolve([])),
  passage: vi.fn(() => Promise.resolve(null)),
  form: vi.fn(() => Promise.resolve(null)),
  scenario: vi.fn(() => Promise.resolve(null)),
  bankVersion: vi.fn(() => Promise.resolve(1)),
});

const attemptsOf = (attempts: readonly Attempt[]): AttemptStore => ({
  append: vi.fn(() => Promise.resolve(true)),
  recent: vi.fn(() => Promise.resolve(attempts)),
  since: vi.fn(() => Promise.resolve(attempts)),
  forItem: vi.fn(() => Promise.resolve([])),
});

/** Items at band B for every attempt in the given set. */
const itemsForAll = (attempts: readonly Attempt[], band: TargetBand = "B"): Item[] =>
  attempts.map((a) => makeItem(a.itemId, band));

const depsWith = (attempts: readonly Attempt[], bank: readonly Item[]): DiagnosticReadoutDeps => ({
  items: itemsOf(bank),
  attempts: attemptsOf(attempts),
});

const aRequest = { skill: "reading" } as const;

describe("diagnosticReadout", () => {
  it("returns accuracy per band tag with a Wilson interval over diagnostic attempts", async () => {
    const attempts = bandBDiagnostics(30, 24);
    const trend = await diagnosticReadout(aRequest, depsWith(attempts, itemsForAll(attempts)));

    const b = trend.byBand.B;
    expect(b.status).toBe("estimated");
    if (b.status !== "estimated") throw new Error("unreachable");
    expect(b.accuracy).toBeCloseTo(24 / 30);
    expect(b.interval.low).toBeGreaterThan(0);
    expect(b.interval.high).toBeLessThanOrEqual(1);
  });

  it("excludes drill-mode attempts for the same skill", async () => {
    const diagnostic = bandBDiagnostics(30, 30);
    const drills = Array.from({ length: 10 }, () => anAttempt({ mode: "drill", correct: false }));
    const all = [...diagnostic, ...drills];
    const trend = await diagnosticReadout(aRequest, depsWith(all, itemsForAll(all)));

    const b = trend.byBand.B;
    expect(b.status).toBe("estimated");
    // 30 diagnostic attempts, not 40: the ten drills were filtered out.
    expect(b.attempted).toBe(30);
  });

  it("resolves only the diagnostic attempts' items, not the drill ones", async () => {
    const diagnostic = bandBDiagnostics(3, 3);
    const drills = Array.from({ length: 2 }, () => anAttempt({ mode: "drill", correct: false }));
    const items = itemsOf(itemsForAll([...diagnostic, ...drills]));

    await diagnosticReadout(aRequest, { items, attempts: attemptsOf([...diagnostic, ...drills]) });

    expect(items.byIds).toHaveBeenCalledWith(diagnostic.map((a) => a.itemId));
  });

  it("reads insufficient below the evidence threshold", async () => {
    const attempts = bandBDiagnostics(5, 5);
    const trend = await diagnosticReadout(aRequest, depsWith(attempts, itemsForAll(attempts)));

    const b = trend.byBand.B;
    expect(b.status).toBe("insufficient");
    if (b.status !== "insufficient") throw new Error("unreachable");
    expect(b.attempted).toBe(5);
    expect(b.needed).toBe(30);
  });

  it("tolerates a diagnostic attempt whose item is absent from the bank", async () => {
    const attempts = bandBDiagnostics(1, 1);
    // The bank returns nothing for the attempted id, so the join drops it.
    const trend = await diagnosticReadout(aRequest, depsWith(attempts, []));

    expect(trend.windowSize).toBe(0);
    expect(trend.byBand.B.status).toBe("insufficient");
  });

  it("is empty when there are no diagnostic attempts", async () => {
    const drills = Array.from({ length: 5 }, () => anAttempt({ mode: "drill", correct: true }));
    const trend = await diagnosticReadout(aRequest, depsWith(drills, itemsForAll(drills)));

    expect(trend.windowSize).toBe(0);
    expect(trend.byBand.A.status).toBe("insufficient");
    expect(trend.byBand.B.status).toBe("insufficient");
    expect(trend.byBand.C.status).toBe("insufficient");
  });
});
