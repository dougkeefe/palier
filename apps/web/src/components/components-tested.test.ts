import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * The ratchet (progress.md D268): every component has a unit test beside it, `Name.test.tsx` for `Name.tsx`, except
 * those listed in `untested-components.json`, which were untested when the ratchet began. The list may only shrink, so
 * a new component, or one that gains its test, can never go back to having none. Coverage thresholds cannot hold this:
 * they are glob-keyed, and one on `components/**` would fail until every island were covered at once.
 */
const COMPONENTS = new URL("./", import.meta.url);

const files = (readdirSync(fileURLToPath(COMPONENTS), { recursive: true }) as string[]).map((path) =>
  path.split("\\").join("/"),
);
const components = files.filter((path) => path.endsWith(".tsx") && !path.endsWith(".test.tsx")).sort();
const tested = new Set(files.filter((path) => path.endsWith(".test.tsx")).map((path) => path.replace(/\.test\.tsx$/, ".tsx")));
const baseline = (JSON.parse(readFileSync(new URL("untested-components.json", COMPONENTS), "utf8")) as { untested: string[] })
  .untested;

describe("every component has a unit test beside it (D268)", () => {
  it("finds the components it holds to the rule", () => {
    expect(components.length).toBeGreaterThan(baseline.length);
    expect(components).toContain("HeaderMenu.tsx");
  });

  it("has a test for every component not on the baseline", () => {
    const missing = components.filter((path) => !tested.has(path) && !baseline.includes(path));
    expect(missing, "add a Name.test.tsx beside each; a new component is never added to the baseline").toEqual([]);
  });

  it("only shrinks: no entry on the baseline has a test now or is gone", () => {
    const stale = baseline.filter((path) => tested.has(path) || !components.includes(path));
    expect(stale, "remove these from untested-components.json").toEqual([]);
  });

  it("keeps the baseline sorted, with no entry twice", () => {
    expect(baseline).toEqual([...new Set(baseline)].sort());
  });
});
