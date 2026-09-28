import {
  type AiProvider,
  type CostEntry,
  GENERATED_ITEM_TYPES,
  GENERATED_SET_SIZE,
  withAiProvider,
} from "@palier/app";
import { type FetchLike, openAiProvider } from "@palier/adapters/openai";
import type {
  AiFeature,
  ExaminerTurnRequest,
  GenerateItemsRequest,
  ItemDraft,
  ModelPrice,
  ReviewRequest,
  SpeechRequest,
  WritingPrompt,
  WritingRequest,
} from "@palier/domain";
import { itemTypeDefinition } from "@palier/domain";
import type { RecordedCompletion, RecordedTranscribeRequest } from "@palier/testing";
import { memoryCostLedger, memoryKeyVault } from "@palier/testing/in-memory";

/**
 * The nightly live smoke, and the recorder of the AI schema-conformance fixtures (Phase 4 CI
 * gates, progress.md D112). A fixed set of real calls on a real key, through the path the
 * browser takes — the real adapter, made inside the vault's callback by `withAiProvider`,
 * metered into a ledger — with a tee on `fetch` that keeps each completion as OpenAI sent it:
 *
 * - `verifyKey`, and every model id the app configures checked against the list it returns
 *   (architecture.md §8.1);
 * - one `generateItems` per sentence-level type, at the size runtime generation asks for;
 * - `reviewItem` on the first drafts, one at a time, as `generatePracticeSet` does;
 * - `assessWriting` on two workshop prompts;
 * - the oral turn loop's three (Phase 5 Slice 2, D117): `speak` on a fixed French question, then
 *   `transcribe` that same audio, so no recording of anyone's voice is needed, then two
 *   `examinerTurn`s, an opening and a follow-up.
 *
 * Audio is never kept: a transcription is recorded with its clip described (type and size), and
 * a voice as its content type and size.
 *
 * It reports the measured tokens per feature, which replace `pricing.json`'s typical figures
 * (D103), and each completion with whether it passed the adapter's schema on its own, which
 * `--record` commits as the fixtures, in `@palier/testing`'s `RecordedCompletion` shape. Self-contained, with no relative import, so
 * `scripts/live-smoke.mjs` runs it under Node's type stripping, as `billing-check.ts` is.
 */

/** How many drafts it reviews: runtime generation's set size, so the review figure is one set's. */
export const LIVE_SMOKE_REVIEWS = GENERATED_SET_SIZE;

export type FeatureMeasure = {
  readonly calls: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costUsd: number;
};

/** One method's average call, retries included, as OpenAI billed it. */
export type MethodMeasure = { readonly calls: number; readonly inputTokens: number; readonly outputTokens: number };

export type LiveSmokeDeps = {
  readonly apiKey: string;
  /** The role → model map, `ai-models.json` less its note and voice. The oral three run only when configured. */
  readonly models: {
    readonly passage: string;
    readonly draft: string;
    readonly review: string;
    readonly assess: string;
    readonly transcribe?: string;
    readonly speech?: string;
    readonly examiner?: string;
  };
  /** The examiner's voice (D117). */
  readonly voice?: string;
  readonly prices: Readonly<Record<string, ModelPrice>>;
  /** Two workshop prompts to assess writing against. */
  readonly prompts: readonly WritingPrompt[];
  readonly now?: () => string;
  /** The network. Tests hand in a stub; the script uses the platform's `fetch`. */
  readonly fetchImpl?: FetchLike;
};

export type LiveSmokeResult = {
  readonly startedAt: string;
  readonly endedAt: string;
  readonly calls: readonly CostEntry[];
  readonly byFeature: Readonly<Record<AiFeature, FeatureMeasure>>;
  /** The average call of each method, rounded to whole tokens: what `pricing.json`'s figures are made of. */
  readonly byMethod: Readonly<Record<RecordedCompletion["method"], MethodMeasure>>;
  /** Configured model ids the models endpoint did not list. Empty when every one is live. */
  readonly missingModels: readonly string[];
  readonly completions: readonly RecordedCompletion[];
};

/** Two short pieces of writing, one per prompt, each with an error worth marking. */
const WRITTEN = [
  "Bonjour à tous, la réunion de lundi est reporter à mardi. Les documents seront envoyer demain. Merci de votre compréhension.",
  "Madame, nous avons bien reçu votre demande et nous vous répondrons dans les plus bref délais. Veuillez agréer nos salutations.",
] as const;

const DRAFT_REQUEST = (type: (typeof GENERATED_ITEM_TYPES)[number]): GenerateItemsRequest => ({
  promptSpec: itemTypeDefinition(type).generatePrompt({
    targetBand: "C",
    subSkill: "agreement",
    topic: "human-resources",
    lang: "fr",
  }),
  topic: "human-resources",
  lang: "fr",
  count: GENERATED_SET_SIZE,
});

/** The question voiced and then transcribed back (D117): the smoke records nobody's voice. */
const SPOKEN: SpeechRequest = {
  text: "Bonjour. Pouvez-vous me décrire votre poste et vos principales responsabilités ?",
  lang: "fr",
};

/**
 * French is spoken at about fifteen characters a second. Node cannot decode the audio to measure
 * it, so this stands in for the length a recorder would measure; the transcription's own usage,
 * when it reports one, is what prices the call.
 */
const SPOKEN_CHARS_PER_SECOND = 15;

const EXAMINER_PHASE: ExaminerTurnRequest["phase"] = {
  name: "Votre travail",
  minutes: 5,
  intent: "Have the candidate describe their role and a recent project in detail.",
  seedQuestions: ["Parlez-moi de votre poste actuel.", "Décrivez un projet récent dont vous êtes fier."],
  escalation: ["Qu'auriez-vous fait autrement si le budget avait été réduit de moitié ?"],
  deescalation: ["Quelles sont vos tâches d'une journée typique ?"],
};

/** An opening turn, and a follow-up after a capable answer. */
const EXAMINER_REQUESTS: readonly ExaminerTurnRequest[] = [
  { sessionType: "work", targetBand: "C", lang: "fr", topic: "project-management", phase: EXAMINER_PHASE, register: "baseline", transcript: [] },
  {
    sessionType: "work",
    targetBand: "C",
    lang: "fr",
    topic: "project-management",
    phase: EXAMINER_PHASE,
    register: "escalate",
    transcript: [
      { speaker: "examiner", text: "Bonjour. Parlez-moi de votre poste actuel." },
      {
        speaker: "candidate",
        text: "Je suis analyste principale des politiques. Je coordonne les consultations avec les provinces et je rédige des notes d'information pour la sous-ministre.",
      },
    ],
  },
];

const reviewOf = (draft: ItemDraft): ReviewRequest => ({
  itemType: draft.type,
  stem: draft.stem,
  options: draft.options.map((o) => ({ id: o.id, text: o.text })),
  subSkill: draft.subSkill,
  targetBand: draft.targetBand,
  lang: "fr",
});

type Exchange = {
  readonly url: string;
  readonly model: string;
  readonly status: number;
  readonly text: string;
  /** Set for an audio answer, whose bytes are handed on but never kept (D117). */
  readonly audio?: { readonly contentType: string; readonly bytes: number };
};

/** The model a request names: a JSON body's `model`, or a multipart upload's (D117). */
const modelOf = (body: string | FormData | undefined): string => {
  if (body instanceof FormData) {
    const model = body.get("model");
    return typeof model === "string" ? model : "";
  }
  try {
    return (JSON.parse(body ?? "{}") as { model?: string }).model ?? "";
  } catch {
    return "";
  }
};

/** A `fetch` that answers the adapter exactly as the network did, and keeps a copy of each answer. */
const teeing = (inner: FetchLike, seen: Exchange[]): FetchLike => async (url, init) => {
  const res = await inner(url, init);
  const model = modelOf(init.body);
  const headers = res.headers === undefined ? {} : { headers: res.headers };
  const contentType = res.headers?.get("content-type") ?? "";
  if (res.ok && contentType.startsWith("audio/") && res.blob !== undefined) {
    const audio = await res.blob();
    seen.push({ url, model, status: res.status, text: "", audio: { contentType, bytes: audio.size } });
    return {
      ok: res.ok,
      status: res.status,
      ...headers,
      json: () => Promise.reject(new SyntaxError("an audio answer is not JSON")),
      text: () => Promise.resolve(""),
      blob: () => Promise.resolve(audio),
    };
  }
  const text = await res.text();
  seen.push({ url, model, status: res.status, text });
  return {
    ok: res.ok,
    status: res.status,
    ...headers,
    json: () => Promise.resolve(JSON.parse(text) as unknown),
    text: () => Promise.resolve(text),
  };
};

type Usage = { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number };

/**
 * What one exchange recorded, by method (D117): a completion's message content; a transcription's
 * whole body; a voice's content type and size. `null` for an answer that is none of these, such
 * as a gateway's error page, so the adapter's own error is the one that surfaces.
 */
const recordedContent = (
  method: RecordedCompletion["method"],
  exchange: Exchange,
): { readonly content: string; readonly usage: RecordedCompletion["usage"] } | null => {
  if (method === "speak") {
    return exchange.audio === undefined
      ? null
      : { content: JSON.stringify(exchange.audio), usage: { prompt_tokens: 0, completion_tokens: 0 } };
  }
  let body: { choices?: { message?: { content?: unknown } }[]; usage?: Usage; text?: unknown };
  try {
    body = JSON.parse(exchange.text) as typeof body;
  } catch {
    return null;
  }
  if (method === "transcribe") {
    if (typeof body.text !== "string") return null;
    return {
      content: exchange.text,
      usage: { prompt_tokens: body.usage?.input_tokens ?? 0, completion_tokens: body.usage?.output_tokens ?? 0 },
    };
  }
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string") return null;
  return { content, usage: { prompt_tokens: body.usage?.prompt_tokens ?? 0, completion_tokens: body.usage?.completion_tokens ?? 0 } };
};

const platformFetch: FetchLike = (url, init) => fetch(url, init);

export const runLiveSmoke = async (deps: LiveSmokeDeps): Promise<LiveSmokeResult> => {
  const now = deps.now ?? (() => new Date().toISOString());
  const vault = memoryKeyVault();
  await vault.putApiKey(deps.apiKey, { remember: false });
  const ledger = memoryCostLedger();
  const seen: Exchange[] = [];
  const fetchImpl = teeing(deps.fetchImpl ?? platformFetch, seen);
  const ai = {
    vault,
    ledger,
    clock: { now },
    aiProvider: (apiKey: string) =>
      openAiProvider({ apiKey, models: deps.models, pricing: deps.prices, fetchImpl, ...(deps.voice === undefined ? {} : { voice: deps.voice }) }),
  };
  const completions: RecordedCompletion[] = [];
  const billed: { readonly method: RecordedCompletion["method"]; readonly entry: CostEntry }[] = [];

  /**
   * One metered call, its completions kept. A call that settles made its last completion the
   * accepted one; every earlier one, and every one of a call that failed, was refused. A failure
   * stops the smoke: it is the signal the nightly lane exists to raise.
   */
  const call = async <T>(
    feature: AiFeature,
    method: RecordedCompletion["method"],
    request: RecordedCompletion["request"],
    fn: (provider: AiProvider) => Promise<T>,
  ): Promise<T> => {
    const from = seen.length;
    const keep = (accepted: boolean) =>
      seen.slice(from).forEach((exchange, index, all) => {
        const kept = recordedContent(method, exchange);
        if (kept === null) return;
        completions.push({
          method,
          model: exchange.model,
          request,
          attempt: index + 1,
          ...kept,
          conformant: accepted && index === all.length - 1,
        });
      });
    try {
      const result = await withAiProvider(ai, feature, fn);
      keep(true);
      const entry = (await ledger.since(startedAt)).at(-1);
      if (entry !== undefined) billed.push({ method, entry });
      return result;
    } catch (error) {
      keep(false);
      throw error;
    }
  };

  const startedAt = now();

  await withAiProvider(ai, "item-generation", (provider) => provider.verifyKey());
  const listed = (() => {
    const models = seen.find((exchange) => exchange.url.endsWith("/models"));
    const data = (JSON.parse(models?.text ?? "{}") as { data?: { id?: unknown }[] }).data ?? [];
    return new Set(data.map((entry) => entry.id));
  })();
  const missingModels = [...new Set(Object.values(deps.models))].filter((id) => !listed.has(id));
  seen.length = 0;
  const empty: MethodMeasure = { calls: 0, inputTokens: 0, outputTokens: 0 };
  const nothing: FeatureMeasure = { ...empty, costUsd: 0 };
  // A retired model is the thing this check exists for: stop before paying for any call it would fail.
  if (missingModels.length > 0) {
    return {
      startedAt,
      endedAt: now(),
      calls: [],
      byFeature: { "writing-feedback": nothing, "item-generation": nothing, "oral-practice": nothing },
      byMethod: {
        generateItems: empty,
        reviewItem: empty,
        assessWriting: empty,
        examinerTurn: empty,
        transcribe: empty,
        speak: empty,
      },
      missingModels,
      completions: [],
    };
  }

  const drafts: ItemDraft[] = [];
  for (const type of GENERATED_ITEM_TYPES) {
    const request = DRAFT_REQUEST(type);
    drafts.push(...(await call("item-generation", "generateItems", request, (p) => p.generateItems(request))));
  }
  for (const draft of drafts.slice(0, LIVE_SMOKE_REVIEWS)) {
    const request = reviewOf(draft);
    await call("item-generation", "reviewItem", request, (p) => p.reviewItem(request));
  }
  for (const [index, prompt] of deps.prompts.slice(0, WRITTEN.length).entries()) {
    const request: WritingRequest = {
      task: prompt.task,
      wordTarget: prompt.wordTarget,
      text: WRITTEN[index] ?? "",
      targetBand: "C",
      lang: prompt.lang,
      feedbackLang: "en",
    };
    await call("writing-feedback", "assessWriting", request, (p) => p.assessWriting(request));
  }

  if (deps.models.speech !== undefined && deps.models.transcribe !== undefined) {
    const voiced = await call("oral-practice", "speak", SPOKEN, (p) => p.speak(SPOKEN));
    const durationMs = Math.round((SPOKEN.text.length / SPOKEN_CHARS_PER_SECOND) * 1000);
    const described: RecordedTranscribeRequest = { lang: SPOKEN.lang, durationMs, audio: { type: voiced.type, bytes: voiced.size } };
    await call("oral-practice", "transcribe", described, (p) => p.transcribe({ audio: voiced, lang: SPOKEN.lang, durationMs }));
  }
  if (deps.models.examiner !== undefined) {
    for (const request of EXAMINER_REQUESTS) {
      await call("oral-practice", "examinerTurn", request, (p) => p.examinerTurn(request));
    }
  }

  const calls = await ledger.since(startedAt);
  const measure = (feature: AiFeature): FeatureMeasure => {
    const mine = calls.filter((c) => c.feature === feature);
    return {
      calls: mine.length,
      inputTokens: mine.reduce((sum, c) => sum + c.inputTokens, 0),
      outputTokens: mine.reduce((sum, c) => sum + c.outputTokens, 0),
      costUsd: mine.reduce((sum, c) => sum + (c.costUsd ?? 0), 0),
    };
  };
  const average = (method: RecordedCompletion["method"]): MethodMeasure => {
    const mine = billed.filter((b) => b.method === method).map((b) => b.entry);
    const mean = (total: number) => (mine.length === 0 ? 0 : Math.round(total / mine.length));
    return {
      calls: mine.length,
      inputTokens: mean(mine.reduce((sum, e) => sum + e.inputTokens, 0)),
      outputTokens: mean(mine.reduce((sum, e) => sum + e.outputTokens, 0)),
    };
  };
  return {
    startedAt,
    endedAt: now(),
    calls,
    byFeature: {
      "writing-feedback": measure("writing-feedback"),
      "item-generation": measure("item-generation"),
      "oral-practice": measure("oral-practice"),
    },
    byMethod: {
      generateItems: average("generateItems"),
      reviewItem: average("reviewItem"),
      assessWriting: average("assessWriting"),
      examinerTurn: average("examinerTurn"),
      transcribe: average("transcribe"),
      speak: average("speak"),
    },
    missingModels,
    completions,
  };
};
