import type { LibraryArticle } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { WORDS_PER_MINUTE, readingMinutes } from "./reading-time";

const words = (count: number): string => Array.from({ length: count }, () => "mot").join(" ");
const both = (text: string) => ({ en: text, fr: text });

const anArticle = (paragraphWords: number, examples: LibraryArticle["examples"]): LibraryArticle =>
  ({
    subSkill: "agreement",
    lang: "fr",
    topic: "grammar",
    title: both("Agreement"),
    summary: both(words(10)),
    sections: [{ heading: both("The rule"), paragraphs: [both(words(paragraphWords))] }],
    examples,
  }) as LibraryArticle;

describe("an article's reading time (D257)", () => {
  it("counts the summary, the prose and the examples at the reading pace, rounded", () => {
    const article = anArticle(2 * WORDS_PER_MINUTE - 10 - 15, [{ avoid: words(5), write: words(5), why: both(words(5)) }]);
    expect(readingMinutes(article, "en")).toBe(2);
  });

  it("counts a reading article's excerpts and what to notice in them", () => {
    const article = anArticle(WORDS_PER_MINUTE, [{ excerpt: words(WORDS_PER_MINUTE), why: both(words(100)) }] as unknown as LibraryArticle["examples"]);
    expect(readingMinutes(article, "fr")).toBe(Math.round((10 + WORDS_PER_MINUTE * 2 + 100) / WORDS_PER_MINUTE));
  });

  it("counts the interface language's prose only", () => {
    const article = anArticle(0, [{ write: "Écrivez.", why: both("") }]);
    const long = { ...article, summary: { en: words(10), fr: words(5 * WORDS_PER_MINUTE) } } as LibraryArticle;
    expect(readingMinutes(long, "en")).toBe(1);
    expect(readingMinutes(long, "fr")).toBe(5);
  });

  it("never says under a minute", () => {
    expect(readingMinutes(anArticle(0, [{ write: "Oui.", why: both("") }]), "en")).toBe(1);
  });
});
