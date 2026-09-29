import { WRITING_SUB_SKILLS } from "@palier/domain";
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

  it("links a reading sub-skill nowhere, since reading's articles come after 1.0", () => {
    expect(articleHref("main-idea")).toBeNull();
    expect(articleHref("inference")).toBeNull();
  });
});
