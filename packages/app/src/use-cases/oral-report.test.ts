import { describe, expect, it } from "vitest";

import type { OralAssessment, OralRequest, UsageRecord } from "@palier/domain";
import { scenarioId, sessionId } from "@palier/domain";

import type { AiProvider, OralSession } from "../ports/index.js";
import { NoApiKeyError } from "./api-key.js";
import { UnknownScenarioError } from "./oral.js";
import {
  NothingToAssessError,
  OralSessionRunningError,
  UnknownOralSessionError,
  oralFocusSubSkills,
  oralHistory,
  oralReport,
  requestOralReport,
} from "./oral-report.js";
import { profile } from "./__tests__/exam-fakes.js";
import { SCENARIO, SESSION_ID, START, anOralSession, oralStore, scenarioBank, vaultWith } from "./__tests__/oral-fakes.js";
import { aCostEntry, costLedger } from "./__tests__/spend-fakes.js";

const ENDED = "2026-09-27T10:10:00.000Z";
const FILLERS = { en: ["um"], fr: ["euh", "tu sais"] };

const TURNS: OralSession["turns"] = [
  { speaker: "examiner", text: "Parlez-moi de votre projet.", phase: 0, startMs: 0, endMs: 2_000 },
  { speaker: "candidate", text: "Euh, je gère un projet, euh, tu sais.", phase: 0, startMs: 3_000, endMs: 9_000, input: "voice" },
  { speaker: "examiner", text: "Qu'auriez-vous fait autrement ?", phase: 1, startMs: 10_000, endMs: 12_000 },
  { speaker: "candidate", text: "Rien.", phase: 1, startMs: 12_000, endMs: 30_000, input: "typed" },
];

const anEnded = (over: Partial<OralSession> = {}): OralSession =>
  anOralSession({ endedAt: ENDED, endReason: "completed", turns: TURNS, ...over });

const REPORT: OralAssessment = (() => {
  const criterion = { band: "B" as const, evidence: "« je gère un projet »" };
  const word = { word: "piloter", turn: 1, excerpt: "je gère", example: "Je pilote un projet." };
  return {
    criteria: { comprehension: criterion, fluency: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
    fixes: [
      { criterion: "vocabulary", subSkill: "word-choice-precision", advice: "a", evidence: "e" },
      { criterion: "grammar", subSkill: "agreement", advice: "a", evidence: "e" },
      { criterion: "task", subSkill: "connectors-and-discourse-markers", advice: "a", evidence: "e" },
    ],
    missingWords: [word, word, word, word, word],
    errors: [{ turn: 1, start: 5, end: 12, correction: "je pilote", rule: "précision" }],
  };
})();

/** A provider that answers every report with `REPORT`, billed, and keeps what it was asked. */
const reportingProvider = (fail: Error | null = null) => {
  const asked: OralRequest[] = [];
  let usage: UsageRecord | null = null;
  const unused = () => Promise.reject(new Error("unused"));
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
      assessOral: true,
    }),
    generatePassage: unused,
    generateItems: unused,
    reviewItem: unused,
    assessWriting: unused,
    generateScenario: unused,
    transcribe: unused,
    speak: unused,
    examinerTurn: unused,
    assessOral: (req) => {
      asked.push(req);
      usage = { model: "m-assess", inputTokens: 3_000, outputTokens: 1_200, costUsd: 0.0156 };
      return fail === null ? Promise.resolve(REPORT) : Promise.reject(fail);
    },
    verifyKey: () => Promise.resolve(),
    lastUsage: () => usage,
  };
  return { provider, asked };
};

const setUp = (sessions: readonly OralSession[], options: { key?: string | null; fail?: Error } = {}) => {
  const ai = reportingProvider(options.fail ?? null);
  const oral = oralStore(sessions);
  const ledger = costLedger();
  const deps = {
    vault: vaultWith(options.key === undefined ? "sk-test" : options.key),
    aiProvider: () => ai.provider,
    ledger,
    clock: { now: () => "2026-09-27T10:11:00.000Z" },
    oral,
    items: scenarioBank(),
    profile,
  };
  return { ai, oral, ledger, deps };
};

describe("requestOralReport (D126)", () => {
  it("asks for the report on the whole session, the scenario's phases and the profile's descriptors in the interface language", async () => {
    const { ai, deps } = setUp([anEnded()]);
    await requestOralReport({ sessionId: SESSION_ID, feedbackLang: "en" }, deps);

    expect(ai.asked).toHaveLength(1);
    expect(ai.asked[0]).toEqual({
      sessionType: SCENARIO.sessionType,
      targetBand: SCENARIO.targetBand,
      lang: "fr",
      feedbackLang: "en",
      topic: SCENARIO.topic,
      phases: SCENARIO.phases.map(({ name, intent }) => ({ name, intent })),
      turns: TURNS,
      descriptors: { A: profile.oral.descriptors.A.en, B: profile.oral.descriptors.B.en, C: profile.oral.descriptors.C.en },
    });
  });

  it("quotes the descriptors in French for a French interface", async () => {
    const { ai, deps } = setUp([anEnded()]);
    await requestOralReport({ sessionId: SESSION_ID, feedbackLang: "fr" }, deps);

    expect(ai.asked[0]?.descriptors.C).toBe(profile.oral.descriptors.C.fr);
  });

  it("keeps the report on the session, and meters the call as the oral report, under the session (D125)", async () => {
    const { oral, ledger, deps } = setUp([anEnded()]);
    const report = await requestOralReport({ sessionId: SESSION_ID, feedbackLang: "en" }, deps);

    expect(report).toBe(REPORT);
    expect((await oral.get(SESSION_ID))?.assessment).toBe(REPORT);
    expect(ledger.entries()).toEqual([
      {
        ts: "2026-09-27T10:11:00.000Z",
        feature: "oral-assessment",
        model: "m-assess",
        inputTokens: 3_000,
        outputTokens: 1_200,
        costUsd: 0.0156,
        sessionId: SESSION_ID,
      },
    ]);
  });

  it("returns a report already made, and spends nothing, so a second tap never pays twice", async () => {
    const { ai, ledger, deps } = setUp([anEnded({ assessment: REPORT })]);

    expect(await requestOralReport({ sessionId: SESSION_ID, feedbackLang: "en" }, deps)).toBe(REPORT);
    expect(ai.asked).toEqual([]);
    expect(ledger.entries()).toEqual([]);
  });

  it("refuses, before any request, a session it does not hold, one still running, and one with no answer", async () => {
    const running = setUp([anOralSession({ turns: TURNS })]);
    await expect(requestOralReport({ sessionId: sessionId("absent"), feedbackLang: "en" }, running.deps)).rejects.toBeInstanceOf(
      UnknownOralSessionError,
    );
    await expect(requestOralReport({ sessionId: SESSION_ID, feedbackLang: "en" }, running.deps)).rejects.toBeInstanceOf(
      OralSessionRunningError,
    );

    const silent = setUp([anEnded({ turns: [TURNS[0]!, { ...TURNS[1]!, text: "  " }] })]);
    await expect(requestOralReport({ sessionId: SESSION_ID, feedbackLang: "en" }, silent.deps)).rejects.toBeInstanceOf(
      NothingToAssessError,
    );
    expect([...running.ai.asked, ...silent.ai.asked]).toEqual([]);
  });

  it("refuses a session whose scenario the bank no longer holds, before any request", async () => {
    const { ai, deps } = setUp([anEnded({ scenarioId: scenarioId("gone") })]);

    await expect(requestOralReport({ sessionId: SESSION_ID, feedbackLang: "en" }, deps)).rejects.toBeInstanceOf(
      UnknownScenarioError,
    );
    expect(ai.asked).toEqual([]);
  });

  it("keeps the session unassessed when the call fails, and still records what it cost", async () => {
    const { oral, ledger, deps } = setUp([anEnded()], { fail: new Error("malformed twice") });

    await expect(requestOralReport({ sessionId: SESSION_ID, feedbackLang: "en" }, deps)).rejects.toThrow("malformed twice");
    expect((await oral.get(SESSION_ID))?.assessment).toBeNull();
    expect(ledger.entries()).toHaveLength(1);
  });

  it("names a missing key, spending nothing", async () => {
    const { oral, deps } = setUp([anEnded()], { key: null });

    await expect(requestOralReport({ sessionId: SESSION_ID, feedbackLang: "en" }, deps)).rejects.toBeInstanceOf(NoApiKeyError);
    expect((await oral.get(SESSION_ID))?.assessment).toBeNull();
  });
});

describe("oralReport (D126)", () => {
  const view = (sessions: readonly OralSession[], rows = [aCostEntry()]) => ({
    oral: oralStore(sessions),
    items: scenarioBank(),
    ledger: costLedger(rows),
    fillers: FILLERS,
  });

  it("is nothing for a session this device does not hold", async () => {
    expect(await oralReport(sessionId("absent"), view([]))).toBeNull();
  });

  it("gives the session, its scenario and its fluency over the spoken answers, in the scenario's language", async () => {
    const report = await oralReport(SESSION_ID, view([anEnded()]));

    expect(report?.scenario).toBe(SCENARIO);
    expect(report?.session.turns).toBe(TURNS);
    // One spoken answer: 8 words in 6 s, three fillers, and a 1 s pause after its question.
    expect(report?.fluency).toEqual({ spokenTurns: 1, wordsPerMinute: 80, fillerCount: 3, meanPauseMs: 1_000 });
  });

  it("counts no filler when the bank no longer holds the scenario, since it names the language", async () => {
    const report = await oralReport(SESSION_ID, view([anEnded({ scenarioId: scenarioId("gone") })]));

    expect(report?.scenario).toBeNull();
    expect(report?.fluency.fillerCount).toBeNull();
    expect(report?.fluency.wordsPerMinute).toBe(80);
  });

  it("costs the session from its own rows only, the practice and the report apart, and counts an unpriced one", async () => {
    const mine = { sessionId: SESSION_ID, ts: "2026-09-27T10:01:00.000Z" };
    const rows = [
      aCostEntry({ ...mine, feature: "oral-practice", costUsd: 0.01 }),
      aCostEntry({ ...mine, feature: "oral-practice", costUsd: 0.005 }),
      aCostEntry({ ...mine, feature: "oral-practice", costUsd: null }),
      aCostEntry({ ...mine, feature: "oral-assessment", costUsd: 0.02 }),
      // Another session's, a call for no session, and one from before this session began.
      aCostEntry({ sessionId: sessionId("other"), ts: mine.ts, feature: "oral-practice", costUsd: 5 }),
      aCostEntry({ ts: mine.ts, feature: "writing-feedback", costUsd: 5 }),
      aCostEntry({ ...mine, ts: "2026-09-27T09:00:00.000Z", feature: "oral-practice", costUsd: 5 }),
    ];
    const report = await oralReport(SESSION_ID, view([anEnded()], rows));

    expect(report?.cost.practiceUsd).toBeCloseTo(0.015, 10);
    expect(report?.cost.reportUsd).toBeCloseTo(0.02, 10);
    expect(report?.cost.unpriced).toBe(1);
  });

  it("offers a report only for an ended, unassessed session with an answer", async () => {
    const ask = async (session: OralSession) => (await oralReport(SESSION_ID, view([session])))?.canAssess;

    expect(await ask(anEnded())).toBe(true);
    expect(await ask(anEnded({ assessment: REPORT }))).toBe(false);
    expect(await ask(anOralSession({ turns: TURNS }))).toBe(false);
    expect(await ask(anEnded({ turns: [TURNS[0]!] }))).toBe(false);
  });
});

describe("oralHistory (D126)", () => {
  it("lists ended sessions newest first, each with its type, whether it has a report and whether it has an answer", async () => {
    const sessions = [
      anEnded({ id: sessionId("old"), startedAt: "2026-09-25T10:00:00.000Z", assessment: REPORT }),
      anEnded({ id: sessionId("new"), startedAt: "2026-09-27T09:00:00.000Z", turns: [TURNS[0]!], endReason: "ended-by-user" }),
      anOralSession({ id: sessionId("running"), startedAt: START }),
      anEnded({ id: sessionId("lost"), startedAt: "2026-09-26T10:00:00.000Z", scenarioId: scenarioId("gone") }),
    ];
    const history = await oralHistory({ oral: oralStore(sessions), items: scenarioBank() });

    expect(history.map((h) => [h.id, h.sessionType, h.endReason, h.assessed, h.answered])).toEqual([
      ["new", "work", "ended-by-user", false, false],
      ["lost", null, "completed", false, true],
      ["old", "work", "completed", true, true],
    ]);
  });
});

describe("oralFocusSubSkills (D124)", () => {
  it("is the newest report's fixes' sub-skills, in rank order, or none", () => {
    const older = anEnded({ id: sessionId("older"), assessment: { ...REPORT, fixes: [REPORT.fixes[1]!, REPORT.fixes[1]!, REPORT.fixes[1]!] } });
    const newer = anEnded({ id: sessionId("newer"), assessment: REPORT });
    const unassessed = anEnded({ id: sessionId("none") });

    expect(oralFocusSubSkills([unassessed, newer, older])).toEqual([
      "word-choice-precision",
      "agreement",
      "connectors-and-discourse-markers",
    ]);
    expect(oralFocusSubSkills([unassessed])).toEqual([]);
    expect(oralFocusSubSkills([])).toEqual([]);
  });
});
