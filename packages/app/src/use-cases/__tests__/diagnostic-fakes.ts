import type { DiagnosticInterpretation } from "@palier/domain";
import { sessionId } from "@palier/domain";

import type { DiagnosticReport, DiagnosticReportStore } from "../../ports/index.js";

/** A local diagnostic report store for the use-case tests (progress.md D37), keyed by session. */
export const diagnosticReportStore = (
  seed: readonly DiagnosticReport[] = [],
): DiagnosticReportStore & { readonly puts: () => number; readonly all: () => readonly DiagnosticReport[] } => {
  const bySession = new Map(seed.map((report) => [report.sessionId, report]));
  let puts = 0;
  return {
    put: (report) => {
      puts += 1;
      bySession.set(report.sessionId, report);
      return Promise.resolve();
    },
    get: (id) => Promise.resolve(bySession.get(id) ?? null),
    clear: () => {
      bySession.clear();
      return Promise.resolve();
    },
    puts: () => puts,
    all: () => [...bySession.values()],
  };
};

export const anInterpretation = (over: Partial<DiagnosticInterpretation> = {}): DiagnosticInterpretation => ({
  headline: "Solid at B, with C within reach.",
  summary: "Most of what you missed was agreement.",
  strengths: ["Prepositions"],
  priorities: [{ subSkill: "agreement", what: "Drill participle agreement.", why: "Three of four missed." }],
  planNote: "Your plan starts at B and adds agreement.",
  ...over,
});

export const aDiagnosticReport = (over: Partial<DiagnosticReport> = {}): DiagnosticReport => ({
  sessionId: sessionId("diag-1"),
  skill: "writing",
  feedbackLang: "en",
  writtenAt: "2026-10-01T10:30:00.000Z",
  interpretation: anInterpretation(),
  ...over,
});
