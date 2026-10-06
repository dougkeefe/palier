import type {
  Attempt,
  DiagnosticInterpretationRequest,
  DiagnosticRules,
  Item,
  ItemId,
  OralAssessment,
  SubSkill,
  TargetBand,
  UsageRecord,
} from "@palier/domain";
import { attemptId, itemId, sessionId } from "@palier/domain";
import { describe, expect, it, vi } from "vitest";

import type { AiProvider, AttemptStore, ItemRepository, OralSession } from "../ports/index.js";
import { NoApiKeyError } from "./api-key.js";
import {
  NoDiagnosticRunError,
  diagnosticResult,
  requestDiagnosticInterpretation,
  studyFocus,
} from "./diagnostic-result.js";
import { aDiagnosticReport, anInterpretation, diagnosticReportStore } from "./__tests__/diagnostic-fakes.js";
import { SCENARIO, anOralSession, oralStore, vaultWith } from "./__tests__/oral-fakes.js";
import { costLedger } from "./__tests__/spend-fakes.js";

// Local fixtures rather than @palier/testing, which depends on @palier/app (progress.md D37).

const RULES: DiagnosticRules = {
  size: 4,
  bandQuota: { B: 2, C: 2 },
  secureAccuracy: 0.7,
  startShare: 0.7,
  focusCount: 2,
  retakeDays: 28,
};

const TAKEN = "2026-10-01T10:03:00.000Z";
const DAY = 86_400_000;
const after = (days: number): string => new Date(Date.parse(TAKEN) + days * DAY).toISOString();
const clockAt = (now: string) => ({ now: () => now });

const STEM = "Les rapports que la directrice a ___ hier sont prêts.";

const anItem = (id: string, subSkill: SubSkill, targetBand: TargetBand): Item => ({
  id: itemId(id),
  version: 1,
  skill: "writing",
  lang: "fr",
  type: "cloze",
  stem: { en: `EN ${id}`, fr: `${STEM} (${id})` },
  options: [
    { id: "a", text: "lu", rationale: { en: "x", fr: "x" } },
    { id: "b", text: "lus", rationale: { en: "x", fr: "x" } },
    { id: "c", text: "lue", rationale: { en: "x", fr: "x" } },
    { id: "d", text: "lues", rationale: { en: "x", fr: "x" } },
  ],
  key: "b",
  explanation: { en: `Agreement, explained (${id}).`, fr: `L'accord, expliqué (${id}).` },
  subSkill,
  targetBand,
  topic: "human-resources",
  tags: [],
  provenance: { origin: "authored" },
  status: "published",
  createdAt: TAKEN,
  updatedAt: TAKEN,
});

const BANK: Item[] = [
  anItem("b1", "agreement", "B"),
  anItem("b2", "agreement", "B"),
  anItem("c1", "pronouns", "C"),
  anItem("c2", "pronouns", "C"),
];

const answer = (run: string, id: string, correct: boolean, minute: number): Attempt => ({
  id: attemptId(`att-${run}-${id}`),
  itemId: itemId(id),
  bankVersion: 4,
  skill: "writing",
  sessionId: sessionId(run),
  chosen: correct ? "b" : "a",
  correct,
  msToFirstSelect: 1000,
  msToConfirm: 1200,
  changedAnswer: false,
  mode: "diagnostic",
  ts: `2026-10-01T10:0${String(minute)}:00.000Z`,
});

/** B answered securely, C missed twice: a run that starts the plan at B. */
const placedAtB = (run = "diag-1"): Attempt[] => [
  answer(run, "b1", true, 0),
  answer(run, "b2", true, 1),
  answer(run, "c1", false, 2),
  answer(run, "c2", false, 3),
];

const itemsOf = (bank: readonly Item[] = BANK): ItemRepository => ({
  byIds: vi.fn((ids: readonly ItemId[]) => Promise.resolve(bank.filter((item) => ids.includes(item.id)))),
  query: () => Promise.resolve(bank),
  passage: () => Promise.resolve(null),
  form: () => Promise.resolve(null),
  forms: () => Promise.resolve([]),
  scenario: () => Promise.resolve(null),
  scenarios: () => Promise.resolve([SCENARIO]),
  bankVersion: () => Promise.resolve(4),
});

const attemptsOf = (attempts: readonly Attempt[]): AttemptStore => ({
  append: () => Promise.resolve(true),
  recent: vi.fn(() => Promise.resolve(attempts)),
  since: () => Promise.resolve(attempts),
  forItem: () => Promise.resolve([]),
  all: () => Promise.resolve(attempts),
  clear: () => Promise.resolve(),
});

const unused = () => Promise.reject(new Error("unused"));

/** A provider that interprets, recording what it was sent, or fails with `fail`. */
const interpreter = (fail: Error | null = null) => {
  const asked: DiagnosticInterpretationRequest[] = [];
  let usage: UsageRecord | null = null;
  const provider: AiProvider = {
    capabilities: () => ({
      generatePassage: false,
      generateItems: false,
      reviewItem: false,
      assessWriting: false,
      generateScenario: false,
      transcribe: false,
      speak: false,
      examinerTurn: false,
      assessOral: false,
      interpretDiagnostic: true,
    }),
    generatePassage: unused,
    generateItems: unused,
    reviewItem: unused,
    assessWriting: unused,
    generateScenario: unused,
    transcribe: unused,
    speak: unused,
    examinerTurn: unused,
    assessOral: unused,
    interpretDiagnostic: (req) => {
      asked.push(req);
      usage = { model: "m-assess", inputTokens: 4_000, outputTokens: 900, costUsd: 0.02 };
      return fail === null ? Promise.resolve(anInterpretation()) : Promise.reject(fail);
    },
    verifyKey: () => Promise.resolve(),
    lastUsage: () => usage,
  };
  return { provider, asked };
};

const resultDeps = (attempts: readonly Attempt[], over: { now?: string; reports?: ReturnType<typeof diagnosticReportStore> } = {}) => ({
  clock: clockAt(over.now ?? after(1)),
  items: itemsOf(),
  attempts: attemptsOf(attempts),
  reports: over.reports ?? diagnosticReportStore(),
  rules: RULES,
});

describe("diagnosticResult", () => {
  it("is null before any diagnostic run is finished", async () => {
    expect(await diagnosticResult({ skill: "writing", targetBand: "C" }, resultDeps(placedAtB().slice(0, 3)))).toBeNull();
  });

  it("reads the latest run's score and placement, with no interpretation yet", async () => {
    const result = await diagnosticResult({ skill: "writing", targetBand: "C" }, resultDeps(placedAtB()));

    expect(result?.summary.total).toEqual({ correct: 2, attempted: 4 });
    expect(result?.summary.startBand).toBe("B");
    expect(result?.summary.focusSubSkills).toEqual(["pronouns"]);
    expect(result?.interpretation).toBeNull();
    expect(result?.interpretationLang).toBeNull();
  });

  it("reads a generous window of recent attempts, so drills since do not crowd the run out", async () => {
    const deps = resultDeps(placedAtB());
    await diagnosticResult({ skill: "writing", targetBand: "C" }, deps);

    expect(deps.attempts.recent).toHaveBeenCalledWith("writing", 1000);
  });

  it("attaches the interpretation this device stored for the run", async () => {
    const reports = diagnosticReportStore([aDiagnosticReport({ sessionId: sessionId("diag-1") })]);
    const result = await diagnosticResult({ skill: "writing", targetBand: "C" }, resultDeps(placedAtB(), { reports }));

    expect(result?.interpretation).toEqual(anInterpretation());
    expect(result?.interpretationLang).toBe("en");
  });

  it("offers a retake once the profile's interval has passed, and not a day before", async () => {
    const due = async (now: string) =>
      (await diagnosticResult({ skill: "writing", targetBand: "C" }, resultDeps(placedAtB(), { now })))?.retakeDue;

    expect(await due(after(27.9))).toBe(false);
    expect(await due(after(28))).toBe(true);
  });
});

const interpretDeps = (
  attempts: readonly Attempt[],
  over: { key?: string | null; fail?: Error; reports?: ReturnType<typeof diagnosticReportStore> } = {},
) => {
  const ai = interpreter(over.fail ?? null);
  const ledger = costLedger();
  const reports = over.reports ?? diagnosticReportStore();
  return {
    ai,
    ledger,
    reports,
    deps: {
      vault: vaultWith(over.key === undefined ? "sk-test" : over.key),
      aiProvider: () => ai.provider,
      ledger,
      clock: clockAt(after(0)),
      items: itemsOf(),
      attempts: attemptsOf(attempts),
      reports,
      rules: RULES,
    },
  };
};

const ASK = { skill: "writing", targetBand: "C", lang: "fr", feedbackLang: "en" } as const;

describe("requestDiagnosticInterpretation", () => {
  it("refuses a skill with no complete run, before any request", async () => {
    const { deps, ai } = interpretDeps([]);

    await expect(requestDiagnosticInterpretation(ASK, deps)).rejects.toThrow(NoDiagnosticRunError);
    expect(ai.asked).toEqual([]);
  });

  it("sends the engine's score and placement, and only the items missed, in the right languages", async () => {
    const { deps, ai } = interpretDeps(placedAtB());
    await requestDiagnosticInterpretation(ASK, deps);

    const [sent] = ai.asked;
    expect(sent?.startBand).toBe("B");
    expect(sent?.targetBand).toBe("C");
    expect(sent?.total).toEqual({ correct: 2, attempted: 4 });
    expect(sent?.focus).toEqual(["pronouns"]);
    expect(sent?.missed.map((miss) => miss.stem)).toEqual([`${STEM} (c1)`, `${STEM} (c2)`]);
    expect(sent?.missed[0]).toMatchObject({ chosen: "a", key: "b", band: "C", subSkill: "pronouns" });
    expect(sent?.missed[0]?.explanation).toBe("Agreement, explained (c1).");
    expect(sent?.missed[0]?.options).toEqual([
      { id: "a", text: "lu" },
      { id: "b", text: "lus" },
      { id: "c", text: "lue" },
      { id: "d", text: "lues" },
    ]);
  });

  it("leaves out a missed item the bank no longer holds", async () => {
    const run = [...placedAtB(), answer("diag-1", "gone", false, 4)];
    const { deps, ai } = interpretDeps(run);
    await requestDiagnosticInterpretation(ASK, deps);

    expect(ai.asked[0]?.missed).toHaveLength(2);
  });

  it("meters the call as the diagnostic's, under the run's session, and keeps the interpretation", async () => {
    const { deps, ledger, reports } = interpretDeps(placedAtB());
    const interpretation = await requestDiagnosticInterpretation(ASK, deps);

    expect(interpretation).toEqual(anInterpretation());
    expect(ledger.entries()).toEqual([
      expect.objectContaining({ feature: "diagnostic-interpretation", sessionId: sessionId("diag-1"), costUsd: 0.02 }),
    ]);
    expect(reports.all()).toEqual([
      { sessionId: sessionId("diag-1"), skill: "writing", feedbackLang: "en", writtenAt: after(0), interpretation },
    ]);
  });

  it("returns a kept interpretation and spends nothing, so a second visit never pays twice", async () => {
    const reports = diagnosticReportStore([aDiagnosticReport({ sessionId: sessionId("diag-1") })]);
    const { deps, ai, ledger } = interpretDeps(placedAtB(), { reports });

    expect(await requestDiagnosticInterpretation(ASK, deps)).toEqual(anInterpretation());
    expect(ai.asked).toEqual([]);
    expect(ledger.entries()).toEqual([]);
  });

  it("writes it again in the language asked for when the kept one is in the other, and keeps the new one", async () => {
    const reports = diagnosticReportStore([aDiagnosticReport({ sessionId: sessionId("diag-1"), feedbackLang: "fr" })]);
    const { deps, ai } = interpretDeps(placedAtB(), { reports });

    await requestDiagnosticInterpretation(ASK, deps);
    expect(ai.asked).toHaveLength(1);
    expect(reports.all()[0]?.feedbackLang).toBe("en");
  });

  it("keeps nothing and rethrows when the call fails, so it can be asked again", async () => {
    const { deps, reports, ledger } = interpretDeps(placedAtB(), { fail: new Error("timeout") });

    await expect(requestDiagnosticInterpretation(ASK, deps)).rejects.toThrow("timeout");
    expect(reports.all()).toEqual([]);
    expect(ledger.entries()).toHaveLength(1);
  });

  it("refuses without a key, asking nothing", async () => {
    const { deps, ai } = interpretDeps(placedAtB(), { key: null });

    await expect(requestDiagnosticInterpretation(ASK, deps)).rejects.toThrow(NoApiKeyError);
    expect(ai.asked).toEqual([]);
  });
});

const assessedWith = (subSkills: readonly OralAssessment["fixes"][number]["subSkill"][]): OralSession =>
  anOralSession({
    assessment: {
      criteria: {
        comprehension: { band: "B", evidence: "e" },
        fluency: { band: "B", evidence: "e" },
        grammar: { band: "B", evidence: "e" },
        vocabulary: { band: "B", evidence: "e" },
        task: { band: "B", evidence: "e" },
      },
      fixes: subSkills.map((subSkill) => ({ criterion: "grammar", subSkill, advice: "a", evidence: "e" })),
      missingWords: [],
      errors: [],
    },
  });

const focusDeps = (attempts: readonly Attempt[], sessions: readonly OralSession[] = []) => ({
  items: itemsOf(),
  attempts: attemptsOf(attempts),
  oral: oralStore(sessions),
  rules: RULES,
});

const FOCUS = { skill: "writing", targetBand: "C", lang: "fr" } as const;

describe("studyFocus", () => {
  it("sets nothing before any oral report or diagnostic", async () => {
    expect(await studyFocus(FOCUS, focusDeps([]))).toEqual({});
  });

  it("places the plan where the latest run started it, and favours its weakest sub-skills", async () => {
    expect(await studyFocus(FOCUS, focusDeps(placedAtB()))).toEqual({
      focusSubSkills: ["pronouns"],
      placement: { startBand: "B", startShare: 0.7 },
    });
  });

  it("puts an oral report's fixes first, then the diagnostic's, each once", async () => {
    const focus = await studyFocus(FOCUS, focusDeps(placedAtB(), [assessedWith(["agreement", "pronouns"])]));

    expect(focus.focusSubSkills).toEqual(["agreement", "pronouns"]);
  });

  it("keeps an oral report's fixes with no diagnostic, and sets no placement", async () => {
    expect(await studyFocus(FOCUS, focusDeps([], [assessedWith(["agreement"])]))).toEqual({
      focusSubSkills: ["agreement"],
    });
  });

  it("places the plan even when a perfect run left nothing to focus on", async () => {
    const perfect = placedAtB().map((attempt) => ({ ...attempt, correct: true }));

    expect(await studyFocus(FOCUS, focusDeps(perfect))).toEqual({
      placement: { startBand: "C", startShare: 0.7 },
    });
  });
});
