import { describe, expect, it } from "vitest";

import type { AiProvider } from "@palier/adapters/openai";
import type { GenerateScenarioRequest, OralPhase, OralScenario, ScenarioDraft } from "@palier/domain";
import { scenarioId } from "@palier/domain";

import { scriptedAiProvider } from "../providers/scripted-ai-provider.js";
import type { OralSessionPlan } from "../lib/types.js";
import { checkScenario, constructScenarios, scenarioTopic } from "./scenarios.js";

const aPhase = (over: Partial<OralPhase> = {}): OralPhase => ({
  name: "Mise en train",
  minutes: 5,
  intent: "Establish a baseline.",
  seedQuestions: ["Parlez-moi de votre rôle."],
  escalation: ["Qu'auriez-vous fait autrement ?"],
  deescalation: ["Décrivez une journée type."],
  ...over,
});

const aScenario = (phases: readonly OralPhase[]): OralScenario => ({
  id: scenarioId("s-1"),
  lang: "fr",
  sessionType: "work",
  targetBand: "C",
  topic: "procurement",
  phases,
});

const PLAN: OralSessionPlan = { lang: "fr", bands: ["B", "C"], sessions: [{ sessionType: "work", minutes: 10 }] };
const TOPICS = ["procurement", "environment", "communications"] as const;

/** A provider whose `generateScenario` answers from `answer`, the rest of it scripted. */
const providerWith = (answer: (req: GenerateScenarioRequest) => Promise<ScenarioDraft>): AiProvider => ({
  ...scriptedAiProvider(),
  generateScenario: answer,
});

describe("checkScenario", () => {
  it("passes a scenario whose phases fill the session, each with somewhere to go", () => {
    expect(checkScenario(aScenario([aPhase(), aPhase({ name: "Suite" })]), 10)).toEqual([]);
  });

  it("discards phases that do not add up to the session's length", () => {
    expect(checkScenario(aScenario([aPhase()]), 10)).toEqual(["phases last 5 minutes, the work session 10"]);
  });

  it("discards a phase with no harder follow-up, or no simpler reframe", () => {
    const reasons = checkScenario(aScenario([aPhase({ escalation: [] }), aPhase({ name: "Suite", deescalation: [] })]), 10);
    expect(reasons).toEqual(['phase "Mise en train" has no harder follow-up', 'phase "Suite" has no simpler reframe']);
  });

  it("discards a scenario the schema refuses", () => {
    expect(checkScenario(aScenario([aPhase({ seedQuestions: [] }), aPhase()]), 10)[0]).toMatch(/^fails the schema/);
  });
});

describe("scenarioTopic", () => {
  it("fixes a topic by session type and band, so a rebuild picks the same", () => {
    expect(scenarioTopic(TOPICS, "work", "C")).toBe(scenarioTopic(TOPICS, "work", "C"));
    expect(TOPICS).toContain(scenarioTopic(TOPICS, "work", "B"));
  });

  it("refuses to set a scenario on no topic at all", () => {
    expect(() => scenarioTopic([], "work", "C")).toThrow(RangeError);
  });
});

describe("constructScenarios", () => {
  it("plans each session type at each band, and assembles what it asked for", async () => {
    const asked: GenerateScenarioRequest[] = [];
    const provider = providerWith((req) => {
      asked.push(req);
      return Promise.resolve({ phases: [aPhase(), aPhase({ name: `Suite ${req.targetBand}` })] });
    });
    const out = await constructScenarios(PLAN, provider, TOPICS);

    expect(asked.map((r) => [r.sessionType, r.targetBand, r.minutes, r.lang])).toEqual([
      ["work", "B", 10, "fr"],
      ["work", "C", 10, "fr"],
    ]);
    expect(out.scenarios.map((s) => [s.sessionType, s.targetBand, s.topic])).toEqual([
      ["work", "B", asked[0]?.topic],
      ["work", "C", asked[1]?.topic],
    ]);
    expect(out.rejected).toEqual([]);
  });

  it("discards, never repairs, a plan that does not fill the session", async () => {
    const out = await constructScenarios(PLAN, providerWith(() => Promise.resolve({ phases: [aPhase()] })), TOPICS);

    expect(out.scenarios).toEqual([]);
    expect(out.rejected.map((r) => r.reasons)).toEqual([
      ["phases last 5 minutes, the work session 10"],
      ["phases last 5 minutes, the work session 10"],
    ]);
  });

  it("drops a scenario identical to one already kept", async () => {
    const same = providerWith(() => Promise.resolve({ phases: [aPhase(), aPhase({ name: "Suite" })] }));
    const out = await constructScenarios({ ...PLAN, bands: ["C", "C"] }, same, TOPICS);

    expect(out.scenarios).toHaveLength(1);
    expect(out.rejected[0]?.reasons[0]).toMatch(/^duplicate of /);
  });

  it("counts a failed call and carries on", async () => {
    let calls = 0;
    const flaky = providerWith(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error("malformed twice")) : Promise.resolve({ phases: [aPhase(), aPhase({ name: "Suite" })] });
    });
    const out = await constructScenarios(PLAN, flaky, TOPICS);

    expect(out.failedCalls).toBe(1);
    expect(out.scenarios).toHaveLength(1);
  });

  it("fills every session with the scripted provider", async () => {
    const plan: OralSessionPlan = {
      lang: "fr",
      bands: ["B", "C"],
      sessions: [
        { sessionType: "warmup", minutes: 5 },
        { sessionType: "work", minutes: 10 },
        { sessionType: "opinion", minutes: 12 },
        { sessionType: "situation", minutes: 8 },
        { sessionType: "full", minutes: 22 },
      ],
    };
    const out = await constructScenarios(plan, scriptedAiProvider(), TOPICS);

    expect(out.scenarios).toHaveLength(10);
    expect(out.rejected).toEqual([]);
  });
});
