import type { Attempt, AttemptMode, Item, ItemId } from "@palier/domain";
import { attemptId, itemId, sessionId } from "@palier/domain";
import { describe, expect, it, vi } from "vitest";

import type { AttemptStore, ItemRepository } from "../ports/index.js";
import { PRACTICE_MODES, practiceTrend, practiceTrendEvidence } from "./practice-trend.js";
import { profile } from "./__tests__/exam-fakes.js";

// Local fixtures rather than @palier/testing (progress.md D37).

const NOW = "2026-03-01T00:00:00.000Z";

const makeItem = (id: ItemId): Item => ({
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
  targetBand: "B",
  topic: "human-resources",
  tags: [],
  provenance: { origin: "generated" },
  status: "published",
  createdAt: NOW,
  updatedAt: NOW,
});

let seq = 0;
const anAttempt = (mode: AttemptMode, correct: boolean): Attempt => {
  seq += 1;
  return {
    id: attemptId(`att-${String(seq).padStart(4, "0")}`),
    itemId: itemId(`item-${String(seq).padStart(4, "0")}`),
    bankVersion: 1,
    skill: "reading",
    sessionId: sessionId("session-1"),
    chosen: "a",
    correct,
    msToFirstSelect: 1_000,
    msToConfirm: 2_000,
    changedAnswer: false,
    mode,
    ts: NOW,
  };
};

const depsFor = (attempts: readonly Attempt[]) => {
  const items: ItemRepository = {
    byIds: vi.fn((ids: readonly ItemId[]) => Promise.resolve(ids.map(makeItem))),
    query: vi.fn(() => Promise.resolve([])),
    passage: vi.fn(() => Promise.resolve(null)),
    form: vi.fn(() => Promise.resolve(null)),
    forms: vi.fn(() => Promise.resolve([])),
    scenario: vi.fn(() => Promise.resolve(null)),
    bankVersion: vi.fn(() => Promise.resolve(1)),
  };
  const store: AttemptStore = {
    append: vi.fn(() => Promise.resolve(true)),
    recent: vi.fn(() => Promise.resolve(attempts)),
    since: vi.fn(() => Promise.resolve([])),
    forItem: vi.fn(() => Promise.resolve([])),
    all: vi.fn(() => Promise.resolve([])),
    clear: vi.fn(() => Promise.resolve()),
  };
  return { items, attempts: store };
};

describe("practiceTrend", () => {
  it("counts drills, reviews and the diagnostic alike", async () => {
    const attempts = [
      ...Array.from({ length: 12 }, () => anAttempt("drill", true)),
      ...Array.from({ length: 12 }, () => anAttempt("review", false)),
      ...Array.from({ length: 12 }, () => anAttempt("diagnostic", true)),
    ];
    const trend = await practiceTrend({ skill: "reading" }, depsFor(attempts));

    expect(trend.windowSize).toBe(36);
    expect(trend.byBand.B).toMatchObject({ status: "estimated", attempted: 36, correct: 24 });
  });

  /** §8.2 keeps the exam result and the practice trend visually distinct. */
  it("leaves exam attempts out, so the practice trend never absorbs the calibrated result", async () => {
    const attempts = [
      ...Array.from({ length: 30 }, () => anAttempt("drill", true)),
      ...Array.from({ length: 30 }, () => anAttempt("exam", false)),
    ];
    const deps = depsFor(attempts);
    const trend = await practiceTrend({ skill: "reading" }, deps);

    expect(trend.byBand.B).toMatchObject({ attempted: 30, correct: 30 });
    // Only the practice attempts' items are resolved.
    expect(vi.mocked(deps.items.byIds).mock.calls[0]?.[0]).toHaveLength(30);
  });

  it("reads the requested skill's recent attempts, generously", async () => {
    const deps = depsFor([]);
    await practiceTrend({ skill: "writing" }, deps);

    const [skill, n] = vi.mocked(deps.attempts.recent).mock.calls[0]!;
    expect(skill).toBe("writing");
    expect(n).toBeGreaterThanOrEqual(100);
  });

  it("names exactly the three practice modes", () => {
    expect([...PRACTICE_MODES].sort()).toEqual(["diagnostic", "drill", "review"]);
  });
});

describe("practiceTrendEvidence", () => {
  it("counts the items behind the practice trend and how many have trusted statistics", async () => {
    const attempts = [
      ...Array.from({ length: 3 }, () => anAttempt("drill", true)),
      ...Array.from({ length: 2 }, () => anAttempt("exam", true)),
    ];
    const deps = depsFor(attempts);
    const trusted = attempts[0]!.itemId;
    vi.mocked(deps.items.byIds).mockImplementation((ids) =>
      Promise.resolve(
        ids.map((id) =>
          id === trusted
            ? { ...makeItem(id), stats: { responses: 30, proportionCorrect: 0.6, pointBiserial: 0.2, updatedAt: NOW } }
            : makeItem(id),
        ),
      ),
    );

    expect(await practiceTrendEvidence({ skill: "reading" }, { ...deps, profile })).toEqual({ items: 3, trusted: 1 });
  });
});
