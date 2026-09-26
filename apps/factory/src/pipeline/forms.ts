import { bandRank, examFormSchema, formId, orderedCuts } from "@palier/domain";
import type { ExamForm, ExamProfile, ExamVariant, Item, Lang } from "@palier/domain";

import { mulberry32 } from "../lib/assemble.js";
import { hashNum } from "../lib/scripted-key.js";

/**
 * Form generation (content-factory.md §2, architecture.md §5.4): one fixed form per
 * profile variant, built from the published items. Every number comes from the
 * variant (ADR 9): its item count, its pilot count (`items − scored`), its time
 * limit and its cut table, which the form copies so a later profile change never
 * rescores an old result.
 *
 * The draw is stratified, so a form spreads over the sub-skill taxonomy and the
 * bands rather than taking whatever sorts first. Pilots are drawn like any other
 * item and sit at evenly spaced positions, so they are not simply the leftovers and
 * a candidate cannot spot them by place. Deterministic for a seed; a bank that
 * cannot fill a variant throws rather than shipping a short form.
 */

export type FormStageInput = {
  readonly items: readonly Item[];
  readonly profile: ExamProfile;
  readonly lang: Lang;
  readonly bankVersion: number;
  readonly seed: number;
};

export class FormShortfallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormShortfallError";
  }
}

/**
 * The form's id. It carries the bank version, so a later bank never reissues an id
 * with different items: an exam run is rescored from its form (ADR 16), and forms
 * are immutable once published (D82). Filename-safe, because the bank build writes
 * `forms/<id>.json`.
 */
export const formIdFor = (lang: Lang, variantName: string, bankVersion: number) =>
  formId(`${lang}-${variantName}-v${String(bankVersion)}`);

const shuffle = <T>(values: readonly T[], rng: () => number): T[] => {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
};

/** One sub-skill's items, shuffled within each band and then interleaved across bands. */
const interleaveBands = (items: readonly Item[], rng: () => number): Item[] => {
  const bands = [...new Set(items.map((i) => i.targetBand))].sort((a, b) => bandRank(a) - bandRank(b));
  const queues = bands.map((band) => shuffle(items.filter((i) => i.targetBand === band), rng));
  const out: Item[] = [];
  while (queues.some((q) => q.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next) out.push(next);
    }
  }
  return out;
};

/** Items on one passage sit together, in the order their passage was first drawn. */
const groupByPassage = (items: readonly Item[]): Item[] => {
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const key = item.passageId ?? `item:${item.id}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()].flat();
};

/** Evenly spaced positions for `pilots` pilots among `total` items. */
export const pilotPositions = (total: number, pilots: number): readonly number[] =>
  Array.from({ length: pilots }, (_, j) => Math.floor(((j + 0.5) * total) / pilots));

const assembleOne = (name: string, variant: ExamVariant, input: FormStageInput): ExamForm => {
  const taxonomy = input.profile.subSkills[variant.skill];
  const pool = input.items
    // A retired item stays in the bank for the ids users hold, but never sits on a new form.
    .filter((i) => i.status !== "retired")
    .filter((i) => i.skill === variant.skill && i.lang === input.lang && taxonomy.includes(i.subSkill))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  if (pool.length < variant.items) {
    const bySubSkill = taxonomy
      .map((s) => `${s} ${String(pool.filter((i) => i.subSkill === s).length)}`)
      .join(", ");
    throw new FormShortfallError(
      `variant ${name} needs ${String(variant.items)} ${variant.skill} items in ${input.lang}, ` +
        `the bank has ${String(pool.length)} (${bySubSkill})`,
    );
  }

  const rng = mulberry32(hashNum(`${String(input.seed)}:${name}`));
  const queues = taxonomy.map((s) => interleaveBands(pool.filter((i) => i.subSkill === s), rng));
  const drawn: Item[] = [];
  while (drawn.length < variant.items) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next && drawn.length < variant.items) drawn.push(next);
    }
  }

  const itemIds = groupByPassage(drawn).map((i) => i.id);
  const pilotItemIds = pilotPositions(itemIds.length, variant.items - variant.scored).map((p) => itemIds[p]!);

  const form: ExamForm = {
    id: formIdFor(input.lang, name, input.bankVersion),
    skill: variant.skill,
    lang: input.lang,
    mode: variant.mode,
    itemIds,
    pilotItemIds,
    timeLimitMinutes: variant.minutes,
    bandCuts: orderedCuts(variant),
    version: input.bankVersion,
  };
  // The domain schema's own rules, checked before the form leaves the stage.
  examFormSchema.parse(form);
  return form;
};

export const assembleForms = (input: FormStageInput): readonly ExamForm[] =>
  Object.entries(input.profile.variants).map(([name, variant]) => assembleOne(name, variant, input));
