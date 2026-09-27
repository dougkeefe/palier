import { describe, expect, it } from "vitest";

import {
  bankFilesIn,
  cacheNameFor,
  routeUrls,
  type ServiceWorkerConfig,
  type ServiceWorkerScope,
  startServiceWorker,
  staleCacheNames,
  staticAssetsIn,
  strategyFor,
} from "./worker";

const ORIGIN = "https://palier.test";

describe("strategyFor", () => {
  const get = (path: string) => ({ method: "GET", url: `${ORIGIN}${path}` });

  it("serves the content-addressed bank and Next chunks cache-first", () => {
    expect(strategyFor(get("/content/bank/v1/fr/reading/abc.json"), ORIGIN)).toBe("cache-first");
    expect(strategyFor(get("/_next/static/chunks/app-123.js"), ORIGIN)).toBe("cache-first");
  });

  it("serves pages and everything else same-origin network-first", () => {
    expect(strategyFor(get("/en/home"), ORIGIN)).toBe("network-first");
    expect(strategyFor(get("/en/home?_rsc=1x2y"), ORIGIN)).toBe("network-first");
  });

  it("never intercepts writes, other origins or the API", () => {
    expect(strategyFor({ method: "POST", url: `${ORIGIN}/en/home` }, ORIGIN)).toBe("passthrough");
    expect(strategyFor({ method: "GET", url: "https://github.com/x" }, ORIGIN)).toBe("passthrough");
    expect(strategyFor(get("/api/anything"), ORIGIN)).toBe("passthrough");
  });
});

describe("the precache lists", () => {
  it("expands every route under every locale, the empty route being the locale home", () => {
    expect(routeUrls(["en", "fr"], ["", "review"])).toEqual(["/en", "/en/review", "/fr", "/fr/review"]);
  });

  it("finds the static assets a page references, plain or escaped in the RSC payload, once each", () => {
    const html =
      '<script src="/_next/static/chunks/a.js"></script>' +
      '<link href="/_next/static/css/b.css">' +
      '<script>self.__next_f.push([1,"\\"/_next/static/chunks/a.js\\""])</script>';
    expect(staticAssetsIn(html).sort()).toEqual(["/_next/static/chunks/a.js", "/_next/static/css/b.css"]);
    expect(staticAssetsIn("<p>no assets</p>")).toEqual([]);
  });

  it("lists every shard, passage shard, form and the scenarios file a bank manifest names, under the served base", () => {
    const manifest = {
      shards: [{ path: "bank/v1/fr/reading/r.json" }, { nope: true }, null],
      passageShards: [{ path: "bank/v1/passages/p.json" }],
      forms: [{ path: "bank/v1/forms/f.json" }],
      scenarios: { path: "bank/v1/oral/scenarios.json", hash: "h" },
      version: 1,
    };
    expect(bankFilesIn(manifest, "/content")).toEqual([
      "/content/bank/v1/fr/reading/r.json",
      "/content/bank/v1/passages/p.json",
      "/content/bank/v1/forms/f.json",
      "/content/bank/v1/oral/scenarios.json",
    ]);
  });

  it("lists no scenarios file for a bank with none, whether the entry is null or, before v3, absent", () => {
    const files = (scenarios?: null) => bankFilesIn({ shards: [], passageShards: [], forms: [], ...(scenarios === undefined ? {} : { scenarios }) }, "/content");
    expect(files(null)).toEqual([]);
    expect(files()).toEqual([]);
  });

  it("lists nothing from a manifest that is not an object or has no entry arrays", () => {
    expect(bankFilesIn(null, "/content")).toEqual([]);
    expect(bankFilesIn("manifest", "/content")).toEqual([]);
    expect(bankFilesIn({ shards: "not-an-array" }, "/content")).toEqual([]);
  });
});

describe("cache naming", () => {
  it("gives each build its own cache and marks only our other caches stale", () => {
    const current = cacheNameFor("b2");
    expect(current).toBe("palier-b2");
    expect(staleCacheNames(["palier-b1", "palier-b2", "someone-else"], current)).toEqual(["palier-b1"]);
  });
});

// --- The worker end to end, over an in-memory CacheStorage and a scripted network. ---

class FakeCache {
  readonly entries = new Map<string, Response>();

  match(request: Request | string, options?: { ignoreSearch?: boolean }): Promise<Response | undefined> {
    const url = typeof request === "string" ? request : request.url;
    const exact = this.entries.get(url);
    if (exact !== undefined) return Promise.resolve(exact.clone());
    if (options?.ignoreSearch === true) {
      const bare = url.split("?")[0];
      for (const [key, value] of this.entries) {
        if (key.split("?")[0] === bare) return Promise.resolve(value.clone());
      }
    }
    return Promise.resolve(undefined);
  }

  put(request: Request | string, response: Response): Promise<void> {
    this.entries.set(typeof request === "string" ? request : request.url, response);
    return Promise.resolve();
  }
}

class FakeCacheStorage {
  readonly caches = new Map<string, FakeCache>();

  open(name: string): Promise<FakeCache> {
    const cache = this.caches.get(name) ?? new FakeCache();
    this.caches.set(name, cache);
    return Promise.resolve(cache);
  }

  keys(): Promise<string[]> {
    return Promise.resolve([...this.caches.keys()]);
  }

  delete(name: string): Promise<boolean> {
    return Promise.resolve(this.caches.delete(name));
  }
}

const CONFIG: ServiceWorkerConfig = {
  build: "b2",
  locales: ["en"],
  routes: ["", "missing"],
  bankBasePath: "/content",
  bankManifests: ["/content/bank/v1/manifest.json", "/content/bank/v2/manifest.json"],
};

/** A network serving `files`; any other URL 404s, and `offline()` makes it throw. */
const scriptedNetwork = (files: Record<string, string>) => {
  let online = true;
  const requested: string[] = [];
  const fetch = (request: Request): Promise<Response> => {
    requested.push(request.url);
    if (!online) return Promise.reject(new TypeError("Failed to fetch"));
    const path = new URL(request.url).pathname + new URL(request.url).search;
    const body = files[path];
    return Promise.resolve(body === undefined ? new Response("", { status: 404 }) : new Response(body));
  };
  return { fetch, requested, offline: () => (online = false) };
};

const bootWorker = (files: Record<string, string>) => {
  const listeners = new Map<string, (event: never) => void>();
  let claimed = false;
  let skipped = false;
  const scope: ServiceWorkerScope = {
    location: { origin: ORIGIN },
    clients: {
      claim: () => {
        claimed = true;
        return Promise.resolve();
      },
    },
    skipWaiting: () => {
      skipped = true;
      return Promise.resolve();
    },
    addEventListener: (type, listener) => listeners.set(type, listener),
  };
  const storage = new FakeCacheStorage();
  const network = scriptedNetwork(files);
  startServiceWorker(scope, CONFIG, storage as unknown as CacheStorage, network.fetch);

  const dispatch = async (type: string): Promise<void> => {
    let pending: Promise<unknown> = Promise.resolve();
    listeners.get(type)!({ waitUntil: (p: Promise<unknown>) => (pending = p) } as never);
    await pending;
  };
  /** Dispatch a fetch; resolve to the response, or undefined if the worker passed it through. */
  const fetchThrough = async (request: Request): Promise<Response | undefined> => {
    let responded: Promise<Response> | undefined;
    listeners.get("fetch")!({ request, respondWith: (r: Promise<Response>) => (responded = r) } as never);
    return responded;
  };

  return { storage, network, dispatch, fetchThrough, claimed: () => claimed, skipped: () => skipped };
};

const SITE: Record<string, string> = {
  "/en": '<script src="/_next/static/chunks/home.js"></script>',
  "/_next/static/chunks/home.js": "console.log(1)",
  "/content/bank/v1/manifest.json": JSON.stringify({
    shards: [{ path: "bank/v1/fr/reading/r.json" }],
    passageShards: [{ path: "bank/v1/passages/p.json" }],
    forms: [],
  }),
  "/content/bank/v1/fr/reading/r.json": "[]",
  "/content/bank/v1/passages/p.json": "[]",
  // v2's manifest is present but not JSON: install must survive it.
  "/content/bank/v2/manifest.json": "not json",
};

describe("startServiceWorker", () => {
  it("precaches every route, the assets it references and the whole bank on install", async () => {
    const worker = bootWorker(SITE);
    await worker.dispatch("install");

    const cached = [...worker.storage.caches.get("palier-b2")!.entries.keys()].map((u) => new URL(u).pathname);
    expect(cached.sort()).toEqual(
      [
        "/en",
        "/_next/static/chunks/home.js",
        "/content/bank/v1/manifest.json",
        "/content/bank/v1/fr/reading/r.json",
        "/content/bank/v1/passages/p.json",
        "/content/bank/v2/manifest.json",
      ].sort(),
    );
    // A route that 404s is skipped, not fatal, and the new worker takes over at once.
    expect(cached).not.toContain("/en/missing");
    expect(worker.skipped()).toBe(true);
  });

  it("still installs when the network is down, caching what it can later", async () => {
    const worker = bootWorker(SITE);
    worker.network.offline();
    await worker.dispatch("install");
    expect(worker.storage.caches.get("palier-b2")!.entries.size).toBe(0);
    expect(worker.skipped()).toBe(true);
  });

  it("deletes earlier builds' caches on activate, leaves other caches alone, and claims the page", async () => {
    const worker = bootWorker(SITE);
    await worker.storage.open("palier-b1");
    await worker.storage.open("unrelated");
    await worker.dispatch("activate");
    expect([...worker.storage.caches.keys()].sort()).toEqual(["unrelated"]);
    expect(worker.claimed()).toBe(true);
  });

  it("passes through requests it does not own", async () => {
    const worker = bootWorker(SITE);
    const response = await worker.fetchThrough(new Request(`${ORIGIN}/en`, { method: "POST", body: "x" }));
    expect(response).toBeUndefined();
  });

  it("answers a cached bank shard without the network, even offline", async () => {
    const worker = bootWorker(SITE);
    await worker.dispatch("install");
    worker.network.offline();
    const before = worker.network.requested.length;

    const response = await worker.fetchThrough(new Request(`${ORIGIN}/content/bank/v1/fr/reading/r.json`));
    expect(response?.ok).toBe(true);
    expect(await response?.text()).toBe("[]");
    expect(worker.network.requested.length).toBe(before);
  });

  it("fetches and keeps a cache-first asset on a miss", async () => {
    const worker = bootWorker({ ...SITE, "/_next/static/chunks/late.js": "late" });
    const url = `${ORIGIN}/_next/static/chunks/late.js`;
    expect(await (await worker.fetchThrough(new Request(url)))?.text()).toBe("late");
    expect(worker.storage.caches.get("palier-b2")!.entries.has(url)).toBe(true);
  });

  it("does not keep a failed cache-first response", async () => {
    const worker = bootWorker(SITE);
    const url = `${ORIGIN}/_next/static/chunks/gone.js`;
    expect((await worker.fetchThrough(new Request(url)))?.status).toBe(404);
    expect(worker.storage.caches.get("palier-b2")!.entries.has(url)).toBe(false);
  });

  it("serves pages from the network while online, and from cache once offline", async () => {
    const worker = bootWorker({ ...SITE, "/en/review": "<p>review v1</p>" });
    const url = `${ORIGIN}/en/review`;
    expect(await (await worker.fetchThrough(new Request(url)))?.text()).toBe("<p>review v1</p>");

    worker.network.offline();
    expect(await (await worker.fetchThrough(new Request(url)))?.text()).toBe("<p>review v1</p>");
  });

  it("does not cache an error page", async () => {
    const worker = bootWorker(SITE);
    const url = `${ORIGIN}/en/nowhere`;
    expect((await worker.fetchThrough(new Request(url)))?.status).toBe(404);
    expect(worker.storage.caches.get("palier-b2")!.entries.has(url)).toBe(false);
  });

  it("falls back to a page's cached shell for an offline navigation with a query string", async () => {
    const worker = bootWorker(SITE);
    await worker.dispatch("install");
    worker.network.offline();

    const navigation = { method: "GET", url: `${ORIGIN}/en?from=home`, mode: "navigate" } as Request;
    expect(await (await worker.fetchThrough(navigation))?.text()).toContain("home.js");
  });

  it("fails an offline RSC fetch it has no exact copy of, rather than hand the router HTML", async () => {
    const worker = bootWorker(SITE);
    await worker.dispatch("install");
    worker.network.offline();

    const rsc = { method: "GET", url: `${ORIGIN}/en?_rsc=abc`, mode: "cors" } as Request;
    await expect(worker.fetchThrough(rsc)).rejects.toThrow("Failed to fetch");
  });
});
