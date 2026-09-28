import { type OpenAiCompletion, mswServer, openAiHandlers } from "@palier/testing";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { main } from "../../scripts/billing-check.mjs";
import aiModels from "./ai-models.json";
import { BILLING_CHECK_DRAFTS, BILLING_CHECK_REVIEWS, runBillingCheck } from "./billing-check";
import { PRICING } from "./pricing";

/**
 * Gate G's tooling, over MSW (progress.md D103). The real run is the human's, on a funded
 * key; this proves the check drives the real adapter and ledger, prices every call, and adds
 * a retried call's tokens in, since OpenAI bills them.
 */

const VERDICT = {
  chosenKey: "a",
  confidence: 0.9,
  defensibleDistractors: [],
  optionCases: { a: "a", b: "b", c: "c", d: "d" },
  registerFlag: { flagged: false },
  estimatedBand: "C",
};

const localised = { en: "en", fr: "fr" };
const option = (id: "a" | "b" | "c" | "d") => ({ id, text: `opt ${id}`, rationale: localised });
const ITEMS = {
  items: [
    {
      type: "cloze",
      stem: localised,
      blankIndex: 0,
      options: [option("a"), option("b"), option("c"), option("d")],
      key: "a",
      explanation: localised,
      subSkill: "agreement",
      targetBand: "C",
      topic: "human-resources",
    },
  ],
};

const answer = (content: unknown, prompt_tokens: number, completion_tokens: number): OpenAiCompletion => ({
  content,
  usage: { prompt_tokens, completion_tokens },
});

const script = [
  answer(VERDICT, 1_000, 200),
  answer({ wrong: "shape" }, 1_000, 50), // the second review is retried once…
  answer(VERDICT, 1_050, 200), // …and both of its completions are billed
  answer(VERDICT, 1_000, 200),
  answer(ITEMS, 2_000, 1_500),
  answer(ITEMS, 2_000, 1_500),
];

const priceOf = (model: string, input: number, output: number) => {
  const price = PRICING.prices[model];
  if (price === undefined || !("inputPerMTok" in price)) throw new Error(`${model} is priced by the token`);
  return (input / 1e6) * price.inputPerMTok + (output / 1e6) * price.outputPerMTok;
};

const models = { passage: aiModels.passage, draft: aiModels.draft, review: aiModels.review };

beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  mswServer.resetHandlers();
});
afterAll(() => {
  mswServer.close();
});

describe("runBillingCheck", () => {
  it("makes its fixed calls through the adapter and the ledger, and the meter totals every billed token", async () => {
    const seen: (string | null)[] = [];
    mswServer.use(...openAiHandlers({ mode: "ok", completions: script, onAuthorization: (a) => seen.push(a) }));

    const result = await runBillingCheck({ apiKey: "sk-funded-test", models, prices: PRICING.prices });

    expect(result.calls).toHaveLength(BILLING_CHECK_REVIEWS + BILLING_CHECK_DRAFTS);
    expect(seen).toHaveLength(script.length);
    expect(seen.every((a) => a === "Bearer sk-funded-test")).toBe(true);
    expect(result.inputTokens).toBe(8_050);
    expect(result.outputTokens).toBe(3_650);
    const expected =
      priceOf(aiModels.review, 4_050, 650) + priceOf(aiModels.draft, 4_000, 3_000);
    expect(result.meterUsd).toBeCloseTo(expected, 12);
    expect(result.calls.every((call) => call.costUsd !== null)).toBe(true);
    expect(Date.parse(result.endedAt)).toBeGreaterThanOrEqual(Date.parse(result.startedAt));
  });

  it("stops at the first failure rather than report a partial total", async () => {
    mswServer.use(...openAiHandlers({ mode: "invalid-key" }));
    await expect(runBillingCheck({ apiKey: "sk-bad", models, prices: PRICING.prices })).rejects.toMatchObject({
      name: "InvalidApiKeyError",
    });
  });
});

describe("billing-check.mjs", () => {
  it("refuses to run without OPENAI_API_KEY, and says what Gate G needs", async () => {
    const errors: string[] = [];
    expect(await main({ env: {}, log: () => undefined, error: (line: string) => errors.push(line) })).toBe(1);
    expect(errors.join("\n")).toContain("OPENAI_API_KEY is not set");
  });

  it("prints each call, the totals and the window, and never the key", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: script }));
    const lines: string[] = [];
    const code = await main({
      env: { OPENAI_API_KEY: " sk-funded-secret-9d8c " },
      log: (line: string) => lines.push(line),
      error: (line: string) => lines.push(line),
    });

    expect(code).toBe(0);
    const out = lines.join("\n");
    expect(out).toContain("calls: 5  input tokens: 8050  output tokens: 3650");
    expect(out).toMatch(/the meter says: US\$\d+\.\d{6} this month/);
    expect(out).toMatch(/window \(UTC\): \S+Z to \S+Z/);
    expect(out).not.toContain("sk-funded-secret");
  });
});
