import type { ItemRepository } from "@palier/app";
import type {
  ExamForm,
  Item,
  ItemOption,
  OptionId,
  OralScenario,
  OralSessionType,
  Passage,
  TargetBand,
} from "@palier/domain";
import {
  OPTION_IDS,
  READING_SUB_SKILLS,
  TARGET_BANDS,
  TOPICS,
  WRITING_SUB_SKILLS,
  formId,
  itemId,
  passageId,
  scenarioId,
} from "@palier/domain";

import { aPassage, anExamForm, anItem, anOralScenario } from "./builders.js";
import { type MemoryBank, memoryItemRepository } from "../memory/index.js";

/**
 * The canonical fixture bank (implementation-plan.md §6.4). About sixty items —
 * sixty exactly, so a count assertion can be sharp — committed here so the
 * application, engine and adapter suites never depend on the real content bank
 * and a content change can never break the application test suite.
 *
 * It is *generated*, not sixty hand-written literals, so its invariants hold by
 * construction: every scored sub-skill in the taxonomy is covered, every band
 * A/B/C appears, and the correct key rotates across a, b, c, d so the bank
 * models the healthy distribution the content suite guards against in Phase 1
 * rather than a degenerate one. Each item is schema-valid and `validate()`-clean;
 * `bank.test.ts` is the contract that says so.
 *
 * These are fixtures, so the French and English are templated placeholders. The
 * point is structure and coverage, not prose — real content is the factory's job.
 */

/** Index a constant array with a wrapping index; the modulo keeps it in range. */
const cycle = <T>(xs: readonly T[], i: number): T => xs[i % xs.length] as T;

const FIXTURE_BANK_VERSION = 3;
const ITEM_COUNT = 60;

/** Writing items exercise the three non-passage MCQ types; reading is comprehension. */
const WRITING_TYPES = ["cloze", "error-id", "best-completion"] as const;

/** The scored-skill taxonomy paired with its skill: 8 reading + 10 writing = 18. */
const SCORED_SPECS = [
  ...READING_SUB_SKILLS.map((subSkill) => ({ skill: "reading" as const, subSkill })),
  ...WRITING_SUB_SKILLS.map((subSkill) => ({ skill: "writing" as const, subSkill })),
];

/** One passage per reading sub-skill; comprehension items point at the one for theirs. */
const passages: readonly Passage[] = READING_SUB_SKILLS.map((subSkill, idx) =>
  aPassage({
    id: passageId(`fixture-passage-${String(idx + 1).padStart(2, "0")}`),
    docType: cycle(["memo", "email", "letter", "bulletin"] as const, idx),
    targetBand: cycle(TARGET_BANDS, idx),
    topic: cycle(TOPICS, idx),
    title: `Texte d'entraînement : ${subSkill}`,
    body: `Passage de compréhension pour l'item « ${subSkill} ». Le comité se réunit jeudi.`,
    wordCount: 12,
    readability: { sentences: 2, avgSentenceLength: 6, rareWordRatio: 0.1 },
  }),
);

// Keyed by string so a comprehension item can look its passage up with the wider
// reading|writing sub-skill union without a narrowing dance; only reading sub-skills
// are ever looked up, and each one is present.
const passageForReadingSubSkill = new Map<string, Passage["id"]>(
  READING_SUB_SKILLS.map((subSkill, idx) => [subSkill, passages[idx]!.id]),
);

/** Four options a–d, the one matching `key` written as the correct answer. */
const makeOptions = (key: OptionId): readonly ItemOption[] =>
  OPTION_IDS.map((id) => ({
    id,
    text: id === key ? "La bonne réponse." : `Distracteur ${id.toUpperCase()}.`,
    rationale:
      id === key
        ? { en: "Correct: it matches the text.", fr: "Correct : conforme au texte." }
        : { en: "Incorrect for this item.", fr: "Incorrect pour cet item." },
  }));

const items: readonly Item[] = Array.from({ length: ITEM_COUNT }, (_, i) => {
  const spec = cycle(SCORED_SPECS, i);
  const band: TargetBand = cycle(TARGET_BANDS, i);
  const key = cycle(OPTION_IDS, i);
  const topic = cycle(TOPICS, i);
  const type = spec.skill === "reading" ? "comprehension" : cycle(WRITING_TYPES, i);

  // Only comprehension carries a passageId, only cloze carries a blankIndex —
  // the schema rejects either on the wrong type. Absent keys are omitted, never
  // set to undefined (deviation D14), so a spread of {} is the empty case.
  const typeFields =
    type === "comprehension"
      ? { passageId: passageForReadingSubSkill.get(spec.subSkill)! }
      : type === "cloze"
        ? { blankIndex: 1 }
        : {};

  return anItem({
    id: itemId(`fixture-item-${String(i + 1).padStart(2, "0")}`),
    skill: spec.skill,
    type,
    subSkill: spec.subSkill,
    targetBand: band,
    topic,
    key,
    options: makeOptions(key),
    stem: {
      en: `Practice ${type} item for ${spec.subSkill} at band ${band}.`,
      fr: `Item d'entraînement ${type} pour « ${spec.subSkill} », niveau ${band}.`,
    },
    explanation: {
      en: `The ${band}-band answer to a ${spec.subSkill} question.`,
      fr: `La réponse de niveau ${band} à une question de « ${spec.subSkill} ».`,
    },
    ...typeFields,
  });
});

const readingItemIds = items.filter((item) => item.skill === "reading").map((item) => item.id);
const writingItemIds = items.filter((item) => item.skill === "writing").map((item) => item.id);

// Two forms whose ids resolve within the bank. The default cut table tops out at
// 25 scored items, so each form carries exactly 25 items and no pilots — the
// schema requires the table to end at the scored count (architecture.md §7.5).
const forms: readonly ExamForm[] = [
  anExamForm({
    id: formId("fixture-form-reading"),
    skill: "reading",
    itemIds: readingItemIds.slice(0, 25),
  }),
  anExamForm({
    id: formId("fixture-form-writing"),
    skill: "writing",
    itemIds: writingItemIds.slice(0, 25),
  }),
];

/**
 * One scenario per session type (PRD §8.6), at the session's length, so a picker
 * and the session driver have every shape to run: the warm-up in two phases, the
 * full simulation in five, the rest in three (progress.md D114).
 */
const SCENARIO_PLAN: readonly {
  readonly sessionType: OralSessionType;
  readonly targetBand: "B" | "C";
  readonly minutes: readonly number[];
}[] = [
  { sessionType: "warmup", targetBand: "B", minutes: [2, 3] },
  { sessionType: "work", targetBand: "C", minutes: [2, 5, 3] },
  { sessionType: "opinion", targetBand: "C", minutes: [3, 5, 4] },
  { sessionType: "situation", targetBand: "B", minutes: [2, 4, 2] },
  { sessionType: "full", targetBand: "C", minutes: [3, 5, 5, 5, 4] },
];

const scenarios: readonly OralScenario[] = SCENARIO_PLAN.map(({ sessionType, targetBand, minutes }) =>
  anOralScenario({
    id: scenarioId(`fixture-scenario-${sessionType}-${targetBand.toLowerCase()}`),
    sessionType,
    targetBand,
    phases: minutes.map((m, i) => ({
      name: `Phase ${String(i + 1)}`,
      minutes: m,
      intent: `Sonder le candidat, phase ${String(i + 1)}.`,
      seedQuestions: [`Question d'ouverture ${String(i + 1)}.`],
      escalation: [`Relance plus exigeante ${String(i + 1)}.`],
      deescalation: [`Reformulation plus simple ${String(i + 1)}.`],
    })),
  }),
);

/**
 * The bank as a `MemoryBank` seed. Includes forms and a scenario per session type
 * as well as the sixty items and their passages, so `ItemRepository.form`/`scenario`
 * have fixture data too (progress.md deviation D31).
 */
export const FIXTURE_BANK: MemoryBank = {
  items,
  passages,
  forms,
  scenarios,
  bankVersion: FIXTURE_BANK_VERSION,
};

/** An in-memory `ItemRepository` seeded with the canonical bank, in one call. */
export const fixtureBankRepository = (): ItemRepository => memoryItemRepository(FIXTURE_BANK);
