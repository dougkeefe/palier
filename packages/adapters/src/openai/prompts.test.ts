import { ORAL_CRITERIA, ORAL_NOTE_SEVERITIES } from "@palier/domain";
import { anOralScenario } from "@palier/testing";
import { describe, expect, it } from "vitest";

import { STUDIO_PROMPT_VERSION, STUDIO_TOOLS, studioInstructions } from "./prompts.js";

/** Studio mode's examiner instructions and tools (architecture.md §8.5, progress.md D172). */

const scenario = (() => {
  const base = anOralScenario();
  const first = base.phases[0];
  if (first === undefined) throw new Error("the builder's scenario has a phase");
  return anOralScenario({
    phases: [first, { ...first, name: "Recul", intent: "Push for reflection.", seedQuestions: ["Qu'en retenez-vous ?"] }],
  });
})();

describe("studioInstructions", () => {
  it("speaks only the scenario's language, as the practice examiner does, and never coaches", () => {
    const text = studioInstructions(scenario, { phase: 0, register: "baseline" });

    expect(text).toContain("conducted entirely in French");
    expect(text).toContain("You speak Canadian federal public-service French");
    expect(text).not.toContain("You write");
    expect(text).toContain("never coach");
    expect(text).toContain(scenario.topic);
  });

  it("frames the phase it is given, its questions and its purpose, counting from one", () => {
    const phase = scenario.phases[1];
    const text = studioInstructions(scenario, { phase: 1, register: "baseline" });

    expect(text).toContain(`phase, 2 of ${String(scenario.phases.length)}: "${phase?.name ?? ""}"`);
    expect(text).toContain(JSON.stringify(phase?.seedQuestions));
    expect(text).toContain("short, natural transition");
    expect(text).not.toContain("greet the candidate");
  });

  it("greets the candidate in the first phase", () => {
    expect(studioInstructions(scenario, { phase: 0, register: "baseline" })).toContain("greet the candidate");
  });

  it.each([
    ["escalate", "harder follow-up"],
    ["deescalate", "simpler reframe"],
    ["baseline", "Follow on from the candidate's last answer"],
  ] as const)("asks for the %s register's questions", (register, asks) => {
    expect(studioInstructions(scenario, { phase: 0, register })).toContain(asks);
  });

  it("follows from what the candidate has just said, and never on a premise they have contradicted (D176)", () => {
    const text = studioInstructions(scenario, { phase: 0, register: "baseline" });

    expect(text).toContain("Every question follows from what the candidate has just said");
    expect(text).toContain("Never ask a question whose premise the candidate has contradicted");
  });

  it("is studio prompt version 2 since the examiner listens (D176)", () => {
    expect(STUDIO_PROMPT_VERSION).toBe("2");
  });

  it.each(["baseline", "escalate", "deescalate"] as const)(
    "treats the phase's questions as its ground and level, never a script, in the %s register (D176)",
    (register) => {
      const text = studioInstructions(scenario, { phase: 0, register });

      expect(text).toContain("they are not a script");
      expect(text).not.toMatch(/Ask from the phase's|from the phase's (harder follow-ups|simpler reframes) when there are any/);
    },
  );

  it("holds a phase past either end to the scenario's own phases", () => {
    const last = scenario.phases.length - 1;
    expect(studioInstructions(scenario, { phase: 99, register: "baseline" })).toBe(
      studioInstructions(scenario, { phase: last, register: "baseline" }),
    );
    expect(studioInstructions(scenario, { phase: -1, register: "baseline" })).toBe(
      studioInstructions(scenario, { phase: 0, register: "baseline" }),
    );
  });

  it("refuses a scenario with no phases", () => {
    expect(() => studioInstructions({ ...scenario, phases: [] }, { phase: 0, register: "baseline" })).toThrow(RangeError);
  });

  it("names both tools, and tells the examiner never to mention them", () => {
    const text = studioInstructions(scenario, { phase: 0, register: "baseline" });

    expect(text).toContain('"flag_difficulty"');
    expect(text).toContain('"note_observation"');
    expect(text).toContain("Never mention either tool");
  });
});

describe("STUDIO_TOOLS", () => {
  it("takes a note's criterion and severity from domain, never typed here (D168)", () => {
    const note = STUDIO_TOOLS.find((tool) => tool.name === "note_observation");
    expect(note?.parameters.properties).toMatchObject({
      criterion: { enum: [...ORAL_CRITERIA] },
      severity: { enum: [...ORAL_NOTE_SEVERITIES] },
    });
  });

  it("flags a difficulty in the session machine's two directions", () => {
    const flag = STUDIO_TOOLS.find((tool) => tool.name === "flag_difficulty");
    expect(flag?.parameters.properties).toEqual({ direction: { type: "string", enum: ["escalate", "deescalate"] } });
  });
});
