import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import type { AnswerSource, CandidateAnswer, ExaminerQuestion } from "@palier/app";
import { scenarioId, sessionId } from "@palier/domain";
import { mswServer, openAiHandlers } from "@palier/testing";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import aiModels from "./ai-models.json";
import { BANK_BASE_PATH, createContainer } from "./container";

/**
 * Spoken sessions through the real wiring (Phase 5 Slices 1–2, progress.md D115, D118): the oral
 * store in both graphs, kept on this device alone, and a practice session run by the real
 * turn-based transport over the real OpenAI adapter and MSW, metered into the real ledger. A
 * transcript never leaves the device in an export, a clip reaches only the transcription
 * endpoint, and a wipe and a delete-everywhere take it all [R11, R12].
 */

vi.mock("../server/db", () => ({ syncApi: () => Promise.resolve(null) }));

const MARKER = "ORAL-TRANSCRIPT-MARKER: je dirige la migration du système de paie.";

const aSession = (id: string) => ({
  id: sessionId(id),
  scenarioId: scenarioId("fixture-scenario-work-c"),
  startedAt: "2026-09-27T10:00:00.000Z",
  endedAt: "2026-09-27T10:10:00.000Z",
  endReason: "completed" as const,
  turns: [{ speaker: "candidate" as const, text: MARKER, phase: 1, startMs: 130_000, endMs: 142_000 }],
  assessment: null,
});

// content/profiles/psc-sle.json → content/: the production graph's bank, served from disk.
const CONTENT_DIR = dirname(dirname(createRequire(import.meta.url).resolve("@palier/content/profiles/psc-sle.json")));
let network: typeof fetch = fetch;

beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: "error" });
  network = globalThis.fetch;
});
afterEach(async () => {
  mswServer.resetHandlers();
  vi.unstubAllGlobals();
  // Every production container shares the one IndexedDB database, so leave it empty.
  await createContainer({ hermetic: false }).useCases.wipeData();
});
afterAll(() => {
  mswServer.close();
});

/**
 * The production bank's URLs are origin-relative, which Node cannot fetch, so they are read from the
 * committed tree; everything else, OpenAI included, goes to MSW.
 */
const serveBankBesideMsw = () => {
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (!url.startsWith(`${BANK_BASE_PATH}/`)) return network(url, init);
    const body = await readFile(join(CONTENT_DIR, url.slice(BANK_BASE_PATH.length + 1)), "utf8");
    return { ok: true, status: 200, json: async () => JSON.parse(body) as unknown };
  });
};

const KEY = "sk-palier-oral-test-4c1d";
const CLIP = "ORAL-CLIP-MARKER";
const HEARD = "ORAL-HEARD-MARKER: je coordonne les consultations avec les provinces.";
const EXAMINER = { text: "Parlez-moi de votre poste actuel.", difficulty: null };

/** A candidate who answers the first question with a clip and then waits, as the screen would. */
const oneClip = () => {
  const questions: ExaminerQuestion[] = [];
  let asked: () => void = () => undefined;
  const secondQuestion = new Promise<void>((resolve) => {
    asked = resolve;
  });
  const answers: AnswerSource = {
    answer: (question, signal) => {
      questions.push(question);
      if (questions.length === 1) {
        return Promise.resolve<CandidateAnswer>({ kind: "audio", audio: new Blob([CLIP], { type: "audio/webm" }), durationMs: 3_000 });
      }
      asked();
      return new Promise<CandidateAnswer>((_, reject) => {
        signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    },
  };
  return { answers, questions, secondQuestion };
};

describe.each([
  ["hermetic", true],
  ["production", false],
])("the oral store, %s", (_graph, hermetic) => {
  it("never exports a session, and empties sessions and recordings on a wipe and on delete-everywhere [R12]", async () => {
    const c = createContainer({ hermetic });
    await c.oral.put(aSession("oral-1"));
    await c.oral.putAudio(sessionId("oral-1"), new Blob(["son"], { type: "audio/webm" }));

    const exported = JSON.stringify(await c.useCases.exportData());
    expect(exported).not.toContain("ORAL-TRANSCRIPT-MARKER");
    expect(exported).not.toContain("oral-1");

    await c.useCases.wipeData();
    expect(await c.oral.all()).toEqual([]);
    expect(await c.oral.audioIndex()).toEqual([]);

    await c.oral.put(aSession("oral-2"));
    await c.useCases.deleteEverywhere();
    expect(await c.oral.all()).toEqual([]);
  });
});

describe.each([
  ["hermetic", true],
  ["production", false],
] as const)("a practice session through the %s graph (D118)", (_graph, hermetic) => {
  it("offers a session of every type from the bank the graph reads", async () => {
    serveBankBesideMsw();
    const c = createContainer({ hermetic });
    const choices = await c.useCases.oralSessionChoices({ targetBand: "C", lang: "fr" });
    expect(choices.map((choice) => choice.sessionType)).toEqual(["warmup", "work", "opinion", "situation", "full"]);
  });

  it("asks, voices, transcribes the clip at the transcription endpoint only, keeps the transcript here, and meters it all", async () => {
    serveBankBesideMsw();
    const uploads: string[] = [];
    mswServer.use(
      ...openAiHandlers({
        mode: "ok",
        completions: [{ content: EXAMINER, usage: { prompt_tokens: 1_200, completion_tokens: 40 } }],
        transcript: HEARD,
        onUpload: (clip) => void clip.text().then((text) => uploads.push(text)),
      }),
    );
    const c = createContainer({ hermetic });
    await c.useCases.saveApiKey({ key: KEY, remember: true });
    const [choice] = (await c.useCases.oralSessionChoices({ targetBand: "C", lang: "fr" })).filter((x) => x.sessionType === "work");
    if (choice === undefined) throw new Error("the bank offers a work discussion");
    const candidate = oneClip();

    const run = await c.useCases.startOralPractice({ sessionId: sessionId(c.ids.ulid()), scenarioId: choice.scenario.id }, candidate.answers);
    await candidate.secondQuestion;
    await run.endByUser();
    const ended = await run.ended;

    expect(ended.endReason).toBe("ended-by-user");
    expect(ended.turns.map((turn) => [turn.speaker, turn.text])).toEqual([
      ["examiner", EXAMINER.text],
      ["candidate", HEARD],
      ["examiner", EXAMINER.text],
    ]);
    expect(await candidate.questions[0]?.audio?.text()).toBe(`ID3:${EXAMINER.text}`);
    expect(uploads).toEqual([CLIP]);
    expect(run.failure()).toBeNull();

    const rows = await c.costLedger.since("2000-01-01T00:00:00.000Z");
    expect(rows.map((row) => row.model)).toEqual([
      aiModels.examiner,
      aiModels.speech,
      aiModels.transcribe,
      aiModels.examiner,
      aiModels.speech,
    ]);
    expect(new Set(rows.map((row) => row.feature))).toEqual(new Set(["oral-practice"]));
    expect(rows.every((row) => row.costUsd !== null && row.costUsd > 0)).toBe(true);
    // 3 seconds at US$0.0045 a minute.
    expect(rows[2]?.costUsd).toBeCloseTo(0.000225, 12);

    const exported = JSON.stringify(await c.useCases.exportData());
    expect(exported).not.toContain("ORAL-HEARD-MARKER");
    expect(exported).not.toContain(CLIP);
  });

  it("ends the session as a failed transport when OpenAI refuses the key, and names why", async () => {
    serveBankBesideMsw();
    mswServer.use(...openAiHandlers({ mode: "invalid-key" }));
    const c = createContainer({ hermetic });
    await c.useCases.saveApiKey({ key: KEY, remember: true });
    const [choice] = await c.useCases.oralSessionChoices({ targetBand: "C", lang: "fr" });
    if (choice === undefined) throw new Error("the bank offers a session");

    const run = await c.useCases.startOralPractice({ sessionId: sessionId(c.ids.ulid()), scenarioId: choice.scenario.id }, oneClip().answers);
    const ended = await run.ended;

    expect(ended.endReason).toBe("transport-failed");
    expect(run.failure()).toMatchObject({ name: "InvalidApiKeyError" });
    expect(await c.useCases.oralSession({ sessionId: ended.id })).toEqual(ended);
  });

  it("asks for a session's report once, on the assess model, metered under the session, and keeps it here (D126)", async () => {
    serveBankBesideMsw();
    const criterion = { band: "B", evidence: "« je dirige la migration »" };
    const word = { word: "piloter", turn: 0, excerpt: "je dirige", example: "Je pilote la migration." };
    const REPORT = {
      criteria: { comprehension: criterion, fluency: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
      fixes: [
        { criterion: "vocabulary", subSkill: "word-choice-precision", advice: "a", evidence: "e" },
        { criterion: "grammar", subSkill: "agreement", advice: "a", evidence: "e" },
        { criterion: "task", subSkill: "connectors-and-discourse-markers", advice: "a", evidence: "e" },
      ],
      missingWords: [word, word, word, word, word],
      errors: [{ turn: 0, excerpt: "système de paie", correction: "système de rémunération", rule: "précision" }],
    };
    const prompts: string[] = [];
    mswServer.use(
      ...openAiHandlers({
        mode: "ok",
        completions: [
          {
            content: (prompt: string) => {
              prompts.push(prompt);
              return REPORT;
            },
            usage: { prompt_tokens: 3_000, completion_tokens: 1_200 },
          },
        ],
      }),
    );
    const c = createContainer({ hermetic });
    await c.useCases.saveApiKey({ key: KEY, remember: true });
    const [choice] = (await c.useCases.oralSessionChoices({ targetBand: "C", lang: "fr" })).filter((x) => x.sessionType === "work");
    if (choice === undefined) throw new Error("the bank offers a work discussion");
    const id = sessionId("oral-report-1");
    // Before either graph's clock, as a session is before the calls made for it.
    const at = { startedAt: "2020-01-01T10:00:00.000Z", endedAt: "2020-01-01T10:10:00.000Z" };
    await c.oral.put({ ...aSession("oral-report-1"), ...at, scenarioId: choice.scenario.id });

    const report = await c.useCases.requestOralReport({ sessionId: id, feedbackLang: "en" });
    expect(report.errors).toEqual([
      { turn: 0, start: MARKER.indexOf("système"), end: MARKER.indexOf("système") + "système de paie".length, correction: "système de rémunération", rule: "précision" },
    ]);
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain(MARKER);
    expect(prompts[0]).toContain(c.profile.oral.descriptors.C.en);

    // Asked again, it spends nothing.
    await c.useCases.requestOralReport({ sessionId: id, feedbackLang: "en" });
    const rows = await c.costLedger.since("2000-01-01T00:00:00.000Z");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ feature: "oral-assessment", model: aiModels.assess, sessionId: id });
    expect(rows[0]?.costUsd).toBeGreaterThan(0);

    const shown = await c.useCases.oralReport({ sessionId: id });
    expect(shown?.session.assessment).toEqual(report);
    expect(shown?.cost.report.usd).toBeCloseTo(rows[0]?.costUsd ?? 0, 12);
    expect(shown?.cost.report.calls).toBe(1);
    expect(shown?.blocked).toBe("assessed");
    expect(await c.useCases.oralHistory()).toEqual([expect.objectContaining({ id, assessed: true, sessionType: "work" })]);

    const exported = JSON.stringify(await c.useCases.exportData());
    expect(exported).not.toContain("système de rémunération");
  });

  it("joins a report request still out rather than making a second, and forgets it once settled (D127)", async () => {
    serveBankBesideMsw();
    let answer: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      answer = resolve;
    });
    const criterion = { band: "B", evidence: "e" };
    const word = { word: "piloter", turn: 0, excerpt: "je dirige", example: "x" };
    let asked = 0;
    mswServer.use(
      ...openAiHandlers({
        mode: "ok",
        completions: [
          {
            content: () => {
              asked += 1;
              return {
                criteria: { comprehension: criterion, fluency: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
                fixes: [{ criterion: "grammar", subSkill: "agreement", advice: "a", evidence: "e" }],
                missingWords: [word],
                errors: [],
              };
            },
            usage: { prompt_tokens: 100, completion_tokens: 100 },
          },
        ],
      }),
    );
    const c = createContainer({ hermetic });
    await c.useCases.saveApiKey({ key: KEY, remember: true });
    const [choice] = await c.useCases.oralSessionChoices({ targetBand: "C", lang: "fr" });
    if (choice === undefined) throw new Error("the bank offers a session");
    const id = sessionId("oral-report-2");
    await c.oral.put({ ...aSession("oral-report-2"), startedAt: "2020-01-01T10:00:00.000Z", endedAt: "2020-01-01T10:10:00.000Z", scenarioId: choice.scenario.id });
    // Hold the store's write, so the first request is still out when the second is made.
    const put = c.oral.put.bind(c.oral);
    c.oral.put = async (session) => {
      await held;
      return put(session);
    };

    const first = c.useCases.requestOralReport({ sessionId: id, feedbackLang: "en" });
    const second = c.useCases.requestOralReport({ sessionId: id, feedbackLang: "en" });
    expect(second).toBe(first);
    expect(c.useCases.oralReportInFlight({ sessionId: id })).toBe(first);
    answer();
    await first;

    expect(asked).toBe(1);
    expect(c.useCases.oralReportInFlight({ sessionId: id })).toBeNull();
  });

  it("forgets a report request that failed, so asking again makes a new call (D127)", async () => {
    serveBankBesideMsw();
    mswServer.use(...openAiHandlers({ mode: "invalid-key" }));
    const c = createContainer({ hermetic });
    await c.useCases.saveApiKey({ key: KEY, remember: true });
    const [choice] = await c.useCases.oralSessionChoices({ targetBand: "C", lang: "fr" });
    if (choice === undefined) throw new Error("the bank offers a session");
    const id = sessionId("oral-report-3");
    await c.oral.put({ ...aSession("oral-report-3"), startedAt: "2020-01-01T10:00:00.000Z", endedAt: "2020-01-01T10:10:00.000Z", scenarioId: choice.scenario.id });

    const first = c.useCases.requestOralReport({ sessionId: id, feedbackLang: "en" });
    await expect(first).rejects.toMatchObject({ name: "InvalidApiKeyError" });
    expect(c.useCases.oralReportInFlight({ sessionId: id })).toBeNull();
    const second = c.useCases.requestOralReport({ sessionId: id, feedbackLang: "en" });
    expect(second).not.toBe(first);
    await expect(second).rejects.toMatchObject({ name: "InvalidApiKeyError" });
  });

  it("plays back and deletes one session's recording, keeping its transcript (D126)", async () => {
    const c = createContainer({ hermetic });
    await c.oral.put(aSession("oral-8"));
    await c.oral.putAudio(sessionId("oral-8"), new Blob(["son"], { type: "audio/webm" }));

    expect(await (await c.useCases.oralRecording({ sessionId: sessionId("oral-8") }))?.text()).toBe("son");
    await c.useCases.deleteOralRecording({ sessionId: sessionId("oral-8") });
    expect(await c.useCases.oralRecording({ sessionId: sessionId("oral-8") })).toBeNull();
    expect(await c.useCases.oralSession({ sessionId: sessionId("oral-8") })).not.toBeNull();
  });

  it("keeps a session's recording under the retention policy, reports its size, and cleans it up, transcripts kept", async () => {
    const c = createContainer({ hermetic });
    await c.oral.put(aSession("oral-9"));

    expect(await c.useCases.saveOralAudio({ sessionId: sessionId("oral-9"), audio: new Blob(["0123456789"]) })).toEqual({ evicted: [] });
    expect(await c.useCases.oralStorageEstimate()).toEqual({ bytes: 10, warn: false });

    await c.useCases.cleanUpAudio();
    expect(await c.useCases.oralStorageEstimate()).toEqual({ bytes: 0, warn: false });
    expect(await c.useCases.oralSession({ sessionId: sessionId("oral-9") })).not.toBeNull();
  });
});
