import { describe, expect, it } from "vitest";

import type { OralSessionEvent, OralSessionState } from "./oral-session.js";
import { startOralSession, stepOralSession } from "./oral-session.js";

const MIN = 60_000;
/** A 10-minute work discussion: 2, 5 and 3 minutes (PRD §8.6). */
const WORK = [{ minutes: 2 }, { minutes: 5 }, { minutes: 3 }];

const opened = (): OralSessionState => startOralSession(WORK).state;
const tick = (atMs: number): OralSessionEvent => ({ kind: "tick", atMs });

describe("startOralSession", () => {
  it("opens in the first phase, at its baseline, and says so", () => {
    const { state, commands } = startOralSession(WORK);

    expect(commands).toEqual([{ kind: "enter-phase", phase: 0 }]);
    expect(state).toEqual({
      boundariesMs: [2 * MIN, 7 * MIN, 10 * MIN],
      lengthMs: 10 * MIN,
      phase: 0,
      register: "baseline",
      lastAtMs: 0,
      ended: null,
    });
  });

  it("rounds each boundary once, from the running total, so fractional minutes never drift", () => {
    const { state } = startOralSession([{ minutes: 1 / 3 }, { minutes: 1 / 3 }, { minutes: 1 / 3 }]);

    expect(state.boundariesMs).toEqual([20_000, 40_000, 60_000]);
    expect(state.lengthMs).toBe(60_000);
  });

  it("refuses a session with no phases", () => {
    expect(() => startOralSession([])).toThrow(RangeError);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("refuses a phase of %s minutes", (minutes) => {
    expect(() => startOralSession([{ minutes: 2 }, { minutes }])).toThrow(RangeError);
  });
});

describe("stepOralSession", () => {
  it("stays in a phase until its minutes run out", () => {
    expect(stepOralSession(opened(), tick(2 * MIN - 1)).commands).toEqual([]);
  });

  it("enters the next phase at its boundary", () => {
    const { state, commands } = stepOralSession(opened(), tick(2 * MIN));

    expect(commands).toEqual([{ kind: "enter-phase", phase: 1 }]);
    expect(state.phase).toBe(1);
  });

  it("enters each phase it crossed, in order, rather than jumping", () => {
    const withThree = startOralSession([{ minutes: 1 }, { minutes: 1 }, { minutes: 1 }, { minutes: 1 }]).state;

    expect(stepOralSession(withThree, tick(3 * MIN + 1)).commands).toEqual([
      { kind: "enter-phase", phase: 1 },
      { kind: "enter-phase", phase: 2 },
      { kind: "enter-phase", phase: 3 },
    ]);
  });

  it("completes at the session's length, having entered every phase", () => {
    const { state, commands } = stepOralSession(opened(), tick(10 * MIN));

    expect(commands).toEqual([
      { kind: "enter-phase", phase: 1 },
      { kind: "enter-phase", phase: 2 },
      { kind: "close", reason: "completed" },
    ]);
    expect(state).toMatchObject({ phase: 2, ended: "completed" });
  });

  it("escalates the current phase when the candidate is coping, once", () => {
    const first = stepOralSession(opened(), { kind: "difficulty", direction: "escalate", atMs: MIN });
    const again = stepOralSession(first.state, { kind: "difficulty", direction: "escalate", atMs: MIN + 1 });

    expect(first.commands).toEqual([{ kind: "adapt", phase: 0, register: "escalate" }]);
    expect(first.state.register).toBe("escalate");
    expect(again.commands).toEqual([]);
  });

  it("de-escalates after escalating when the candidate starts to struggle", () => {
    const up = stepOralSession(opened(), { kind: "difficulty", direction: "escalate", atMs: MIN });
    const down = stepOralSession(up.state, { kind: "difficulty", direction: "deescalate", atMs: MIN + 1 });

    expect(down.commands).toEqual([{ kind: "adapt", phase: 0, register: "deescalate" }]);
  });

  it("starts each phase at its baseline, and adapts the new phase, not the old", () => {
    const up = stepOralSession(opened(), { kind: "difficulty", direction: "escalate", atMs: MIN });
    const moved = stepOralSession(up.state, tick(2 * MIN));
    const upAgain = stepOralSession(moved.state, { kind: "difficulty", direction: "escalate", atMs: 3 * MIN });

    expect(moved.state.register).toBe("baseline");
    expect(upAgain.commands).toEqual([{ kind: "adapt", phase: 1, register: "escalate" }]);
  });

  it("enters the phase a late difficulty flag arrives in before adapting it", () => {
    const { commands } = stepOralSession(opened(), { kind: "difficulty", direction: "deescalate", atMs: 2 * MIN });

    expect(commands).toEqual([
      { kind: "enter-phase", phase: 1 },
      { kind: "adapt", phase: 1, register: "deescalate" },
    ]);
  });

  it("closes early when the candidate ends the session", () => {
    const { state, commands } = stepOralSession(opened(), { kind: "end-requested", atMs: 3 * MIN });

    expect(commands).toEqual([
      { kind: "enter-phase", phase: 1 },
      { kind: "close", reason: "ended-by-user" },
    ]);
    expect(state.ended).toBe("ended-by-user");
  });

  it.each([
    [false, "transport-closed"],
    [true, "transport-failed"],
  ] as const)("closes when the connection ends (failed: %s) with the reason %s", (failed, reason) => {
    const { commands } = stepOralSession(opened(), { kind: "transport-closed", failed, atMs: MIN });

    expect(commands).toEqual([{ kind: "close", reason }]);
  });

  it("calls a session that ends at its length completed, whatever ended it", () => {
    const { commands } = stepOralSession(opened(), { kind: "end-requested", atMs: 10 * MIN });

    expect(commands.at(-1)).toEqual({ kind: "close", reason: "completed" });
  });

  it("says nothing once it has ended", () => {
    const ended = stepOralSession(opened(), { kind: "end-requested", atMs: MIN }).state;

    expect(stepOralSession(ended, tick(10 * MIN))).toEqual({ state: ended, commands: [] });
    expect(stepOralSession(ended, { kind: "difficulty", direction: "escalate", atMs: 2 * MIN }).commands).toEqual([]);
  });

  it("takes an event stamped earlier than one already seen as happening at the later time", () => {
    const later = stepOralSession(opened(), tick(3 * MIN)).state;
    const { state, commands } = stepOralSession(later, tick(MIN));

    expect(commands).toEqual([]);
    expect(state).toMatchObject({ phase: 1, lastAtMs: 3 * MIN });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("refuses an event at %s", (atMs) => {
    expect(() => stepOralSession(opened(), tick(atMs))).toThrow(RangeError);
  });
});
