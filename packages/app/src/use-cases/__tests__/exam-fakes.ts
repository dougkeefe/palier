import type { ExamForm, ExamProfile, Item, ItemId } from "@palier/domain";
import { formId, itemId, parseExamProfileOrThrow, sessionId } from "@palier/domain";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { Clock, ExamRun, ItemRepository } from "../../ports/index.js";

/**
 * Local exam fixtures for the exam use-case tests (progress.md D37: `@palier/app`
 * cannot import `@palier/testing`). A six-item form with two pilots and its own
 * small cut table, keyed "a" throughout, so a test can say exactly which answers
 * are right.
 */

export const NOW = "2026-03-01T09:00:00.000Z";
export const RUN_ID = sessionId("01HEXAMRUN0000000000001");
export const FORM_ID = formId("01HEXAMFORM000000000001");

/** The real profile: `answerItem` reads its Leitner intervals (ADR 8). */
export const profile: ExamProfile = parseExamProfileOrThrow(
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL("../../../../../content/profiles/psc-sle.json", import.meta.url)),
      "utf8",
    ),
  ),
);

export const ITEM_IDS: readonly ItemId[] = ["q1", "q2", "p1", "q3", "p2", "q4"].map((id) => itemId(id));
export const PILOTS: readonly ItemId[] = [itemId("p1"), itemId("p2")];

export const anExamItem = (id: ItemId): Item => ({
  id,
  version: 1,
  skill: "reading",
  lang: "fr",
  type: "comprehension",
  stem: { en: "stem", fr: "énoncé" },
  options: [
    { id: "a", text: "a", rationale: { en: "x", fr: "x" } },
    { id: "b", text: "b", rationale: { en: "x", fr: "x" } },
    { id: "c", text: "c", rationale: { en: "x", fr: "x" } },
    { id: "d", text: "d", rationale: { en: "x", fr: "x" } },
  ],
  key: "a",
  explanation: { en: "e", fr: "e" },
  subSkill: "main-idea",
  targetBand: "B",
  topic: "human-resources",
  tags: [],
  provenance: { origin: "generated" },
  status: "published",
  createdAt: NOW,
  updatedAt: NOW,
});

/** Four scored items, so the cuts run 0 to 4. */
export const FORM: ExamForm = {
  id: FORM_ID,
  skill: "reading",
  lang: "fr",
  mode: "unsupervised",
  itemIds: ITEM_IDS,
  pilotItemIds: PILOTS,
  timeLimitMinutes: 45,
  bandCuts: [
    { band: "X", min: 0, max: 1 },
    { band: "A", min: 2, max: 2 },
    { band: "B", min: 3, max: 3 },
    { band: "C", min: 4, max: 4 },
  ],
  version: 1,
};

export const BANK: readonly Item[] = ITEM_IDS.map(anExamItem);

export const itemsOf = (forms: readonly ExamForm[] = [FORM], bank: readonly Item[] = BANK): ItemRepository => ({
  byIds: (ids) =>
    Promise.resolve(
      ids.map((id) => bank.find((item) => item.id === id)).filter((item): item is Item => item !== undefined),
    ),
  query: () => Promise.resolve([]),
  passage: () => Promise.resolve(null),
  form: (id) => Promise.resolve(forms.find((f) => f.id === id) ?? null),
  forms: () => Promise.resolve(forms),
  scenario: () => Promise.resolve(null),
  bankVersion: () => Promise.resolve(3),
});

/** A clock that hands out the instants given, then keeps the last. */
export const clockOf = (...instants: string[]): Clock => {
  let i = 0;
  return {
    now: () => {
      const at = instants[Math.min(i, instants.length - 1)] ?? NOW;
      i += 1;
      return at;
    },
  };
};

export const aRun = (over: Partial<ExamRun> = {}): ExamRun => ({
  id: RUN_ID,
  formId: FORM_ID,
  startedAt: NOW,
  answers: [],
  flagged: [],
  elapsedMs: 0,
  checkpointedAt: NOW,
  submittedAt: null,
  ...over,
});
