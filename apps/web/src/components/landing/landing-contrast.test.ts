import { readFileSync } from "node:fs";

import { CONTRAST_BODY_TEXT, CONTRAST_LARGE_TEXT_OR_UI, contrastRatio } from "@palier/ui";
import { describe, expect, it } from "vitest";

/**
 * The landing page's own palette (D201) held to the contrast gate @palier/ui's tokens are held to
 * (product-requirements.md §10.2, WCAG 1.4.3 and 1.4.11). The values are read from
 * `landing.css` itself, so a retuned colour is checked as written. Text on a photograph is
 * left to axe, which cannot be done from the hex values alone.
 */

const css = readFileSync(new URL("./landing.css", import.meta.url), "utf8");

const palette = Object.fromEntries(
  [...css.matchAll(/--landing-([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1] ?? "", m[2] ?? ""]),
);

const colour = (name: string): string => {
  const hex = palette[name];
  if (hex === undefined) throw new Error(`landing.css defines no --landing-${name}`);
  return hex;
};

/** [foreground, background, where it is used]: text at body size, which needs 4.5:1. */
const BODY_TEXT: readonly (readonly [string, string, string])[] = [
  ["text", "bg", "the page's running text"],
  ["neutral-600", "bg", "the strip under the hero"],
  ["neutral-700", "bg", "a section's eyebrow"],
  ["neutral-800", "bg", "the tests' and steps' descriptions"],
  ["accent-2-700", "bg", "a test's kicker"],
  ["accent-700", "bg", "a step's number and a link"],
  ["neutral-800", "accent-100", "the sample passage, the first feature and an open answer"],
  ["accent-800", "accent-100", "the sample question's tag"],
  ["neutral-800", "neutral-100", "a closed question in the FAQ"],
  ["text", "white", "a light call to action and a sample option"],
  ["text", "accent-100", "a light call to action, hovered"],
  ["text", "correct", "the right answer, marked"],
  ["text", "incorrect", "a wrong pick, marked"],
  ["white", "accent-800", "the third feature's heading"],
  ["on-dark-muted", "accent-800", "the third feature's text"],
  ["white", "accent-900", "the dark call to action and the footer's headings"],
  ["white", "accent-700", "the dark call to action, hovered"],
  ["on-dark-muted", "accent-900", "the footer's text and links"],
];

/** [foreground, background, where it is used]: a focus ring or a control's edge, which needs 3:1. */
const UI: readonly (readonly [string, string, string])[] = [
  ["accent", "bg", "the focus ring on the page"],
  ["accent", "white", "the focus ring around a sample option"],
  ["accent-700", "white", "a sample option's hover edge"],
  ["white", "accent-900", "the focus ring on the footer"],
];

describe("the landing palette", () => {
  it.each(BODY_TEXT)("%s on %s clears 4.5:1 (%s)", (fg, bg) => {
    expect(contrastRatio(colour(fg), colour(bg))).toBeGreaterThanOrEqual(CONTRAST_BODY_TEXT);
  });

  it.each(UI)("%s on %s clears 3:1 (%s)", (fg, bg) => {
    expect(contrastRatio(colour(fg), colour(bg))).toBeGreaterThanOrEqual(CONTRAST_LARGE_TEXT_OR_UI);
  });

  it("fails a colour the stylesheet does not define, rather than passing it", () => {
    expect(() => colour("nowhere")).toThrow("--landing-nowhere");
  });
});
