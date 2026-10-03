import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { appRoutes, routesJsonOf } from "../../scripts/prepare-public.mjs";
import routes from "./routes.json";

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("routes.json", () => {
  it("is exactly the app's routes, as prepare-public derives them from the page files and the library (D199)", async () => {
    // If this fails, run `pnpm --filter @palier/web dev` or `build` once: prepare-public rewrites the file.
    expect(readFileSync(join(WEB_ROOT, "src/lib/routes.json"), "utf8")).toBe(routesJsonOf(await appRoutes()));
  });

  it("names the locale root, a page, an article, and nothing dynamic or hermetic", () => {
    expect(routes).toContain("");
    expect(routes).toContain("progress");
    expect(routes).toContain("library/agreement");
    expect(routes.some((route) => route.includes("[") || route.startsWith("hermetic"))).toBe(false);
  });
});

describe("routesJsonOf", () => {
  it("writes one route per line, ending with a newline", () => {
    expect(routesJsonOf(["", "about"])).toBe('[\n  "",\n  "about"\n]\n');
  });
});
