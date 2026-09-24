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
 * cannot drift from the app.
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
  for (const route of routesFrom(pageDirs(LOCALE_DIR))) {
    for (const locale of ["en", "fr"]) {
      await page.goto(route === "" ? `/${locale}` : `/${locale}/${route}`);
      await page.waitForLoadState("networkidle");
    }
  }
});
