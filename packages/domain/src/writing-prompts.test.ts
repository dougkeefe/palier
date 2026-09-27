import { describe, expect, it } from "vitest";

import { parseWritingPrompts, parseWritingPromptsOrThrow } from "./writing-prompts.js";

const aPrompt = (over: Record<string, unknown> = {}) => ({
  id: "wp-briefing-01",
  lang: "fr",
  register: "briefing-note",
  title: { en: "A briefing note", fr: "Une note d'information" },
  task: "Rédigez un paragraphe.",
  wordTarget: 150,
  suggestedMinutes: 20,
  ...over,
});

describe("parseWritingPrompts", () => {
  it("accepts a library of valid prompts", () => {
    const result = parseWritingPrompts([aPrompt(), aPrompt({ id: "wp-reply-01", register: "client-reply" })]);
    expect(result.ok && result.prompts.map((p) => p.id)).toEqual(["wp-briefing-01", "wp-reply-01"]);
  });

  it("refuses an empty library, since the workshop needs a prompt to offer", () => {
    expect(parseWritingPrompts([]).ok).toBe(false);
  });

  it("refuses an id used twice, since a submission names its prompt by id", () => {
    const result = parseWritingPrompts([aPrompt(), aPrompt()]);
    expect(result).toEqual({ ok: false, errors: ['1.id: the id "wp-briefing-01" is used twice'] });
  });

  it("names the path of each problem", () => {
    const result = parseWritingPrompts([aPrompt({ wordTarget: 0 })]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]).toMatch(/^0\.wordTarget: /u);
  });

  it("names the root when the library is not an array", () => {
    const result = parseWritingPrompts({ prompts: [] });
    expect(!result.ok && result.errors[0]).toMatch(/^\(root\): /u);
  });
});

describe("parseWritingPromptsOrThrow", () => {
  it("returns the prompts when the library is valid", () => {
    expect(parseWritingPromptsOrThrow([aPrompt()])).toHaveLength(1);
  });

  it("throws listing every problem", () => {
    expect(() => parseWritingPromptsOrThrow([aPrompt({ register: "essay", suggestedMinutes: -1 })])).toThrow(
      /The writing prompt library is not valid:\n {2}0\.register: .*\n {2}0\.suggestedMinutes: /su,
    );
  });
});
