/**
 * Recording the candidate (architecture.md §8.5, progress.md D119), over `MediaRecorder`, a
 * platform API rather than a vendor's, behind the narrow `MediaKit` a test can fake.
 *
 * - **A clip per answer**: started and stopped by the candidate, with its length measured, for the
 *   `AnswerSource` to hand to the transcription.
 * - **The session recording**: one recorder for the whole session, resumed while the candidate
 *   answers and paused otherwise, so it holds their answers and nothing else. It is what
 *   `saveOralAudio` keeps, on this device only; nothing uploads it in this slice [R12].
 */

/** What the app needs of a `MediaRecorder`. */
export type RecorderLike = {
  readonly state: "inactive" | "recording" | "paused";
  readonly mimeType: string;
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  ondataavailable: ((event: { readonly data: Blob }) => void) | null;
  onstop: (() => void) | null;
};

/** What recording needs of the browser, so a test can hand in a fake. */
export type MediaKit = {
  readonly record: (stream: MediaStream, mimeType: string | undefined) => RecorderLike;
  readonly supports: (type: string) => boolean;
  /** A monotonic clock in milliseconds, for a clip's length. */
  readonly now: () => number;
};

/**
 * The formats tried, in order: Opus in WebM (Chrome, Firefox, Edge), then MP4 (Safari). Both are
 * formats the transcription endpoint reads.
 */
export const RECORDING_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"] as const;

/** The first format the browser records, or none, when the recorder picks its own. */
export const pickRecordingType = (supports: (type: string) => boolean): string | undefined =>
  RECORDING_TYPES.find((type) => supports(type));

/** Collect a recorder's chunks into one blob once it stops. */
const collect = (recorder: RecorderLike, fallbackType: string | undefined): Promise<Blob> => {
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  return new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || fallbackType || "" }));
  });
};

export type Clip = { readonly audio: Blob; readonly durationMs: number };

/** One answer being recorded: `stop` settles with the clip and how long it ran. */
export type ClipRecording = { readonly stop: () => Promise<Clip> };

/** Start recording one answer. */
export const recordClip = (stream: MediaStream, kit: MediaKit): ClipRecording => {
  const type = pickRecordingType(kit.supports);
  const recorder = kit.record(stream, type);
  const done = collect(recorder, type);
  const startedAt = kit.now();
  recorder.start();
  return {
    stop: async () => {
      const durationMs = Math.max(0, Math.round(kit.now() - startedAt));
      if (recorder.state !== "inactive") recorder.stop();
      return { audio: await done, durationMs };
    },
  };
};

/** The whole session's recording: the candidate's answers only. */
export type SessionRecording = {
  readonly resume: () => void;
  readonly pause: () => void;
  /** Stop, and settle with the recording, or `null` when the candidate never answered aloud. */
  readonly finish: () => Promise<Blob | null>;
};

/** A session recording, paused until the first answer. */
export const recordSession = (stream: MediaStream, kit: MediaKit): SessionRecording => {
  const type = pickRecordingType(kit.supports);
  const recorder = kit.record(stream, type);
  const done = collect(recorder, type);
  let heard = false;
  return {
    resume: () => {
      heard = true;
      if (recorder.state === "inactive") recorder.start();
      else if (recorder.state === "paused") recorder.resume();
    },
    pause: () => {
      if (recorder.state === "recording") recorder.pause();
    },
    finish: async () => {
      if (!heard) return null;
      if (recorder.state !== "inactive") recorder.stop();
      const audio = await done;
      return audio.size === 0 ? null : audio;
    },
  };
};

/** The browser's own `MediaRecorder` and clock. */
export const browserMediaKit = (): MediaKit => ({
  record: (stream, mimeType) =>
    new MediaRecorder(stream, mimeType === undefined ? undefined : { mimeType }) as unknown as RecorderLike,
  supports: (type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type),
  now: () => performance.now(),
});
