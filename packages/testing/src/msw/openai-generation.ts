import type { OpenAiCompletion } from "./openai-handlers.js";

/**
 * Scripted completions for runtime item generation (progress.md D110), for `openAiHandlers`.
 * The draft answers the request it was sent: the item type, sub-skill, band and topic it
 * asked for, `count` of them. The reviewer is honest: it finds the option whose text starts
 * with "RIGHT" wherever the use case moved the key to, so a test does not need to know the
 * shuffle. `marker` goes into every stem, so a test can follow the items across the wire.
 */

const field = (prompt: string, pattern: RegExp, fallback: string): string => pattern.exec(prompt)?.[1] ?? fallback;

/** The drafts a generation prompt asked for, each carrying `marker`. */
export const draftsFor = (prompt: string, marker: string) => {
  const type = field(prompt, /of type "([a-z-]+)"/, "error-id");
  const subSkill = field(prompt, /sub-skill "([a-z-]+)"/, "agreement");
  const band = field(prompt, /band ([ABC])\b/, "C");
  const topic = field(prompt, /topic "([a-z-]+)"/, "finance-and-budgets");
  const count = Number(field(prompt, /Produce (\d+) item/, "1"));
  return {
    items: Array.from({ length: count }, (_, i) => ({
      type,
      stem: { en: `Choose the right form (${i + 1}).`, fr: `Choisissez la bonne forme (${i + 1}) : ${marker}.` },
      ...(type === "cloze" ? { blankIndex: 0 } : {}),
      options: [
        { id: "a", text: `RIGHT ${i + 1}`, rationale: { en: "It agrees.", fr: "Il s'accorde." } },
        { id: "b", text: `wrong ${i + 1} b`, rationale: { en: "It does not agree.", fr: "Il ne s'accorde pas." } },
        { id: "c", text: `wrong ${i + 1} c`, rationale: { en: "Wrong mood.", fr: "Mauvais mode." } },
        { id: "d", text: `wrong ${i + 1} d`, rationale: { en: "Wrong tense.", fr: "Mauvais temps." } },
      ],
      key: "a",
      explanation: { en: "The participle agrees with the subject.", fr: "Le participe s'accorde avec le sujet." },
      subSkill,
      targetBand: band,
      topic,
    })),
  };
};

/** An honest verdict on a review prompt: it chooses the RIGHT option, confidently, at the asked band. */
export const verdictFor = (prompt: string) => {
  const chosenKey = field(prompt, /^([abcd])\) RIGHT/m, "a");
  return {
    chosenKey,
    confidence: 0.93,
    defensibleDistractors: [],
    optionCases: { a: "case a", b: "case b", c: "case c", d: "case d" },
    registerFlag: { flagged: false },
    estimatedBand: field(prompt, /intended band ([ABC])/, "C"),
  };
};

/**
 * One draft completion then honest reviews, the last repeating: a whole set that passes.
 * The token counts are the Gate G run's (progress.md session log, 26 September 2026).
 */
export const generationCompletions = (marker = "GENERATED-MARKER"): readonly OpenAiCompletion[] => [
  { content: (prompt: string) => draftsFor(prompt, marker), usage: { prompt_tokens: 383, completion_tokens: 1262 } },
  { content: verdictFor, usage: { prompt_tokens: 293, completion_tokens: 598 } },
];
