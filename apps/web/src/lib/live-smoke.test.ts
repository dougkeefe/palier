import type { FetchLike } from "@palier/adapters/openai";
import { draftsFor, verdictFor } from "@palier/testing";
import writingPromptLibrary from "@palier/content/writing/prompts.json";
import type { ExaminerTurnRequest } from "@palier/domain";
import { parseWritingPromptsOrThrow } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { main, measuredFeatures, recordings } from "../../scripts/live-smoke.mjs";
import { main as stabilityMain } from "../../scripts/oral-stability.mjs";
import aiModels from "./ai-models.json";
import { LIVE_SMOKE_REVIEWS, ORAL_STABILITY_RUNS, runLiveSmoke, runOralStability } from "./live-smoke";
import { PRICING } from "./pricing";

/**
 * The nightly live smoke and the fixture recorder (progress.md D112), over a stubbed network.
 * The real run is the nightly lane's, on `OPENAI_SMOKE_KEY`, or the human's with `--record`.
 */

const KEY = "sk-live-smoke-test-7d2e";
const PROMPTS = parseWritingPromptsOrThrow(writingPromptLibrary);
const MODELS = { passage: aiModels.passage, draft: aiModels.draft, review: aiModels.review, assess: aiModels.assess };
/** The oral turn loop's three (D117), which the script configures from `ai-models.json`. */
const ORAL = { transcribe: aiModels.transcribe, speech: aiModels.speech, examiner: aiModels.examiner };
/** Studio mode's model (D165), which the script checks is listed and never calls. */
const STUDIO = { realtime: aiModels.realtime };

const criterion = { band: "B", evidence: "e" };
const FEEDBACK = {
  criteria: { register: criterion, structure: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
  errors: [],
  modelAnswer: "Une réponse modèle.",
};

const DESCRIPTORS = { A: "Descriptor A.", B: "Descriptor B.", C: "Descriptor C." };

/** A report whose every excerpt is in the first answer of both fixed sessions, the smoke's and the stability's (D122, D127). */
const ORAL_REPORT = {
  criteria: { comprehension: criterion, fluency: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
  fixes: [
    { criterion: "grammar", subSkill: "agreement", advice: "a", evidence: "e" },
    { criterion: "grammar", subSkill: "verb-tense-and-mood", advice: "a", evidence: "e" },
    { criterion: "vocabulary", subSkill: "word-choice-precision", advice: "a", evidence: "e" },
  ],
  missingWords: ["Euh", "analyste", "provinces", "notes", "sous-ministre"].map((excerpt) => ({ word: "w", turn: 1, excerpt, example: "x" })),
  errors: [{ turn: 1, excerpt: "principale des politiques", correction: "principale en politiques", rule: "préposition" }],
};

type Options = {
  listed?: readonly string[];
  malformedFirstReview?: boolean;
  status?: number;
  htmlError?: boolean;
  /** How many report calls, from the first, answer with a report the adapter refuses (D127). */
  refusedReports?: number;
};

/** A network that answers like OpenAI, recording each request's headers and body. */
const network = ({
  listed = [...Object.values(MODELS), ...Object.values(ORAL), ...Object.values(STUDIO)],
  malformedFirstReview = false,
  status = 200,
  htmlError = false,
  refusedReports = 0,
}: Options = {}) => {
  const requests: { url: string; headers: Record<string, string>; body: string | FormData }[] = [];
  let reviews = 0;
  let reports = 0;
  const reply = (s: number, body: unknown) => ({
    ok: s >= 200 && s < 300,
    status: s,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
  const fetchImpl: FetchLike = (url, init) => {
    requests.push({ url, headers: init.headers, body: init.body ?? "" });
    if (url.endsWith("/models")) return Promise.resolve(reply(200, { object: "list", data: listed.map((id) => ({ id })) }));
    if (htmlError) {
      return Promise.resolve({ ok: false, status: 502, json: () => Promise.reject(new SyntaxError("html")), text: () => Promise.resolve("<html>Bad gateway</html>") });
    }
    if (status !== 200) return Promise.resolve(reply(status, { error: { code: "rate_limit_exceeded" } }));
    if (init.body instanceof FormData) {
      // A transcription (D117): the clip is the speech this network voiced.
      return Promise.resolve(reply(200, { text: "Bonjour. Pouvez-vous me décrire votre poste ?", usage: { type: "duration", seconds: 5 } }));
    }
    const body = init.body ?? "{}";
    // A model OpenAI no longer lists answers as a retired one does.
    const model = (JSON.parse(body) as { model: string }).model;
    if (!listed.includes(model)) return Promise.resolve(reply(404, { error: { code: "model_not_found" } }));
    if (url.endsWith("/audio/speech")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: (name: string) => (name === "content-type" ? "audio/mpeg" : null) },
        json: () => Promise.reject(new SyntaxError("audio")),
        text: () => Promise.resolve("ID3-voiced"),
        blob: () => Promise.resolve(new Blob(["ID3-voiced"], { type: "audio/mpeg" })),
      });
    }
    const prompt = (JSON.parse(body) as { messages: { content: string }[] }).messages.map((m) => m.content).join("\n");
    const content = prompt.includes("Produce ")
      ? draftsFor(prompt, "SMOKE")
      : prompt.includes("adversarial reviewer")
        ? (reviews += 1) === 1 && malformedFirstReview
          ? { chosenKey: "z" }
          : verdictFor(prompt)
        : prompt.includes("You are the examiner")
          ? { text: "Parlez-moi de votre poste.", difficulty: null }
          : prompt.includes("assessing a rehearsal")
            ? (reports += 1) <= refusedReports * 2
              ? { ...ORAL_REPORT, fixes: [] }
              : ORAL_REPORT
            : FEEDBACK;
    return Promise.resolve(reply(200, { id: "chatcmpl-x", choices: [{ message: { content: JSON.stringify(content) } }], usage: { prompt_tokens: 300, completion_tokens: 500 } }));
  };
  return { fetchImpl, requests };
};

const run = (fetchImpl: FetchLike) =>
  runLiveSmoke({ apiKey: KEY, models: MODELS, prices: PRICING.prices, descriptors: DESCRIPTORS, prompts: PROMPTS, fetchImpl });

describe("runLiveSmoke", () => {
  it("checks the key, drafts one set per sentence-level type, reviews one set's worth, assesses two texts and reports on one session", async () => {
    const { fetchImpl, requests } = network();

    const result = await run(fetchImpl);

    expect(requests.filter((r) => r.url.endsWith("/models"))).toHaveLength(1);
    expect(result.byMethod).toEqual({
      generateItems: { calls: 3, inputTokens: 300, outputTokens: 500 },
      reviewItem: { calls: LIVE_SMOKE_REVIEWS, inputTokens: 300, outputTokens: 500 },
      assessWriting: { calls: 2, inputTokens: 300, outputTokens: 500 },
      examinerTurn: { calls: 0, inputTokens: 0, outputTokens: 0 },
      transcribe: { calls: 0, inputTokens: 0, outputTokens: 0 },
      speak: { calls: 0, inputTokens: 0, outputTokens: 0 },
      assessOral: { calls: 1, inputTokens: 300, outputTokens: 500 },
    });
    expect(result.byFeature["item-generation"].calls).toBe(3 + LIVE_SMOKE_REVIEWS);
    expect(result.byFeature["writing-feedback"].calls).toBe(2);
    expect(result.byFeature["oral-assessment"].calls).toBe(1);
    expect(result.byFeature["item-generation"].costUsd).toBeGreaterThan(0);
    expect(result.missingModels).toEqual([]);
  });

  it("keeps every completion with the request it answered, each accepted on the first try", async () => {
    const result = await run(network().fetchImpl);

    expect(result.completions).toHaveLength(3 + LIVE_SMOKE_REVIEWS + 2 + 1);
    expect(result.completions.every((c) => c.conformant && c.attempt === 1)).toBe(true);
    const [draft] = result.completions;
    expect(draft).toMatchObject({ method: "generateItems", model: MODELS.draft, request: { count: 5, lang: "fr" } });
    expect(JSON.parse(draft!.content)).toHaveProperty("items");
  });

  it("marks a refused completion and the retry that replaced it, and bills both", async () => {
    const result = await run(network({ malformedFirstReview: true }).fetchImpl);

    const reviews = result.completions.filter((c) => c.method === "reviewItem");
    expect(reviews.slice(0, 2).map((c) => [c.attempt, c.conformant])).toEqual([
      [1, false],
      [2, true],
    ]);
    expect(result.byMethod.reviewItem.calls).toBe(LIVE_SMOKE_REVIEWS);
    expect(result.byFeature["item-generation"].inputTokens).toBe(300 * (3 + LIVE_SMOKE_REVIEWS + 1));
  });

  it("names a configured model OpenAI no longer lists, and stops before paying for any call", async () => {
    const { fetchImpl, requests } = network({ listed: [MODELS.draft] });
    const result = await run(fetchImpl);

    expect(result.missingModels).toEqual([...new Set([MODELS.review, MODELS.assess])].filter((m) => m !== MODELS.draft));
    expect(requests.filter((r) => r.url.endsWith("/chat/completions"))).toEqual([]);
    expect(result.calls).toEqual([]);
  });

  it("names studio mode's realtime model when OpenAI no longer lists it, though the smoke never calls it (D165)", async () => {
    const { fetchImpl } = network({ listed: [MODELS.draft, MODELS.review, MODELS.assess] });
    const result = await runLiveSmoke({
      apiKey: KEY,
      models: { ...MODELS, realtime: "gpt-realtime-retired" },
      prices: PRICING.prices,
      descriptors: DESCRIPTORS,
      prompts: PROMPTS,
      fetchImpl,
    });

    expect(result.missingModels).toEqual(["gpt-realtime-retired"]);
    expect(result.byFeature["oral-studio"]).toEqual({ calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 });
  });

  it("sends the key to OpenAI as a bearer token, and records none of it", async () => {
    const { fetchImpl, requests } = network();
    const result = await run(fetchImpl);

    expect(new Set(requests.map((r) => r.headers.authorization))).toEqual(new Set([`Bearer ${KEY}`]));
    const recorded = recordings(result).map((f) => f.content).join("\n");
    expect(recorded).not.toContain(KEY);
    expect(recorded).not.toContain("Bearer");
    expect(recorded).not.toContain("chatcmpl-x");
  });
});

describe("runLiveSmoke — the oral turn loop's three (D117)", () => {
  const runOral = (fetchImpl: FetchLike) =>
    runLiveSmoke({
      apiKey: KEY,
      models: { ...MODELS, ...ORAL },
      voice: "sage",
      prices: PRICING.prices,
      descriptors: DESCRIPTORS,
      prompts: PROMPTS,
      fetchImpl,
    });

  it("voices a question, transcribes that same audio, and asks the examiner three times, all metered as oral practice", async () => {
    const { fetchImpl, requests } = network();
    const result = await runOral(fetchImpl);

    expect(requests.filter((r) => r.url.endsWith("/audio/speech"))).toHaveLength(1);
    expect(requests.filter((r) => r.url.endsWith("/audio/transcriptions"))).toHaveLength(1);
    const upload = requests.find((r) => r.body instanceof FormData)?.body as FormData;
    expect(await (upload.get("file") as File).text()).toBe("ID3-voiced");
    expect(JSON.parse(requests.find((r) => r.url.endsWith("/audio/speech"))?.body as string)).toMatchObject({ voice: "sage" });
    expect(result.byMethod.examinerTurn).toEqual({ calls: 3, inputTokens: 300, outputTokens: 500 });
    expect(result.byMethod.speak.calls).toBe(1);
    expect(result.byMethod.transcribe.calls).toBe(1);
    expect(result.byFeature["oral-practice"].calls).toBe(5);
    expect(result.byFeature["oral-practice"].costUsd).toBeGreaterThan(0);
  });

  it("records the audio described, never kept: a transcription's clip by type and size, and a voice by its content type and size", async () => {
    const result = await runOral(network().fetchImpl);

    const speak = result.completions.find((c) => c.method === "speak");
    const transcribe = result.completions.find((c) => c.method === "transcribe");
    expect(speak).toMatchObject({ model: ORAL.speech, conformant: true });
    expect(JSON.parse(speak!.content)).toEqual({ contentType: "audio/mpeg", bytes: 10 });
    expect(transcribe).toMatchObject({ model: ORAL.transcribe, request: { lang: "fr", audio: { type: "audio/mpeg", bytes: 10 } } });
    expect(JSON.parse(transcribe!.content)).toHaveProperty("text");
    expect(JSON.stringify(result.completions)).not.toContain("ID3-voiced");
  });

  it("records each examiner turn with the request it answered", async () => {
    const result = await runOral(network().fetchImpl);
    const turns = result.completions.filter((c) => c.method === "examinerTurn");
    expect(turns.map((t) => (t.request as { register: string }).register)).toEqual(["baseline", "escalate", "escalate"]);
    expect(turns.every((t) => t.conformant)).toBe(true);
  });

  it("asks the examiner to follow on from an answer that contradicts its question's premise, so a human can read whether it listened (D176)", async () => {
    const result = await runOral(network().fetchImpl);
    const last = result.completions.filter((c) => c.method === "examinerTurn").at(-1);
    const request = last?.request as ExaminerTurnRequest | undefined;
    expect(request?.transcript.at(-1)?.text).toContain("Je n'ai jamais géré de projet");
  });
});

describe("runLiveSmoke — the report on a session (D122)", () => {
  it("asks for the fixed session's report with the profile's descriptors, metered as the oral report", async () => {
    const { fetchImpl, requests } = network();
    const result = await run(fetchImpl);

    const report = result.completions.find((c) => c.method === "assessOral");
    expect(report).toMatchObject({ model: MODELS.assess, conformant: true, request: { descriptors: DESCRIPTORS, targetBand: "C" } });
    const sent = requests.map((r) => r.body).find((body) => typeof body === "string" && body.includes("assessing a rehearsal"));
    expect(sent).toContain("Level C: Descriptor C.");
    expect(result.calls.filter((c) => c.feature === "oral-assessment")).toHaveLength(1);
  });
});

describe("runOralStability (D126, D127)", () => {
  it("scores the same session five times and makes no other call", async () => {
    const { fetchImpl, requests } = network();
    const result = await runOralStability({ apiKey: KEY, models: MODELS, prices: PRICING.prices, descriptors: DESCRIPTORS, fetchImpl });

    expect(ORAL_STABILITY_RUNS).toBe(5);
    expect(requests).toHaveLength(5);
    expect(result.completions.map((c) => c.method)).toEqual(Array(5).fill("assessOral"));
    expect(new Set(result.completions.map((c) => JSON.stringify(c.request))).size).toBe(1);
    expect(result.calls.map((c) => c.feature)).toEqual(Array(5).fill("oral-assessment"));
    expect(result.failedCalls).toBe(0);
  });

  it("scores the longer stability session, not the smoke's short one: eight spoken answers, each with its pause", async () => {
    const { fetchImpl, requests } = network();
    const result = await runOralStability({ apiKey: KEY, models: MODELS, prices: PRICING.prices, descriptors: DESCRIPTORS, fetchImpl });

    const turns = (result.completions[0]?.request as unknown as { turns: { speaker: string; input?: string; pauseMs?: number }[] }).turns;
    const answers = turns.filter((turn) => turn.speaker === "candidate");
    expect(answers).toHaveLength(8);
    expect(answers.every((turn) => turn.input === "voice" && typeof turn.pauseMs === "number")).toBe(true);
    expect(requests[0]?.body).toContain("[15] Candidate:");
  });

  it("keeps a report the adapter refused twice, counts it, and goes on to the rest", async () => {
    const result = await runOralStability({
      apiKey: KEY,
      models: MODELS,
      prices: PRICING.prices,
      descriptors: DESCRIPTORS,
      fetchImpl: network({ refusedReports: 1 }).fetchImpl,
    });

    expect(result.failedCalls).toBe(1);
    expect(result.completions).toHaveLength(2 + 4);
    expect(result.completions.slice(0, 2).map((c) => c.conformant)).toEqual([false, false]);
  });

  it("stops on a failure that says nothing about the scorer, such as a refused key", async () => {
    await expect(
      runOralStability({ apiKey: KEY, models: MODELS, prices: PRICING.prices, descriptors: DESCRIPTORS, fetchImpl: network({ status: 401 }).fetchImpl }),
    ).rejects.toMatchObject({ name: "InvalidApiKeyError" });
  });

  it("records the number of runs the factory's eval requires, as a literal both sides hold", () => {
    expect(ORAL_STABILITY_RUNS).toBe(5);
  });
});

describe("oral-stability.mjs", () => {
  const capture = () => {
    const out: string[] = [];
    const err: string[] = [];
    const files = new Map<string, string>();
    return {
      out,
      err,
      files,
      io: { log: (l: string) => out.push(l), error: (l: string) => err.push(l), write: (n: string, c: string) => files.set(n, c) },
    };
  };

  it("skips, says so, and exits 0 without a key", async () => {
    const c = capture();
    expect(await stabilityMain({ env: {}, ...c.io })).toBe(0);
    expect(c.out.join("\n")).toMatch(/^oral-stability: skipped\. OPENAI_API_KEY is not set/);
    expect(c.files.size).toBe(0);
  });

  it("records the five reports as one fixture file, and never the key", async () => {
    const c = capture();
    expect(await stabilityMain({ env: { OPENAI_API_KEY: KEY }, fetchImpl: network().fetchImpl, ...c.io })).toBe(0);
    expect([...c.files.keys()]).toEqual(["assessOral-stability.json"]);
    const file = c.files.get("assessOral-stability.json") ?? "";
    expect((JSON.parse(file) as { completions: unknown[] }).completions).toHaveLength(5);
    expect(file).not.toContain(KEY);
    expect(c.out.join("\n")).toContain("recorded 5 report(s) of 5");
  });

  it("records a report the adapter refused twice, and says so", async () => {
    const c = capture();
    expect(await stabilityMain({ env: { OPENAI_API_KEY: KEY }, fetchImpl: network({ refusedReports: 1 }).fetchImpl, ...c.io })).toBe(0);
    expect(c.files.size).toBe(1);
    expect(c.out.join("\n")).toContain("recorded 4 report(s) of 5");
    expect(c.out.join("\n")).toContain("1 call(s) gave no report after the adapter's retry");
  });

  it("exits 1 and records nothing when a call fails, naming the adapter's error", async () => {
    const c = capture();
    expect(await stabilityMain({ env: { OPENAI_API_KEY: KEY }, fetchImpl: network({ status: 429 }).fetchImpl, ...c.io })).toBe(1);
    expect(c.err.join("\n")).toContain("RateLimitError");
    expect(c.files.size).toBe(0);
  });
});

describe("live-smoke.mjs", () => {
  const capture = () => {
    const out: string[] = [];
    const err: string[] = [];
    const files = new Map<string, string>();
    return {
      out,
      err,
      files,
      io: { log: (l: string) => out.push(l), error: (l: string) => err.push(l), write: (n: string, c: string) => files.set(n, c) },
    };
  };

  it("skips, says so, and exits 0 without a key, so a lane without the secret does not fail", async () => {
    const c = capture();
    expect(await main({ argv: [], env: {}, ...c.io })).toBe(0);
    expect(c.out.join("\n")).toMatch(/^live-smoke: skipped\. OPENAI_API_KEY is not set/);
  });

  it("prints the measured tokens and the pricing block, and never the key", async () => {
    const c = capture();
    expect(await main({ argv: [], env: { OPENAI_API_KEY: KEY }, fetchImpl: network().fetchImpl, ...c.io })).toBe(0);
    const printed = c.out.join("\n");
    expect(printed).toContain("generateItems: 3 call(s), average in 300  out 500");
    expect(printed).toContain("measured features for pricing.json:");
    expect(printed).toContain("oral-assessment, on the smoke's short fixed session, NOT a typical report, do not copy into pricing.json");
    expect(printed).not.toContain(KEY);
    expect(c.files.size).toBe(0);
  });

  it("records one fixture file per method with --record", async () => {
    const c = capture();
    await main({ argv: ["--record"], env: { OPENAI_API_KEY: KEY }, fetchImpl: network().fetchImpl, ...c.io });

    expect([...c.files.keys()].sort()).toEqual([
      "assessOral.json",
      "assessWriting.json",
      "examinerTurn.json",
      "generateItems.json",
      "reviewItem.json",
      "speak.json",
      "transcribe.json",
    ]);
    const reviews = JSON.parse(c.files.get("reviewItem.json") ?? "{}") as { completions: unknown[] };
    expect(reviews.completions).toHaveLength(LIVE_SMOKE_REVIEWS);
  });

  it("records with LIVE_SMOKE_RECORD=1 as well, for a shell that cannot pass --record", async () => {
    const c = capture();
    await main({ argv: [], env: { OPENAI_API_KEY: KEY, LIVE_SMOKE_RECORD: "1" }, fetchImpl: network().fetchImpl, ...c.io });

    expect(c.files.size).toBe(7);
  });

  it("exits 1 when a live call fails, naming the adapter's error", async () => {
    const c = capture();
    expect(await main({ argv: [], env: { OPENAI_API_KEY: KEY }, fetchImpl: network({ status: 429 }).fetchImpl, ...c.io })).toBe(1);
    expect(c.err.join("\n")).toContain("RateLimitError");
  });

  it("names the adapter's error, not a parse error, when OpenAI answers with an HTML error page", async () => {
    const c = capture();
    expect(await main({ argv: [], env: { OPENAI_API_KEY: KEY }, fetchImpl: network({ htmlError: true }).fetchImpl, ...c.io })).toBe(1);
    expect(c.err.join("\n")).toContain("ProviderRequestError");
    expect(c.err.join("\n")).not.toContain("SyntaxError");
  });

  it("exits 1 when a configured model is no longer listed", async () => {
    const c = capture();
    expect(
      await main({ argv: [], env: { OPENAI_API_KEY: KEY }, fetchImpl: network({ listed: [] }).fetchImpl, ...c.io }),
    ).toBe(1);
    expect(c.err.join("\n")).toMatch(/no longer lists .* No other call was made\./);
    expect(c.files.size).toBe(0);
  });
});

describe("measuredFeatures", () => {
  it("prices a set as one draft call and one set's worth of reviews, and feedback as one call, and never the short session's report", () => {
    const byMethod = {
      generateItems: { calls: 3, inputTokens: 400, outputTokens: 1_200 },
      reviewItem: { calls: 5, inputTokens: 300, outputTokens: 600 },
      assessWriting: { calls: 2, inputTokens: 900, outputTokens: 800 },
      assessOral: { calls: 1, inputTokens: 2_000, outputTokens: 1_100 },
    };
    // The report is left out: the smoke's session is short, so its report is no typical one (D127).
    expect(measuredFeatures({ byMethod })).toEqual({
      "writing-feedback": [{ role: "assess", inputTokens: 900, outputTokens: 800 }],
      "item-generation": [
        { role: "draft", inputTokens: 400, outputTokens: 1_200 },
        { role: "review", inputTokens: 1_500, outputTokens: 3_000 },
      ],
    });
  });
});
