import { describe, expect, it } from "vitest";

import { memoryRealtimeSecretSource } from "./realtime-secret-source.js";

/** What the shared contract does not reach: the fake's own record and clock (D169). */
describe("memoryRealtimeSecretSource", () => {
  it("records every key it was handed, refused ones included", async () => {
    const source = memoryRealtimeSecretSource({ refuses: ["sk-no"] });
    await source.mint("sk-yes");
    await source.mint("sk-no").catch(() => undefined);

    expect(source.keys()).toEqual(["sk-yes", "sk-no"]);
  });

  it("expires a secret a minute after its clock's now", async () => {
    const source = memoryRealtimeSecretSource({ now: () => "2026-09-29T12:00:00.000Z" });

    expect(await source.mint("sk-yes")).toEqual({ value: "ek_memory_1", expiresAt: "2026-09-29T12:01:00.000Z" });
  });

  it("refuses nothing unless told to", async () => {
    await expect(memoryRealtimeSecretSource().mint("sk-anything")).resolves.toMatchObject({ value: "ek_memory_1" });
  });
});
