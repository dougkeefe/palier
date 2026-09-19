import type { Attempt, ExamForm, Item, OralScenario, Passage } from "../index.js";
import {
  attemptId,
  formId,
  itemId,
  passageId,
  scenarioId,
  sessionId,
} from "../index.js";

/**
 * Minimal valid artefacts, for tests that assert a schema rejects one specific
 * thing. Each test spreads one of these and breaks exactly one field, so the
 * failure it asserts is the one it named.
 *
 * Absent optional fields are omitted rather than set to `undefined`, so these
 * survive a JSON round trip unchanged.
 */
export const aValidItem = (over: Partial<Item> = {}): Item => ({
  id: itemId("01HITEM00000000000000001"),
  version: 1,
  skill: "writing",
  lang: "fr",
  type: "error-id",
  stem: { en: "Find the error.", fr: "Trouvez l'erreur." },
  options: [
    { id: "a", text: "bien que ce soit", rationale: { en: "Correct.", fr: "Correct." } },
    { id: "b", text: "bien que c'est", rationale: { en: "Indicative.", fr: "Indicatif." } },
    { id: "c", text: "malgré que c'est", rationale: { en: "Rejected.", fr: "Rejeté." } },
    { id: "d", text: "quoique c'est", rationale: { en: "Indicative.", fr: "Indicatif." } },
  ],
  key: "a",
  explanation: {
    en: "«bien que» governs the subjunctive.",
    fr: "«bien que» régit le subjonctif.",
  },
  subSkill: "verb-tense-and-mood",
  targetBand: "C",
  topic: "policy-and-legislation",
  tags: [],
  provenance: { origin: "generated" },
  status: "published",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

export const aValidPassage = (over: Partial<Passage> = {}): Passage => ({
  id: passageId("01HPASSAGE0000000000001"),
  lang: "fr",
  docType: "memo",
  title: "Note de service",
  body: "Le comité se réunira jeudi.",
  wordCount: 5,
  targetBand: "B",
  topic: "human-resources",
  readability: { sentences: 1, avgSentenceLength: 5, rareWordRatio: 0.1 },
  source: { kind: "original" },
  status: "published",
  ...over,
});

export const aValidOralScenario = (over: Partial<OralScenario> = {}): OralScenario => ({
  id: scenarioId("01HSCENARIO000000000001"),
  lang: "fr",
  sessionType: "work",
  targetBand: "C",
  phases: [
    {
      name: "Mise en train",
      minutes: 3,
      intent: "Settle the candidate and establish a baseline.",
      seedQuestions: ["Parlez-moi de votre rôle."],
      escalation: [],
      deescalation: [],
    },
  ],
  topic: "service-delivery",
  ...over,
});

export const aValidExamForm = (over: Partial<ExamForm> = {}): ExamForm => ({
  id: formId("01HFORM000000000000001"),
  skill: "reading",
  lang: "fr",
  mode: "unsupervised",
  itemIds: Array.from({ length: 25 }, (_, i) => itemId(`item-${i}`)),
  pilotItemIds: [],
  timeLimitMinutes: 45,
  bandCuts: [
    { band: "X", min: 0, max: 8 },
    { band: "A", min: 9, max: 13 },
    { band: "B", min: 14, max: 18 },
    { band: "C", min: 19, max: 25 },
  ],
  version: 1,
  ...over,
});

export const aValidAttempt = (over: Partial<Attempt> = {}): Attempt => ({
  id: attemptId("01HATTEMPT0000000000001"),
  itemId: itemId("01HITEM00000000000000001"),
  bankVersion: 1,
  skill: "writing",
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
