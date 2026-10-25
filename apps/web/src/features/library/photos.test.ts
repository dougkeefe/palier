import { readFileSync, readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { LIBRARY_PHOTOS, type LibraryPhotoName, photosFor } from "./photos";

const IMAGES = new URL("../../components/library/images/", import.meta.url);

describe("the library's photographs (D256)", () => {
  it("credits all three on the index, the library's own first", () => {
    expect(photosFor("index")).toEqual(["library", "reading", "writing"]);
  });

  it("credits only its skill's photograph on an article", () => {
    expect(photosFor("reading")).toEqual(["reading"]);
    expect(photosFor("writing")).toEqual(["writing"]);
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
});
