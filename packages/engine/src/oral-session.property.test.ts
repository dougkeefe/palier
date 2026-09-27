import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { ORAL_END_REASONS } from "@palier/domain";

import type { OralSessionCommand, OralSessionEvent, OralSessionState } from "./oral-session.js";
import { startOralSession, stepOralSession } from "./oral-session.js";

/**
 * The session machine's guarantees, over any phase plan and any stream of events
 * (Phase 5 exit criterion 5, progress.md D116): it ends within the scenario's
 * minutes, never skips or repeats a phase, and every end carries a reason.
 */

// Minutes in quarter-minute steps, as a factory's plan might set them, 1 to 6 phases.
const phases = fc.array(
  fc.integer({ min: 1, max: 40 }).map((quarters) => ({ minutes: quarters / 4 })),
  { minLength: 1, maxLength: 6 },
);

const lengthOf = (plan: readonly { minutes: number }[]) => startOralSession(plan).state.lengthMs;

const eventAt = (maxMs: number): fc.Arbitrary<OralSessionEvent> => {
  const at = fc.integer({ min: 0, max: maxMs });
  return fc.oneof(
    { weight: 6, arbitrary: at.map((atMs) => ({ kind: "tick" as const, atMs })) },
    {
      weight: 3,
      arbitrary: fc
        .tuple(at, fc.constantFrom("escalate" as const, "deescalate" as const))
        .map(([atMs, direction]) => ({ kind: "difficulty" as const, direction, atMs })),
    },
    { weight: 1, arbitrary: at.map((atMs) => ({ kind: "end-requested" as const, atMs })) },
    {
      weight: 1,
      arbitrary: fc.tuple(at, fc.boolean()).map(([atMs, failed]) => ({ kind: "transport-closed" as const, failed, atMs })),
    },
  );
};

/** A plan and events that may run past its end by up to half its length. */
const planAndEvents = phases.chain((plan) =>
  fc.tuple(fc.constant(plan), fc.array(eventAt(Math.round(lengthOf(plan) * 1.5)), { maxLength: 40 })),
);

type Run = { readonly state: OralSessionState; readonly commands: readonly OralSessionCommand[] };

const run = (plan: readonly { minutes: number }[], events: readonly OralSessionEvent[]): Run => {
  const start = startOralSession(plan);
  let state = start.state;
  const commands = [...start.commands];
  for (const event of events) {
    const step = stepOralSession(state, event);
    state = step.state;
    commands.push(...step.commands);
  }
  return { state, commands };
};

const entered = (commands: readonly OralSessionCommand[]) =>
  commands.flatMap((c) => (c.kind === "enter-phase" ? [c.phase] : []));

describe("the oral session machine, over any plan and any events", () => {
  it("enters phases 0, 1, 2… in order, never skipping or repeating one", () => {
    fc.assert(
      fc.property(planAndEvents, ([plan, events]) => {
        const phasesEntered = entered(run(plan, events).commands);
        expect(phasesEntered).toEqual(phasesEntered.map((_, i) => i));
        expect(phasesEntered.length).toBeLessThanOrEqual(plan.length);
      }),
    );
  });

  it("is in the phase that holds the latest time it has seen, until it ends", () => {
    fc.assert(
      fc.property(planAndEvents, ([plan, events]) => {
        const { state } = run(plan, events);
        if (state.ended !== null) return;
        const latest = Math.max(0, ...events.map((e) => e.atMs));
        const holding = state.boundariesMs.findIndex((boundary) => latest < boundary);
        expect(state.phase).toBe(holding);
      }),
    );
  });

  it("does not care how often it is ticked: a tick at a, then b, does what b alone does", () => {
    fc.assert(
      fc.property(phases, fc.nat(), fc.nat(), (plan, x, y) => {
        const length = lengthOf(plan);
        const [a, b] = [x % (length * 2), y % (length * 2)].sort((p, q) => p - q) as [number, number];
        const twice = run(plan, [{ kind: "tick", atMs: a }, { kind: "tick", atMs: b }]);
        const once = run(plan, [{ kind: "tick", atMs: b }]);
        // An ended session ignores later ticks, so only the time it last saw may differ.
        const outcome = ({ state, commands }: Run) => ({ commands, phase: state.phase, ended: state.ended });
        expect(outcome(twice)).toEqual(outcome(once));
      }),
    );
  });

  it("ends by the scenario's length, and never calls a session completed before it", () => {
    fc.assert(
      fc.property(planAndEvents, ([plan, events]) => {
        const length = lengthOf(plan);
        const withEnd = [...events, { kind: "tick" as const, atMs: length }];
        const { state, commands } = run(plan, withEnd);
        expect(state.ended).not.toBeNull();
        if (state.ended === "completed") {
          const endedAt = Math.max(...withEnd.map((e) => e.atMs));
          expect(endedAt).toBeGreaterThanOrEqual(length);
          expect(entered(commands)).toHaveLength(plan.length);
        }
      }),
    );
  });

  it("closes exactly once, last, with a reason it knows", () => {
    fc.assert(
      fc.property(planAndEvents, ([plan, events]) => {
        const { state, commands } = run(plan, [...events, { kind: "tick", atMs: lengthOf(plan) }]);
        const closes = commands.filter((c) => c.kind === "close");
        expect(closes).toHaveLength(1);
        expect(commands.at(-1)).toEqual(closes[0]);
        expect(ORAL_END_REASONS).toContain(state.ended);
        expect(closes[0]).toEqual({ kind: "close", reason: state.ended });
      }),
    );
  });

  it("only ever adapts the phase it is in", () => {
    fc.assert(
      fc.property(planAndEvents, ([plan, events]) => {
        let current = -1;
        for (const command of run(plan, events).commands) {
          if (command.kind === "enter-phase") current = command.phase;
          if (command.kind === "adapt") expect(command.phase).toBe(current);
        }
      }),
    );
  });

  it("never moves backwards, however out of order the events arrive", () => {
    fc.assert(
      fc.property(planAndEvents, ([plan, events]) => {
        const start = startOralSession(plan);
        let state = start.state;
        for (const event of events) {
          const next = stepOralSession(state, event).state;
          expect(next.phase).toBeGreaterThanOrEqual(state.phase);
          expect(next.lastAtMs).toBeGreaterThanOrEqual(state.lastAtMs);
          state = next;
        }
      }),
    );
  });

  it("gives the same answer for the same plan and events, every time", () => {
    fc.assert(
      fc.property(planAndEvents, ([plan, events]) => {
        expect(run(plan, events)).toEqual(run(plan, events));
      }),
    );
  });
});
