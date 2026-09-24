import type { ScheduleEntry, Session, SyncRecord } from "@palier/app";
import { stableJson } from "@palier/app";
import { attemptId, itemId, sessionId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { aScheduleEntry, aSession, anAttempt } from "../fixtures/builders.js";
import {
  type DeviceView,
  differingTrends,
  diverged,
  duplicatedAttempts,
  expectedAfterHeal,
  inventedSchedule,
  lostAttempts,
  unexpected,
} from "./oracle.js";

const attempt = (id: string): SyncRecord => ({ type: "attempt", id, value: anAttempt({ id: attemptId(id) }) });
const entry = (id: string, over: Partial<ScheduleEntry> = {}): SyncRecord => ({
  type: "schedule",
  id,
  value: aScheduleEntry({ itemId: itemId(id), ...over }),
});
const session = (id: string, over: Partial<Session> = {}): SyncRecord => ({
  type: "session",
  id,
  value: aSession({ id: sessionId(id), ...over }),
});
const setting = (key: string, value: unknown): SyncRecord => ({ type: "setting", id: key, value: { key, value } });

const records = (...rs: SyncRecord[]) => new Map(rs.map((r) => [`${r.type}:${r.id}`, r]));

const aView = (name: string, rs: SyncRecord[], over: Partial<DeviceView> = {}): DeviceView => ({
  name,
  records: records(...rs),
  attemptCount: rs.filter((r) => r.type === "attempt").length,
  trends: "same",
  ...over,
});

describe("lostAttempts", () => {
  it("finds nothing when every device holds every attempt answered", () => {
    expect(lostAttempts([attempt("a")], [aView("d0", [attempt("a")])])).toEqual([]);
  });

  it("names the device missing an attempt", () => {
    expect(lostAttempts([attempt("a")], [aView("d0", [attempt("a")]), aView("d1", [])])).toEqual([
      expect.objectContaining({ check: "lost-attempt", device: "d1" }),
    ]);
  });

  it("counts an attempt stored under its id with different content as lost, which is how colliding ids show", () => {
    const other: SyncRecord = { type: "attempt", id: "a", value: anAttempt({ id: attemptId("a"), correct: false }) };

    expect(lostAttempts([attempt("a")], [aView("d0", [other])])).toHaveLength(1);
  });
});

describe("duplicatedAttempts", () => {
  it("finds nothing when the store holds each attempt once", () => {
    expect(duplicatedAttempts([aView("d0", [attempt("a")])])).toEqual([]);
  });

  it("names a device whose store holds more attempts than it has ids", () => {
    expect(duplicatedAttempts([aView("d0", [attempt("a")], { attemptCount: 2 })])).toEqual([
      expect.objectContaining({ check: "duplicated-attempt", device: "d0" }),
    ]);
  });
});

describe("diverged", () => {
  it("finds nothing for no devices", () => {
    expect(diverged([])).toEqual([]);
  });

  it("finds nothing when every device holds the same records", () => {
    expect(diverged([aView("d0", [entry("x")]), aView("d1", [entry("x")])])).toEqual([]);
  });

  it("names a device holding a record the first does not", () => {
    expect(diverged([aView("d0", []), aView("d1", [entry("x")])])).toEqual([
      expect.objectContaining({ check: "diverged", device: "d1" }),
    ]);
  });

  it("names a device holding a different copy of the same record", () => {
    expect(diverged([aView("d0", [entry("x", { box: 1 })]), aView("d1", [entry("x", { box: 2 })])])).toHaveLength(1);
  });
});

describe("differingTrends", () => {
  it("finds nothing for no devices", () => {
    expect(differingTrends([])).toEqual([]);
  });

  it("names a device whose trend differs from the first's", () => {
    expect(differingTrends([aView("d0", []), aView("d1", [], { trends: "other" })])).toEqual([
      expect.objectContaining({ check: "trend-differs", device: "d1" }),
    ]);
  });
});

describe("inventedSchedule", () => {
  it("accepts a schedule entry some answer wrote", () => {
    const x = entry("x");

    expect(inventedSchedule(new Set([stableJson(x.value)]), [aView("d0", [x, attempt("a")])])).toEqual([]);
  });

  it("names a schedule entry no answer ever wrote", () => {
    expect(inventedSchedule(new Set(), [aView("d0", [entry("x")])])).toEqual([
      expect.objectContaining({ check: "invented-schedule", device: "d0" }),
    ]);
  });
});

describe("expectedAfterHeal", () => {
  it("keeps the base copy of a record no side changed", () => {
    const base = records(entry("x"));

    expect(expectedAfterHeal(base, [base, base]).get("schedule:x")).toEqual({ exact: entry("x") });
  });

  it("takes the one side's copy of a record only it changed, so a device that stayed away cannot overwrite it", () => {
    const base = records(entry("x", { box: 1 }));

    expect(expectedAfterHeal(base, [records(entry("x", { box: 3 })), base]).get("schedule:x")).toEqual({
      exact: entry("x", { box: 3 }),
    });
  });

  it("folds a schedule entry every side changed to the lowest box (Gate B)", () => {
    const base = records(entry("x", { box: 2 }));
    const sides = [records(entry("x", { box: 3 })), records(entry("x", { box: 1 })), records(entry("x", { box: 4 }))];

    expect(expectedAfterHeal(base, sides).get("schedule:x")).toEqual({ exact: entry("x", { box: 1 }) });
  });

  it("expects a record new on one side", () => {
    expect(expectedAfterHeal(records(), [records(session("s")), records()]).get("session:s")).toEqual({ exact: session("s") });
  });

  it("accepts either copy of a setting changed on two sides, since the last device to push wins", () => {
    const base = records(setting("goal", 10));

    expect(expectedAfterHeal(base, [records(setting("goal", 20)), records(setting("goal", 30))]).get("setting:goal")).toEqual({
      oneOf: [setting("goal", 20), setting("goal", 30)],
    });
  });

  it("takes a setting changed on one side exactly", () => {
    const base = records(setting("goal", 10));

    expect(expectedAfterHeal(base, [records(setting("goal", 20)), base]).get("setting:goal")).toEqual({
      exact: setting("goal", 20),
    });
  });
});

describe("unexpected", () => {
  it("finds nothing when a device holds exactly what is expected", () => {
    const expected = expectedAfterHeal(records(entry("x")), []);

    expect(unexpected(expected, [aView("d0", [entry("x")])])).toEqual([]);
  });

  it("names a device holding the wrong copy", () => {
    const expected = expectedAfterHeal(records(entry("x", { box: 1 })), []);

    expect(unexpected(expected, [aView("d0", [entry("x", { box: 2 })])])).toEqual([
      expect.objectContaining({ check: "merge-oracle", device: "d0" }),
    ]);
  });

  it("names a device holding a record nothing expected", () => {
    expect(unexpected(new Map(), [aView("d0", [entry("x")])])).toHaveLength(1);
  });

  it("accepts any of a setting's allowed copies", () => {
    const expected = new Map([["setting:goal", { oneOf: [setting("goal", 20), setting("goal", 30)] }]]);

    expect(unexpected(expected, [aView("d0", [setting("goal", 30)])])).toEqual([]);
  });

  it("rejects a setting copy that is none of the allowed ones", () => {
    const expected = new Map([["setting:goal", { oneOf: [setting("goal", 20), setting("goal", 30)] }]]);

    expect(unexpected(expected, [aView("d0", [setting("goal", 10)])])).toHaveLength(1);
  });
});
