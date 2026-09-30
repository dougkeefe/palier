import { withAiProvider } from "@palier/app";
import type { ReviewRequest } from "@palier/domain";
import { type OpenAiCompletion, mswServer, openAiHandlers } from "@palier/testing";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import aiModels from "./ai-models.json";
import { type Container, createContainer } from "./container";
import { PRICING } from "./pricing";

/**
 * Spend, through the real wiring (Phase 4 Slice 2, progress.md D101–D104): a call made by
 * `withAiProvider` over the container's own ports goes through the real OpenAI adapter,
 * priced from `pricing.json`, into the real cost ledger, and out through the meter. OpenAI
 * is MSW with a `usage` block, as a real answer carries (implementation-plan.md §6.2 tier 4).
 */

vi.mock("../server/db", () => ({ syncApi: () => Promise.resolve(null) }));

const KEY = "sk-palier-spend-test-1b2c";

const aReview: ReviewRequest = {
  itemType: "cloze",
  stem: { en: "The ___ agree.", fr: "Les ___ s'accordent." },
  options: [
    { id: "a", text: "verbes" },
    { id: "b", text: "verbe" },
    { id: "c", text: "verber" },
    { id: "d", text: "verbez" },
  ],
  subSkill: "agreement",
  targetBand: "B",
  lang: "fr",
};

const VERDICT = {
  chosenKey: "a",
  confidence: 0.9,
  defensibleDistractors: [],
  optionCases: { a: "a", b: "b", c: "c", d: "d" },
  registerFlag: { flagged: false },
  estimatedBand: "B",
};

const answer = (content: unknown, prompt_tokens: number, completion_tokens: number): OpenAiCompletion => ({
  content,
  usage: { prompt_tokens, completion_tokens },
});

/** One review, as a spending feature would make it: through `withAiProvider`, never around it. */
const review = (c: Container) =>
  withAiProvider({ vault: c.vault, aiProvider: c.aiProvider, ledger: c.costLedger, clock: c.clock }, "item-generation", (ai) =>
    ai.reviewItem(aReview),
  );

const reviewPrice = (input: number, output: number): number => {
  const price = PRICING.prices[aiModels.review];
  if (price === undefined || !("inputPerMTok" in price)) throw new Error("the review model is priced by the token");
  return (input / 1_000_000) * price.inputPerMTok + (output / 1_000_000) * price.outputPerMTok;
};

beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: "error" });
});
afterEach(async () => {
  mswServer.resetHandlers();
  // Every production container shares the one IndexedDB database, so leave it empty.
  await createContainer({ hermetic: false }).useCases.wipeData();
});
afterAll(() => {
  mswServer.close();
});

describe.each([
  ["hermetic", true],
  ["production", false],
] as const)("spend through the %s graph", (_, hermetic) => {
  it("records a call priced from pricing.json, and the meter shows it this session, week and month", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: [answer(VERDICT, 1_200, 300)] }));
    const c = createContainer({ hermetic });
    await c.useCases.saveApiKey({ key: KEY, remember: true });

    await review(c);

    const expected = reviewPrice(1_200, 300);
    const [entry, ...rest] = await c.costLedger.since("1970-01-01T00:00:00.000Z");
    expect(rest).toEqual([]);
    expect(entry).toMatchObject({ feature: "item-generation", model: aiModels.review, inputTokens: 1_200, outputTokens: 300 });
    expect(entry?.costUsd).toBeCloseTo(expected, 12);

    const summary = await c.useCases.spendSummary();
    expect(summary.totals.session).toBeCloseTo(expected, 12);
    expect(summary.totals.week).toBeCloseTo(expected, 12);
    expect(summary.totals.month).toBeCloseTo(expected, 12);
    expect(summary.totals.unpriced).toBe(0);
  });

  it("bills a retried call twice, as OpenAI does", async () => {
    mswServer.use(
      ...openAiHandlers({ mode: "ok", completions: [answer({ wrong: "shape" }, 1_000, 100), answer(VERDICT, 1_100, 200)] }),
    );
    const c = createContainer({ hermetic });
    await c.useCases.saveApiKey({ key: KEY, remember: true });

    await review(c);

    expect((await c.useCases.spendSummary()).totals.month).toBeCloseTo(reviewPrice(2_100, 300), 12);
  });

  it("records a call that failed after it was billed: an answer with no content, which is not retried", async () => {
    mswServer.use(...openAiHandlers({ mode: "malformed", completions: [answer({}, 800, 0)] }));
    const c = createContainer({ hermetic });
    await c.useCases.saveApiKey({ key: KEY, remember: true });

    await expect(review(c)).rejects.toMatchObject({ name: "InvalidResponseError" });

    expect((await c.useCases.spendSummary()).totals.month).toBeCloseTo(reviewPrice(800, 0), 12);
  });

  it("records nothing for the key check, which spends nothing", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok" }));
    const c = createContainer({ hermetic });
    await c.useCases.saveApiKey({ key: KEY, remember: true });

    await c.useCases.checkApiKey();

    expect(await c.costLedger.since("1970-01-01T00:00:00.000Z")).toEqual([]);
  });

  it("warns near the cap and past it, from the month's recorded spend", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: [answer(VERDICT, 1_000_000, 0)] }));
    const c = createContainer({ hermetic });
    await c.useCases.saveApiKey({ key: KEY, remember: true });
    const spent = reviewPrice(1_000_000, 0);
    await review(c);

    await c.useCases.setSpendCap({ capUsd: spent / 0.9 });
    expect(await c.useCases.spendSummary()).toMatchObject({ cap: "near" });
    expect(await c.useCases.preflightSpend({ feature: "item-generation" })).toMatchObject({ before: "near" });

    await c.useCases.setSpendCap({ capUsd: spent });
    expect(await c.useCases.spendSummary()).toMatchObject({ capUsd: spent, cap: "over" });
  });

  it("empties the ledger on a wipe and on delete-everywhere", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: [answer(VERDICT, 10, 10)] }));
    const c = createContainer({ hermetic });
    await c.useCases.saveApiKey({ key: KEY, remember: true });
    await review(c);
    await c.useCases.wipeData();
    expect(await c.costLedger.since("1970-01-01T00:00:00.000Z")).toEqual([]);

    await c.useCases.saveApiKey({ key: KEY, remember: true });
    await review(c);
    await c.useCases.deleteEverywhere();
    expect(await c.costLedger.since("1970-01-01T00:00:00.000Z")).toEqual([]);
  });

  it("never exports the ledger, while the cap, a setting, goes with the rest (D104)", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: [answer(VERDICT, 10, 10)] }));
    const c = createContainer({ hermetic });
    await c.useCases.saveApiKey({ key: KEY, remember: true });
    await review(c);
    await c.useCases.setSpendCap({ capUsd: 7 });

    const exported = JSON.stringify(await c.useCases.exportData());

    expect(exported).not.toContain("item-generation");
    expect(exported).not.toContain("inputTokens");
    expect((await c.useCases.exportData()).settings).toEqual([{ key: "spendCap", value: 7 }]);
  });
});

describe("the per-feature table", () => {
  it("prices a typical use of every feature from pricing.json", () => {
    const costs = createContainer({ hermetic: true }).useCases.featureCosts();
    expect(costs.map((cost) => cost.feature)).toEqual(["writing-feedback", "item-generation", "oral-practice", "oral-assessment", "oral-studio"]);
    for (const cost of costs) expect(cost.estimateUsd).toBeGreaterThan(0);
  });
});
