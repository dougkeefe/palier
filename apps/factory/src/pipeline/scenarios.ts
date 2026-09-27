import type { AiProvider } from "@palier/adapters/openai";
import { oralScenarioSchema } from "@palier/domain";
import type { OralScenario, Topic } from "@palier/domain";

import { assembleScenario } from "../lib/assemble.js";
import { hashNum } from "../lib/scripted-key.js";
import type { OralSessionPlan } from "../lib/types.js";

/**
 * The scenario stage (progress.md D114): one oral scenario per session type at each band,
 * planned by `generateScenario` and assembled here. **Discarded, never repaired**, on any of:
 * the scenario schema; phases whose minutes do not add up to the session's length, because
 * the client drives the phases by them (architecture.md §8.5); a phase with no harder
 * follow-up or no simpler reframe, because the session's difficulty flag would have nowhere
 * to go; or a scenario identical to one already kept. A call that fails is counted and
 * skipped, as the passage and item stages do.
 */

export type ScenarioRejection = { readonly id: string; readonly reasons: readonly string[] };

export type ScenarioStageResult = {
  readonly scenarios: readonly OralScenario[];
  readonly rejected: readonly ScenarioRejection[];
  readonly failedCalls: number;
};

export const checkScenario = (scenario: OralScenario, minutes: number): string[] => {
  const reasons: string[] = [];
  const parsed = oralScenarioSchema.safeParse(scenario);
  if (!parsed.success) reasons.push(`fails the schema: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  const planned = scenario.phases.reduce((sum, phase) => sum + phase.minutes, 0);
  if (Math.abs(planned - minutes) > 1e-9) {
    reasons.push(`phases last ${String(planned)} minutes, the ${scenario.sessionType} session ${String(minutes)}`);
  }
  for (const phase of scenario.phases) {
    if (phase.escalation.length === 0) reasons.push(`phase "${phase.name}" has no harder follow-up`);
    if (phase.deescalation.length === 0) reasons.push(`phase "${phase.name}" has no simpler reframe`);
  }
  return reasons;
};

/** The topic a session type is set on at a band: fixed by the pair, so a rebuild picks the same one. */
export const scenarioTopic = (topics: readonly Topic[], sessionType: string, band: string): Topic => {
  const topic = topics[hashNum(`${sessionType}:${band}`) % topics.length];
  if (topic === undefined) throw new RangeError("A scenario needs at least one topic to be set on.");
  return topic;
};

export const constructScenarios = async (
  plan: OralSessionPlan,
  provider: AiProvider,
  topics: readonly Topic[],
): Promise<ScenarioStageResult> => {
  const scenarios: OralScenario[] = [];
  const rejected: ScenarioRejection[] = [];
  let failedCalls = 0;
  for (const { sessionType, minutes } of plan.sessions) {
    for (const targetBand of plan.bands) {
      const topic = scenarioTopic(topics, sessionType, targetBand);
      const draft = await provider
        .generateScenario({ sessionType, targetBand, lang: plan.lang, topic, minutes })
        .catch(() => null);
      if (draft === null) {
        failedCalls += 1;
        continue;
      }
      const scenario = assembleScenario(draft, { sessionType, targetBand, lang: plan.lang, topic });
      const reasons = checkScenario(scenario, minutes);
      if (scenarios.some((kept) => kept.id === scenario.id)) reasons.push(`duplicate of ${scenario.id}`);
      if (reasons.length > 0) rejected.push({ id: scenario.id, reasons });
      else scenarios.push(scenario);
    }
  }
  return { scenarios, rejected, failedCalls };
};
