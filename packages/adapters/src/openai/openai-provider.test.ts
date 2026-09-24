import { describe, expect, it, vi } from "vitest";

import { aiProviderContract } from "@palier/testing";

import { openAiProvider } from "./openai-provider.js";
import type { FetchLike, OpenAiProviderConfig } from "./openai-provider.js";
import {
  InvalidApiKeyError,
  InvalidResponseError,
  ProviderRequestError,
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

/** Routes each call to the right envelope by the model in the request body. */
const cannedFetch: FetchLike = (_url, init) => {
  const model = (JSON.parse(init.body) as { model: string }).model;
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
    expect((JSON.parse(init.body) as { model: string }).model).toBe(MODELS.draft);
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
