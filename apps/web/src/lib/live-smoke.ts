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
  DiagnosticInterpretationRequest,
  ExaminerTurnRequest,
  GenerateItemsRequest,
  ItemDraft,
  ModelPrice,
  OptionId,
  OralRequest,
  ReviewRequest,
  SpeechRequest,
  WritingPrompt,
  WritingRequest,
} from "@palier/domain";
import { OPTION_IDS, itemTypeDefinition } from "@palier/domain";
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
 *   `transcribe` that same audio, so no recording of anyone's voice is needed, then three
 *   `examinerTurn`s, an opening, a follow-up, and a follow-up on a contradicted premise (D176);
 * - `assessOral` on one short fixed session, `ORAL_SESSION` (Phase 5 Slice 3, D122). `runOralStability`
 *   scores a longer one, `STABILITY_SESSION`, five times, for the stability eval (D127);
 * - `interpretDiagnostic` on one fixed writing diagnostic, `DIAGNOSTIC_RUN`, a whole run's scores and its
 *   misses, so its tokens are a typical interpretation's (ADR 25).
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
    /** Studio mode's realtime model (D165): only checked as listed, never called, until a studio session is smoked. */
    readonly realtime?: string;
  };
  /** The examiner's voice (D117). */
  readonly voice?: string;
  readonly prices: Readonly<Record<string, ModelPrice>>;
  /** The profile's oral level descriptors in English, quoted by the report's prompt (ADR 9). */
  readonly descriptors: OralRequest["descriptors"];
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

/** A missed written-expression item for the fixed diagnostic: what a run's misses look like to the prompt. */
const missed = (
  subSkill: DiagnosticInterpretationRequest["missed"][number]["subSkill"],
  band: "B" | "C",
  stem: string,
  options: readonly [string, string, string, string],
  chosen: "a" | "b" | "c" | "d",
  key: "a" | "b" | "c" | "d",
  explanation: string,
): DiagnosticInterpretationRequest["missed"][number] => ({
  subSkill,
  band,
  type: "cloze",
  stem,
  options: options.map((text, i) => ({ id: OPTION_IDS[i] as OptionId, text })),
  chosen,
  key,
  explanation,
});

/**
 * A whole writing diagnostic, placed at B for a C target, with its twelve misses (ADR 25): the size a real
 * run's request is, so the smoke's tokens can price the feature.
 */
export const DIAGNOSTIC_RUN: DiagnosticInterpretationRequest = {
  skill: "writing",
  lang: "fr",
  feedbackLang: "en",
  targetBand: "C",
  startBand: "B",
  total: { correct: 18, attempted: 30 },
  bands: [
    { band: "B", correct: 11, attempted: 15 },
    { band: "C", correct: 7, attempted: 15 },
  ],
  subSkills: [
    { subSkill: "agreement", correct: 1, attempted: 4 },
    { subSkill: "prepositions-and-government", correct: 1, attempted: 3 },
    { subSkill: "verb-tense-and-mood", correct: 2, attempted: 4 },
    { subSkill: "pronouns", correct: 2, attempted: 3 },
    { subSkill: "connectors-and-discourse-markers", correct: 2, attempted: 3 },
    { subSkill: "register-and-formality", correct: 2, attempted: 3 },
    { subSkill: "word-choice-precision", correct: 2, attempted: 3 },
    { subSkill: "false-friends-and-anglicisms", correct: 2, attempted: 2 },
    { subSkill: "punctuation-and-mechanics", correct: 2, attempted: 2 },
    { subSkill: "sentence-structure", correct: 2, attempted: 3 },
  ],
  focus: ["agreement", "prepositions-and-government"],
  missed: [
    missed("agreement", "C", "Les rapports que la directrice a ___ hier sont prêts.", ["lu", "lus", "lue", "lues"], "a", "b", "The past participle agrees with a preceding direct object: « que » stands for « les rapports »."),
    missed("agreement", "B", "Les employées se sont ___ à l'heure.", ["présenté", "présentés", "présentée", "présentées"], "a", "d", "A pronominal verb's participle agrees with the subject here."),
    missed("agreement", "C", "Quelle que soit la décision ___, nous l'appliquerons.", ["prise", "pris", "prises", "prendre"], "b", "a", "The participle agrees with « la décision »."),
    missed("prepositions-and-government", "C", "Le comité a donné suite ___ votre demande.", ["de", "à", "sur", "pour"], "c", "b", "« Donner suite à » takes « à »."),
    missed("prepositions-and-government", "B", "Nous comptons ___ votre collaboration.", ["avec", "sur", "pour", "à"], "a", "b", "« Compter sur » takes « sur »."),
    missed("verb-tense-and-mood", "C", "Bien que le budget ___ réduit, le projet avance.", ["est", "soit", "sera", "était"], "a", "b", "« Bien que » takes the subjunctive."),
    missed("verb-tense-and-mood", "C", "Si nous avions reçu les fonds, nous ___ plus tôt.", ["commencerions", "aurions commencé", "commencions", "avions commencé"], "a", "b", "The past conditional follows a pluperfect « si » clause."),
    missed("pronouns", "C", "C'est le dossier ___ je vous ai parlé.", ["que", "dont", "lequel", "où"], "a", "b", "« Parler de » calls for « dont »."),
    missed("connectors-and-discourse-markers", "C", "Le délai est court; ___, nous devons prioriser.", ["pourtant", "par conséquent", "toutefois", "cependant"], "c", "b", "A consequence calls for « par conséquent »."),
    missed("register-and-formality", "C", "Veuillez ___ mes salutations distinguées.", ["recevoir", "agréer", "prendre", "accepter"], "a", "b", "The formal closing is « veuillez agréer »."),
    missed("word-choice-precision", "C", "Le ministère a ___ une nouvelle politique.", ["fait", "adopté", "mis", "eu"], "a", "b", "« Adopter » is the precise verb for a policy."),
    missed("sentence-structure", "C", "___ les retards, l'équipe a respecté l'échéance.", ["Malgré", "Bien que", "Même si", "Quoique"], "b", "a", "A noun follows « malgré », a clause follows « bien que »."),
  ],
};

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

/**
 * An opening turn, a follow-up after a capable answer, and a follow-up after an answer that
 * contradicts the question's premise (D176): the recorded reply is the evidence that the examiner
 * listens, and a human reads it.
 */
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
  {
    sessionType: "work",
    targetBand: "C",
    lang: "fr",
    topic: "project-management",
    phase: EXAMINER_PHASE,
    register: "escalate",
    transcript: [
      { speaker: "examiner", text: "Parlez-moi d'un projet que vous avez géré." },
      { speaker: "candidate", text: "Je n'ai jamais géré de projet ; je travaille surtout sur des dossiers de politique." },
    ],
  },
];

/**
 * The short session the nightly smoke asks a report of (D122): a work discussion at C, two spoken
 * answers with errors worth marking and a filler, and one typed. It proves the call and its shape;
 * it is too short to say anything about a report's stability, which `STABILITY_SESSION` is for
 * (D127). The level descriptors are the profile's, handed in (ADR 9).
 */
const ORAL_SESSION: Omit<OralRequest, "descriptors"> = {
  sessionType: "work",
  targetBand: "C",
  lang: "fr",
  feedbackLang: "en",
  topic: "project-management",
  phases: [
    { name: "Votre travail", intent: "Have the candidate describe their role and a recent project in detail." },
    { name: "Recul", intent: "Push for reflection: what would they do differently, and why." },
  ],
  turns: [
    { speaker: "examiner", text: "Bonjour. Parlez-moi de votre poste actuel.", phase: 0, startMs: 0, endMs: 3_000 },
    {
      speaker: "candidate",
      text: "Euh, je suis analyste principale des politiques. Je coordonne les consultations avec les provinces, et je rédige des notes pour la sous-ministre quand les dossiers devient urgents.",
      phase: 0,
      startMs: 4_500,
      endMs: 19_000,
      input: "voice",
    },
    { speaker: "examiner", text: "Décrivez un projet récent dont vous êtes fière.", phase: 0, startMs: 19_500, endMs: 22_000 },
    {
      speaker: "candidate",
      text: "L'année passée, on a modernisé le processus de demande de subventions. Le défi c'était que les régions voulait garder leurs propres formulaires, alors j'ai organisé des ateliers pour trouver un compromis.",
      phase: 0,
      startMs: 23_800,
      endMs: 41_000,
      input: "voice",
    },
    { speaker: "examiner", text: "Qu'auriez-vous fait autrement si le budget avait été réduit de moitié ?", phase: 1, startMs: 41_500, endMs: 45_000 },
    {
      speaker: "candidate",
      text: "Si le budget aurait été réduit, j'aurais priorisé les régions avec le plus de demandes et reporté le reste à l'année suivante.",
      phase: 1,
      startMs: 45_000,
      endMs: 70_000,
      input: "typed",
    },
  ],
};

/**
 * The session the stability recording scores five times (Phase 5 exit criterion 4, D127): a
 * work discussion at C of about five minutes, eight spoken answers of about 60 words each, from a
 * role and a project through a hypothetical to a policy question, with the errors and hesitations
 * a real B or C candidate makes, so the criteria are judgement calls rather than obvious. Original,
 * with no PSC material (R6), and synthetic, which D127 records plainly: a real session scored the
 * same way is the stronger evidence.
 */
const STABILITY_SESSION: Omit<OralRequest, "descriptors"> = {
  sessionType: "work",
  targetBand: "C",
  lang: "fr",
  feedbackLang: "en",
  topic: "project-management",
  phases: [
    { name: "Votre travail", intent: "Have the candidate describe their role and a recent project in detail." },
    { name: "Recul et opinion", intent: "Push for hypotheticals, trade-offs and a reasoned opinion." },
  ],
  turns: [
    { speaker: "examiner", text: "Bonjour. Pour commencer, parlez-moi de votre poste actuel.", phase: 0, startMs: 0, endMs: 0 },
    {
      speaker: "candidate",
      text: "Euh, je suis analyste principale des politiques au ministère. Je coordonne les consultations avec les provinces et les territoires, et je rédige des notes d'information pour la sous-ministre. Depuis deux ans, je travaille surtout sur le financement des programmes de formation, ce qui veut dire que je dois comprendre à la fois les chiffres et les enjeux politique.",
      phase: 0,
      startMs: 5900,
      endMs: 33519,
      input: "voice",
      pauseMs: 1900,
    },
    { speaker: "examiner", text: "Qu'est-ce qui vous plaît le plus dans ce travail ?", phase: 0, startMs: 35019, endMs: 35019 },
    {
      speaker: "candidate",
      text: "Ce que j'aime le plus, c'est quand une note que j'ai écrit aide vraiment à prendre une décision. Par exemple, l'automne dernier, on a préparé une analyse des options pour les stages rémunérés, et la sous-ministre a retenu la deuxième option presque sans changement. C'était satisfaisant de voir que le travail d'équipe avait porté fruit.",
      phase: 0,
      startMs: 40419,
      endMs: 66609,
      input: "voice",
      pauseMs: 1400,
    },
    { speaker: "examiner", text: "Décrivez un projet récent dont vous êtes fière.", phase: 0, startMs: 68109, endMs: 68109 },
    {
      speaker: "candidate",
      text: "L'année passée, on a modernisé le processus de demande de subventions. Le défi, c'était que chaque région voulait garder ses propres formulaires, et les délais de traitement était très longs, parfois six mois. J'ai organisé des ateliers avec les régions pour comprendre leurs besoins, puis on a conçu un formulaire commun avec quelques sections adaptables. Au bout d'un an, le délai moyen est passé à trois mois.",
      phase: 0,
      startMs: 74709,
      endMs: 106613,
      input: "voice",
      pauseMs: 2600,
    },
    { speaker: "examiner", text: "Comment avez-vous convaincu les régions qui résistaient ?", phase: 0, startMs: 108113, endMs: 108113 },
    {
      speaker: "candidate",
      text: "Euh, il y avait surtout une région qui craignait de perdre sa souplesse. Je les ai rencontrés plusieurs fois, et on a fait un projet pilote chez eux d'abord. Quand ils ont vu que leurs demandeurs remplissait le nouveau formulaire plus vite, ils ont accepté. Je pense que c'est important d'écouter avant de proposer une solution.",
      phase: 0,
      startMs: 114313,
      endMs: 140979,
      input: "voice",
      pauseMs: 2200,
    },
    { speaker: "examiner", text: "Qu'auriez-vous fait autrement si le budget du projet avait été réduit de moitié ?", phase: 1, startMs: 142479, endMs: 142479 },
    {
      speaker: "candidate",
      text: "Si le budget aurait été réduit de moitié, j'aurais priorisé les deux régions qui recevaient le plus de demandes, et j'aurais reporté les autres à l'année suivante. J'aurais aussi réutilisé les outils numériques qu'on avait déjà au lieu d'en acheter de nouveaux. Ce serait moins ambitieux, mais on aurait quand même des résultats mesurables.",
      phase: 1,
      startMs: 149579,
      endMs: 175293,
      input: "voice",
      pauseMs: 3100,
    },
    { speaker: "examiner", text: "Selon vous, faut-il toujours consulter les parties prenantes avant une décision, même quand le temps presse ?", phase: 1, startMs: 176793, endMs: 176793 },
    {
      speaker: "candidate",
      text: "C'est une bonne question. Je crois qu'il faut consulter, mais la forme peut changer selon l'urgence. Quand le temps presse, on peut faire une consultation ciblée avec les groupes les plus touchés, plutôt qu'une grande consultation publique. Le risque, sinon, c'est de prendre une décision qui sera contestée plus tard, et on perd encore plus de temps à la corriger.",
      phase: 1,
      startMs: 184193,
      endMs: 212764,
      input: "voice",
      pauseMs: 3400,
    },
    { speaker: "examiner", text: "Et si deux groupes consultés ont des positions opposées ?", phase: 1, startMs: 214264, endMs: 214264 },
    {
      speaker: "candidate",
      text: "Dans ce cas, euh, je présenterais les deux positions de façon neutre dans la note, avec les conséquences de chaque option. Ce n'est pas à moi de trancher, c'est la décision de la haute direction. Mais je peux proposer des mesures d'atténuation pour le groupe qui serait moins favorisé, pour que la décision soit plus facile à accepter.",
      phase: 1,
      startMs: 220764,
      endMs: 248383,
      input: "voice",
      pauseMs: 2500,
    },
    { speaker: "examiner", text: "Pour terminer, comment vous voyez-vous dans cinq ans ?", phase: 1, startMs: 249883, endMs: 249883 },
    {
      speaker: "candidate",
      text: "Dans cinq ans, j'aimerais gérer une petite équipe d'analystes. J'ai déjà encadré deux étudiants cet été, et j'ai trouvé ça très enrichissant. Je voudrais aussi améliorer mon français à l'oral, surtout pour les réunions avec les partenaires francophones, parce que je me sens encore moins à l'aise quand la discussion devient très technique.",
      phase: 1,
      startMs: 255683,
      endMs: 280921,
      input: "voice",
      pauseMs: 1800,
    },
  ],
};

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

/**
 * The machinery both runs share: the vault holding the key, the ledger, the tee on `fetch`, and
 * `call`, one metered call with its completions kept.
 */
const recorder = async (deps: Pick<LiveSmokeDeps, "apiKey" | "models" | "voice" | "prices" | "now" | "fetchImpl">) => {
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
  return { now, ai, ledger, seen, completions, billed, call, startedAt };
};

export const runLiveSmoke = async (deps: LiveSmokeDeps): Promise<LiveSmokeResult> => {
  const { now, ai, ledger, seen, completions, billed, call, startedAt } = await recorder(deps);

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
      byFeature: {
        "writing-feedback": nothing,
        "item-generation": nothing,
        "oral-practice": nothing,
        "oral-assessment": nothing,
        "oral-studio": nothing,
        "diagnostic-interpretation": nothing,
      },
      byMethod: {
        generateItems: empty,
        reviewItem: empty,
        assessWriting: empty,
        examinerTurn: empty,
        transcribe: empty,
        speak: empty,
        assessOral: empty,
        interpretDiagnostic: empty,
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
  const session: OralRequest = { ...ORAL_SESSION, descriptors: deps.descriptors };
  await call("oral-assessment", "assessOral", session, (p) => p.assessOral(session));
  await call("diagnostic-interpretation", "interpretDiagnostic", DIAGNOSTIC_RUN, (p) =>
    p.interpretDiagnostic(DIAGNOSTIC_RUN),
  );

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
      "oral-assessment": measure("oral-assessment"),
      "oral-studio": measure("oral-studio"),
      "diagnostic-interpretation": measure("diagnostic-interpretation"),
    },
    byMethod: {
      generateItems: average("generateItems"),
      reviewItem: average("reviewItem"),
      assessWriting: average("assessWriting"),
      examinerTurn: average("examinerTurn"),
      transcribe: average("transcribe"),
      speak: average("speak"),
      assessOral: average("assessOral"),
      interpretDiagnostic: average("interpretDiagnostic"),
    },
    missingModels,
    completions,
  };
};

/** How many times the stability recording scores the one session: Phase 5 exit criterion 4's five. */
export const ORAL_STABILITY_RUNS = 5;

export type OralStabilityResult = {
  readonly startedAt: string;
  readonly calls: readonly CostEntry[];
  readonly completions: readonly RecordedCompletion[];
  /** Calls whose every reply the adapter refused; their completions are kept, marked refused (D127). */
  readonly failedCalls: number;
};

/**
 * The scoring-stability recording (Phase 5 exit criterion 4, progress.md D126): the same fixed
 * session, `STABILITY_SESSION`, scored `ORAL_STABILITY_RUNS` times through the path the browser takes,
 * one call after another, its completions kept. A call the adapter refuses twice is kept and
 * counted, not a reason to stop, so the eval sees it as a failed run (D127). The factory's eval reads
 * the file it becomes and reports how far the bands moved. It makes no other call.
 */
export const runOralStability = async (
  deps: Pick<LiveSmokeDeps, "apiKey" | "models" | "prices" | "descriptors" | "now" | "fetchImpl">,
): Promise<OralStabilityResult> => {
  const { ledger, completions, call, startedAt } = await recorder(deps);
  const session: OralRequest = { ...STABILITY_SESSION, descriptors: deps.descriptors };
  let failedCalls = 0;
  for (let run = 0; run < ORAL_STABILITY_RUNS; run += 1) {
    try {
      await call("oral-assessment", "assessOral", session, (p) => p.assessOral(session));
    } catch (error) {
      // A report the adapter refused twice is evidence about the scorer, kept for the eval (D127).
      // Anything else, a refused key or an unreachable service, says nothing about it: stop.
      if (!(error instanceof Error) || error.name !== "InvalidResponseError") throw error;
      failedCalls += 1;
    }
  }
  return { startedAt, calls: await ledger.since(startedAt), completions, failedCalls };
};
