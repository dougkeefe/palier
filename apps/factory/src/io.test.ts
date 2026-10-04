import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AUTHORED_DIR,
  MODELS_PATH,
  ORAL_SESSIONS_PATH,
  RETIREMENTS_PATH,
  REVIEWS_DIR,
  loadAuthored,
  loadModels,
  loadOralSessions,
  loadRecordedReviews,
  loadRetirements,
} from "./io.js";
import { anAuthoredComprehensionItem, anAuthoredItem, anAuthoredPassage } from "./__tests__/authored-fixtures.js";

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

/** A root whose `content/authored/` holds exactly these files, raw text as given. */
const authoredRoot = (files: Record<string, string>): string => {
  const root = mkdtempSync(join(tmpdir(), "palier-authored-"));
  mkdirSync(join(root, AUTHORED_DIR), { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(root, AUTHORED_DIR, name), text);
  return root;
};

describe("loadAuthored (content-factory.md §5)", () => {
  it("reads nothing when there is no authored directory", () => {
    expect(loadAuthored(mkdtempSync(join(tmpdir(), "palier-authored-")))).toEqual({ items: [], passages: [], scenarios: [] });
  });

  it("reads nothing from a directory holding only files that are not JSON", () => {
    expect(loadAuthored(authoredRoot({ ".gitkeep": "", "notes.md": "# not a contribution" }))).toEqual({ items: [], passages: [], scenarios: [] });
  });

  it("reads every contribution's items and passages, in file-name order", () => {
    const root = authoredRoot({
      "b-second.json": JSON.stringify({ items: [anAuthoredComprehensionItem()], passages: [anAuthoredPassage()] }),
      "a-first.json": JSON.stringify({ items: [anAuthoredItem()] }),
      ".gitkeep": "",
    });
    expect(loadAuthored(root)).toEqual({
      items: [anAuthoredItem(), anAuthoredComprehensionItem()],
      passages: [anAuthoredPassage()],
      scenarios: [],
    });
  });

  const phase = { name: "Accueil", minutes: 5, intent: "Warm up.", seedQuestions: ["Q ?"], escalation: ["E ?"], deescalation: ["D ?"] };
  const scenario = { sessionType: "warmup", targetBand: "B", lang: "fr", topic: "human-resources", phases: [phase] };

  it("reads an authored scenario and mints its id from its content, as the scenario stage does (D203)", () => {
    const [read] = loadAuthored(authoredRoot({ "s.json": JSON.stringify({ items: [], scenarios: [scenario] }) })).scenarios;
    expect(read).toMatchObject(scenario);
    expect(read?.id).toMatch(/^[0-9A-Z]{20}$/);
    const [again] = loadAuthored(authoredRoot({ "t.json": JSON.stringify({ items: [], scenarios: [scenario] }) })).scenarios;
    expect(again?.id).toBe(read?.id);
    const [other] = loadAuthored(authoredRoot({ "u.json": JSON.stringify({ items: [], scenarios: [{ ...scenario, targetBand: "C" }] }) })).scenarios;
    expect(other?.id).not.toBe(read?.id);
  });

  it.each([
    ["is not JSON", "{ items: ", /content\/authored\/bad\.json is not valid JSON/],
    ["is a list, not an object", "[]", /content\/authored\/bad\.json must be an object/],
    ["is null", "null", /content\/authored\/bad\.json must be an object/],
    ["carries a key a contribution does not take", JSON.stringify({ items: [], author: "me" }), /bad\.json has keys a contribution does not take: author/],
    ["lists no items", JSON.stringify({ passages: [] }), /bad\.json must list its items under "items"/],
    ["lists passages as something other than a list", JSON.stringify({ items: [], passages: {} }), /bad\.json: "passages", when present, must be a list/],
    ["holds an item the schema refuses", JSON.stringify({ items: [{ ...anAuthoredItem(), key: "z" }] }), /bad\.json: items\[0\] fails the item schema/],
    ["holds a passage the schema refuses", JSON.stringify({ items: [], passages: [{ ...anAuthoredPassage(), body: "" }] }), /bad\.json: passages\[0\] fails the passage schema/],
    ["lists scenarios as something other than a list", JSON.stringify({ items: [], scenarios: {} }), /bad\.json: "scenarios", when present, must be a list/],
    ["holds a scenario that is not an object", JSON.stringify({ items: [], scenarios: ["s"] }), /bad\.json: scenarios\[0\] must be an object/],
    ["gives a scenario its own id, which is minted", JSON.stringify({ items: [], scenarios: [{ ...scenario, id: "mine" }] }), /scenarios\[0\] has keys an authored scenario does not take: id/],
    ["holds a scenario the schema refuses", JSON.stringify({ items: [], scenarios: [{ ...scenario, targetBand: "A" }] }), /bad\.json: scenarios\[0\] fails the scenario schema/],
  ])("refuses a contribution that %s, naming the file", (_name, text, message) => {
    expect(() => loadAuthored(authoredRoot({ "bad.json": text }))).toThrow(message);
  });
});

describe("loadRetirements (D205)", () => {
  it("reads none when there is no retirements file", () => {
    expect(loadRetirements(mkdtempSync(join(tmpdir(), "palier-io-")))).toBeNull();
  });

  it("reads the models whose items retire and the scenario ids that retire", () => {
    const root = rootWith(RETIREMENTS_PATH, { note: "n", itemGeneratorModels: ["scripted"], scenarioIds: ["S1"] });
    expect(loadRetirements(root)).toEqual({ itemGeneratorModels: ["scripted"], scenarioIds: ["S1"] });
  });

  it("refuses a file of the wrong shape rather than retire nothing", () => {
    const root = rootWith(RETIREMENTS_PATH, { itemGeneratorModels: "scripted", scenarioIds: [] });
    expect(() => loadRetirements(root)).toThrow(/must list itemGeneratorModels and scenarioIds/);
  });
});

describe("loadRecordedReviews (D204)", () => {
  const verdict = {
    chosenKey: "b",
    confidence: 0.9,
    defensibleDistractors: [],
    optionCases: { a: "a", b: "b", c: "c", d: "d" },
    registerFlag: { flagged: false },
    estimatedBand: "C",
  };

  it("reads none when there is no reviews directory", () => {
    expect(loadRecordedReviews(mkdtempSync(join(tmpdir(), "palier-io-")))).toEqual([]);
  });

  it("reads every pass in file-name order, each verdict parsed", () => {
    const root = rootWith(`${REVIEWS_DIR}/b.json`, { reviewer: "r2", verdicts: [{ requestHash: "h2", itemId: "i2", verdict }] });
    writeFileSync(join(root, REVIEWS_DIR, "a.json"), JSON.stringify({ reviewer: "r1", verdicts: [{ requestHash: "h1", itemId: "i1", verdict }] }));
    writeFileSync(join(root, REVIEWS_DIR, "notes.md"), "not a pass");
    expect(loadRecordedReviews(root)).toEqual([
      { reviewer: "r1", verdicts: [{ requestHash: "h1", itemId: "i1", verdict }] },
      { reviewer: "r2", verdicts: [{ requestHash: "h2", itemId: "i2", verdict }] },
    ]);
  });

  it.each([
    ["names no reviewer", { verdicts: [] }, /must name its reviewer and list its verdicts/],
    ["lists no verdicts", { reviewer: "r" }, /must name its reviewer and list its verdicts/],
    ["holds a verdict the schema refuses", { reviewer: "r", verdicts: [{ requestHash: "h", itemId: "i", verdict: { ...verdict, confidence: 2 } }] }, /verdicts\[0\] is not a recorded verdict/],
    ["holds a verdict filed under no hash", { reviewer: "r", verdicts: [{ itemId: "i", verdict }] }, /verdicts\[0\] is not a recorded verdict/],
  ])("refuses a pass that %s", (_name, data, message) => {
    expect(() => loadRecordedReviews(rootWith(`${REVIEWS_DIR}/p.json`, data))).toThrow(message);
  });
});
