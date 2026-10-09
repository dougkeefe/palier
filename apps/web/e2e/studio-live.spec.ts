import { mkdir, writeFile } from "node:fs/promises";

import { expect, type Page, test } from "@playwright/test";

import { onboard } from "./helpers";

/**
 * Studio mode, live (Phase 6 Slice 2's *done*, principle 8; progress.md D189). **Opt-in, in no CI lane**: it runs
 * only as the `live` project, which exists only when `PALIER_LIVE=1`, on the production build and a real key in
 * `OPENAI_SMOKE_KEY`, loaded from `.env.local` in a subshell so the key enters no file and no transcript
 * (`docs/deploy.md`). It spends about US$0.20.
 *
 * It measures what the plan asks to be measured, not assumed:
 * - **tap to first word** (exit criterion 1), three times: from the click on "Start the session" to the first
 *   moment the examiner's voice arrives on the remote track above a level, through an analyser;
 * - **the cost of a minute**: a conversation of about two minutes whose every `response.done` usage and every
 *   transcription's seconds are summed off the data channel, per minute, in `pricing.json`'s units. On its first
 *   runs the server heard the synthetic answer begin and never end, so this half reports rather than asserts (D189).
 *
 * The microphone is a Web Audio stream the page plays French answers into, synthesised once by `tts-1` on the
 * same key; each answer starts once the examiner has responded and its voice has been quiet for a moment. The
 * examiner hears a speaker, not a tone, so its turn detection and transcription run as for a person. What the
 * spec cannot judge is how the examiner sounds; that is the human's live session (D174–D176).
 */

const KEY = process.env.OPENAI_SMOKE_KEY ?? "";
test.skip(process.env.PALIER_LIVE !== "1" || KEY === "", "the live studio spec runs only with PALIER_LIVE=1 and OPENAI_SMOKE_KEY");

const ANSWERS = [
  "Bonjour. Je suis analyste principal des politiques à Emploi et Développement social Canada. Je travaille surtout sur les programmes de formation professionnelle, en collaboration avec les provinces.",
  "Mon rôle consiste à analyser les données, à rédiger des notes d’information pour la haute direction et à coordonner les consultations avec nos partenaires.",
  "Le plus grand défi, c’est de concilier les priorités des provinces avec les échéances fédérales. Cela demande beaucoup de diplomatie et une planification rigoureuse.",
  "Si je pouvais recommencer, je consulterais les intervenants plus tôt dans le processus, afin d’éviter des retards et de mieux cerner leurs besoins.",
  "À mon avis, le télétravail a amélioré la productivité, mais il exige de bons outils de collaboration et une gestion axée sur les résultats.",
];

/** How long the measured conversation runs before it is ended. */
const CONVERSATION_MS = 120_000;

/**
 * `PALIER_LIVE_DIALS_ONLY=1` measures the three dials and skips the conversation, for a run that asks only how long
 * the start takes (D190). The site is `PALIER_LIVE_BASE_URL` when given (`playwright.config.ts`), so the deployed
 * site can be measured as well as a local production server.
 */
const DIALS_ONLY = process.env.PALIER_LIVE_DIALS_ONLY === "1";

/** One answer spoken by `tts-1`, as base64 for the page to decode. */
const speak = async (text: string): Promise<string> => {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { authorization: `Bearer ${KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "tts-1", voice: "alloy", input: text, response_format: "wav" }),
  });
  if (!response.ok) throw new Error(`tts-1 answered ${String(response.status)}`);
  return Buffer.from(await response.arrayBuffer()).toString("base64");
};

type Usage = {
  textIn: number;
  audioIn: number;
  cachedText: number;
  cachedAudio: number;
  cached: number;
  textOut: number;
  audioOut: number;
  transcribeSeconds: number;
  responses: number;
};

type Live = {
  tapAt: number | null;
  firstVoiceAt: number | null;
  talking: boolean;
  played: number;
  usage: Usage;
  /** Milliseconds from the tap to each step of the dial, and to the first of each server event, for one session. */
  timeline: Record<string, number>;
  errors: string[];
  /** Diagnostics: the lowest examiner level each second, every server event's count, and how often an answer began. */
  quietest: number[];
  seen: Record<string, number>;
};

/**
 * The page's instruments: a microphone the page speaks into, a wrapped `RTCPeerConnection` that times the first
 * word and sums the usage off the data channel, and the tap's time. Serialised into the page, so self-contained.
 */
const instrument = ({ answers }: { answers: readonly string[] }) => {
  const live: Live & { say: () => Promise<void> } = {
    tapAt: null,
    firstVoiceAt: null,
    talking: false,
    played: 0,
    usage: { textIn: 0, audioIn: 0, cachedText: 0, cachedAudio: 0, cached: 0, textOut: 0, audioOut: 0, transcribeSeconds: 0, responses: 0 },
    timeline: {},
    errors: [],
    quietest: [],
    seen: {},
    say: async () => undefined,
  };
  let lowest = Number.POSITIVE_INFINITY;
  let respondedAt = 0;
  setInterval(() => {
    if (live.talking && Number.isFinite(lowest)) live.quietest.push(Number(lowest.toFixed(4)));
    lowest = Number.POSITIVE_INFINITY;
  }, 1_000);
  /** When the examiner's voice was last heard, whether an answer is playing, and how many responses it has answered. */
  let lastVoiceAt = 0;
  let saying = false;
  let answeredFor = 0;
  const mark = (step: string) => {
    if (live.tapAt !== null && live.timeline[step] === undefined) live.timeline[step] = Math.round(performance.now() - live.tapAt);
  };
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    // The screen's warm-up posts to the route with no key before the tap (D190); only the mint is a step of the dial.
    const keyed = new Headers(init?.headers).has("authorization");
    const step = url.includes("/api/realtime/secret") && keyed ? "secret" : url.includes("/realtime/calls") ? "sdp" : null;
    const response = await nativeFetch(input, init);
    if (step !== null) mark(step);
    return response;
  };
  Object.defineProperty(window, "__studioLive", { value: live, configurable: true });
  document.addEventListener(
    "click",
    (event) => {
      const button = (event.target as Element | null)?.closest?.("button");
      if (button?.textContent?.trim() === "Start the session") {
        live.tapAt = performance.now();
        live.firstVoiceAt = null;
        live.timeline = {};
        live.usage = { textIn: 0, audioIn: 0, cachedText: 0, cachedAudio: 0, cached: 0, textOut: 0, audioOut: 0, transcribeSeconds: 0, responses: 0 };
        answeredFor = 0;
      }
    },
    true,
  );
  let audio: AudioContext | null = null;
  let out: MediaStreamAudioDestinationNode | null = null;
  let decoded: AudioBuffer[] | null = null;
  const context = (): { audio: AudioContext; out: MediaStreamAudioDestinationNode } => {
    if (audio === null || out === null) {
      audio = new AudioContext();
      out = audio.createMediaStreamDestination();
    }
    return { audio, out };
  };
  // A fresh stream each time, as a real microphone gives: the screen stops a session's tracks when it ends.
  navigator.mediaDevices.getUserMedia = async () => {
    const made = context();
    await made.audio.resume().catch(() => undefined);
    out = made.audio.createMediaStreamDestination();
    return out.stream;
  };
  live.say = async () => {
    saying = true;
    answeredFor = live.usage.responses;
    try {
      const made = context();
      decoded ??= await Promise.all(
        answers.map((base64) => made.audio.decodeAudioData(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer)),
      );
      const buffer = decoded[live.played % decoded.length];
      live.played += 1;
      if (buffer === undefined) throw new Error("no answer to play");
      const source = made.audio.createBufferSource();
      source.buffer = buffer;
      source.connect(made.out);
      source.onended = () => {
        saying = false;
      };
      source.start();
    } catch (error) {
      saying = false;
      live.errors.push(String(error));
    }
  };
  // Answer once the examiner has responded since the last answer and has been quiet for a moment, as a person would.
  // Or, whatever the level reads, eight seconds after the response ended.
  setInterval(() => {
    if (!live.talking || saying || live.usage.responses <= answeredFor) return;
    const quiet = performance.now() - lastVoiceAt >= 1_200;
    const late = respondedAt > 0 && performance.now() - respondedAt >= 8_000;
    if (quiet || late) void live.say();
  }, 200);
  const watch = (stream: MediaStream | undefined) => {
    if (stream === undefined) return;
    const made = context();
    const analyser = made.audio.createAnalyser();
    analyser.fftSize = 2048;
    made.audio.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) sum += sample * sample;
      const level = Math.sqrt(sum / samples.length);
      lowest = Math.min(lowest, level);
      if (level <= 0.01) return;
      lastVoiceAt = performance.now();
      if (live.tapAt !== null && live.firstVoiceAt === null) live.firstVoiceAt = lastVoiceAt;
    }, 20);
  };
  const count = (value: unknown): number => (typeof value === "number" ? value : 0);
  const onEvent = (event: Record<string, unknown>) => {
    mark(String(event.type));
    live.seen[String(event.type)] = (live.seen[String(event.type)] ?? 0) + 1;
    if (event.type === "response.done") {
      const usage = (event.response as { usage?: Record<string, unknown> } | undefined)?.usage;
      if (usage === undefined) return;
      const input = (usage.input_token_details ?? {}) as Record<string, unknown>;
      const cached = (input.cached_tokens_details ?? {}) as Record<string, unknown>;
      const output = (usage.output_token_details ?? {}) as Record<string, unknown>;
      live.usage.textIn += count(input.text_tokens);
      live.usage.audioIn += count(input.audio_tokens);
      live.usage.cachedText += count(cached.text_tokens);
      live.usage.cachedAudio += count(cached.audio_tokens);
      live.usage.cached += count(input.cached_tokens);
      live.usage.textOut += count(output.text_tokens);
      live.usage.audioOut += count(output.audio_tokens);
      live.usage.responses += 1;
      respondedAt = performance.now();
    }
    if (event.type === "conversation.item.input_audio_transcription.completed") {
      live.usage.transcribeSeconds += count((event.usage as Record<string, unknown> | undefined)?.seconds);
    }
  };
  const Native = window.RTCPeerConnection;
  class Measured extends Native {
    constructor(configuration?: RTCConfiguration) {
      super(configuration);
      this.addEventListener("track", (event) => watch(event.streams[0]));
    }
    override createDataChannel(label: string, options?: RTCDataChannelInit): RTCDataChannel {
      const channel = super.createDataChannel(label, options);
      channel.addEventListener("open", () => mark("channel open"));
      channel.addEventListener("message", (event: MessageEvent) => onEvent(JSON.parse(String(event.data)) as Record<string, unknown>));
      return channel;
    }
  }
  Object.defineProperty(window, "RTCPeerConnection", { value: Measured, configurable: true, writable: true });
};

const live = (page: Page): Promise<Live> => page.evaluate(() => (window as unknown as { __studioLive: Live }).__studioLive);

/** From the picker to the tap on Start, in studio mode, on the Warm-up. */
const startStudio = async (page: Page) => {
  await page.goto("/en/practice/oral");
  await page.getByRole("radio", { name: /^Studio mode/ }).check();
  await page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Warm-up", exact: true }) }).getByRole("button", { name: "Choose" }).click();
  await page.getByRole("button", { name: "Check my microphone" }).click();
  await expect(page.getByText("Palier can hear you.").or(page.getByText("Palier heard very little.", { exact: false }))).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: /^Continue/ }).first().click();
  await page.getByRole("button", { name: "Start the session" }).click();
  await expect(page.getByRole("status").filter({ hasText: "The conversation is on." })).toBeVisible({ timeout: 30_000 });
};

const endStudio = async (page: Page) => {
  await page.getByRole("button", { name: "End the session" }).click();
  await expect(page.getByRole("heading", { name: "Session over" })).toBeFocused({ timeout: 30_000 });
};

test("studio mode, live: tap to first word three times, and what a minute of conversation costs", async ({ page }) => {
  test.setTimeout(6 * 60_000);
  const answers = await Promise.all(ANSWERS.map(speak));
  await page.addInitScript(instrument, { answers });

  await onboard(page, "skip");
  // The key step is passed over, so the key is added on the key screen itself (D220).
  await page.goto("/en/settings/key");
  await page.getByLabel("OpenAI API key").fill(KEY);
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(/^Saved on this device/)).toBeVisible();

  const connects: number[] = [];
  const timelines: Record<string, number>[] = [];
  for (let run = 0; run < 3; run++) {
    await startStudio(page);
    await page.waitForFunction(() => (window as unknown as { __studioLive: Live }).__studioLive.firstVoiceAt !== null, null, { timeout: 30_000 });
    const measured = await live(page);
    connects.push(Math.round((measured.firstVoiceAt ?? 0) - (measured.tapAt ?? 0)));
    timelines.push(measured.timeline);
    if (run < 2 || DIALS_ONLY) await endStudio(page);
  }

  if (DIALS_ONLY) {
    const figures = { baseURL: test.info().project.use.baseURL, connectsMs: connects, timelines };
    await mkdir("test-results", { recursive: true });
    await writeFile("test-results/studio-live.json", `${JSON.stringify(figures, null, 2)}\n`);
    console.log(JSON.stringify(figures));
    expect(connects).toHaveLength(3);
    expect((await live(page)).errors).toEqual([]);
    return;
  }

  // The third session goes on as a conversation: the page answers each time the examiner stops.
  await page.evaluate(() => {
    (window as unknown as { __studioLive: Live }).__studioLive.talking = true;
  });
  const began = await page.evaluate(() => (window as unknown as { __studioLive: Live }).__studioLive.tapAt ?? 0);
  await page.waitForTimeout(CONVERSATION_MS);
  const ended = await page.evaluate(() => performance.now());
  await endStudio(page);
  const { usage, errors, quietest, seen, played } = await live(page);
  const minutes = (ended - began) / 60_000;
  const perMinute = (value: number) => Math.round(value / minutes);
  const figures = {
    connectsMs: connects,
    timelines,
    errors,
    played,
    quietest,
    seen,
    minutes: Number(minutes.toFixed(2)),
    responses: usage.responses,
    turns: await page.getByRole("region", { name: "Transcript" }).getByRole("listitem").count(),
    perMinute: {
      textInputTokens: perMinute(usage.textIn - usage.cachedText),
      audioInputTokens: perMinute(usage.audioIn - usage.cachedAudio),
      cachedInputTokens: perMinute(usage.cached),
      textOutputTokens: perMinute(usage.textOut),
      audioOutputTokens: perMinute(usage.audioOut),
      transcribeMinutes: Number((usage.transcribeSeconds / 60 / minutes).toFixed(2)),
    },
    totals: usage,
  };
  await mkdir("test-results", { recursive: true });
  await writeFile("test-results/studio-live.json", `${JSON.stringify(figures, null, 2)}\n`);
  console.log(JSON.stringify(figures));

  // Every dial reached a first word, and the page's own instruments raised nothing.
  expect(connects).toHaveLength(3);
  expect(errors).toEqual([]);
  // Whether the synthetic candidate's turn was heard to end is reported, not asserted (D189): on 30 September 2026 the
  // server heard the answer begin and never end, so the conversation's cost could not be measured this way.
  test.info().annotations.push({
    type: "conversation",
    description: usage.transcribeSeconds > 0 ? `heard: ${String(usage.responses)} responses` : "the candidate's turn was never heard to end",
  });
});
