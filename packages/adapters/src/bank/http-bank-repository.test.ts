import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { formId, itemId, passageId, scenarioId } from "@palier/domain";
import type { ItemRepositoryBank } from "@palier/testing";
import { CONTRACT_BANK, bankHandlers, itemRepositoryContract, mswServer } from "@palier/testing";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { BankContentError, BankUnavailableError } from "./errors.js";
import type { FetchLike } from "./http-bank-repository.js";
import { httpBankRepository } from "./http-bank-repository.js";

const BASE = "http://bank.test";

// Requested URLs, captured from the MSW interceptor so a test can assert *which*
// shards a call fetched (laziness) and *how often* (the content-hash cache).
const requested: string[] = [];

beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: "error" });
  mswServer.events.on("request:start", ({ request }) => {
    requested.push(request.url);
  });
});
afterEach(() => {
  mswServer.resetHandlers();
  requested.length = 0;
});
afterAll(() => {
  mswServer.events.removeAllListeners();
  mswServer.close();
});

// The whole contract, served over the real `fetch` path via MSW — the same suite
// the in-memory repo passes, so the two are substitutable (ADR 10, §6.2 tier 3).
itemRepositoryContract("http bank", (bank) => {
  mswServer.use(...bankHandlers(bank, { baseUrl: BASE, version: 1 }));
  return Promise.resolve(httpBankRepository({ baseUrl: BASE, version: 1 }));
});

describe("httpBankRepository — delivery behaviour", () => {
  const serve = (bank: ItemRepositoryBank = CONTRACT_BANK) => {
    mswServer.use(...bankHandlers(bank, { baseUrl: BASE, version: 1 }));
    return httpBankRepository({ baseUrl: BASE, version: 1 });
  };

  it("fetches the manifest once and memoizes it across calls", async () => {
    const repo = serve();
    await repo.bankVersion();
    await repo.query({});

    expect(requested.filter((u) => u.endsWith("/manifest.json"))).toHaveLength(1);
  });

  it("a reading query fetches the reading shard and not the writing shard", async () => {
    const repo = serve();
    await repo.query({ skill: "reading" });

    expect(requested.some((u) => u.includes("/fr/reading/"))).toBe(true);
    expect(requested.some((u) => u.includes("/fr/writing/"))).toBe(false);
  });

  it("fetches each shard at most once across queries (content-hash cache)", async () => {
    const repo = serve();
    await repo.query({ skill: "reading" });
    await repo.query({ skill: "reading", band: "B" });

    expect(requested.filter((u) => u.includes("/fr/reading/"))).toHaveLength(1);
  });

  it("fetches only the mapped form file, and returns null for an unknown id without a fetch", async () => {
    const repo = serve();

    expect((await repo.form(formId("f-1")))?.id).toBe("f-1");
    requested.length = 0;
    expect(await repo.form(formId("nope"))).toBeNull();
    expect(requested.some((u) => u.includes("/forms/"))).toBe(false);
  });

  it("returns null for a scenario when the oral file is absent (HTTP 404)", async () => {
    const repo = serve({ items: [], passages: [], forms: [], scenarios: [], bankVersion: 3 });

    expect(await repo.scenario(scenarioId("s-1"))).toBeNull();
  });

  it("normalizes a trailing slash on the base url", async () => {
    mswServer.use(...bankHandlers(CONTRACT_BANK, { baseUrl: BASE, version: 1 }));
    const repo = httpBankRepository({ baseUrl: `${BASE}/`, version: 1 });

    expect(await repo.bankVersion()).toBe(7);
  });
});

// Error translation is injected through `fetchImpl` rather than MSW, so each fault
// is provoked exactly (adapters/CLAUDE.md: the contract suite proves substitutability,
// never the error paths).
describe("httpBankRepository — error translation", () => {
  const cannedFetch =
    (routes: Record<string, { status?: number; body?: unknown; throws?: boolean; badJson?: boolean }>): FetchLike =>
    (url) => {
      const route = routes[url] ?? { status: 404 };
      if (route.throws === true) return Promise.reject(new Error("network down"));
      const status = route.status ?? 200;
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () =>
          route.badJson === true ? Promise.reject(new Error("not json")) : Promise.resolve(route.body),
      });
    };
  const manifestUrl = `${BASE}/bank/v1/manifest.json`;
  const scenariosUrl = `${BASE}/bank/v1/oral/scenarios.json`;
  const repoWith = (routes: Parameters<typeof cannedFetch>[0]) =>
    httpBankRepository({ baseUrl: BASE, version: 1, fetchImpl: cannedFetch(routes) });

  it("throws BankUnavailableError when the network is down", async () => {
    await expect(repoWith({ [manifestUrl]: { throws: true } }).bankVersion()).rejects.toBeInstanceOf(
      BankUnavailableError,
    );
  });

  it("retries the manifest after a transient failure rather than caching the rejection", async () => {
    let calls = 0;
    const flakyFetch: FetchLike = (url) => {
      if (url === manifestUrl) {
        calls += 1;
        if (calls === 1) return Promise.reject(new Error("network down"));
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ version: 5, shards: [], passageShards: [], forms: [] }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
    };
    const repo = httpBankRepository({ baseUrl: BASE, version: 1, fetchImpl: flakyFetch });

    await expect(repo.bankVersion()).rejects.toBeInstanceOf(BankUnavailableError);
    expect(await repo.bankVersion()).toBe(5);
    expect(calls).toBe(2);
  });

  it("throws BankUnavailableError on a non-ok manifest status", async () => {
    await expect(repoWith({ [manifestUrl]: { status: 500 } }).bankVersion()).rejects.toBeInstanceOf(
      BankUnavailableError,
    );
  });

  it("throws BankContentError when the manifest is not JSON", async () => {
    await expect(repoWith({ [manifestUrl]: { badJson: true } }).bankVersion()).rejects.toBeInstanceOf(
      BankContentError,
    );
  });

  it("throws BankContentError when a shard is not an array", async () => {
    const repo = repoWith({
      [manifestUrl]: {
        body: {
          version: 1,
          shards: [{ path: "bank/v1/fr/reading/x.json", hash: "x", count: 1, lang: "fr", skill: "reading" }],
          passageShards: [],
          forms: [],
        },
      },
      [`${BASE}/bank/v1/fr/reading/x.json`]: { body: { not: "an array" } },
    });

    await expect(repo.query({})).rejects.toBeInstanceOf(BankContentError);
  });

  it("surfaces a non-404 error and a malformed body from the scenarios file", async () => {
    await expect(repoWith({ [scenariosUrl]: { status: 500 } }).scenario(scenarioId("s"))).rejects.toBeInstanceOf(
      BankUnavailableError,
    );
    await expect(repoWith({ [scenariosUrl]: { body: { not: "array" } } }).scenario(scenarioId("s"))).rejects.toBeInstanceOf(
      BankContentError,
    );
  });

  it("rejects every shape of malformed manifest", async () => {
    const bad: unknown[] = [
      null,
      { shards: [], passageShards: [], forms: [] },
      { version: "1", shards: [], passageShards: [], forms: [] },
      { version: 1, shards: {}, passageShards: [], forms: [] },
      { version: 1, shards: [null], passageShards: [], forms: [] },
      { version: 1, shards: [{ hash: "h", count: 1, lang: "fr", skill: "reading" }], passageShards: [], forms: [] },
      { version: 1, shards: [{ path: "p", count: 1, lang: "fr", skill: "reading" }], passageShards: [], forms: [] },
      { version: 1, shards: [{ path: "p", hash: "h", lang: "fr", skill: "reading" }], passageShards: [], forms: [] },
      { version: 1, shards: [{ path: "p", hash: "h", count: 1, skill: "reading" }], passageShards: [], forms: [] },
      { version: 1, shards: [{ path: "p", hash: "h", count: 1, lang: "fr" }], passageShards: [], forms: [] },
      { version: 1, shards: [], passageShards: {}, forms: [] },
      { version: 1, shards: [], passageShards: [], forms: {} },
      { version: 1, shards: [], passageShards: [], forms: [null] },
      { version: 1, shards: [], passageShards: [], forms: [{ path: "p", hash: "h" }] },
      { version: 1, shards: [], passageShards: [], forms: [{ id: "i", hash: "h" }] },
      { version: 1, shards: [], passageShards: [], forms: [{ id: "i", path: "p" }] },
    ];

    for (const body of bad) {
      await expect(repoWith({ [manifestUrl]: { body } }).bankVersion()).rejects.toBeInstanceOf(
        BankContentError,
      );
    }
  });
});

// Proof the adapter reads real factory output, not only synthesized fixtures: the
// committed Phase-1 bank at content/bank/v1/ is served straight off disk.
describe("httpBankRepository — the committed Phase-1 bank", () => {
  const diskFetch: FetchLike = (url) => {
    const rel = url.slice(`${BASE}/`.length);
    try {
      const abs = fileURLToPath(new URL(`../../../../content/${rel}`, import.meta.url));
      const text = readFileSync(abs, "utf8");
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(text)) });
    } catch {
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
    }
  };
  const repo = () => httpBankRepository({ baseUrl: BASE, version: 1, fetchImpl: diskFetch });

  it("reads the committed manifest, shards and passages", async () => {
    const bank = repo();

    expect(await bank.bankVersion()).toBe(1);
    expect(await bank.query({})).toHaveLength(10);
    expect(await bank.query({ skill: "reading" })).toHaveLength(6);
    expect(await bank.query({ skill: "writing" })).toHaveLength(4);

    const reading = await bank.query({ skill: "reading" });
    const pid = reading[0]?.passageId;
    expect(pid).toBeDefined();
    if (pid !== undefined) expect(await bank.passage(pid)).not.toBeNull();
  });

  it("returns null for an item id the committed bank does not hold", async () => {
    expect(await repo().byIds([itemId("MISSING000000000000000")])).toHaveLength(0);
    expect(await repo().passage(passageId("MISSING000000000000000"))).toBeNull();
  });
});
