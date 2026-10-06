import type { DiagnosticReport, DiagnosticReportStore } from "@palier/app";
import type { SessionId } from "@palier/domain";

/** The diagnostic's written interpretations, in memory, by run (ADR 25). */
export const memoryDiagnosticReportStore = (): DiagnosticReportStore => {
  const bySession = new Map<SessionId, DiagnosticReport>();
  return {
    put: (report) => {
      bySession.set(report.sessionId, report);
      return Promise.resolve();
    },
    get: (sessionId) => Promise.resolve(bySession.get(sessionId) ?? null),
    clear: () => {
      bySession.clear();
      return Promise.resolve();
    },
  };
};
