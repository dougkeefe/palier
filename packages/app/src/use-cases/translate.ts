import type { Lang, Translation } from "@palier/domain";

import { type MeteredAiDeps, withAiProvider } from "./api-key.js";

/**
 * The translator (progress.md D248), a writing aid beside the workshop. English comes back as
 * French for the federal public service; the user's own French comes back corrected, with what it
 * did well and why each correction was made. **Nothing is stored**: the text goes to the user's
 * provider and nowhere else [R12], and the answer lives on the screen, so there is no store, no
 * sync and nothing to export or wipe. The one call is metered as `translation`.
 */

/**
 * The longest text one call takes, in characters: about a page, which is what a learner checks at
 * once and what keeps one call's cost near its estimate. A product limit, not an exam rule (ADR 9).
 */
export const MAX_TRANSLATION_CHARS = 4_000;

export type TranslateRequest = {
  readonly text: string;
  /** The language the user says the text is in; `null` lets the model tell. */
  readonly source: Lang | null;
  /** The language the result is always in: the language practised. */
  readonly target: Lang;
  /** The interface language, which the explanations are written in. */
  readonly feedbackLang: Lang;
};

/** There is nothing to translate: the text is empty or only whitespace. */
export class EmptyTranslationError extends Error {
  override name = "EmptyTranslationError";
  constructor() {
    super("There is no text to translate.");
  }
}

/** The text is longer than one call takes. */
export class TranslationTooLongError extends Error {
  override name = "TranslationTooLongError";
  readonly length: number;
  constructor(length: number) {
    super(`The text is ${String(length)} characters; at most ${String(MAX_TRANSLATION_CHARS)} can be sent at once.`);
    this.length = length;
  }
}

/**
 * Translate, or correct and explain, one text. An empty or over-long text is refused **before any
 * request**, so it costs nothing. The text is sent as written, since a correction's offsets point
 * into exactly what the user typed.
 */
export const translateText = async (request: TranslateRequest, deps: MeteredAiDeps): Promise<Translation> => {
  if (request.text.trim() === "") throw new EmptyTranslationError();
  if (request.text.length > MAX_TRANSLATION_CHARS) throw new TranslationTooLongError(request.text.length);
  return withAiProvider(deps, "translation", (ai) =>
    ai.translate({
      text: request.text,
      source: request.source,
      target: request.target,
      feedbackLang: request.feedbackLang,
    }),
  );
};
