import type { Attempt, AttemptMode, Item, ItemId } from "@palier/domain";
import { attemptId, itemId, scenarioId, sessionId } from "@palier/domain";
import { describe, expect, it, vi } from "vitest";

import type { AttemptStore, Clock, ItemRepository, OralSession, OralStore, ScheduleEntry, ScheduleStore } from "../ports/index.js";
import { oralTotals, progressReport } from "./progress-report.js";
import { reviewQueue } from "./review-queue.js";

// Local stubs rather than @palier/testing (progress.md D37).

const NOW = "2026-09-24T12:00:00.000Z";

const makeItem = (id: ItemId, subSkill: Item["subSkill"] = "main-idea"): Item => ({
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
  subSkill,
  targetBand: "B",
  topic: "human-resources",
  tags: [],
  provenance: { origin: "generated" },
  status: "published",
  createdAt: NOW,
  updatedAt: NOW,
});

const itemsFrom = (bank: readonly Item[]): ItemRepository => ({
  byIds: vi.fn((ids: readonly ItemId[]) =>
    Promise.resolve(ids.map((id) => bank.find((i) => i.id === id)).filter((i): i is Item => i !== undefined)),
  ),
  query: vi.fn(() => Promise.resolve([])),
  passage: vi.fn(() => Promise.resolve(null)),
  form: vi.fn(() => Promise.resolve(null)),
  forms: vi.fn(() => Promise.resolve([])),
  scenario: vi.fn(() => Promise.resolve(null)),
  scenarios: vi.fn(() => Promise.resolve([])),
  bankVersion: vi.fn(() => Promise.resolve(1)),
});

describe("reviewQueue", () => {
  const clock: Clock = { now: () => NOW };
  const entry = (id: string): ScheduleEntry => ({ itemId: itemId(id), due: NOW, skill: "reading", box: 1 });
  const scheduleOf = (entries: ScheduleEntry[]): ScheduleStore => ({
    due: vi.fn((_now, limit: number) => Promise.resolve(entries.slice(0, limit))),
    get: vi.fn(() => Promise.resolve(null)),
    put: vi.fn(() => Promise.resolve()),
    all: vi.fn(() => Promise.resolve(entries)),
    clear: vi.fn(() => Promise.resolve()),
  });

  it("resolves what is due now to items, in the schedule's order", async () => {
    const schedule = scheduleOf([entry("b"), entry("a")]);
    const { items } = await reviewQueue(
      { limit: 10 },
      { clock, schedule, items: itemsFrom([makeItem(itemId("a")), makeItem(itemId("b"))]) },
    );
    expect(items.map((i) => i.id)).toEqual(["b", "a"]);
    expect(vi.mocked(schedule.due).mock.calls[0]).toEqual([NOW, 10]);
  });

  it("drops a due entry whose item has left the bank", async () => {
    const { items } = await reviewQueue(
      { limit: 10 },
      { clock, schedule: scheduleOf([entry("gone"), entry("a")]), items: itemsFrom([makeItem(itemId("a"))]) },
    );
    expect(items.map((i) => i.id)).toEqual(["a"]);
  });

  it("asks for nothing when the limit is not positive", async () => {
    const schedule = scheduleOf([entry("a")]);
    expect((await reviewQueue({ limit: 0 }, { clock, schedule, items: itemsFrom([]) })).items).toEqual([]);
    expect(schedule.due).not.toHaveBeenCalled();
  });
});

describe("progressReport", () => {
  let seq = 0;
  const anAttempt = (id: string, mode: AttemptMode, correct: boolean, skill: "reading" | "writing" = "reading"): Attempt => ({
    id: attemptId(`att-${String(++seq)}`),
    itemId: itemId(id),
    bankVersion: 1,
    skill,
    sessionId: sessionId("s"),
    chosen: "a",
    correct,
    msToFirstSelect: 1_000,
    msToConfirm: 4_000,
    changedAnswer: false,
    mode,
    ts: `2026-09-2${String(seq % 4)}T10:00:00.000Z`,
  });
  const attemptsOf = (attempts: Attempt[]): AttemptStore => ({
    append: vi.fn(() => Promise.resolve(true)),
    recent: vi.fn(() => Promise.resolve([])),
    since: vi.fn(() => Promise.resolve([])),
    forItem: vi.fn(() => Promise.resolve([])),
    all: vi.fn(() => Promise.resolve(attempts)),
    clear: vi.fn(() => Promise.resolve()),
  });
  const bank = [makeItem(itemId("i1"), "main-idea"), makeItem(itemId("i2"), "inference")];

  it("reports the skill's whole practice record: trend, sub-skills, count and time answering", async () => {
    const report = await progressReport(
      { skill: "reading" },
      {
        items: itemsFrom(bank),
        attempts: attemptsOf([
          anAttempt("i1", "drill", true),
          anAttempt("i1", "review", false),
          anAttempt("i2", "diagnostic", false),
        ]),
      },
    );
    expect(report.answered).toBe(3);
    expect(report.msAnswering).toBe(12_000);
    expect(report.bySubSkill).toEqual([
      { subSkill: "inference", attempted: 1, correct: 0 },
      { subSkill: "main-idea", attempted: 2, correct: 1 },
    ]);
    expect(report.trend.windowSize).toBe(3);
  });

  it("leaves out exam attempts and the other skill", async () => {
    const deps = {
      items: itemsFrom(bank),
      attempts: attemptsOf([
        anAttempt("i1", "drill", true),
        anAttempt("i1", "exam", false),
        anAttempt("i2", "drill", true, "writing"),
      ]),
    };
    const report = await progressReport({ skill: "reading" }, deps);
    expect(report.answered).toBe(1);
    // Each answered item is resolved once, however often it was answered.
    expect(vi.mocked(deps.items.byIds).mock.calls[0]?.[0]).toEqual(["i1"]);
  });

  it("is an empty report, not an error, before any practice", async () => {
    const report = await progressReport({ skill: "writing" }, { items: itemsFrom([]), attempts: attemptsOf([]) });
    expect(report).toMatchObject({ answered: 0, msAnswering: 0, bySubSkill: [] });
    expect(report.trend.windowSize).toBe(0);
  });
});

describe("oralTotals (PRD §8.9's oral sessions and minutes spoken)", () => {
  const session = (id: string, endedAt: string | null, turns: OralSession["turns"]): OralSession => ({
    id: sessionId(id),
    scenarioId: scenarioId("scenario-1"),
    startedAt: NOW,
    endedAt,
    endReason: endedAt === null ? null : "completed",
    turns,
    assessment: null,
  });
  const voice = (startMs: number, endMs: number) =>
    ({ speaker: "candidate", text: "Oui.", phase: 0, startMs, endMs, input: "voice" }) as const;
  const oralFrom = (sessions: readonly OralSession[]): OralStore =>
    ({ all: () => Promise.resolve(sessions) }) as unknown as OralStore;

  it("counts nothing on a device that has never spoken", async () => {
    expect(await oralTotals({ oral: oralFrom([]) })).toEqual({ sessions: 0, msSpoken: 0 });
  });

  it("counts the ended sessions and sums what was spoken in them", async () => {
    const oral = oralFrom([
      session("a", NOW, [voice(0, 60_000), { speaker: "examiner", text: "Merci.", phase: 0, startMs: 61_000, endMs: 61_000 }]),
      session("b", NOW, [voice(0, 30_000), { ...voice(40_000, 90_000), input: "typed" }]),
    ]);
    expect(await oralTotals({ oral })).toEqual({ sessions: 2, msSpoken: 90_000 });
  });

  it("leaves out a session still running, which has no settled length", async () => {
    const oral = oralFrom([session("a", NOW, [voice(0, 60_000)]), session("live", null, [voice(0, 45_000)])]);
    expect(await oralTotals({ oral })).toEqual({ sessions: 1, msSpoken: 60_000 });
  });
});
