import { LIBRARY_SUB_SKILLS, READING_SUB_SKILLS, WRITING_SUB_SKILLS } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { LIBRARY, adjacentArticles, articleFor, libraryArticlesFor, skillOf } from "./library";

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

  it("names each article's skill from its sub-skill", () => {
    for (const article of libraryArticlesFor("reading")) expect(skillOf(article)).toBe("reading");
    for (const article of libraryArticlesFor("writing")) expect(skillOf(article)).toBe("writing");
  });

  describe("adjacentArticles (D256)", () => {
    const subSkillsBeside = (subSkill: string) => {
      const { previous, next } = adjacentArticles(articleFor(subSkill)!);
      return [previous?.subSkill ?? null, next?.subSkill ?? null];
    };

    it("gives a skill's first article a next and no previous", () => {
      expect(subSkillsBeside(READING_SUB_SKILLS[0])).toEqual([null, READING_SUB_SKILLS[1]]);
      expect(subSkillsBeside(WRITING_SUB_SKILLS[0])).toEqual([null, WRITING_SUB_SKILLS[1]]);
    });

    it("gives an article in the middle both neighbours, in the taxonomy's order", () => {
      expect(subSkillsBeside("agreement")).toEqual(["verb-tense-and-mood", "prepositions-and-government"]);
    });

    it("gives a skill's last article no next, so reading never runs on into writing", () => {
      expect(subSkillsBeside(READING_SUB_SKILLS[READING_SUB_SKILLS.length - 1]!)).toEqual([READING_SUB_SKILLS[6], null]);
      expect(subSkillsBeside(WRITING_SUB_SKILLS[WRITING_SUB_SKILLS.length - 1]!)).toEqual([WRITING_SUB_SKILLS[8], null]);
    });
  });
});
