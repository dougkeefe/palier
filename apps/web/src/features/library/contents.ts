/**
 * An article's "On this page" (D256): its sections in order, then its examples, then "Read next"
 * when it has related articles. The ids are made here and nowhere else, so the contents' links
 * and the headings they point at cannot drift apart.
 */
export type ContentsEntry =
  | { readonly kind: "section"; readonly index: number; readonly id: string }
  | { readonly kind: "examples"; readonly id: string }
  | { readonly kind: "read-next"; readonly id: string };

/** The id of an article's section, by its place in the article. */
export const sectionId = (index: number): string => `section-${index + 1}`;

export const EXAMPLES_ID = "examples";
export const READ_NEXT_ID = "read-next";

export const contentsOf = (article: {
  readonly sections: readonly unknown[];
  readonly related?: readonly string[] | undefined;
}): readonly ContentsEntry[] => [
  ...article.sections.map((_, index) => ({ kind: "section" as const, index, id: sectionId(index) })),
  { kind: "examples", id: EXAMPLES_ID },
  ...((article.related ?? []).length === 0 ? [] : [{ kind: "read-next" as const, id: READ_NEXT_ID }]),
];
