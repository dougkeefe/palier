import { readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { test as setup } from "@playwright/test";

import { routesFrom } from "../scripts/prepare-public.mjs";

/**
 * Compile every route once, **one at a time**, before the hermetic tests run in
 * parallel. A cold Turbopack dev server that receives many first requests at once can
 * read a build file mid-write and answer "Unexpected end of JSON input" — seen here,
 * cold, on the server and in the browser. The medium lane always starts cold, so this
 * would flake there. Visiting each route in a real browser compiles its server and
 * client chunks, including the lazily loaded container, before any test needs them.
 *
 * The route list is derived the way the service worker's is (`routesFrom`), so it
 * cannot drift from the app. Each route is visited in English only: `[locale]` is a
 * segment of the same route, so French adds nothing to compile but `request.ts`'s
 * messages, which one visit to `/fr` loads. The French pass cost a third of the
 * warmup, which runs in both shards (progress.md D223).
 */
const LOCALE_DIR = join(dirname(fileURLToPath(import.meta.url)), "../src/app/[locale]");

const pageDirs = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pageDirs(path);
    return entry.name === "page.tsx" ? [relative(LOCALE_DIR, dir).split("\\").join("/")] : [];
  });

setup("compile every route once, one at a time", async ({ page }) => {
  setup.setTimeout(180_000);
  const english = routesFrom(pageDirs(LOCALE_DIR)).map((route) => (route === "" ? "/en" : `/en/${route}`));
  for (const path of ["/fr", ...english]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  // The API routes compile on first request too; each answers 401 or 400 unauthenticated
  // or empty, which is enough to build it before two journey-8 devices call it at once.
  for (const [method, path] of SYNC_ROUTES) await page.request.fetch(path, { method });
});

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
