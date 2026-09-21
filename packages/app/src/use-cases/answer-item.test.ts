import type { Attempt, ExamProfile, Item, ItemId } from "@palier/domain";
import { attemptId, itemId, parseExamProfileOrThrow, sessionId } from "@palier/domain";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import type {
  AttemptStore,
  Clock,
  ItemRepository,
  ScheduleEntry,
  ScheduleStore,
} from "../ports/index.js";
import {
  type AnswerItemDeps,
  type AnswerItemRequest,
  UnknownItemError,
  answerItem,
} from "./answer-item.js";

// Local stubs rather than @palier/testing: that package depends on @palier/app, so
// importing it here would make the build graph cyclic (progress.md D37).

const NOW = "2026-03-01T00:00:00.000Z";
const DAY = 86_400_000;
const after = (days: number): string => new Date(Date.parse(NOW) + days * DAY).toISOString();

/**
 * The real profile, because the Leitner intervals are profile data (ADR 8) and a
 * hand-made four-number stand-in would let a real interval change pass unnoticed.
 * Read from disk rather than imported: this is a test, and @palier/app ships no
 * dependency on @palier/content.
 */
const profile: ExamProfile = parseExamProfileOrThrow(
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL("../../../../content/profiles/psc-sle.json", import.meta.url)),
      "utf8",
    ),
  ),
);
const RETIREMENT = profile.leitnerIntervalDays.length + 1;

const ITEM_ID = itemId("item-0001");

const makeItem = (over: Partial<Item> = {}): Item => ({
  id: ITEM_ID,
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

const clockOf = (iso = NOW): Clock => ({ now: vi.fn(() => iso) });

const itemsOf = (bank: readonly Item[], bankVersion = 7): ItemRepository => ({
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
  bankVersion: vi.fn(() => Promise.resolve(bankVersion)),
});

const attemptsOf = (): AttemptStore => {
  const seen = new Set<string>();
  return {
    // Mirrors the store contract: a fresh id appends and returns true, a
    // duplicate is a no-op and returns false.
    append: vi.fn((a: Attempt) => {
      if (seen.has(a.id)) return Promise.resolve(false);
      seen.add(a.id);
      return Promise.resolve(true);
    }),
    recent: vi.fn(() => Promise.resolve([])),
    since: vi.fn(() => Promise.resolve([])),
    forItem: vi.fn(() => Promise.resolve([])),
  };
};

const scheduleOf = (existing: ScheduleEntry | null = null): ScheduleStore => ({
  due: vi.fn(() => Promise.resolve([])),
  get: vi.fn(() => Promise.resolve(existing)),
  put: vi.fn(() => Promise.resolve()),
});

/**
 * A schedule stub whose `put` updates what `get` returns, so a second call in the
 * same test sees the first call's write. The static `scheduleOf` cannot show the
 * replay guard working: its `get` keeps returning the original box, so even an
 * unguarded reschedule would look idempotent by accident.
 */
const statefulSchedule = (initial: ScheduleEntry | null = null): ScheduleStore => {
  let entry = initial;
  return {
    due: vi.fn(() => Promise.resolve([])),
    get: vi.fn(() => Promise.resolve(entry)),
    put: vi.fn((e: ScheduleEntry) => {
      entry = e;
      return Promise.resolve();
    }),
  };
};

const anEntry = (over: Partial<ScheduleEntry> = {}): ScheduleEntry => ({
  itemId: ITEM_ID,
  due: NOW,
  skill: "writing",
  box: 1,
  ...over,
});

const depsWith = (over: Partial<AnswerItemDeps> = {}): AnswerItemDeps => ({
  clock: clockOf(),
  items: itemsOf([makeItem()]),
  attempts: attemptsOf(),
  schedule: scheduleOf(),
  profile,
  ...over,
});

const aRequest = (over: Partial<AnswerItemRequest> = {}): AnswerItemRequest => ({
  attemptId: attemptId("01HATTEMPT000000000000001"),
  itemId: ITEM_ID,
  response: "a",
  sessionId: sessionId("01HSESSION000000000000001"),
  mode: "drill",
  msToFirstSelect: 1_000,
  msToConfirm: 2_000,
  changedAnswer: false,
  slow: false,
  ...over,
});

/** The last entry written to the schedule, or undefined if nothing was written. */
const written = (schedule: ScheduleStore): ScheduleEntry | undefined =>
  vi.mocked(schedule.put).mock.calls.at(-1)?.[0];

describe("answerItem: scoring and the attempt record", () => {
  it("scores the response through the item type registry", async () => {
    const result = await answerItem(aRequest({ response: "a" }), depsWith());

    expect(result.attempt.correct).toBe(true);
  });

  it("marks an answer that does not name the key incorrect", async () => {
    const result = await answerItem(aRequest({ response: "c" }), depsWith());

    expect(result.attempt.correct).toBe(false);
  });

  it("records the caller-supplied attempt id rather than minting one", async () => {
    const attempts = attemptsOf();
    const id = attemptId("01HATTEMPT000000000000042");

    await answerItem(aRequest({ attemptId: id }), depsWith({ attempts }));

    expect(vi.mocked(attempts.append).mock.calls[0]?.[0].id).toBe(id);
  });

  it("stamps the attempt with the clock, read once", async () => {
    const clock = clockOf();

    const result = await answerItem(aRequest(), depsWith({ clock }));

    expect(result.attempt.ts).toBe(NOW);
    expect(clock.now).toHaveBeenCalledTimes(1);
  });

  it("takes the skill from the item, which is its authority, not from the request", async () => {
    const items = itemsOf([makeItem({ skill: "reading", type: "comprehension" })]);

    const result = await answerItem(aRequest(), depsWith({ items }));

    expect(result.attempt.skill).toBe("reading");
  });

  it("stamps the attempt with the repository's bank version", async () => {
    const items = itemsOf([makeItem()], 12);

    const result = await answerItem(aRequest(), depsWith({ items }));

    expect(result.attempt.bankVersion).toBe(12);
  });

  it("carries the request's timings, mode, session and chosen option onto the attempt", async () => {
    const result = await answerItem(
      aRequest({ mode: "review", msToFirstSelect: 800, msToConfirm: 3_200, changedAnswer: true }),
      depsWith(),
    );

    expect(result.attempt).toMatchObject({
      mode: "review",
      msToFirstSelect: 800,
      msToConfirm: 3_200,
      changedAnswer: true,
      chosen: "a",
      itemId: ITEM_ID,
    });
  });

  it("throws UnknownItemError and writes nothing when the item is not in the bank", async () => {
    const attempts = attemptsOf();
    const schedule = scheduleOf();

    await expect(answerItem(aRequest(), depsWith({ items: itemsOf([]), attempts, schedule })))
      .rejects.toThrow(UnknownItemError);
    expect(attempts.append).not.toHaveBeenCalled();
    expect(schedule.put).not.toHaveBeenCalled();
  });

  it("names the item in the UnknownItemError, so the failure is diagnosable", async () => {
    const error: unknown = await answerItem(aRequest(), depsWith({ items: itemsOf([]) })).then(
      () => null,
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(UnknownItemError);
    expect((error as UnknownItemError).itemId).toBe(ITEM_ID);
    expect((error as UnknownItemError).message).toContain(ITEM_ID);
  });

  it("appends the attempt before it touches the schedule, so evidence survives a failed write", async () => {
    const order: string[] = [];
    const attempts: AttemptStore = {
      ...attemptsOf(),
      append: vi.fn((a: Attempt) => {
        order.push(`append:${a.id}`);
        return Promise.resolve(true);
      }),
    };
    const schedule: ScheduleStore = {
      ...scheduleOf(),
      put: vi.fn(() => {
        order.push("put");
        return Promise.resolve();
      }),
    };

    await answerItem(aRequest({ response: "c" }), depsWith({ attempts, schedule }));

    expect(order).toEqual(["append:01HATTEMPT000000000000001", "put"]);
  });
});

/**
 * product-requirements.md §6.5: "Every item answered incorrectly, and every item
 * answered correctly but slowly or with low confidence, enters a spaced
 * repetition queue." An item already in the queue always reschedules — that is
 * the Leitner rule and it is what moves an item up a box (progress.md D41).
 */
describe("answerItem: which answers enter the review queue", () => {
  it("does not schedule a correct, fast, unwavering answer to an unscheduled item", async () => {
    const schedule = scheduleOf(null);

    const result = await answerItem(aRequest({ response: "a" }), depsWith({ schedule }));

    expect(schedule.put).not.toHaveBeenCalled();
    expect(result.review).toBeNull();
  });

  it("schedules an incorrect answer to an unscheduled item", async () => {
    const schedule = scheduleOf(null);

    await answerItem(aRequest({ response: "c" }), depsWith({ schedule }));

    expect(schedule.put).toHaveBeenCalledTimes(1);
  });

  it("schedules a correct but slow answer to an unscheduled item", async () => {
    const schedule = scheduleOf(null);

    await answerItem(aRequest({ slow: true }), depsWith({ schedule }));

    expect(schedule.put).toHaveBeenCalledTimes(1);
  });

  it("schedules a correct answer the user changed their mind on", async () => {
    const schedule = scheduleOf(null);

    await answerItem(aRequest({ changedAnswer: true }), depsWith({ schedule }));

    expect(schedule.put).toHaveBeenCalledTimes(1);
  });

  it("reschedules a correct, fast answer to an item already in the queue", async () => {
    const schedule = scheduleOf(anEntry({ box: 2 }));

    const result = await answerItem(aRequest(), depsWith({ schedule }));

    expect(schedule.put).toHaveBeenCalledTimes(1);
    expect(result.review?.box).toBe(3);
  });
});

describe("answerItem: the Leitner move it persists", () => {
  it("starts an unseen item in box 1, so a first wrong answer is due tomorrow", async () => {
    const schedule = scheduleOf(null);

    await answerItem(aRequest({ response: "c" }), depsWith({ schedule }));

    expect(written(schedule)).toMatchObject({ box: 1, due: after(profile.leitnerIntervalDays[0]!) });
  });

  it("advances a clean correct answer one box", async () => {
    const schedule = scheduleOf(anEntry({ box: 2 }));

    await answerItem(aRequest(), depsWith({ schedule }));

    expect(written(schedule)).toMatchObject({ box: 3, due: after(profile.leitnerIntervalDays[2]!) });
  });

  it("holds the box when the user changed their answer", async () => {
    const schedule = scheduleOf(anEntry({ box: 3 }));

    await answerItem(aRequest({ changedAnswer: true }), depsWith({ schedule }));

    expect(written(schedule)?.box).toBe(3);
  });

  it("holds the box when the answer was correct but slow", async () => {
    const schedule = scheduleOf(anEntry({ box: 3 }));

    await answerItem(aRequest({ slow: true }), depsWith({ schedule }));

    expect(written(schedule)?.box).toBe(3);
  });

  it("sends an incorrect answer back to box 1, from however high it was", async () => {
    const schedule = scheduleOf(anEntry({ box: 4 }));

    await answerItem(aRequest({ response: "c" }), depsWith({ schedule }));

    expect(written(schedule)?.box).toBe(1);
  });

  it("retires an item with a null due date at the top box", async () => {
    const schedule = scheduleOf(anEntry({ box: RETIREMENT - 1 }));

    const result = await answerItem(aRequest(), depsWith({ schedule }));

    expect(result.review?.box).toBe(RETIREMENT);
    expect(written(schedule)).toMatchObject({ box: RETIREMENT, due: null });
  });

  it("un-retires a retired item answered incorrectly", async () => {
    const schedule = scheduleOf(anEntry({ box: RETIREMENT, due: null }));

    await answerItem(aRequest({ response: "c" }), depsWith({ schedule }));

    expect(written(schedule)).toMatchObject({ box: 1, due: after(profile.leitnerIntervalDays[0]!) });
  });

  it("writes the item's own id and skill onto the schedule entry", async () => {
    const items = itemsOf([makeItem({ skill: "reading", type: "comprehension" })]);
    const schedule = scheduleOf(null);

    await answerItem(aRequest({ response: "c" }), depsWith({ items, schedule }));

    expect(written(schedule)).toMatchObject({ itemId: ITEM_ID, skill: "reading" });
  });

  /**
   * The interval list is profile data and editable in a content pull request
   * (ADR 8), so a stored box can outlive the profile that admitted it. Without
   * the clamp `scheduleReview` throws a RangeError on the next answer.
   */
  it("clamps a stored box that the profile no longer admits, rather than throwing", async () => {
    const schedule = scheduleOf(anEntry({ box: RETIREMENT + 3 }));

    const result = await answerItem(aRequest(), depsWith({ schedule }));

    expect(result.review?.box).toBe(RETIREMENT);
  });
});

/**
 * A retried answer carries the same attemptId (D39/D44). The attempt append is a
 * no-op the second time, and the Leitner move must be too — otherwise a network
 * retry or double-submit advances the box again and the item retires early.
 */
describe("answerItem: a retried answer is idempotent", () => {
  it("does not advance the box when the same attempt id is submitted twice", async () => {
    const schedule = statefulSchedule(anEntry({ box: 2 }));
    const deps = depsWith({ schedule });
    const request = aRequest(); // correct, fast, unwavering

    const first = await answerItem(request, deps);
    const second = await answerItem(request, deps);

    expect(first.review?.box).toBe(3);
    expect(second.review?.box).toBe(3);
    expect(schedule.put).toHaveBeenCalledTimes(1);
  });

  it("writes nothing on a replay of an answer that never entered the queue", async () => {
    const schedule = statefulSchedule(null);
    const deps = depsWith({ schedule });
    const request = aRequest(); // correct, fast, unwavering, unscheduled

    await answerItem(request, deps);
    const second = await answerItem(request, deps);

    expect(second.review).toBeNull();
    expect(schedule.put).not.toHaveBeenCalled();
  });
});
