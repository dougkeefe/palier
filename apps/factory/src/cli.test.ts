import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { AiProvider } from "@palier/adapters/openai";

import { DEFAULT_BANK_VERSION, REVIEW_REQUESTS_PATH, buildProvider, runFactory } from "./cli.js";
import type { CliDeps } from "./cli.js";
import { scriptedAiProvider } from "./providers/scripted-ai-provider.js";
import {
  anAuthoredComprehensionItem,
  anAuthoredItem,
  anAuthoredItemReviewRejects,
  anAuthoredPassage,
} from "./__tests__/authored-fixtures.js";
import {
  AUTHORED_DIR,
  BATCH_REPORT_PATH,
  EVAL_REPORT_PATH,
  ITEM_STATISTICS_PATH,
  MODELS_PATH,
  ORAL_SESSIONS_PATH,
  PRICING_PATH,
  PROFILE_PATH,
  RECORDED_COMPLETIONS_DIR,
  REVIEWS_DIR,
  SOURCES_PATH,
} from "./io.js";

const REPO = process.cwd();
/** What a plain `run` writes: the default version, `v4` since the authored run (D203). */
const DEFAULT = `v${String(DEFAULT_BANK_VERSION)}`;
// The eval reads the recorded completions too (progress.md D112), so they are inputs like the rest.
const RECORDED = readdirSync(join(REPO, RECORDED_COMPLETIONS_DIR)).map((file) => `${RECORDED_COMPLETIONS_DIR}/${file}`);
const INPUTS = [PROFILE_PATH, SOURCES_PATH, ORAL_SESSIONS_PATH, MODELS_PATH, PRICING_PATH, ...RECORDED];

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
    expect(existsSync(join(root, `content/bank/${DEFAULT}/manifest.json`))).toBe(true);
    const report = JSON.parse(readFileSync(join(root, BATCH_REPORT_PATH), "utf8")) as {
      counts: { itemsPublished: number };
    };
    expect(report.counts.itemsPublished).toBeGreaterThan(0);
    expect(log.join(" ")).toMatch(/published/);
  });

  it("logs no authored line when there is nothing under content/authored", async () => {
    await runFactory(["run"], deps());
    expect(log.join("\n")).not.toMatch(/^authored:/m);
    const report = JSON.parse(readFileSync(join(root, BATCH_REPORT_PATH), "utf8")) as Record<string, unknown>;
    expect(report).not.toHaveProperty("authored");
  });

  it("takes in the contributions under content/authored, and says what became of them (content-factory.md §5)", async () => {
    mkdirSync(join(root, AUTHORED_DIR), { recursive: true });
    writeFileSync(
      join(root, AUTHORED_DIR, "octocat.json"),
      JSON.stringify({ items: [anAuthoredItem(), anAuthoredItemReviewRejects()] }),
    );
    expect(await runFactory(["run"], deps())).toBe(0);
    expect(log).toContain("authored: 1 published / 2 submitted, 1 passed review");
    const manifest = JSON.parse(readFileSync(join(root, `content/bank/${DEFAULT}/manifest.json`), "utf8")) as {
      shards: { path: string }[];
    };
    const shipped = manifest.shards.flatMap((shard) => JSON.parse(readFileSync(join(root, "content", shard.path), "utf8")) as { id: string }[]);
    expect(shipped.map((i) => i.id)).toContain(anAuthoredItem().id);
    expect(shipped.map((i) => i.id)).not.toContain(anAuthoredItemReviewRejects().id);
  });

  it("runs the eval and returns 0 when detection clears the bar", async () => {
    const code = await runFactory(["eval", "--per-class", "10"], deps());
    expect(code).toBe(0);
    expect(existsSync(join(root, EVAL_REPORT_PATH))).toBe(true);
    expect(log.join(" ")).toMatch(/eval: overall/);
    expect(log.join(" ")).toMatch(/schema conformance on prompt v\d+: \d\.\d{3} over /);
  });

  it("defaults to the run command", async () => {
    const code = await runFactory([], deps());
    expect(code).toBe(0);
    expect(existsSync(join(root, `content/bank/${DEFAULT}/manifest.json`))).toBe(true);
  });

  it("writes a form per profile variant into the bank", async () => {
    await runFactory(["run"], deps());
    const manifest = readManifest(DEFAULT_BANK_VERSION);
    expect(manifest.forms.map((f) => f.id)).toEqual([
      `fr-reading-supervised-${DEFAULT}`,
      `fr-reading-unsupervised-${DEFAULT}`,
      `fr-writing-supervised-${DEFAULT}`,
      `fr-writing-unsupervised-${DEFAULT}`,
    ]);
    expect(log.join(" ")).toMatch(new RegExp(`bank ${DEFAULT}: \\d+ items, forms fr-reading-supervised-${DEFAULT}`));
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

  it("carries the previous version's forms and scenarios into the next, as they were published (D114)", async () => {
    await runFactory(["run", "--bank-version", "1"], deps());
    const v1 = readManifest(1) as unknown as { forms: { id: string }[]; scenarios: { path: string } };
    await runFactory(["run", "--bank-version", "2"], deps());
    const v2 = readManifest(2) as unknown as { forms: { id: string }[]; scenarios: { path: string } };
    for (const { id } of v1.forms) expect(v2.forms.map((f) => f.id)).toContain(id);
    const scenariosOf = (path: string) => JSON.parse(readFileSync(join(root, "content", path), "utf8")) as { id: string }[];
    expect(scenariosOf(v2.scenarios.path).map((s) => s.id)).toEqual(scenariosOf(v1.scenarios.path).map((s) => s.id));
    const report = JSON.parse(readFileSync(join(root, BATCH_REPORT_PATH), "utf8")) as { counts: { scenariosCarried: number } };
    expect(report.counts.scenariosCarried).toBe(10);
    expect(log.join(" ")).toMatch(/scenarios: 0 new, 10 carried, 0 discarded, 0 failed calls/);
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
    // v1's forms are carried as they were published, so a run sat on one still rescores (D114);
    // it is the forms v2 draws itself that must leave the retired item out.
    const own = v2.forms.filter((form) => form.path.endsWith("-v2.json"));
    expect(own).toHaveLength(4);
    for (const form of own) {
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
    expect(existsSync(join(root, `content/bank/${DEFAULT}`))).toBe(false);
    expect(existsSync(join(root, BATCH_REPORT_PATH))).toBe(true);
    expect(log.join(" ")).toMatch(/FORM: cannot assemble forms: variant reading-supervised needs 60/);
    expect(log.join(" ")).toMatch(new RegExp(`bank ${DEFAULT} not written`));
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
      capabilities: () => ({ generatePassage: true, generateItems: true, reviewItem: true, assessWriting: false, generateScenario: false, transcribe: false, speak: false, examinerTurn: false, assessOral: false }),
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
      generateScenario: () => Promise.reject(new Error("not used")),
      transcribe: () => Promise.reject(new Error("not used")),
      speak: () => Promise.reject(new Error("not used")),
      examinerTurn: () => Promise.reject(new Error("not used")),
      assessOral: () => Promise.reject(new Error("not used")),
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
    expect(buildProvider("scripted", deps({ provider: injected }))).toBe(injected);
  });

  it("builds the scripted provider by default", () => {
    const provider = buildProvider("scripted", bareDeps());
    expect(provider.capabilities().generateItems).toBe(true);
  });

  it("builds the openai provider when a key is present", () => {
    const provider = buildProvider("openai", bareDeps({ OPENAI_API_KEY: "sk-x" }));
    expect(provider.capabilities().generateItems).toBe(true);
  });

  it("refuses the openai provider without a key", () => {
    expect(() => buildProvider("openai", bareDeps({}))).toThrow(/OPENAI_API_KEY/);
  });
});

describe("buildProvider, the recorded reviewer (D204)", () => {
  it("builds a reviewer that only reviews, from the verdicts under content/factory/reviews", () => {
    const provider = buildProvider("recorded", bareDeps());
    expect(provider.capabilities().reviewItem).toBe(true);
    expect(provider.capabilities().generateItems).toBe(false);
  });

  it("refuses a provider it does not know", () => {
    expect(() => buildProvider("gemini", bareDeps())).toThrow(/unknown provider "gemini"/);
  });
});

type Requests = { requestHash: string; itemId: string; request: { stem: { fr: string }; passage?: unknown } }[];

const contribute = (content: unknown, file = "octocat.json"): void => {
  mkdirSync(join(root, AUTHORED_DIR), { recursive: true });
  writeFileSync(join(root, AUTHORED_DIR, file), JSON.stringify(content));
};

const readRequests = (path = REVIEW_REQUESTS_PATH): Requests => JSON.parse(readFileSync(join(root, path), "utf8")) as Requests;

/** A verdict file answering `requests`: the intended key, confidently, for every item but `reject`, which gets "d". */
const fileVerdicts = (requests: Requests, keys: Record<string, string>, reject: readonly string[] = []): void => {
  mkdirSync(join(root, REVIEWS_DIR), { recursive: true });
  const verdicts = requests.map(({ requestHash, itemId }) => ({
    requestHash,
    itemId,
    verdict: {
      chosenKey: reject.includes(itemId) ? "d" : keys[itemId],
      confidence: 0.9,
      defensibleDistractors: [],
      optionCases: { a: "a", b: "b", c: "c", d: "d" },
      registerFlag: { flagged: false },
      estimatedBand: "B",
    },
  }));
  writeFileSync(join(root, REVIEWS_DIR, "pass-1.json"), JSON.stringify({ reviewer: "claude-opus-5-5", verdicts }));
};

describe("review-requests (D204)", () => {
  it("writes each authored item's blind request, with its passage and its hash, and no key", async () => {
    contribute({ items: [anAuthoredItem(), anAuthoredComprehensionItem()], passages: [anAuthoredPassage()] });
    expect(await runFactory(["review-requests"], deps())).toBe(0);
    const requests = readRequests();
    expect(requests.map((r) => r.itemId)).toEqual([anAuthoredItem().id, anAuthoredComprehensionItem().id]);
    expect(requests[1]?.request.passage).toEqual({ title: anAuthoredPassage().title, body: anAuthoredPassage().body });
    expect(JSON.stringify(requests)).not.toMatch(/"key"|rationale|explanation/);
    expect(log).toContain(`review-requests: 2 blind request(s) written to ${REVIEW_REQUESTS_PATH}`);
  });

  it("leaves out the items a recorded verdict already answers, unless asked for all", async () => {
    contribute({ items: [anAuthoredItem()] });
    await runFactory(["review-requests"], deps());
    fileVerdicts(readRequests(), { [anAuthoredItem().id]: "b" });
    await runFactory(["review-requests", "--out", "pending.json"], deps());
    expect(readRequests("pending.json")).toEqual([]);
    await runFactory(["review-requests", "--all", "--out", "all.json"], deps());
    expect(readRequests("all.json")).toHaveLength(1);
  });
});

describe("run --authored-only --provider recorded (D203)", () => {
  const authoredRun = async (): Promise<number> => {
    contribute({ items: [anAuthoredItem(), anAuthoredItemReviewRejects()] });
    await runFactory(["review-requests"], deps());
    fileVerdicts(readRequests(), { [anAuthoredItem().id]: "b" }, [anAuthoredItemReviewRejects().id]);
    return runFactory(["run", "--authored-only", "--provider", "recorded"], bareDeps());
  };

  it("drafts nothing, reviews the contributions from the recorded verdicts, and names the reviewer", async () => {
    await authoredRun();
    const report = JSON.parse(readFileSync(join(root, BATCH_REPORT_PATH), "utf8")) as {
      provider: string;
      counts: { sources: number; passages: number; itemsDrafted: number; scenarios: number };
      authored: unknown;
      totalCostUsd: unknown;
    };
    expect(report.counts).toMatchObject({ sources: 0, passages: 0, itemsDrafted: 0, scenarios: 0 });
    expect(report.authored).toEqual({ submitted: 2, passed: 1, published: 1 });
    expect(report.provider).toBe("claude-opus-5-5");
    expect(report.totalCostUsd).toBeNull();
  });

  it("does not hold a batch that drafted nothing to the drafter's yield band", async () => {
    await authoredRun();
    expect(log).toContain("no items drafted: stage-4 yield does not apply");
    expect(log.join(" ")).not.toMatch(/WARNING: stage-4 yield/);
  });

  it("stops on an authored item no recorded verdict answers", async () => {
    contribute({ items: [anAuthoredItem()] });
    await expect(runFactory(["run", "--authored-only", "--provider", "recorded"], bareDeps())).rejects.toThrow(/no recorded verdict/);
  });
});

describe("check-authored (D203)", () => {
  it("passes a clean contribution and says what it checked", async () => {
    contribute({ items: [anAuthoredItem(), anAuthoredComprehensionItem()], passages: [anAuthoredPassage()] });
    expect(await runFactory(["check-authored"], deps())).toBe(0);
    expect(log).toContain("check-authored: 2 item(s), 1 passage(s), 0 scenario(s), 0 issue(s)");
  });

  it("names every issue and returns 1", async () => {
    contribute({ items: [anAuthoredComprehensionItem()], passages: [anAuthoredPassage({ wordCount: 9 })] });
    expect(await runFactory(["check-authored"], deps())).toBe(1);
    expect(log).toContain(`ISSUE: passage ${anAuthoredPassage().id}: wordCount is 9, and the body has 51`);
  });

  it("checks only the files it is given", async () => {
    contribute({ items: [anAuthoredItem()] }, "good.json");
    contribute({ items: [anAuthoredItem({ subSkill: "main-idea" })] }, "bad.json");
    expect(await runFactory(["check-authored", `${AUTHORED_DIR}/good.json`], deps())).toBe(0);
  });

  it("fills a passage's word count and readability in from its body with --write-readability", async () => {
    contribute({ items: [anAuthoredComprehensionItem()], passages: [anAuthoredPassage({ wordCount: 1, readability: { sentences: 1, avgSentenceLength: 1, rareWordRatio: 0 } })] });
    expect(await runFactory(["check-authored", "--write-readability"], deps())).toBe(0);
    const written = JSON.parse(readFileSync(join(root, AUTHORED_DIR, "octocat.json"), "utf8")) as { passages: unknown[] };
    expect(written.passages[0]).toMatchObject({ wordCount: 51, readability: anAuthoredPassage().readability });
  });

  it("checks an authored scenario against the oral plan's session lengths", async () => {
    const phase = { name: "Accueil", minutes: 4, intent: "Warm up.", seedQuestions: ["Q ?"], escalation: ["E ?"], deescalation: ["D ?"] };
    contribute({ items: [], scenarios: [{ sessionType: "warmup", targetBand: "B", lang: "fr", topic: "human-resources", phases: [phase] }] });
    expect(await runFactory(["check-authored"], deps())).toBe(1);
    expect(log.join(" ")).toMatch(/ISSUE: scenario \w+: phases last 4 minutes, the warmup session 5/);
  });
});
