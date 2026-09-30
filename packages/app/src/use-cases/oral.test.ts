import { describe, expect, it } from "vitest";

import { sessionId } from "@palier/domain";

import { StorageQuotaError } from "../ports/index.js";
import {
  SCENARIO,
  SESSION_ID,
  START,
  anOralSession,
  handTransport,
  liveSessions,
  oralStore,
  scenarioBank,
  settableClock,
} from "./__tests__/oral-fakes.js";
import {
  AUDIO_KEEP_SESSIONS,
  AUDIO_WARNING_BYTES,
  OralSessionExistsError,
  UnknownScenarioError,
  cleanUpAudio,
  closeAbandonedSessions,
  oralStorageEstimate,
  saveOralAudio,
  startOralSessionRun,
} from "./oral.js";

const MIN = 60_000;
const request = { sessionId: SESSION_ID, scenarioId: SCENARIO.id };

const setUp = (
  options: Parameters<typeof handTransport>[0] = {},
  seed: Parameters<typeof oralStore>[0] = [],
  live: readonly string[] = [],
) => {
  const clock = settableClock();
  const hand = handTransport(options);
  const oral = oralStore(seed);
  const liveness = liveSessions(live);
  const deps = { clock, items: scenarioBank(), oral, transport: hand.transport, liveness };
  return { clock, hand, oral, liveness, deps };
};

/** Let queued work settle: the run's queue is a chain of promises. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("startOralSessionRun", () => {
  it("refuses a scenario the bank does not hold, and stores nothing", async () => {
    const { oral, deps } = setUp();

    await expect(startOralSessionRun({ ...request, scenarioId: "absent" as never }, deps)).rejects.toBeInstanceOf(
      UnknownScenarioError,
    );
    expect(await oral.all()).toEqual([]);
  });

  it("refuses to start a session twice under one id", async () => {
    const { deps } = setUp({}, [anOralSession({ endedAt: START, endReason: "completed" })]);

    await expect(startOralSessionRun(request, deps)).rejects.toBeInstanceOf(OralSessionExistsError);
  });

  it("stamps an earlier session left running as interrupted, and leaves an ended one alone", async () => {
    const running = anOralSession({ id: sessionId("left-open"), startedAt: "2026-09-26T09:00:00.000Z" });
    const done = anOralSession({
      id: sessionId("done"),
      startedAt: "2026-09-25T09:00:00.000Z",
      endedAt: "2026-09-25T09:10:00.000Z",
      endReason: "completed",
    });
    const { oral, deps } = setUp({}, [running, done]);
    await startOralSessionRun(request, deps);

    expect(await oral.get(running.id)).toMatchObject({ endedAt: START, endReason: "interrupted" });
    expect(await oral.get(done.id)).toEqual(done);
  });

  it("leaves a session another page on this device is running, which that page would write back as running (D144)", async () => {
    const elsewhere = anOralSession({ id: sessionId("other-tab"), startedAt: "2026-09-26T09:00:00.000Z" });
    const { oral, deps } = setUp({}, [elsewhere], ["other-tab"]);
    await startOralSessionRun(request, deps);

    expect(await oral.get(elsewhere.id)).toEqual(elsewhere);
  });

  it("stores the running session and enters the first phase at its baseline", async () => {
    const { hand, oral, deps } = setUp();
    const run = await startOralSessionRun(request, deps);

    expect(run.scenario).toBe(SCENARIO);
    expect(await oral.get(SESSION_ID)).toEqual(anOralSession());
    expect(hand.directives()).toEqual([{ phase: 0, register: "baseline" }]);
  });

  it("moves to the next phase when a tick finds its minutes are up, and not before", async () => {
    const { clock, hand, deps } = setUp();
    const run = await startOralSessionRun(request, deps);
    clock.at(1.9);
    await run.tick();
    clock.at(2);
    await run.tick();

    expect(hand.directives()).toEqual([
      { phase: 0, register: "baseline" },
      { phase: 1, register: "baseline" },
    ]);
  });

  it("saves each turn as it arrives, stamped with the phase the clock is in", async () => {
    const { clock, hand, oral, deps } = setUp();
    await startOralSessionRun(request, deps);
    hand.say("examiner", "Parlez-moi de votre projet.", 0, 2_000);
    await settled();
    clock.at(2.5);
    hand.say("candidate", "Je dirige une migration.", 140_000, 150_000);
    await settled();

    expect((await oral.get(SESSION_ID))?.turns).toEqual([
      { speaker: "examiner", text: "Parlez-moi de votre projet.", phase: 0, startMs: 0, endMs: 2_000 },
      { speaker: "candidate", text: "Je dirige une migration.", phase: 1, startMs: 140_000, endMs: 150_000 },
    ]);
    expect(hand.directives().at(-1)).toEqual({ phase: 1, register: "baseline" });
  });

  it("keeps a studio examiner's notes as they arrive, stamped with the phase the clock is in (D168)", async () => {
    const { clock, hand, oral, deps } = setUp();
    await startOralSessionRun(request, deps);
    clock.at(1);
    hand.note("grammar", "« si j'aurais »");
    await settled();
    clock.at(3);
    hand.note("vocabulary", "« faire du sens »");
    await settled();

    const stored = await oral.get(SESSION_ID);
    expect(stored?.notes).toEqual([
      { criterion: "grammar", evidence: "« si j'aurais »", severity: "moderate", phase: 0 },
      { criterion: "vocabulary", evidence: "« faire du sens »", severity: "moderate", phase: 1 },
    ]);
    expect(stored?.turns).toEqual([]);
  });

  it("stores no notes on a session whose examiner took none", async () => {
    const { hand, deps } = setUp();
    const run = await startOralSessionRun(request, deps);
    hand.hangUp(false);

    expect((await run.ended).notes).toBeUndefined();
  });

  it("ends a studio session at its cap as time-cap, before the scenario's length (D166)", async () => {
    const { clock, hand, deps } = setUp();
    const run = await startOralSessionRun({ ...request, capMs: 8 * MIN }, deps);
    clock.at(8);
    await run.tick();
    const ended = await run.ended;

    expect(ended.endReason).toBe("time-cap");
    expect(hand.closeCalls()).toBe(1);
  });

  it("calls the transport's own clean close at the cap time-cap, not transport-closed", async () => {
    const { clock, hand, deps } = setUp();
    const run = await startOralSessionRun({ ...request, capMs: 8 * MIN }, deps);
    clock.at(8.1);
    hand.hangUp(false);

    expect((await run.ended).endReason).toBe("time-cap");
  });

  it("adapts the current phase when the examiner flags the candidate's difficulty", async () => {
    const { clock, hand, deps } = setUp();
    await startOralSessionRun(request, deps);
    clock.at(1);
    hand.flag("escalate");
    await settled();

    expect(hand.directives().at(-1)).toEqual({ phase: 0, register: "escalate" });
  });

  it("completes at the scenario's length: every phase entered, the transport closed, the end stored", async () => {
    const { clock, hand, oral, deps } = setUp();
    const run = await startOralSessionRun(request, deps);
    clock.at(10);
    await run.tick();
    const ended = await run.ended;

    expect(hand.directives().map((d) => d.phase)).toEqual([0, 1, 2]);
    expect(hand.closeCalls()).toBe(1);
    expect(ended).toMatchObject({ endedAt: "2026-09-27T10:10:00.000Z", endReason: "completed" });
    expect(await oral.get(SESSION_ID)).toEqual(ended);
  });

  it("keeps an answer that arrives after it asked to close, until the transport says closed", async () => {
    const { clock, hand, deps } = setUp({ deferClose: true });
    const run = await startOralSessionRun(request, deps);
    clock.at(10);
    await run.tick();
    hand.say("candidate", "… et c'est ainsi que nous avons fini.", 590_000, 601_000);
    hand.hangUp(false);
    const ended = await run.ended;

    expect(ended.endReason).toBe("completed");
    expect(ended.turns.map((t) => t.text)).toEqual(["… et c'est ainsi que nous avons fini."]);
    expect(ended.turns[0]?.phase).toBe(2);
  });

  it("ends early, as ended-by-user, when the candidate ends it", async () => {
    const { clock, hand, deps } = setUp();
    const run = await startOralSessionRun(request, deps);
    clock.at(3);
    await run.endByUser();

    expect((await run.ended).endReason).toBe("ended-by-user");
    expect(hand.closeCalls()).toBe(1);
  });

  it.each([
    [false, "transport-closed"],
    [true, "transport-failed"],
  ] as const)("ends when the far end hangs up (failed: %s) as %s, keeping every turn", async (failed, reason) => {
    const { clock, hand, deps } = setUp();
    const run = await startOralSessionRun(request, deps);
    hand.say("examiner", "Bonjour.", 0, 800);
    clock.at(4);
    hand.hangUp(failed);
    const ended = await run.ended;

    expect(ended).toMatchObject({ endReason: reason, endedAt: "2026-09-27T10:04:00.000Z" });
    expect(ended.turns).toHaveLength(1);
  });

  it("ignores everything once the transport has closed", async () => {
    const { clock, hand, oral, deps } = setUp();
    const run = await startOralSessionRun(request, deps);
    hand.hangUp(false);
    const ended = await run.ended;
    const puts = oral.puts();
    hand.say("candidate", "Trop tard.", 5_000, 6_000);
    clock.at(10);
    await run.tick();
    await run.endByUser();
    await settled();

    expect(await oral.get(SESSION_ID)).toEqual(ended);
    expect(oral.puts()).toBe(puts);
  });

  it("ends a session whose transport cannot open as transport-failed, and says why", async () => {
    const { oral, deps } = setUp({ failOpen: true });

    await expect(startOralSessionRun(request, deps)).rejects.toThrow("no connection");
    expect(await oral.get(SESSION_ID)).toMatchObject({ endedAt: START, endReason: "transport-failed" });
  });

  it("rejects `ended` when a directive cannot be carried out", async () => {
    const { deps } = setUp({ failDirect: true });
    const run = await startOralSessionRun(request, deps);

    await expect(run.ended).rejects.toThrow("the channel dropped");
  });
});

const sessionsWithAudio = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    anOralSession({ id: sessionId(`s-${String(i).padStart(2, "0")}`), startedAt: new Date(Date.parse(START) + i * MIN).toISOString() }),
  );

describe("saveOralAudio", () => {
  it("stores the recording and evicts nothing when there is room", async () => {
    const oral = oralStore([anOralSession()]);

    expect(await saveOralAudio({ sessionId: SESSION_ID, audio: new Blob(["son"]) }, { oral })).toEqual({ evicted: [] });
    expect((await oral.audio(SESSION_ID))?.size).toBe(3);
  });

  it(`keeps only the ${String(AUDIO_KEEP_SESSIONS)} newest sessions' recordings, deleting the oldest quietly`, async () => {
    const earlier = sessionsWithAudio(AUDIO_KEEP_SESSIONS);
    const latest = anOralSession({ startedAt: "2026-09-28T10:00:00.000Z" });
    const oral = oralStore([...earlier, latest], { audio: earlier.map((s) => [s.id, 4]) });

    const result = await saveOralAudio({ sessionId: latest.id, audio: new Blob(["son"]) }, { oral });

    expect(result).toEqual({ evicted: [] });
    const kept = (await oral.audioIndex()).map((e) => e.sessionId);
    expect(kept).toHaveLength(AUDIO_KEEP_SESSIONS);
    expect(kept).not.toContain(sessionId("s-00"));
    expect(kept).toContain(latest.id);
    expect(await oral.all()).toHaveLength(AUDIO_KEEP_SESSIONS + 1);
  });

  it("does not count a session's own earlier recording against the others", async () => {
    const earlier = sessionsWithAudio(AUDIO_KEEP_SESSIONS - 1);
    const oral = oralStore([...earlier, anOralSession({ startedAt: "2026-09-28T10:00:00.000Z" })], {
      audio: [...earlier.map((s): [typeof s.id, number] => [s.id, 4]), [SESSION_ID, 2]],
    });
    await saveOralAudio({ sessionId: SESSION_ID, audio: new Blob(["plus long"]) }, { oral });

    expect(await oral.audioIndex()).toHaveLength(AUDIO_KEEP_SESSIONS);
  });

  it("evicts the oldest recordings when the device is full, and says which", async () => {
    const earlier = sessionsWithAudio(3);
    const latest = anOralSession({ startedAt: "2026-09-28T10:00:00.000Z" });
    const oral = oralStore([...earlier, latest], { quotaBytes: 10, audio: earlier.map((s) => [s.id, 4]) });

    const result = await saveOralAudio({ sessionId: latest.id, audio: new Blob(["xxxxxx"]) }, { oral });

    expect(result.evicted).toEqual([sessionId("s-00"), sessionId("s-01")]);
    expect((await oral.audioIndex()).map((e) => e.sessionId)).toEqual([sessionId("s-02"), latest.id]);
    expect(await oral.all()).toHaveLength(4);
  });

  it("gives up with the quota error when nothing is left to evict", async () => {
    const oral = oralStore([anOralSession()], { quotaBytes: 2 });

    await expect(saveOralAudio({ sessionId: SESSION_ID, audio: new Blob(["son"]) }, { oral })).rejects.toBeInstanceOf(
      StorageQuotaError,
    );
  });

  it("evicts nothing for a failure that is not the device being full", async () => {
    const earlier = sessionsWithAudio(2);
    const oral = oralStore(earlier, { audio: earlier.map((s) => [s.id, 4]) });

    await expect(saveOralAudio({ sessionId: sessionId("absent"), audio: new Blob(["son"]) }, { oral })).rejects.toThrow(
      "no session",
    );
    expect(await oral.audioIndex()).toHaveLength(2);
  });
});

describe("oralStorageEstimate and cleanUpAudio", () => {
  it("counts the stored recordings' bytes, with no warning below 200 MB", async () => {
    const earlier = sessionsWithAudio(2);
    const oral = oralStore(earlier, { audio: [[earlier[0]!.id, 3], [earlier[1]!.id, 4]] });

    expect(await oralStorageEstimate({ oral })).toEqual({ bytes: 7, warn: false });
  });

  it("warns at 200 MB exactly", async () => {
    const oral = {
      ...oralStore(),
      audioIndex: () => Promise.resolve([{ sessionId: SESSION_ID, bytes: AUDIO_WARNING_BYTES, startedAt: START }]),
    };

    expect(await oralStorageEstimate({ oral })).toEqual({ bytes: 200 * 1024 * 1024, warn: true });
  });

  it("deletes every recording in one action and keeps every transcript", async () => {
    const earlier = sessionsWithAudio(3);
    const oral = oralStore(earlier, { audio: earlier.map((s) => [s.id, 4]) });
    await cleanUpAudio({ oral });

    expect(await oral.audioIndex()).toEqual([]);
    expect(await oral.all()).toHaveLength(3);
  });
});

describe("closeAbandonedSessions (D144)", () => {
  const abandoned = anOralSession({ id: sessionId("closed-hard"), startedAt: "2026-09-26T09:00:00.000Z" });
  const running = anOralSession({ id: sessionId("other-tab"), startedAt: "2026-09-27T09:55:00.000Z" });
  const done = anOralSession({ id: sessionId("done"), endedAt: "2026-09-25T09:10:00.000Z", endReason: "completed" });

  it("stamps a session no page is running as interrupted, now, keeping its turns, and names it", async () => {
    const withTurn = { ...abandoned, turns: [{ speaker: "candidate" as const, text: "Je travaille aux finances.", startMs: 0, endMs: 900, phase: 0 }] };
    const { oral, deps } = setUp({}, [withTurn]);

    expect(await closeAbandonedSessions(deps)).toEqual([abandoned.id]);
    expect(await oral.get(abandoned.id)).toEqual({ ...withTurn, endedAt: START, endReason: "interrupted" });
  });

  it("leaves a session a page is running, and one already ended", async () => {
    const { oral, deps } = setUp({}, [abandoned, running, done], ["other-tab"]);

    expect(await closeAbandonedSessions(deps)).toEqual([abandoned.id]);
    expect(await oral.get(running.id)).toEqual(running);
    expect(await oral.get(done.id)).toEqual(done);
  });

  it("leaves a session its page ended, and let go of, after the list was read", async () => {
    const { oral, deps } = setUp({}, [abandoned]);
    const ended = { ...abandoned, endedAt: "2026-09-27T09:59:00.000Z", endReason: "completed" as const };
    // The other tab's last write and its release land between reading the list and asking who is live.
    const liveness = {
      hold: () => () => undefined,
      live: async () => {
        await oral.put(ended);
        return new Set<ReturnType<typeof sessionId>>();
      },
    };

    expect(await closeAbandonedSessions({ ...deps, liveness })).toEqual([]);
    expect(await oral.get(abandoned.id)).toEqual(ended);
  });

  it("asks nothing of the pages when no session is open", async () => {
    const { liveness, deps } = setUp({}, [done]);

    expect(await closeAbandonedSessions(deps)).toEqual([]);
    expect(liveness.asked()).toBe(0);
  });
});
