import { describe, expect, it } from "vitest";

import { StorageQuotaError } from "@palier/app";
import { scenarioId, sessionId } from "@palier/domain";

import { memoryOralStore } from "./oral-store.js";

const aSession = (id: string) => ({
  id: sessionId(id),
  scenarioId: scenarioId("s"),
  startedAt: "2026-09-27T10:00:00.000Z",
  endedAt: null,
  endReason: null,
  turns: [],
});

/** The quota the shared contract cannot set: a full device refuses a recording and stores nothing. */
describe("memoryOralStore with a quota", () => {
  it("refuses a recording that would pass the quota, keeping what it had", async () => {
    const store = memoryOralStore({ quotaBytes: 5 });
    await store.put(aSession("a"));
    await store.put(aSession("b"));
    await store.putAudio(sessionId("a"), new Blob(["abc"]));

    await expect(store.putAudio(sessionId("b"), new Blob(["abc"]))).rejects.toBeInstanceOf(StorageQuotaError);
    expect((await store.audioIndex()).map((e) => e.sessionId)).toEqual([sessionId("a")]);
  });

  it("does not count a session's own recording against its replacement", async () => {
    const store = memoryOralStore({ quotaBytes: 5 });
    await store.put(aSession("a"));
    await store.putAudio(sessionId("a"), new Blob(["abcd"]));
    await store.putAudio(sessionId("a"), new Blob(["abcde"]));

    expect((await store.audio(sessionId("a")))?.size).toBe(5);
  });
});
