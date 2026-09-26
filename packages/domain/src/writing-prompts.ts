import * as z from "zod";

import { writingPromptSchema } from "./schemas/content.js";
import type { WritingPrompt } from "./writing-prompt.js";

/**
 * Parses an **already-read** prompt library, the way `parseExamProfile` parses
 * the profile: no I/O here, the composition root imports the JSON (progress.md
 * D107). The library is an array of `WritingPrompt`s with at least one entry and
 * no repeated id, since a submission names its prompt by id.
 */

export type WritingPromptsParseResult =
  | { readonly ok: true; readonly prompts: readonly WritingPrompt[] }
  | { readonly ok: false; readonly errors: readonly string[] };

const librarySchema = z
  .array(writingPromptSchema)
  .min(1)
  .superRefine((prompts, ctx) => {
    const seen = new Set<string>();
    for (const [index, prompt] of prompts.entries()) {
      if (seen.has(prompt.id)) {
        ctx.addIssue({
          code: "custom",
          path: [index, "id"],
          message: `the id "${prompt.id}" is used twice`,
        });
      }
      seen.add(prompt.id);
    }
  });

const formatIssue = (issue: z.core.$ZodIssue): string => {
  const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
  return `${path}: ${issue.message}`;
};

export const parseWritingPrompts = (value: unknown): WritingPromptsParseResult => {
  const result = librarySchema.safeParse(value);
  if (!result.success) return { ok: false, errors: result.error.issues.map(formatIssue) };
  return { ok: true, prompts: result.data as readonly WritingPrompt[] };
};

/** The throwing form, for the composition root, where a bad library is a build defect. */
export const parseWritingPromptsOrThrow = (value: unknown): readonly WritingPrompt[] => {
  const result = parseWritingPrompts(value);
  if (!result.ok) {
    throw new Error(`The writing prompt library is not valid:\n  ${result.errors.join("\n  ")}`);
  }
  return result.prompts;
};
