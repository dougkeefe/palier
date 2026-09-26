import { describe, expect, it, vi } from "vitest";

import { aiProviderContract } from "@palier/testing";

import { openAiProvider } from "./openai-provider.js";
import type { FetchLike, OpenAiProviderConfig } from "./openai-provider.js";
import {
  InvalidApiKeyError,
  InvalidResponseError,
  ProviderRequestError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  RateLimitError,
} from "./errors.js";

const MODELS = { passage: "m-passage", draft: "m-draft", review: "m-review" } as const;

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

/** Routes each call to the right envelope by the model in the request body, or to the model list. */
const cannedFetch: FetchLike = (url, init) => {
  if (url.endsWith("/models")) return Promise.resolve(modelsResponse());
  const model = (JSON.parse(init.body ?? "{}") as { model: string }).model;
  if (model === MODELS.passage) return Promise.resolve(chatResponse(PASSAGE_ENVELOPE));
  if (model === MODELS.draft) return Promise.resolve(chatResponse(ITEM_ENVELOPE));
  return Promise.resolve(chatResponse(VERDICT));
};

const makeProvider = (over: Partial<OpenAiProviderConfig> = {}) =>
  openAiProvider({ apiKey: "sk-test", models: MODELS, fetchImpl: cannedFetch, ...over });

// The port contract, against the real adapter driven by canned responses.
aiProviderContract("openai", () => Promise.resolve(makeProvider()));

describe("openAiProvider", () => {
  it("reports every Phase-1 capability", () => {
    expect(makeProvider().capabilities()).toEqual({
      generatePassage: true,
      generateItems: true,
      reviewItem: true,
    });
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
    expect((JSON.parse(init.body ?? "{}") as { model: string }).model).toBe(MODELS.draft);
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
