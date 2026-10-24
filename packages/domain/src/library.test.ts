import { describe, expect, it } from "vitest";

import { LIBRARY_SUB_SKILLS, parseLibrary, parseLibraryOrThrow } from "./library.js";
import { READING_SUB_SKILLS, WRITING_SUB_SKILLS } from "./sub-skills.js";

const isReading = (subSkill: string): boolean => (READING_SUB_SKILLS as readonly string[]).includes(subSkill);

const anArticle = (subSkill: string, over: Record<string, unknown> = {}) => ({
  subSkill,
  lang: "fr",
  title: { en: "Agreement", fr: "L'accord" },
  summary: { en: "Make the words agree.", fr: "Faites accorder les mots." },
  sections: [{ heading: { en: "The rule", fr: "La règle" }, paragraphs: [{ en: "One.", fr: "Un." }] }],
  examples: isReading(subSkill)
    ? [{ excerpt: "Le comité se réunira jeudi.", why: { en: "When.", fr: "Quand." } }]
    : [{ avoid: "Les dossiers est prêt.", write: "Les dossiers sont prêts.", why: { en: "Plural.", fr: "Pluriel." } }],
  ...over,
});

const everyArticle = () => LIBRARY_SUB_SKILLS.map((subSkill) => anArticle(subSkill));
const indexOf = (subSkill: string): string => String(LIBRARY_SUB_SKILLS.indexOf(subSkill as (typeof LIBRARY_SUB_SKILLS)[number]));

describe("parseLibrary", () => {
  it("accepts one article per reading and written-expression sub-skill, reading's first (D254)", () => {
    const result = parseLibrary(everyArticle());
    expect(result.ok && result.articles.map((a) => a.subSkill)).toEqual([...READING_SUB_SKILLS, ...WRITING_SUB_SKILLS]);
  });

  it("refuses a library missing a written-expression article, since its items would link nowhere", () => {
    const result = parseLibrary(everyArticle().filter((a) => a.subSkill !== "agreement"));
    expect(result).toEqual({ ok: false, errors: ['(root): "agreement" has no article'] });
  });

  it("refuses a library missing a reading article, since its items would link nowhere too (D254)", () => {
    const result = parseLibrary(everyArticle().filter((a) => a.subSkill !== "inference"));
    expect(result).toEqual({ ok: false, errors: ['(root): "inference" has no article'] });
  });

  it("refuses an oral sub-skill, which has no items to link from", () => {
    const result = parseLibrary([...everyArticle(), anArticle("fluency-and-hesitation")]);
    expect(!result.ok && result.errors[0]).toMatch(new RegExp(`^${String(LIBRARY_SUB_SKILLS.length)}\\.subSkill: `, "u"));
  });

  it("refuses two articles for one sub-skill", () => {
    const result = parseLibrary([...everyArticle(), anArticle("agreement")]);
    expect(result).toEqual({ ok: false, errors: [`${String(LIBRARY_SUB_SKILLS.length)}.subSkill: "agreement" has two articles`] });
  });

  it("refuses an article related to itself", () => {
    const articles = everyArticle().map((a) => (a.subSkill === "pronouns" ? { ...a, related: ["agreement", "pronouns"] } : a));
    expect(parseLibrary(articles)).toEqual({ ok: false, errors: [`${indexOf("pronouns")}.related.1: an article cannot relate to itself`] });
  });

  it("refuses a related article from the other skill, since the page would read as one list (D254)", () => {
    const reading = everyArticle().map((a) => (a.subSkill === "inference" ? { ...a, related: ["main-idea", "agreement"] } : a));
    const fromReading = parseLibrary(reading);
    expect(!fromReading.ok && fromReading.errors).toEqual([expect.stringMatching(new RegExp(`^${indexOf("inference")}\\.related\\.1: `, "u"))]);
    const writing = everyArticle().map((a) => (a.subSkill === "agreement" ? { ...a, related: ["inference"] } : a));
    const fromWriting = parseLibrary(writing);
    expect(!fromWriting.ok && fromWriting.errors).toEqual([expect.stringMatching(new RegExp(`^${indexOf("agreement")}\\.related\\.0: `, "u"))]);
  });

  it("refuses a reading article with a sentence to write, and a writing article with an excerpt (D254)", () => {
    const sentence = { write: "Les dossiers sont prêts.", why: { en: "Plural.", fr: "Pluriel." } };
    const reading = parseLibrary(everyArticle().map((a) => (a.subSkill === "inference" ? { ...a, examples: [sentence] } : a)));
    expect(!reading.ok && reading.errors.some((e) => e.startsWith(`${indexOf("inference")}.examples.0`))).toBe(true);
    const excerpt = { excerpt: "Le comité se réunira jeudi.", why: { en: "When.", fr: "Quand." } };
    const writing = parseLibrary(everyArticle().map((a) => (a.subSkill === "agreement" ? { ...a, examples: [excerpt] } : a)));
    expect(!writing.ok && writing.errors.some((e) => e.startsWith(`${indexOf("agreement")}.examples.0`))).toBe(true);
  });

  it("refuses an unpaired cited-text marker, wherever the prose is, since it would italicise the rest", () => {
    const withMarks = (subSkill: string, over: Record<string, unknown>) =>
      everyArticle().map((a) => (a.subSkill === subSkill ? anArticle(subSkill, over) : a));
    const at = indexOf("agreement");
    expect(parseLibrary(withMarks("agreement", { summary: { en: "Make _les mots agree.", fr: "Faites _accorder_." } }))).toEqual({
      ok: false,
      errors: [`${at}.summary.en: an unpaired "_"`],
    });
    const section = { heading: { en: "h", fr: "h" }, paragraphs: [{ en: "ok", fr: "_un_ et _deux" }] };
    expect(parseLibrary(withMarks("agreement", { sections: [section] }))).toEqual({
      ok: false,
      errors: [`${at}.sections.0.paragraphs.0.fr: an unpaired "_"`],
    });
    const example = { write: "Oui.", why: { en: "Because _oui", fr: "Parce que." } };
    expect(parseLibrary(withMarks("agreement", { examples: [example] }))).toEqual({
      ok: false,
      errors: [`${at}.examples.0.why.en: an unpaired "_"`],
    });
    const excerpt = { excerpt: "Le comité se réunira.", why: { en: "Ok.", fr: "Le mot _réunira." } };
    expect(parseLibrary(withMarks("inference", { examples: [excerpt] }))).toEqual({
      ok: false,
      errors: [`${indexOf("inference")}.examples.0.why.fr: an unpaired "_"`],
    });
    expect(parseLibrary(withMarks("agreement", { summary: { en: "Make _les mots_ agree.", fr: "Faites _accorder_." } })).ok).toBe(true);
  });

  it("names the path of a schema problem, and the root when the library is not an array", () => {
    const bad = parseLibrary([anArticle("main-idea", { examples: [] }), ...everyArticle().slice(1)]);
    expect(!bad.ok && bad.errors[0]).toMatch(/^0\.examples: /u);
    const notArray = parseLibrary({ articles: [] });
    expect(!notArray.ok && notArray.errors[0]).toMatch(/^\(root\): /u);
  });

  it("throws with every problem listed, for the app, where a bad library is a build defect", () => {
    expect(parseLibraryOrThrow(everyArticle())).toHaveLength(LIBRARY_SUB_SKILLS.length);
    expect(() => parseLibraryOrThrow([])).toThrow(/The library is not valid:\n {2}\(root\): "main-idea" has no article/u);
  });
});
