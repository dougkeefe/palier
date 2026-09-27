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

  it("lists every form through the same cache as form(), so opening a listed form fetches nothing more", async () => {
    const repo = serve();

    expect((await repo.forms()).map((f) => f.id)).toEqual(["f-1"]);
    const fetched = requested.filter((u) => u.includes("/forms/")).length;
    await repo.form(formId("f-1"));
    expect(requested.filter((u) => u.includes("/forms/"))).toHaveLength(fetched);
  });

  it("ships no scenarios when the manifest lists none, and fetches nothing for them", async () => {
    const repo = serve({ items: [], passages: [], forms: [], scenarios: [], bankVersion: 3 });

    expect(await repo.scenario(scenarioId("s-1"))).toBeNull();
    expect(await repo.scenarios()).toEqual([]);
    expect(requested.filter((u) => u.includes("/oral/"))).toEqual([]);
  });

  it("fetches the scenarios file once, for listing and looking up alike", async () => {
    const repo = serve();

    expect(await repo.scenarios()).toHaveLength(CONTRACT_BANK.scenarios.length);
    await repo.scenario(scenarioId("s-1"));
    expect(requested.filter((u) => u.includes("/oral/"))).toHaveLength(1);
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

  it("surfaces a failed fetch and a malformed body from a listed scenarios file, and retries after", async () => {
    const listing = {
      body: {
        version: 3,
        shards: [],
        passageShards: [],
        forms: [],
        scenarios: { path: "bank/v1/oral/scenarios.json", hash: "h" },
      },
    };
    await expect(
      repoWith({ [manifestUrl]: listing, [scenariosUrl]: { status: 500 } }).scenario(scenarioId("s")),
    ).rejects.toBeInstanceOf(BankUnavailableError);
    await expect(
      repoWith({ [manifestUrl]: listing, [scenariosUrl]: { body: { not: "array" } } }).scenarios(),
    ).rejects.toBeInstanceOf(BankContentError);

    let calls = 0;
    const flaky: FetchLike = (url) => {
      if (url === manifestUrl) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(listing.body) });
      calls += 1;
      return calls === 1
        ? Promise.reject(new Error("network down"))
        : Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    };
    const repo = httpBankRepository({ baseUrl: BASE, version: 1, fetchImpl: flaky });
    await expect(repo.scenarios()).rejects.toBeInstanceOf(BankUnavailableError);
    expect(await repo.scenarios()).toEqual([]);
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
      { version: 1, shards: [], passageShards: [], forms: [], scenarios: "oral/scenarios.json" },
      { version: 1, shards: [], passageShards: [], forms: [], scenarios: { hash: "h" } },
      { version: 1, shards: [], passageShards: [], forms: [], scenarios: { path: "p" } },
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

// The committed Phase-3 bank (content/bank/v2/): the first with exam forms, and the
// version the app reads. Counts are read from its own manifest rather than typed here,
// so a regenerated bank needs no edit to this test; what is asserted is the shape.
describe("httpBankRepository — the committed Phase-3 bank, with its forms", () => {
  const diskPath = (rel: string) => fileURLToPath(new URL(`../../../../content/${rel}`, import.meta.url));
  const diskFetch: FetchLike = (url) => {
    try {
      const text = readFileSync(diskPath(url.slice(`${BASE}/`.length)), "utf8");
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(text)) });
    } catch {
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
    }
  };
  const manifest = JSON.parse(readFileSync(diskPath("bank/v2/manifest.json"), "utf8")) as {
    counts: { items: number };
    forms: { id: string }[];
  };
  const repo = () => httpBankRepository({ baseUrl: BASE, version: 2, fetchImpl: diskFetch });

  it("reads every item the manifest counts", async () => {
    const bank = repo();
    expect(await bank.bankVersion()).toBe(2);
    expect(await bank.query({})).toHaveLength(manifest.counts.items);
  });

  it("serves a form for every exam variant, each resolving all its items and pilots", async () => {
    const bank = repo();
    expect(manifest.forms.length).toBeGreaterThan(0);
    for (const { id } of manifest.forms) {
      const form = await bank.form(formId(id));
      expect(form?.id).toBe(id);
      if (form === null) continue;
      const items = await bank.byIds(form.itemIds);
      expect(items).toHaveLength(form.itemIds.length);
      expect(items.every((i) => i.skill === form.skill && i.lang === form.lang)).toBe(true);
      for (const pilot of form.pilotItemIds) expect(form.itemIds).toContain(pilot);
    }
  });

  it("lists one form per profile variant, one for each skill and mode", async () => {
    const forms = await repo().forms();
    expect(forms.map((f) => f.id).sort()).toEqual(manifest.forms.map((f) => f.id).sort());
    expect(new Set(forms.map((f) => `${f.skill}-${f.mode}`)).size).toBe(forms.length);
  });

  it("still holds every item v1 published, under the same id (architecture.md §5.5)", async () => {
    const v1 = await httpBankRepository({ baseUrl: BASE, version: 1, fetchImpl: diskFetch }).query({});
    const v2 = await repo().byIds(v1.map((i) => i.id));
    expect(v2.map((i) => i.id).sort()).toEqual(v1.map((i) => i.id).sort());
  });
});

// The committed Phase-5 bank (content/bank/v3/), the first with oral scenarios (D114),
// and the version the app reads. It carries v2 forward whole: every item, and every form a
// user may have sat, beside v3's own forms.
describe("httpBankRepository — the committed Phase-5 bank, with its scenarios", () => {
  const diskPath = (rel: string) => fileURLToPath(new URL(`../../../../content/${rel}`, import.meta.url));
  const diskFetch: FetchLike = (url) => {
    try {
      const text = readFileSync(diskPath(url.slice(`${BASE}/`.length)), "utf8");
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(text)) });
    } catch {
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
    }
  };
  const at = (version: number) => httpBankRepository({ baseUrl: BASE, version, fetchImpl: diskFetch });

  it("ships an oral scenario for every session type at B and at C", async () => {
    const scenarios = await at(3).scenarios();
    expect(scenarios.map((s) => `${s.sessionType}-${s.targetBand}`).sort()).toEqual(
      ["full", "opinion", "situation", "warmup", "work"].flatMap((type) => [`${type}-B`, `${type}-C`]).sort(),
    );
    const first = scenarios[0];
    if (first !== undefined) expect(await at(3).scenario(first.id)).toEqual(first);
  });

  it("holds every item and every form v2 published, exactly as published", async () => {
    const v2Items = await at(2).query({});
    const v3Items = await at(3).byIds(v2Items.map((i) => i.id));
    expect(v3Items).toEqual(v2Items);
    const v3Forms = await at(3).forms();
    for (const form of await at(2).forms()) expect(v3Forms).toContainEqual(form);
  });

  it("reads banks v1 and v2, which predate the scenarios entry, as shipping none", async () => {
    expect(await at(1).scenarios()).toEqual([]);
    expect(await at(2).scenarios()).toEqual([]);
  });
});
