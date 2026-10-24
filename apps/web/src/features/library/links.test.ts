import { ORAL_SUB_SKILLS, READING_SUB_SKILLS, WRITING_SUB_SKILLS } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { articleFor } from "../../lib/library";
import { articleHref } from "./links";

describe("articleHref", () => {
  it("links every written-expression sub-skill to an article the library holds", () => {
    for (const subSkill of WRITING_SUB_SKILLS) {
      expect(articleHref(subSkill)).toBe(`/library/${subSkill}`);
      expect(articleFor(subSkill)).not.toBeNull();
    }
  });

  it("links every reading sub-skill to an article the library holds too (D254)", () => {
    for (const subSkill of READING_SUB_SKILLS) {
      expect(articleHref(subSkill)).toBe(`/library/${subSkill}`);
      expect(articleFor(subSkill)).not.toBeNull();
    }
  });

  it("links an oral sub-skill nowhere, since the library has no oral articles", () => {
    for (const subSkill of ORAL_SUB_SKILLS) expect(articleHref(subSkill)).toBeNull();
  });
});
