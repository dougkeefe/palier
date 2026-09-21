import type { Attempt, Item } from "@palier/domain";
import { attemptId, itemId, sessionId } from "@palier/domain";

/**
 * Test-only fixture builders, local to `@palier/engine`.
 *
 * `@palier/testing` holds the public builders (§6.4), but importing it here
 * would form a package cycle — `testing` depends on `@palier/app`, which depends
 * on this package — so the engine keeps its own copy under `src/__tests__`,
 * exactly as `@palier/domain` does. Absent optional fields are omitted rather
 * than set to `undefined` (progress.md deviation D14).
 */
export const anItem = (over: Partial<Item> = {}): Item => ({
  id: itemId("01HITEM00000000000000001"),
  version: 1,
  skill: "reading",
  lang: "fr",
  type: "comprehension",
  stem: { en: "What is the main point?", fr: "Quel est le point principal ?" },
  options: [
    { id: "a", text: "La bonne réponse.", rationale: { en: "Correct.", fr: "Correct." } },
    { id: "b", text: "Une distraction.", rationale: { en: "Wrong.", fr: "Faux." } },
    { id: "c", text: "Une autre.", rationale: { en: "Wrong.", fr: "Faux." } },
    { id: "d", text: "Encore une.", rationale: { en: "Wrong.", fr: "Faux." } },
  ],
  key: "a",
  explanation: { en: "The memo states it directly.", fr: "La note l'indique directement." },
  subSkill: "main-idea",
  targetBand: "B",
  topic: "service-delivery",
  tags: [],
  provenance: { origin: "generated" },
  status: "published",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

export const anAttempt = (over: Partial<Attempt> = {}): Attempt => ({
  id: attemptId("01HATTEMPT0000000000001"),
  itemId: itemId("01HITEM00000000000000001"),
  bankVersion: 1,
  skill: "reading",
  sessionId: sessionId("01HSESSION000000000001"),
  chosen: "a",
  correct: true,
  msToFirstSelect: 4200,
  msToConfirm: 5100,
  changedAnswer: false,
  mode: "drill",
  ts: "2026-01-01T00:00:00.000Z",
  ...over,
});
