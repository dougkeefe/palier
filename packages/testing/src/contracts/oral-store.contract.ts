import { describe, expect, it } from "vitest";

import type { OralSession, OralStore } from "@palier/app";
import { scenarioId, sessionId } from "@palier/domain";

const aSession = (id: string, startedAt: string, over: Partial<OralSession> = {}): OralSession => ({
  id: sessionId(id),
  scenarioId: scenarioId("fixture-scenario-work-c"),
  startedAt,
  endedAt: null,
  endReason: null,
  turns: [],
  assessment: null,
  ...over,
});

const aTranscript = (): OralSession["turns"] => [
  { speaker: "examiner", text: "Parlez-moi de votre rôle.", phase: 0, startMs: 0, endMs: 2_400 },
  { speaker: "candidate", text: "Je suis analyste aux finances.", phase: 0, startMs: 3_100, endMs: 7_800, input: "voice" },
];

/** A report placed over `aTranscript()`, whose one error marks "analyste" in the candidate's turn. */
const aReport = (): NonNullable<OralSession["assessment"]> => {
  const criterion = { band: "B" as const, evidence: "« Je suis analyste »" };
  const fix = { criterion: "grammar" as const, subSkill: "agreement" as const, advice: "Accordez.", evidence: "analyste" };
  const word = { word: "conseillère", turn: 1, excerpt: "analyste", example: "Je suis conseillère aux finances." };
  return {
    criteria: { comprehension: criterion, fluency: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
    fixes: [fix, fix, fix],
    missingWords: [word, word, word, word, word],
    errors: [{ turn: 1, start: 8, end: 16, correction: "analyste principale", rule: "précision" }],
  };
};

const aRecording = (text: string): Blob => new Blob([text], { type: "audio/webm" });

/** Blobs have no enumerable fields, so `toEqual` would pass any two; compare what they hold. */
const contentsOf = async (blob: Blob | null) =>
  blob === null ? null : { size: blob.size, type: blob.type, text: await blob.text() };

/**
 * Spoken sessions and their recordings (progress.md D115). A session is an upsert by
 * id, read back whole and listed newest first. A recording belongs to a stored
 * session, is listed oldest first with its size for the retention policy, and can be
 * deleted without touching the transcript, which is kept for good (architecture.md §9.1).
 */
export const oralStoreContract = (name: string, make: () => Promise<OralStore>): void => {
  describe(`OralStore contract: ${name}`, () => {
    it("holds nothing on a fresh device", async () => {
      const store = await make();

      expect(await store.all()).toEqual([]);
      expect(await store.get(sessionId("absent"))).toBeNull();
      expect(await store.audio(sessionId("absent"))).toBeNull();
      expect(await store.audioIndex()).toEqual([]);
    });

    it("returns a session exactly as it was put, running and ended", async () => {
      const store = await make();
      const running = aSession("a", "2026-09-27T10:00:00.000Z", { turns: aTranscript() });
      const ended = aSession("b", "2026-09-27T11:00:00.000Z", {
        turns: aTranscript(),
        endedAt: "2026-09-27T11:10:00.000Z",
        endReason: "completed",
      });
      await store.put(running);
      await store.put(ended);

      expect(await store.get(sessionId("a"))).toEqual(running);
      expect(await store.get(sessionId("b"))).toEqual(ended);
    });

    it("returns an ended session's report exactly as it was put (D126)", async () => {
      const store = await make();
      const assessed = aSession("a", "2026-09-27T10:00:00.000Z", {
        turns: aTranscript(),
        endedAt: "2026-09-27T10:10:00.000Z",
        endReason: "completed",
        assessment: aReport(),
      });
      await store.put(assessed);

      expect(await store.get(sessionId("a"))).toEqual(assessed);
      expect(await store.all()).toEqual([assessed]);
    });

    it("replaces a session put again under the same id", async () => {
      const store = await make();
      await store.put(aSession("a", "2026-09-27T10:00:00.000Z"));
      const grown = aSession("a", "2026-09-27T10:00:00.000Z", { turns: aTranscript() });
      await store.put(grown);

      expect(await store.all()).toEqual([grown]);
    });

    it("lists sessions newest first, whatever order they were put in", async () => {
      const store = await make();
      await store.put(aSession("mid", "2026-09-26T10:00:00.000Z"));
      await store.put(aSession("new", "2026-09-27T10:00:00.000Z"));
      await store.put(aSession("old", "2026-09-20T10:00:00.000Z"));

      expect((await store.all()).map((s) => s.id)).toEqual(["new", "mid", "old"]);
    });

    it("refuses a recording for a session it does not hold, and stores nothing", async () => {
      const store = await make();

      await expect(store.putAudio(sessionId("absent"), aRecording("son"))).rejects.toThrow();
      expect(await store.audioIndex()).toEqual([]);
    });

    it("returns a recording as it was stored, and lists it with its size and its session's start", async () => {
      const store = await make();
      await store.put(aSession("a", "2026-09-27T10:00:00.000Z"));
      await store.putAudio(sessionId("a"), aRecording("quatre"));

      expect(await contentsOf(await store.audio(sessionId("a")))).toEqual({ size: 6, type: "audio/webm", text: "quatre" });
      expect(await store.audioIndex()).toEqual([
        { sessionId: sessionId("a"), bytes: 6, startedAt: "2026-09-27T10:00:00.000Z" },
      ]);
    });

    it("replaces a session's recording stored again", async () => {
      const store = await make();
      await store.put(aSession("a", "2026-09-27T10:00:00.000Z"));
      await store.putAudio(sessionId("a"), aRecording("court"));
      await store.putAudio(sessionId("a"), aRecording("plus long"));

      expect(await contentsOf(await store.audio(sessionId("a")))).toMatchObject({ text: "plus long" });
      expect((await store.audioIndex()).map((e) => e.bytes)).toEqual([9]);
    });

    it("lists recordings oldest first, by their session's start", async () => {
      const store = await make();
      for (const [id, at] of [
        ["mid", "2026-09-26T10:00:00.000Z"],
        ["new", "2026-09-27T10:00:00.000Z"],
        ["old", "2026-09-20T10:00:00.000Z"],
      ] as const) {
        await store.put(aSession(id, at));
        await store.putAudio(sessionId(id), aRecording(id));
      }

      expect((await store.audioIndex()).map((e) => e.sessionId)).toEqual(["old", "mid", "new"]);
    });

    it("deletes only the recordings named, and keeps every transcript", async () => {
      const store = await make();
      const a = aSession("a", "2026-09-26T10:00:00.000Z", { turns: aTranscript() });
      const b = aSession("b", "2026-09-27T10:00:00.000Z", { turns: aTranscript() });
      await store.put(a);
      await store.put(b);
      await store.putAudio(a.id, aRecording("a"));
      await store.putAudio(b.id, aRecording("b"));
      await store.deleteAudio([a.id, sessionId("absent")]);

      expect(await contentsOf(await store.audio(a.id))).toBeNull();
      expect(await contentsOf(await store.audio(b.id))).toMatchObject({ text: "b" });
      expect(await store.all()).toEqual([b, a]);
    });

    it("empties sessions and recordings on clear", async () => {
      const store = await make();
      await store.put(aSession("a", "2026-09-27T10:00:00.000Z", { turns: aTranscript() }));
      await store.putAudio(sessionId("a"), aRecording("son"));
      await store.clear();

      expect(await store.all()).toEqual([]);
      expect(await store.audio(sessionId("a"))).toBeNull();
      expect(await store.audioIndex()).toEqual([]);
    });
  });
};
