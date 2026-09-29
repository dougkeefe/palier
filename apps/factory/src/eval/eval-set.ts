import type { AiProvider } from "@palier/adapters/openai";
import { OPTION_IDS, gateReasons, itemId, reviewRequestFor } from "@palier/domain";
import type { ExamProfile, Item, ItemOption, OptionId, SubSkill, TargetBand } from "@palier/domain";

import { correctIndex } from "../lib/scripted-key.js";
import { perItemReasons } from "../pipeline/validate.js";

/**
 * The review-gate evaluation set (content-factory.md §6, ADR 19). Forty to sixty
 * items carrying deliberate defects across five classes, authored programmatically
 * *as test fixtures* — a broken item is a fixture, not expert bank content, so
 * this stays compatible with an automated phase. It is the only direct measure of
 * whether the gate works. Detection = the combined automated gate (stage-4 review
 * OR stage-5 deterministic validation) rejects the item. A clean baseline item
 * passes the same gate, so a high detection rate is a real signal, not the
 * scripted reviewer trivially rejecting everything.
 */

export const DEFECT_CLASSES = [
  "two-defensible-keys",
  "contradictory-rationale",
  "france-register",
  "mis-tagged-band",
  "leaked-answer",
] as const;
export type DefectClass = (typeof DEFECT_CLASSES)[number];

export type EvalItem = { readonly defect: DefectClass; readonly item: Item };

/** The handle the eval set's fixtures are credited to: the project's own, not a person's. */
export const EVAL_CONTRIBUTOR = "palier-eval";

const LONG2 = "administration coordination";

/** A band-B stem: two long words among ~11, so `estimateBand` returns B. */
const bandBStem = (i: number): string =>
  `${LONG2} le bureau ouvre numero ${String(i)} avec un suivi clair`;

/** An all-short stem: `estimateBand` returns A regardless of the tag. */
const simpleStem = (i: number): string => `le bureau ouvre a neuf ${String(i)} avec les gens du jour`;

const baseOptions = (keyIdx: number): ItemOption[] =>
  OPTION_IDS.map((id, idx) => ({
    id,
    // The correct option carries the scripted provider's marker so its reviewer
    // finds it (see lib/scripted-key.ts CORRECT_MARKER).
    text: idx === keyIdx ? `bonne réponse ${String(idx)}` : `distracteur ${String(idx)}`,
    rationale: { fr: `parce que ${id}`, en: `because ${id}` },
  }));

const makeItem = (
  stemFr: string,
  options: ItemOption[],
  key: OptionId,
  targetBand: TargetBand,
  subSkill: SubSkill,
  tag: string,
): Item => ({
  id: itemId(`eval-${tag}`),
  version: 1,
  skill: "writing",
  lang: "fr",
  type: "cloze",
  stem: { fr: stemFr, en: `EN ${stemFr}` },
  blankIndex: 0,
  options,
  key,
  explanation: { fr: "la regle", en: "the rule" },
  subSkill,
  targetBand,
  topic: "human-resources",
  tags: ["eval", tag],
  // Authored, by the project, as fixtures, so credited the way every authored item must be
  // (content-factory.md §5). Without a contributor, validate() would flag every one of them
  // as uncredited: each defect would be "detected" for that reason, not its own, and the clean
  // control would fail, so the eval would measure nothing.
  provenance: { origin: "authored", contributor: EVAL_CONTRIBUTOR },
  status: "draft",
  createdAt: "2026-09-21T00:00:00.000Z",
  updatedAt: "2026-09-21T00:00:00.000Z",
});

const buildDefect = (defect: DefectClass, i: number): Item => {
  const tag = `${defect}-${String(i)}`;
  const subSkill: SubSkill = "agreement";

  if (defect === "mis-tagged-band") {
    const stemFr = simpleStem(i);
    const keyIdx = correctIndex(stemFr);
    // Tagged C, but the text is trivially simple — a two-band mismatch.
    return makeItem(stemFr, baseOptions(keyIdx), OPTION_IDS[keyIdx]!, "C", subSkill, tag);
  }

  if (defect === "leaked-answer") {
    const token = `motfuite${String(i)}`;
    const stemFr = `${bandBStem(i)} ${token}`;
    const keyIdx = correctIndex(stemFr);
    const options = baseOptions(keyIdx);
    options[keyIdx] = { ...options[keyIdx]!, text: token }; // the answer sits in the stem
    return makeItem(stemFr, options, OPTION_IDS[keyIdx]!, "B", subSkill, tag);
  }

  const stemFr = bandBStem(i);
  const keyIdx = correctIndex(stemFr);
  const key = OPTION_IDS[keyIdx]!;
  const options = baseOptions(keyIdx);

  if (defect === "two-defensible-keys") {
    const twin = (keyIdx + 1) % 4;
    options[twin] = { ...options[twin]!, text: options[keyIdx]!.text }; // a second correct answer
  } else if (defect === "contradictory-rationale") {
    const distractor = (keyIdx + 1) % 4;
    options[distractor] = {
      ...options[distractor]!,
      rationale: { fr: "c'est la bonne reponse", en: "this is the correct answer" },
    };
  } else {
    const distractor = (keyIdx + 2) % 4;
    options[distractor] = { ...options[distractor]!, text: "envoyez un mail" }; // France register
  }

  return makeItem(stemFr, options, key, "B", subSkill, tag);
};

/** A well-formed item that must pass the gate — the control that proves a high
 * detection rate is signal, not the reviewer rejecting everything. */
export const cleanControlItem = (): Item => {
  const stemFr = bandBStem(999);
  const keyIdx = correctIndex(stemFr);
  return makeItem(stemFr, baseOptions(keyIdx), OPTION_IDS[keyIdx]!, "B", "agreement", "clean-control");
};

export const buildEvalSet = (perClass = 10): readonly EvalItem[] =>
  DEFECT_CLASSES.flatMap((defect) =>
    Array.from({ length: perClass }, (_, i) => ({ defect, item: buildDefect(defect, i) })),
  );

export type ClassDetection = { readonly total: number; readonly detected: number; readonly rate: number };
export type DetectionReport = {
  readonly byClass: Readonly<Record<DefectClass, ClassDetection>>;
  readonly overallRate: number;
  readonly minClassRate: number;
};

export const runEvalDetection = async (
  evalItems: readonly EvalItem[],
  provider: AiProvider,
  profile: ExamProfile,
): Promise<DetectionReport> => {
  const tally: Record<DefectClass, { total: number; detected: number }> = {
    "two-defensible-keys": { total: 0, detected: 0 },
    "contradictory-rationale": { total: 0, detected: 0 },
    "france-register": { total: 0, detected: 0 },
    "mis-tagged-band": { total: 0, detected: 0 },
    "leaked-answer": { total: 0, detected: 0 },
  };

  for (const { defect, item } of evalItems) {
    const verdict = await provider.reviewItem(reviewRequestFor(item));
    const detected =
      gateReasons(item, verdict).length > 0 || perItemReasons(item, profile).length > 0;
    tally[defect].total++;
    if (detected) tally[defect].detected++;
  }

  const byClass = Object.fromEntries(
    DEFECT_CLASSES.map((d) => [
      d,
      { total: tally[d].total, detected: tally[d].detected, rate: tally[d].detected / tally[d].total },
    ]),
  ) as Record<DefectClass, ClassDetection>;

  const totals = DEFECT_CLASSES.reduce(
    (acc, d) => ({ total: acc.total + tally[d].total, detected: acc.detected + tally[d].detected }),
    { total: 0, detected: 0 },
  );

  return {
    byClass,
    overallRate: totals.detected / totals.total,
    minClassRate: Math.min(...DEFECT_CLASSES.map((d) => byClass[d].rate)),
  };
};
