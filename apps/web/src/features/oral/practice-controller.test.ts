import type { OralPracticeRun, OralSession, OralSessionChoice } from "@palier/app";
import { type SessionId, scenarioId, sessionId } from "@palier/domain";
import { describe, expect, it, vi } from "vitest";

import type { MediaKit, RecorderLike } from "../../lib/oral/recorder";
import { practiceController, type PracticeControllerDeps } from "./practice-controller";
import type { PracticeAction } from "./practice-view";

const CHOICE: OralSessionChoice = {
  sessionType: "warmup",
  minutes: 5,
  scenario: {
    id: scenarioId("s-warmup"),
    lang: "fr",
    sessionType: "warmup",
    targetBand: "C",
    topic: "project-management",
    phases: [{ name: "P", minutes: 5, intent: "i", seedQuestions: ["q"], escalation: [], deescalation: [] }],
  },
};
const PREFLIGHT = { estimateUsd: 0.05, before: "none", after: "none" } as const;
const ID = sessionId("oral-ctl-1");
const QUESTION = { text: "Parlez-moi de votre poste.", audio: null, phase: 0 };

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

/** A stream whose one track records whether it was stopped. */
const aStream = () => {
  const track = { stopped: false, stop() { this.stopped = true; } };
  return { stream: { getTracks: () => [track] } as unknown as MediaStream, track };
};

/** A `MediaKit` whose recorders note what was asked of them, or throw when told to. */
const mediaKit = (options: { failAt?: number } = {}) => {
  const made: string[][] = [];
  const kit: MediaKit = {
    record: () => {
      if (options.failAt === made.length) {
        made.push([]);
        throw new Error("NotSupportedError");
      }
      const calls: string[] = [];
      made.push(calls);
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
          (this as { state: string }).state = "paused";
        },
        resume() {
          calls.push("resume");
          (this as { state: string }).state = "recording";
        },
        stop() {
          calls.push("stop");
          (this as { state: string }).state = "inactive";
          this.ondataavailable?.({ data: new Blob(["bytes"]) });
          this.onstop?.();
        },
      };
      return recorder;
    },
    supports: () => true,
    now: () => 0,
  };
  return { kit, made };
};

const session = (over: Partial<OralSession> = {}): OralSession => ({
  id: ID,
  scenarioId: CHOICE.scenario.id,
  startedAt: "2026-09-28T10:00:00.000Z",
  endedAt: "2026-09-28T10:05:00.000Z",
  endReason: "ended-by-user",
  turns: [],
  assessment: null,
  ...over,
});

/** A practice run the test ends by hand, as the driver would. */
const aRun = (failure: unknown = null) => {
  const ended = deferred<OralSession>();
  const endByUser = vi.fn(() => {
    ended.resolve(session());
    return Promise.resolve();
  });
  const run = { scenario: CHOICE.scenario, tick: () => Promise.resolve(), endByUser, ended: ended.promise, failure: () => failure };
  return { run: run as unknown as OralPracticeRun, ended, endByUser };
};

const setUp = (over: Partial<PracticeControllerDeps> & { started?: Promise<OralPracticeRun> } = {}) => {
  const actions: PracticeAction[] = [];
  const mic = aStream();
  const media = mediaKit();
  const current = aRun();
  const useCases = {
    preflightSpend: vi.fn(() => Promise.resolve(PREFLIGHT)),
    startOralPractice: vi.fn((_request: unknown, answers: unknown) => {
      bridgeSource = answers as { answer: (q: typeof QUESTION, s: AbortSignal) => Promise<unknown> };
      return over.started ?? Promise.resolve(current.run);
    }),
    oralSession: vi.fn(() => Promise.resolve<OralSession | null>(session({ endReason: "transport-failed" }))),
    saveOralAudio: vi.fn(() => Promise.resolve({ evicted: [sessionId("old-1"), sessionId("old-2")] })),
  };
  let bridgeSource: { answer: (q: typeof QUESTION, s: AbortSignal) => Promise<unknown> } | null = null;
  const onNoKey = vi.fn();
  /** Each session the controller held as running, and whether it has let go (D144). */
  const holds: { readonly id: SessionId; released: boolean }[] = [];
  const controller = practiceController({
    useCases,
    newSessionId: () => ID,
    holdSession: (id) => {
      const hold = { id, released: false };
      holds.push(hold);
      return () => {
        hold.released = true;
      };
    },
    openMic: () => Promise.resolve(mic.stream),
    measureLevel: () => Promise.resolve(0.2),
    media: media.kit,
    now: () => 1_000,
    dispatch: (action) => actions.push(action),
    onLevel: () => undefined,
    onNoKey,
    ...over,
  });
  /** The session asks its first question, as the transport would. */
  const ask = () => {
    const wait = new AbortController();
    const answered = bridgeSource?.answer(QUESTION, wait.signal);
    return { answered, wait };
  };
  return { controller, actions, mic, media, current, useCases, onNoKey, ask, holds };
};

const types = (actions: readonly PracticeAction[]) => actions.map((action) => action.type);

describe("practiceController — the microphone check (D121)", () => {
  it("listens, then says whether it heard, keeping the microphone open for the session", async () => {
    const { controller, actions, mic } = setUp();
    await controller.checkMic();
    expect(actions).toEqual([
      { type: "mic", mic: "listening" },
      { type: "mic", mic: "ok" },
    ]);
    expect(mic.track.stopped).toBe(false);
  });

  it("says it heard next to nothing below the threshold", async () => {
    const { controller, actions } = setUp({ measureLevel: () => Promise.resolve(0) });
    await controller.checkMic();
    expect(actions.at(-1)).toEqual({ type: "mic", mic: "quiet" });
  });

  it("names a refusal, and a level check that fails lets the microphone go", async () => {
    const refused = setUp({ openMic: () => Promise.reject(Object.assign(new Error("no"), { name: "NotAllowedError" })) });
    await refused.controller.checkMic();
    expect(refused.actions.at(-1)).toEqual({ type: "mic", mic: "denied" });

    const broken = setUp({ measureLevel: () => Promise.reject(new Error("AudioContext failed")) });
    await broken.controller.checkMic();
    expect(broken.actions.at(-1)).toEqual({ type: "mic", mic: "failed" });
    expect(broken.mic.track.stopped).toBe(true);
  });

  it("drops a verdict that arrives after Back, and lets the microphone go on Back", async () => {
    const level = deferred<number>();
    const { controller, actions, mic } = setUp({ measureLevel: () => level.promise });
    const checking = controller.checkMic();
    await settled();
    controller.back();
    level.resolve(0.2);
    await checking;

    expect(types(actions)).toEqual(["mic", "back"]);
    expect(mic.track.stopped).toBe(true);
  });

  it("lets go of a microphone that opens after the user moved on", async () => {
    const opening = deferred<MediaStream>();
    const late = aStream();
    const { controller, actions } = setUp({ openMic: () => opening.promise });
    const checking = controller.checkMic();
    controller.back();
    opening.resolve(late.stream);
    await checking;

    expect(late.track.stopped).toBe(true);
    expect(types(actions)).toEqual(["mic", "back"]);
  });

  it("drops a failure that arrives after the user moved on", async () => {
    const opening = deferred<MediaStream>();
    const { controller, actions } = setUp({ openMic: () => opening.promise });
    const checking = controller.checkMic();
    controller.back();
    opening.reject(Object.assign(new Error("no"), { name: "NotAllowedError" }));
    await checking;
    expect(types(actions)).toEqual(["mic", "back"]);
  });
});

describe("practiceController — the pre-flight (D121)", () => {
  it("prices the session's minutes, and a typed session lets the microphone go", async () => {
    const { controller, actions, mic, useCases } = setUp();
    await controller.checkMic();
    await controller.continueWith(CHOICE, "typed");

    expect(useCases.preflightSpend).toHaveBeenCalledWith({ feature: "oral-practice", quantity: 5 });
    expect(actions.at(-1)).toEqual({ type: "preflighted", mode: "typed", preflight: PREFLIGHT });
    expect(mic.track.stopped).toBe(true);
  });

  it("answers by typing when asked to speak with no microphone open", async () => {
    const { controller, actions } = setUp();
    await controller.continueWith(CHOICE, "spoken");
    expect(actions.at(-1)).toMatchObject({ type: "preflighted", mode: "typed" });
  });

  it("runs once however often it is tapped while in flight", async () => {
    const pending = deferred<typeof PREFLIGHT>();
    const { controller, useCases } = setUp();
    useCases.preflightSpend.mockReturnValueOnce(pending.promise);
    const first = controller.continueWith(CHOICE, "typed");
    await controller.continueWith(CHOICE, "spoken");
    pending.resolve(PREFLIGHT);
    await first;
    expect(useCases.preflightSpend).toHaveBeenCalledTimes(1);
  });
});

describe("practiceController — a session (D121)", () => {
  const spokenSession = async (over: Parameters<typeof setUp>[0] = {}) => {
    const handles = setUp(over);
    await handles.controller.checkMic();
    await handles.controller.continueWith(CHOICE, "spoken");
    await handles.controller.start(CHOICE, "spoken");
    return handles;
  };

  it("starts once, recording the session's answers, and keeps the recording at the end, saying what was evicted", async () => {
    const { controller, actions, media, current, useCases, mic, ask } = await spokenSession();
    await controller.start(CHOICE, "spoken");
    expect(useCases.startOralPractice).toHaveBeenCalledTimes(1);
    expect(actions.find((a) => a.type === "started")).toEqual({ type: "started", nowMs: 1_000, mode: "spoken" });

    const { answered } = ask();
    controller.record();
    await controller.stopAndSend();
    expect(await answered).toMatchObject({ kind: "audio", durationMs: 0 });
    await controller.end();
    await settled();

    expect(current.endByUser).toHaveBeenCalled();
    // The session's recorder ran only while the candidate answered; the answer's own recorder once.
    expect(media.made).toEqual([
      ["start", "pause", "stop"],
      ["start", "stop"],
    ]);
    expect(useCases.saveOralAudio).toHaveBeenCalledWith({ sessionId: ID, audio: expect.any(Blob) });
    expect(actions.at(-1)).toMatchObject({ type: "ended", evicted: 2, failure: null, recordingKept: true });
    expect(mic.track.stopped).toBe(true);
  });

  it("says the recording could not be kept when the device refuses it", async () => {
    const handles = await spokenSession();
    handles.useCases.saveOralAudio.mockRejectedValueOnce(new Error("QuotaExceededError"));
    handles.ask();
    handles.controller.record();
    await handles.controller.stopAndSend();
    await handles.controller.end();
    await settled();
    expect(handles.actions.at(-1)).toMatchObject({ type: "ended", recordingKept: false, evicted: 0 });
  });

  it("keeps no recording, and says nothing of one, for a typed session", async () => {
    const { controller, actions, useCases, ask } = setUp();
    await controller.continueWith(CHOICE, "typed");
    await controller.start(CHOICE, "typed");
    const { answered } = ask();
    expect(controller.sendTyped("  ")).toBe(false);
    expect(controller.sendTyped(" Je suis analyste. ")).toBe(true);
    expect(await answered).toEqual({ kind: "typed", text: "Je suis analyste." });
    expect(controller.sendTyped("Encore.")).toBe(false);
    await controller.end();
    await settled();
    expect(useCases.saveOralAudio).not.toHaveBeenCalled();
    expect(actions.at(-1)).toMatchObject({ type: "ended", recordingKept: null });
  });

  it("answers by typing for the whole session when the session recorder cannot be made", async () => {
    const handles = setUp({ media: mediaKit({ failAt: 0 }).kit });
    await handles.controller.checkMic();
    await handles.controller.continueWith(CHOICE, "spoken");
    await handles.controller.start(CHOICE, "spoken");
    expect(handles.actions.find((a) => a.type === "started")).toMatchObject({ mode: "typed" });
    expect(handles.mic.track.stopped).toBe(true);
  });

  it("turns to typing when an answer's recorder cannot start, keeping no clip", async () => {
    const media = mediaKit({ failAt: 1 });
    const handles = await spokenSession({ media: media.kit });
    handles.ask();
    handles.controller.record();
    expect(handles.actions.at(-1)).toEqual({ type: "recordFailed" });
    expect(media.made[0]).toEqual(["start", "pause"]);
    await handles.controller.stopAndSend();
    expect(handles.actions.at(-1)).toEqual({ type: "recordFailed" });
  });

  it("sends the pause before a spoken answer, measured from the question's appearing when it has no voice (D127)", async () => {
    let clock = 1_000;
    const handles = await spokenSession({ now: () => clock });
    await handles.controller.start(CHOICE, "spoken");
    const { answered } = handles.ask();
    clock = 3_400;
    handles.controller.record();
    clock = 9_000;
    await handles.controller.stopAndSend();

    expect(await answered).toMatchObject({ kind: "audio", pauseMs: 2_400 });
  });

  it("measures a voiced question's pause from when its voice stopped, and none when Record interrupts it (D127)", async () => {
    let clock = 1_000;
    const handles = await spokenSession({ now: () => clock });
    await handles.controller.start(CHOICE, "spoken");
    const voiced = { ...QUESTION, audio: new Blob(["voix"]) };
    const wait = new AbortController();
    const bridge = handles.useCases.startOralPractice.mock.calls[0]?.[1] as { answer: (q: typeof voiced, s: AbortSignal) => Promise<unknown> };
    const first = bridge.answer(voiced, wait.signal);
    clock = 5_000;
    handles.controller.questionHeard();
    clock = 6_500;
    handles.controller.record();
    await handles.controller.stopAndSend();
    expect(await first).toMatchObject({ pauseMs: 1_500 });

    const second = bridge.answer(voiced, wait.signal);
    handles.controller.questionHeard();
    handles.controller.questionPlaying(); // played again, and Record pressed over it
    clock = 7_000;
    handles.controller.record();
    await handles.controller.stopAndSend();
    expect(await second).toMatchObject({ pauseMs: 0 });
  });

  it("never carries the last question's heard time into the next: an unheard new voice is no pause", async () => {
    let clock = 1_000;
    const handles = await spokenSession({ now: () => clock });
    await handles.controller.start(CHOICE, "spoken");
    const voiced = { ...QUESTION, audio: new Blob(["voix"]) };
    const wait = new AbortController();
    const bridge = handles.useCases.startOralPractice.mock.calls[0]?.[1] as { answer: (q: typeof voiced, s: AbortSignal) => Promise<unknown> };
    const first = bridge.answer(voiced, wait.signal);
    clock = 3_000;
    handles.controller.questionHeard();
    handles.controller.record();
    await handles.controller.stopAndSend();
    await first;

    // The next question's voice has not been heard yet when Record is pressed, well after the first was.
    const second = bridge.answer(voiced, wait.signal);
    clock = 9_000;
    handles.controller.record();
    await handles.controller.stopAndSend();
    expect(await second).toMatchObject({ pauseMs: 0 });
  });

  it("sends no pause with a typed answer", async () => {
    const handles = setUp();
    await handles.controller.continueWith(CHOICE, "typed");
    await handles.controller.start(CHOICE, "typed");
    const { answered } = handles.ask();
    handles.controller.sendTyped("Oui.");
    expect(await answered).toEqual({ kind: "typed", text: "Oui." });
  });

  it("records nothing more while an answer is already being recorded", async () => {
    const media = mediaKit();
    const handles = await spokenSession({ media: media.kit });
    handles.ask();
    handles.controller.record();
    handles.controller.record();
    expect(media.made).toHaveLength(2);
  });

  it("stops the answer being recorded when the session is ended mid-answer", async () => {
    const media = mediaKit();
    const handles = await spokenSession({ media: media.kit });
    handles.ask();
    handles.controller.record();
    await handles.controller.end();
    expect(media.made[1]).toEqual(["start", "stop"]);
    expect(media.made[0]).toContain("pause");
  });

  it("ticks the run the screen's timer drives, and nothing before one exists", async () => {
    const handles = setUp();
    await expect(handles.controller.tick()).resolves.toBeUndefined();
    const tick = vi.fn(() => Promise.resolve());
    (handles.current.run as unknown as { tick: () => Promise<void> }).tick = tick;
    await handles.controller.continueWith(CHOICE, "typed");
    await handles.controller.start(CHOICE, "typed");
    await handles.controller.tick();
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it("keeps End pressed before the run exists, and ends it the moment it does", async () => {
    const started = deferred<OralPracticeRun>();
    const current = aRun();
    const handles = setUp({ started: started.promise });
    await handles.controller.continueWith(CHOICE, "typed");
    const starting = handles.controller.start(CHOICE, "typed");
    await handles.controller.end();
    started.resolve(current.run);
    await starting;
    await settled();

    expect(current.endByUser).toHaveBeenCalledTimes(1);
    expect(handles.actions.at(-1)).toMatchObject({ type: "ended" });
  });

  it("names the failure the transport kept, and shows the no-key card again when the key is gone", async () => {
    const failed = aRun(Object.assign(new Error("gone"), { name: "NoApiKeyError" }));
    const handles = setUp({ started: Promise.resolve(failed.run) });
    await handles.controller.continueWith(CHOICE, "typed");
    await handles.controller.start(CHOICE, "typed");
    failed.ended.resolve(session({ endReason: "transport-failed" }));
    await settled();

    expect(handles.actions.at(-1)).toMatchObject({ type: "ended", failure: "no-key" });
    expect(handles.onNoKey).toHaveBeenCalled();
  });

  it("closes the transport and ends with what was stored when the driver fails", async () => {
    const broken = aRun();
    const handles = setUp({ started: Promise.resolve(broken.run) });
    await handles.controller.continueWith(CHOICE, "typed");
    await handles.controller.start(CHOICE, "typed");
    broken.ended.reject(new Error("the store is full"));
    await settled();

    expect(broken.endByUser).toHaveBeenCalled();
    expect(handles.useCases.oralSession).toHaveBeenCalledWith({ sessionId: ID });
    expect(handles.actions.at(-1)).toMatchObject({ type: "ended", failure: "failed", session: { endReason: "transport-failed" } });
  });

  it("ends with an empty session, named as failed, when the run cannot start and nothing was stored", async () => {
    const handles = setUp({ started: Promise.reject(Object.assign(new Error("bad"), { name: "InvalidApiKeyError" })) });
    handles.useCases.oralSession.mockResolvedValueOnce(null);
    await handles.controller.continueWith(CHOICE, "typed");
    await handles.controller.start(CHOICE, "typed");

    expect(handles.actions.at(-1)).toMatchObject({ type: "ended", failure: "invalid-key", session: { id: ID, turns: [] } });
  });

  it("ends with the stored session when the lookup after a failure fails too", async () => {
    const broken = aRun();
    const handles = setUp({ started: Promise.resolve(broken.run) });
    handles.useCases.oralSession.mockRejectedValueOnce(new Error("IndexedDB gone"));
    await handles.controller.continueWith(CHOICE, "typed");
    await handles.controller.start(CHOICE, "typed");
    broken.ended.reject(new Error("the store is full"));
    await settled();
    expect(handles.actions.at(-1)).toMatchObject({ type: "ended", session: { id: ID, turns: [] } });
  });

  it("ends a session in progress and lets the microphone go when the screen goes away, saying nothing after", async () => {
    const media = mediaKit();
    const handles = await spokenSession({ media: media.kit });
    handles.ask();
    handles.controller.record();
    const before = handles.actions.length;
    handles.controller.dispose();
    await settled();

    expect(handles.current.endByUser).toHaveBeenCalled();
    expect(handles.mic.track.stopped).toBe(true);
    expect(media.made[1]).toContain("stop");
    expect(handles.actions).toHaveLength(before);
  });

  it("works again once the screen is attached after a dispose, as Strict Mode remounts it", async () => {
    const handles = setUp();
    handles.controller.dispose();
    handles.controller.attach();
    await handles.controller.checkMic();
    expect(handles.actions.at(-1)).toEqual({ type: "mic", mic: "ok" });
  });

  it("holds the session as running in this page before it is stored, and lets go once it has ended (D144)", async () => {
    const handles = setUp();
    handles.useCases.startOralPractice.mockImplementationOnce(() => {
      expect(handles.holds).toEqual([{ id: ID, released: false }]);
      return Promise.resolve(handles.current.run);
    });
    await handles.controller.continueWith(CHOICE, "typed");
    await handles.controller.start(CHOICE, "typed");
    expect(handles.holds).toEqual([{ id: ID, released: false }]);

    await handles.controller.end();
    await settled();
    expect(handles.holds).toEqual([{ id: ID, released: true }]);
  });

  it("lets go of the session when the screen goes away and the run ends, and when the run never starts (D144)", async () => {
    const leaving = setUp();
    await leaving.controller.continueWith(CHOICE, "typed");
    await leaving.controller.start(CHOICE, "typed");
    leaving.controller.dispose();
    await settled();
    expect(leaving.holds.map((hold) => hold.released)).toEqual([true]);

    const refused = setUp({ started: Promise.reject(new Error("refused")) });
    await refused.controller.continueWith(CHOICE, "typed");
    await refused.controller.start(CHOICE, "typed");
    await settled();
    expect(refused.holds.map((hold) => hold.released)).toEqual([true]);
  });

  it("ends a run that starts after the screen went away", async () => {
    const started = deferred<OralPracticeRun>();
    const current = aRun();
    const handles = setUp({ started: started.promise });
    await handles.controller.continueWith(CHOICE, "typed");
    const starting = handles.controller.start(CHOICE, "typed");
    handles.controller.dispose();
    started.resolve(current.run);
    await starting;
    expect(current.endByUser).toHaveBeenCalled();
  });
});
