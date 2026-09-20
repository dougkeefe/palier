import type { ItemType } from "../skills.js";
import type { A11yContract, ItemTypeDefinition } from "./definition.js";
import {
  generateBestCompletionPrompt,
  generateClozePrompt,
  generateComprehensionPrompt,
  generateErrorIdPrompt,
} from "./prompts.js";
import {
  bestCompletionSchema,
  clozeSchema,
  comprehensionSchema,
  errorIdSchema,
} from "./schemas.js";
import { scoreMcq } from "./scoring.js";
import {
  validateBestCompletion,
  validateCloze,
  validateComprehension,
  validateErrorId,
} from "./validation.js";

/** Every multiple-choice type presents as a radio group of radios. */
const mcqA11y: A11yContract = { role: "radiogroup", optionRole: "radio", requiresPassage: false };

/**
 * The item type registry (implementation-plan.md §3.4, ADR 17). A
 * `Record<ItemType, …>` rather than an imperative `registerItemType(…)`: keying
 * on the union makes adding an `ItemType` a **compile error** until every member
 * has an entry, which serves principle 6 ("registration, not modification, no
 * switch gains a case") more strongly than a runtime register call would. The
 * parallel `render` member lives in `@palier/ui` as `itemRenderers`; the
 * composition root asserts the two maps cover the same union.
 */
export const ITEM_TYPE_DEFINITIONS: Record<ItemType, ItemTypeDefinition> = {
  cloze: {
    schema: clozeSchema,
    score: scoreMcq,
    validate: validateCloze,
    generatePrompt: generateClozePrompt,
    a11yContract: mcqA11y,
  },
  comprehension: {
    schema: comprehensionSchema,
    score: scoreMcq,
    validate: validateComprehension,
    generatePrompt: generateComprehensionPrompt,
    a11yContract: { ...mcqA11y, requiresPassage: true },
  },
  "error-id": {
    schema: errorIdSchema,
    score: scoreMcq,
    validate: validateErrorId,
    generatePrompt: generateErrorIdPrompt,
    a11yContract: mcqA11y,
  },
  "best-completion": {
    schema: bestCompletionSchema,
    score: scoreMcq,
    validate: validateBestCompletion,
    generatePrompt: generateBestCompletionPrompt,
    a11yContract: mcqA11y,
  },
};

/** The definition for one item type. The session engine's only entry point. */
export const itemTypeDefinition = (type: ItemType): ItemTypeDefinition =>
  ITEM_TYPE_DEFINITIONS[type];
