import { describe, expect, it } from "vitest";

import { startOralPracticeRun } from "@palier/app";
import type { OralScenario } from "@palier/domain";
import { sessionId } from "@palier/domain";

import { fakeClock } from "../clock/fake-clock.js";
import { FIXTURE_BANK, fixtureBankRepository } from "../fixtures/bank.js";
import { memoryAnswerSource } from "./answer-source.js";
import { fakeAiProvider } from "./ai-provider.js";
import { memoryCostLedger } from "./cost-ledger.js";
import { memoryKeyVault } from "./key-vault.js";
import { memoryOralLiveness } from "./oral-liveness.js";
import { memoryOralStore } from "./oral-store.js";

/**
 * A whole practice session, end to end below the screen (progress.md D118): the session driver
 * over the real turn-based transport, the fake provider, a scripted candidate and a `FakeClock`,
 * for every session type the fixture bank ships. It lives here because an app test may not
 * import this package (D37).
 */

const START = "2026-09-27T10:00:00.000Z";
const MIN = 60_000;
/** The screen's timer: a tick every 15 seconds. */
const TICK_MS = 15_000;
const SCENARIOS = FIXTURE_BANK.scenarios ?? [];

const lengthMs = (scenario: OralScenario): number => scenario.phases.reduce((sum, phase) => sum + phase.minutes, 0) * MIN;

const setUp = async (scenario: OralScenario) => {
  const clock = fakeClock(START);
  const vault = memoryKeyVault();
  await vault.putApiKey("sk-practice", { remember: false });
  const ledger = memoryCostLedger();
  const oral = memoryOralStore();
  const examiner = { requests: [] as string[] };
  const provider = () => {
    const inner = fakeAiProvider();
    return {
      ...inner,
      examinerTurn: (req: Parameters<typeof inner.examinerTurn>[0]) => {
        examiner.requests.push(req.phase.name);
        return inner.examinerTurn(req);
      },
    };
  };
  // An answer every tick: a clip, each spoken for ten seconds.
  const script = Array.from({ length: lengthMs(scenario) / TICK_MS }, (_, i) => ({
    kind: "audio" as const,
    audio: new Blob([`Réponse ${String(i + 1)}.`], { type: "audio/webm" }),
    durationMs: 10_000,
  }));
  const source = memoryAnswerSource(script, { released: 0 });
  const run = await startOralPracticeRun(
    { sessionId: sessionId(`practice-${scenario.sessionType}`), scenarioId: scenario.id },
    { vault, aiProvider: provider, ledger, clock, items: fixtureBankRepository(), oral, answers: source.answers, liveness: memoryOralLiveness() },
  );
  return { clock, ledger, oral, examiner, source, run };
};

describe("a practice session, end to end over the turn-based transport (D118)", () => {
  it("ships a scenario of every session type to run", () => {
    expect(new Set(SCENARIOS.map((s) => s.sessionType))).toEqual(new Set(["warmup", "work", "opinion", "situation", "full"]));
  });

  it.each(SCENARIOS.map((s) => [s.sessionType, s] as const))(
    "%s: asks in every phase in order, keeps every answer transcribed, and completes at its length",
    async (_type, scenario) => {
      const handles = await setUp(scenario);
      for (let at = TICK_MS; at <= lengthMs(scenario); at += TICK_MS) {
        await handles.source.idle();
        handles.clock.advance(TICK_MS);
        handles.source.release(1);
        await handles.run.tick();
      }
      const ended = await handles.run.ended;

      expect(ended.endReason).toBe("completed");
      const phases = scenario.phases.map((p) => p.name);
      const asked = handles.examiner.requests;
      expect([...new Set(asked)]).toEqual(phases);
      expect(asked).toEqual([...asked].sort((a, b) => phases.indexOf(a) - phases.indexOf(b)));
      const stamped = ended.turns.map((t) => t.phase);
      expect(stamped).toEqual([...stamped].sort((a, b) => a - b));
      expect(stamped.at(-1)).toBe(scenario.phases.length - 1);
      const answers = ended.turns.filter((t) => t.speaker === "candidate");
      expect(answers.length).toBeGreaterThan(0);
      expect(answers[0]?.text).toBe("Réponse 1.");
      expect(answers.every((t) => t.endMs - t.startMs === 10_000)).toBe(true);
      expect(handles.run.failure()).toBeNull();
      expect(new Set((await handles.ledger.since(START)).map((row) => row.feature))).toEqual(new Set(["oral-practice"]));
    },
  );

  it("ends early at the candidate's word, with the transcript kept", async () => {
    const scenario = SCENARIOS[0];
    if (scenario === undefined) throw new Error("the fixture bank ships a scenario");
    const handles = await setUp(scenario);
    await handles.source.idle();
    handles.clock.advance(TICK_MS);
    handles.source.release(1);
    await handles.source.idle();
    await handles.run.endByUser();
    const ended = await handles.run.ended;

    expect(ended.endReason).toBe("ended-by-user");
    expect(ended.turns.map((t) => t.speaker)).toEqual(["examiner", "candidate", "examiner"]);
    expect((await handles.oral.get(ended.id))?.turns).toEqual(ended.turns);
  });
});
