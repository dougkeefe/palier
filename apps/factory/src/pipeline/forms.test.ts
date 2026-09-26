import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { examFormSchema, orderedCuts, parseExamProfileOrThrow } from "@palier/domain";
import type { ExamProfile, Item, Lang, ScoredSkill, SubSkill, TargetBand } from "@palier/domain";

import { FormShortfallError, assembleForms, formIdFor, pilotPositions } from "./forms.js";

const profile: ExamProfile = parseExamProfileOrThrow(
  JSON.parse(readFileSync("content/profiles/psc-sle.json", "utf8")) as unknown,
);

/** The form stage reads only these fields, so the rest of an `Item` is left out. */
const item = (
  id: string,
  skill: ScoredSkill,
  subSkill: SubSkill,
  targetBand: TargetBand,
  over: { lang?: Lang; passageId?: string } = {},
): Item =>
  ({
    id,
    skill,
    subSkill,
    targetBand,
    lang: over.lang ?? "fr",
    ...(over.passageId === undefined ? {} : { passageId: over.passageId }),
  }) as unknown as Item;

/** `perSubSkill` items for every sub-skill of both scored skills, alternating B and C;
 * reading items share a passage three at a time. */
const bank = (perSubSkill: number): Item[] => {
  const out: Item[] = [];
  for (const skill of ["reading", "writing"] as const) {
    profile.subSkills[skill].forEach((subSkill, s) => {
      for (let n = 0; n < perSubSkill; n++) {
        const id = `${skill}-${String(s)}-${String(n)}`;
        const band: TargetBand = n % 2 === 0 ? "B" : "C";
        out.push(item(id, skill, subSkill, band, skill === "reading" ? { passageId: `p-${String(s)}-${String(Math.floor(n / 3))}` } : {}));
      }
    });
  }
  return out;
};

const variants = Object.entries(profile.variants);
const forms = (over: { items?: Item[]; seed?: number } = {}) =>
  assembleForms({ items: over.items ?? bank(12), profile, lang: "fr", bankVersion: 2, seed: over.seed ?? 1 });

describe("assembleForms", () => {
  it("builds one form per profile variant, named for its language, variant and bank version", () => {
    expect(forms().map((f) => f.id)).toEqual(variants.map(([name]) => formIdFor("fr", name, 2)));
    expect(formIdFor("fr", "reading-supervised", 2)).toBe("fr-reading-supervised-v2");
  });

  it("takes each form's item count, pilot count, time limit, skill and mode from its variant", () => {
    const built = forms();
    variants.forEach(([, variant], v) => {
      const form = built[v]!;
      expect(form.itemIds).toHaveLength(variant.items);
      expect(form.pilotItemIds).toHaveLength(variant.items - variant.scored);
      expect(form.timeLimitMinutes).toBe(variant.minutes);
      expect(form.skill).toBe(variant.skill);
      expect(form.mode).toBe(variant.mode);
      expect(form.lang).toBe("fr");
      expect(form.version).toBe(2);
    });
  });

  it("copies the cut table from the profile", () => {
    const built = forms();
    variants.forEach(([, variant], v) => expect(built[v]!.bandCuts).toEqual(orderedCuts(variant)));
  });

  it("returns schema-valid forms with no item twice and pilots drawn from the form", () => {
    for (const form of forms()) {
      expect(examFormSchema.safeParse(form).success).toBe(true);
      expect(new Set(form.itemIds).size).toBe(form.itemIds.length);
      for (const pilot of form.pilotItemIds) expect(form.itemIds).toContain(pilot);
    }
  });

  it("spreads the pilots across the form rather than bunching them at the end", () => {
    const supervised = forms().find((f) => f.pilotItemIds.length > 0)!;
    const positions = supervised.pilotItemIds.map((p) => supervised.itemIds.indexOf(p));
    expect(Math.min(...positions)).toBeLessThan(supervised.itemIds.length / 5);
    expect(Math.max(...positions)).toBeGreaterThan((supervised.itemIds.length * 4) / 5);
  });

  it("uses only items of the form's skill and language", () => {
    const english = bank(12).map((i) => ({ ...i, id: `en-${i.id}`, lang: "en" }) as Item);
    const byId = new Map([...bank(12), ...english].map((i) => [i.id, i]));
    for (const form of forms({ items: [...byId.values()] })) {
      for (const id of form.itemIds) {
        expect(byId.get(id)!.skill).toBe(form.skill);
        expect(byId.get(id)!.lang).toBe("fr");
      }
    }
  });

  it("covers every sub-skill and both bands when the bank allows", () => {
    const byId = new Map(bank(12).map((i) => [i.id, i]));
    for (const form of forms()) {
      const drawn = form.itemIds.map((id) => byId.get(id)!);
      expect(new Set(drawn.map((i) => i.subSkill)).size).toBe(profile.subSkills[form.skill].length);
      expect(new Set(drawn.map((i) => i.targetBand))).toEqual(new Set(["B", "C"]));
    }
  });

  it("keeps items on one passage together", () => {
    const byId = new Map(bank(12).map((i) => [i.id, i]));
    for (const form of forms().filter((f) => f.skill === "reading")) {
      const passages = form.itemIds.map((id) => byId.get(id)!.passageId);
      const runs = passages.filter((p, i) => i === 0 || p !== passages[i - 1]);
      expect(runs).toHaveLength(new Set(passages).size);
    }
  });

  it("is deterministic for a seed, whatever order the items arrive in", () => {
    expect(forms({ items: bank(12).reverse(), seed: 7 })).toEqual(forms({ seed: 7 }));
  });

  it("draws a different form from a different seed", () => {
    expect(forms({ seed: 1 })[0]!.itemIds).not.toEqual(forms({ seed: 2 })[0]!.itemIds);
  });

  it("ignores an item whose sub-skill is outside its skill's taxonomy", () => {
    const stray = item("stray", "writing", "main-idea", "B");
    for (const form of forms({ items: [...bank(12), stray] })) expect(form.itemIds).not.toContain("stray");
  });

  it("ignores a retired item, which stays in the bank but never sits on a new form", () => {
    // 8 reading sub-skills × 8 = 64 items fill the supervised 60; retire 5 and they no longer do.
    expect(() => forms({ items: bank(8) })).not.toThrow();
    const retiring = new Set(["reading-0-0", "reading-1-0", "reading-2-0", "reading-3-0", "reading-4-0"]);
    const items = bank(8).map((i) => (retiring.has(i.id) ? { ...i, status: "retired" as const } : i));
    expect(() => forms({ items })).toThrow(/variant reading-supervised needs 60 reading items in fr, the bank has 59/);
  });

  it("refuses to ship a short form, naming the variant and the shortfall", () => {
    // 8 reading sub-skills × 7 = 56 items: enough for the unsupervised 25, not the supervised 60.
    const attempt = () => forms({ items: bank(7) });
    expect(attempt).toThrow(FormShortfallError);
    expect(attempt).toThrow(/variant reading-supervised needs 60 reading items in fr, the bank has 56 \(main-idea 7,/);
  });
});

describe("pilotPositions", () => {
  it("spaces pilots evenly, one per equal slice of the form", () => {
    expect(pilotPositions(60, 10)).toEqual([3, 9, 15, 21, 27, 33, 39, 45, 51, 57]);
  });

  it("places no pilot when the variant has none", () => {
    expect(pilotPositions(25, 0)).toEqual([]);
  });
});
