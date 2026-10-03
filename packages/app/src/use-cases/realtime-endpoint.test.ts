import { describe, expect, it } from "vitest";

import type { KeyVault } from "../ports/index.js";
import {
  InvalidRealtimeEndpointError,
  parseRealtimeEndpoint,
  realtimeEndpoint,
  setRealtimeEndpoint,
} from "./realtime-endpoint.js";

/** A local vault stub (D37) that keeps only the endpoint. */
const vaultWithEndpoint = (initial: string | null = null) => {
  let endpoint = initial;
  const vault: KeyVault = {
    putApiKey: () => Promise.resolve(),
    withApiKey: () => Promise.reject(new Error("no key")),
    hasApiKey: () => Promise.resolve(false),
    apiKeyStorage: () => Promise.resolve(null),
    clear: () => Promise.resolve(),
    deviceSecret: () => Promise.resolve("device-secret"),
    realtimeEndpoint: () => Promise.resolve(endpoint),
    setRealtimeEndpoint: (url) => {
      endpoint = url;
      return Promise.resolve();
    },
  };
  return { vault, endpoint: () => endpoint };
};

describe("parseRealtimeEndpoint", () => {
  it("accepts an https address, as the URL standard writes it", () => {
    expect(parseRealtimeEndpoint("https://Secret.Example.org")).toEqual({ ok: true, url: "https://secret.example.org/" });
  });

  it("keeps a path and a query, which a Vercel function's address has", () => {
    expect(parseRealtimeEndpoint("https://mine.vercel.app/api/realtime-secret?v=1")).toEqual({
      ok: true,
      url: "https://mine.vercel.app/api/realtime-secret?v=1",
    });
  });

  it("trims the whitespace a paste brings", () => {
    expect(parseRealtimeEndpoint("  https://secret.example.org/  ")).toEqual({ ok: true, url: "https://secret.example.org/" });
  });

  it("drops the fragment, which never reaches a server", () => {
    expect(parseRealtimeEndpoint("https://secret.example.org/#here")).toEqual({ ok: true, url: "https://secret.example.org/" });
  });

  it.each(["http://localhost:8787/", "http://127.0.0.1:3200/", "http://[::1]:3200/"])(
    "allows plain http on a loopback host, which never leaves the machine: %s",
    (raw) => {
      expect(parseRealtimeEndpoint(raw)).toEqual({ ok: true, url: raw });
    },
  );

  it("refuses plain http anywhere else, since the key travels to it", () => {
    expect(parseRealtimeEndpoint("http://secret.example.org/")).toEqual({ ok: false, problem: "not-https" });
  });

  it.each(["", "secret.example.org", "not a url", "ftp://secret.example.org/", "javascript:alert(1)", "data:text/html,hi"])(
    "refuses what is not a web address: %j",
    (raw) => {
      expect(parseRealtimeEndpoint(raw)).toEqual({ ok: false, problem: "not-a-url" });
    },
  );

  it("refuses credentials in the address, which the popup's address bar would show", () => {
    expect(parseRealtimeEndpoint("https://me:pw@secret.example.org/")).toEqual({ ok: false, problem: "has-credentials" });
    expect(parseRealtimeEndpoint("https://me@secret.example.org/")).toEqual({ ok: false, problem: "has-credentials" });
  });
});

describe("realtimeEndpoint and setRealtimeEndpoint", () => {
  it("reads none on a fresh device: studio mode uses Palier's route", async () => {
    const { vault } = vaultWithEndpoint();

    expect(await realtimeEndpoint({ vault })).toBeNull();
  });

  it("keeps an endpoint as the rule normalises it, and answers what was kept", async () => {
    const stub = vaultWithEndpoint();

    expect(await setRealtimeEndpoint({ url: " https://Secret.example.org#x " }, { vault: stub.vault })).toBe(
      "https://secret.example.org/",
    );
    expect(stub.endpoint()).toBe("https://secret.example.org/");
    expect(await realtimeEndpoint({ vault: stub.vault })).toBe("https://secret.example.org/");
  });

  it("forgets the endpoint when it is cleared to blank", async () => {
    const stub = vaultWithEndpoint("https://secret.example.org/");

    expect(await setRealtimeEndpoint({ url: "   " }, { vault: stub.vault })).toBeNull();
    expect(stub.endpoint()).toBeNull();
  });

  it("refuses a bad endpoint by its problem, and keeps the one held before", async () => {
    const stub = vaultWithEndpoint("https://secret.example.org/");

    const refused = setRealtimeEndpoint({ url: "http://secret.example.net/" }, { vault: stub.vault });

    await expect(refused).rejects.toBeInstanceOf(InvalidRealtimeEndpointError);
    await expect(refused).rejects.toMatchObject({ name: "InvalidRealtimeEndpointError", problem: "not-https" });
    expect(stub.endpoint()).toBe("https://secret.example.org/");
  });
});
