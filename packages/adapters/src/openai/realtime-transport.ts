import type { OralDirective, OralTransportEvent, RealtimeSecret } from "@palier/app";
import type { OralDirection, OralScenario, OralSpeaker, UsageRecord } from "@palier/domain";
import { costOf, oralNoteSchema } from "@palier/domain";

import { InvalidApiKeyError, InvalidResponseError, ProviderRequestError } from "./errors.js";
import type { FetchLike, FetchResponse } from "./http.js";
import { platformFetch, timedExchange } from "./http.js";
import type { OpenAiPricing } from "./openai-provider.js";
import { STUDIO_TOOLS, studioInstructions, studioRepeatRequest } from "./prompts.js";

/**
 * The seam between the transport and WebRTC (progress.md D170): an offer out, an answer in, JSON
 * messages both ways over the `oai-events` data channel, and whether the connection is up. The
 * browser's is `browserRealtimePeer`; the tests fake it. No `RTCPeerConnection` type crosses it.
 *
 * - `onState("open")` once the data channel can carry messages.
 * - `onState("dropped")` when the connection is lost without the client asking, once.
 */
export type RealtimePeerState = "open" | "dropped";
export type RealtimePeer = {
  readonly offer: () => Promise<string>;
  readonly answer: (sdp: string) => Promise<void>;
  readonly send: (message: string) => void;
  readonly onMessage: (listener: (message: string) => void) => void;
  readonly onState: (listener: (state: RealtimePeerState) => void) => void;
  readonly close: () => void;
};
export type RealtimePeerFactory = () => RealtimePeer;

/**
 * How readily semantic turn detection decides the candidate has finished (progress.md D175):
 * `low` waits longest through a pause, `auto` is the API's own default.
 */
export const REALTIME_TURN_EAGERNESS = ["low", "medium", "high", "auto"] as const;
export type RealtimeTurnEagerness = (typeof REALTIME_TURN_EAGERNESS)[number];

export type RealtimeTransportConfig = {
  /** A fresh short-lived secret (ADR 3): the app's hook, which spends the key inside the vault. */
  readonly secret: () => Promise<RealtimeSecret>;
  readonly peer: RealtimePeerFactory;
  /** Each billed usage, priced: the app's hook, which writes it to the ledger as `oral-studio`. */
  readonly usage: (usage: UsageRecord) => void;
  /** The Realtime model, from `ai-models.json`, for pricing its usage. The secret already names it. */
  readonly model: string;
  /** The candidate's input transcription, from `ai-models.json`. */
  readonly transcribeModel: string;
  /** Semantic turn detection's eagerness, from `ai-models.json` (D175); the API's default when absent. */
  readonly turnEagerness?: RealtimeTurnEagerness;
  /** Studio mode's hard cap in ms (`studioMaxMinutes`, D166): the transport closes itself at it. */
  readonly maxMs: number;
  readonly pricing?: OpenAiPricing;
  /** The examiner's instructions for a phase; `studioInstructions` unless a test says otherwise. */
  readonly instructions?: (scenario: OralScenario, directive: OralDirective) => string;
  /** Milliseconds, for turn times; `Date.now` unless a test says otherwise. */
  readonly now?: () => number;
  readonly baseUrl?: string;
  readonly fetchImpl?: FetchLike;
  /** How long the SDP exchange may take. Default 10 s. */
  readonly timeoutMs?: number;
};

export type RealtimeTransport = {
  readonly open: (req: { readonly scenario: OralScenario }, sink: (event: OralTransportEvent) => void) => Promise<void>;
  readonly direct: (directive: OralDirective) => Promise<void>;
  /**
   * The candidate's "I did not understand, could you repeat" (product-requirements.md §8.6, progress.md D180): a
   * user message asking for it, then the examiner's cue, which waits for a response in progress. A no-op once
   * closed, and while the line is down, since a request made during a reconnect has nothing to follow.
   */
  readonly repeat: () => Promise<void>;
  readonly close: () => Promise<void>;
  readonly lastError: () => unknown;
};

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_TIMEOUT_MS = 10_000;
const DIRECTIONS: ReadonlySet<string> = new Set<OralDirection>(["escalate", "deescalate"]);

type ServerEvent = Readonly<Record<string, unknown>> & { readonly type?: unknown };

const text = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);
const count = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
const record = (value: unknown): Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

/** An SDP answer, or the adapter's own error: an `ek_` refused is an expired or revoked secret. */
const readSdp = async (res: FetchResponse): Promise<string> => {
  if (res.status === 401) throw new InvalidApiKeyError("OpenAI refused the realtime secret.");
  if (!res.ok) throw new ProviderRequestError(res.status, "the realtime call was refused.");
  const sdp = await res.text();
  if (!sdp.startsWith("v=")) throw new InvalidResponseError("OpenAI's realtime answer was not SDP.");
  return sdp;
};

/**
 * Studio mode's `OralTransport` (architecture.md §8.5, progress.md D165, D170): a full-duplex
 * realtime conversation over WebRTC, the examiner's voice straight from OpenAI to the browser.
 *
 * - **Setup.** A fresh secret and the peer's offer, asked for together (D190), the offer to
 *   `/realtime/calls` with the `ek_` secret (never the key), the answer back, then `session.update` with the phase's instructions, the two tools,
 *   input transcription and semantic turn detection at the configured eagerness (D175), and
 *   `response.create` so the examiner speaks first.
 * - **The client drives the phases** (§8.5 step 5). A new phase is `session.update` then
 *   `response.create`, so the examiner makes the transition; a register change within a phase is
 *   `session.update` alone. `direct` returns at once (D118); a directive during a reconnect is
 *   applied when the connection is back.
 * - **Events.** The candidate's transcription and the examiner's transcript become whole turns,
 *   timed from `open` by the client's clock; `flag_difficulty` becomes `difficulty` and
 *   `note_observation` becomes `note`, each answered so the model carries on. A call whose
 *   arguments are not whole is answered and dropped.
 * - **One response at a time.** A cue asked for while the examiner is mid-response waits for its
 *   `response.done`, since the API refuses a second; a response that only called tools gets one
 *   follow-up, never a chain of them. A server `error` is kept for `lastError`, never fatal.
 * - **Usage.** Each `response.done` is priced at the realtime rates, and each transcription at the
 *   transcription model's, and handed to `usage`.
 * - **One reconnect.** A dropped connection is dialled again with a fresh secret, the transcript so
 *   far seeded as conversation items. A second drop, or a failed reconnect, is `closed { failed }`,
 *   with every turn already delivered, and the examiner's words in flight delivered first.
 * - **The cap.** At `maxMs` from `open` the transport closes itself, cleanly.
 * - **Repeat** (D180). The candidate's request goes as a user message and a cue. It is not a turn: the candidate did
 *   not say it, so it enters neither the transcript nor a reconnect's seed.
 */
export const realtimeTransport = (config: RealtimeTransportConfig): RealtimeTransport => {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const doFetch = config.fetchImpl ?? platformFetch;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = config.now ?? (() => Date.now());
  const instructionsFor = config.instructions ?? studioInstructions;
  const turnDetection =
    config.turnEagerness === undefined ? { type: "semantic_vad" } : { type: "semantic_vad", eagerness: config.turnEagerness };

  let state: "idle" | "open" | "closed" = "idle";
  let sink: (event: OralTransportEvent) => void = () => undefined;
  let scenario: OralScenario | null = null;
  let directive: OralDirective = { phase: 0, register: "baseline" };
  let openedAt = 0;
  let peer: RealtimePeer | null = null;
  /** Which connection's events count: a stale peer's are ignored. */
  let generation = 0;
  /** Whether the current connection can carry messages. */
  let live = false;
  let reconnected = false;
  let error: unknown = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** Ends a dial still waiting for its channel, so a close never leaves `open` hanging. */
  let abandonDial: (() => void) | null = null;
  /** Whether the examiner is mid-response: a `response.create` then is refused, so the cue waits for it to end. */
  let responding = false;
  let cueWaiting = false;
  /** Follow-ups sent after responses that only called tools, since the examiner last spoke: at most one. */
  let toolOnlyFollowUps = 0;

  const lastStart: Record<OralSpeaker, number> = { examiner: 0, candidate: 0 };
  /** Every turn delivered, for seeding a reconnect. */
  const transcript: { readonly speaker: OralSpeaker; readonly text: string }[] = [];
  /** The candidate's speech, by item: when it started and stopped. */
  const heard = new Map<string, { startMs: number; endMs?: number }>();
  /** The examiner's words so far, by item. */
  const speaking = new Map<string, { startMs: number; text: string }>();

  const elapsed = (): number => Math.max(0, now() - openedAt);
  /** Read through a call, since a close can land while `connect` awaits, which the compiler cannot see. */
  const isClosed = (): boolean => state === "closed";

  const send = (event: Record<string, unknown>): void => {
    if (live && peer !== null) peer.send(JSON.stringify(event));
  };

  const say = (speaker: OralSpeaker, words: string, startMs: number, endMs: number, voiced: boolean): void => {
    const start = Math.max(lastStart[speaker], Math.round(startMs));
    lastStart[speaker] = start;
    transcript.push({ speaker, text: words });
    sink({
      kind: "turn",
      speaker,
      text: words,
      startMs: start,
      endMs: Math.max(start, Math.round(endMs)),
      ...(voiced ? { input: "voice" as const } : {}),
    });
  };

  /** The examiner's words still arriving, delivered as turns: at a drop or a close, nothing said is lost. */
  const deliverSpeaking = (): void => {
    for (const partial of speaking.values()) {
      if (partial.text.trim() !== "") say("examiner", partial.text, partial.startMs, elapsed(), false);
    }
    speaking.clear();
  };

  const priced = (model: string, amounts: Parameters<typeof costOf>[1]): number | undefined => {
    const price = config.pricing?.[model];
    return price === undefined ? undefined : (costOf(price, amounts) ?? undefined);
  };

  /** Ask the examiner to speak, now or as soon as the response in progress ends. */
  const cue = (): void => {
    if (responding) cueWaiting = true;
    else send({ type: "response.create" });
  };

  const phaseUpdate = (): Record<string, unknown> => ({
    type: "session.update",
    session: { type: "realtime", instructions: instructionsFor(scenario as OralScenario, directive) },
  });

  const finish = (failed: boolean): void => {
    if (state === "closed") return;
    state = "closed";
    live = false;
    clearTimeout(timer);
    abandonDial?.();
    deliverSpeaking();
    peer?.close();
    sink({ kind: "closed", failed });
  };

  const onToolCall = (event: ServerEvent): void => {
    const callId = text(event.call_id);
    let args: Readonly<Record<string, unknown>> = {};
    try {
      args = record(JSON.parse(text(event.arguments) ?? ""));
    } catch {
      // Answered below and not emitted: a call the examiner garbled is not a signal.
    }
    if (event.name === "flag_difficulty" && DIRECTIONS.has(String(args.direction))) {
      sink({ kind: "difficulty", direction: args.direction as OralDirection });
    }
    if (event.name === "note_observation") {
      const parsed = oralNoteSchema.safeParse({ ...args, phase: directive.phase });
      if (parsed.success) {
        const { criterion, evidence, severity } = parsed.data;
        sink({ kind: "note", criterion, evidence, severity });
      }
    }
    if (callId !== undefined) {
      send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: callId, output: '{"ok":true}' } });
    }
  };

  const onResponseDone = (event: ServerEvent): void => {
    responding = false;
    const response = record(event.response);
    // A response that only called tools said nothing aloud: ask the examiner to carry on, once, so a model
    // that keeps calling tools cannot keep spending the key with nobody speaking.
    const items = Array.isArray(response.output) ? response.output.map(record) : [];
    const toolOnly = items.length > 0 && items.every((item) => item.type === "function_call");
    if (!toolOnly) toolOnlyFollowUps = 0;
    if (cueWaiting) {
      cueWaiting = false;
      cue();
    } else if (toolOnly && toolOnlyFollowUps < 1) {
      toolOnlyFollowUps += 1;
      cue();
    }
    // A response cancelled before it billed anything reports no usage: no ledger row, not an unpriced one.
    if (response.usage === undefined || response.usage === null) return;
    const usage = record(response.usage);
    const input = record(usage.input_token_details);
    const cached = record(input.cached_tokens_details);
    const output = record(usage.output_token_details);
    const uncached = (all: unknown, cachedPart: unknown): number | undefined => {
      const total = count(all);
      return total === undefined ? undefined : Math.max(0, total - (count(cachedPart) ?? 0));
    };
    const costUsd = priced(config.model, {
      textInputTokens: uncached(input.text_tokens, cached.text_tokens),
      audioInputTokens: uncached(input.audio_tokens, cached.audio_tokens),
      cachedInputTokens: count(input.cached_tokens),
      textOutputTokens: count(output.text_tokens),
      audioOutputTokens: count(output.audio_tokens),
    });
    config.usage({
      model: config.model,
      inputTokens: count(usage.input_tokens) ?? 0,
      outputTokens: count(usage.output_tokens) ?? 0,
      ...(costUsd === undefined ? {} : { costUsd }),
    });
  };

  const onTranscription = (event: ServerEvent): void => {
    const id = text(event.item_id) ?? "";
    const times = heard.get(id);
    heard.delete(id);
    const endMs = times?.endMs ?? elapsed();
    const startMs = Math.min(times?.startMs ?? endMs, endMs);
    const words = text(event.transcript) ?? "";
    if (words.trim() !== "") say("candidate", words, startMs, endMs, true);
    const billed = record(event.usage);
    const audioSeconds = count(billed.seconds) ?? (endMs - startMs) / 1000;
    const costUsd = priced(config.transcribeModel, { minutes: audioSeconds / 60 });
    config.usage({
      model: config.transcribeModel,
      inputTokens: count(billed.input_tokens) ?? 0,
      outputTokens: count(billed.output_tokens) ?? 0,
      audioSeconds,
      ...(costUsd === undefined ? {} : { costUsd }),
    });
  };

  /** The server events the transport acts on, by type. Anything else is ignored. */
  const handlers: Readonly<Record<string, (event: ServerEvent) => void>> = {
    "input_audio_buffer.speech_started": (event) => {
      heard.set(text(event.item_id) ?? "", { startMs: elapsed() });
    },
    "input_audio_buffer.speech_stopped": (event) => {
      const id = text(event.item_id) ?? "";
      heard.set(id, { startMs: heard.get(id)?.startMs ?? elapsed(), endMs: elapsed() });
    },
    "conversation.item.input_audio_transcription.completed": onTranscription,
    "response.output_audio_transcript.delta": (event) => {
      const id = text(event.item_id) ?? "";
      const partial = speaking.get(id) ?? { startMs: elapsed(), text: "" };
      speaking.set(id, { ...partial, text: partial.text + (text(event.delta) ?? "") });
    },
    "response.output_audio_transcript.done": (event) => {
      const id = text(event.item_id) ?? "";
      const partial = speaking.get(id);
      speaking.delete(id);
      const words = text(event.transcript) ?? partial?.text ?? "";
      if (words.trim() !== "") say("examiner", words, partial?.startMs ?? elapsed(), elapsed(), false);
    },
    "response.function_call_arguments.done": onToolCall,
    "response.created": () => {
      responding = true;
    },
    "response.done": onResponseDone,
    // Kept for the screen and the checklist, never fatal: a refused event or an expired session says so here.
    error: (event) => {
      const detail = record(event.error);
      error = new ProviderRequestError(0, text(detail.code) ?? text(detail.message) ?? "the realtime session reported an error.");
    },
  };

  const onMessage = (mine: number) => (message: string) => {
    if (mine !== generation || state !== "open") return;
    let event: ServerEvent;
    try {
      event = record(JSON.parse(message));
    } catch {
      return;
    }
    handlers[String(event.type)]?.(event);
  };

  const onState = (mine: number, opened: () => void, lost: () => void) => (peerState: RealtimePeerState) => {
    if (mine !== generation) return;
    if (peerState === "open") opened();
    else lost();
  };

  /** A drop once connected: reconnect once, then give up with the transcript kept. */
  const dropped = (): void => {
    if (state !== "open") return;
    live = false;
    responding = false;
    cueWaiting = false;
    deliverSpeaking();
    heard.clear();
    if (reconnected) {
      finish(true);
      return;
    }
    reconnected = true;
    peer?.close();
    connect(true).catch((failure: unknown) => {
      error = failure;
      finish(true);
    });
  };

  /**
   * Dial one connection: a secret and the peer's offer at once (D190), the SDP exchange, then the
   * session's instructions, the transcript so far when this is a reconnect, and the examiner's cue.
   * Resolves once the channel is open and configured. A peer whose secret never comes is hung up
   * by whoever catches the failure: `open`, or `finish` for a reconnect.
   */
  const connect = async (seed: boolean): Promise<void> => {
    generation += 1;
    const mine = generation;
    const next = config.peer();
    peer = next;
    const opened = new Promise<void>((resolve, reject) => {
      abandonDial = () => {
        reject(new ProviderRequestError(0, "the realtime connection was closed while it opened."));
      };
      next.onState(
        onState(
          mine,
          () => {
            resolve();
          },
          () => {
            if (live) dropped();
            else reject(new ProviderRequestError(0, "the realtime connection dropped while it opened."));
          },
        ),
      );
    });
    // Awaited below; a drop before then must not read as an unhandled rejection meanwhile.
    opened.catch(() => undefined);
    next.onMessage(onMessage(mine));
    // Neither waits for the other: the secret's round trip through our route is the longer, and the offer fits inside it.
    const [secret, offer] = await Promise.all([config.secret(), next.offer()]);
    if (isClosed() || mine !== generation) {
      next.close();
      return;
    }
    const answer = await timedExchange(
      doFetch,
      `${baseUrl}/realtime/calls`,
      { method: "POST", headers: { authorization: `Bearer ${secret.value}`, "content-type": "application/sdp" }, body: offer },
      timeoutMs,
      readSdp,
    );
    await next.answer(answer);
    await opened;
    abandonDial = null;
    if (isClosed() || mine !== generation) {
      next.close();
      return;
    }
    live = true;
    send({
      type: "session.update",
      session: {
        type: "realtime",
        instructions: instructionsFor(scenario as OralScenario, directive),
        tools: STUDIO_TOOLS,
        tool_choice: "auto",
        audio: {
          input: {
            transcription: { model: config.transcribeModel, language: (scenario as OralScenario).lang },
            turn_detection: turnDetection,
          },
        },
      },
    });
    if (seed) {
      for (const turn of transcript) {
        const content =
          turn.speaker === "candidate" ? { type: "input_text", text: turn.text } : { type: "output_text", text: turn.text };
        send({
          type: "conversation.item.create",
          item: { type: "message", role: turn.speaker === "candidate" ? "user" : "assistant", content: [content] },
        });
      }
    }
    send({ type: "response.create" });
  };

  const close = (): Promise<void> => {
    if (state === "idle") state = "closed";
    finish(false);
    return Promise.resolve();
  };

  return {
    open: async (req, listener) => {
      if (state !== "idle") throw new Error("A realtime transport opens once.");
      state = "open";
      sink = listener;
      scenario = req.scenario;
      openedAt = now();
      try {
        await connect(false);
      } catch (failure) {
        // Closed by the client while it dialled: `closed` is already said, so this is not a failure.
        if (isClosed()) return;
        error = failure;
        state = "closed";
        live = false;
        peer?.close();
        throw failure;
      }
      if (!isClosed()) {
        timer = setTimeout(() => void close(), Math.max(0, config.maxMs - elapsed()));
      }
    },
    direct: (next) => {
      if (state === "idle") return Promise.reject(new Error("The transport is not open."));
      if (state === "closed") return Promise.resolve();
      // The instructions hold a phase to the scenario's own; the directive is kept as the client sent it.
      const moved = next.phase !== directive.phase;
      directive = next;
      send(phaseUpdate());
      if (moved) cue();
      return Promise.resolve();
    },
    repeat: () => {
      if (state === "idle") return Promise.reject(new Error("The transport is not open."));
      if (state === "closed" || !live) return Promise.resolve();
      const request = studioRepeatRequest((scenario as OralScenario).lang);
      send({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: request }] } });
      cue();
      return Promise.resolve();
    },
    close,
    lastError: () => error,
  };
};
