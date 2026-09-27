import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { WRITING_REGISTERS } from "../writing-prompt.js";
import { parseWritingPrompts, parseWritingPromptsOrThrow } from "../writing-prompts.js";

/**
 * The committed prompt library (progress.md D107), read off disk here in `__tests__`
 * because domain does no I/O. The composition root imports the same file by package name.
 */
const LIBRARY_PATH = fileURLToPath(new URL("../../../../content/writing/prompts.json", import.meta.url));
const library = (): unknown => JSON.parse(readFileSync(LIBRARY_PATH, "utf8"));

describe("the committed writing prompt library", () => {
  it("validates", () => {
    expect(parseWritingPrompts(library())).toMatchObject({ ok: true });
  });

  it("offers every register PRD §8.7 names, so the workshop covers each kind of work writing", () => {
    const registers = new Set(parseWritingPromptsOrThrow(library()).map((p) => p.register));
    expect([...registers].sort()).toEqual([...WRITING_REGISTERS].sort());
  });

  it("is French for now: the English mirror adds its own prompts in Phase 8", () => {
    expect(parseWritingPromptsOrThrow(library()).every((p) => p.lang === "fr")).toBe(true);
  });
});
