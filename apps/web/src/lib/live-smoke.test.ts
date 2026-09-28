import type { FetchLike } from "@palier/adapters/openai";
import { draftsFor, verdictFor } from "@palier/testing";
import writingPromptLibrary from "@palier/content/writing/prompts.json";
import { parseWritingPromptsOrThrow } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { main, measuredFeatures, recordings } from "../../scripts/live-smoke.mjs";
import aiModels from "./ai-models.json";
import { LIVE_SMOKE_REVIEWS, runLiveSmoke } from "./live-smoke";
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

const criterion = { band: "B", evidence: "e" };
const FEEDBACK = {
  criteria: { register: criterion, structure: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
  errors: [],
  modelAnswer: "Une réponse modèle.",
};

type Options = { listed?: readonly string[]; malformedFirstReview?: boolean; status?: number; htmlError?: boolean };

/** A network that answers like OpenAI, recording each request's headers and body. */
const network = ({
  listed = [...Object.values(MODELS), ...Object.values(ORAL)],
  malformedFirstReview = false,
  status = 200,
  htmlError = false,
}: Options = {}) => {
  const requests: { url: string; headers: Record<string, string>; body: string | FormData }[] = [];
  let reviews = 0;
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
          : FEEDBACK;
    return Promise.resolve(reply(200, { id: "chatcmpl-x", choices: [{ message: { content: JSON.stringify(content) } }], usage: { prompt_tokens: 300, completion_tokens: 500 } }));
  };
  return { fetchImpl, requests };
};

const run = (fetchImpl: FetchLike) =>
  runLiveSmoke({ apiKey: KEY, models: MODELS, prices: PRICING.prices, prompts: PROMPTS, fetchImpl });

describe("runLiveSmoke", () => {
  it("checks the key, drafts one set per sentence-level type, reviews one set's worth, and assesses two texts", async () => {
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
    });
    expect(result.byFeature["item-generation"].calls).toBe(3 + LIVE_SMOKE_REVIEWS);
    expect(result.byFeature["writing-feedback"].calls).toBe(2);
    expect(result.byFeature["item-generation"].costUsd).toBeGreaterThan(0);
    expect(result.missingModels).toEqual([]);
  });

  it("keeps every completion with the request it answered, each accepted on the first try", async () => {
    const result = await run(network().fetchImpl);

    expect(result.completions).toHaveLength(3 + LIVE_SMOKE_REVIEWS + 2);
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
    runLiveSmoke({ apiKey: KEY, models: { ...MODELS, ...ORAL }, voice: "sage", prices: PRICING.prices, prompts: PROMPTS, fetchImpl });

  it("voices a question, transcribes that same audio, and asks the examiner twice, all metered as oral practice", async () => {
    const { fetchImpl, requests } = network();
    const result = await runOral(fetchImpl);

    expect(requests.filter((r) => r.url.endsWith("/audio/speech"))).toHaveLength(1);
    expect(requests.filter((r) => r.url.endsWith("/audio/transcriptions"))).toHaveLength(1);
    const upload = requests.find((r) => r.body instanceof FormData)?.body as FormData;
    expect(await (upload.get("file") as File).text()).toBe("ID3-voiced");
    expect(JSON.parse(requests.find((r) => r.url.endsWith("/audio/speech"))?.body as string)).toMatchObject({ voice: "sage" });
    expect(result.byMethod.examinerTurn).toEqual({ calls: 2, inputTokens: 300, outputTokens: 500 });
    expect(result.byMethod.speak.calls).toBe(1);
    expect(result.byMethod.transcribe.calls).toBe(1);
    expect(result.byFeature["oral-practice"].calls).toBe(4);
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
    expect(turns.map((t) => (t.request as { register: string }).register)).toEqual(["baseline", "escalate"]);
    expect(turns.every((t) => t.conformant)).toBe(true);
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
    expect(printed).not.toContain(KEY);
    expect(c.files.size).toBe(0);
  });

  it("records one fixture file per method with --record", async () => {
    const c = capture();
    await main({ argv: ["--record"], env: { OPENAI_API_KEY: KEY }, fetchImpl: network().fetchImpl, ...c.io });

    expect([...c.files.keys()].sort()).toEqual([
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

    expect(c.files.size).toBe(6);
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
  it("prices a set as one draft call and one set's worth of reviews, and feedback as one call", () => {
    const byMethod = {
      generateItems: { calls: 3, inputTokens: 400, outputTokens: 1_200 },
      reviewItem: { calls: 5, inputTokens: 300, outputTokens: 600 },
      assessWriting: { calls: 2, inputTokens: 900, outputTokens: 800 },
    };
    expect(measuredFeatures({ byMethod })).toEqual({
      "writing-feedback": [{ role: "assess", inputTokens: 900, outputTokens: 800 }],
      "item-generation": [
        { role: "draft", inputTokens: 400, outputTokens: 1_200 },
        { role: "review", inputTokens: 1_500, outputTokens: 3_000 },
      ],
    });
  });
});
