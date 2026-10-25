import type { LibraryArticle } from "@palier/domain";

/** A reader's pace, for the estimate on an article's card (D257). An estimate, and labelled as one. */
export const WORDS_PER_MINUTE = 200;

const wordsIn = (text: string): number => text.split(/\s+/u).filter((word) => word.length > 0).length;

/**
 * Roughly how long an article takes to read in one interface language: its summary, its sections'
 * prose and its examples, each example's sentences or excerpt with its explanation. Never under a
 * minute.
 */
export const readingMinutes = (article: LibraryArticle, lang: "en" | "fr"): number => {
  const examples = article.examples.flatMap((example) =>
    "excerpt" in example ? [example.excerpt, example.why[lang]] : [example.avoid ?? "", example.write, example.why[lang]],
  );
  const texts = [article.summary[lang], ...article.sections.flatMap((section) => section.paragraphs.map((p) => p[lang])), ...examples];
  const words = texts.reduce((sum, text) => sum + wordsIn(text), 0);
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
};
