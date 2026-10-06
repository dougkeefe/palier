import { diagnosticReportStoreContract } from "@palier/testing";
import type { SessionId } from "@palier/domain";
import { sessionId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { PalierDb } from "./db.js";
import { dexieDiagnosticReportStore } from "./diagnostic-report-store.js";

const dbName = (): string => `palier-diagnostic-${globalThis.crypto.randomUUID()}`;

diagnosticReportStoreContract("dexie", () => Promise.resolve(dexieDiagnosticReportStore(new PalierDb(dbName()))));

const aReport = {
  sessionId: sessionId("diag-1"),
  skill: "writing",
  feedbackLang: "en",
  writtenAt: "2026-10-06T10:00:00.000Z",
  interpretation: {
    headline: "Solid at B.",
    summary: "Agreement is the pattern.",
    strengths: ["Prepositions"],
    priorities: [{ subSkill: "agreement", what: "Practise it.", why: "Two misses." }],
    planNote: "Your plan starts at B.",
  },
} as const;

describe("dexieDiagnosticReportStore", () => {
  it("survives a reopen, so a paid-for interpretation outlives the tab", async () => {
    const name = dbName();
    await dexieDiagnosticReportStore(new PalierDb(name)).put(aReport);

    expect(await dexieDiagnosticReportStore(new PalierDb(name)).get(aReport.sessionId)).toEqual(aReport);
  });

  it.each([
    ["an empty session", { ...aReport, sessionId: "" }],
    ["a skill with no paper", { ...aReport, skill: "oral" }],
    ["a language the app has not", { ...aReport, feedbackLang: "de" }],
    ["a time that is not an instant", { ...aReport, writtenAt: "2026-99" }],
    ["a time that is not a string", { ...aReport, writtenAt: 12 }],
    ["an interpretation in the wrong shape", { ...aReport, interpretation: { headline: "only this" } }],
  ])("reads a row with %s as nothing", async (_, row) => {
    const db = new PalierDb(dbName());
    // Written straight to the table, as a row from an older or foreign build could be.
    await db.diagnosticReports.put(row as never);

    expect(await dexieDiagnosticReportStore(db).get(row.sessionId as SessionId)).toBeNull();
  });

  it("stores the report and nothing else: no field is added on the way in", async () => {
    const db = new PalierDb(dbName());
    await dexieDiagnosticReportStore(db).put({ ...aReport, extra: "not part of a report" } as never);

    const [row] = await db.diagnosticReports.toArray();
    expect(Object.keys(row ?? {}).sort()).toEqual(["feedbackLang", "interpretation", "sessionId", "skill", "writtenAt"]);
  });

  it("keeps its rows apart from the synced settings", async () => {
    const db = new PalierDb(dbName());
    await dexieDiagnosticReportStore(db).put(aReport);

    expect(await db.settings.toArray()).toEqual([]);
    expect(await db.diagnosticReports.count()).toBe(1);
  });
});
