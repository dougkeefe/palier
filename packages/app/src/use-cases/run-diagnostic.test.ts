import type { Attempt, Item, ItemId, TargetBand } from "@palier/domain";
import { itemId } from "@palier/domain";
import { describe, expect, it, vi } from "vitest";

import type { AttemptStore, Clock, ItemRepository, Random } from "../ports/index.js";
import { type RunDiagnosticDeps, runDiagnostic } from "./run-diagnostic.js";

// Local fixtures rather than @palier/testing: that package depends on @palier/app,
// so importing it here would make the build graph cyclic (progress.md D37).

const NOW = "2026-03-01T00:00:00.000Z";

let itemCounter = 0;
const makeItem = (over: Partial<Item> = {}): Item => ({
  id: itemId(`item-${String(++itemCounter).padStart(4, "0")}`),
  version: 1,
  skill: "reading",
  lang: "fr",
  type: "cloze",
  stem: { en: "stem", fr: "énoncé" },
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
  ...over,
});

/** A pool spanning all three target bands and a few sub-skills, for coverage. */
const aPool = (): Item[] => {
  const bands: readonly TargetBand[] = ["A", "B", "C"];
  const subSkills = ["main-idea", "inference", "vocabulary-in-context"] as const;
  return Array.from({ length: 18 }, (_, i) =>
    makeItem({
      targetBand: bands[i % bands.length]!,
      subSkill: subSkills[i % subSkills.length]!,
    }),
  );
};

const clockOf = (iso = NOW): Clock => ({ now: vi.fn(() => iso) });

/** A random cycling a fixed sequence, so a run is deterministic and repeatable. */
const randomOf = (values: readonly number[] = [0.1, 0.5, 0.9, 0.3, 0.7, 0.2]): Random => {
  let i = 0;
  return { next: vi.fn(() => values[i++ % values.length]!) };
};

const itemsOf = (bank: readonly Item[]): ItemRepository => ({
  byIds: vi.fn((ids: readonly ItemId[]) =>
    Promise.resolve(
      ids
        .map((id) => bank.find((item) => item.id === id))
        .filter((item): item is Item => item !== undefined),
    ),
  ),
  query: vi.fn((c) =>
    Promise.resolve(
      bank.filter(
        (item) =>
          (c.skill === undefined || item.skill === c.skill) &&
          !(c.exclude ?? []).includes(item.id),
      ),
    ),
  ),
  passage: vi.fn(() => Promise.resolve(null)),
  form: vi.fn(() => Promise.resolve(null)),
  forms: vi.fn(() => Promise.resolve([])),
  scenario: vi.fn(() => Promise.resolve(null)),
  scenarios: vi.fn(() => Promise.resolve([])),
  bankVersion: vi.fn(() => Promise.resolve(1)),
});

const attemptsOf = (attempts: readonly Attempt[] = []): AttemptStore => ({
  append: vi.fn(() => Promise.resolve(true)),
  recent: vi.fn(() => Promise.resolve(attempts)),
  since: vi.fn(() => Promise.resolve(attempts)),
  forItem: vi.fn(() => Promise.resolve([])),
  all: vi.fn(() => Promise.resolve([])),
  clear: vi.fn(() => Promise.resolve()),
});

const depsWith = (over: Partial<RunDiagnosticDeps> = {}): RunDiagnosticDeps => ({
  clock: clockOf(),
  random: randomOf(),
  items: itemsOf(aPool()),
  attempts: attemptsOf(),
  ...over,
});

const aRequest = { skill: "reading", lang: "fr", targetBand: "C", count: 9 } as const;

describe("runDiagnostic", () => {
  it("reads the clock once", async () => {
    const clock = clockOf();
    await runDiagnostic(aRequest, depsWith({ clock }));

    expect(clock.now).toHaveBeenCalledTimes(1);
  });

  it("queries the candidate pool by skill", async () => {
    const items = itemsOf(aPool());
    await runDiagnostic(aRequest, depsWith({ items }));

    expect(items.query).toHaveBeenCalledWith({ skill: "reading" });
  });

  it("fetches recent attempts for the requested skill, for the recent-exclusion", async () => {
    const attempts = attemptsOf();
    await runDiagnostic(aRequest, depsWith({ attempts }));

    expect(attempts.recent).toHaveBeenCalledWith("reading", 500);
  });

  it("threads the injected randomness into selection (never Math.random)", async () => {
    const random = randomOf();
    await runDiagnostic(aRequest, depsWith({ random }));

    expect(random.next).toHaveBeenCalled();
  });

  it("returns the requested number of items", async () => {
    const result = await runDiagnostic(aRequest, depsWith());

    expect(result.items).toHaveLength(aRequest.count);
  });

  it("samples for coverage: the set spans more than one band", async () => {
    const result = await runDiagnostic(aRequest, depsWith());

    const bands = new Set(result.items.map((item) => item.targetBand));
    expect(bands.size).toBeGreaterThan(1);
  });

  it("is reproducible: identical inputs and the same random sequence give the same set", async () => {
    const bank = aPool();
    const first = await runDiagnostic(aRequest, depsWith({ items: itemsOf(bank), random: randomOf() }));
    const second = await runDiagnostic(aRequest, depsWith({ items: itemsOf(bank), random: randomOf() }));

    expect(second.items.map((i) => i.id)).toEqual(first.items.map((i) => i.id));
  });

  it("returns an empty set when the pool is empty", async () => {
    const result = await runDiagnostic(aRequest, depsWith({ items: itemsOf([]) }));

    expect(result.items).toEqual([]);
  });
});
