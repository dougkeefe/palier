import type { Attempt, Item, ItemId } from "@palier/domain";
import { itemId } from "@palier/domain";
import { describe, expect, it, vi } from "vitest";

import type {
  AttemptStore,
  Clock,
  ItemRepository,
  Random,
  ScheduleEntry,
  ScheduleStore,
} from "../ports/index.js";
import { type PlanDailySessionDeps, planDailySession } from "./plan-daily-session.js";

// Local fixtures rather than @palier/testing: that package depends on @palier/app,
// so importing it here would make the build graph cyclic. The engine sidesteps the
// same cycle the same way (progress.md D37).

const NOW = "2026-03-01T00:00:00.000Z";

let itemCounter = 0;
const makeItem = (over: Partial<Item> = {}): Item => ({
  id: itemId(`item-${String(++itemCounter).padStart(4, "0")}`),
  version: 1,
  skill: "writing",
  lang: "fr",
  type: "error-id",
  stem: { en: "stem", fr: "énoncé" },
  options: [
    { id: "a", text: "a", rationale: { en: "x", fr: "x" } },
    { id: "b", text: "b", rationale: { en: "x", fr: "x" } },
    { id: "c", text: "c", rationale: { en: "x", fr: "x" } },
    { id: "d", text: "d", rationale: { en: "x", fr: "x" } },
  ],
  key: "a",
  explanation: { en: "e", fr: "e" },
  subSkill: "agreement",
  targetBand: "B",
  topic: "human-resources",
  tags: [],
  provenance: { origin: "generated" },
  status: "published",
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

// A pool wide enough that the planner can fill new and maintenance buckets for a
// 10-item day (new ≈ 7, maintenance ≈ 3): writing items at bands B and A (the
// working set for a B target), across a few sub-skills.
const aPool = (): Item[] => {
  const subSkills = ["agreement", "pronouns", "verb-tense-and-mood"] as const;
  return Array.from({ length: 14 }, (_, i) =>
    makeItem({
      targetBand: i % 2 === 0 ? "B" : "A",
      subSkill: subSkills[i % subSkills.length]!,
    }),
  );
};

const clockOf = (iso = NOW): Clock => ({ now: vi.fn(() => iso) });

/** A random that cycles a fixed sequence, so a run is deterministic and repeatable. */
const randomOf = (values: readonly number[] = [0.1, 0.5, 0.9, 0.3, 0.7]): Random => {
  let i = 0;
  return { next: vi.fn(() => values[i++ % values.length]!) };
};

const scheduleOf = (entries: readonly ScheduleEntry[] = []): ScheduleStore => ({
  due: vi.fn(() => Promise.resolve(entries)),
  get: vi.fn(() => Promise.resolve(null)),
  put: vi.fn(() => Promise.resolve()),
  all: vi.fn(() => Promise.resolve([])),
  clear: vi.fn(() => Promise.resolve()),
});

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

const depsWith = (over: Partial<PlanDailySessionDeps> = {}): PlanDailySessionDeps => ({
  clock: clockOf(),
  random: randomOf(),
  items: itemsOf(aPool()),
  schedule: scheduleOf(),
  attempts: attemptsOf(),
  ...over,
});

const aRequest = {
  skill: "writing",
  lang: "fr",
  targetBand: "B",
  sessionSize: 10,
} as const;

describe("planDailySession", () => {
  it("reads the clock once and asks the schedule for what is due at that instant", async () => {
    const clock = clockOf();
    const schedule = scheduleOf();
    await planDailySession(aRequest, depsWith({ clock, schedule }));

    expect(clock.now).toHaveBeenCalledTimes(1);
    expect(schedule.due).toHaveBeenCalledWith(NOW, aRequest.sessionSize);
  });

  it("resolves due schedule entries to items and returns them as reviews", async () => {
    const [a, b, ...rest] = aPool();
    const schedule = scheduleOf([
      { itemId: a!.id, due: NOW, skill: "writing", box: 1 },
      { itemId: b!.id, due: NOW, skill: "writing", box: 1 },
    ]);
    const items = itemsOf([a!, b!, ...rest]);

    const plan = await planDailySession(aRequest, depsWith({ schedule, items }));

    expect(items.byIds).toHaveBeenCalledWith([a!.id, b!.id]);
    expect(plan.reviews.map((item) => item.id)).toEqual([a!.id, b!.id]);
  });

  it("excludes the due item ids from the candidate pool query", async () => {
    const [a, b, ...rest] = aPool();
    const schedule = scheduleOf([{ itemId: a!.id, due: NOW, skill: "writing", box: 1 }]);
    const items = itemsOf([a!, b!, ...rest]);

    await planDailySession(aRequest, depsWith({ schedule, items }));

    expect(items.query).toHaveBeenCalledWith({ skill: "writing", exclude: [a!.id] });
  });

  it("fetches recent attempts for the requested skill", async () => {
    const attempts = attemptsOf();
    await planDailySession(aRequest, depsWith({ attempts }));

    expect(attempts.recent).toHaveBeenCalledWith("writing", 500);
  });

  it("threads the injected randomness into selection (never Math.random)", async () => {
    const random = randomOf();
    await planDailySession(aRequest, depsWith({ random }));

    expect(random.next).toHaveBeenCalled();
  });

  it("is reproducible: identical inputs and the same random sequence give the same plan", async () => {
    const bank = aPool();
    const first = await planDailySession(
      aRequest,
      depsWith({ items: itemsOf(bank), random: randomOf() }),
    );
    const second = await planDailySession(
      aRequest,
      depsWith({ items: itemsOf(bank), random: randomOf() }),
    );

    expect(second.items.map((i) => i.id)).toEqual(first.items.map((i) => i.id));
  });

  it("produces a normal plan when no test date or completion flag is given", async () => {
    const plan = await planDailySession(aRequest, depsWith());

    expect(plan.tapering).toBe(false);
    expect(plan.items.length).toBeGreaterThan(0);
  });

  it("tapers to review-only when a test date is within the taper window", async () => {
    const testDate = "2026-03-02T00:00:00.000Z"; // one day after NOW
    const plan = await planDailySession({ ...aRequest, testDate }, depsWith());

    expect(plan.tapering).toBe(true);
    expect(plan.newItems).toEqual([]);
  });

  it("shortens the day after an incomplete previous day", async () => {
    const full = await planDailySession(aRequest, depsWith());
    const shortened = await planDailySession(
      { ...aRequest, lastDayCompleted: false },
      depsWith(),
    );

    expect(shortened.items.length).toBeLessThan(full.items.length);
  });

  it("returns no reviews but still fills from the pool when nothing is due", async () => {
    const items = itemsOf(aPool());
    const plan = await planDailySession(aRequest, depsWith({ items }));

    expect(items.byIds).toHaveBeenCalledWith([]);
    expect(plan.reviews).toEqual([]);
    expect(plan.items.length).toBeGreaterThan(0);
  });

  it("tolerates a due entry whose item is absent from the bank", async () => {
    const schedule = scheduleOf([
      { itemId: itemId("item-not-in-bank"), due: NOW, skill: "writing", box: 1 },
    ]);
    const plan = await planDailySession(aRequest, depsWith({ schedule }));

    expect(plan.reviews).toEqual([]);
  });
});
