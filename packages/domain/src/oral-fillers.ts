import * as z from "zod";

import { oralFillersSchema } from "./schemas/content.js";
import type { Lang } from "./skills.js";

/**
 * Parses an **already-read** filler list, the way `parseWritingPrompts` parses the
 * prompt library: no I/O here, the composition root imports the JSON (progress.md
 * D123). A list per language, each entry once, whatever its case, since the fluency
 * metrics match without regard to case and a repeat would count one word twice.
 */

export type OralFillers = Readonly<Record<Lang, readonly string[]>>;

export type OralFillersParseResult =
  | { readonly ok: true; readonly fillers: OralFillers }
  | { readonly ok: false; readonly errors: readonly string[] };

const fillersSchema = oralFillersSchema.superRefine((fillers, ctx) => {
  for (const [lang, list] of Object.entries(fillers)) {
    const seen = new Set<string>();
    for (const [index, filler] of list.entries()) {
      const key = filler.trim().toLocaleLowerCase(lang);
      if (seen.has(key)) {
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
