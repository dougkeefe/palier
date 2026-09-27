/**
 * The service worker: full offline operation after first load ([R4], architecture.md
 * §5.5). Written in TypeScript here — so it is typechecked, linted and unit-tested —
 * and compiled to `public/sw.js` by `scripts/prepare-public.mjs`, which appends one
 * line calling `startServiceWorker(self, CONFIG, caches, fetch)` with the build's
 * config (progress.md D60).
 *
 * **This file may have no runtime imports.** The compiled output is a classic script,
 * not a module (module workers are not yet safe to rely on across the browsers §14
 * lists), so `import type` is the only import allowed; everything else is local.
 *
 * What it caches, and how:
 *
 * - **On install**, every app route in every locale (their HTML and the
 *   `/_next/static/` assets that HTML references) and the whole served bank (each
 *   manifest and every shard, passage and form path it lists). So offline works for
 *   routes and skills the user has not visited yet, not only the ones they have.
 * - **Cache-first** for `/content/bank/**` and `/_next/static/**`. Both are
 *   content-addressed — a bank version is a new path, a Next chunk name carries its
 *   hash — so a cached copy is correct forever. This is the persistent twin of the
 *   bank adapter's in-memory content-hash cache.
 * - **Network-first, falling back to cache** for everything else same-origin: pages
 *   and RSC payloads update whenever the network is up and still render when it is not.
 * - **Never** for non-GET, cross-origin or `/api/` requests.
 *
 * Each build gets its own cache (`palier-{build}`); `activate` deletes the others, so
 * stale chunks do not accumulate across deploys.
 */

export type Strategy = "cache-first" | "network-first" | "passthrough";

/** The part of a `Request` the routing decision reads. */
export type RequestShape = {
  readonly method: string;
  readonly url: string;
};

export type ServiceWorkerConfig = {
  /** Changes whenever the build does, so a deploy gets a fresh cache. */
  readonly build: string;
  readonly locales: readonly string[];
  /** Route paths below the locale segment; `""` is the locale's home. */
  readonly routes: readonly string[];
  /** Where `bank/` is served (the app's `BANK_BASE_PATH`). */
  readonly bankBasePath: string;
  /** Origin-relative URLs of every bank manifest to precache. */
  readonly bankManifests: readonly string[];
};

/** The slice of the service-worker global scope this file touches. */
export type ServiceWorkerScope = {
  readonly location: { readonly origin: string };
  readonly clients: { claim: () => Promise<void> };
  skipWaiting: () => Promise<void>;
  addEventListener: (type: "install" | "activate" | "fetch", listener: (event: never) => void) => void;
};

type ExtendableEventLike = { waitUntil: (promise: Promise<unknown>) => void };
type FetchEventLike = ExtendableEventLike & {
  readonly request: Request;
  respondWith: (response: Promise<Response>) => void;
};

/** Paths whose content never changes at a given URL. */
const IMMUTABLE_PREFIXES = ["/content/bank/", "/_next/static/"];

const CACHE_PREFIX = "palier-";

export const cacheNameFor = (build: string): string => `${CACHE_PREFIX}${build}`;

/** Our caches other than the current one — the ones `activate` deletes. */
export const staleCacheNames = (names: readonly string[], current: string): string[] =>
  names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== current);

export const strategyFor = (request: RequestShape, origin: string): Strategy => {
  if (request.method !== "GET") return "passthrough";
  const url = new URL(request.url);
  if (url.origin !== origin) return "passthrough";
  if (url.pathname.startsWith("/api/")) return "passthrough";
  if (IMMUTABLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return "cache-first";
  }
  return "network-first";
};

/** Every page to precache: each route under each locale. */
export const routeUrls = (locales: readonly string[], routes: readonly string[]): string[] =>
  locales.flatMap((locale) => routes.map((route) => (route === "" ? `/${locale}` : `/${locale}/${route}`)));

/**
 * The `/_next/static/` assets an HTML document references. Matches both plain
 * attributes and the escaped copies inside the inline RSC payload, de-duplicated.
 */
export const staticAssetsIn = (html: string): string[] => [
  ...new Set(html.match(/\/_next\/static\/[^"'\\\s)]+/g) ?? []),
];

/**
 * Every file a bank manifest names, as origin-relative URLs under the served base: its
 * shards, passage shards and forms, and its one oral scenarios file when it lists one
 * (progress.md D114), so a session's scenario is there offline too.
 */
export const bankFilesIn = (manifest: unknown, bankBasePath: string): string[] => {
  if (typeof manifest !== "object" || manifest === null) return [];
  const record = manifest as Record<string, unknown>;
  const paths: string[] = [];
  const add = (entry: unknown): void => {
    const path = (entry as { path?: unknown } | null)?.path;
    if (typeof path === "string") paths.push(`${bankBasePath}/${path}`);
  };
  for (const key of ["shards", "passageShards", "forms"]) {
    const entries = record[key];
    if (Array.isArray(entries)) (entries as unknown[]).forEach(add);
  }
  add(record.scenarios);
  return paths;
};

/** Wire the install, activate and fetch handlers onto the worker scope. */
export const startServiceWorker = (
  scope: ServiceWorkerScope,
  config: ServiceWorkerConfig,
  storage: CacheStorage,
  network: (request: Request) => Promise<Response>,
): void => {
  const cacheName = cacheNameFor(config.build);
  const absolute = (path: string) => new URL(path, scope.location.origin).href;

  /** Fetch and store one URL; resolve to the response, or null if it failed. */
  const store = async (cache: Cache, url: string): Promise<Response | null> => {
    try {
      const response = await network(new Request(absolute(url)));
      if (!response.ok) return null;
      await cache.put(absolute(url), response.clone());
      return response;
    } catch {
      return null;
    }
  };

  // One failed URL must not abort the rest: install still succeeds, and that URL is
  // cached the first time it is fetched online.
  const precache = async (): Promise<void> => {
    const cache = await storage.open(cacheName);
    for (const url of routeUrls(config.locales, config.routes)) {
      const page = await store(cache, url);
      if (page === null) continue;
      for (const asset of staticAssetsIn(await page.text())) await store(cache, asset);
    }
    for (const url of config.bankManifests) {
      const manifest = await store(cache, url);
      if (manifest === null) continue;
      let body: unknown;
      try {
        body = await manifest.json();
      } catch {
        continue;
      }
      for (const file of bankFilesIn(body, config.bankBasePath)) await store(cache, file);
    }
  };

  const cacheFirst = async (request: Request): Promise<Response> => {
    const cache = await storage.open(cacheName);
    const hit = await cache.match(request);
    if (hit !== undefined) return hit;
    const response = await network(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  };

  const networkFirst = async (request: Request): Promise<Response> => {
    const cache = await storage.open(cacheName);
    try {
      const response = await network(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      // A page reached with a query string still has its cached shell. RSC payloads
      // do not get that leniency: an HTML body handed to the router would be worse
      // than a failed fetch, which Next recovers from with a full navigation.
      const hit =
        (await cache.match(request)) ??
        (request.mode === "navigate" ? await cache.match(request, { ignoreSearch: true }) : undefined);
      if (hit !== undefined) return hit;
      throw error;
    }
  };

  scope.addEventListener("install", (event: ExtendableEventLike) => {
    event.waitUntil(precache().then(() => scope.skipWaiting()));
  });

  scope.addEventListener("activate", (event: ExtendableEventLike) => {
    event.waitUntil(
      storage
        .keys()
        .then((names) => Promise.all(staleCacheNames(names, cacheName).map((name) => storage.delete(name))))
        .then(() => scope.clients.claim()),
    );
  });

  scope.addEventListener("fetch", (event: FetchEventLike) => {
    const strategy = strategyFor(event.request, scope.location.origin);
    if (strategy === "passthrough") return;
    event.respondWith(strategy === "cache-first" ? cacheFirst(event.request) : networkFirst(event.request));
  });
};
