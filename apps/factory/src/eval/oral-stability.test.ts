import { describe, expect, it } from "vitest";

import type { Band, OralRequest } from "@palier/domain";

import type { RecordedCompletionData, RecordedRunData } from "./conformance.js";
import { schemaConformance } from "./conformance.js";
import {
  ORAL_STABILITY_AGREEMENT,
  ORAL_STABILITY_FILE,
  ORAL_STABILITY_MIN_RUNS,
  describeOralStability,
  oralStability,
} from "./oral-stability.js";

const SAID = "Je coordonne les consultations et les dossiers devient urgents.";

const REQUEST: OralRequest = {
  sessionType: "work",
  targetBand: "C",
  lang: "fr",
  feedbackLang: "en",
  topic: "project-management",
  phases: [{ name: "Votre travail", intent: "Describe the role." }],
  turns: [
    { speaker: "examiner", text: "Parlez-moi de votre poste.", phase: 0, startMs: 0, endMs: 2_000 },
    { speaker: "candidate", text: SAID, phase: 0, startMs: 3_000, endMs: 9_000, input: "voice" },
  ],
  descriptors: { A: "a", B: "b", C: "c" },
};

/** A report whose every criterion is `band`, except those given in `over`. */
const aReport = (band: Band, over: Partial<Record<string, Band>> = {}) => {
  const criterion = (name: string) => ({ band: over[name] ?? band, evidence: "e" });
  const fix = { criterion: "grammar", subSkill: "agreement", advice: "a", evidence: "e" };
  const word = { word: "w", turn: 1, excerpt: "consultations", example: "x" };
  return {
    criteria: Object.fromEntries(["comprehension", "fluency", "grammar", "vocabulary", "task"].map((n) => [n, criterion(n)])),
    fixes: [fix, fix, fix],
    missingWords: [word, word, word, word, word],
    errors: [{ turn: 1, excerpt: "devient", correction: "deviennent", rule: "accord" }],
  };
};

const aCompletion = (content: unknown, attempt = 1): RecordedCompletionData => ({
  method: "assessOral",
  model: "m-assess",
  attempt,
  request: REQUEST,
  content: JSON.stringify(content),
  usage: { prompt_tokens: 3_000, completion_tokens: 1_200 },
});

const aRun = (completions: readonly RecordedCompletionData[], file = ORAL_STABILITY_FILE, promptVersion = "4"): RecordedRunData => ({
  file,
  promptVersion,
  completions,
});

const five = (band: Band) => Array.from({ length: 5 }, () => aCompletion(aReport(band)));

describe("oralStability (D126)", () => {
  it("is null, not a failure, until the stability recording has been made", async () => {
    expect(await oralStability([aRun(five("B"), "assessOral.json")])).toBeNull();
  });

  it("passes five reports that agree, naming the parameters it holds them to", async () => {
    const report = await oralStability([aRun(five("B"))], "4");

    expect(report).toMatchObject({ file: ORAL_STABILITY_FILE, promptVersion: "4", current: true, runs: 5, failedRuns: 0, passed: true });
    expect(report?.agreementThreshold).toBe(ORAL_STABILITY_AGREEMENT);
    expect(report?.byCriterion.grammar).toEqual({ bands: ["B", "B", "B", "B", "B"], spread: 0, agreement: 1 });
    expect(ORAL_STABILITY_MIN_RUNS).toBe(5);
  });

  it("passes one report a level apart on one criterion: four in five agree, within one level", async () => {
    const completions = [...five("B").slice(0, 4), aCompletion(aReport("B", { fluency: "C" }))];
    const report = await oralStability([aRun(completions)]);

    expect(report?.byCriterion.fluency).toEqual({ bands: ["B", "B", "B", "B", "C"], spread: 1, agreement: 0.8 });
    expect(report?.passed).toBe(true);
  });

  it("fails a criterion that moves two levels, even when four in five agree", async () => {
    const completions = [...five("B").slice(0, 4), aCompletion(aReport("B", { task: "E" }))];
    const report = await oralStability([aRun(completions)]);

    expect(report?.byCriterion.task.spread).toBe(2);
    expect(report?.passed).toBe(false);
  });

  it("fails a criterion on which only three in five agree, though none is more than a level apart", async () => {
    const completions = [...five("B").slice(0, 3), aCompletion(aReport("C")), aCompletion(aReport("C"))];
    const report = await oralStability([aRun(completions)]);

    expect(report?.byCriterion.comprehension.agreement).toBeCloseTo(0.6, 10);
    expect(report?.passed).toBe(false);
  });

  it("counts a retried call once, by its accepted reply, and fails fewer than five calls", async () => {
    const refused = aCompletion({ ...aReport("B"), errors: [{ turn: 0, excerpt: "Parlez", correction: "x", rule: "r" }] });
    const retried = [refused, aCompletion(aReport("B"), 2)];
    const report = await oralStability([aRun([...five("B").slice(0, 3), ...retried])]);

    expect(report).toMatchObject({ runs: 4, failedRuns: 0, passed: false });
  });

  it("counts a call once though both its replies would be accepted, taking the last (D127)", async () => {
    const both = [aCompletion(aReport("C")), aCompletion(aReport("B"), 2)];
    const report = await oralStability([aRun([...five("B").slice(0, 4), ...both])]);

    expect(report).toMatchObject({ runs: 5, failedRuns: 0, passed: true });
    expect(report?.byCriterion.task.bands).toEqual(["B", "B", "B", "B", "B"]);
  });

  it("fails a recording in which a call gave no report, even when the rest agree (D127)", async () => {
    const refused = aCompletion({ ...aReport("B"), fixes: [] });
    const report = await oralStability([aRun([...five("B"), refused, aCompletion({ ...aReport("B"), fixes: [] }, 2)])]);

    expect(report).toMatchObject({ runs: 6, failedRuns: 1, passed: false });
  });

  it("never passes a recording made on an older prompt, and says so (D127)", async () => {
    const report = await oralStability([aRun(five("B"), ORAL_STABILITY_FILE, "3")], "4");

    expect(report).toMatchObject({ promptVersion: "3", current: false, passed: false });
  });

  it("reads the file the recorder writes, by its literal name", () => {
    expect(ORAL_STABILITY_FILE).toBe("assessOral-stability.json");
  });

  it("reports an empty recording as no reports, spread 0 and agreement 0, and failed", async () => {
    const report = await oralStability([aRun([])]);

    expect(report?.byCriterion.task).toEqual({ bands: [], spread: 0, agreement: 0 });
    expect(report?.passed).toBe(false);
  });
});

describe("describeOralStability (D127)", () => {
  it("says how to record it when there is no recording", () => {
    expect(describeOralStability(null)).toMatch(/^oral stability: not recorded yet; run `pnpm --filter @palier\/web oral-stability`/u);
  });

  it("says passed, with each criterion's spread and agreement", async () => {
    const line = describeOralStability(await oralStability([aRun(five("B"))], "4"), "4");
    expect(line).toMatch(/^oral stability over 5 call\(s\): passed \(comprehension spread 0, agreement 1\.00; /u);
  });

  it("says FAILED, and why: a stale prompt, and calls that gave no report", async () => {
    const refused = aCompletion({ ...aReport("B"), fixes: [] });
    const line = describeOralStability(await oralStability([aRun([...five("B"), refused], ORAL_STABILITY_FILE, "3")], "4"), "4");
    expect(line).toContain("FAILED, recorded on prompt v3, not v4: re-record, 1 call(s) gave no report");
  });
});

describe("schemaConformance — the oral report (D122)", () => {
  it("rates a report's first reply like any structured output", async () => {
    const refused = aCompletion({ ...aReport("B"), fixes: [] });
    const report = await schemaConformance([aRun([aCompletion(aReport("B")), refused], "assessOral.json")], "4");

    expect(report.byMethod.assessOral).toEqual({ total: 2, conformant: 1, rate: 0.5 });
  });
});
