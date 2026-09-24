import type { AiProvider } from "@palier/adapters/openai";

/**
 * Wraps an `AiProvider` to accumulate usage across every call, because the port's
 * `lastUsage()` reports only the most recent one and the batch report needs the
 * total (content-factory.md §6, cost per accepted item). Pure decoration: it
 * changes no behaviour, only totals what the inner provider already reports.
 */
export type Totals = {
  readonly calls: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  /** Null when no call was priced (no pricing table configured). */
  readonly costUsd: number | null;
};

export type MeteredProvider = { readonly provider: AiProvider; readonly totals: () => Totals };

export const meterProvider = (inner: AiProvider): MeteredProvider => {
  let calls = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let costUsd = 0;
  let anyPriced = false;

  const account = (): void => {
    const usage = inner.lastUsage();
    if (usage === null) return;
    calls++;
    inputTokens += usage.inputTokens;
    outputTokens += usage.outputTokens;
    if (usage.costUsd !== undefined) {
      anyPriced = true;
      costUsd += usage.costUsd;
    }
  };

  const provider: AiProvider = {
    capabilities: () => inner.capabilities(),
    generatePassage: async (req) => {
      const out = await inner.generatePassage(req);
      account();
      return out;
    },
    generateItems: async (req) => {
      const out = await inner.generateItems(req);
      account();
      return out;
    },
    reviewItem: async (req) => {
      const out = await inner.reviewItem(req);
      account();
      return out;
    },
    lastUsage: () => inner.lastUsage(),
  };

  return {
    provider,
    totals: () => ({ calls, inputTokens, outputTokens, costUsd: anyPriced ? costUsd : null }),
  };
};
