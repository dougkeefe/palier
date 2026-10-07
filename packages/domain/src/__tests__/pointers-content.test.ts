import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parsePointers, parsePointersOrThrow } from "../pointers.js";
import { READING_SUB_SKILLS, WRITING_SUB_SKILLS } from "../sub-skills.js";

/** The committed pointers, `@palier/content/pointers/pointers.json` (progress.md D216), held valid. */
const committed: unknown = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../../content/pointers/pointers.json", import.meta.url)), "utf8"),
);

describe("the committed pointers", () => {
  it("validates: every reading and written-expression sub-skill has one", () => {
    expect(parsePointers(committed)).toMatchObject({ ok: true });
  });

  it("gives every sub-skill three, so a focus shown for days does not repeat at once", () => {
    const pointers = parsePointersOrThrow(committed);
    for (const subSkill of [...READING_SUB_SKILLS, ...WRITING_SUB_SKILLS]) {
      expect(pointers.filter((p) => p.subSkill === subSkill), subSkill).toHaveLength(3);
    }
  });

  it("is French for now: the English mirror adds its own in Phase 8", () => {
    expect(parsePointersOrThrow(committed).every((p) => p.lang === "fr")).toBe(true);
  });
});
