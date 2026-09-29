import { WRITING_SUB_SKILLS } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { LIBRARY, articleFor, libraryArticles } from "./library";

describe("the library, as the app parses it", () => {
  it("holds one article per written-expression sub-skill, listed in the taxonomy's order", () => {
    expect(LIBRARY).toHaveLength(WRITING_SUB_SKILLS.length);
    expect(libraryArticles().map((a) => a.subSkill)).toEqual([...WRITING_SUB_SKILLS]);
  });

  it("finds an article by its route segment, and nothing for any other segment", () => {
    expect(articleFor("agreement")?.title.en).toBe("Agreement");
    expect(articleFor("main-idea")).toBeNull();
    expect(articleFor("../privacy")).toBeNull();
  });
});
