import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import {
  bankBasePathFrom,
  buildStampOf,
  localesFrom,
  routesFrom,
  serviceWorkerSource,
} from "../../scripts/prepare-public.mjs";
import { BANK_BASE_PATH } from "../lib/container";

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (path: string) => readFileSync(join(WEB_ROOT, path), "utf8");

describe("prepare-public", () => {
  it("turns page directories into route paths, dropping route groups and skipping dynamic and private ones", () => {
    expect(routesFrom(["", "about", "(focus)/practice/reading", "review/[id]", "_draft", "settings/data"])).toEqual([
      "",
      "about",
      "practice/reading",
      "settings/data",
    ]);
  });

  it("reads the locales the app routes, and refuses a routing file without them", () => {
    expect(localesFrom(read("src/i18n/routing.ts"))).toEqual(["en", "fr"]);
    expect(() => localesFrom("export const routing = {};")).toThrow(/locales/);
  });

  it("serves the bank where the composition root expects it, and refuses a root without the constant", () => {
    expect(bankBasePathFrom(read("src/lib/container.ts"))).toBe(BANK_BASE_PATH);
    expect(() => bankBasePathFrom("export const OTHER = 1;")).toThrow(/BANK_BASE_PATH/);
  });

  it("stamps the same inputs identically and any change differently", () => {
    expect(buildStampOf(["a", "b"])).toBe(buildStampOf(["a", "b"]));
    expect(buildStampOf(["a", "b"])).not.toBe(buildStampOf(["a", "c"]));
    // The separator stops a boundary shift from colliding.
    expect(buildStampOf(["ab", "c"])).not.toBe(buildStampOf(["a", "bc"]));
    expect(buildStampOf(["a"])).toMatch(/^[0-9a-f]{12}$/);
  });

  /**
   * The compile path end to end: `worker.ts` through the same `transpileModule` call
   * the script makes, wrapped the same way, then run as a classic script against a
   * stub worker scope. If `worker.ts` ever gains a runtime import, this is where it
   * fails — as `require is not defined` — rather than silently in a browser.
   */
  it("compiles the worker to a classic script that starts it with the build's config", () => {
    const compiled = ts.transpileModule(read("src/sw/worker.ts"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const config = {
      build: "abc",
      locales: ["en"],
      routes: [""],
      bankBasePath: "/content",
      bankManifests: [],
    };
    const source = serviceWorkerSource(compiled, config);

    const events: string[] = [];
    const self = {
      location: { origin: "https://palier.test" },
      clients: { claim: () => Promise.resolve() },
      skipWaiting: () => Promise.resolve(),
      addEventListener: (type: string) => events.push(type),
    };
    // Run it the way a browser runs a classic worker script: free `self`, `caches`, `fetch`.
    new Function("self", "caches", "fetch", source)(self, {}, () => Promise.reject(new Error("offline")));

    expect(events.sort()).toEqual(["activate", "fetch", "install"]);
    expect(source.startsWith("// Generated")).toBe(true);
    expect(source).toContain('"build":"abc"');
  });
});
