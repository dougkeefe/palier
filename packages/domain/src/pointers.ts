import * as z from "zod";

import { CITED_MARK } from "./library.js";
import type { Pointer } from "./pointer.js";
import { pointerSchema } from "./schemas/content.js";
import { READING_SUB_SKILLS, WRITING_SUB_SKILLS } from "./sub-skills.js";

/**
 * Parses **already-read** pointers, as `parseLibrary` parses the articles: no I/O here, the
 * composition root imports the JSON (progress.md D216). Ids are unique, every cited-text marker
 * is paired (an unpaired one would italicise the rest of the sentence, as in the library), and
 * **every reading and written-expression sub-skill has at least one pointer**, so Today always has
 * one to show for whatever the diagnostic says to work on.
 */

export type PointersParseResult =
  | { readonly ok: true; readonly pointers: readonly Pointer[] }
  | { readonly ok: false; readonly errors: readonly string[] };

const unpaired = (text: string): boolean => text.split(CITED_MARK).length % 2 === 0;

const pointersSchema = z.array(pointerSchema).superRefine((pointers, ctx) => {
  const ids = new Set<string>();
  const covered = new Set<string>();
  for (const [index, pointer] of pointers.entries()) {
    if (ids.has(pointer.id)) ctx.addIssue({ code: "custom", path: [index, "id"], message: `"${pointer.id}" is used twice` });
    ids.add(pointer.id);
    covered.add(pointer.subSkill);
    for (const locale of ["en", "fr"] as const) {
      if (unpaired(pointer.text[locale])) {
        ctx.addIssue({ code: "custom", path: [index, "text", locale], message: `an unpaired "${CITED_MARK}"` });
      }
    }
  }
  for (const subSkill of [...READING_SUB_SKILLS, ...WRITING_SUB_SKILLS]) {
    if (!covered.has(subSkill)) ctx.addIssue({ code: "custom", path: [], message: `"${subSkill}" has no pointer` });
  }
});

const formatIssue = (issue: z.core.$ZodIssue): string => {
  const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
  return `${path}: ${issue.message}`;
};

export const parsePointers = (value: unknown): PointersParseResult => {
  const result = pointersSchema.safeParse(value);
  if (!result.success) return { ok: false, errors: result.error.issues.map(formatIssue) };
  return { ok: true, pointers: result.data };
};

/** The throwing form, for the composition root, where bad pointers are a build defect. */
export const parsePointersOrThrow = (value: unknown): readonly Pointer[] => {
  const result = parsePointers(value);
  if (!result.ok) throw new Error(`The pointers are not valid:\n  ${result.errors.join("\n  ")}`);
  return result.pointers;
};
