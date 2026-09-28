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
    assessWriting: async (req) => {
      const out = await inner.assessWriting(req);
      account();
      return out;
    },
    generateScenario: async (req) => {
      const out = await inner.generateScenario(req);
      account();
      return out;
    },
    // The factory makes no oral call (progress.md D117); each is passed through and
    // accounted like any other, so the meter never hides one that is made.
    transcribe: async (req) => {
      const out = await inner.transcribe(req);
      account();
      return out;
    },
    speak: async (req) => {
      const out = await inner.speak(req);
      account();
      return out;
    },
    examinerTurn: async (req) => {
      const out = await inner.examinerTurn(req);
      account();
      return out;
    },
    // A key check spends no tokens, so there is nothing to account.
    verifyKey: () => inner.verifyKey(),
    lastUsage: () => inner.lastUsage(),
  };

  return {
    provider,
    totals: () => ({ calls, inputTokens, outputTokens, costUsd: anyPriced ? costUsd : null }),
  };
};
