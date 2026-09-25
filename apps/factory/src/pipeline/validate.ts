import {
  OPTION_IDS,
  bandRank,
  examFormSchema,
  itemSchema,
  itemTypeDefinition,
  orderedCuts,
} from "@palier/domain";
import type { ExamForm, ExamProfile, Item, OptionId } from "@palier/domain";

import { canonicalStringify } from "../lib/json.js";
import { estimateBand, normaliseStem, tokenJaccard } from "../lib/text.js";

/**
 * Stage 5 — deterministic validation (content-factory.md §4.5). No model. Schema
 * conformance, the registry's per-type checks, both-locale rationale/explanation
 * (the schema enforces those), sub-skill in the profile taxonomy, the answer not
 * leaked in the stem, a rationale that does not contradict its distractor,
 * reading level consistent with the band, near-duplicate detection across the
 * whole bank, key-position distribution against uniform, and every exam form
 * resolving its item ids at the exact counts its variant requires.
 */

export const NEAR_DUPLICATE_THRESHOLD = 0.7;

/** Distractor rationales that assert the distractor is correct — a contradiction. */
const AFFIRMATION = /\b(correct|bonne r[ée]ponse|la bonne|the answer|is right)\b/i;

export type ItemRejection = { readonly itemId: string; readonly reasons: readonly string[] };
export type NearDuplicate = { readonly a: string; readonly b: string; readonly similarity: number };

export type ValidationReport = {
  readonly valid: readonly Item[];
  readonly rejected: readonly ItemRejection[];
  readonly nearDuplicates: readonly NearDuplicate[];
  readonly keyDistribution: Readonly<Record<OptionId, number>>;
  readonly keyDistributionOk: boolean;
  readonly formIssues: readonly string[];
};

export const perItemReasons = (item: Item, profile: ExamProfile): string[] => {
  const reasons: string[] = [];

  const parsed = itemSchema.safeParse(item);
  if (!parsed.success) reasons.push(`schema: ${parsed.error.issues.map((i) => i.message).join("; ")}`);

  for (const issue of itemTypeDefinition(item.type).validate(item)) {
    reasons.push(`${issue.code}: ${issue.message}`);
  }

  const texts = item.options.map((o) => o.text.toLowerCase().trim());
  if (new Set(texts).size !== texts.length) reasons.push("two options share the same text");

  const taxonomy = profile.subSkills[item.skill];
  if (!taxonomy.includes(item.subSkill)) {
    reasons.push(`sub-skill "${item.subSkill}" is not in the profile taxonomy for ${item.skill}`);
  }

  const keyOption = item.options.find((o) => o.id === item.key);
  const stem = normaliseStem(item.stem[item.lang]);
  if (keyOption && stem.includes(normaliseStem(keyOption.text))) {
    reasons.push("the answer text appears in the stem (answer leaked)");
  }

  for (const option of item.options) {
    if (option.id !== item.key && (AFFIRMATION.test(option.rationale.fr) || AFFIRMATION.test(option.rationale.en))) {
      reasons.push(`distractor "${option.id}" rationale asserts it is correct (contradiction)`);
    }
  }

  if (Math.abs(bandRank(estimateBand(item.stem[item.lang])) - bandRank(item.targetBand)) > 1) {
    reasons.push(`reading level is more than one band from the tag ${item.targetBand}`);
  }

  return reasons;
};

const checkKeyDistribution = (
  items: readonly Item[],
): { distribution: Record<OptionId, number>; ok: boolean } => {
  const distribution: Record<OptionId, number> = { a: 0, b: 0, c: 0, d: 0 };
  for (const item of items) distribution[item.key]++;
  const n = items.length;
  if (n < OPTION_IDS.length) return { distribution, ok: true };
  // Catch a stuck key without over-fitting a small batch: every position must be
  // used, and none may dominate more than 60% of the bank. A whole-bank run
  // (500–700 items) would tighten this to a chi-square against uniform.
  const ok = OPTION_IDS.every((id) => distribution[id] >= 1) && Math.max(...OPTION_IDS.map((id) => distribution[id])) <= n * 0.6;
  return { distribution, ok };
};

/**
 * Every form must be the exact shape of a profile variant (content-factory.md §4.5):
 * a variant that exists, its item and pilot counts, its time limit and its cut
 * table, every item present in the bank at the form's skill and language, and the
 * domain schema's own rules (no item twice, pilots drawn from the form, a cut table
 * topping out at the scored count). A form is immutable once published, so a
 * mistake here is a mistake in every result scored against it.
 */
export const checkForms = (
  forms: readonly ExamForm[],
  items: readonly Item[],
  profile: ExamProfile,
): string[] => {
  const issues: string[] = [];
  const byId = new Map(items.map((i) => [i.id, i]));
  for (const form of forms) {
    const parsed = examFormSchema.safeParse(form);
    if (!parsed.success) {
      issues.push(`form ${form.id} fails the schema: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
    }
    for (const itemIdRef of form.itemIds) {
      const item = byId.get(itemIdRef);
      if (!item) issues.push(`form ${form.id} references missing item ${itemIdRef}`);
      else if (item.skill !== form.skill || item.lang !== form.lang) {
        issues.push(`form ${form.id} is ${form.skill}/${form.lang} but item ${itemIdRef} is ${item.skill}/${item.lang}`);
      }
    }
    const variantKey = `${form.skill}-${form.mode}`;
    const variant = profile.variants[variantKey];
    if (!variant) {
      issues.push(`form ${form.id} matches no profile variant (${variantKey})`);
      continue;
    }
    if (form.itemIds.length !== variant.items) {
      issues.push(`form ${form.id} has ${String(form.itemIds.length)} items, variant ${variantKey} requires ${String(variant.items)}`);
    }
    const pilots = variant.items - variant.scored;
    if (form.pilotItemIds.length !== pilots) {
      issues.push(`form ${form.id} has ${String(form.pilotItemIds.length)} pilot items, variant ${variantKey} requires ${String(pilots)}`);
    }
    if (form.timeLimitMinutes !== variant.minutes) {
      issues.push(`form ${form.id} allows ${String(form.timeLimitMinutes)} minutes, variant ${variantKey} allows ${String(variant.minutes)}`);
    }
    if (canonicalStringify(form.bandCuts) !== canonicalStringify(orderedCuts(variant))) {
      issues.push(`form ${form.id} carries cuts that differ from variant ${variantKey}'s`);
    }
  }
  return issues;
};

export const validateBank = (
  items: readonly Item[],
  forms: readonly ExamForm[],
  profile: ExamProfile,
): ValidationReport => {
  const valid: Item[] = [];
  const rejected: ItemRejection[] = [];
  const nearDuplicates: NearDuplicate[] = [];
  const acceptedStems: { id: string; stem: string }[] = [];

  for (const item of items) {
    const reasons = perItemReasons(item, profile);

    const stem = normaliseStem(item.stem.fr);
    for (const prior of acceptedStems) {
      const similarity = tokenJaccard(stem, prior.stem);
      if (similarity >= NEAR_DUPLICATE_THRESHOLD) {
        reasons.push(`near-duplicate of ${prior.id} (similarity ${similarity.toFixed(2)})`);
        nearDuplicates.push({ a: item.id, b: prior.id, similarity });
        break;
      }
    }

    if (reasons.length > 0) {
      rejected.push({ itemId: item.id, reasons });
    } else {
      valid.push(item);
      acceptedStems.push({ id: item.id, stem });
    }
  }

  const { distribution, ok } = checkKeyDistribution(valid);
  return {
    valid,
    rejected,
    nearDuplicates,
    keyDistribution: distribution,
    keyDistributionOk: ok,
    formIssues: checkForms(forms, valid, profile),
  };
};
