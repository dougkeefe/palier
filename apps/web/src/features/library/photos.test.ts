import { readFileSync, readdirSync, statSync } from "node:fs";

import { LIBRARY_SUB_SKILLS } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { LIBRARY_PHOTOS, type LibraryPhotoName, photosFor } from "./photos";

const IMAGES = new URL("../../components/library/images/", import.meta.url);

/** Every photograph is precached through the stylesheet (D201), so each is held small (D257). */
const MAX_BYTES = 25_000;

describe("the library's photographs (D256, D257)", () => {
  it("credits the library's own first on the index, then every article's in the taxonomy's order", () => {
    expect(photosFor("index")).toEqual(["library", ...LIBRARY_SUB_SKILLS]);
  });

  it("credits an article's own photograph, then its Read next cards'", () => {
    expect(photosFor({ subSkill: "agreement", related: ["pronouns", "verb-tense-and-mood"] })).toEqual([
      "agreement",
      "pronouns",
      "verb-tense-and-mood",
    ]);
    expect(photosFor({ subSkill: "inference" })).toEqual(["inference"]);
  });

  it("has a photograph for every article", () => {
    for (const subSkill of LIBRARY_SUB_SKILLS) expect(LIBRARY_PHOTOS[subSkill], subSkill).toBeDefined();
  });

  it("links every credit to its photo on Unsplash", () => {
    for (const { url } of Object.values(LIBRARY_PHOTOS)) expect(url).toMatch(/^https:\/\/unsplash\.com\/photos\/[\w-]+$/);
  });

  it("has a file for every photograph, and a line in SOURCES.md naming its photographer and its page", () => {
    const files = readdirSync(IMAGES).filter((f) => f.endsWith(".webp"));
    const names = Object.keys(LIBRARY_PHOTOS) as LibraryPhotoName[];
    expect(files.sort()).toEqual(names.map((name) => `${name}.webp`).sort());
    const sources = readFileSync(new URL("SOURCES.md", IMAGES), "utf8");
    for (const name of names) {
      const row = sources.split("\n").find((line) => line.startsWith(`| \`${name}.webp\``));
      expect(row).toContain(LIBRARY_PHOTOS[name].photographer);
      expect(row).toContain(LIBRARY_PHOTOS[name].url);
    }
  });

  it(`keeps every article's photograph under ${MAX_BYTES / 1000} KB, since the worker precaches them all`, () => {
    for (const subSkill of LIBRARY_SUB_SKILLS) {
      expect(statSync(new URL(`${subSkill}.webp`, IMAGES)).size, subSkill).toBeLessThanOrEqual(MAX_BYTES);
    }
  });
});
