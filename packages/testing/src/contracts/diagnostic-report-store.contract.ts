import { describe, expect, it } from "vitest";

import type { DiagnosticReport, DiagnosticReportStore } from "@palier/app";
import { sessionId } from "@palier/domain";

const aReport = (id: string, over: Partial<DiagnosticReport> = {}): DiagnosticReport => ({
  sessionId: sessionId(id),
  skill: "writing",
  feedbackLang: "fr",
  writtenAt: "2026-10-06T10:00:00.000Z",
  interpretation: {
    headline: "Vous êtes à l'aise au niveau B.",
    summary: "Vos erreurs portent  sur l'accord.\nUne seule tendance.",
    strengths: ["Les prépositions"],
    priorities: [{ subSkill: "agreement", what: "Revoir l'accord du participe.", why: "Deux erreurs sur quatre." }],
    planNote: "Votre plan commence au niveau B.",
  },
  ...over,
});

/**
 * The diagnostic's written interpretations (ADR 25): a plain upsert by the run's session, read
 * back exactly, its words' own whitespace included, and emptied on clear.
 */
export const diagnosticReportStoreContract = (name: string, make: () => Promise<DiagnosticReportStore>): void => {
  describe(`DiagnosticReportStore contract: ${name}`, () => {
    it("holds nothing on a fresh device", async () => {
      const store = await make();

      expect(await store.get(sessionId("absent"))).toBeNull();
    });

    it("returns a report exactly as it was put, by its run", async () => {
      const store = await make();
      const reading = aReport("run-b", { skill: "reading", feedbackLang: "en" });
      await store.put(aReport("run-a"));
      await store.put(reading);

      expect(await store.get(sessionId("run-a"))).toEqual(aReport("run-a"));
      expect(await store.get(sessionId("run-b"))).toEqual(reading);
    });

    it("replaces a report put again for the same run", async () => {
      const store = await make();
      await store.put(aReport("run-a"));
      const again = aReport("run-a", { feedbackLang: "en", writtenAt: "2026-10-07T10:00:00.000Z" });
      await store.put(again);

      expect(await store.get(sessionId("run-a"))).toEqual(again);
    });

    it("empties on clear", async () => {
      const store = await make();
      await store.put(aReport("run-a"));
      await store.clear();

      expect(await store.get(sessionId("run-a"))).toBeNull();
    });
  });
};
