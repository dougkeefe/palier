import { describe, expect, it } from "vitest";

import { type MediaKit, type RecorderLike, pickRecordingType, recordClip, recordSession, recordWhole } from "./recorder";

/** A `MediaRecorder` stand-in: each `stop` flushes the chunks given since `start`, as the browser does. */
const fakeRecorder = (mimeType: string) => {
  const recorder: RecorderLike & { chunks: string[]; calls: string[] } = {
    state: "inactive",
    mimeType,
    chunks: [],
    calls: [],
    ondataavailable: null,
    onstop: null,
    start() {
      this.calls.push("start");
      (this as { state: string }).state = "recording";
    },
    pause() {
      this.calls.push("pause");
      (this as { state: string }).state = "paused";
    },
    resume() {
      this.calls.push("resume");
      (this as { state: string }).state = "recording";
    },
    stop() {
      this.calls.push("stop");
      (this as { state: string }).state = "inactive";
      for (const chunk of this.chunks) this.ondataavailable?.({ data: new Blob([chunk]) });
      this.ondataavailable?.({ data: new Blob([]) });
      this.onstop?.();
    },
  };
  return recorder;
};

const kitWith = (options: { supported?: readonly string[]; mimeType?: string } = {}) => {
  const made: { recorder: ReturnType<typeof fakeRecorder>; type: string | undefined }[] = [];
  let now = 1_000;
  const kit: MediaKit = {
    record: (_stream, type) => {
      const recorder = fakeRecorder(options.mimeType ?? type ?? "");
      made.push({ recorder, type });
      return recorder;
    },
    supports: (type) => (options.supported ?? ["audio/webm;codecs=opus"]).includes(type),
    now: () => now,
  };
  return { kit, made, advance: (ms: number) => (now += ms) };
};

const stream = {} as MediaStream;

describe("pickRecordingType (D119)", () => {
  it("prefers Opus in WebM, then WebM, then MP4, and otherwise leaves the choice to the browser", () => {
    expect(pickRecordingType(() => true)).toBe("audio/webm;codecs=opus");
    expect(pickRecordingType((t) => t === "audio/mp4")).toBe("audio/mp4");
    expect(pickRecordingType(() => false)).toBeUndefined();
  });
});

describe("recordClip (D119)", () => {
  it("records one answer and settles with the clip and how long it ran", async () => {
    const { kit, made, advance } = kitWith();
    const recording = recordClip(stream, kit);
    made[0]!.recorder.chunks.push("clip-", "bytes");
    advance(4_200.4);

    const clip = await recording.stop();

    expect(made[0]?.type).toBe("audio/webm;codecs=opus");
    expect(await clip.audio.text()).toBe("clip-bytes");
    expect(clip.audio.type).toBe("audio/webm;codecs=opus");
    expect(clip.durationMs).toBe(4_200);
    expect(made[0]?.recorder.calls).toEqual(["start", "stop"]);
  });

  it("types the clip by the format asked for when the recorder reports none", async () => {
    const { kit } = kitWith({ supported: ["audio/mp4"], mimeType: "" });
    const clip = await recordClip(stream, kit).stop();
    expect(clip.audio.type).toBe("audio/mp4");
  });

  it("does not stop a recorder that has already stopped", async () => {
    const { kit, made } = kitWith();
    const recording = recordClip(stream, kit);
    made[0]!.recorder.stop();
    await recording.stop();
    expect(made[0]?.recorder.calls).toEqual(["start", "stop"]);
  });
});

describe("recordSession (D119)", () => {
  it("records only while the candidate answers, and settles with the answers when it finishes", async () => {
    const { kit, made } = kitWith();
    const session = recordSession(stream, kit);
    session.pause();
    session.resume();
    session.pause();
    session.resume();
    made[0]!.recorder.chunks.push("answers");

    const audio = await session.finish();

    expect(made[0]?.recorder.calls).toEqual(["start", "pause", "resume", "stop"]);
    expect(await audio?.text()).toBe("answers");
  });

  it("is nothing when the candidate never answered aloud", async () => {
    const { kit, made } = kitWith();
    expect(await recordSession(stream, kit).finish()).toBeNull();
    expect(made[0]?.recorder.calls).toEqual([]);
  });

  it("is nothing when the recorder gave no bytes", async () => {
    const { kit } = kitWith();
    const session = recordSession(stream, kit);
    session.resume();
    expect(await session.finish()).toBeNull();
  });

  it("finishes a recorder the browser already stopped (the microphone went away) without stopping it again", async () => {
    const { kit, made } = kitWith();
    const session = recordSession(stream, kit);
    session.resume();
    made[0]!.recorder.chunks.push("x");
    made[0]!.recorder.stop();
    session.pause();
    expect(await session.finish()).not.toBeNull();
    expect(made[0]?.recorder.calls).toEqual(["start", "stop"]);
  });
});

describe("recordWhole (D183)", () => {
  it("records from the start, never pausing, and settles with the whole session", async () => {
    const { kit, made } = kitWith();
    const recording = recordWhole(stream, kit);
    const recorder = made[0]!.recorder;
    recorder.chunks.push("the whole conversation");

    const audio = await recording.finish();
    expect(recorder.calls).toEqual(["start", "stop"]);
    expect(await audio?.text()).toBe("the whole conversation");
  });

  it("is nothing when the recorder gave no bytes", async () => {
    const { kit } = kitWith();
    expect(await recordWhole(stream, kit).finish()).toBeNull();
  });
});
