import { CITED_MARK } from "@palier/domain";

/**
 * A library paragraph split into plain and cited runs (progress.md D162): `_like this_` marks a
 * word or phrase in the article's language, quoted inside interface-language prose. The page
 * renders a cited run in italics with the article's `lang`, so a screen reader reads a French
 * word in French. The parser has already refused an unpaired marker.
 */
export type Run = { readonly text: string; readonly cited: boolean };

export const citedRuns = (text: string): readonly Run[] =>
  text
    .split(CITED_MARK)
    .map((part, index) => ({ text: part, cited: index % 2 === 1 }))
    .filter((run) => run.text !== "");
