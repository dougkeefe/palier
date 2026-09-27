import { scenarioId, sessionId } from "@palier/domain";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createContainer } from "./container";

/**
 * Spoken sessions through the real wiring (Phase 5 Slice 1, progress.md D115): the oral
 * store in both graphs, kept on this device alone. Its first screen is Slice 2; what has
 * to hold already is that a transcript never leaves the device in an export, and that a
 * wipe and a delete-everywhere take it with everything else [R11, R12].
 */

vi.mock("../server/db", () => ({ syncApi: () => Promise.resolve(null) }));

const MARKER = "ORAL-TRANSCRIPT-MARKER: je dirige la migration du système de paie.";

const aSession = (id: string) => ({
  id: sessionId(id),
  scenarioId: scenarioId("fixture-scenario-work-c"),
  startedAt: "2026-09-27T10:00:00.000Z",
  endedAt: "2026-09-27T10:10:00.000Z",
  endReason: "completed" as const,
  turns: [{ speaker: "candidate" as const, text: MARKER, phase: 1, startMs: 130_000, endMs: 142_000 }],
});

afterEach(async () => {
  // Every production container shares the one IndexedDB database, so leave it empty.
  await createContainer({ hermetic: false }).useCases.wipeData();
});

describe.each([
  ["hermetic", true],
  ["production", false],
])("the oral store, %s", (_graph, hermetic) => {
  it("never exports a session, and empties sessions and recordings on a wipe and on delete-everywhere [R12]", async () => {
    const c = createContainer({ hermetic });
    await c.oral.put(aSession("oral-1"));
    await c.oral.putAudio(sessionId("oral-1"), new Blob(["son"], { type: "audio/webm" }));

    const exported = JSON.stringify(await c.useCases.exportData());
    expect(exported).not.toContain("ORAL-TRANSCRIPT-MARKER");
    expect(exported).not.toContain("oral-1");

    await c.useCases.wipeData();
    expect(await c.oral.all()).toEqual([]);
    expect(await c.oral.audioIndex()).toEqual([]);

    await c.oral.put(aSession("oral-2"));
    await c.useCases.deleteEverywhere();
    expect(await c.oral.all()).toEqual([]);
  });
});
