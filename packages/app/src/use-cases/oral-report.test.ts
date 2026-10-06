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
  oralSessionCost,
  requestOralReport,
} from "./oral-report.js";
import { profile } from "./__tests__/exam-fakes.js";
import { SCENARIO, SESSION_ID, START, anOralSession, oralStore, scenarioBank, vaultWith } from "./__tests__/oral-fakes.js";
import { aCostEntry, costLedger } from "./__tests__/spend-fakes.js";

const ENDED = "2026-09-27T10:10:00.000Z";
const FILLERS = { en: ["um"], fr: ["euh", "tu sais"] };

const TURNS: OralSession["turns"] = [
  { speaker: "examiner", text: "Parlez-moi de votre projet.", phase: 0, startMs: 0, endMs: 2_000 },
  { speaker: "candidate", text: "Euh, je gère un projet, euh, tu sais.", phase: 0, startMs: 3_000, endMs: 9_000, input: "voice", pauseMs: 1_000 },
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
      interpretDiagnostic: false,
    }),
    generatePassage: unused,
    generateItems: unused,
    reviewItem: unused,
    assessWriting: unused,
    generateScenario: unused,
    transcribe: unused,
    speak: unused,
    examinerTurn: unused,
    interpretDiagnostic: unused,
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

  it("hands a studio session's examiner notes to the report, and none from a session with none (D168)", async () => {
    const notes = [{ criterion: "grammar" as const, evidence: "« si j'aurais »", severity: "major" as const, phase: 1 }];
    const studio = setUp([anEnded({ notes })]);
    await requestOralReport({ sessionId: SESSION_ID, feedbackLang: "en" }, studio.deps);
    const empty = setUp([anEnded({ notes: [] })]);
    await requestOralReport({ sessionId: SESSION_ID, feedbackLang: "en" }, empty.deps);

    expect(studio.ai.asked[0]?.notes).toEqual(notes);
    expect(empty.ai.asked[0]).not.toHaveProperty("notes");
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
    // One spoken answer: 8 words in 6 s, three fillers, and the 1 s pause the screen measured before it.
    expect(report?.fluency).toEqual({ spokenTurns: 1, wordsPerMinute: 80, fillerCount: 3, meanPauseMs: 1_000 });
  });

  it("counts no filler when the bank no longer holds the scenario, since it names the language", async () => {
    const report = await oralReport(SESSION_ID, view([anEnded({ scenarioId: scenarioId("gone") })]));

    expect(report?.scenario).toBeNull();
    expect(report?.fluency.fillerCount).toBeNull();
    expect(report?.fluency.wordsPerMinute).toBe(80);
  });

  it("costs the session from its own rows only, the practice and the report apart, each with its unpriced calls (D127)", async () => {
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

    expect(report?.cost.practice.usd).toBeCloseTo(0.015, 10);
    expect(report?.cost.practice).toMatchObject({ calls: 3, unpriced: 1 });
    expect(report?.cost.report).toEqual({ usd: 0.02, calls: 1, unpriced: 0 });
  });

  it("costs a studio session's conversation on its own line, apart from practice and the report (D182)", async () => {
    const mine = { sessionId: SESSION_ID, ts: "2026-09-27T10:01:00.000Z" };
    const rows = [
      aCostEntry({ ...mine, feature: "oral-studio", costUsd: 0.04 }),
      aCostEntry({ ...mine, feature: "oral-studio", costUsd: null }),
      aCostEntry({ ...mine, feature: "oral-assessment", costUsd: 0.02 }),
    ];
    const report = await oralReport(SESSION_ID, view([anEnded({ mode: "studio" })], rows));

    expect(report?.cost).toEqual({
      practice: { usd: 0, calls: 0, unpriced: 0 },
      studio: { usd: 0.04, calls: 2, unpriced: 1 },
      report: { usd: 0.02, calls: 1, unpriced: 0 },
    });
  });

  it("counts a report call OpenAI billed though it failed, while the session has no report (D127)", async () => {
    const rows = [aCostEntry({ sessionId: SESSION_ID, ts: "2026-09-27T10:12:00.000Z", feature: "oral-assessment", costUsd: 0.03 })];
    const report = await oralReport(SESSION_ID, view([anEnded()], rows));

    expect(report?.session.assessment).toBeNull();
    expect(report?.cost.report).toEqual({ usd: 0.03, calls: 1, unpriced: 0 });
  });

  it("says why a report cannot be asked for, in the order a request is refused (D127)", async () => {
    const blockOf = async (session: OralSession) => (await oralReport(SESSION_ID, view([session])))?.blocked;

    expect(await blockOf(anEnded())).toBeNull();
    expect(await blockOf(anOralSession({ turns: TURNS }))).toBe("running");
    expect(await blockOf(anEnded({ assessment: REPORT }))).toBe("assessed");
    expect(await blockOf(anEnded({ turns: [TURNS[0]!] }))).toBe("no-answer");
    expect(await blockOf(anEnded({ scenarioId: scenarioId("gone") }))).toBe("scenario-gone");
  });
});

describe("oralSessionCost (D182)", () => {
  it("reads a running session's cost so far from its own rows, for studio mode's meter", async () => {
    const rows = [
      aCostEntry({ sessionId: SESSION_ID, ts: "2026-09-27T10:01:00.000Z", feature: "oral-studio", costUsd: 0.01 }),
      aCostEntry({ sessionId: sessionId("other"), ts: "2026-09-27T10:01:00.000Z", feature: "oral-studio", costUsd: 5 }),
    ];
    const cost = await oralSessionCost(SESSION_ID, { oral: oralStore([anOralSession({ mode: "studio" })]), ledger: costLedger(rows) });

    expect(cost?.studio).toEqual({ usd: 0.01, calls: 1, unpriced: 0 });
  });

  it("is nothing for a session this device does not hold", async () => {
    expect(await oralSessionCost(sessionId("absent"), { oral: oralStore([]), ledger: costLedger([]) })).toBeNull();
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

describe("oralFocusSubSkills (D124, D127)", () => {
  const french = () => "fr" as const;

  it("is the newest report's fixes' sub-skills, in rank order, or none", () => {
    const older = anEnded({ id: sessionId("older"), assessment: { ...REPORT, fixes: [REPORT.fixes[1]!, REPORT.fixes[1]!, REPORT.fixes[1]!] } });
    const newer = anEnded({ id: sessionId("newer"), assessment: REPORT });
    const unassessed = anEnded({ id: sessionId("none") });

    expect(oralFocusSubSkills([unassessed, newer, older], "fr", french)).toEqual([
      "word-choice-precision",
      "agreement",
      "connectors-and-discourse-markers",
    ]);
    expect(oralFocusSubSkills([unassessed], "fr", french)).toEqual([]);
    expect(oralFocusSubSkills([], "fr", french)).toEqual([]);
  });

  it("takes only a report in the language the plan practises, and passes over one whose scenario is gone", () => {
    const english = anEnded({ id: sessionId("en"), scenarioId: scenarioId("scn-en"), assessment: REPORT });
    const gone = anEnded({ id: sessionId("gone"), scenarioId: scenarioId("gone"), assessment: REPORT });
    const french = anEnded({ id: sessionId("fr"), assessment: { ...REPORT, fixes: [REPORT.fixes[1]!] } });
    const langOf = (id: string) => (id === "scn-en" ? "en" : id === "gone" ? null : "fr") as "en" | "fr" | null;

    expect(oralFocusSubSkills([english, gone, french], "fr", langOf)).toEqual(["agreement"]);
    expect(oralFocusSubSkills([english, gone, french], "en", langOf)).toEqual(REPORT.fixes.map((fix) => fix.subSkill));
  });
});
