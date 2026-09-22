import { keyVaultContract } from "@palier/testing";
import { describe, expect, it } from "vitest";

import { PalierDb } from "./db.js";
import { dexieKeyVault } from "./key-vault.js";

const dbName = (): string => `palier-vault-${globalThis.crypto.randomUUID()}`;

keyVaultContract("dexie", () => Promise.resolve(dexieKeyVault(new PalierDb(dbName()))));

describe("dexieKeyVault", () => {
  it("survives a reopen: the key is still readable after the database is reopened", async () => {
    const name = dbName();
    const first = dexieKeyVault(new PalierDb(name));
    await first.putApiKey("sk-persisted-across-reopen");

    const reopened = dexieKeyVault(new PalierDb(name));
    expect(await reopened.withApiKey((k) => Promise.resolve(k))).toBe("sk-persisted-across-reopen");
  });

  it("stores ciphertext at rest, never the plaintext key [R12]", async () => {
    const key = "sk-plaintext-must-not-appear-at-rest";
    const db = new PalierDb(dbName());
    await dexieKeyVault(db).putApiKey(key);

    const row = await db.keyVault.get("api-key");
    expect(row?.id).toBe("api-key");
    if (row === undefined || row.id !== "api-key") throw new Error("expected an api-key row");
    // The bytes at rest decode to nothing resembling the key.
    expect(new TextDecoder().decode(row.ciphertext)).not.toContain(key);
    expect(new TextDecoder().decode(row.ciphertext)).not.toBe(key);
  });

  it("cannot decrypt the key once the device wrapping key is replaced", async () => {
    const db = new PalierDb(dbName());
    const vault = dexieKeyVault(db);
    await vault.putApiKey("sk-bound-to-the-wrapping-key");

    // Replace the device-bound wrapping key: the ciphertext no longer authenticates under it.
    const other = await globalThis.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    await db.keyVault.put({ id: "device-key", key: other });

    await expect(vault.withApiKey((k) => Promise.resolve(k))).rejects.toThrow();
  });

  it("returns a stable 64-hex-character device secret across calls", async () => {
    const vault = dexieKeyVault(new PalierDb(dbName()));

    const first = await vault.deviceSecret();
    const second = await vault.deviceSecret();

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });
});
