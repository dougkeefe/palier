import type { ScheduleEntry, Session } from "@palier/app";
import type { Attempt, ExamForm, Item, OralScenario, Passage } from "@palier/domain";
import { attemptId, formId, itemId, passageId, scenarioId, sessionId } from "@palier/domain";

/**
 * Fixture builders with sensible defaults and overrides, so no test hand-writes
 * an object literal (implementation-plan.md 6.4): `anItem({ targetBand: 'C' })`.
 *
 * Absent optional fields are omitted rather than set to `undefined`, so a
 * fixture survives a JSON round trip unchanged (progress.md deviation D14).
 * `@palier/domain` keeps its own copy of these under `src/__tests__` for its
 * schema-rejection tests; those are not exported, so the public builders live
 * here where §6.4 puts them.
 */
export type Builder<T> = (overrides?: Partial<T>) => T;

export const buildWith = <T extends object>(defaults: T): Builder<T> =>
  (overrides = {}) => ({ ...defaults, ...overrides });

export const anItem: Builder<Item> = buildWith<Item>({
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
});

export const anAttempt: Builder<Attempt> = buildWith<Attempt>({
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
});

export const aScheduleEntry: Builder<ScheduleEntry> = buildWith<ScheduleEntry>({
  itemId: itemId("01HITEM00000000000000001"),
  due: "2026-01-01T00:00:00.000Z",
  skill: "reading",
  // Box 1 is where an unseen item starts, so it is the honest default; a
  // retired entry (`due: null`, top box) is spelled out by the test that wants it.
  box: 1,
});

export const aSession: Builder<Session> = buildWith<Session>({
  id: sessionId("01HSESSION000000000001"),
  mode: "drill",
  startedAt: "2026-01-01T00:00:00.000Z",
  // A session starts in progress; a completed one is spelled out by the test that
  // wants it. `completedAt` is a required field, so null (not absent) is its value.
  completedAt: null,
});

export const aPassage: Builder<Passage> = buildWith<Passage>({
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
});

export const anExamForm: Builder<ExamForm> = buildWith<ExamForm>({
  id: formId("01HFORM000000000000001"),
  skill: "reading",
  lang: "fr",
  mode: "unsupervised",
  itemIds: Array.from({ length: 25 }, (_, i) => itemId(`01HFORMITEM${String(i).padStart(13, "0")}`)),
  pilotItemIds: [],
  timeLimitMinutes: 45,
  bandCuts: [
    { band: "X", min: 0, max: 8 },
    { band: "A", min: 9, max: 13 },
    { band: "B", min: 14, max: 18 },
    { band: "C", min: 19, max: 25 },
  ],
  version: 1,
});

export const anOralScenario: Builder<OralScenario> = buildWith<OralScenario>({
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
});
