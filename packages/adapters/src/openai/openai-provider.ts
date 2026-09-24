import type { AiProvider } from "@palier/app";
import {
  itemDraftSchema,
  passageDraftSchema,
  reviewVerdictSchema,
} from "@palier/domain";
import type {
  GenerateItemsRequest,
  GeneratePassageRequest,
  ItemDraft,
  PassageDraft,
  ReviewRequest,
  ReviewVerdict,
  UsageRecord,
} from "@palier/domain";

import {
  InvalidApiKeyError,
  InvalidResponseError,
  ProviderRequestError,
  ProviderUnavailableError,
  RateLimitError,
} from "./errors.js";
import { buildPrompt } from "./prompts.js";

/**
 * The OpenAI-backed `AiProvider` (implementation-plan.md §3.3, architecture.md
 * §8). Deliberately over `fetch` rather than the `openai` SDK: it adds no
 * dependency, makes an SDK type impossible to leak (the mistake adapters/CLAUDE.md
 * warns of), and lets tests inject a `fetch` the way `webCryptoIdGenerator`
 * injects its clock. The structured-output contract (§8.2) is honoured by
 * re-validating every response with the domain Zod schema and retrying once on
 * failure; that re-validation, not the model's promise, is the guarantee.
 * Model ids are configuration, never hardcoded (§8.1).
 */

type FetchResponse = {
  readonly ok: boolean;
  readonly status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<FetchResponse>;

/** Model ids, as data (§8.1). One per pipeline stage that calls the model. */
export type OpenAiModels = {
  readonly passage: string;
  readonly draft: string;
  readonly review: string;
};

/** Per-model prices, for the cost ledger (§8.6). Absent → `costUsd` is omitted. */
export type OpenAiPricing = Readonly<
  Record<string, { readonly inputPerMTok: number; readonly outputPerMTok: number }>
>;

export type OpenAiProviderConfig = {
  /** The user's key (BYOK, ADR 2). The composition root supplies it — from env
   * in the factory, through `KeyVault.withApiKey` in the browser. */
  readonly apiKey: string;
  readonly models: OpenAiModels;
  readonly baseUrl?: string;
  readonly fetchImpl?: FetchLike;
  /** Re-validation retries on a malformed response (§8.2). Default 1. */
  readonly maxRetries?: number;
  readonly pricing?: OpenAiPricing;
};

type ChatUsage = { prompt_tokens?: number; completion_tokens?: number };
type ChatResponse = {
  choices?: ReadonlyArray<{ message?: { content?: string } }>;
  usage?: ChatUsage;
};

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

const defaultFetch: FetchLike = (url, init) =>
  fetch(url, init) as unknown as Promise<FetchResponse>;

export const openAiProvider = (config: OpenAiProviderConfig): AiProvider => {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const doFetch = config.fetchImpl ?? defaultFetch;
  const maxRetries = config.maxRetries ?? 1;
  let usage: UsageRecord | null = null;

  const priceOf = (model: string, u: ChatUsage): number | undefined => {
    const p = config.pricing?.[model];
    if (p === undefined) return undefined;
    const input = ((u.prompt_tokens ?? 0) / 1_000_000) * p.inputPerMTok;
    const output = ((u.completion_tokens ?? 0) / 1_000_000) * p.outputPerMTok;
    return input + output;
  };

  const recordUsage = (model: string, u: ChatUsage): void => {
    const costUsd = priceOf(model, u);
    usage = {
      model,
      inputTokens: u.prompt_tokens ?? 0,
      outputTokens: u.completion_tokens ?? 0,
      ...(costUsd === undefined ? {} : { costUsd }),
    };
  };

  const complete = async (model: string, system: string, user: string): Promise<string> => {
    let res: FetchResponse;
    try {
      res = await doFetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        }),
      });
    } catch (cause) {
      throw new ProviderUnavailableError("Could not reach OpenAI.", { cause });
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      if (res.status === 401) throw new InvalidApiKeyError("OpenAI rejected the API key.");
      if (res.status === 429) throw new RateLimitError("OpenAI rate limit or quota reached.");
      throw new ProviderRequestError(res.status, detail);
    }

    const body = (await res.json()) as ChatResponse;
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new InvalidResponseError("OpenAI returned no message content.");
    }
    recordUsage(model, body.usage ?? {});
    return content;
  };

  /**
   * Call the model and re-validate its JSON with `parse`, retrying once with the
   * previous error appended (§8.2). `parse` throws on a bad body; when the
   * retries are exhausted the last error becomes an `InvalidResponseError`.
   */
  const callValidated = async <T>(
    model: string,
    system: string,
    baseUser: string,
    parse: (raw: unknown) => T,
  ): Promise<T> => {
    let lastError = "";
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const user =
        attempt === 0
          ? baseUser
          : `${baseUser}\n\nYour previous reply was rejected: ${lastError}. Reply with valid JSON only.`;
      const content = await complete(model, system, user);
      try {
        return parse(safeJson(content));
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
    throw new InvalidResponseError(
      `OpenAI response failed validation after ${String(maxRetries + 1)} attempts: ${lastError}`,
    );
  };

  return {
    capabilities: () => ({ generatePassage: true, generateItems: true, reviewItem: true }),

    generatePassage: (req: GeneratePassageRequest) => {
      const { system, user } = buildPrompt.passage(req);
      return callValidated(config.models.passage, system, user, (raw) =>
        parseArray(raw, "passages", (el) => {
          const result = passageDraftSchema.safeParse(el);
          if (!result.success) throw new Error(result.error.message);
          return result.data as PassageDraft;
        }),
      );
    },

    generateItems: (req: GenerateItemsRequest) => {
      const { system, user } = buildPrompt.items(req);
      return callValidated(config.models.draft, system, user, (raw) =>
        parseArray(raw, "items", (el) => {
          const result = itemDraftSchema.safeParse(el);
          if (!result.success) throw new Error(result.error.message);
          return result.data as ItemDraft;
        }),
      );
    },

    reviewItem: (req: ReviewRequest) => {
      const { system, user } = buildPrompt.review(req);
      return callValidated(config.models.review, system, user, (raw): ReviewVerdict => {
        const result = reviewVerdictSchema.safeParse(raw);
        if (!result.success) throw new Error(result.error.message);
        return result.data as ReviewVerdict;
      });
    },

    lastUsage: () => usage,
  };
};

const safeJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("response was not valid JSON");
  }
};

/** Pull `field` off the envelope object and validate each element. */
const parseArray = <T>(raw: unknown, field: string, one: (el: unknown) => T): readonly T[] => {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`expected an object with a "${field}" array`);
  }
  const value = (raw as Record<string, unknown>)[field];
  if (!Array.isArray(value)) {
    throw new Error(`expected "${field}" to be an array`);
  }
  return value.map(one);
};
