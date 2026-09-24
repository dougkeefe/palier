import type { JSX } from "react";

export type PassageProps = {
  readonly title: string;
  /**
   * The bank's passage body: Markdown, light formatting only. Paragraphs (blank-line
   * separated) are honoured; inline emphasis is shown as written, since no markdown
   * dependency is warranted for it yet.
   */
  readonly body: string;
  /** The passage's language, so a screen reader pronounces it correctly (§11). */
  readonly lang: string;
  /** Accessible name for the region, through i18n (e.g. "Reading passage"). */
  readonly label: string;
};

/**
 * A reading passage set as a document, not app chrome (product-requirements.md §8.3,
 * §10.3): a serif face at a comfortable measure. It is a labelled region so a screen
 * reader user can move between it and the question.
 */
export const Passage = ({ title, body, lang, label }: PassageProps): JSX.Element => (
  <section className="pl-passage" aria-label={label} lang={lang}>
    <h2 className="pl-passage__title">{title}</h2>
    {body
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0)
      .map((paragraph, index) => (
        <p key={index} className="pl-passage__paragraph">
          {paragraph}
        </p>
      ))}
  </section>
);
