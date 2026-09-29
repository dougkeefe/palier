import { describe, expect, it } from "vitest";

import { parseLibrary, parseLibraryOrThrow } from "./library.js";
import { WRITING_SUB_SKILLS } from "./sub-skills.js";

const anArticle = (subSkill: string, over: Record<string, unknown> = {}) => ({
  subSkill,
  lang: "fr",
  title: { en: "Agreement", fr: "L'accord" },
  summary: { en: "Make the words agree.", fr: "Faites accorder les mots." },
  sections: [{ heading: { en: "The rule", fr: "La règle" }, paragraphs: [{ en: "One.", fr: "Un." }] }],
  examples: [{ avoid: "Les dossiers est prêt.", write: "Les dossiers sont prêts.", why: { en: "Plural.", fr: "Pluriel." } }],
  ...over,
});

const everyArticle = () => WRITING_SUB_SKILLS.map((subSkill) => anArticle(subSkill));

describe("parseLibrary", () => {
  it("accepts one article per written-expression sub-skill", () => {
    const result = parseLibrary(everyArticle());
    expect(result.ok && result.articles.map((a) => a.subSkill)).toEqual([...WRITING_SUB_SKILLS]);
  });

  it("refuses a library missing a sub-skill's article, since its items would link nowhere", () => {
    const result = parseLibrary(everyArticle().slice(1));
    expect(result).toEqual({ ok: false, errors: [`(root): "${WRITING_SUB_SKILLS[0]}" has no article`] });
  });

  it("refuses two articles for one sub-skill", () => {
    const result = parseLibrary([...everyArticle(), anArticle("agreement")]);
    expect(result).toEqual({ ok: false, errors: [`${String(WRITING_SUB_SKILLS.length)}.subSkill: "agreement" has two articles`] });
  });

  it("refuses an article related to itself", () => {
    const articles = everyArticle().map((a) => (a.subSkill === "pronouns" ? { ...a, related: ["agreement", "pronouns"] } : a));
    const index = WRITING_SUB_SKILLS.indexOf("pronouns");
    expect(parseLibrary(articles)).toEqual({ ok: false, errors: [`${String(index)}.related.1: an article cannot relate to itself`] });
  });

  it("refuses an unpaired cited-text marker, wherever the prose is, since it would italicise the rest", () => {
    const withMarks = (over: Record<string, unknown>) =>
      everyArticle().map((a) => (a.subSkill === "agreement" ? anArticle("agreement", over) : a));
    const at = WRITING_SUB_SKILLS.indexOf("agreement");
    expect(parseLibrary(withMarks({ summary: { en: "Make _les mots agree.", fr: "Faites _accorder_." } }))).toEqual({
      ok: false,
      errors: [`${String(at)}.summary.en: an unpaired "_"`],
    });
    const section = { heading: { en: "h", fr: "h" }, paragraphs: [{ en: "ok", fr: "_un_ et _deux" }] };
    expect(parseLibrary(withMarks({ sections: [section] }))).toEqual({
      ok: false,
      errors: [`${String(at)}.sections.0.paragraphs.0.fr: an unpaired "_"`],
    });
    const example = { write: "Oui.", why: { en: "Because _oui", fr: "Parce que." } };
    expect(parseLibrary(withMarks({ examples: [example] }))).toEqual({
      ok: false,
      errors: [`${String(at)}.examples.0.why.en: an unpaired "_"`],
    });
    expect(parseLibrary(withMarks({ summary: { en: "Make _les mots_ agree.", fr: "Faites _accorder_." } })).ok).toBe(true);
  });

  it("names the path of a schema problem, and the root when the library is not an array", () => {
    const bad = parseLibrary([anArticle("agreement", { examples: [] }), ...everyArticle().slice(1)]);
    expect(!bad.ok && bad.errors[0]).toMatch(/^0\.examples: /u);
    const notArray = parseLibrary({ articles: [] });
    expect(!notArray.ok && notArray.errors[0]).toMatch(/^\(root\): /u);
  });

  it("throws with every problem listed, for the app, where a bad library is a build defect", () => {
    expect(parseLibraryOrThrow(everyArticle())).toHaveLength(WRITING_SUB_SKILLS.length);
    expect(() => parseLibraryOrThrow([])).toThrow(/The library is not valid:\n {2}\(root\): "verb-tense-and-mood" has no article/u);
  });
});
