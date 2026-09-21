import { anAttempt } from "@palier/testing";
import { describe, expect, it } from "vitest";

import { dexieStores } from "./index.js";

const dbName = (): string => `palier-stores-${globalThis.crypto.randomUUID()}`;

describe("dexieStores", () => {
  it("wires all five ports to one named database", async () => {
    const stores = dexieStores(dbName());

    await stores.attempts.append(anAttempt());
    await stores.settings.set("locale", "fr");
    await stores.keyVault.putApiKey("sk-wired");

    expect(await stores.attempts.recent("reading", 10)).toHaveLength(1);
    expect(await stores.settings.get<string>("locale")).toBe("fr");
    expect(await stores.keyVault.hasApiKey()).toBe(true);
  });

  it("binds the name to a persistent database two calls share", async () => {
    const name = dbName();
    await dexieStores(name).settings.set("theme", "dark");

    expect(await dexieStores(name).settings.get<string>("theme")).toBe("dark");
  });
});
