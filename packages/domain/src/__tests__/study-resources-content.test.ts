import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseStudyResources, parseStudyResourcesOrThrow } from "../study-resources.js";
import { WRITING_SUB_SKILLS } from "../sub-skills.js";

/** The committed resources, `@palier/content/resources/resources.json` (progress.md D248), held valid. */
const committed: unknown = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../../content/resources/resources.json", import.meta.url)), "utf8"),
);

describe("the committed study resources", () => {
  it("validates: every written-expression sub-skill has one, each on its source's own host", () => {
    expect(parseStudyResources(committed)).toMatchObject({ ok: true });
  });

  it("gives every sub-skill at most three, so an explanation stays short", () => {
    const resources = parseStudyResourcesOrThrow(committed);
    for (const subSkill of WRITING_SUB_SKILLS) {
      expect(resources.filter((r) => r.subSkill === subSkill).length, subSkill).toBeLessThanOrEqual(3);
    }
  });
});
