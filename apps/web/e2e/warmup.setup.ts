import { existsSync, readFileSync } from "node:fs";

import { test as setup } from "@playwright/test";

/**
 * Compile every route once, **one at a time**, before the hermetic tests run in
 * parallel. A cold Turbopack dev server that receives many first requests at once can
 * read a build file mid-write and answer "Unexpected end of JSON input" — seen here,
 * cold, on the server and in the browser. The medium lane always starts cold, so this
 * would flake there. Visiting each route in a real browser compiles its server and
 * client chunks, including the lazily loaded container, before any test needs them.
 *
 * A route left cold costs more than its own test's time: a first compile mid-run makes the dev
 * server rebuild every open page, and a rebuild drops a link click in flight, its request never
 * answered. That is how the library test failed on CI: the article route was never warmed, so its
 * own click compiled it (progress.md D249).
 *
 * The route list is the app's one list, `src/lib/routes.json` (D199), the library's articles
 * included, so it cannot drift from the app. **One page per route file, not per entry** (progress.md D260): the
 * eighteen articles are one route, `library/[subSkill]`, so its first article compiles it and the other
 * seventeen only rendered and waited for the network, in a warmup that runs alone before either worker
 * of a hermetic shard can start. Each route is visited in English only: `[locale]` is a
 * segment of the same route, so French adds nothing to compile but `request.ts`'s
 * messages, which one visit to `/fr` loads. The French pass cost a third of the
 * warmup, which runs in both shards (progress.md D223).
 */
const ROUTES = JSON.parse(readFileSync(new URL("../src/lib/routes.json", import.meta.url), "utf8")) as string[];

/** Whether an entry is a page file of its own, rather than one expansion of a dynamic route such as an article. */
const isPageFile = (route: string): boolean =>
  existsSync(new URL(`../src/app/[locale]/${route === "" ? "" : `${route}/`}page.tsx`, import.meta.url));

/**
 * Every page file once, and the first expansion of each dynamic route under its parent: an entry with
 * no page file of its own is an expansion, and one visit compiles the route they all share.
 */
const warmupRoutes = (routes: readonly string[], pageFile: (route: string) => boolean = isPageFile): string[] => {
  const expanded = new Set<string>();
  return routes.filter((route) => {
    if (pageFile(route)) return true;
    const parent = route.slice(0, route.lastIndexOf("/"));
    if (expanded.has(parent)) return false;
    expanded.add(parent);
    return true;
  });
};

setup("compile every route once, one at a time", async ({ page }) => {
  setup.setTimeout(180_000);
  const english = warmupRoutes(ROUTES).map((route) => (route === "" ? "/en" : `/en/${route}`));
  for (const path of ["/fr", ...english]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  // The thrown route reaches its error screen only after the network is idle, so each waits for its heading.
  for (const path of UNLISTED) {
    await page.goto(path);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.waitForLoadState("networkidle");
  }
  // The API routes compile on first request too; each answers 401 or 400 unauthenticated
  // or empty, which is enough to build it before two journey-8 devices call it at once.
  for (const [method, path] of SYNC_ROUTES) await page.request.fetch(path, { method });
});

/**
 * The pages the route list does not name, which `errors.spec.ts` visits: an unknown path's 404
 * (`[...rest]`) and both views of the hermetic lane's error hook (D249), with a `leak` as the spec gives one.
 */
const UNLISTED = ["/en/warmup/unknown-path", "/en/hermetic/route?leak=warmup", "/en/hermetic/global?leak=warmup"] as const;

const SYNC_ROUTES = [
  ["POST", "/api/account/device"],
  ["POST", "/api/account/pair-code"],
  ["POST", "/api/account/pair"],
  ["GET", "/api/account/devices"],
  ["DELETE", "/api/account/device/warmup"],
  ["DELETE", "/api/account"],
  ["GET", "/api/sync"],
  ["POST", "/api/telemetry"],
  // Studio mode's secret (D169): 401 with no key, which is enough to build it.
  ["POST", "/api/realtime/secret"],
] as const;
