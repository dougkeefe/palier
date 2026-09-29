import { describe, expect, it } from "vitest";

import { startOralSessionRun } from "@palier/app";
import type { OralScenario } from "@palier/domain";
import { sessionId } from "@palier/domain";

import { fakeClock } from "../clock/fake-clock.js";
import { FIXTURE_BANK, fixtureBankRepository } from "../fixtures/bank.js";
import { memoryOralLiveness } from "./oral-liveness.js";
import { memoryOralStore } from "./oral-store.js";
import type { OralScriptEntry } from "./oral-transport.js";
import { memoryOralTransport } from "./oral-transport.js";

/**
 * Phase 5's exit criterion 5: "the session state machine is contract-tested against a
 * fake transport, so phase 6 inherits a tested machine" (progress.md D116). The real
 * driver, `startOralSessionRun`, runs the engine's machine over the scripted transport
 * the transport contract holds, with a `FakeClock` and the in-memory store, for every
 * session type the fixture bank ships. It lives here, not in `@palier/app`, because an
 * app test may not import this package (D37).
 */

const START = "2026-09-27T10:00:00.000Z";
const MIN = 60_000;
/** The screen's timer: a tick every 15 seconds. */
const TICK_MS = 15_000;
const SCENARIOS = FIXTURE_BANK.scenarios ?? [];

const boundaries = (scenario: OralScenario): number[] => {
  let total = 0;
  return scenario.phases.map((phase) => (total += phase.minutes * MIN));
};

/** In each phase, the examiner asks a second in, and the candidate answers until 20 seconds in. */
const scriptFor = (scenario: OralScenario): OralScriptEntry[] => {
  const starts = [0, ...boundaries(scenario).slice(0, -1)];
  return starts.flatMap((from, phase) => [
    { atMs: from + 3_000, kind: "turn", speaker: "examiner", text: `Q${String(phase)}`, startMs: from + 1_000, endMs: from + 3_000 },
    { atMs: from + 20_000, kind: "turn", speaker: "candidate", text: `R${String(phase)}`, startMs: from + 4_000, endMs: from + 20_000 },
  ]);
};

const setUp = (scenario: OralScenario, options: Parameters<typeof memoryOralTransport>[1] = {}) => {
  const clock = fakeClock(START);
  const fake = memoryOralTransport(scriptFor(scenario), options);
  const oral = memoryOralStore();
  const liveness = memoryOralLiveness();
  const deps = { clock, items: fixtureBankRepository(), oral, transport: fake.transport, liveness };
  return { clock, fake, oral, liveness, deps };
};

/** Drive the screen's timer: the clock moves, the examiner says what is due, the session ticks. */
const runFor = async (
  handles: ReturnType<typeof setUp>,
  run: { readonly tick: () => Promise<void> },
  untilMs: number,
  from = 0,
): Promise<void> => {
  for (let at = from + TICK_MS; at <= untilMs; at += TICK_MS) {
    handles.clock.advance(TICK_MS);
    await handles.fake.advance(at);
    await run.tick();
  }
};

describe("an oral session driven end to end over a fake transport", () => {
  it("has a scenario for every session type to run", () => {
    expect(SCENARIOS.map((s) => s.sessionType).sort()).toEqual(["full", "opinion", "situation", "warmup", "work"]);
  });

  it.each(SCENARIOS.map((s) => [s.sessionType, s] as const))(
    "%s: enters every phase once, in order, and completes at the scenario's length with its transcript",
    async (_type, scenario) => {
      const handles = setUp(scenario);
      const run = await startOralSessionRun({ sessionId: sessionId(`run-${scenario.id}`), scenarioId: scenario.id }, handles.deps);
      const lengthMs = boundaries(scenario).at(-1) ?? 0;
      await runFor(handles, run, lengthMs);
      const ended = await run.ended;

      expect(handles.fake.directives()).toEqual(scenario.phases.map((_, phase) => ({ phase, register: "baseline" })));
      expect(ended.endReason).toBe("completed");
      expect(Date.parse(ended.endedAt ?? "") - Date.parse(ended.startedAt)).toBe(lengthMs);
      expect(ended.turns.map((t) => [t.text, t.phase])).toEqual(
        scenario.phases.flatMap((_, phase) => [
          [`Q${String(phase)}`, phase],
          [`R${String(phase)}`, phase],
        ]),
      );
      expect(await handles.oral.get(ended.id)).toEqual(ended);
    },
  );

  const work = SCENARIOS.find((s) => s.sessionType === "work");
  if (work === undefined) throw new Error("The fixture bank has no work discussion.");

  it("ends early as ended-by-user, keeping every turn so far", async () => {
    const handles = setUp(work);
    const run = await startOralSessionRun({ sessionId: sessionId("early"), scenarioId: work.id }, handles.deps);
    await runFor(handles, run, 3 * MIN);
    await run.endByUser();
    const ended = await run.ended;

    expect(ended.endReason).toBe("ended-by-user");
    expect(ended.turns.map((t) => t.text)).toEqual(["Q0", "R0", "Q1", "R1"]);
    expect(handles.fake.directives().map((d) => d.phase)).toEqual([0, 1]);
  });

  it.each([
    [true, "transport-failed"],
    [false, "transport-closed"],
  ] as const)("ends when the connection drops (failed: %s) as %s, keeping the transcript", async (failed, reason) => {
    const handles = setUp(work);
    const run = await startOralSessionRun({ sessionId: sessionId(`drop-${reason}`), scenarioId: work.id }, handles.deps);
    await runFor(handles, run, 30_000);
    await handles.fake.hangUp(failed);
    const ended = await run.ended;

    expect(ended.endReason).toBe(reason);
    expect(await handles.oral.get(ended.id)).toMatchObject({ endReason: reason, turns: [{ text: "Q0" }, { text: "R0" }] });
  });

  it("keeps the answer a transport was still delivering when the session asked it to close", async () => {
    const handles = setUp(work, { deliverOnClose: true });
    const run = await startOralSessionRun({ sessionId: sessionId("in-flight"), scenarioId: work.id }, handles.deps);
    await runFor(handles, run, 10_000);
    await run.endByUser();
    const ended = await run.ended;

    // R0 was due at 20 s; closing at 10 s delivered it, and the rest of the script, before `closed`.
    expect(ended.endReason).toBe("ended-by-user");
    expect(ended.turns.map((t) => t.text)).toContain("R0");
  });

  it("marks a session whose page went away as interrupted when the next one starts", async () => {
    const handles = setUp(work);
    await startOralSessionRun({ sessionId: sessionId("abandoned"), scenarioId: work.id }, handles.deps);
    handles.clock.advance(MIN);
    await startOralSessionRun({ sessionId: sessionId("next"), scenarioId: work.id }, {
      ...handles.deps,
      transport: memoryOralTransport().transport,
    });

    expect(await handles.oral.get(sessionId("abandoned"))).toMatchObject({
      endReason: "interrupted",
      endedAt: "2026-09-27T10:01:00.000Z",
    });
  });

  it("leaves a session another tab still runs, and closes one whose tab was closed hard (D144)", async () => {
    const handles = setUp(work);
    const running = sessionId("other-tab");
    const closedHard = sessionId("closed-hard");
    handles.liveness.hold(running);
    await startOralSessionRun({ sessionId: running, scenarioId: work.id }, handles.deps);
    handles.liveness.hold(closedHard);
    await startOralSessionRun({ sessionId: closedHard, scenarioId: work.id }, { ...handles.deps, transport: memoryOralTransport().transport });
    handles.liveness.abandon(closedHard);
    handles.clock.advance(MIN);
    await startOralSessionRun({ sessionId: sessionId("next"), scenarioId: work.id }, {
      ...handles.deps,
      transport: memoryOralTransport().transport,
    });

    expect(await handles.oral.get(running)).toMatchObject({ endedAt: null, endReason: null });
    expect(await handles.oral.get(closedHard)).toMatchObject({ endReason: "interrupted", endedAt: "2026-09-27T10:01:00.000Z" });
  });
});
