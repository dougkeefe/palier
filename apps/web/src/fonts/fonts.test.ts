import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * The committed fonts are what `SOURCES.md` says they are (progress.md D161): every woff2 here has
 * a row there whose hash matches the bytes, and each family's licence sits beside it. A replaced
 * file with a stale row, or a font with no provenance, fails.
 */

const dir = new URL("./", import.meta.url);
const sources = readFileSync(new URL("SOURCES.md", dir), "utf8");
const fonts = readdirSync(dir).filter((name) => name.endsWith(".woff2"));

describe("the self-hosted fonts", () => {
  it("are the three families §10.3 names", () => {
    expect(fonts.sort()).toEqual(["figtree-latin-wght.woff2", "inter-latin-wght.woff2", "source-serif-4-latin-wght.woff2"]);
  });

  it.each(fonts)("%s is a woff2 whose hash SOURCES.md records", (name) => {
    const bytes = readFileSync(new URL(name, dir));
    expect(bytes.subarray(0, 4).toString("latin1")).toBe("wOF2");
    const row = sources.split("\n").find((line) => line.startsWith(`| \`${name}\``));
    expect(row, `no row for ${name}`).toBeDefined();
    expect(row).toContain(createHash("sha256").update(bytes).digest("hex"));
  });

  it("carries each family's Open Font License", () => {
    for (const family of ["inter", "figtree", "sourceserif4"]) {
      expect(readFileSync(new URL(`OFL-${family}.txt`, dir), "utf8")).toContain("SIL Open Font License, Version 1.1");
    }
  });
});
