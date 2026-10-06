import type { DiagnosticReport, DiagnosticReportStore } from "@palier/app";
import type { DiagnosticInterpretation, Lang, ScoredSkill, SessionId } from "@palier/domain";
import { diagnosticInterpretationSchema } from "@palier/domain";

import type { DiagnosticReportRow, PalierDb } from "./db.js";

const isText = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const isSkill = (value: unknown): value is ScoredSkill => value === "reading" || value === "writing";
const isLang = (value: unknown): value is Lang => value === "en" || value === "fr";

/**
 * The structure check at the edge (D55's approach, ADR 25). A row without a whole session,
 * skill, language, instant and interpretation reads as nothing, so the screen offers to ask
 * again rather than draw a broken one; the run's score never depended on it.
 */
const reportOf = (row: DiagnosticReportRow | undefined): DiagnosticReport | null => {
  if (row === undefined) return null;
  const { sessionId, skill, feedbackLang, writtenAt, interpretation } = row as Partial<
    Record<keyof DiagnosticReport, unknown>
  >;
  if (!isText(sessionId) || !isSkill(skill) || !isLang(feedbackLang) || typeof writtenAt !== "string") return null;
  if (Number.isNaN(Date.parse(writtenAt))) return null;
  const parsed = diagnosticInterpretationSchema.safeParse(interpretation);
  if (!parsed.success) return null;
  return {
    sessionId: sessionId as SessionId,
    skill,
    feedbackLang,
    writtenAt,
    interpretation: parsed.data as DiagnosticInterpretation,
  };
};

const rowOf = ({ sessionId, skill, feedbackLang, writtenAt, interpretation }: DiagnosticReport): DiagnosticReportRow => ({
  sessionId,
  skill,
  feedbackLang,
  writtenAt,
  interpretation,
});

/**
 * The diagnostic's written interpretations over v4's `diagnosticReports` table (ADR 25), one
 * row per run, keyed by its session. Device-local: no sync collector reads this table, and no
 * export carries it.
 */
export const dexieDiagnosticReportStore = (db: PalierDb): DiagnosticReportStore => ({
  put: async (report) => {
    await db.diagnosticReports.put(rowOf(report));
  },
  get: async (sessionId) => reportOf(await db.diagnosticReports.get(sessionId)),
  clear: () => db.diagnosticReports.clear(),
});
