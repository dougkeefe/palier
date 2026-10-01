import type { OralSession, OralSessionChoice, OralSessionCost, OralStudioRun } from "@palier/app";
import { type SessionId, scenarioId, sessionId } from "@palier/domain";
import { describe, expect, it, vi } from "vitest";

import type { MediaKit, RecorderLike } from "../../lib/oral/recorder";
import type { PracticeAction } from "./practice-view";
import { type StudioControllerDeps, studioController } from "./studio-controller";
import type { StudioAction } from "./studio-view";

const CHOICE: OralSessionChoice = {
  sessionType: "work",
  minutes: 10,
  scenario: {
    id: scenarioId("s-work"),
    lang: "fr",
    sessionType: "work",
    targetBand: "C",
    topic: "project-management",
    phases: [
      { name: "P1", minutes: 5, intent: "i", seedQuestions: ["q"], escalation: [], deescalation: [] },
      { name: "P2", minutes: 5, intent: "i", seedQuestions: ["q"], escalation: [], deescalation: [] },
    ],
  },
};
const ID = sessionId("studio-ctl-1");
const line = (usd: number, calls: number, unpriced = 0) => ({ usd, calls, unpriced });

const settled = async () => {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

const named = (name: string) => Object.assign(new Error(name), { name });

/** A stream whose one track records whether it was stopped. */
const aStream = () => {
  const track = { stopped: false, stop() { this.stopped = true; } };
  return { stream: { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream, track };
};

/** A recorder kit whose one recorder notes what was asked of it, and gives `bytes` when stopped. */
const mediaKit = (options: { fail?: boolean; bytes?: string } = {}) => {
  const calls: string[] = [];
  const kit: MediaKit = {
    record: () => {
      if (options.fail === true) throw new Error("NotSupportedError");
      const recorder: RecorderLike = {
        state: "inactive",
        mimeType: "audio/webm",
        ondataavailable: null,
        onstop: null,
        start() {
          calls.push("start");
          (this as { state: string }).state = "recording";
        },
        pause() {
          calls.push("pause");
        },
        resume() {
          calls.push("resume");
        },
        stop() {
          calls.push("stop");
          (this as { state: string }).state = "inactive";
          this.ondataavailable?.({ data: new Blob([options.bytes ?? "the conversation"]) });
          this.onstop?.();
        },
      };
      return recorder;
    },
    supports: () => true,
    now: () => 0,
  };
  return { kit, calls };
};

const session = (over: Partial<OralSession> = {}): OralSession => ({
  id: ID,
  scenarioId: CHOICE.scenario.id,
  startedAt: "2026-09-30T10:00:00.000Z",
  endedAt: "2026-09-30T10:10:00.000Z",
  endReason: "ended-by-user",
  turns: [],
  assessment: null,
  mode: "studio",
  ...over,
});

/** A studio run the test ends by hand, as the driver would. */
const aRun = (options: { failure?: unknown; endAs?: OralSession } = {}) => {
  const ended = deferred<OralSession>();
  let phase = 0;
  const endByUser = vi.fn(() => {
    ended.resolve(options.endAs ?? session());
    return Promise.resolve();
  });
  const run = {
    scenario: CHOICE.scenario,
    tick: vi.fn(() => {
      phase = 1;
      return Promise.resolve();
    }),
    endByUser,
    phase: () => phase,
    repeat: vi.fn(() => Promise.resolve()),
    ended: ended.promise,
    failure: () => options.failure ?? null,
  };
  return { run: run as unknown as OralStudioRun & { tick: typeof run.tick; repeat: typeof run.repeat }, ended, endByUser };
};

type Over = Partial<StudioControllerDeps> & { started?: Promise<OralStudioRun>; cost?: OralSessionCost | null };

const setUp = (over: Over = {}) => {
  const actions: StudioAction[] = [];
  const endings: Extract<PracticeAction, { type: "ended" }>[] = [];
  const mic = aStream();
  const media = mediaKit();
  const current = aRun();
  const audio = { srcObject: null as unknown, paused: false, pause() { this.paused = true; } };
  const peers: { microphone: MediaStream; remoteAudio: unknown }[] = [];
  const useCases = {
    startOralStudio: vi.fn((_request: unknown, _peer: unknown, _signal?: AbortSignal) => over.started ?? Promise.resolve(current.run)),
    oralSession: vi.fn(() => Promise.resolve<OralSession | null>(session({ endReason: "transport-failed" }))),
    oralSessionCost: vi.fn(() =>
      Promise.resolve(over.cost === undefined ? { practice: line(0, 0), studio: line(0.05, 2), report: line(0, 0) } : over.cost),
    ),
    saveOralAudio: vi.fn(() => Promise.resolve({ evicted: [sessionId("old-1")] })),
  };
  const holds: { readonly id: SessionId; released: boolean }[] = [];
  const levels: { stream: unknown; closed: boolean }[] = [];
  const onNoKey = vi.fn();
  const controller = studioController({
    useCases,
    newSessionId: () => ID,
    holdSession: (id) => {
      const hold = { id, released: false };
      holds.push(hold);
      return () => {
        hold.released = true;
      };
    },
    peer: (microphone, remoteAudio) => {
      peers.push({ microphone, remoteAudio });
      return () => {
        throw new Error("the fake run never dials");
      };
    },
    makeAudio: () => audio as unknown as HTMLAudioElement,
    openLevel: (stream) => {
      const level = { stream, closed: false };
      levels.push(level);
      return {
        read: () => (stream === mic.stream ? 0.1 : 0.2),
        close: () => {
          level.closed = true;
        },
      };
    },
    media: media.kit,
    now: () => 5_000,
    dispatch: (action) => actions.push(action),
    onEnded: (ended) => endings.push(ended),
    onNoKey,
    ...over,
  });
  return { controller, actions, endings, mic, media, current, useCases, holds, peers, audio, levels, onNoKey };
};

const types = (actions: readonly StudioAction[]) => actions.map((action) => action.type);

describe("studioController — starting (D185)", () => {
  it("holds the session, records the microphone whole, and dials over it and the examiner's audio element", async () => {
    const { controller, actions, useCases, holds, peers, mic, audio, media } = setUp();
    await controller.start(CHOICE, mic.stream);

    expect(useCases.startOralStudio).toHaveBeenCalledWith(
      { sessionId: ID, scenarioId: CHOICE.scenario.id },
      expect.any(Function),
      expect.any(AbortSignal),
    );
    expect(peers).toEqual([{ microphone: mic.stream, remoteAudio: audio }]);
    expect(holds).toEqual([{ id: ID, released: false }]);
    expect(media.calls).toEqual(["start"]);
    expect(actions).toEqual([{ type: "started", choice: CHOICE, nowMs: 5_000 }, { type: "connected" }]);
  });

  it("starts once however often it is tapped while in flight", async () => {
    const pending = deferred<OralStudioRun>();
    const { controller, useCases, mic, current } = setUp({ started: pending.promise });
    const first = controller.start(CHOICE, mic.stream);
    await controller.start(CHOICE, mic.stream);
    pending.resolve(current.run);
    await first;

    expect(useCases.startOralStudio).toHaveBeenCalledTimes(1);
  });

  it("still runs the conversation when the recorder cannot start, and keeps no recording", async () => {
    const { controller, endings, useCases, mic, current } = setUp({ media: mediaKit({ fail: true }).kit });
    await controller.start(CHOICE, mic.stream);
    await controller.end();
    await current.ended.promise;
    await settled();

    expect(useCases.saveOralAudio).not.toHaveBeenCalled();
    expect(endings[0]).toMatchObject({ failure: null, recordingKept: null });
  });

  it("ends at once, as failed, with no microphone to talk into", async () => {
    const { controller, endings, useCases, holds } = setUp();
    await controller.start(CHOICE, null);

    expect(useCases.startOralStudio).not.toHaveBeenCalled();
    expect(endings[0]).toMatchObject({ failure: "failed", recordingKept: null });
    expect(holds[0]?.released).toBe(true);
  });

  it.each([
    ["NoApiKeyError", "no-key"],
    ["InvalidApiKeyError", "invalid-key"],
    ["RateLimitError", "out-of-credit"],
    ["ProviderUnavailableError", "unreachable"],
  ] as const)("names a start refused with %s, keeps no recording, and lets everything go", async (name, failure) => {
    const { controller, endings, actions, useCases, mic, audio, holds, onNoKey } = setUp({ started: Promise.reject(named(name)) });
    await controller.start(CHOICE, mic.stream);

    expect(endings).toEqual([{ type: "ended", session: session({ endReason: "transport-failed" }), evicted: 0, failure, recordingKept: null }]);
    expect(types(actions)).toEqual(["started", "reset"]);
    expect(useCases.saveOralAudio).not.toHaveBeenCalled();
    expect(mic.track.stopped).toBe(true);
    expect(audio.paused).toBe(true);
    expect(holds[0]?.released).toBe(true);
    expect(onNoKey).toHaveBeenCalledTimes(failure === "no-key" ? 1 : 0);
  });

  it("ends with an empty session when a refused start stored none", async () => {
    const { controller, endings, useCases, mic } = setUp({ started: Promise.reject(named("InvalidApiKeyError")) });
    useCases.oralSession.mockResolvedValueOnce(null);
    await controller.start(CHOICE, mic.stream);

    expect(endings[0]?.session).toMatchObject({ id: ID, turns: [], endReason: null });
  });
});

describe("studioController — the conversation (D185)", () => {
  it("ticks the session, then reads its phase and its cost so far", async () => {
    const { controller, actions, current, useCases, mic } = setUp();
    await controller.start(CHOICE, mic.stream);
    await controller.tick();

    expect(current.run.tick).toHaveBeenCalledTimes(1);
    expect(useCases.oralSessionCost).toHaveBeenCalledWith({ sessionId: ID });
    expect(actions.at(-1)).toEqual({ type: "progress", phaseIndex: 1, spent: { usd: 0.05, floor: false } });
  });

  it("keeps ticking when the cost cannot be read", async () => {
    const { controller, actions, useCases, mic } = setUp();
    useCases.oralSessionCost.mockRejectedValueOnce(new Error("the database is closed"));
    await controller.start(CHOICE, mic.stream);
    await controller.tick();

    expect(actions.at(-1)).toEqual({ type: "progress", phaseIndex: 1, spent: null });
  });

  it("does nothing on a tick with no session", async () => {
    const { controller, actions } = setUp();
    await controller.tick();
    expect(actions).toEqual([]);
  });

  it("asks the examiner to repeat, once at a time, and marks it in flight (D180)", async () => {
    const { controller, actions, current, mic } = setUp();
    await controller.start(CHOICE, mic.stream);
    const asking = deferred<void>();
    current.run.repeat.mockReturnValueOnce(asking.promise);
    const first = controller.repeat();
    await controller.repeat();
    asking.resolve();
    await first;

    expect(current.run.repeat).toHaveBeenCalledTimes(1);
    expect(actions.slice(-2)).toEqual([
      { type: "repeating", on: true },
      { type: "repeating", on: false },
    ]);
  });

  it("clears the repeat mark when the request fails, and asks nothing with no session", async () => {
    const { controller, actions, current, mic } = setUp();
    await controller.repeat();
    expect(actions).toEqual([]);

    await controller.start(CHOICE, mic.stream);
    current.run.repeat.mockRejectedValueOnce(new Error("the channel closed"));
    await controller.repeat();
    expect(actions.at(-1)).toEqual({ type: "repeating", on: false });
  });

  it("reads the microphone's level at once, and the examiner's once the voice has arrived, reopening for a new stream", async () => {
    const { controller, mic, audio, levels } = setUp();
    expect(controller.levels()).toEqual({ examiner: 0, candidate: 0 });
    await controller.start(CHOICE, mic.stream);
    expect(controller.levels()).toEqual({ examiner: 0, candidate: 0.1 });

    const voice = aStream().stream;
    audio.srcObject = voice;
    expect(controller.levels()).toEqual({ examiner: 0.2, candidate: 0.1 });
    controller.levels();
    expect(levels.map((level) => level.stream)).toEqual([mic.stream, voice]);

    const reconnected = aStream().stream;
    audio.srcObject = reconnected;
    controller.levels();
    expect(levels[1]?.closed).toBe(true);
    expect(levels.map((level) => level.stream)).toEqual([mic.stream, voice, reconnected]);
  });

  it("reads silence from a stream Web Audio cannot open", async () => {
    const { controller, mic } = setUp({
      openLevel: () => {
        throw new Error("AudioContext failed");
      },
    });
    await controller.start(CHOICE, mic.stream);
    expect(controller.levels()).toEqual({ examiner: 0, candidate: 0 });
  });
});

describe("studioController — the end (D185)", () => {
  const ended = async (handles: ReturnType<typeof setUp>) => {
    await handles.controller.start(CHOICE, handles.mic.stream);
    await handles.controller.end();
    await handles.current.ended.promise;
    await settled();
  };

  it("ends when asked, keeps the recording on this device, and hands the session to the end card", async () => {
    const handles = setUp();
    await ended(handles);

    expect(handles.actions.find((action) => action.type === "ending")).toBeDefined();
    expect(handles.useCases.saveOralAudio).toHaveBeenCalledWith({ sessionId: ID, audio: expect.any(Blob) });
    expect(handles.endings).toEqual([{ type: "ended", session: session(), evicted: 1, failure: null, recordingKept: true }]);
    expect(handles.actions.at(-1)).toEqual({ type: "reset" });
  });

  it("lets the microphone, the examiner's audio, the levels and the session go", async () => {
    const handles = setUp();
    await handles.controller.start(CHOICE, handles.mic.stream);
    handles.audio.srcObject = aStream().stream;
    handles.controller.levels();
    await handles.controller.end();
    await settled();

    expect(handles.mic.track.stopped).toBe(true);
    expect(handles.audio).toMatchObject({ paused: true, srcObject: null });
    expect(handles.levels.every((level) => level.closed)).toBe(true);
    expect(handles.holds[0]?.released).toBe(true);
  });

  it("says the recording was not kept when the device refused it", async () => {
    const handles = setUp();
    handles.useCases.saveOralAudio.mockRejectedValueOnce(named("StorageQuotaError"));
    await ended(handles);

    expect(handles.endings[0]).toMatchObject({ recordingKept: false, evicted: 0 });
  });

  it("names the connection's failure when the transport failed, and not otherwise", async () => {
    const failed = aRun({ failure: named("ProviderUnavailableError"), endAs: session({ endReason: "transport-failed" }) });
    const handles = setUp({ started: Promise.resolve(failed.run) });
    await handles.controller.start(CHOICE, handles.mic.stream);
    await handles.controller.end();
    await settled();
    expect(handles.endings[0]).toMatchObject({ failure: "unreachable" });

    const clean = aRun({ failure: named("ProviderRequestError") });
    const other = setUp({ started: Promise.resolve(clean.run) });
    await other.controller.start(CHOICE, other.mic.stream);
    await other.controller.end();
    await settled();
    expect(other.endings[0]).toMatchObject({ failure: null });
  });

  it("ends a session at its cap with its reason, for the end card to say (D166)", async () => {
    const capped = aRun({ endAs: session({ endReason: "time-cap" }) });
    const handles = setUp({ started: Promise.resolve(capped.run) });
    await handles.controller.start(CHOICE, handles.mic.stream);
    await handles.controller.end();
    await settled();

    expect(handles.endings[0]?.session?.endReason).toBe("time-cap");
  });

  it("closes the transport, and ends with what was stored, when the driver fails", async () => {
    const broken = aRun();
    const handles = setUp({ started: Promise.resolve(broken.run) });
    await handles.controller.start(CHOICE, handles.mic.stream);
    broken.ended.reject(new Error("the store refused a turn"));
    await settled();

    expect(broken.endByUser).toHaveBeenCalled();
    expect(handles.endings[0]).toMatchObject({ session: session({ endReason: "transport-failed" }), failure: "failed" });
  });

  it("applies an end asked for while the call was still dialling", async () => {
    const pending = deferred<OralStudioRun>();
    const handles = setUp({ started: pending.promise });
    const starting = handles.controller.start(CHOICE, handles.mic.stream);
    await handles.controller.end();
    pending.resolve(handles.current.run);
    await starting;
    await settled();

    expect(handles.current.endByUser).toHaveBeenCalled();
    expect(handles.endings).toHaveLength(1);
  });

  it("cancels a call still dialling when End is pressed, and names no failure (D185)", async () => {
    const pending = deferred<OralStudioRun>();
    const handles = setUp({ started: pending.promise });
    const starting = handles.controller.start(CHOICE, handles.mic.stream);
    const signal = (handles.useCases.startOralStudio.mock.calls[0] as unknown[] | undefined)?.[2] as AbortSignal | undefined;
    expect(signal?.aborted).toBe(false);
    await handles.controller.end();
    expect(signal?.aborted).toBe(true);

    pending.reject(new Error("A realtime transport opens once."));
    await starting;
    expect(handles.endings[0]).toMatchObject({ failure: null, recordingKept: null });
    expect(handles.mic.track.stopped).toBe(true);
  });

  it("cancels a call still dialling when the screen goes away", async () => {
    const pending = deferred<OralStudioRun>();
    const handles = setUp({ started: pending.promise });
    const starting = handles.controller.start(CHOICE, handles.mic.stream);
    const signal = (handles.useCases.startOralStudio.mock.calls[0] as unknown[] | undefined)?.[2] as AbortSignal | undefined;
    handles.controller.dispose();
    expect(signal?.aborted).toBe(true);
    pending.resolve(handles.current.run);
    await starting;
  });

  it("leaves an open conversation's dial alone on End, and ends the run instead", async () => {
    const handles = setUp();
    await handles.controller.start(CHOICE, handles.mic.stream);
    const signal = (handles.useCases.startOralStudio.mock.calls[0] as unknown[] | undefined)?.[2] as AbortSignal | undefined;
    await handles.controller.end();

    expect(signal?.aborted).toBe(false);
    expect(handles.current.endByUser).toHaveBeenCalled();
  });

  it("ends the session when the screen goes away, and tells nobody", async () => {
    const handles = setUp();
    await handles.controller.start(CHOICE, handles.mic.stream);
    handles.controller.dispose();
    await settled();

    expect(handles.current.endByUser).toHaveBeenCalled();
    expect(handles.endings).toEqual([]);
    expect(handles.useCases.saveOralAudio).toHaveBeenCalled();
    expect(handles.mic.track.stopped).toBe(true);
  });

  it("ends a session the screen left while it was dialling, once it exists, and keeps working when attached again", async () => {
    const pending = deferred<OralStudioRun>();
    const handles = setUp({ started: pending.promise });
    const starting = handles.controller.start(CHOICE, handles.mic.stream);
    handles.controller.dispose();
    pending.resolve(handles.current.run);
    await starting;
    await settled();
    expect(handles.current.endByUser).toHaveBeenCalled();
    expect(handles.actions).toEqual([{ type: "started", choice: CHOICE, nowMs: 5_000 }]);

    handles.controller.attach();
    const again = aRun();
    handles.useCases.startOralStudio.mockReturnValueOnce(Promise.resolve(again.run));
    await handles.controller.start(CHOICE, aStream().stream);
    expect(handles.actions.at(-1)).toEqual({ type: "connected" });
  });
});
