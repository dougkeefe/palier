import { describe, expect, it } from "vitest";

import { OPTION_IDS } from "@palier/domain";
import type { ItemDraft, OptionId } from "@palier/domain";

import { debiasKeyPosition } from "./assemble.js";

const draft = (stemFr: string, over: Partial<ItemDraft> = {}): ItemDraft => ({
  type: "cloze",
  stem: { fr: stemFr, en: "en" },
  blankIndex: 0,
  options: OPTION_IDS.map((id) => ({
    id,
    text: id === "a" ? "MARKER" : `distractor ${id}`,
    rationale: { fr: "f", en: "e" },
  })),
  key: "a",
  explanation: { fr: "f", en: "e" },
  subSkill: "agreement",
  targetBand: "B",
  topic: "human-resources",
  ...over,
});

describe("debiasKeyPosition", () => {
  it("keeps the correct text attached to the remapped key", () => {
    const { options, key } = debiasKeyPosition(draft("stem one"));
    expect(options).toHaveLength(4);
    expect(options.map((o) => o.id)).toEqual([...OPTION_IDS]);
    expect(options.find((o) => o.id === key)?.text).toBe("MARKER");
  });

  it("is deterministic for the same draft", () => {
    expect(debiasKeyPosition(draft("stem two"))).toEqual(debiasKeyPosition(draft("stem two")));
  });

  it("spreads the key across positions over many stems", () => {
    const keys = new Set<OptionId>();
    for (let i = 0; i < 40; i++) keys.add(debiasKeyPosition(draft(`stem ${String(i)}`)).key);
    expect(keys.size).toBeGreaterThan(1);
  });

  it("is a no-op when the draft does not carry exactly four options", () => {
    const three = draft("stem three", {
      options: [
        { id: "a", text: "MARKER", rationale: { fr: "f", en: "e" } },
        { id: "b", text: "x", rationale: { fr: "f", en: "e" } },
        { id: "c", text: "y", rationale: { fr: "f", en: "e" } },
      ],
    });
    const result = debiasKeyPosition(three);
    expect(result.key).toBe("a");
    expect(result.options).toHaveLength(3);
  });
});
