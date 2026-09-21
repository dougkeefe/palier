import { settingsStoreContract } from "@palier/testing";
import { describe, expect, it } from "vitest";

import { PalierDb } from "./db.js";
import { dexieSettingsStore } from "./settings-store.js";

const dbName = (): string => `palier-settings-${globalThis.crypto.randomUUID()}`;

settingsStoreContract("dexie", () => Promise.resolve(dexieSettingsStore(new PalierDb(dbName()))));

describe("dexieSettingsStore", () => {
  it("survives a reopen", async () => {
    const name = dbName();
    const first = dexieSettingsStore(new PalierDb(name));
    await first.set("locale", "fr");

    const reopened = dexieSettingsStore(new PalierDb(name));
    expect(await reopened.get<string>("locale")).toBe("fr");
  });
});
