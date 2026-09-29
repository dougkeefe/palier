import type * as z from "zod";

import type { Item } from "../item.js";
import type { ItemType, Lang, OptionId } from "../skills.js";
import type { SubSkill } from "../sub-skills.js";
import type { TargetBand } from "../bands.js";
import type { Topic } from "../topics.js";

/**
 * The item type registry (implementation-plan.md §3.4, ADR 17). One definition
 * per `ItemType`, so adding a type is registration, not modification of a switch
 * (principle 6). §3.4's literal bundles a React `render` into the definition,
 * which cannot live below `apps/web` (§3.1). ADR 17 splits it: the React-free
 * members live here, `render` lives as `itemRenderers` in `@palier/ui`, and the
 * composition root asserts the two maps cover the same union.
 *
 * "Five members plus the a11y contract": `schema`, `render`, `score`, `validate`
 * and `generatePrompt` are the five; `render` is the one that lives in
 * `@palier/ui`, so this definition carries four of them plus `a11yContract`.
 */
export type ItemTypeDefinition = {
  /**
   * Accepts a well-formed item **of this type** and rejects any other. Used by
   * CI and the content factory. Narrows the shared `itemSchema` to the type.
   * Typed as the general `z.ZodType` — as `CONTENT_SCHEMAS` is — because a
   * schema's inferred output uses plain-string ids, the brand being a
   * compile-time concern only (`schemas/primitives.ts`).
   */
  readonly schema: z.ZodType;
  /** Pure. The session engine calls `registry.get(item.type).score(...)`. */
  readonly score: (item: Item, response: ItemResponse) => Outcome;
  /** Deterministic content-quality checks the schema cannot express. */
  readonly validate: (item: Item) => ValidationIssue[];
  /** Used by the content factory (Phase 1) to draft an item of this type. */
  readonly generatePrompt: (ctx: PromptContext) => PromptSpec;
  /** Asserted by the a11y suite (tier 7); also drives the renderer's roles. */
  readonly a11yContract: A11yContract;
};

/**
 * What a user submitted for an item. Every current item type is single-key
 * multiple-choice, so this is an `OptionId`; it is named so it can widen to a
 * union when a non-MCQ type lands (progress.md deviation D28).
 */
export type ItemResponse = OptionId;

/** The result of scoring one response. Minimal on purpose: `Attempt` already
 * records `chosen` and `correct`, so the engine's Scorer wraps this. */
export type Outcome = {
  readonly correct: boolean;
};

export const ITEM_VALIDATION_CODES = [
  /** The item does not carry exactly the four options a, b, c, d. */
  "option-count",
  /** The key names an option id no option has, so the item has no answer. */
  "key-not-an-option",
  /** A cloze item has no `blankIndex`, so there is no blank to fill. */
  "cloze-missing-blank",
  /** A comprehension item names no passage, so there is nothing to comprehend. */
  "comprehension-missing-passage",
  /** A hand-authored item names no contributor, so it carries no attribution (content-factory.md §5). */
  "authored-without-contributor",
] as const;
export type ItemValidationCode = (typeof ITEM_VALIDATION_CODES)[number];

/**
 * A deterministic quality defect. Unlike a Zod parse error, `validate` reports
 * every issue rather than failing at the first, because the content factory
 * (Phase 1) surfaces them as a per-item report (architecture.md §5.1, tier 9).
 */
export type ValidationIssue = {
  readonly code: ItemValidationCode;
  readonly message: string;
  readonly optionId?: OptionId | undefined;
};

/** The a11y contract the renderer must honour, asserted by the a11y suite. */
export type A11yContract = {
  /** The container role: `radiogroup` for every multiple-choice type. */
  readonly role: "radiogroup";
  /** The role of each answer: `radio` for every multiple-choice type. */
  readonly optionRole: "radio";
  /** Whether this type is answered against a passage the renderer must show. */
  readonly requiresPassage: boolean;
};

/** What the factory hands `generatePrompt` to draft one item. */
export type PromptContext = {
  readonly targetBand: TargetBand;
  readonly subSkill: SubSkill;
  readonly topic: Topic;
  readonly lang: Lang;
};

/**
 * The drafting instruction `generatePrompt` produces. Minimal until the content
 * factory lands (Phase 1), which owns its full shape (progress.md deviation
 * D29, mirroring D19).
 */
export type PromptSpec = {
  readonly itemType: ItemType;
  readonly targetBand: TargetBand;
  readonly subSkill: SubSkill;
  readonly instructions: string;
};
