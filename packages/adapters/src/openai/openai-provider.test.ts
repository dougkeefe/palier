import { describe, expect, it, vi } from "vitest";

import { aiProviderContract } from "@palier/testing";

import { openAiProvider } from "./openai-provider.js";
import { PROMPT_VERSION } from "./prompts.js";
import type { FetchLike, OpenAiProviderConfig } from "./openai-provider.js";
import {
  InvalidApiKeyError,
  InvalidResponseError,
  ProviderRequestError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  RateLimitError,
} from "./errors.js";

const MODELS = {
  passage: "m-passage",
  draft: "m-draft",
  review: "m-review",
  assess: "m-assess",
  scenario: "m-scenario",
  transcribe: "m-transcribe",
  speech: "m-speech",
  examiner: "m-examiner",
} as const;

/** A JSON request body as text; a multipart one (a transcription) reads as none. */
const textOf = (body: string | FormData | undefined): string => (typeof body === "string" ? body : "");

const localised = { en: "en", fr: "fr" };
const option = (id: "a" | "b" | "c" | "d") => ({ id, text: `opt ${id}`, rationale: localised });

const PASSAGE_ENVELOPE = {
  passages: [
    {
      lang: "fr",
      docType: "memo",
      title: "Une note de service",
      body: "Première phrase. Deuxième phrase. Troisième phrase.",
      targetBand: "B",
      topic: "finance-and-budgets",
    },
  ],
};

const ITEM_ENVELOPE = {
  items: [
    {
      type: "cloze",
      stem: localised,
      blankIndex: 0,
      options: [option("a"), option("b"), option("c"), option("d")],
      key: "a",
      explanation: localised,
      subSkill: "agreement",
      targetBand: "B",
      topic: "human-resources",
    },
  ],
};

const VERDICT = {
  chosenKey: "a",
  confidence: 0.92,
  defensibleDistractors: [],
  optionCases: { a: "case a", b: "case b", c: "case c", d: "case d" },
  registerFlag: { flagged: false },
  estimatedBand: "B",
};

const WRITTEN = "Bonjour à tous, la réunion de lundi est reporter à mardi. Merci de votre compréhension.";

const criterion = { band: "B", evidence: "« Bonjour à tous » convient à un courriel d'équipe." };
const FEEDBACK = {
  criteria: { register: criterion, structure: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
  errors: [{ excerpt: "est reporter", correction: "est reportée", rule: "Accord du participe passé avec être" }],
  modelAnswer: "Bonjour à tous, la réunion de lundi est reportée à mardi. Merci de votre compréhension.",
};

const aPhase = (minutes: number) => ({
  name: "Mise en train",
  minutes,
  intent: "Establish a baseline.",
  seedQuestions: ["Parlez-moi de votre rôle."],
  escalation: ["Qu'auriez-vous fait autrement ?"],
  deescalation: ["Décrivez une journée type."],
});
/** A 10-minute plan, the length the contract asks for. */
const SCENARIO_PLAN = { phases: [aPhase(3), aPhase(4), aPhase(3)] };

/** A response body in the shape the provider reads, wrapping `content` JSON. */
const chatResponse = (content: unknown, usage = { prompt_tokens: 100, completion_tokens: 50 }) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(content) } }], usage }),
  text: () => Promise.resolve(""),
});

/** OpenAI's model list, the answer `verifyKey` reads. */
const modelsResponse = (body: unknown = { object: "list", data: [{ id: "m-draft", object: "model" }] }, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
});

/** A transcription's JSON answer, billed by duration as whisper-style models report it. */
const transcriptionResponse = (body: unknown = { text: " Je suis analyste. ", usage: { type: "duration", seconds: 3 } }) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
});

/** Speech's binary answer: audio bytes under an audio content type. */
const speechResponse = (type = "audio/mpeg", bytes = "ID3-audio") => ({
  ok: true,
  status: 200,
  headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? type : null) },
  json: () => Promise.reject(new Error("binary")),
  text: () => Promise.resolve(bytes),
  blob: () => Promise.resolve(new Blob([bytes], { type })),
});

const EXAMINER_TURN = { text: " Parlez-moi d'un projet récent. ", difficulty: null };

/** The candidate's words in the oral contract's session (`aiProviderContract`) and in `ORAL_TURNS`. */
const SAID = "J'ai mené un projet de modernisation, mais les délais était très serrés.";

const ORAL_TURNS = [
  { speaker: "examiner", text: "Parlez-moi d'un projet que vous avez mené.", phase: 0, startMs: 0, endMs: 0 },
  { speaker: "candidate", text: SAID, phase: 0, startMs: 2_000, endMs: 9_000, input: "voice" },
  { speaker: "examiner", text: "Qu'auriez-vous fait autrement ?", phase: 1, startMs: 9_500, endMs: 9_500 },
  { speaker: "candidate", text: "Je aurais demandé plus de temps.", phase: 1, startMs: 11_000, endMs: 14_000, input: "typed" },
] as const;

const aMissingWord = (excerpt: string) => ({ word: "échéancier", turn: 1, excerpt, example: "Nous avions un échéancier serré." });

/** An oral report whose every excerpt is in turn 1, the contract's candidate turn. */
const ORAL_REPORT = {
  criteria: { comprehension: criterion, fluency: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
  fixes: [
    { criterion: "grammar", subSkill: "agreement", advice: "Accordez le verbe.", evidence: "les délais était" },
    { criterion: "vocabulary", subSkill: "word-choice-precision", advice: "Précisez.", evidence: "très serrés" },
    { criterion: "task", subSkill: "connectors-and-discourse-markers", advice: "Enchaînez.", evidence: "mais" },
  ],
  missingWords: ["J'ai mené", "un projet", "de modernisation", "les délais", "très serrés"].map(aMissingWord),
  errors: [{ turn: 1, excerpt: "était", correction: "étaient", rule: "Accord du verbe avec le sujet" }],
};

/** The oral report's prompt, told from writing feedback's, which shares its model. */
const isOralReport = (body: string): boolean => body.includes("assessing a rehearsal");

/** Routes each call to the right envelope by the model in the request body, or to the model list. */
const cannedFetch: FetchLike = (url, init) => {
  if (url.endsWith("/models")) return Promise.resolve(modelsResponse());
  if (url.endsWith("/audio/transcriptions")) return Promise.resolve(transcriptionResponse());
  if (url.endsWith("/audio/speech")) return Promise.resolve(speechResponse());
  const model = (JSON.parse(textOf(init.body) || "{}") as { model: string }).model;
  if (model === MODELS.passage) return Promise.resolve(chatResponse(PASSAGE_ENVELOPE));
  if (model === MODELS.draft) return Promise.resolve(chatResponse(ITEM_ENVELOPE));
  if (model === MODELS.assess) {
    return Promise.resolve(chatResponse(isOralReport(textOf(init.body)) ? ORAL_REPORT : FEEDBACK));
  }
  if (model === MODELS.scenario) return Promise.resolve(chatResponse(SCENARIO_PLAN));
  if (model === MODELS.examiner) return Promise.resolve(chatResponse(EXAMINER_TURN));
  return Promise.resolve(chatResponse(VERDICT));
};

const makeProvider = (over: Partial<OpenAiProviderConfig> = {}) =>
  openAiProvider({ apiKey: "sk-test", models: MODELS, fetchImpl: cannedFetch, ...over });

// The port contract, against the real adapter driven by canned responses.
aiProviderContract("openai", () => Promise.resolve(makeProvider()));

describe("openAiProvider", () => {
  it("reports every capability, writing feedback and scenarios included when their models are configured", () => {
    expect(makeProvider().capabilities()).toEqual({
      generatePassage: true,
      generateItems: true,
      reviewItem: true,
      assessWriting: true,
      generateScenario: true,
      transcribe: true,
      speak: true,
      examinerTurn: true,
      assessOral: true,
    });
  });

  it("reports no writing feedback and no oral report when no assess model is configured, as the factory's is not", () => {
    const { assess: _assess, ...factoryModels } = MODELS;
    const caps = makeProvider({ models: factoryModels }).capabilities();
    expect([caps.assessWriting, caps.assessOral]).toEqual([false, false]);
  });

  it("reports no scenarios when no scenario model is configured, as the browser's is not", () => {
    const { scenario: _scenario, ...browserModels } = MODELS;
    expect(makeProvider({ models: browserModels }).capabilities().generateScenario).toBe(false);
  });

  it("sends the configured model and a bearer key", async () => {
    const spy = vi.fn(cannedFetch);
    await makeProvider({ fetchImpl: spy }).generateItems({
      promptSpec: { itemType: "cloze", targetBand: "B", subSkill: "agreement", instructions: "x" },
      topic: "human-resources",
      lang: "fr",
      count: 1,
    });
    const [url, init] = spy.mock.calls[0]!;
    expect(url).toContain("/chat/completions");
    expect(init.headers.authorization).toBe("Bearer sk-test");
    expect((JSON.parse(textOf(init.body) || "{}") as { model: string }).model).toBe(MODELS.draft);
  });

  it("asks the reviewer for a band on the PSC scale, never a CEFR level (prompt version 4, D112)", async () => {
    const spy = vi.fn(cannedFetch);
    await makeProvider({ fetchImpl: spy }).reviewItem({
      itemType: "cloze",
      stem: localised,
      options: [option("a"), option("b"), option("c"), option("d")],
      subSkill: "agreement",
      targetBand: "B",
      lang: "fr",
    });
    const [, init] = spy.mock.calls[0]!;
    const user = (JSON.parse(textOf(init.body) || "{}") as { messages: { content: string }[] }).messages[1]?.content ?? "";
    expect(user).toContain('exactly one of "A", "B", "C", never a CEFR level');
    expect(user).toContain('"estimatedBand": "A" | "B" | "C"');
    expect(PROMPT_VERSION).toBe("4");
  });

  it("records token usage after a call, and no usage before", async () => {
    const provider = makeProvider();
    expect(provider.lastUsage()).toBeNull();
    await provider.reviewItem({
      itemType: "cloze",
      stem: localised,
      options: [option("a"), option("b"), option("c"), option("d")],
      subSkill: "agreement",
      targetBand: "B",
      lang: "fr",
    });
    expect(provider.lastUsage()).toMatchObject({ model: MODELS.review, inputTokens: 100, outputTokens: 50 });
  });

  it("prices usage when a pricing table is supplied", async () => {
    const provider = makeProvider({
      pricing: { [MODELS.review]: { inputPerMTok: 1_000_000, outputPerMTok: 2_000_000 } },
    });
    await provider.reviewItem({
      itemType: "cloze",
      stem: localised,
      options: [option("a"), option("b"), option("c"), option("d")],
      subSkill: "agreement",
      targetBand: "B",
      lang: "fr",
    });
    // 100/1e6 * 1e6 + 50/1e6 * 2e6 = 100 + 100 = 200
    expect(provider.lastUsage()?.costUsd).toBeCloseTo(200);
  });

  it("handles a response that omits the usage block", async () => {
    const noUsage: FetchLike = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(VERDICT) } }] }),
        text: () => Promise.resolve(""),
      });
    const provider = makeProvider({
      fetchImpl: noUsage,
      pricing: { [MODELS.review]: { inputPerMTok: 1, outputPerMTok: 1 } },
    });
    await provider.reviewItem({
      itemType: "cloze",
      stem: localised,
      options: [option("a")],
      subSkill: "agreement",
      targetBand: "B",
      lang: "fr",
    });
    expect(provider.lastUsage()).toMatchObject({ inputTokens: 0, outputTokens: 0, costUsd: 0 });
  });

  it("retries once on a malformed body, then succeeds", async () => {
    let calls = 0;
    const flaky: FetchLike = () => {
      calls++;
      return Promise.resolve(calls === 1 ? chatResponse({ wrong: "shape" }) : chatResponse(VERDICT));
    };
    const verdict = await makeProvider({ fetchImpl: flaky }).reviewItem({
      itemType: "cloze",
      stem: localised,
      options: [option("a")],
      subSkill: "agreement",
      targetBand: "B",
      lang: "fr",
    });
    expect(calls).toBe(2);
    expect(verdict.chosenKey).toBe("a");
  });

  it("throws InvalidResponseError when retries are exhausted", async () => {
    const bad: FetchLike = () => Promise.resolve(chatResponse({ wrong: "shape" }));
    await expect(
      makeProvider({ fetchImpl: bad, maxRetries: 1 }).reviewItem({
        itemType: "cloze",
        stem: localised,
        options: [option("a")],
        subSkill: "agreement",
        targetBand: "B",
        lang: "fr",
      }),
    ).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it("throws InvalidResponseError when the content is not JSON", async () => {
    const notJson: FetchLike = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ choices: [{ message: { content: "not json" } }], usage: {} }),
        text: () => Promise.resolve(""),
      });
    await expect(
      makeProvider({ fetchImpl: notJson }).generateItems({
        promptSpec: { itemType: "cloze", targetBand: "B", subSkill: "agreement", instructions: "x" },
        topic: "human-resources",
        lang: "fr",
        count: 1,
      }),
    ).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it("throws InvalidResponseError when the message has no content", async () => {
    const empty: FetchLike = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ choices: [{ message: {} }], usage: {} }),
        text: () => Promise.resolve(""),
      });
    await expect(
      makeProvider({ fetchImpl: empty }).generatePassage({
        topic: "finance-and-budgets",
        docType: "memo",
        targetBand: "B",
        lang: "fr",
        count: 1,
      }),
    ).rejects.toBeInstanceOf(InvalidResponseError);
  });

  const errorResponse = (status: number): FetchLike => () =>
    Promise.resolve({
      ok: false,
      status,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve("boom"),
    });

  const reviewWith = (fetchImpl: FetchLike) =>
    makeProvider({ fetchImpl }).reviewItem({
      itemType: "cloze",
      stem: localised,
      options: [option("a")],
      subSkill: "agreement",
      targetBand: "B",
      lang: "fr",
    });

  it("translates 401 to InvalidApiKeyError", async () => {
    await expect(reviewWith(errorResponse(401))).rejects.toBeInstanceOf(InvalidApiKeyError);
  });

  it("translates 429 to RateLimitError", async () => {
    await expect(reviewWith(errorResponse(429))).rejects.toBeInstanceOf(RateLimitError);
  });

  it("translates any other non-2xx to ProviderRequestError", async () => {
    await expect(reviewWith(errorResponse(500))).rejects.toBeInstanceOf(ProviderRequestError);
  });

  it("translates a network fault to ProviderUnavailableError", async () => {
    const throws: FetchLike = () => Promise.reject(new Error("ECONNREFUSED"));
    await expect(reviewWith(throws)).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  const itemsWith = (fetchImpl: FetchLike) =>
    makeProvider({ fetchImpl, maxRetries: 0 }).generateItems({
      promptSpec: { itemType: "cloze", targetBand: "B", subSkill: "agreement", instructions: "x" },
      topic: "human-resources",
      lang: "fr",
      count: 1,
    });

  it("rejects a non-object envelope", async () => {
    const scalar: FetchLike = () => Promise.resolve(chatResponse(5));
    await expect(itemsWith(scalar)).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it("rejects an envelope whose items field is not an array", async () => {
    const bad: FetchLike = () => Promise.resolve(chatResponse({ items: "nope" }));
    await expect(itemsWith(bad)).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it("includes passage context when drafting a passage-bound item", async () => {
    const drafts = await makeProvider().generateItems({
      promptSpec: { itemType: "comprehension", targetBand: "B", subSkill: "agreement", instructions: "x" },
      passage: { title: "Une note", body: "Corps." },
      topic: "human-resources",
      lang: "fr",
      count: 1,
    });
    expect(drafts.length).toBeGreaterThan(0);
  });

  it("includes passage context when reviewing", async () => {
    const verdict = await makeProvider().reviewItem({
      itemType: "comprehension",
      stem: localised,
      options: [option("a"), option("b"), option("c"), option("d")],
      passage: { title: "Une note", body: "Corps." },
      subSkill: "agreement",
      targetBand: "B",
      lang: "fr",
    });
    expect(verdict.chosenKey).toBe("a");
  });

  it("falls back to the global fetch and default base URL", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", (url: string) => {
      calls.push(url);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(VERDICT) } }], usage: {} }),
        text: () => Promise.resolve(""),
      });
    });
    const provider = openAiProvider({ apiKey: "sk-test", models: MODELS });
    const verdict = await provider.reviewItem({
      itemType: "cloze",
      stem: localised,
      options: [option("a")],
      subSkill: "agreement",
      targetBand: "B",
      lang: "fr",
    });
    expect(verdict.chosenKey).toBe("a");
    expect(calls[0]).toBe("https://api.openai.com/v1/chat/completions");
    vi.unstubAllGlobals();
  });

  it("honours an explicit base URL", async () => {
    const spy = vi.fn(cannedFetch);
    await makeProvider({ fetchImpl: spy, baseUrl: "https://proxy.test/v1" }).reviewItem({
      itemType: "cloze",
      stem: localised,
      options: [option("a")],
      subSkill: "agreement",
      targetBand: "B",
      lang: "fr",
    });
    expect(spy.mock.calls[0]![0]).toBe("https://proxy.test/v1/chat/completions");
  });

  it("labels an English passage request", async () => {
    const spy = vi.fn(cannedFetch);
    await makeProvider({ fetchImpl: spy }).generatePassage({
      topic: "human-resources",
      docType: "memo",
      targetBand: "B",
      lang: "en",
      count: 1,
    });
    const body = spy.mock.calls[0]![1].body;
    expect(body).toContain("English");
  });
});

const aReview = {
  itemType: "cloze" as const,
  stem: localised,
  options: [option("a"), option("b"), option("c"), option("d")],
  subSkill: "agreement" as const,
  targetBand: "B" as const,
  lang: "fr" as const,
};

describe("openAiProvider — lastUsage is the whole of the last call (D102)", () => {
  const priced = { [MODELS.review]: { inputPerMTok: 1, outputPerMTok: 2 } };

  it("sums a retried call's two completions, as OpenAI bills them", async () => {
    let calls = 0;
    const flaky: FetchLike = () => {
      calls++;
      return Promise.resolve(
        calls === 1
          ? chatResponse({ wrong: "shape" }, { prompt_tokens: 300, completion_tokens: 100 })
          : chatResponse(VERDICT, { prompt_tokens: 400, completion_tokens: 50 }),
      );
    };
    const provider = makeProvider({ fetchImpl: flaky, pricing: priced });
    await provider.reviewItem(aReview);

    const usage = provider.lastUsage();
    expect(usage).toMatchObject({ model: MODELS.review, inputTokens: 700, outputTokens: 150 });
    expect(usage?.costUsd).toBeCloseTo((700 * 1 + 150 * 2) / 1_000_000, 12);
  });

  it("reports the tokens of a call that failed after it was billed", async () => {
    const bad: FetchLike = () =>
      Promise.resolve(chatResponse({ wrong: "shape" }, { prompt_tokens: 200, completion_tokens: 20 }));
    const provider = makeProvider({ fetchImpl: bad });
    await expect(provider.reviewItem(aReview)).rejects.toBeInstanceOf(InvalidResponseError);
    expect(provider.lastUsage()).toMatchObject({ inputTokens: 400, outputTokens: 40 });
  });

  it("bills an answer that had no content, which still cost its tokens", async () => {
    const empty: FetchLike = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ choices: [{ message: {} }], usage: { prompt_tokens: 90, completion_tokens: 0 } }),
        text: () => Promise.resolve(""),
      });
    const provider = makeProvider({ fetchImpl: empty });
    await expect(provider.reviewItem(aReview)).rejects.toBeInstanceOf(InvalidResponseError);
    expect(provider.lastUsage()).toMatchObject({ inputTokens: 90, outputTokens: 0 });
  });

  it("starts each call afresh, so a second call reports only its own tokens", async () => {
    const provider = makeProvider();
    await provider.reviewItem(aReview);
    await provider.reviewItem(aReview);
    expect(provider.lastUsage()).toMatchObject({ inputTokens: 100, outputTokens: 50 });
  });

  it("carries nothing over to a call that failed before it was billed", async () => {
    let calls = 0;
    const thenRefused: FetchLike = () => {
      calls++;
      return Promise.resolve(
        calls === 1
          ? chatResponse(VERDICT)
          : { ok: false, status: 429, json: () => Promise.resolve({}), text: () => Promise.resolve("slow down") },
      );
    };
    const provider = makeProvider({ fetchImpl: thenRefused });
    await provider.reviewItem(aReview);
    await expect(provider.reviewItem(aReview)).rejects.toBeInstanceOf(RateLimitError);
    expect(provider.lastUsage()).toBeNull();
  });

  it("carries nothing over to a key check, which bills nothing", async () => {
    const provider = makeProvider();
    await provider.reviewItem(aReview);
    await provider.verifyKey();
    expect(provider.lastUsage()).toBeNull();
  });
});

describe("openAiProvider — the key check (verifyKey, D99)", () => {
  it("makes one GET to the model list with the bearer key and no body, and records no usage", async () => {
    const spy = vi.fn(cannedFetch);
    const provider = makeProvider({ fetchImpl: spy });

    await expect(provider.verifyKey()).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0]!;
    expect(url).toBe("https://api.openai.com/v1/models");
    expect(init.method).toBe("GET");
    expect(init.headers.authorization).toBe("Bearer sk-test");
    expect(init.body).toBeUndefined();
    expect(provider.lastUsage()).toBeNull();
  });

  const verifyWith = (fetchImpl: FetchLike) => makeProvider({ fetchImpl }).verifyKey();

  it.each([
    [401, InvalidApiKeyError],
    [429, RateLimitError],
    [500, ProviderRequestError],
  ] as const)("translates a %i to our own error", async (status, error) => {
    const refused: FetchLike = () => Promise.resolve(modelsResponse({ error: { code: "x" } }, status));
    await expect(verifyWith(refused)).rejects.toBeInstanceOf(error);
  });

  it("translates a network fault to ProviderUnavailableError", async () => {
    await expect(verifyWith(() => Promise.reject(new TypeError("Failed to fetch")))).rejects.toBeInstanceOf(
      ProviderUnavailableError,
    );
  });

  it("rejects a 200 that is not a model list as InvalidResponseError", async () => {
    await expect(verifyWith(() => Promise.resolve(modelsResponse({ object: "list" })))).rejects.toBeInstanceOf(
      InvalidResponseError,
    );
    await expect(verifyWith(() => Promise.resolve(modelsResponse(null)))).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it("rejects a 200 whose body is not JSON (a captive portal) as InvalidResponseError", async () => {
    const html: FetchLike = () =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError("<html>")), text: () => Promise.resolve("<html>") });
    await expect(verifyWith(html)).rejects.toBeInstanceOf(InvalidResponseError);
  });
});

describe("openAiProvider — time limits (D99)", () => {
  /** A fetch that never answers and ignores the abort, the worst case the race must cover. */
  const hangs = (): { fetchImpl: FetchLike; signals: (AbortSignal | undefined)[] } => {
    const signals: (AbortSignal | undefined)[] = [];
    return {
      signals,
      fetchImpl: (_url, init) => {
        signals.push(init.signal);
        return new Promise(() => undefined);
      },
    };
  };

  it("abandons a key check that outlives its limit as ProviderTimeoutError, and aborts the request", async () => {
    const { fetchImpl, signals } = hangs();
    await expect(makeProvider({ fetchImpl, verifyTimeoutMs: 5 }).verifyKey()).rejects.toBeInstanceOf(
      ProviderTimeoutError,
    );
    expect(signals[0]?.aborted).toBe(true);
  });

  it("abandons a completion that outlives its limit, and never retries it", async () => {
    const { fetchImpl, signals } = hangs();
    const provider = makeProvider({ fetchImpl, timeoutMs: 5, maxRetries: 3 });
    await expect(
      provider.generateItems({
        promptSpec: { itemType: "cloze", targetBand: "B", subSkill: "agreement", instructions: "x" },
        topic: "human-resources",
        lang: "fr",
        count: 1,
      }),
    ).rejects.toBeInstanceOf(ProviderTimeoutError);
    expect(signals).toHaveLength(1);
  });

  it("counts reading the answer inside the limit, not only its headers", async () => {
    const slowBody: FetchLike = () =>
      Promise.resolve({ ok: true, status: 200, json: () => new Promise(() => undefined), text: () => Promise.resolve("") });
    await expect(makeProvider({ fetchImpl: slowBody, verifyTimeoutMs: 5 }).verifyKey()).rejects.toBeInstanceOf(
      ProviderTimeoutError,
    );
  });

  it("clears its timer once the call settles, so nothing fires later", async () => {
    vi.useFakeTimers();
    try {
      await makeProvider().verifyKey();
      expect(vi.getTimerCount()).toBe(0);
      await expect(verifyWithStatus(401)).rejects.toBeInstanceOf(InvalidApiKeyError);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("has a default limit for both kinds of call", async () => {
    vi.useFakeTimers();
    try {
      const { fetchImpl } = hangs();
      const check = makeProvider({ fetchImpl }).verifyKey();
      const settled = expect(check).rejects.toBeInstanceOf(ProviderTimeoutError);
      await vi.advanceTimersByTimeAsync(10_000);
      await settled;

      const completion = makeProvider({ fetchImpl }).reviewItem({
        itemType: "cloze",
        stem: localised,
        options: [option("a")],
        subSkill: "agreement",
        targetBand: "B",
        lang: "fr",
      });
      const late = expect(completion).rejects.toBeInstanceOf(ProviderTimeoutError);
      await vi.advanceTimersByTimeAsync(119_999);
      expect(vi.getTimerCount()).toBe(1);
      await vi.advanceTimersByTimeAsync(1);
      await late;
    } finally {
      vi.useRealTimers();
    }
  });

  const verifyWithStatus = (status: number) =>
    makeProvider({ fetchImpl: () => Promise.resolve(modelsResponse({}, status)) }).verifyKey();
});

describe("openAiProvider — the key never rides out on an error [R12]", () => {
  const SENTINEL = "sk-palier-sentinel-adapter-0123456789";
  const everything = (error: unknown): string => {
    const e = error as Error & { cause?: unknown };
    return [e.message, e.stack ?? "", String(e.cause ?? ""), JSON.stringify(e)].join("\n");
  };
  const failures: [string, FetchLike][] = [
    ["a 401", () => Promise.resolve(modelsResponse({ error: { message: "bad key" } }, 401))],
    ["a 429", () => Promise.resolve(modelsResponse({}, 429))],
    // A proxy that echoes the request back, key and all, in its error body.
    ["a 500 echoing the key", () => Promise.resolve(modelsResponse({ echo: `Bearer ${SENTINEL}` }, 500))],
    ["a network fault", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["a malformed answer", () => Promise.resolve(modelsResponse({ nope: true }))],
    ["a timeout", () => new Promise(() => undefined)],
  ];

  it.each(failures)("keeps the key out of the error for %s", async (_name, fetchImpl) => {
    const error: unknown = await openAiProvider({ apiKey: SENTINEL, models: MODELS, fetchImpl, verifyTimeoutMs: 5 })
      .verifyKey()
      .then(
        () => null,
        (e: unknown) => e,
      );
    expect(error).toBeInstanceOf(Error);
    expect(everything(error)).not.toContain(SENTINEL);
  });

  it("keeps the status and the rest of the body for diagnosis", async () => {
    const echo: FetchLike = () => Promise.resolve(modelsResponse({ echo: `Bearer ${SENTINEL}` }, 500));
    const error = await openAiProvider({ apiKey: SENTINEL, models: MODELS, fetchImpl: echo })
      .verifyKey()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderRequestError);
    expect((error as ProviderRequestError).status).toBe(500);
    expect((error as Error).message).toContain("Bearer [redacted]");
  });
});

describe("openAiProvider — assessWriting (D105)", () => {
  const aRequest = {
    task: "Informez votre équipe du report d'une réunion.",
    wordTarget: 80,
    text: WRITTEN,
    targetBand: "C",
    lang: "fr",
    feedbackLang: "en",
  } as const;

  /** A fetch that answers each completion with the next body, repeating the last. */
  const answers = (...bodies: unknown[]): { fetchImpl: FetchLike; sent: () => string[] } => {
    const sent: string[] = [];
    return {
      sent: () => sent,
      fetchImpl: (_url, init) => {
        sent.push(textOf(init.body));
        const body = bodies.length > 1 ? bodies.shift() : bodies[0];
        return Promise.resolve(chatResponse(body));
      },
    };
  };

  it("places each quoted error at its offsets in the writer's own text", async () => {
    const assessment = await makeProvider().assessWriting(aRequest);
    const start = WRITTEN.indexOf("est reporter");
    expect(assessment.errors).toEqual([
      { start, end: start + "est reporter".length, correction: "est reportée", rule: "Accord du participe passé avec être" },
    ]);
    expect(assessment.criteria.grammar).toEqual(criterion);
    expect(assessment.modelAnswer).toBe(FEEDBACK.modelAnswer);
  });

  it("calls the assess model with the task, the text, the band and both languages", async () => {
    const { fetchImpl, sent } = answers(FEEDBACK);
    await makeProvider({ fetchImpl }).assessWriting(aRequest);
    const body = JSON.parse(sent()[0] ?? "{}") as { model: string; messages: { content: string }[] };
    const user = body.messages[1]?.content ?? "";
    expect(body.model).toBe("m-assess");
    expect(user).toContain(aRequest.task);
    expect(user).toContain(WRITTEN);
    expect(user).toContain("level C");
    expect(user).toContain("evidence and the rules in English");
    expect(user).toContain("model answer in French");
  });

  it("retries an excerpt that is not in the text, then accepts a corrected answer", async () => {
    const miscopied = { ...FEEDBACK, errors: [{ excerpt: "est reportez", correction: "x", rule: "r" }] };
    const { fetchImpl, sent } = answers(miscopied, FEEDBACK);
    const assessment = await makeProvider({ fetchImpl }).assessWriting(aRequest);
    expect(sent()).toHaveLength(2);
    expect(sent()[1]).toContain('\\"est reportez\\" is not in the text');
    expect(assessment.errors).toHaveLength(1);
  });

  it("refuses an excerpt outside the text twice as InvalidResponseError", async () => {
    const miscopied = { ...FEEDBACK, errors: [{ excerpt: "absent", correction: "x", rule: "r" }] };
    await expect(makeProvider({ fetchImpl: answers(miscopied).fetchImpl }).assessWriting(aRequest)).rejects.toThrow(
      InvalidResponseError,
    );
  });

  it("refuses two errors on overlapping words as InvalidResponseError", async () => {
    const overlapping = {
      ...FEEDBACK,
      errors: [
        { excerpt: "lundi est reporter", correction: "x", rule: "r" },
        { excerpt: "est reporter à mardi", correction: "y", rule: "r" },
      ],
    };
    await expect(
      makeProvider({ fetchImpl: answers(overlapping).fetchImpl }).assessWriting(aRequest),
    ).rejects.toThrow(/overlap/u);
  });

  it("refuses an answer in the wrong shape as InvalidResponseError: offsets instead of excerpts", async () => {
    const offsets = { ...FEEDBACK, errors: [{ start: 0, end: 7, correction: "x", rule: "r" }] };
    await expect(makeProvider({ fetchImpl: answers(offsets).fetchImpl }).assessWriting(aRequest)).rejects.toThrow(
      InvalidResponseError,
    );
  });

  it("refuses an answer missing a criterion as InvalidResponseError", async () => {
    const { task: _task, ...four } = FEEDBACK.criteria;
    await expect(
      makeProvider({ fetchImpl: answers({ ...FEEDBACK, criteria: four }).fetchImpl }).assessWriting(aRequest),
    ).rejects.toThrow(InvalidResponseError);
  });

  it("bills both completions of a retried assessment (D102)", async () => {
    const miscopied = { ...FEEDBACK, errors: [{ excerpt: "absent", correction: "x", rule: "r" }] };
    const provider = makeProvider({ fetchImpl: answers(miscopied, FEEDBACK).fetchImpl });
    await provider.assessWriting(aRequest);
    expect(provider.lastUsage()).toMatchObject({ model: "m-assess", inputTokens: 200, outputTokens: 100 });
  });

  const refusing = (status: number): FetchLike => () =>
    Promise.resolve({ ok: false, status, json: () => Promise.resolve({}), text: () => Promise.resolve("no") });

  it("translates 401 to InvalidApiKeyError and 429 to RateLimitError", async () => {
    await expect(makeProvider({ fetchImpl: refusing(401) }).assessWriting(aRequest)).rejects.toBeInstanceOf(
      InvalidApiKeyError,
    );
    await expect(makeProvider({ fetchImpl: refusing(429) }).assessWriting(aRequest)).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  it("abandons an assessment that outlives its limit as ProviderTimeoutError, never retried", async () => {
    let calls = 0;
    const hangs: FetchLike = () => {
      calls++;
      return new Promise(() => undefined);
    };
    await expect(
      makeProvider({ fetchImpl: hangs, timeoutMs: 5, maxRetries: 3 }).assessWriting(aRequest),
    ).rejects.toBeInstanceOf(ProviderTimeoutError);
    expect(calls).toBe(1);
  });

  it("refuses to run with no assess model, before any request and with no usage", async () => {
    const { assess: _assess, ...factoryModels } = MODELS;
    const spy = vi.fn(cannedFetch);
    const provider = makeProvider({ models: factoryModels, fetchImpl: spy });
    await provider.reviewItem(aReview);
    await expect(provider.assessWriting(aRequest)).rejects.toThrow(/models\.assess/u);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(provider.lastUsage()).toBeNull();
  });
});

describe("openAiProvider — assessOral (D122)", () => {
  const aRequest = {
    sessionType: "work",
    targetBand: "C",
    lang: "fr",
    feedbackLang: "en",
    topic: "project-management",
    phases: [
      { name: "Votre projet", intent: "Have the candidate describe a recent project." },
      { name: "Recul", intent: "Push for reflection." },
    ],
    turns: ORAL_TURNS,
    descriptors: { A: "Descriptor A.", B: "Descriptor B.", C: "Descriptor C." },
  } as const;

  const answers = (...bodies: unknown[]): { fetchImpl: FetchLike; sent: () => string[] } => {
    const sent: string[] = [];
    return {
      sent: () => sent,
      fetchImpl: (_url, init) => {
        sent.push(textOf(init.body));
        const body = bodies.length > 1 ? bodies.shift() : bodies[0];
        return Promise.resolve(chatResponse(body));
      },
    };
  };

  it("places each quoted error at its offsets in the candidate's own turn", async () => {
    const report = await makeProvider().assessOral(aRequest);
    const start = SAID.indexOf("était");
    expect(report.errors).toEqual([
      { turn: 1, start, end: start + "était".length, correction: "étaient", rule: "Accord du verbe avec le sujet" },
    ]);
    expect(report.fixes.map((fix) => fix.subSkill)).toEqual([
      "agreement",
      "word-choice-precision",
      "connectors-and-discourse-markers",
    ]);
    expect(report.missingWords).toHaveLength(5);
  });

  it("calls the assess model with the numbered turns, the phases, the descriptors, the band and both languages", async () => {
    const { fetchImpl, sent } = answers(ORAL_REPORT);
    await makeProvider({ fetchImpl }).assessOral(aRequest);
    const body = JSON.parse(sent()[0] ?? "{}") as { model: string; messages: { content: string }[] };
    const user = body.messages[1]?.content ?? "";
    expect(body.model).toBe("m-assess");
    expect(user).toContain(`[1] Candidate: ${SAID}`);
    expect(user).toContain("[0] Examiner: Parlez-moi");
    expect(user).toContain("[3] Candidate (typed): Je aurais");
    expect(user).toContain('"Recul" (Push for reflection.)');
    expect(user).toContain("Level C: Descriptor C.");
    expect(user).toContain("aiming at level C");
    expect(user).toContain("evidence, the advice and the rules in English");
    expect(user).toContain("corrections in French");
    expect(user).toContain('"verb-tense-and-mood"');
    expect(user).toContain('"main-idea"');
    expect(user).not.toContain('"fluency-and-hesitation"');
  });

  it("retries an excerpt that is not in the turn it names, then accepts a corrected answer", async () => {
    const miscopied = { ...ORAL_REPORT, errors: [{ turn: 3, excerpt: "était", correction: "x", rule: "r" }] };
    const { fetchImpl, sent } = answers(miscopied, ORAL_REPORT);
    const report = await makeProvider({ fetchImpl }).assessOral(aRequest);
    expect(sent()).toHaveLength(2);
    expect(sent()[1]).toContain('turn 3, error 0: \\"était\\" is not in the text');
    expect(report.errors).toHaveLength(1);
  });

  it("retries an error on the examiner's turn, which is not the candidate's to correct", async () => {
    const onExaminer = { ...ORAL_REPORT, errors: [{ turn: 0, excerpt: "Parlez", correction: "x", rule: "r" }] };
    const { fetchImpl, sent } = answers(onExaminer, ORAL_REPORT);
    await makeProvider({ fetchImpl }).assessOral(aRequest);
    expect(sent()[1]).toContain("turn 0 is the examiner's");
  });

  it("refuses a fix on an oral sub-skill, twice, as InvalidResponseError", async () => {
    const oralFix = { ...ORAL_REPORT, fixes: [...ORAL_REPORT.fixes.slice(0, 2), { ...ORAL_REPORT.fixes[0], subSkill: "fluency-and-hesitation" }] };
    await expect(makeProvider({ fetchImpl: answers(oralFix).fetchImpl }).assessOral(aRequest)).rejects.toThrow(
      InvalidResponseError,
    );
  });

  it("refuses a missing word quoted from words the candidate never said, twice, as InvalidResponseError", async () => {
    const invented = { ...ORAL_REPORT, missingWords: [aMissingWord("des crédits"), ...ORAL_REPORT.missingWords.slice(1)] };
    await expect(makeProvider({ fetchImpl: answers(invented).fetchImpl }).assessOral(aRequest)).rejects.toThrow(
      /is not in turn 1/u,
    );
  });

  it("bills both completions of a retried report (D102)", async () => {
    const miscopied = { ...ORAL_REPORT, errors: [{ turn: 1, excerpt: "absent", correction: "x", rule: "r" }] };
    const provider = makeProvider({ fetchImpl: answers(miscopied, ORAL_REPORT).fetchImpl });
    await provider.assessOral(aRequest);
    expect(provider.lastUsage()).toMatchObject({ model: "m-assess", inputTokens: 200, outputTokens: 100 });
  });

  it("abandons a report that outlives its limit as ProviderTimeoutError, never retried", async () => {
    let calls = 0;
    const hangs: FetchLike = () => {
      calls++;
      return new Promise(() => undefined);
    };
    await expect(
      makeProvider({ fetchImpl: hangs, timeoutMs: 5, maxRetries: 3 }).assessOral(aRequest),
    ).rejects.toBeInstanceOf(ProviderTimeoutError);
    expect(calls).toBe(1);
  });

  it("translates 401 to InvalidApiKeyError", async () => {
    const refusing: FetchLike = () =>
      Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}), text: () => Promise.resolve("no") });
    await expect(makeProvider({ fetchImpl: refusing }).assessOral(aRequest)).rejects.toBeInstanceOf(InvalidApiKeyError);
  });

  it("refuses to run with no assess model, before any request and with no usage", async () => {
    const { assess: _assess, ...factoryModels } = MODELS;
    const spy = vi.fn(cannedFetch);
    const provider = makeProvider({ models: factoryModels, fetchImpl: spy });
    await provider.reviewItem(aReview);
    await expect(provider.assessOral(aRequest)).rejects.toThrow(/models\.assess/u);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(provider.lastUsage()).toBeNull();
  });
});

describe("openAiProvider — generateScenario (D114)", () => {
  const aRequest = { sessionType: "opinion", targetBand: "C", lang: "fr", topic: "environment", minutes: 10 } as const;

  const answers = (...bodies: unknown[]): { fetchImpl: FetchLike; sent: () => string[] } => {
    const sent: string[] = [];
    return {
      sent: () => sent,
      fetchImpl: (_url, init) => {
        sent.push(textOf(init.body));
        const body = bodies.length > 1 ? bodies.shift() : bodies[0];
        return Promise.resolve(chatResponse(body));
      },
    };
  };

  it("returns the plan, and asks for the session's type, purpose, topic, band and exact minutes", async () => {
    const { fetchImpl, sent } = answers(SCENARIO_PLAN);
    const draft = await makeProvider({ fetchImpl }).generateScenario(aRequest);
    const body = JSON.parse(sent()[0] ?? "{}") as { model: string; messages: { content: string }[] };
    const user = body.messages[1]?.content ?? "";

    expect(draft).toEqual(SCENARIO_PLAN);
    expect(body.model).toBe("m-scenario");
    expect(user).toContain('"opinion"');
    expect(user).toContain("policy trade-offs");
    expect(user).toContain('"environment"');
    expect(user).toContain('band "C"');
    expect(user).toContain("add up to exactly 10");
  });

  it("retries a plan whose phases do not fill the session, then accepts one that does", async () => {
    const short = { phases: [aPhase(3), aPhase(4)] };
    const { fetchImpl, sent } = answers(short, SCENARIO_PLAN);

    expect(await makeProvider({ fetchImpl }).generateScenario(aRequest)).toEqual(SCENARIO_PLAN);
    expect(sent()).toHaveLength(2);
    expect(sent()[1]).toContain("add up to 7 minutes, not 10");
  });

  it("refuses a plan that fails the schema twice as InvalidResponseError", async () => {
    const { fetchImpl } = answers({ phases: [] });

    await expect(makeProvider({ fetchImpl }).generateScenario(aRequest)).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it("refuses to run with no scenario model, before any request and with no usage", async () => {
    const { scenario: _scenario, ...browserModels } = MODELS;
    const spy = vi.fn(cannedFetch);
    const provider = makeProvider({ models: browserModels, fetchImpl: spy });
    await provider.reviewItem(aReview);

    await expect(provider.generateScenario(aRequest)).rejects.toThrow(/models\.scenario/u);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(provider.lastUsage()).toBeNull();
  });
});

describe("openAiProvider — the turn loop's audio and examiner (D117)", () => {
  const clip = () => new Blob(["clip-bytes"], { type: "audio/webm;codecs=opus" });
  const pricing = {
    [MODELS.transcribe]: { perMinute: 0.006 },
    [MODELS.speech]: { perMChars: 15 },
    [MODELS.examiner]: { inputPerMTok: 2, outputPerMTok: 8 },
  };
  const anExaminerRequest = {
    sessionType: "opinion",
    targetBand: "C",
    lang: "fr",
    topic: "environment",
    phase: {
      name: "Enjeux",
      minutes: 4,
      intent: "Probe a policy trade-off.",
      seedQuestions: ["Que pensez-vous du télétravail ?"],
      escalation: ["Et si votre sous-ministre s'y opposait ?"],
      deescalation: [],
    },
    register: "escalate",
    transcript: [
      { speaker: "examiner", text: "Bonjour. Quel est votre poste ?" },
      { speaker: "candidate", text: "Je suis analyste." },
    ],
  } as const;

  describe("transcribe", () => {
    it("uploads the clip once, as multipart, with the model and the language, to the transcription endpoint", async () => {
      const spy = vi.fn(cannedFetch);
      const transcript = await makeProvider({ fetchImpl: spy }).transcribe({ audio: clip(), lang: "fr", durationMs: 4_000 });

      expect(transcript).toEqual({ text: "Je suis analyste." });
      expect(spy).toHaveBeenCalledTimes(1);
      const [url, init] = spy.mock.calls[0]!;
      expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
      expect(init.headers.authorization).toBe("Bearer sk-test");
      // The browser sets the multipart boundary itself, so no content type is sent.
      expect(init.headers["content-type"]).toBeUndefined();
      const form = init.body as FormData;
      expect(form).toBeInstanceOf(FormData);
      expect(form.get("model")).toBe(MODELS.transcribe);
      expect(form.get("language")).toBe("fr");
      expect(form.get("response_format")).toBe("json");
      const file = form.get("file") as File;
      expect(file.name).toBe("answer.webm");
      expect(await file.text()).toBe("clip-bytes");
    });

    it.each([
      ["audio/mp4", "answer.mp4"],
      ["audio/mpeg", "answer.mp3"],
      ["audio/wav", "answer.wav"],
      ["", "answer.webm"],
    ])("names a %s clip %s, since OpenAI reads the format from the extension", async (type, name) => {
      const spy = vi.fn(cannedFetch);
      await makeProvider({ fetchImpl: spy }).transcribe({ audio: new Blob(["x"], { type }), lang: "fr", durationMs: 1 });
      expect(((spy.mock.calls[0]![1].body as FormData).get("file") as File).name).toBe(name);
    });

    it("bills the seconds the response reports by duration, priced by the minute", async () => {
      const provider = makeProvider({ pricing });
      await provider.transcribe({ audio: clip(), lang: "fr", durationMs: 9_999 });
      expect(provider.lastUsage()).toMatchObject({ model: MODELS.transcribe, inputTokens: 0, outputTokens: 0, audioSeconds: 3 });
      expect(provider.lastUsage()?.costUsd).toBeCloseTo(0.0003, 15);
    });

    it("bills the recorder's measured length when the response reports tokens, keeping the tokens", async () => {
      const fetchImpl: FetchLike = () =>
        Promise.resolve(
          transcriptionResponse({ text: "Oui.", usage: { type: "tokens", input_tokens: 120, output_tokens: 4 } }),
        );
      const provider = makeProvider({ fetchImpl, pricing });
      await provider.transcribe({ audio: clip(), lang: "fr", durationMs: 30_000 });
      expect(provider.lastUsage()).toMatchObject({ inputTokens: 120, outputTokens: 4, audioSeconds: 30 });
      expect(provider.lastUsage()?.costUsd).toBeCloseTo(0.003, 12);
    });

    it("bills the measured length when the response reports no usage at all, and is unpriced without a price", async () => {
      const fetchImpl: FetchLike = () => Promise.resolve(transcriptionResponse({ text: "" }));
      const provider = makeProvider({ fetchImpl });
      expect(await provider.transcribe({ audio: clip(), lang: "fr", durationMs: 2_500 })).toEqual({ text: "" });
      expect(provider.lastUsage()).toEqual({ model: MODELS.transcribe, inputTokens: 0, outputTokens: 0, audioSeconds: 2.5 });
    });

    it("refuses an answer with no text as InvalidResponseError, still billing the audio sent", async () => {
      const fetchImpl: FetchLike = () => Promise.resolve(transcriptionResponse({ transcript: "Oui." }));
      const provider = makeProvider({ fetchImpl, pricing });
      await expect(provider.transcribe({ audio: clip(), lang: "fr", durationMs: 60_000 })).rejects.toBeInstanceOf(
        InvalidResponseError,
      );
      expect(provider.lastUsage()?.costUsd).toBeCloseTo(0.006, 12);
    });

    it("refuses a 200 that is not JSON as InvalidResponseError, still billing the clip it accepted (D121)", async () => {
      const fetchImpl: FetchLike = () =>
        Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError("x")), text: () => Promise.resolve("<html>") });
      const provider = makeProvider({ fetchImpl, pricing });
      await expect(provider.transcribe({ audio: clip(), lang: "fr", durationMs: 60_000 })).rejects.toBeInstanceOf(
        InvalidResponseError,
      );
      expect(provider.lastUsage()).toMatchObject({ model: MODELS.transcribe, audioSeconds: 60 });
      expect(provider.lastUsage()?.costUsd).toBeCloseTo(0.006, 12);
    });

    it("reads as unpriced, never free, when a token-priced model reports no tokens (D121)", async () => {
      const fetchImpl: FetchLike = () => Promise.resolve(transcriptionResponse({ text: "Oui.", usage: { type: "duration", seconds: 2 } }));
      const provider = makeProvider({ fetchImpl, pricing: { [MODELS.transcribe]: { inputPerMTok: 2.5, outputPerMTok: 10 } } });
      await provider.transcribe({ audio: clip(), lang: "fr", durationMs: 2_000 });
      expect(provider.lastUsage()).toEqual({ model: MODELS.transcribe, inputTokens: 0, outputTokens: 0, audioSeconds: 2 });
    });

    it("translates 401 and 429, and never retries a failed upload", async () => {
      for (const [status, error] of [
        [401, InvalidApiKeyError],
        [429, RateLimitError],
      ] as const) {
        const spy = vi.fn<FetchLike>(() => Promise.resolve(modelsResponse({ error: "no" }, status)));
        await expect(makeProvider({ fetchImpl: spy }).transcribe({ audio: clip(), lang: "fr", durationMs: 1 })).rejects.toBeInstanceOf(
          error,
        );
        expect(spy).toHaveBeenCalledTimes(1);
      }
    });

    it("refuses to run with no transcription model, before any request and with no usage", async () => {
      const { transcribe: _t, ...factoryModels } = MODELS;
      const spy = vi.fn(cannedFetch);
      const provider = makeProvider({ models: factoryModels, fetchImpl: spy });
      await provider.examinerTurn(anExaminerRequest);

      expect(provider.capabilities().transcribe).toBe(false);
      await expect(provider.transcribe({ audio: clip(), lang: "fr", durationMs: 1 })).rejects.toThrow(/models\.transcribe/u);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(provider.lastUsage()).toBeNull();
    });
  });

  describe("speak", () => {
    it("posts the words, the model, the voice and the format as JSON, and returns the audio", async () => {
      const spy = vi.fn(cannedFetch);
      const audio = await makeProvider({ fetchImpl: spy, voice: "sage" }).speak({ text: "Bonjour.", lang: "fr" });

      expect(audio.type).toBe("audio/mpeg");
      expect(await audio.text()).toBe("ID3-audio");
      const [url, init] = spy.mock.calls[0]!;
      expect(url).toBe("https://api.openai.com/v1/audio/speech");
      expect(init.headers["content-type"]).toBe("application/json");
      expect(JSON.parse(textOf(init.body))).toEqual({ model: MODELS.speech, input: "Bonjour.", voice: "sage", response_format: "mp3" });
    });

    it("voices with a default when no voice is configured", async () => {
      const spy = vi.fn(cannedFetch);
      await makeProvider({ fetchImpl: spy }).speak({ text: "Bonjour.", lang: "fr" });
      expect((JSON.parse(textOf(spy.mock.calls[0]![1].body)) as { voice: string }).voice).toBe("alloy");
    });

    it("bills the characters sent, priced per million, since the answer carries no usage", async () => {
      const provider = makeProvider({ pricing });
      const text = "Parlez-moi de votre poste.";
      await provider.speak({ text, lang: "fr" });
      expect(provider.lastUsage()).toMatchObject({ model: MODELS.speech, inputTokens: 0, outputTokens: 0, characters: text.length });
      expect(provider.lastUsage()?.costUsd).toBeCloseTo((text.length / 1_000_000) * 15, 15);
    });

    it.each([
      ["a JSON body", () => speechResponse("application/json")],
      ["no content type", () => ({ ...speechResponse(), headers: { get: () => null } })],
      [
        "no way to read a blob",
        () => {
          const { blob: _blob, ...rest } = speechResponse();
          return rest;
        },
      ],
      ["an empty body", () => speechResponse("audio/mpeg", "")],
    ])("refuses %s as InvalidResponseError, billing the words sent", async (_name, answer) => {
      const fetchImpl: FetchLike = () => Promise.resolve(answer());
      const provider = makeProvider({ fetchImpl, pricing });
      await expect(provider.speak({ text: "Bonjour.", lang: "fr" })).rejects.toBeInstanceOf(InvalidResponseError);
      expect(provider.lastUsage()?.characters).toBe(8);
    });

    it("reads a token-priced voice as unpriced, never free, since the answer reports no tokens (D121)", async () => {
      const provider = makeProvider({ pricing: { [MODELS.speech]: { inputPerMTok: 0.6, outputPerMTok: 12 } } });
      await provider.speak({ text: "Bonjour.", lang: "fr" });
      expect(provider.lastUsage()).toEqual({ model: MODELS.speech, inputTokens: 0, outputTokens: 0, characters: 8 });
    });

    it("translates 401, before billing anything", async () => {
      const fetchImpl: FetchLike = () => Promise.resolve(modelsResponse({ error: "no" }, 401));
      const provider = makeProvider({ fetchImpl });
      await expect(provider.speak({ text: "Bonjour.", lang: "fr" })).rejects.toBeInstanceOf(InvalidApiKeyError);
      expect(provider.lastUsage()).toBeNull();
    });

    it("refuses to run with no speech model, before any request and with no usage", async () => {
      const { speech: _s, ...factoryModels } = MODELS;
      const spy = vi.fn(cannedFetch);
      const provider = makeProvider({ models: factoryModels, fetchImpl: spy });

      expect(provider.capabilities().speak).toBe(false);
      await expect(provider.speak({ text: "Bonjour.", lang: "fr" })).rejects.toThrow(/models\.speech/u);
      expect(spy).not.toHaveBeenCalled();
      expect(provider.lastUsage()).toBeNull();
    });
  });

  describe("examinerTurn", () => {
    const answers = (...bodies: unknown[]): { fetchImpl: FetchLike; sent: () => string[] } => {
      const sent: string[] = [];
      return {
        sent: () => sent,
        fetchImpl: (_url, init) => {
          sent.push(textOf(init.body));
          const body = bodies.length > 1 ? bodies.shift() : bodies[0];
          return Promise.resolve(chatResponse(body));
        },
      };
    };

    it("asks the examiner model with the persona, the phase, the register and the conversation so far", async () => {
      const { fetchImpl, sent } = answers(EXAMINER_TURN);
      const turn = await makeProvider({ fetchImpl }).examinerTurn(anExaminerRequest);
      const body = JSON.parse(sent()[0] ?? "{}") as { model: string; messages: { content: string }[] };
      const [system, user] = [body.messages[0]?.content ?? "", body.messages[1]?.content ?? ""];

      expect(turn).toEqual({ text: "Parlez-moi d'un projet récent.", difficulty: null });
      expect(body.model).toBe(MODELS.examiner);
      expect(system).toContain("conducted entirely in French");
      expect(system).toContain("never coach, never correct");
      expect(user).toContain('Current phase: "Enjeux"');
      expect(user).toContain("Probe a policy trade-off.");
      expect(user).toContain("Et si votre sous-ministre s'y opposait ?");
      expect(user).toContain("The candidate is coping: ask a harder follow-up");
      expect(user).toContain("Candidate: Je suis analyste.");
    });

    it("opens the session with a greeting when nothing has been said yet", async () => {
      const { fetchImpl, sent } = answers(EXAMINER_TURN);
      await makeProvider({ fetchImpl }).examinerTurn({ ...anExaminerRequest, register: "baseline", transcript: [] });
      const user = (JSON.parse(sent()[0] ?? "{}") as { messages: { content: string }[] }).messages[1]?.content ?? "";
      expect(user).toContain("The session is just starting");
      expect(user).toContain("Ask from the phase's seed questions");
    });

    it("asks for a simpler reframe when the client de-escalates", async () => {
      const { fetchImpl, sent } = answers(EXAMINER_TURN);
      await makeProvider({ fetchImpl }).examinerTurn({ ...anExaminerRequest, register: "deescalate" });
      expect(sent()[0]).toContain("The candidate is struggling: ask a simpler reframe");
    });

    it("returns the difficulty flag the model gave", async () => {
      const { fetchImpl } = answers({ text: "Pourquoi ?", difficulty: "escalate" });
      expect(await makeProvider({ fetchImpl }).examinerTurn(anExaminerRequest)).toEqual({ text: "Pourquoi ?", difficulty: "escalate" });
    });

    it("retries a malformed turn once, then refuses it as InvalidResponseError, billing both", async () => {
      const { fetchImpl, sent } = answers({ question: "Pourquoi ?" });
      const provider = makeProvider({ fetchImpl, pricing });
      await expect(provider.examinerTurn(anExaminerRequest)).rejects.toBeInstanceOf(InvalidResponseError);
      expect(sent()).toHaveLength(2);
      expect(provider.lastUsage()).toMatchObject({ inputTokens: 200, outputTokens: 100 });
    });

    it("refuses to run with no examiner model, before any request and with no usage", async () => {
      const { examiner: _e, ...factoryModels } = MODELS;
      const spy = vi.fn(cannedFetch);
      const provider = makeProvider({ models: factoryModels, fetchImpl: spy });

      expect(provider.capabilities().examinerTurn).toBe(false);
      await expect(provider.examinerTurn(anExaminerRequest)).rejects.toThrow(/models\.examiner/u);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
