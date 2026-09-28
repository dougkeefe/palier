import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseOralFillers } from "../oral-fillers.js";

/** The committed filler list, `@palier/content/oral/fillers.json` (progress.md D123), held valid. */
const committed: unknown = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../../content/oral/fillers.json", import.meta.url)), "utf8"),
);

describe("the committed filler list", () => {
  it("validates", () => {
    expect(parseOralFillers(committed).ok).toBe(true);
  });

  it("lists the French hesitation every candidate uses, and a phrase of two words", () => {
    const result = parseOralFillers(committed);
    if (!result.ok) throw new Error(result.errors.join("\n"));
    expect(result.fillers.fr).toContain("euh");
    expect(result.fillers.fr.some((filler) => filler.includes(" "))).toBe(true);
  });
});
