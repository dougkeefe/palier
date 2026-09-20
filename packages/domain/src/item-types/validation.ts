import type { Item } from "../item.js";
import { OPTION_IDS } from "../skills.js";
import type { ValidationIssue } from "./definition.js";

/**
 * Deterministic content-quality checks, dispatched per type by the registry
 * (architecture.md §5.1, tier 9). These complement the Zod schema rather than
 * duplicate it: the schema is the parse boundary that fails on the first
 * structural error, `validate` reports every quality defect so the factory can
 * show them together. Each check is a named issue code so a test can name the
 * behaviour and the factory report can group by it.
 */

/** Checks that apply to every multiple-choice type. */
export const validateCommon = (item: Item): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  // The four options a, b, c, d must all be present. The schema constrains each
  // id to that set but never requires all four, so a three-option item parses.
  const present = new Set(item.options.map((o) => o.id));
  const complete = OPTION_IDS.every((id) => present.has(id)) && item.options.length === OPTION_IDS.length;
  if (!complete) {
    issues.push({
      code: "option-count",
      message: `An item must carry exactly the four options a, b, c, d; this one has ${String(item.options.length)}.`,
    });
  }

  if (!present.has(item.key)) {
    issues.push({
      code: "key-not-an-option",
      message: `The key is "${item.key}" but no option has that id, so the item has no correct answer.`,
      optionId: item.key,
    });
  }

  return issues;
};

/** A cloze item marks a blank in its stem, so `blankIndex` must be present. */
export const validateCloze = (item: Item): ValidationIssue[] => {
  const issues = validateCommon(item);
  if (item.blankIndex === undefined) {
    issues.push({
      code: "cloze-missing-blank",
      message: "A cloze item must name the position of its blank with blankIndex.",
    });
  }
  return issues;
};

/** A comprehension item asks about a passage, so `passageId` must be present. */
export const validateComprehension = (item: Item): ValidationIssue[] => {
  const issues = validateCommon(item);
  if (item.passageId === undefined) {
    issues.push({
      code: "comprehension-missing-passage",
      message: "A comprehension item must name the passage it asks about.",
    });
  }
  return issues;
};

/** Error-identification items carry no type-specific quality check beyond the shared set. */
export const validateErrorId = (item: Item): ValidationIssue[] => validateCommon(item);

/** Best-completion items carry no type-specific quality check beyond the shared set. */
export const validateBestCompletion = (item: Item): ValidationIssue[] => validateCommon(item);
