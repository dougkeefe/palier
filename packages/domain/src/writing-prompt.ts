import type { Localised } from "./localised.js";
import type { Lang } from "./skills.js";

/**
 * The kinds of Government of Canada work writing a workshop prompt asks for
 * (product-requirements.md §8.7). Content taxonomy, like `DOC_TYPES`, and not an
 * exam rule: the written test itself is multiple choice, which is why the
 * workshop is marked as supplementary.
 */
export const WRITING_REGISTERS = ["briefing-note", "client-reply", "meeting-summary"] as const;
export type WritingRegister = (typeof WRITING_REGISTERS)[number];

/**
 * One writing-workshop prompt, a content artefact published under
 * `@palier/content/writing/prompts.json` (progress.md D107). `task` is in the
 * language being practised (`lang`), as a bank item's stem is; `title` is in
 * both, so the picker reads in the interface language. The word target and the
 * suggested time guide the writer and are never enforced.
 */
export type WritingPrompt = {
  readonly id: string;
  readonly lang: Lang;
  readonly register: WritingRegister;
  readonly title: Localised;
  readonly task: string;
  readonly wordTarget: number;
  readonly suggestedMinutes: number;
};
