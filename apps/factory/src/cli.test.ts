import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { AiProvider } from "@palier/adapters/openai";

import { buildProvider, runFactory } from "./cli.js";
import type { CliDeps } from "./cli.js";
import { scriptedAiProvider } from "./providers/scripted-ai-provider.js";
import {
  BATCH_REPORT_PATH,
  EVAL_REPORT_PATH,
  MODELS_PATH,
  PRICING_PATH,
  PROFILE_PATH,
  SOURCES_PATH,
} from "./io.js";

const REPO = process.cwd();
const INPUTS = [PROFILE_PATH, SOURCES_PATH, MODELS_PATH, PRICING_PATH];

let root: string;
const log: string[] = [];

const deps = (over: Partial<CliDeps> = {}): CliDeps => ({
  root,
  now: "2026-09-21T00:00:00.000Z",
  log: (line) => log.push(line),
  provider: scriptedAiProvider(),
  ...over,
});

// A deps object with no `provider`, so `buildProvider` constructs one itself.
const bareDeps = (env?: Record<string, string | undefined>): CliDeps => ({
  root,
  now: "2026-09-21T00:00:00.000Z",
  log: (line) => log.push(line),
  ...(env ? { env } : {}),
});

beforeEach(() => {
  log.length = 0;
  root = mkdtempSync(join(tmpdir(), "palier-factory-"));
  for (const rel of INPUTS) {
    const dest = join(root, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(REPO, rel), dest);
  }
});

afterEach(() => {
  // mkdtemp dirs are small and OS-cleaned; leaving them avoids racing the run.
});

describe("runFactory", () => {
  it("runs the pipeline, writes the bank and report, and returns 0", async () => {
    const code = await runFactory(["run"], deps());
    expect(code).toBe(0);
    expect(existsSync(join(root, BATCH_REPORT_PATH))).toBe(true);
    expect(existsSync(join(root, "content/bank/v1/manifest.json"))).toBe(true);
    const report = JSON.parse(readFileSync(join(root, BATCH_REPORT_PATH), "utf8")) as {
      counts: { itemsPublished: number };
    };
    expect(report.counts.itemsPublished).toBeGreaterThan(0);
    expect(log.join(" ")).toMatch(/published/);
  });

  it("runs the eval and returns 0 when detection clears the bar", async () => {
    const code = await runFactory(["eval", "--per-class", "10"], deps());
    expect(code).toBe(0);
    expect(existsSync(join(root, EVAL_REPORT_PATH))).toBe(true);
    expect(log.join(" ")).toMatch(/eval: overall/);
  });

  it("defaults to the run command", async () => {
    const code = await runFactory([], deps());
    expect(code).toBe(0);
    expect(existsSync(join(root, "content/bank/v1/manifest.json"))).toBe(true);
  });

  it("rejects an unknown command", async () => {
    const code = await runFactory(["frobnicate"], deps());
    expect(code).toBe(1);
    expect(log.join(" ")).toMatch(/unknown command/);
  });

  it("warns and returns 1 when the yield falls outside the target band", async () => {
    // A provider that drafts valid items but whose reviewer rejects every one:
    // yield collapses to 0, tripping the out-of-band warning.
    const rejectAll: AiProvider = {
      capabilities: () => ({ generatePassage: true, generateItems: true, reviewItem: true }),
      generatePassage: () => Promise.resolve([]),
      generateItems: (req) =>
        Promise.resolve([
          {
            type: req.promptSpec.itemType,
            stem: { fr: "administration coordination le chat va au parc", en: "en" },
            options: (["a", "b", "c", "d"] as const).map((id) => ({ id, text: `opt ${id}`, rationale: { fr: "f", en: "e" } })),
            key: "a",
            explanation: { fr: "f", en: "e" },
            subSkill: req.promptSpec.subSkill,
            targetBand: req.promptSpec.targetBand,
            topic: req.topic,
            ...(req.promptSpec.itemType === "cloze" ? { blankIndex: 0 } : {}),
          },
        ]),
      reviewItem: () =>
        Promise.resolve({
          chosenKey: "a",
          confidence: 0.1,
          defensibleDistractors: [],
          optionCases: { a: "", b: "", c: "", d: "" },
          registerFlag: { flagged: false },
          estimatedBand: "B",
        }),
      lastUsage: () => ({ model: "stub", inputTokens: 1, outputTokens: 1 }),
    };
    const code = await runFactory(["run"], deps({ provider: rejectAll }));
    expect(code).toBe(1);
    expect(log.join(" ")).toMatch(/WARNING: stage-4 yield/);
  });
});

describe("buildProvider", () => {
  it("returns the injected provider when one is supplied", () => {
    const injected = scriptedAiProvider();
    expect(buildProvider(false, deps({ provider: injected }))).toBe(injected);
  });

  it("builds the scripted provider by default", () => {
    const provider = buildProvider(false, bareDeps());
    expect(provider.capabilities().generateItems).toBe(true);
  });

  it("builds the openai provider when a key is present", () => {
    const provider = buildProvider(true, bareDeps({ OPENAI_API_KEY: "sk-x" }));
    expect(provider.capabilities().generateItems).toBe(true);
  });

  it("refuses the openai provider without a key", () => {
    expect(() => buildProvider(true, bareDeps({}))).toThrow(/OPENAI_API_KEY/);
  });
});
