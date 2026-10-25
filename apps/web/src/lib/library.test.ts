import { LIBRARY_SUB_SKILLS, READING_SUB_SKILLS, WRITING_SUB_SKILLS } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { LIBRARY, articleFor, libraryArticlesFor } from "./library";

describe("the library, as the app parses it", () => {
  it("holds one article per reading and written-expression sub-skill (D254)", () => {
    expect(LIBRARY.map((a) => a.subSkill).sort()).toEqual([...LIBRARY_SUB_SKILLS].sort());
  });

  it("lists each skill's articles in the taxonomy's order", () => {
    expect(libraryArticlesFor("reading").map((a) => a.subSkill)).toEqual([...READING_SUB_SKILLS]);
    expect(libraryArticlesFor("writing").map((a) => a.subSkill)).toEqual([...WRITING_SUB_SKILLS]);
  });

  it("finds an article by its route segment, and nothing for any other segment", () => {
    expect(articleFor("agreement")?.title.en).toBe("Agreement");
    expect(articleFor("main-idea")?.title.en).toBe("Main idea");
    expect(articleFor("fluency-and-hesitation")).toBeNull();
    expect(articleFor("../privacy")).toBeNull();
  });

  it("gives every reading article excerpts in its own language, and relates it only to reading", () => {
    for (const article of libraryArticlesFor("reading")) {
      expect(article.examples.every((example) => "excerpt" in example)).toBe(true);
      for (const related of article.related ?? []) expect(READING_SUB_SKILLS).toContain(related);
    }
  });
});
