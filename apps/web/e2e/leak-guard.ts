import { readFile } from "node:fs/promises";

import { type BrowserContext, type Download, expect, type Page } from "@playwright/test";

/**
 * The tier-11 key-leak guard (implementation-plan.md §6.2, Phase 4 exit criterion 1, [R12]).
 * Not a spec file: `key-leak.spec.ts` (hermetic) and `key-leak-production.spec.ts` (real
 * IndexedDB and the service worker) set {@link SENTINEL} through the UI, drive the journeys,
 * and then ask this guard whether the sentinel escaped.
 *
 * It watches from outside the page, through the browser context, so nothing the app does
 * can route around it: every request (the service worker's included), every same-origin API
 * response, every WebSocket frame, every console message and every uncaught error. Then it
 * dumps what the page holds at rest: both Web Storage areas, every IndexedDB store row by row,
 * the Cache Storage URLs, the DOM, and every field's live value.
 *
 * The one place the sentinel may appear is a request to `api.openai.com` (§6.3), and
 * {@link LeakWatch.openAiAuthorizations} lets a spec prove it did, so the guard can never pass
 * because the key was never in play.
 *
 * Writing workshop submissions are held to R12 the same way (progress.md D105–D108): a spec
 * writes {@link SUBMISSION_SENTINEL} into its text, and `assertNoLeak`'s `deviceOnly` lets it
 * appear only on this device (the page, a field, the `writingSubmissions` store) and in a
 * request to OpenAI, which {@link LeakWatch.openAiBodies} proves it reached.
 *
 * Runtime-generated items are held the same way (progress.md D110): the stubbed draft carries
 * {@link GENERATED_SENTINEL} in every stem, and `deviceOnly` lets it sit on this device (the
 * page, the `generated` store) and go back to OpenAI in a review request, and nowhere else.
 *
 * Spoken practice's audio and transcripts too (Phase 5 exit criterion 3, progress.md D120).
 * {@link installFakeAudio} stands in for `MediaRecorder`, so every recorder's bytes carry
 * {@link AUDIO_SENTINEL} and its own number ({@link recorderMarker}): a clip and the session
 * recording can be told apart. OpenAI bodies are read as bytes, so a multipart upload is visible
 * ({@link LeakWatch.openAiRequests}), and a `Blob` in IndexedDB is dumped as its bytes. The stubbed
 * transcription carries {@link TRANSCRIPT_SENTINEL}, which may stay on this device (the page, the
 * `oralSessions` store) and go back to OpenAI in the examiner's next request, and nowhere else.
 */

/** A syntactically plausible key that no real account holds, and that nothing else contains. */
export const SENTINEL = "sk-palier-sentinel-5e17c0de9a1b4f6e8d2c7b3a";

/**
 * A word a spec writes into a workshop submission, so the guard can follow the text. Like the
 * key, it may reach OpenAI; unlike the key, it may also sit on the device it was written on.
 */
export const SUBMISSION_SENTINEL = "Quenouillard5e17";

/**
 * A word the stubbed draft writes into every generated stem (D110), so the guard can follow the
 * items. They were made on this device, may stay on it and go to OpenAI for review, and nothing more.
 */
export const GENERATED_SENTINEL = "Brindillard7c42";

/**
 * What every recorder's bytes carry in place of audio (D120), numbered by recorder so a clip and
 * the session recording can be told apart: the screen makes the session's recorder first.
 */
export const AUDIO_SENTINEL = "Ondulard9d3a";

/** The bytes the `n`th recorder made on a page. */
export const recorderMarker = (n: number): string => `[${AUDIO_SENTINEL}#${String(n)}]`;

/** A word the stubbed transcription writes into every answer (D120), so the guard can follow the transcript. */
export const TRANSCRIPT_SENTINEL = "Grelottard3b8e";

/**
 * A word the stubbed oral report writes into its correction (D126), so the guard can follow the
 * report: it arrives from OpenAI, is kept on this device (the page, the `oralSessions` store) and
 * goes nowhere else.
 */
export const REPORT_SENTINEL = "Pimprenellard6f21";

/** The question the stubbed examiner asks. */
export const EXAMINER_QUESTION = "Pouvez-vous me décrire votre poste actuel ?";

/**
 * What the fake realtime examiner says (D188): a question per response, in order, and the question again when
 * the candidate asks for it. Its candidate answers once, with {@link TRANSCRIPT_SENTINEL} in the words, as the
 * transcription would hear them.
 */
export const STUDIO_EXAMINER = [EXAMINER_QUESTION, "Quel est le plus grand défi de votre équipe cette année ?"] as const;
export const STUDIO_REPEATED = "Bien sûr. Je répète : pouvez-vous me décrire votre poste actuel ?";
export const STUDIO_ANSWER = `Je coordonne les consultations avec les provinces, ${TRANSCRIPT_SENTINEL}.`;

/** The only origin the key may reach (architecture.md §6.3). */
const OPENAI_ORIGIN = "https://api.openai.com";

/**
 * The end-to-end test's own secret endpoint (progress.md D192), `e2e/selfhost-server.mjs`, which the Playwright config
 * starts. Not 3200, which Lighthouse holds (D90).
 */
export const SELFHOST_PORT = 3300;
export const SELFHOST_ORIGIN = `http://localhost:${String(SELFHOST_PORT)}`;
/** This origin's one route that may see the key (ADR 3, D169). */
const REALTIME_SECRET_ROUTE = "/api/realtime/secret";

/**
 * `onDevice` marks a place that is this device's own copy: the page as drawn, a field's
 * value, the workshop's store and the generated items' store. A submission or a generated item
 * may be there, and nowhere else but OpenAI.
 */
type Seen = { readonly where: string; readonly text: string; readonly onDevice?: boolean };

export type LeakCheck = {
  /** Text that may stay on this device and go to OpenAI, and must reach nowhere else. */
  readonly deviceOnly?: readonly string[];
  /** Text that must be nowhere at all: not sent, not stored, not on the page. */
  readonly nowhere?: readonly string[];
};

export type LeakWatch = {
  /** Every `authorization` header sent to OpenAI: the positive control. */
  readonly openAiAuthorizations: () => readonly string[];
  /** Every request body sent to OpenAI, so a spec can prove a submission went there. */
  readonly openAiBodies: () => readonly string[];
  /** Every request to OpenAI, its path and its body read as bytes, so a spec can say where audio went (D120). */
  readonly openAiRequests: () => readonly { readonly path: string; readonly body: string }[];
  /**
   * Every `authorization` header sent to this origin's realtime secret route (ADR 3, D169): the one
   * place on this origin the key may go, and the positive control that it went there.
   */
  readonly realtimeSecretAuthorizations: () => readonly string[];
  /** How many posts reached the realtime secret route with no `authorization` at all: the screen's warm-ups (D190). */
  readonly realtimeSecretWarmups: () => number;
  /**
   * Every `authorization` header sent to OpenAI's `/v1/realtime/calls` (D171, D188): the studio screen's dial,
   * which must carry the short-lived `ek_` secret and never the key. Kept apart from
   * `openAiAuthorizations`, which are the key's own uses.
   */
  readonly realtimeCallAuthorizations: () => readonly string[];
  /**
   * Every `authorization` header the user's own secret endpoint was sent (D192), when the watch was told its origin:
   * the popup's mint, on the endpoint's own origin. The one other place, besides the route, the key may go, and only
   * when the user has pointed studio mode there.
   */
  readonly selfHostedAuthorizations: () => readonly string[];
  /** Every page the context opened after the first: the endpoint's popup, for a spec to look at. */
  readonly popupUrls: () => readonly string[];
  /**
   * Fail, naming the place, if the sentinel is anywhere but a request to OpenAI, the realtime
   * secret route's `authorization` header (D169) or the user's own endpoint's (D192), if a
   * `deviceOnly` text left the device other than for OpenAI, or if a `nowhere` text is anywhere.
   */
  readonly assertNoLeak: (pages: readonly Page[], check?: LeakCheck) => Promise<void>;
};

/** A stubbed answer: JSON, or, with a `contentType`, `body` sent as it is (a voice's audio, D120). */
export type OpenAiAnswer = { status: number; body: unknown; contentType?: string };

/** OpenAI's model list, the answer `/settings/key`'s check reads. */
export const MODELS_ANSWER: OpenAiAnswer = {
  status: 200,
  body: { object: "list", data: [{ id: "gpt-stub", object: "model" }] },
};

const criterion = { band: "B", evidence: "Le ton convient à un message de service." };

/**
 * A chat completion carrying writing feedback, in the shape the adapter reads (D105). Every
 * excerpt must be words of the text sent, or the adapter refuses the answer; with none, it
 * fits any text.
 */
export const feedbackAnswer = (
  errors: readonly { excerpt: string; correction: string; rule: string }[] = [],
  modelAnswer = "Madame, Monsieur, je vous informe que votre demande est en cours de traitement.",
): OpenAiAnswer => ({
  status: 200,
  body: {
    choices: [
      {
        message: {
          content: JSON.stringify({
            criteria: { register: criterion, structure: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
            errors,
            modelAnswer,
          }),
        },
      },
    ],
    usage: { prompt_tokens: 2_400, completion_tokens: 1_900 },
  },
});

/** A chat completion carrying `content` as the model's JSON reply, billed as `usage`. */
const completion = (content: unknown, promptTokens: number, completionTokens: number): OpenAiAnswer => ({
  status: 200,
  body: {
    choices: [{ message: { content: JSON.stringify(content) } }],
    usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens },
  },
});

/** Every message's content in a chat-completion request body, joined, or "" when it has none. */
export const promptOf = (body: string): string => {
  try {
    const parsed = JSON.parse(body) as { messages?: readonly { content?: unknown }[] };
    return (parsed.messages ?? []).map((m) => (typeof m.content === "string" ? m.content : "")).join("\n");
  } catch {
    return "";
  }
};

const asked = (prompt: string, pattern: RegExp, fallback: string): string => pattern.exec(prompt)?.[1] ?? fallback;

/**
 * A draft answering a generation prompt (D110): the count, type, sub-skill, band and topic it
 * asked for, each stem carrying {@link GENERATED_SENTINEL} and each right answer starting "RIGHT".
 */
export const generatedItemsAnswer = (body: string): OpenAiAnswer => {
  const prompt = promptOf(body);
  const type = asked(prompt, /of type "([a-z-]+)"/, "error-id");
  const count = Number(asked(prompt, /Produce (\d+) item/, "1"));
  const items = Array.from({ length: count }, (_, i) => ({
    type,
    stem: { en: `Choose the right form (${i + 1}).`, fr: `Choisissez la bonne forme (${i + 1}) : ${GENERATED_SENTINEL}.` },
    ...(type === "cloze" ? { blankIndex: 0 } : {}),
    options: [
      { id: "a", text: `RIGHT ${i + 1}`, rationale: { en: "It agrees with the subject.", fr: "Il s’accorde avec le sujet." } },
      { id: "b", text: `faux ${i + 1} b`, rationale: { en: "It does not agree.", fr: "Il ne s’accorde pas." } },
      { id: "c", text: `faux ${i + 1} c`, rationale: { en: "The wrong mood.", fr: "Le mauvais mode." } },
      { id: "d", text: `faux ${i + 1} d`, rationale: { en: "The wrong tense.", fr: "Le mauvais temps." } },
    ],
    key: "a",
    explanation: { en: "The participle agrees with its subject.", fr: "Le participe s’accorde avec son sujet." },
    subSkill: asked(prompt, /sub-skill "([a-z-]+)"/, "agreement"),
    targetBand: asked(prompt, /band ([ABC])\b/, "C"),
    topic: asked(prompt, /topic "([a-z-]+)"/, "finance-and-budgets"),
  }));
  return completion({ items }, 383, 1_262);
};

/** An honest review (D110): it chooses the "RIGHT" option wherever the key was moved to. */
export const reviewAnswer = (body: string): OpenAiAnswer => {
  const prompt = promptOf(body);
  return completion(
    {
      chosenKey: asked(prompt, /^([abcd])\) RIGHT/m, "a"),
      confidence: 0.93,
      defensibleDistractors: [],
      optionCases: { a: "case a", b: "case b", c: "case c", d: "case d" },
      registerFlag: { flagged: false },
      estimatedBand: asked(prompt, /intended band ([ABC])/, "C"),
    },
    293,
    598,
  );
};

/** The practice examiner's next question (D117), with no difficulty flag. */
export const examinerAnswer = (): OpenAiAnswer => completion({ text: EXAMINER_QUESTION, difficulty: null }, 1_180, 36);

/** A transcription (D120): every answer is heard as words carrying {@link TRANSCRIPT_SENTINEL}. */
export const transcriptionAnswer = (): OpenAiAnswer => ({
  status: 200,
  body: { text: `Je coordonne les consultations avec les provinces, ${TRANSCRIPT_SENTINEL}.` },
});

/** A voice (D120): bytes under an audio type. No browser needs to play them for the words to be on screen. */
export const speechAnswer = (): OpenAiAnswer => ({ status: 200, contentType: "audio/mpeg", body: "ID3-stub-voice" });

/**
 * A report on a spoken session (D126), fitted to the transcript in the request: the candidate's
 * first turn with words carries its error and every missing word, quoted from it, so the adapter
 * places them. The correction carries {@link REPORT_SENTINEL}.
 */
export const oralReportAnswer = (body: string): OpenAiAnswer => {
  // Each turn's words arrive as a JSON string (D127), so the first word follows the opening quotation mark.
  const said = /\[(\d+)\] Candidate(?: \(typed\))?: "([^\s"\\]+)/u.exec(promptOf(body));
  const turn = Number(said?.[1] ?? 0);
  const excerpt = said?.[2] ?? "";
  const word = { word: "piloter", turn, excerpt, example: "Je pilote les consultations avec les provinces." };
  const fix = (subSkill: string, advice: string) => ({ criterion: "grammar", subSkill, advice, evidence: excerpt });
  return completion(
    {
      criteria: { comprehension: criterion, fluency: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
      fixes: [
        fix("agreement", "Accordez le verbe avec son sujet."),
        fix("word-choice-precision", "Choisissez le mot le plus précis."),
        fix("inference", "Répondez à ce qui est sous-entendu."),
      ],
      missingWords: [word, word, word, word, word],
      errors: [{ turn, excerpt, correction: `${excerpt} ${REPORT_SENTINEL}`, rule: "précision" }],
    },
    3_050,
    1_240,
  );
};

/** Which completion a request is: a generation draft, a review, the examiner, an oral report, or (otherwise) writing feedback. */
export const completionKind = (body: string): "draft" | "review" | "examiner" | "oral-report" | "feedback" => {
  const prompt = promptOf(body);
  if (/Produce \d+ item\(s\)/.test(prompt)) return "draft";
  if (prompt.includes("adversarial reviewer")) return "review";
  if (prompt.includes("You are the examiner")) return "examiner";
  if (prompt.includes("assessing a rehearsal")) return "oral-report";
  return "feedback";
};

/** The default completion for each kind: a set that passes, a question, and feedback that fits any text. */
export const defaultCompletion = (body: string): OpenAiAnswer => {
  const kind = completionKind(body);
  if (kind === "draft") return generatedItemsAnswer(body);
  if (kind === "review") return reviewAnswer(body);
  if (kind === "examiner") return examinerAnswer();
  if (kind === "oral-report") return oralReportAnswer(body);
  return feedbackAnswer();
};

/** The realtime call's answer (D188): SDP, as `/v1/realtime/calls` gives, for the fake peer to take. */
export const realtimeCallAnswer = (): OpenAiAnswer => ({ status: 201, contentType: "application/sdp", body: "v=0\r\no=- fake-answer\r\n" });

/** The default answer to any OpenAI path: a completion, a transcription, a voice, a realtime call, or the model list. */
export const defaultAnswer = (path: string, body: string): OpenAiAnswer => {
  if (path.endsWith("/chat/completions")) return defaultCompletion(body);
  if (path.endsWith("/realtime/calls")) return realtimeCallAnswer();
  if (path.endsWith("/audio/transcriptions")) return transcriptionAnswer();
  if (path.endsWith("/audio/speech")) return speechAnswer();
  return MODELS_ANSWER;
};

/**
 * A request body as text, twice over: its bytes read as latin1, so a multipart upload's bytes show as the
 * ASCII they carry, and as UTF-8, so accented text matches as written (D121).
 */
const bodyOf = (request: { postDataBuffer: () => Buffer | null }): string => {
  const bytes = request.postDataBuffer();
  return bytes === null ? "" : `${bytes.toString("latin1")}\n${bytes.toString("utf8")}`;
};

/** A request body as UTF-8 text, for a stub that reads its JSON. */
const utf8Of = (request: { postDataBuffer: () => Buffer | null }): string => request.postDataBuffer()?.toString("utf8") ?? "";

/**
 * A needle and its base64 forms (D121). Audio put in JSON (a push, an export, Web Storage) is
 * base64, and a needle's bytes land at any of three alignments against base64's 3-byte groups,
 * so each alignment's whole groups are a substring any encoding of the needle contains.
 */
export const encodedForms = (needle: string): string[] => {
  const bytes = Buffer.from(needle, "utf8");
  const forms = [0, 1, 2].map((skip) => {
    const rest = bytes.subarray(skip);
    return rest.subarray(0, rest.length - (rest.length % 3)).toString("base64");
  });
  return [needle, ...forms.filter((form) => form.length >= 8)];
};

/**
 * Stub OpenAI: the models endpoint `/settings/key` checks, the completions the workshop, the
 * fresh-set screen and the practice examiner ask for, and spoken practice's transcription and
 * voice (D120). It answers CORS like the real API, because the browser calls it cross-origin.
 * `answer` sees the request's path and body, so a spec can script a failure for one call, or tell
 * a draft from a review ({@link completionKind}).
 */
export const stubOpenAi = async (
  context: BrowserContext,
  answer: (path: string, body: string) => OpenAiAnswer = defaultAnswer,
) => {
  await context.route(`${OPENAI_ORIGIN}/**`, async (route) => {
    const cors = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, content-type",
      "access-control-allow-methods": "GET, POST, OPTIONS",
    };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const { status, body, contentType } = answer(new URL(route.request().url()).pathname, utf8Of(route.request()));
    if (contentType !== undefined) {
      return route.fulfill({ status, headers: { ...cors, "content-type": contentType }, body: String(body) });
    }
    return route.fulfill({ status, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify(body) });
  });
};

/**
 * Stand in for the microphone and `MediaRecorder` on every page of `context` (D120).
 *
 * - **The microphone** is a Web Audio oscillator's stream, so the level check reads a real signal
 *   through a real `AnalyserNode`. Chromium's own fake capture device (`--use-fake-device-for-media-
 *   stream`) never answers `getUserMedia` on macOS, so a spec cannot rely on it.
 * - **Each recorder**, numbered in the order the page makes them, hands over one chunk when it
 *   stops: {@link recorderMarker} of its number, as `audio/webm`. So the guard can follow a clip and
 *   the session recording by their bytes.
 */
export const installFakeAudio = async (context: BrowserContext) => {
  await context.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const audio = new AudioContext();
      await audio.resume().catch(() => undefined);
      const tone = audio.createOscillator();
      const out = audio.createMediaStreamDestination();
      tone.connect(out);
      tone.start();
      return out.stream;
    };
  });
  await context.addInitScript((mark: string) => {
    let made = 0;
    class FakeMediaRecorder {
      static isTypeSupported(type: string): boolean {
        return type.startsWith("audio/webm");
      }
      readonly mimeType: string;
      state: "inactive" | "recording" | "paused" = "inactive";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      private readonly n: number;
      constructor(_stream: MediaStream, options?: { mimeType?: string }) {
        made += 1;
        this.n = made;
        this.mimeType = options?.mimeType ?? "audio/webm";
      }
      start() {
        this.state = "recording";
      }
      pause() {
        if (this.state === "recording") this.state = "paused";
      }
      resume() {
        if (this.state === "paused") this.state = "recording";
      }
      stop() {
        if (this.state === "inactive") return;
        this.state = "inactive";
        const data = new Blob([`[${mark}#${String(this.n)}]`], { type: this.mimeType });
        setTimeout(() => {
          this.ondataavailable?.({ data });
          this.onstop?.();
        }, 0);
      }
    }
    Object.defineProperty(window, "MediaRecorder", { value: FakeMediaRecorder, configurable: true, writable: true });
  }, AUDIO_SENTINEL);
};

/**
 * Stand in for WebRTC on every page of `context` (Phase 6 Slice 2, D171, D188): an `RTCPeerConnection` whose
 * data channel plays a short scripted examiner, so the studio screen runs its real transport, its real secret
 * route and its real call to `/v1/realtime/calls` (stubbed by {@link stubOpenAi}), with no test code in the
 * bundle.
 *
 * - The channel opens once the answer is set, and the examiner's voice arrives as an oscillator's stream.
 * - Each `response.create` gets a whole response: a transcript, then `response.done` with usage, so the
 *   ledger is written. A user message before it (the repeat control) makes it {@link STUDIO_REPEATED}.
 * - After the first question, the candidate answers once, heard as {@link STUDIO_ANSWER}, and the examiner
 *   takes a note and asks the next question, as the API's own turn detection would have it.
 * - Every message the page sends is kept on `window.__palierRealtimeSent`, for the spec to read.
 */
export const installFakeRealtime = async (context: BrowserContext) => {
  await context.addInitScript(
    ({ questions, repeated, answer }: { questions: readonly string[]; repeated: string; answer: string }) => {
      type Listener<T> = ((event: T) => void) | null;
      const sent: Record<string, unknown>[] = [];
      Object.defineProperty(window, "__palierRealtimeSent", { value: sent, configurable: true });
      const usage = {
        input_tokens: 400,
        output_tokens: 200,
        input_token_details: { text_tokens: 300, audio_tokens: 100, cached_tokens: 0, cached_tokens_details: {} },
        output_token_details: { text_tokens: 40, audio_tokens: 160 },
      };

      class FakeChannel {
        readyState: "connecting" | "open" | "closed" = "connecting";
        onopen: Listener<Event> = null;
        onclose: Listener<Event> = null;
        onmessage: Listener<MessageEvent> = null;
        private responses = 0;
        private asked = 0;
        private answered = false;
        private repeat = false;
        constructor(readonly label: string) {}
        open() {
          this.readyState = "open";
          this.onopen?.(new Event("open"));
        }
        emit(event: Record<string, unknown>) {
          if (this.readyState === "open") this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(event) }));
        }
        send(message: string) {
          const event = JSON.parse(message) as { type?: string; item?: { type?: string; role?: string } };
          sent.push(event as Record<string, unknown>);
          if (event.type === "conversation.item.create" && event.item?.type === "message" && event.item.role === "user") this.repeat = true;
          if (event.type === "response.create") setTimeout(() => this.speak(), 30);
        }
        close() {
          this.readyState = "closed";
        }
        private speak() {
          this.responses += 1;
          const item = `e${String(this.responses)}`;
          const words = this.repeat ? repeated : (questions[Math.min(this.asked, questions.length - 1)] ?? "");
          const repeating = this.repeat;
          this.repeat = false;
          if (!repeating) this.asked += 1;
          this.emit({ type: "response.created", response: { id: `r${String(this.responses)}` } });
          this.emit({ type: "response.output_audio_transcript.delta", item_id: item, delta: words });
          this.emit({ type: "response.output_audio_transcript.done", item_id: item, transcript: words });
          this.emit({ type: "response.done", response: { output: [{ type: "message" }], usage } });
          if (!repeating && !this.answered) setTimeout(() => this.answer(), 50);
        }
        private answer() {
          this.answered = true;
          this.emit({ type: "input_audio_buffer.speech_started", item_id: "c1" });
          this.emit({ type: "input_audio_buffer.speech_stopped", item_id: "c1" });
          this.emit({
            type: "conversation.item.input_audio_transcription.completed",
            item_id: "c1",
            transcript: answer,
            usage: { type: "duration", seconds: 3 },
          });
          this.emit({
            type: "response.function_call_arguments.done",
            call_id: "k1",
            name: "note_observation",
            arguments: JSON.stringify({ criterion: "vocabulary", evidence: "« coordonne » répété", severity: "minor" }),
          });
          setTimeout(() => this.speak(), 30);
        }
      }

      class FakePeerConnection {
        connectionState: "new" | "connected" | "closed" = "new";
        ontrack: Listener<{ streams: MediaStream[] }> = null;
        onconnectionstatechange: Listener<Event> = null;
        private channel: FakeChannel | null = null;
        addTrack() {
          return {};
        }
        createDataChannel(label: string) {
          this.channel = new FakeChannel(label);
          return this.channel;
        }
        createOffer() {
          return Promise.resolve({ type: "offer", sdp: "v=0\r\no=- fake-offer\r\n" });
        }
        setLocalDescription() {
          return Promise.resolve();
        }
        setRemoteDescription() {
          setTimeout(() => {
            if (this.connectionState === "closed") return;
            this.connectionState = "connected";
            const audio = new AudioContext();
            const tone = audio.createOscillator();
            const out = audio.createMediaStreamDestination();
            tone.connect(out);
            tone.start();
            this.ontrack?.({ streams: [out.stream] });
            this.channel?.open();
          }, 10);
          return Promise.resolve();
        }
        close() {
          this.connectionState = "closed";
          this.channel?.close();
        }
      }
      Object.defineProperty(window, "RTCPeerConnection", { value: FakePeerConnection, configurable: true, writable: true });
    },
    { questions: [...STUDIO_EXAMINER], repeated: STUDIO_REPEATED, answer: STUDIO_ANSWER },
  );
};

/** Every message the studio screen sent the fake realtime examiner on `page` (D188). */
export const realtimeSent = (page: Page): Promise<readonly Record<string, unknown>[]> =>
  page.evaluate(() => [...((window as unknown as { __palierRealtimeSent?: Record<string, unknown>[] }).__palierRealtimeSent ?? [])]);

/**
 * Start watching a context. Call it before the first page opens. `selfHostedOrigin` is the user's own secret endpoint,
 * when the spec points studio mode at one (D192): a `POST` there may carry the key in `authorization`, and nowhere else.
 */
export const watchForLeaks = (context: BrowserContext, { selfHostedOrigin }: { readonly selfHostedOrigin?: string } = {}): LeakWatch => {
  const seen: Seen[] = [];
  const pending: Promise<unknown>[] = [];
  const authorizations: string[] = [];
  const openAiRequests: { path: string; body: string }[] = [];
  const realtimeSecretAuthorizations: string[] = [];
  const realtimeCallAuthorizations: string[] = [];
  const selfHostedAuthorizations: string[] = [];
  const popupUrls: string[] = [];
  let realtimeSecretWarmups = 0;

  // Headers are read as sent, synchronously: `allHeaders()` waits for a response, and a
  // request a reload aborts never gets one. Every header a page sets is among them.
  context.on("request", (request) => {
    const url = request.url();
    const headers = request.headers();
    if (url.startsWith(OPENAI_ORIGIN)) {
      // The studio screen's dial carries a short-lived secret, never the key (D171): recorded apart, so a
      // spec can say which it was and every other authorization stays the key's own.
      const toCalls = new URL(url).pathname.endsWith("/realtime/calls");
      if (headers.authorization !== undefined) (toCalls ? realtimeCallAuthorizations : authorizations).push(headers.authorization);
      if (request.method() !== "OPTIONS") openAiRequests.push({ path: new URL(url).pathname, body: bodyOf(request) });
      return;
    }
    seen.push({ where: `request URL ${url}`, text: url });
    // The realtime secret route may carry the key in `authorization` and nowhere else (ADR 3, D169):
    // that one header is recorded apart, and its URL, its other headers, its body and its answer are
    // still searched like any other request's.
    const { authorization, ...others } = headers;
    const toRealtimeSecret = new URL(url).pathname === REALTIME_SECRET_ROUTE && request.method() === "POST";
    if (toRealtimeSecret && authorization !== undefined) realtimeSecretAuthorizations.push(authorization);
    if (toRealtimeSecret && authorization === undefined) realtimeSecretWarmups += 1;
    // The user's own endpoint (D192) is allowed the same narrow exception, on its own origin, when the spec named it.
    const toSelfHosted = selfHostedOrigin !== undefined && new URL(url).origin === selfHostedOrigin && request.method() === "POST";
    if (toSelfHosted && authorization !== undefined) selfHostedAuthorizations.push(authorization);
    seen.push({ where: `request headers ${url}`, text: JSON.stringify(toRealtimeSecret || toSelfHosted ? others : headers) });
    seen.push({ where: `request body ${url}`, text: bodyOf(request) });
  });
  // What our own server sends back: a pull would show the key if a push had stored it. Read
  // once the body has fully arrived, so reading it can never hang.
  context.on("requestfinished", (request) => {
    const url = new URL(request.url());
    if (url.origin === OPENAI_ORIGIN || !url.pathname.startsWith("/api/")) return;
    pending.push(
      request
        .response()
        .then((response) => response?.text())
        .then((text) => seen.push({ where: `response body ${url.href}`, text: text ?? "" }))
        .catch(() => undefined),
    );
  });
  context.on("console", (message) => seen.push({ where: "console", text: message.text() }));
  context.on("weberror", (error) =>
    seen.push({ where: "uncaught error", text: `${error.error().message}\n${error.error().stack ?? ""}` }),
  );
  const watchSockets = (page: Page) =>
    page.on("websocket", (socket) =>
      socket.on("framesent", (frame) => seen.push({ where: `websocket ${socket.url()}`, text: String(frame.payload) })),
    );
  context.pages().forEach(watchSockets);
  context.on("page", watchSockets);
  context.on("page", (page) => {
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame() && page.url() !== "about:blank") popupUrls.push(page.url());
    });
  });

  return {
    openAiAuthorizations: () => authorizations,
    openAiBodies: () => openAiRequests.map((request) => request.body),
    openAiRequests: () => openAiRequests,
    realtimeSecretAuthorizations: () => realtimeSecretAuthorizations,
    realtimeCallAuthorizations: () => realtimeCallAuthorizations,
    realtimeSecretWarmups: () => realtimeSecretWarmups,
    selfHostedAuthorizations: () => selfHostedAuthorizations,
    popupUrls: () => popupUrls,
    assertNoLeak: async (pages, { deviceOnly = [], nowhere = [] } = {}) => {
      await Promise.all(pending);
      // This call's own dump, so an earlier check's page does not answer for this one.
      const places = [...seen];
      for (const page of pages) places.push(...(await atRest(page)));
      // Each needle is looked for as written and in base64, as audio in JSON would be (D121).
      const found = (needle: string, where: readonly Seen[]) => {
        const forms = encodedForms(needle);
        return where.filter((s) => forms.some((form) => s.text.includes(form))).map((s) => s.where);
      };
      expect(found(SENTINEL, places), "the sentinel key reached somewhere other than OpenAI").toEqual([]);
      for (const needle of deviceOnly) {
        const offDevice = places.filter((s) => s.onDevice !== true);
        expect(found(needle, offDevice), `"${needle}" reached somewhere other than OpenAI and its own copy on this device`).toEqual([]);
      }
      for (const needle of nowhere) {
        expect(found(needle, places), `"${needle}" is somewhere it should never be`).toEqual([]);
      }
    },
  };
};

/** Everything the page holds, rendered to text. Runs in the browser. */
const atRest = (page: Page): Promise<Seen[]> =>
  page.evaluate(async () => {
    const out: { where: string; text: string; onDevice?: boolean }[] = [];
    // Bytes read as latin1, so plaintext stored as bytes shows up as the ASCII it is.
    const bytes = (view: Uint8Array) => Array.from(view, (b) => String.fromCharCode(b)).join("");
    // A `Blob` (a recording, D120) is read for its bytes before rendering, which is synchronous.
    const unblob = async (value: unknown): Promise<unknown> => {
      if (value instanceof Blob) return `Blob(${value.type}):${bytes(new Uint8Array(await value.arrayBuffer()))}`;
      if (Array.isArray(value)) return Promise.all(value.map(unblob));
      if (value !== null && typeof value === "object" && !ArrayBuffer.isView(value) && !(value instanceof ArrayBuffer)) {
        if (typeof CryptoKey !== "undefined" && value instanceof CryptoKey) return value;
        if (value instanceof Date) return value;
        return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([k, v]) => [k, await unblob(v)] as const)));
      }
      return value;
    };
    const render = (value: unknown): unknown => {
      if (value instanceof Uint8Array) return bytes(value);
      if (value instanceof ArrayBuffer) return bytes(new Uint8Array(value));
      if (ArrayBuffer.isView(value)) return bytes(new Uint8Array(value.buffer));
      if (typeof CryptoKey !== "undefined" && value instanceof CryptoKey) return "[CryptoKey]";
      if (value instanceof Date) return value.toISOString();
      if (Array.isArray(value)) return value.map(render);
      if (value !== null && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, render(v)]));
      }
      return value;
    };

    for (const [name, area] of [
      ["localStorage", localStorage],
      ["sessionStorage", sessionStorage],
    ] as const) {
      for (let i = 0; i < area.length; i++) {
        const key = area.key(i) ?? "";
        out.push({ where: `${name}[${key}]`, text: `${key}=${area.getItem(key) ?? ""}` });
      }
    }

    for (const { name } of await indexedDB.databases()) {
      if (name === undefined) continue;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(name);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      for (const store of Array.from(db.objectStoreNames)) {
        const rows = await new Promise<unknown[]>((resolve, reject) => {
          const request = db.transaction(store, "readonly").objectStore(store).getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        // The workshop's own store is where a submission lives on the device (D106), the generated
        // store is where a generated item does (D110), and the oral stores hold a session's
        // transcript and its recording (D120).
        const unblobbed = (await unblob(rows)) as unknown[];
        out.push({
          where: `IndexedDB ${name}.${store}`,
          text: JSON.stringify(unblobbed.map(render)),
          onDevice: ["writingSubmissions", "generated", "oralSessions", "oralAudio"].includes(store),
        });
      }
      db.close();
    }

    if (typeof caches !== "undefined") {
      for (const cacheName of await caches.keys()) {
        const requests = await (await caches.open(cacheName)).keys();
        out.push({ where: `Cache Storage ${cacheName}`, text: requests.map((r) => r.url).join("\n") });
      }
    }

    out.push({ where: "DOM", text: document.documentElement.outerHTML, onDevice: true });
    for (const field of Array.from(document.querySelectorAll("input, textarea"))) {
      out.push({ where: "a field's value", text: (field as HTMLInputElement).value, onDevice: true });
    }
    return out;
  });

/** The ids of the rows in one IndexedDB store, so a spec can see what the vault holds at rest. */
export const idsAtRest = (page: Page, database: string, store: string): Promise<string[]> =>
  page.evaluate(
    async ({ database, store }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(database);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
        const request = db.transaction(store, "readonly").objectStore(store).getAllKeys();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return keys.map(String);
    },
    { database, store },
  );

/** The text of a download: an export file must not carry the key either. */
export const downloadedText = async (download: Download): Promise<string> => {
  const path = await download.path();
  return readFile(path, "utf8");
};

/** The bytes of every recording in `oralAudio` at rest, read as text (D120): the positive control for the at-rest dump. */
export const recordingsAtRest = (page: Page): Promise<string[]> =>
  page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open("palier");
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const rows = await new Promise<{ blob?: unknown }[]>((resolve, reject) => {
      const request = db.transaction("oralAudio", "readonly").objectStore("oralAudio").getAll();
      request.onsuccess = () => resolve(request.result as { blob?: unknown }[]);
      request.onerror = () => reject(request.error);
    });
    db.close();
    const texts: string[] = [];
    for (const row of rows) {
      for (const value of Object.values(row)) if (value instanceof Blob) texts.push(await value.text());
    }
    return texts;
  });

/** Every row of an IndexedDB store, as JSON text, so a spec can say what is at rest there (D127). */
export const textAtRest = (page: Page, database: string, store: string): Promise<string> =>
  page.evaluate(
    async ({ database, store }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(database);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const rows = await new Promise<unknown[]>((resolve, reject) => {
        const request = db.transaction(store, "readonly").objectStore(store).getAll();
        request.onsuccess = () => resolve(request.result as unknown[]);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return JSON.stringify(rows);
    },
    { database, store },
  );
