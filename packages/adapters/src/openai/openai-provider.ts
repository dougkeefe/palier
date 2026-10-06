import type { AiProvider } from "@palier/app";
import {
  assembleAssessment,
  assembleOralAssessment,
  checkDiagnosticInterpretation,
  costOf,
  diagnosticInterpretationSchema,
  examinerTurnSchema,
  itemDraftSchema,
  oralAssessmentDraftSchema,
  passageDraftSchema,
  reviewVerdictSchema,
  scenarioDraftSchema,
  writingFeedbackDraftSchema,
} from "@palier/domain";
import type {
  DiagnosticInterpretation,
  DiagnosticInterpretationRequest,
  ExaminerTurn,
  ExaminerTurnRequest,
  GenerateItemsRequest,
  GeneratePassageRequest,
  GenerateScenarioRequest,
  ItemDraft,
  ModelPrice,
  OralAssessment,
  OralAssessmentDraft,
  OralRequest,
  PassageDraft,
  ReviewRequest,
  ReviewVerdict,
  ScenarioDraft,
  SpeechRequest,
  TranscribeRequest,
  Transcript,
  UsageRecord,
  WritingAssessment,
  WritingFeedbackDraft,
  WritingRequest,
} from "@palier/domain";

import {
  InvalidApiKeyError,
  InvalidResponseError,
  ProviderRequestError,
  RateLimitError,
} from "./errors.js";
import type { FetchLike, FetchResponse, RequestInit } from "./http.js";
import { platformFetch, timedExchange } from "./http.js";
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
 *
 * The turn loop's audio (progress.md D117): `transcribe` uploads one clip as multipart
 * form data to `/audio/transcriptions`, and `speak` reads `/audio/speech`'s binary
 * answer as a `Blob`. Both are priced in the unit OpenAI bills them by, which the device
 * measures: the clip's seconds and the characters voiced.
 */


/**
 * Model ids, as data (§8.1). One per stage that calls the model: the factory's three,
 * `assess` for writing feedback (progress.md D105), `scenario` for the factory's oral
 * scenarios (D114), and the turn loop's `transcribe`, `speech` and `examiner` (D117).
 * Each of those is used by only one of the factory and the browser, so each is optional;
 * a call without its model is a configuration error, refused before any request is made.
 */
export type OpenAiModels = {
  readonly passage: string;
  readonly draft: string;
  readonly review: string;
  readonly assess?: string;
  readonly scenario?: string;
  readonly transcribe?: string;
  readonly speech?: string;
  readonly examiner?: string;
};

/**
 * Per-model prices, for the cost ledger (§8.6), in each model's billing unit (D117).
 * Absent → `costUsd` is omitted.
 */
export type OpenAiPricing = Readonly<Record<string, ModelPrice>>;

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
  /** The examiner's voice for `speak` (D117), as data. Default `alloy`. */
  readonly voice?: string;
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
const DEFAULT_VOICE = "alloy";

/** A transcription's answer (`response_format: json`), structure-checked at the edge (D55). */
type TranscriptionResponse = {
  text?: unknown;
  usage?: { type?: unknown; seconds?: unknown; input_tokens?: unknown; output_tokens?: unknown };
};

/** The file name a clip is uploaded under: OpenAI reads the format from its extension. */
const clipName = (type: string): string => {
  if (type.includes("mp4")) return "answer.mp4";
  if (type.includes("mpeg")) return "answer.mp3";
  if (type.includes("wav")) return "answer.wav";
  return "answer.webm";
};

const count = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;

export type { FetchLike } from "./http.js";

export const openAiProvider = (config: OpenAiProviderConfig): AiProvider => {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const doFetch = config.fetchImpl ?? platformFetch;
  const maxRetries = config.maxRetries ?? 1;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const verifyTimeoutMs = config.verifyTimeoutMs ?? DEFAULT_VERIFY_TIMEOUT_MS;
  let usage: UsageRecord | null = null;

  /**
   * One HTTP exchange under a time limit: the fetch and the reading of its answer. The
   * limit races the work rather than trusting the fetch to honour the abort, and it is
   * rejected before the abort is signalled, so a timeout always reads as a timeout.
   */
  const exchange = <T>(
    url: string,
    init: RequestInit,
    limitMs: number,
    read: (res: FetchResponse) => Promise<T>,
  ): Promise<T> => timedExchange(doFetch, url, init, limitMs, read);

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

  /** The price of what a call measured, in its model's unit (D117); `undefined` when unpriced. */
  const priceOf = (
    model: string,
    amounts: { inputTokens?: number; outputTokens?: number; audioSeconds?: number; characters?: number },
  ): number | undefined => {
    const p = config.pricing?.[model];
    if (p === undefined) return undefined;
    const minutes = amounts.audioSeconds === undefined ? undefined : amounts.audioSeconds / 60;
    return costOf(p, { ...amounts, minutes }) ?? undefined;
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
    const costUsd = priceOf(model, { inputTokens, outputTokens });
    usage = { model, inputTokens, outputTokens, ...(costUsd === undefined ? {} : { costUsd }) };
  };

  /**
   * One audio call's usage (D117): what it is billed by, and any tokens it reported. Only what was
   * measured is priced, so a token-priced audio model that reported no tokens reads as unpriced,
   * never as free (D103, D121). The ledger's token columns read 0 when none were reported.
   */
  const audioUsage = (
    model: string,
    measured: { inputTokens?: number; outputTokens?: number; audioSeconds?: number; characters?: number },
  ): void => {
    const costUsd = priceOf(model, measured);
    usage = {
      model,
      inputTokens: measured.inputTokens ?? 0,
      outputTokens: measured.outputTokens ?? 0,
      ...(measured.audioSeconds === undefined ? {} : { audioSeconds: measured.audioSeconds }),
      ...(measured.characters === undefined ? {} : { characters: measured.characters }),
      ...(costUsd === undefined ? {} : { costUsd }),
    };
  };

  const refuseUnconfigured = (what: string, role: string): Promise<never> => {
    usage = null;
    return Promise.reject(new Error(`No model is configured for ${what} (models.${role}).`));
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
      transcribe: config.models.transcribe !== undefined,
      speak: config.models.speech !== undefined,
      examinerTurn: config.models.examiner !== undefined,
      assessOral: config.models.assess !== undefined,
      interpretDiagnostic: config.models.assess !== undefined,
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
     * The report on a session, on writing feedback's `assess` model (D122). The model names a
     * candidate's turn and quotes its words, and `assembleOralAssessment` places them, so an
     * excerpt not in its turn, a turn that is the examiner's, or two errors on the same words
     * fails the parse and is retried once, then becomes `InvalidResponseError` (D105's rule).
     */
    assessOral: (req: OralRequest) => {
      const model = config.models.assess;
      if (model === undefined) return refuseUnconfigured("the oral report", "assess");
      const { system, user } = buildPrompt.oral(req);
      return callValidated(model, system, user, (raw): OralAssessment => {
        const result = oralAssessmentDraftSchema.safeParse(raw);
        if (!result.success) throw new Error(result.error.message);
        const assembled = assembleOralAssessment(req.turns, result.data as OralAssessmentDraft);
        if (!assembled.ok) throw new Error(assembled.problem);
        return assembled.assessment;
      });
    },

    /**
     * A diagnostic run's written interpretation, on the `assess` model (ADR 25). A reply that
     * names a sub-skill of the other skill, or quotes a missed question, fails the parse, so it
     * is retried once with the reason and then becomes `InvalidResponseError`.
     */
    interpretDiagnostic: (req: DiagnosticInterpretationRequest) => {
      const model = config.models.assess;
      if (model === undefined) return refuseUnconfigured("the diagnostic's interpretation", "assess");
      const { system, user } = buildPrompt.diagnostic(req);
      return callValidated(model, system, user, (raw): DiagnosticInterpretation => {
        const result = diagnosticInterpretationSchema.safeParse(raw);
        if (!result.success) throw new Error(result.error.message);
        const interpretation = result.data as DiagnosticInterpretation;
        const problem = checkDiagnosticInterpretation(req, interpretation);
        if (problem !== null) throw new Error(problem);
        return interpretation;
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

    /**
     * One clip to `/audio/transcriptions` (D117), and nowhere else [R12]. The seconds
     * billed are the response's own when it reports them by duration, and otherwise the
     * length the recorder measured, which is what a per-minute price is applied to. A
     * transcription is never retried: the clip would be uploaded twice.
     */
    transcribe: (req: TranscribeRequest): Promise<Transcript> => {
      const model = config.models.transcribe;
      if (model === undefined) return refuseUnconfigured("transcription", "transcribe");
      usage = null;
      const form = new FormData();
      form.append("file", req.audio, clipName(req.audio.type));
      form.append("model", model);
      form.append("language", req.lang);
      form.append("response_format", "json");
      return exchange(
        `${baseUrl}/audio/transcriptions`,
        { method: "POST", headers: { authorization: `Bearer ${config.apiKey}` }, body: form },
        timeoutMs,
        async (res) => {
          if (!res.ok) return refuse(res);
          // Accepted is billed, before the body is read: an answer that is not JSON still cost the clip (D121).
          audioUsage(model, { audioSeconds: req.durationMs / 1000 });
          const body = (await readJson(res)) as TranscriptionResponse | null;
          const reported = body?.usage;
          const seconds = reported?.type === "duration" ? count(reported.seconds) : undefined;
          const inputTokens = count(reported?.input_tokens);
          const outputTokens = count(reported?.output_tokens);
          audioUsage(model, {
            ...(inputTokens === undefined ? {} : { inputTokens }),
            ...(outputTokens === undefined ? {} : { outputTokens }),
            audioSeconds: seconds ?? req.durationMs / 1000,
          });
          if (typeof body?.text !== "string") {
            throw new InvalidResponseError("OpenAI's transcription had no text.");
          }
          return { text: body.text.trim() };
        },
      );
    },

    /**
     * The examiner's words to `/audio/speech` (D117), read back as audio. A per-character
     * price is applied to the words sent, which is what OpenAI bills, since the answer
     * carries no usage. A 2xx answer that is not audio is a malformed answer.
     */
    speak: (req: SpeechRequest): Promise<Blob> => {
      const model = config.models.speech;
      if (model === undefined) return refuseUnconfigured("speech", "speech");
      usage = null;
      return exchange(
        `${baseUrl}/audio/speech`,
        {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
          body: JSON.stringify({ model, input: req.text, voice: config.voice ?? DEFAULT_VOICE, response_format: "mp3" }),
        },
        timeoutMs,
        async (res) => {
          if (!res.ok) return refuse(res);
          audioUsage(model, { characters: req.text.length });
          const type = res.headers?.get("content-type") ?? "";
          if (!type.startsWith("audio/") || res.blob === undefined) {
            throw new InvalidResponseError("OpenAI's speech answer was not audio.");
          }
          const audio = await res.blob();
          if (audio.size === 0) throw new InvalidResponseError("OpenAI's speech answer was empty.");
          return audio;
        },
      );
    },

    /** The examiner's next question (D117), re-validated and retried once like any structured answer. */
    examinerTurn: (req: ExaminerTurnRequest) => {
      const model = config.models.examiner;
      if (model === undefined) return refuseUnconfigured("the examiner", "examiner");
      const { system, user } = buildPrompt.examiner(req);
      return callValidated(model, system, user, (raw): ExaminerTurn => {
        const result = examinerTurnSchema.safeParse(raw);
        if (!result.success) throw new Error(result.error.message);
        return { text: result.data.text.trim(), difficulty: result.data.difficulty };
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
