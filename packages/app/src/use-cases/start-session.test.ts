import type { Item, ItemId } from "@palier/domain";
import { itemId, sessionId } from "@palier/domain";
import { describe, expect, it, vi } from "vitest";

import type {
  AttemptStore,
  Clock,
  ItemRepository,
  Random,
  ScheduleStore,
  Session,
  SessionStore,
} from "../ports/index.js";
import { type StartSessionDeps, type StartSessionRequest, startSession } from "./start-session.js";

// Local stubs rather than @palier/testing: that package depends on @palier/app, so
// importing it here would make the build graph cyclic (progress.md D37).

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

// A pool wide enough for the planner to fill a 10-item day (see plan-daily-session.test).
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

const randomOf = (values: readonly number[] = [0.1, 0.5, 0.9, 0.3, 0.7]): Random => {
  let i = 0;
  return { next: vi.fn(() => values[i++ % values.length]!) };
};

const scheduleOf = (): ScheduleStore => ({
  due: vi.fn(() => Promise.resolve([])),
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

const attemptsOf = (): AttemptStore => ({
  append: vi.fn(() => Promise.resolve(true)),
  recent: vi.fn(() => Promise.resolve([])),
  since: vi.fn(() => Promise.resolve([])),
  forItem: vi.fn(() => Promise.resolve([])),
  all: vi.fn(() => Promise.resolve([])),
  clear: vi.fn(() => Promise.resolve()),
});

/** A sessions stub whose `latest()` returns a fixed prior session (or none). */
const sessionsOf = (latest: Session | null = null): SessionStore => ({
  create: vi.fn(() => Promise.resolve()),
  complete: vi.fn(() => Promise.resolve(null)),
  latest: vi.fn(() => Promise.resolve(latest)),
  all: vi.fn(() => Promise.resolve([])),
  clear: vi.fn(() => Promise.resolve()),
});

const aPriorSession = (over: Partial<Session> = {}): Session => ({
  id: sessionId("01HSESSIONPRIOR00000001"),
  mode: "drill",
  startedAt: "2026-02-28T00:00:00.000Z",
  completedAt: null,
  ...over,
});

const depsWith = (over: Partial<StartSessionDeps> = {}): StartSessionDeps => ({
  clock: clockOf(),
  sessions: sessionsOf(),
  random: randomOf(),
  items: itemsOf(aPool()),
  schedule: scheduleOf(),
  attempts: attemptsOf(),
  ...over,
});

const aRequest = (over: Partial<StartSessionRequest> = {}): StartSessionRequest => ({
  sessionId: sessionId("01HSESSIONTODAY00000001"),
  mode: "drill",
  plan: { skill: "writing", lang: "fr", targetBand: "B", sessionSize: 10 },
  ...over,
});

describe("startSession: the session it records", () => {
  it("records the caller-supplied id rather than minting one", async () => {
    const sessions = sessionsOf();
    const id = sessionId("01HSESSIONTODAY00000042");

    const result = await startSession(aRequest({ sessionId: id }), depsWith({ sessions }));

    expect(result.session.id).toBe(id);
    expect(vi.mocked(sessions.create).mock.calls[0]?.[0].id).toBe(id);
  });

  it("stamps startedAt from the injected clock and opens the session in progress", async () => {
    const clock = clockOf();

    const result = await startSession(aRequest(), depsWith({ clock }));

    expect(result.session).toMatchObject({ startedAt: NOW, completedAt: null });
    // The clock is read here for startedAt, and again inside the composed
    // planDailySession — both go through the injected port, never Date.now().
    expect(clock.now).toHaveBeenCalled();
  });

  it("carries the request's mode onto the session", async () => {
    const result = await startSession(aRequest({ mode: "diagnostic" }), depsWith());

    expect(result.session.mode).toBe("diagnostic");
  });

  it("returns the composed daily plan alongside the session", async () => {
    const result = await startSession(aRequest(), depsWith());

    expect(result.plan.items.length).toBeGreaterThan(0);
  });
});

describe("startSession: deriving lastDayCompleted from the previous session", () => {
  it("shortens the day when the previous session was left in progress", async () => {
    const full = await startSession(aRequest(), depsWith({ sessions: sessionsOf(null) }));
    const shortened = await startSession(
      aRequest(),
      depsWith({ sessions: sessionsOf(aPriorSession({ completedAt: null })) }),
    );

    expect(shortened.plan.items.length).toBeLessThan(full.plan.items.length);
  });

  it("does not shorten the day when the previous session was completed", async () => {
    const full = await startSession(aRequest(), depsWith({ sessions: sessionsOf(null) }));
    const afterComplete = await startSession(
      aRequest(),
      depsWith({
        sessions: sessionsOf(aPriorSession({ completedAt: "2026-02-28T12:00:00.000Z" })),
      }),
    );

    expect(afterComplete.plan.items.length).toBe(full.plan.items.length);
  });

  it("omits the signal entirely on a first-ever session, planning a full day", async () => {
    const result = await startSession(aRequest(), depsWith({ sessions: sessionsOf(null) }));

    expect(result.plan.items.length).toBeGreaterThan(0);
    expect(result.plan.tapering).toBe(false);
  });
});

describe("startSession: ordering", () => {
  it("reads the previous session before it creates this one, so the new session cannot poison its own signal", async () => {
    const order: string[] = [];
    const sessions: SessionStore = {
      latest: vi.fn(() => {
        order.push("latest");
        return Promise.resolve(null);
      }),
      create: vi.fn(() => {
        order.push("create");
        return Promise.resolve();
      }),
      complete: vi.fn(() => Promise.resolve(null)),
      all: vi.fn(() => Promise.resolve([])),
      clear: vi.fn(() => Promise.resolve()),
    };

    await startSession(aRequest(), depsWith({ sessions }));

    expect(order).toEqual(["latest", "create"]);
  });

  it("does not create a session when planning fails, so a failed plan leaves no orphan", async () => {
    const sessions = sessionsOf();
    const schedule: ScheduleStore = {
      ...scheduleOf(),
      due: vi.fn(() => Promise.reject(new Error("bank offline"))),
    };

    await expect(startSession(aRequest(), depsWith({ sessions, schedule }))).rejects.toThrow(
      "bank offline",
    );
    expect(sessions.create).not.toHaveBeenCalled();
  });
});
