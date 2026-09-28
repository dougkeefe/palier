import * as z from "zod";

import { oralFillersSchema } from "./schemas/content.js";
import type { Lang } from "./skills.js";

/**
 * Parses an **already-read** filler list, the way `parseWritingPrompts` parses the
 * prompt library: no I/O here, the composition root imports the JSON (progress.md
 * D123). A list per language, each entry once as the metrics read it (`spokenWords`:
 * whatever its case, spacing or apostrophe), since a repeat would count one word twice,
 * and each entry at least one word (D127).
 */

export type OralFillers = Readonly<Record<Lang, readonly string[]>>;

/** A word: letters or digits, joined by an apostrophe or a hyphen inside it ("j'ai", "sous-ministre"). */
const WORD = /[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu;

/**
 * The words of `text` as the fluency metrics count them (progress.md D123, D127): composed into
 * one form (NFC, so an accent written as two code points is one letter), every apostrophe straight,
 * lower case. Domain's, so the parser keys a filler exactly as the engine matches it.
 */
export const spokenWords = (text: string): readonly string[] =>
  text.normalize("NFC").replace(/[\u2018\u2019\u02BC]/gu, "'").toLowerCase().match(WORD) ?? [];

export type OralFillersParseResult =
  | { readonly ok: true; readonly fillers: OralFillers }
  | { readonly ok: false; readonly errors: readonly string[] };

const fillersSchema = oralFillersSchema.superRefine((fillers, ctx) => {
  for (const [lang, list] of Object.entries(fillers)) {
    const seen = new Set<string>();
    for (const [index, filler] of list.entries()) {
      const key = spokenWords(filler).join(" ");
      if (key === "") {
        ctx.addIssue({ code: "custom", path: [lang, index], message: `"${filler}" has no word in it` });
      } else if (seen.has(key)) {
        ctx.addIssue({ code: "custom", path: [lang, index], message: `"${filler}" is listed twice` });
      }
      seen.add(key);
    }
  }
});

const formatIssue = (issue: z.core.$ZodIssue): string => {
  const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
  return `${path}: ${issue.message}`;
};

export const parseOralFillers = (value: unknown): OralFillersParseResult => {
  const result = fillersSchema.safeParse(value);
  if (!result.success) return { ok: false, errors: result.error.issues.map(formatIssue) };
  return { ok: true, fillers: result.data };
};

/** The throwing form, for the composition root, where a bad list is a build defect. */
export const parseOralFillersOrThrow = (value: unknown): OralFillers => {
  const result = parseOralFillers(value);
  if (!result.ok) throw new Error(`The oral filler list is not valid:\n  ${result.errors.join("\n  ")}`);
  return result.fillers;
};
