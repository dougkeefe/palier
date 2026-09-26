import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
  ITEM_STATISTICS_PATH,
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

const readManifest = (version: number) =>
  JSON.parse(readFileSync(join(root, `content/bank/v${String(version)}/manifest.json`), "utf8")) as {
    version: number;
    counts: { items: number };
    forms: { id: string }[];
  };

afterEach(() => {
  // mkdtemp dirs are small and OS-cleaned; leaving them avoids racing the run.
});

describe("runFactory", () => {
  it("runs the pipeline, writes the bank and report, and returns 0", async () => {
    const code = await runFactory(["run"], deps());
    expect(code).toBe(0);
    expect(existsSync(join(root, BATCH_REPORT_PATH))).toBe(true);
    expect(existsSync(join(root, "content/bank/v2/manifest.json"))).toBe(true);
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
    expect(existsSync(join(root, "content/bank/v2/manifest.json"))).toBe(true);
  });

  it("writes a form per profile variant into the bank", async () => {
    await runFactory(["run"], deps());
    const manifest = readManifest(2);
    expect(manifest.forms.map((f) => f.id)).toEqual([
      "fr-reading-supervised-v2",
      "fr-reading-unsupervised-v2",
      "fr-writing-supervised-v2",
      "fr-writing-unsupervised-v2",
    ]);
    expect(log.join(" ")).toMatch(/bank v2: \d+ items, forms fr-reading-supervised-v2/);
  });

  it("refuses to overwrite a bank version that already exists", async () => {
    await runFactory(["run", "--bank-version", "1"], deps());
    log.length = 0;
    const code = await runFactory(["run", "--bank-version", "1"], deps());
    expect(code).toBe(1);
    expect(log.join(" ")).toMatch(/refusing to overwrite content\/bank\/v1: a published bank version is immutable/);
  });

  it("rebuilds an existing bank version when forced", async () => {
    await runFactory(["run", "--bank-version", "1"], deps());
    const code = await runFactory(["run", "--bank-version", "1", "--force"], deps());
    expect(code).toBe(0);
    expect(readManifest(1).version).toBe(1);
  });

  it("carries the previous bank version's items into the next", async () => {
    await runFactory(["run", "--bank-version", "1"], deps());
    const v1Items = readManifest(1).counts.items;
    await runFactory(["run", "--bank-version", "2"], deps());
    const report = JSON.parse(readFileSync(join(root, BATCH_REPORT_PATH), "utf8")) as {
      counts: { itemsCarried: number };
    };
    expect(report.counts.itemsCarried).toBe(v1Items);
  });

  it("applies the item-statistics report to the carried bank: stats on, the retired off every new form", async () => {
    await runFactory(["run", "--bank-version", "1"], deps());
    const v1 = readManifest(1) as unknown as { shards: { path: string }[] };
    const [first, second] = v1.shards.flatMap(
      (s) => JSON.parse(readFileSync(join(root, "content", s.path), "utf8")) as { id: string }[],
    );
    const verdict = (id: string, reasons: string[]) => ({
      itemId: id,
      responses: 150,
      proportionCorrect: 0.5,
      pointBiserial: reasons.length > 0 ? -0.3 : 0.4,
      trusted: { difficulty: true, discrimination: true },
      reasons,
    });
    const profile = JSON.parse(readFileSync(join(root, PROFILE_PATH), "utf8")) as { itemStatistics: unknown };
    const report = {
      generatedAt: "2026-10-01T06:00:00.000Z",
      bankVersion: 1,
      events: 300,
      rules: profile.itemStatistics,
      verdicts: [verdict(second!.id, []), verdict(first!.id, ["low-discrimination"])],
    };
    mkdirSync(join(root, "content/factory"), { recursive: true });
    writeFileSync(join(root, ITEM_STATISTICS_PATH), JSON.stringify(report));

    await runFactory(["run", "--bank-version", "2"], deps());

    const v2 = readManifest(2) as unknown as { shards: { path: string }[]; forms: { path: string }[] };
    const items = new Map(
      v2.shards
        .flatMap((s) => JSON.parse(readFileSync(join(root, "content", s.path), "utf8")) as { id: string; status: string; stats?: unknown }[])
        .map((i) => [i.id, i]),
    );
    expect(items.get(first!.id)).toMatchObject({ status: "retired", stats: { responses: 150, pointBiserial: -0.3 } });
    expect(items.get(second!.id)).toMatchObject({ status: "published", stats: { updatedAt: "2026-10-01T06:00:00.000Z" } });
    for (const form of v2.forms) {
      const { itemIds } = JSON.parse(readFileSync(join(root, "content", form.path), "utf8")) as { itemIds: string[] };
      expect(itemIds).not.toContain(first!.id);
    }
  });

  it("refuses to build from a damaged item-statistics report", async () => {
    await runFactory(["run", "--bank-version", "1"], deps());
    mkdirSync(join(root, "content/factory"), { recursive: true });
    writeFileSync(join(root, ITEM_STATISTICS_PATH), JSON.stringify({ verdicts: "not a list" }));

    await expect(runFactory(["run", "--bank-version", "2"], deps())).rejects.toThrow();
  });

  it("carries the latest published version when the one just below was never written", async () => {
    await runFactory(["run", "--bank-version", "1"], deps());
    const v1Items = readManifest(1).counts.items;
    await runFactory(["run", "--bank-version", "3"], deps());
    const report = JSON.parse(readFileSync(join(root, BATCH_REPORT_PATH), "utf8")) as {
      counts: { itemsCarried: number };
    };
    expect(report.counts.itemsCarried).toBe(v1Items);
  });

  it("rejects a bank version or passage count that is not a positive integer", async () => {
    for (const args of [["--bank-version", "abc"], ["--bank-version", "0"], ["--per-source", "1.5"]]) {
      log.length = 0;
      expect(await runFactory(["run", ...args], deps())).toBe(1);
      expect(log.join(" ")).toMatch(/take a positive integer/);
    }
    expect(existsSync(join(root, "content/bank"))).toBe(false);
  });

  it("sizes the run by --per-source", async () => {
    await runFactory(["run", "--bank-version", "1", "--per-source", "3"], deps());
    const report = JSON.parse(readFileSync(join(root, BATCH_REPORT_PATH), "utf8")) as {
      counts: { passages: number; sources: number };
    };
    expect(report.counts.passages).toBe(report.counts.sources * 3);
  });

  it("writes no bank, and returns 1, when the bank cannot fill its forms", async () => {
    const code = await runFactory(["run", "--per-source", "1"], deps());
    expect(code).toBe(1);
    expect(existsSync(join(root, "content/bank/v2"))).toBe(false);
    expect(existsSync(join(root, BATCH_REPORT_PATH))).toBe(true);
    expect(log.join(" ")).toMatch(/FORM: cannot assemble forms: variant reading-supervised needs 60/);
    expect(log.join(" ")).toMatch(/bank v2 not written/);
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
      capabilities: () => ({ generatePassage: true, generateItems: true, reviewItem: true, assessWriting: false }),
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
      assessWriting: () => Promise.reject(new Error("not used")),
      verifyKey: () => Promise.resolve(),
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
