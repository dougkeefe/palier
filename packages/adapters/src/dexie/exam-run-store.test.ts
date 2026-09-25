import { anExamRun, examRunStoreContract } from "@palier/testing";
import { sessionId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { PalierDb } from "./db.js";
import { dexieExamRunStore } from "./exam-run-store.js";

const dbName = (): string => `palier-exam-runs-${globalThis.crypto.randomUUID()}`;

examRunStoreContract("dexie", () => Promise.resolve(dexieExamRunStore(new PalierDb(dbName()))));

describe("dexieExamRunStore", () => {
  it("survives a reopen with the elapsed exam time intact", async () => {
    const name = dbName();
    const first = dexieExamRunStore(new PalierDb(name));
    await first.put(anExamRun({ id: sessionId("r-1"), elapsedMs: 1_234_000 }));

    const reopened = dexieExamRunStore(new PalierDb(name));
    expect(await reopened.unsubmitted()).toMatchObject({ id: "r-1", elapsedMs: 1_234_000 });
  });
});
