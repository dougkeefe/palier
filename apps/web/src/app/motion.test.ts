import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

/**
 * The motion pass's rules (product-requirements.md §10.5, progress.md D160), held over the two
 * stylesheets every page loads, `@palier/ui`'s components and this app's globals, and the landing
 * page's own (D201).
 * - every duration is one of §10.5's three, through its token, so no rule invents a fourth;
 * - a keyframe moves things and never fades them, since a fade is low-contrast text (D65);
 * - one switch turns every animation and transition off under reduced motion, and another in
 *   exam mode, so a new animation cannot be left out of either.
 */

const require = createRequire(import.meta.url);
const SHEETS = {
  "components.css": readFileSync(require.resolve("@palier/ui/components.css"), "utf8"),
  "globals.css": readFileSync(new URL("./globals.css", import.meta.url), "utf8"),
  "landing.css": readFileSync(new URL("../components/landing/landing.css", import.meta.url), "utf8"),
};

const uncommented = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Every `transition`/`animation` declaration, as `property: value`. */
const motionDeclarations = (css: string): string[] =>
  [...uncommented(css).matchAll(/(?:^|[;{\s])((?:transition|animation)(?:-duration|-delay)?)\s*:\s*([^;}]+)/g)].map(
    (m) => `${m[1] ?? ""}: ${(m[2] ?? "").trim()}`,
  );

const keyframes = (css: string): { name: string; body: string }[] =>
  [...uncommented(css).matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^}]*\})*)\s*\}/g)].map((m) => ({
    name: m[1] ?? "",
    body: m[2] ?? "",
  }));

describe.each(Object.entries(SHEETS))("the motion rules in %s", (_, css) => {
  it("writes every duration through a §10.5 token, never as a number", () => {
    for (const declaration of motionDeclarations(css)) {
      expect(declaration, declaration).not.toMatch(/\d(?:\.\d+)?m?s\b/);
    }
  });

  it("animates transform only in every keyframe: nothing fades", () => {
    for (const { name, body } of keyframes(css)) {
      expect(body, name).not.toMatch(/opacity|visibility|color/);
    }
  });
});

describe("the motion switches in components.css", () => {
  const css = uncommented(SHEETS["components.css"]);

  it("defines the three durations and the standard easing, as §10.5 gives them", () => {
    expect(css).toMatch(/--pl-motion-state:\s*120ms/);
    expect(css).toMatch(/--pl-motion-panel:\s*200ms/);
    expect(css).toMatch(/--pl-motion-celebrate:\s*400ms/);
    expect(css).toMatch(/--pl-ease:\s*cubic-bezier\(0\.2, 0, 0, 1\)/);
  });

  it("turns every animation and transition off under prefers-reduced-motion, for every element", () => {
    const block = /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\*,\s*\*::before,\s*\*::after\s*\{([^}]*)\}/.exec(css);
    expect(block?.[1]).toMatch(/animation:\s*none !important/);
    expect(block?.[1]).toMatch(/transition:\s*none !important/);
  });

  it("turns every animation and transition off in exam mode, whatever the preference", () => {
    const block = /\[data-mode="exam"\] \*::after\s*\{([^}]*)\}/.exec(css);
    expect(block?.[1]).toMatch(/animation:\s*none !important/);
    expect(block?.[1]).toMatch(/transition:\s*none !important/);
  });
});
