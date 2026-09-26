import { type CostEntry, spendSummary, withAiProvider } from "@palier/app";
import { openAiProvider } from "@palier/adapters/openai";
import type { GenerateItemsRequest, ModelPrice, ReviewRequest } from "@palier/domain";
import { memoryCostLedger, memoryKeyVault, memorySettingsStore } from "@palier/testing/in-memory";

/**
 * Gate G's billing check (Phase 4 exit criterion 3, progress.md D97, D103): a fixed handful
 * of real calls on a funded key, through the same path the browser takes — the real OpenAI
 * adapter priced from `pricing.json`, made inside the vault's callback by `withAiProvider`,
 * written to a cost ledger — and then the meter's own total, to set beside OpenAI's usage
 * page for the same minutes.
 *
 * Self-contained, with no relative import, so `scripts/billing-check.mjs` can run it under
 * Node's type stripping (the `item-statistics-job.ts` rule). The calls are fixed, so every
 * run spends about the same, a few cents at the configured models.
 */

export type BillingCheckDeps = {
  readonly apiKey: string;
  /** The role → model map, `ai-models.json` less its note. */
  readonly models: { readonly passage: string; readonly draft: string; readonly review: string };
  readonly prices: Readonly<Record<string, ModelPrice>>;
  readonly now?: () => string;
};

export type BillingCheckResult = {
  readonly startedAt: string;
  readonly endedAt: string;
  readonly calls: readonly CostEntry[];
  /** What the meter reads for this month, from the ledger these calls wrote. */
  readonly meterUsd: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
};

/** Three reviews and two drafts: the two call shapes the browser will make first. */
export const BILLING_CHECK_REVIEWS = 3;
export const BILLING_CHECK_DRAFTS = 2;

const aReview = (n: number): ReviewRequest => ({
  itemType: "cloze",
  stem: {
    en: `The directors ___ the report before the meeting (${String(n)}).`,
    fr: `Les directeurs ___ le rapport avant la réunion (${String(n)}).`,
  },
  options: [
    { id: "a", text: "ont approuvé" },
    { id: "b", text: "a approuvé" },
    { id: "c", text: "ont approuvés" },
    { id: "d", text: "avons approuvé" },
  ],
  subSkill: "agreement",
  targetBand: "C",
  lang: "fr",
});

const aDraft: GenerateItemsRequest = {
  promptSpec: {
    itemType: "cloze",
    targetBand: "C",
    subSkill: "agreement",
    instructions: "Draft one cloze item testing subject-verb agreement in a workplace memo.",
  },
  topic: "human-resources",
  lang: "fr",
  count: 1,
};

export const runBillingCheck = async (deps: BillingCheckDeps): Promise<BillingCheckResult> => {
  const now = deps.now ?? (() => new Date().toISOString());
  const vault = memoryKeyVault();
  await vault.putApiKey(deps.apiKey, { remember: false });
  const ledger = memoryCostLedger();
  const clock = { now };
  const startedAt = now();
  const ai = {
    vault,
    ledger,
    clock,
    aiProvider: (apiKey: string) => openAiProvider({ apiKey, models: deps.models, pricing: deps.prices }),
  };

  // One call at a time, as withAiProvider requires (D101). A failure stops the check: a
  // partial total would be compared with a usage page that saw every call.
  for (let n = 1; n <= BILLING_CHECK_REVIEWS; n++) {
    await withAiProvider(ai, "item-generation", (provider) => provider.reviewItem(aReview(n)));
  }
  for (let n = 1; n <= BILLING_CHECK_DRAFTS; n++) {
    await withAiProvider(ai, "item-generation", (provider) => provider.generateItems(aDraft));
  }

  const calls = await ledger.since(startedAt);
  const summary = await spendSummary({ ledger, settings: memorySettingsStore(), clock, sessionStart: startedAt });
  return {
    startedAt,
    endedAt: now(),
    calls,
    meterUsd: summary.totals.month,
    inputTokens: calls.reduce((sum, call) => sum + call.inputTokens, 0),
    outputTokens: calls.reduce((sum, call) => sum + call.outputTokens, 0),
  };
};
