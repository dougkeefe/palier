import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PROMPT_VERSION } from "@palier/adapters/openai";

import { RECORDED_COMPLETIONS_DIR, loadRecordedRuns } from "../io.js";
import { type RecordedCompletionData, acceptsOnFirstTry, schemaConformance } from "./conformance.js";

const VERDICT = {
  chosenKey: "a",
  confidence: 0.9,
  defensibleDistractors: [],
  optionCases: { a: "a", b: "b", c: "c", d: "d" },
  registerFlag: { flagged: false },
  estimatedBand: "B",
};

const REVIEW_REQUEST = {
  itemType: "cloze",
  stem: { en: "x", fr: "x" },
  options: [
    { id: "a", text: "a" },
    { id: "b", text: "b" },
    { id: "c", text: "c" },
    { id: "d", text: "d" },
  ],
  subSkill: "agreement",
  targetBand: "B",
  lang: "fr",
};

const aReview = (verdict: object, attempt = 1): RecordedCompletionData => ({
  method: "reviewItem",
  model: "m-review",
  attempt,
  request: REVIEW_REQUEST,
  content: JSON.stringify(verdict),
  usage: { prompt_tokens: 300, completion_tokens: 300 },
});

describe("acceptsOnFirstTry (D112)", () => {
  it("accepts a completion the schema takes, and refuses one it does not, with no retry", async () => {
    expect(await acceptsOnFirstTry(aReview(VERDICT))).toBe(true);
    expect(await acceptsOnFirstTry(aReview({ ...VERDICT, estimatedBand: "B1" }))).toBe(false);
  });

  it("replays each method's own call", async () => {
    const draft = { ...aReview({ items: [] }), method: "generateItems" as const, request: { promptSpec: { itemType: "cloze", targetBand: "B", subSkill: "agreement", instructions: "x" }, topic: "human-resources", lang: "fr", count: 1 } };
    const feedback = { ...aReview({ modelAnswer: "only" }), method: "assessWriting" as const, request: { task: "t", wordTarget: 100, text: "texte", targetBand: "B", lang: "fr", feedbackLang: "en" } };
    expect(await acceptsOnFirstTry(draft)).toBe(true);
    expect(await acceptsOnFirstTry(feedback)).toBe(false);
  });
});

describe("schemaConformance", () => {
  it("rates the runs on the shipping prompt, per method and overall, and reports older runs beside them", async () => {
    const report = await schemaConformance(
      [
        { file: "reviewItem.json", promptVersion: "4", completions: [aReview(VERDICT), aReview(VERDICT)] },
        {
          file: "reviewItem-prompt-v3.json",
          promptVersion: "3",
          completions: [aReview({ ...VERDICT, estimatedBand: "B1" }), aReview(VERDICT, 2), aReview(VERDICT)],
        },
      ],
      "4",
    );

    expect(report).toEqual({
      promptVersion: "4",
      measuredOn: ["reviewItem.json"],
      byMethod: {
        generateItems: { total: 0, conformant: 0, rate: null },
        reviewItem: { total: 2, conformant: 2, rate: 1 },
        assessWriting: { total: 0, conformant: 0, rate: null },
      },
      rate: 1,
      earlier: [{ file: "reviewItem-prompt-v3.json", promptVersion: "3", total: 2, conformant: 1, rate: 0.5 }],
    });
  });

  it("counts first replies only: a refused reply rescued by its retry is still a miss", async () => {
    const report = await schemaConformance(
      [{ file: "r.json", promptVersion: "4", completions: [aReview({ ...VERDICT, estimatedBand: "B1" }), aReview(VERDICT, 2)] }],
      "4",
    );

    expect(report.rate).toBe(0);
    expect(report.byMethod.reviewItem).toEqual({ total: 1, conformant: 0, rate: 0 });
  });

  it("reports no rate, not a zero, when nothing was recorded on the shipping prompt", async () => {
    const report = await schemaConformance([{ file: "old.json", promptVersion: "3", completions: [aReview(VERDICT)] }], "4");

    expect(report.rate).toBeNull();
    expect(report.measuredOn).toEqual([]);
  });

  it("measures on the adapter's own prompt version by default", async () => {
    expect((await schemaConformance([])).promptVersion).toBe(PROMPT_VERSION);
  });
});

describe("loadRecordedRuns", () => {
  it("reads every recorded run in the committed directory, in file order", () => {
    const runs = loadRecordedRuns(process.cwd());
    expect(runs.map((r) => r.file)).toEqual([...runs.map((r) => r.file)].sort());
    expect(runs.some((r) => r.promptVersion === PROMPT_VERSION)).toBe(true);
  });

  it("refuses a completion that is not a whole recorded completion", () => {
    const root = mkdtempSync(join(tmpdir(), "palier-recorded-"));
    mkdirSync(join(root, RECORDED_COMPLETIONS_DIR), { recursive: true });
    writeFileSync(
      join(root, RECORDED_COMPLETIONS_DIR, "bad.json"),
      JSON.stringify({ promptVersion: "4", completions: [{ ...aReview(VERDICT), method: "chat" }] }),
    );
    expect(() => loadRecordedRuns(root)).toThrow(/bad\.json: completion 0 is not a recorded completion/);
  });

  it("refuses a file that is not a recorded run", () => {
    const root = mkdtempSync(join(tmpdir(), "palier-recorded-"));
    mkdirSync(join(root, RECORDED_COMPLETIONS_DIR), { recursive: true });
    writeFileSync(join(root, RECORDED_COMPLETIONS_DIR, "broken.json"), JSON.stringify({ completions: [] }));
    expect(() => loadRecordedRuns(root)).toThrow(/broken\.json is not a recorded run/);
  });
});
