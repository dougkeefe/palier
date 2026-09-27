import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { MODELS_PATH, ORAL_SESSIONS_PATH, loadModels, loadOralSessions } from "./io.js";

/** A root holding one file, so a loader reads exactly what the test wrote. */
const rootWith = (relPath: string, data: unknown): string => {
  const root = mkdtempSync(join(tmpdir(), "palier-io-"));
  mkdirSync(dirname(join(root, relPath)), { recursive: true });
  writeFileSync(join(root, relPath), JSON.stringify(data));
  return root;
};

const PLAN = { lang: "fr", bands: ["B", "C"], sessions: [{ sessionType: "work", minutes: 10 }] };

describe("loadOralSessions (D114)", () => {
  it("reads the committed plan: every session type at B and C", () => {
    const plan = loadOralSessions(process.cwd());
    expect(plan.bands).toEqual(["B", "C"]);
    expect(plan.sessions.map((s) => [s.sessionType, s.minutes])).toEqual([
      ["warmup", 5],
      ["work", 10],
      ["opinion", 12],
      ["situation", 8],
      ["full", 22],
    ]);
  });

  it("reads a whole plan as it is", () => {
    expect(loadOralSessions(rootWith(ORAL_SESSIONS_PATH, PLAN))).toEqual(PLAN);
  });

  it.each([
    ["a language it does not know", { ...PLAN, lang: "de" }, /lang/],
    ["no bands", { ...PLAN, bands: [] }, /bands/],
    ["a band scenarios are not written at", { ...PLAN, bands: ["A"] }, /bands/],
    ["no sessions", { ...PLAN, sessions: [] }, /sessions/],
    ["an unknown session type", { ...PLAN, sessions: [{ sessionType: "debate", minutes: 10 }] }, /session 0/],
    ["a session of no minutes", { ...PLAN, sessions: [{ sessionType: "work", minutes: 0 }] }, /session 0/],
    ["minutes that are not a number", { ...PLAN, sessions: [{ sessionType: "work", minutes: "10" }] }, /session 0/],
  ])("refuses a plan with %s", (_name, plan, message) => {
    expect(() => loadOralSessions(rootWith(ORAL_SESSIONS_PATH, plan))).toThrow(message);
  });
});

describe("loadModels", () => {
  it("reads the scenario model when one is configured, as the committed config does", () => {
    expect(loadModels(process.cwd()).scenario).toBeDefined();
  });

  it("leaves the scenario model out when none is configured", () => {
    const models = loadModels(rootWith(MODELS_PATH, { passage: "p", draft: "d", review: "r" }));
    expect(models).toEqual({ passage: "p", draft: "d", review: "r" });
  });
});
