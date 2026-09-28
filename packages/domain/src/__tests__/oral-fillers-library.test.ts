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

  it("lists only hesitations, never a word a formal speaker uses for its meaning (D127)", () => {
    const result = parseOralFillers(committed);
    if (!result.ok) throw new Error(result.errors.join("\n"));
    expect(result.fillers.fr).toContain("euh");
    for (const word of ["genre", "en fait", "du coup", "bon", "voilà", "disons", "vous savez"]) {
      expect(result.fillers.fr).not.toContain(word);
    }
    for (const word of ["like", "kind of", "sort of", "you know", "i mean"]) {
      expect(result.fillers.en.map((f) => f.toLowerCase())).not.toContain(word);
    }
  });
});
