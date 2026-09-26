import { anAttempt, anExamRun } from "@palier/testing";
import { describe, expect, it } from "vitest";

import { dexieStores } from "./index.js";

const dbName = (): string => `palier-stores-${globalThis.crypto.randomUUID()}`;

describe("dexieStores", () => {
  it("wires all nine ports to one named database", async () => {
    const stores = dexieStores(dbName());

    await stores.attempts.append(anAttempt());
    await stores.settings.set("locale", "fr");
    await stores.keyVault.putApiKey("sk-wired");
    await stores.syncState.update({ watermark: 3 });
    await stores.examRuns.put(anExamRun());
    await stores.telemetry.setConsent("on");
    await stores.costLedger.append({
      ts: "2026-09-26T10:00:00.000Z",
      feature: "writing-feedback",
      model: "m",
      inputTokens: 1,
      outputTokens: 1,
      costUsd: null,
    });

    expect(await stores.attempts.recent("reading", 10)).toHaveLength(1);
    expect(await stores.settings.get<string>("locale")).toBe("fr");
    expect(await stores.keyVault.hasApiKey()).toBe(true);
    expect((await stores.syncState.state()).watermark).toBe(3);
    expect(await stores.examRuns.all()).toHaveLength(1);
    expect(await stores.telemetry.consent()).toBe("on");
    expect(await stores.costLedger.since("2026-09-01T00:00:00.000Z")).toHaveLength(1);
  });

  it("binds the name to a persistent database two calls share", async () => {
    const name = dbName();
    await dexieStores(name).settings.set("theme", "dark");

    expect(await dexieStores(name).settings.get<string>("theme")).toBe("dark");
  });
});
