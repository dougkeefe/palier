import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parseLibrary, parseLibraryOrThrow } from "../library.js";
import { WRITING_SUB_SKILLS } from "../sub-skills.js";

/**
 * The committed library (progress.md D162), read off disk here in `__tests__` because domain does
 * no I/O. The app imports the same files by package name. One file per written-expression
 * sub-skill, named for it, so a drill's link to `/library/<subSkill>` always has a page.
 */
const DIR = fileURLToPath(new URL("../../../../content/library/", import.meta.url));
const files = readdirSync(DIR).filter((name) => name.endsWith(".json"));
const library = (): unknown[] => files.map((name) => JSON.parse(readFileSync(`${DIR}${name}`, "utf8")) as unknown);

describe("the committed library", () => {
  it("validates: one article for every written-expression sub-skill, and no other", () => {
    expect(parseLibrary(library())).toMatchObject({ ok: true });
  });

  it("names each file for its article's sub-skill", () => {
    for (const article of parseLibraryOrThrow(library())) {
      expect(files).toContain(`${article.subSkill}.json`);
    }
    expect(files).toHaveLength(WRITING_SUB_SKILLS.length);
  });

  it("is French for now: the English mirror adds its own articles in Phase 8", () => {
    expect(parseLibraryOrThrow(library()).every((article) => article.lang === "fr")).toBe(true);
  });

  it("gives each article at least four examples, most with a sentence to write instead", () => {
    for (const article of parseLibraryOrThrow(library())) {
      expect(article.examples.length, article.subSkill).toBeGreaterThanOrEqual(4);
      expect(article.examples.filter((e) => e.avoid !== undefined).length, article.subSkill).toBeGreaterThanOrEqual(4);
    }
  });
});
