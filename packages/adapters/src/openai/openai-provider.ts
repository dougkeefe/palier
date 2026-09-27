import type { AiProvider } from "@palier/app";
import {
  assembleAssessment,
  itemDraftSchema,
  passageDraftSchema,
  reviewVerdictSchema,
  scenarioDraftSchema,
  writingFeedbackDraftSchema,
} from "@palier/domain";
import type {
  GenerateItemsRequest,
  GeneratePassageRequest,
  GenerateScenarioRequest,
  ItemDraft,
  PassageDraft,
  ReviewRequest,
  ReviewVerdict,
  ScenarioDraft,
  UsageRecord,
  WritingAssessment,
  WritingFeedbackDraft,
  WritingRequest,
} from "@palier/domain";

import {
  InvalidApiKeyError,
  InvalidResponseError,
  ProviderRequestError,
  ProviderTimeoutError,
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
 *
 * Every call has a time limit (progress.md D99): the request is aborted and the call
 * rejects with `ProviderTimeoutError`, whether or not the `fetch` honours the signal.
 * `verifyKey` is the one cheap call a key check makes, `GET /models`.
 */

type FetchResponse = {
  readonly ok: boolean;
  readonly status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};
export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<FetchResponse>;

/**
 * Model ids, as data (§8.1). One per stage that calls the model: the factory's three,
 * `assess` for writing feedback (progress.md D105), and `scenario` for the factory's oral
 * scenarios (D114). The factory never assesses writing and the browser never plans a
 * scenario, so both are optional; either call without its model is a configuration
 * error, refused before any request is made.
 */
export type OpenAiModels = {
  readonly passage: string;
  readonly draft: string;
  readonly review: string;
  readonly assess?: string;
  readonly scenario?: string;
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
  /** How long a completion may take before it is abandoned. Default 120 s. */
  readonly timeoutMs?: number;
  /** How long `verifyKey`'s one cheap call may take. Default 10 s. */
  readonly verifyTimeoutMs?: number;
};

type ChatUsage = { prompt_tokens?: number; completion_tokens?: number };
type ChatResponse = {
  choices?: ReadonlyArray<{ message?: { content?: string } }>;
  usage?: ChatUsage;
};

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
/** Operational limits, not exam rules (ADR 9 does not apply): a reasoning model can take minutes. */
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_VERIFY_TIMEOUT_MS = 10_000;

const defaultFetch: FetchLike = (url, init) =>
  fetch(url, init) as unknown as Promise<FetchResponse>;

export const openAiProvider = (config: OpenAiProviderConfig): AiProvider => {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const doFetch = config.fetchImpl ?? defaultFetch;
  const maxRetries = config.maxRetries ?? 1;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const verifyTimeoutMs = config.verifyTimeoutMs ?? DEFAULT_VERIFY_TIMEOUT_MS;
  let usage: UsageRecord | null = null;

  /**
   * One HTTP exchange under a time limit: the fetch and the reading of its answer. The
   * limit races the work rather than trusting the fetch to honour the abort, and it is
   * rejected before the abort is signalled, so a timeout always reads as a timeout.
   */
  const exchange = async <T>(
    url: string,
    init: { method: string; headers: Record<string, string>; body?: string },
    limitMs: number,
    read: (res: FetchResponse) => Promise<T>,
  ): Promise<T> => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new ProviderTimeoutError("OpenAI did not answer in time."));
        controller.abort();
      }, limitMs);
    });
    const work = async (): Promise<T> => {
      let res: FetchResponse;
      try {
        res = await doFetch(url, { ...init, signal: controller.signal });
      } catch (cause) {
        throw new ProviderUnavailableError("Could not reach OpenAI.", { cause });
      }
      return read(res);
    };
    try {
      return await Promise.race([work(), timedOut]);
    } finally {
      clearTimeout(timer);
    }
  };

  /**
   * A non-2xx answer, as one of our errors. The body is kept for diagnosis, but with the key
   * cut out of it first: a proxy that echoed the request would otherwise put the key in an
   * error's message [R12].
   */
  const refuse = async (res: FetchResponse): Promise<never> => {
    const detail = (await res.text().catch(() => "")).split(config.apiKey).join("[redacted]");
    if (res.status === 401) throw new InvalidApiKeyError("OpenAI rejected the API key.");
    if (res.status === 429) throw new RateLimitError("OpenAI rate limit or quota reached.");
    throw new ProviderRequestError(res.status, detail);
  };

  /** A 2xx body that is not JSON is a malformed answer, never a raw `SyntaxError`. */
  const readJson = async (res: FetchResponse): Promise<unknown> => {
    try {
      return await res.json();
    } catch (cause) {
      throw new InvalidResponseError("OpenAI's answer was not JSON.", { cause });
    }
  };

  const priceOf = (model: string, inputTokens: number, outputTokens: number): number | undefined => {
    const p = config.pricing?.[model];
    if (p === undefined) return undefined;
    return (inputTokens / 1_000_000) * p.inputPerMTok + (outputTokens / 1_000_000) * p.outputPerMTok;
  };

  /**
   * Add one completion's tokens to the current method call's usage (progress.md D102). A
   * method starts from `null`, so `lastUsage()` is the whole of the last call, a retry
   * included, and never an earlier call's carried over. Pricing is linear, so the summed
   * tokens price to the sum of the parts.
   */
  const addUsage = (model: string, u: ChatUsage): void => {
    const inputTokens = (usage?.inputTokens ?? 0) + (u.prompt_tokens ?? 0);
    const outputTokens = (usage?.outputTokens ?? 0) + (u.completion_tokens ?? 0);
    const costUsd = priceOf(model, inputTokens, outputTokens);
    usage = { model, inputTokens, outputTokens, ...(costUsd === undefined ? {} : { costUsd }) };
  };

  const complete = (model: string, system: string, user: string): Promise<string> =>
    exchange(
      `${baseUrl}/chat/completions`,
      {
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
      },
      timeoutMs,
      async (res) => {
        if (!res.ok) return refuse(res);
        const body = (await readJson(res)) as ChatResponse;
        // Billed before it is checked: an answer with no content still cost its tokens.
        addUsage(model, body.usage ?? {});
        const content = body.choices?.[0]?.message?.content;
        if (typeof content !== "string") {
          throw new InvalidResponseError("OpenAI returned no message content.");
        }
        return content;
      },
    );

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
    usage = null;
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
    capabilities: () => ({
      generatePassage: true,
      generateItems: true,
      reviewItem: true,
      assessWriting: config.models.assess !== undefined,
      generateScenario: config.models.scenario !== undefined,
    }),

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

    /**
     * The model quotes each error's words and `assembleAssessment` places them (D105). An
     * excerpt that is not in the text, or two on the same words, fails the parse, so it is
     * retried once like any malformed answer and then becomes `InvalidResponseError`.
     */
    assessWriting: (req: WritingRequest) => {
      const model = config.models.assess;
      if (model === undefined) {
        usage = null;
        return Promise.reject(new Error("No model is configured for writing feedback (models.assess)."));
      }
      const { system, user } = buildPrompt.writing(req);
      return callValidated(model, system, user, (raw): WritingAssessment => {
        const result = writingFeedbackDraftSchema.safeParse(raw);
        if (!result.success) throw new Error(result.error.message);
        const assembled = assembleAssessment(req.text, result.data as WritingFeedbackDraft);
        if (!assembled.ok) throw new Error(assembled.problem);
        return assembled.assessment;
      });
    },

    /**
     * A plan whose phases do not fill the session is refused at the parse, so it is retried
     * once like any malformed answer rather than paid for and then discarded by the factory.
     */
    generateScenario: (req: GenerateScenarioRequest) => {
      const model = config.models.scenario;
      if (model === undefined) {
        usage = null;
        return Promise.reject(new Error("No model is configured for oral scenarios (models.scenario)."));
      }
      const { system, user } = buildPrompt.scenario(req);
      return callValidated(model, system, user, (raw): ScenarioDraft => {
        const result = scenarioDraftSchema.safeParse(raw);
        if (!result.success) throw new Error(result.error.message);
        const minutes = result.data.phases.reduce((sum, phase) => sum + phase.minutes, 0);
        if (Math.abs(minutes - req.minutes) > 1e-9) {
          throw new Error(`the phases add up to ${String(minutes)} minutes, not ${String(req.minutes)}`);
        }
        return result.data as ScenarioDraft;
      });
    },

    verifyKey: () => {
      usage = null;
      return exchange(
        `${baseUrl}/models`,
        { method: "GET", headers: { authorization: `Bearer ${config.apiKey}` } },
        verifyTimeoutMs,
        async (res) => {
          if (!res.ok) return refuse(res);
          const body = await readJson(res);
          if (!isModelList(body)) {
            throw new InvalidResponseError("OpenAI's model list was not in the expected shape.");
          }
        },
      );
    },

    lastUsage: () => usage,
  };
};

/** The structure check on `GET /models` (D55's approach): an object with a `data` array. */
const isModelList = (body: unknown): boolean =>
  typeof body === "object" && body !== null && Array.isArray((body as { data?: unknown }).data);

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
