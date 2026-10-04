import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { itemSchema, itemTypeDefinition, parseExamProfileOrThrow, scenarioId } from "@palier/domain";
import type { ExamProfile, Item, OralScenario, ReviewRequest } from "@palier/domain";
import type { AiProvider } from "@palier/adapters/openai";

import { scriptedAiProvider } from "../providers/scripted-ai-provider.js";
import type { OralSessionPlan, SourceCandidate } from "../lib/types.js";
import { buildBank } from "./bank-build.js";
import { defaultWritingPlan, runPipeline } from "./run.js";
import type { RunInput } from "./run.js";
import {
  anAuthoredComprehensionItem,
  anAuthoredItem,
  anAuthoredItemReviewRejects,
  anAuthoredPassage,
} from "../__tests__/authored-fixtures.js";

const profile = (): ExamProfile =>
  parseExamProfileOrThrow(
    JSON.parse(readFileSync("content/profiles/psc-sle.json", "utf8")) as unknown,
  );

const sources = (): SourceCandidate[] =>
  JSON.parse(readFileSync("content/factory/sources.seed.json", "utf8")) as SourceCandidate[];

const run = (over: Partial<RunInput> = {}) =>
  runPipeline({
    sources: sources(),
    profile: profile(),
    provider: scriptedAiProvider(),
    now: "2026-09-21T00:00:00.000Z",
    batchId: "sample-0001",
    bankVersion: 1,
    promptVersion: "scripted-1",
    ...over,
  });

describe("runPipeline (end to end, scripted provider)", () => {
  it("rejects the unclear-licence source at harvest and keeps the rest", async () => {
    const out = await run();
    expect(out.harvest.queue.length).toBe(8);
    expect(out.harvest.rejected.map((r) => r.reason).join(" ")).toMatch(/does not clearly permit/);
  });

  it("produces passages and drafts items", async () => {
    const out = await run();
    expect(out.passages.length).toBeGreaterThan(0);
    expect(out.itemsDrafted).toBeGreaterThan(0);
  });

  it("lands stage-4 yield inside the 45–75% target", async () => {
    const out = await run();
    expect(out.report.stage4Yield).toBeGreaterThanOrEqual(0.45);
    expect(out.report.stage4Yield).toBeLessThanOrEqual(0.75);
  });

  it("publishes only schema-valid, validate-clean items", async () => {
    const out = await run();
    expect(out.validation.valid.length).toBeGreaterThan(0);
    for (const item of out.validation.valid) {
      expect(itemSchema.safeParse(item).success).toBe(true);
      expect(itemTypeDefinition(item.type).validate(item)).toEqual([]);
    }
  });

  it("keeps the key-position distribution roughly uniform", async () => {
    const out = await run();
    expect(out.validation.keyDistributionOk).toBe(true);
  });

  it("measures cost per accepted item from the scripted usage", async () => {
    const out = await run();
    expect(out.report.costPerAcceptedItemUsd).not.toBeNull();
    expect(out.report.totalCostUsd).toBeGreaterThan(0);
  });

  it("builds a byte-identical bank on a rebuild (reproducible)", async () => {
    const out = await run();
    const rebuilt = buildBank({
      items: out.validation.valid,
      passages: [...out.passages],
      forms: [...out.forms],
      scenarios: [],
      version: 1,
    });
    expect(rebuilt.files).toEqual(out.bank.files);
  });

  it("produces an identical bank from a second full run (determinism)", async () => {
    const a = await run();
    const b = await run();
    expect(b.bank.files).toEqual(a.bank.files);
    expect(b.report).toEqual(a.report);
  });

  it("assembles a clean form for every profile variant and ships it in the bank", async () => {
    const out = await run();
    expect(out.forms.map((f) => f.id)).toEqual(Object.keys(profile().variants).map((name) => `fr-${name}-v1`));
    expect(out.validation.formIssues).toEqual([]);
    expect(out.bank.manifest.forms.map((f) => f.id)).toEqual(out.forms.map((f) => f.id).sort());
  });

  it("draws the forms from the given seed, and from the batch id when none is given", async () => {
    const byBatch = await run();
    expect((await run({ formSeed: 99 })).forms[0]!.itemIds).not.toEqual(byBatch.forms[0]!.itemIds);
    expect((await run({ batchId: "sample-0002" })).forms[0]!.itemIds).not.toEqual(byBatch.forms[0]!.itemIds);
  });

  it("reports a bank too small to fill a variant as a form issue, and ships no forms", async () => {
    const out = await run({ perSource: 1, readingSubSkills: profile().subSkills.reading.slice(0, 2) });
    expect(out.forms).toEqual([]);
    expect(out.validation.formIssues.join(" ")).toMatch(/cannot assemble forms: variant reading-supervised needs 60/);
  });

  it("lets a defect in form assembly propagate rather than calling it a shortfall", async () => {
    // A cut table topping out above the scored count is a broken profile, not a small bank.
    const broken = profile();
    const variant = broken.variants["reading-unsupervised"]!;
    const bad = { ...broken, variants: { ...broken.variants, "reading-unsupervised": { ...variant, cuts: { ...variant.cuts, C: [19, 26] as const } } } };
    await expect(run({ profile: bad as ExamProfile })).rejects.toThrow(/cut table tops out at 26/);
  });

  it("carries a previous bank's items and passages forward under the same ids", async () => {
    // Renamed, so they stand for items an earlier version published under ids this
    // run would not mint; each still duplicates a fresh draft's stem.
    const previous = await run();
    const carried = {
      items: previous.validation.valid.slice(0, 5).map((i, n) => ({ ...i, id: `CARRIED${String(n)}` }) as Item),
      passages: previous.passages.slice(0, 2).map((p, n) => ({ ...p, id: `PCARRIED${String(n)}` }) as typeof p),
    };
    const out = await run({ bankVersion: 2, batchId: "sample-0002", carried });
    const ids = new Set(out.validation.valid.map((i) => i.id));
    for (const item of carried.items) expect(ids.has(item.id)).toBe(true);
    const passageFile = out.bank.files.filter((f) => f.path.includes("/passages/")).map((f) => f.content).join("");
    for (const passage of carried.passages) expect(passageFile).toContain(passage.id);
  });

  it("keeps the carried item over a new draft that duplicates it", async () => {
    const previous = await run();
    const original = previous.validation.valid[0]!;
    const carried = { items: [{ ...original, id: "CARRIED" } as Item], passages: [] };
    const out = await run({ bankVersion: 2, carried });
    expect(out.validation.valid.map((i) => i.id)).not.toContain(original.id);
    expect(out.validation.nearDuplicates).toContainEqual({ a: original.id, b: "CARRIED", similarity: 1 });
  });

  it("counts carried items apart from the batch's own output", async () => {
    const previous = await run();
    const carried = { items: previous.validation.valid.slice(0, 5).map((i, n) => ({ ...i, id: `CARRIED${String(n)}` }) as Item), passages: [] };
    const out = await run({ bankVersion: 2, batchId: "sample-0002", carried });
    expect(out.report.counts.itemsCarried).toBe(5);
    expect(out.report.counts.itemsPublished).toBe(out.validation.valid.length - 5);
  });

  it("keeps a carried passage's published record over this batch's copy of it (D114)", async () => {
    const previous = await run();
    const published = { ...previous.passages[0]!, source: { ...previous.passages[0]!.source, retrievedAt: "2026-01-01T00:00:00.000Z" } };
    const out = await run({ bankVersion: 2, batchId: "sample-0002", carried: { items: [], passages: [published] } });
    const passageFile = out.bank.files.filter((f) => f.path.includes("/passages/")).map((f) => f.content).join("");
    expect(passageFile).toContain("2026-01-01T00:00:00.000Z");
  });

  it("carries a previous version's forms beside this version's, so a run sat on one still rescores (D114)", async () => {
    const previous = await run();
    const carried = { items: previous.validation.valid, passages: previous.passages, forms: previous.forms };
    const out = await run({ bankVersion: 2, batchId: "sample-0002", carried });
    const ids = out.forms.map((f) => f.id);
    expect(ids.filter((id) => id.endsWith("-v1"))).toEqual(previous.forms.map((f) => f.id));
    expect(ids.filter((id) => id.endsWith("-v2"))).toHaveLength(previous.forms.length);
    expect(out.validation.formIssues).toEqual([]);
    expect(out.bank.manifest.forms.map((f) => f.id)).toEqual([...ids].sort());
  });

  it("reports a carried form that names an item the bank no longer holds, so the bank is not written", async () => {
    const previous = await run();
    const form = previous.forms[0]!;
    const broken = { ...form, itemIds: [...form.itemIds.slice(1), "GONE" as Item["id"]] };
    const out = await run({ bankVersion: 2, carried: { items: previous.validation.valid, passages: previous.passages, forms: [broken] } });
    expect(out.validation.formIssues).toContain(`form ${form.id} references missing item GONE`);
  });

  it("re-validates a carried item and reports it when it no longer passes", async () => {
    const previous = await run();
    const stale = { ...previous.validation.valid[0]!, id: "STALE", subSkill: "not-a-sub-skill" } as unknown as Item;
    const out = await run({ bankVersion: 2, carried: { items: [stale], passages: [] } });
    expect(out.validation.valid.map((i) => i.id)).not.toContain(stale.id);
    expect(out.validation.rejected.find((r) => r.itemId === stale.id)?.reasons.join(" ")).toMatch(/not in the profile taxonomy/);
    expect(out.report.counts.itemsCarried).toBe(0);
  });
});

const ORAL_PLAN: OralSessionPlan = {
  lang: "fr",
  bands: ["B", "C"],
  sessions: [
    { sessionType: "warmup", minutes: 5 },
    { sessionType: "full", minutes: 22 },
  ],
};

describe("runPipeline, with oral scenarios (D114)", () => {
  it("plans none when the batch has no oral plan", async () => {
    const out = await run();
    expect(out.scenarios).toEqual([]);
    expect(out.bank.manifest.scenarios).toBeNull();
    expect(out.report.counts.scenarios).toBe(0);
  });

  it("plans one scenario per session type at each band, filling each session's minutes, and ships them", async () => {
    const out = await run({ oralPlan: ORAL_PLAN });
    expect(out.scenarios.map((s) => `${s.sessionType}-${s.targetBand}`)).toEqual(["warmup-B", "warmup-C", "full-B", "full-C"]);
    for (const scenario of out.scenarios) {
      const minutes = scenario.sessionType === "warmup" ? 5 : 22;
      expect(scenario.phases.reduce((sum, p) => sum + p.minutes, 0)).toBe(minutes);
    }
    expect(out.bank.manifest.counts.scenarios).toBe(4);
    expect(out.bank.manifest.scenarios?.path).toBe("bank/v1/oral/scenarios.json");
    expect(out.report.counts).toMatchObject({ scenarios: 4, scenariosCarried: 0 });
  });

  it("keeps a carried scenario over a regenerated copy, and counts it apart", async () => {
    const previous = await run({ oralPlan: ORAL_PLAN });
    const carried = { items: previous.validation.valid, passages: previous.passages, scenarios: previous.scenarios.slice(0, 1) };
    const out = await run({ bankVersion: 2, oralPlan: ORAL_PLAN, carried });
    expect(out.scenarios.map((s) => s.id)).toEqual(previous.scenarios.map((s) => s.id));
    expect(out.report.counts).toMatchObject({ scenarios: 3, scenariosCarried: 1 });
  });

  it("meters the scenario calls into the batch's cost, and still records the item stages' provider", async () => {
    const without = await run();
    const withScenarios = await run({ oralPlan: ORAL_PLAN });
    expect(withScenarios.report.totalCostUsd).toBeGreaterThan(without.report.totalCostUsd ?? 0);
    expect(withScenarios.report.provider).toBe("scripted");
  });
});

/** The scripted provider, recording every review request it is sent. */
const recordingReviews = (): { provider: AiProvider; requests: ReviewRequest[] } => {
  const inner = scriptedAiProvider();
  const requests: ReviewRequest[] = [];
  return {
    requests,
    provider: {
      ...inner,
      reviewItem: (req) => {
        requests.push(req);
        return inner.reviewItem(req);
      },
    },
  };
};

const bankItems = (out: Awaited<ReturnType<typeof run>>): Item[] =>
  out.bank.files.filter((f) => f.path.includes("/fr/")).flatMap((f) => JSON.parse(f.content) as Item[]);

describe("runPipeline, with hand-authored items (content-factory.md §5)", () => {
  it("sends an authored item to stage 4, the review, blind to its key like any draft", async () => {
    const { provider, requests } = recordingReviews();
    const authored = anAuthoredItem();
    await run({ provider, authored: { items: [authored], passages: [] } });
    const request = requests.find((r) => r.stem.fr === authored.stem.fr);
    expect(request).toBeDefined();
    expect(request).not.toHaveProperty("key");
    expect(requests.at(-1)).toBe(request);
  });

  it("publishes a kept authored item with origin authored and its contributor intact", async () => {
    const authored = anAuthoredItem();
    const out = await run({ authored: { items: [authored], passages: [] } });
    expect(out.validation.valid.map((i) => i.id)).toContain(authored.id);
    const shipped = bankItems(out).find((i) => i.id === authored.id);
    expect(shipped?.provenance).toEqual({ origin: "authored", contributor: "octocat" });
  });

  it("discards an authored item the review rejects, whoever wrote it", async () => {
    const rejected = anAuthoredItemReviewRejects();
    const out = await run({ authored: { items: [rejected], passages: [] } });
    expect(out.validation.valid.map((i) => i.id)).not.toContain(rejected.id);
    expect(bankItems(out).map((i) => i.id)).not.toContain(rejected.id);
    const discard = out.review.discarded.find((d) => d.stemFr === rejected.stem.fr);
    expect(discard?.reasons.join(" ")).toMatch(/register flag/);
  });

  it("rejects an uncredited authored item at validation, though the review passed it", async () => {
    const uncredited = anAuthoredItem({ provenance: { origin: "authored" } });
    const out = await run({ authored: { items: [uncredited], passages: [] } });
    expect(out.review.passed.map((i) => i.id)).toContain(uncredited.id);
    expect(out.validation.rejected.find((r) => r.itemId === uncredited.id)?.reasons.join(" ")).toMatch(
      /authored-without-contributor/,
    );
    expect(bankItems(out).map((i) => i.id)).not.toContain(uncredited.id);
  });

  it("reviews an authored comprehension item against its authored passage, and ships both", async () => {
    const { provider, requests } = recordingReviews();
    const passage = anAuthoredPassage();
    const item = anAuthoredComprehensionItem();
    const out = await run({ provider, authored: { items: [item], passages: [passage] } });
    expect(requests.find((r) => r.stem.fr === item.stem.fr)?.passage).toEqual({ title: passage.title, body: passage.body });
    expect(bankItems(out).map((i) => i.id)).toContain(item.id);
    const passages = out.bank.files.filter((f) => f.path.includes("/passages/")).flatMap((f) => JSON.parse(f.content) as unknown[]);
    expect(passages).toContainEqual(passage);
  });

  it("counts authored items apart, so stage-4 yield and the published count stay the drafter's", async () => {
    const without = await run();
    const out = await run({ authored: { items: [anAuthoredItem(), anAuthoredItemReviewRejects()], passages: [] } });
    expect(out.report.authored).toEqual({ submitted: 2, passed: 1, published: 1 });
    expect(out.report.counts.itemsDrafted).toBe(without.report.counts.itemsDrafted);
    expect(out.report.counts.itemsPassed).toBe(without.report.counts.itemsPassed);
    expect(out.report.stage4Yield).toBe(without.report.stage4Yield);
    expect(out.report.counts.itemsPublished).toBe(out.validation.valid.length - 1);
    // Their two review calls are part of what the batch spent.
    expect(out.report.totalCostUsd).toBeGreaterThan(without.report.totalCostUsd ?? 0);
  });

  it("builds exactly the bank and report it did before the intake when nothing is authored", async () => {
    const without = await run();
    const empty = await run({ authored: { items: [], passages: [] } });
    expect(empty.bank.files).toEqual(without.bank.files);
    expect(empty.report).toEqual(without.report);
    expect(empty.report).not.toHaveProperty("authored");
  });
});

/** A provider that counts every call it is asked to make, reviewing as the scripted one does. */
const countingCalls = (): { provider: AiProvider; calls: string[] } => {
  const inner = scriptedAiProvider();
  const calls: string[] = [];
  const counted = <K extends "generatePassage" | "generateItems" | "reviewItem" | "generateScenario">(name: K): AiProvider[K] =>
    ((req: never) => {
      calls.push(name);
      return (inner[name] as (r: never) => unknown)(req);
    }) as AiProvider[K];
  return {
    calls,
    provider: {
      ...inner,
      generatePassage: counted("generatePassage"),
      generateItems: counted("generateItems"),
      reviewItem: counted("reviewItem"),
      generateScenario: counted("generateScenario"),
    },
  };
};

const PHASE = { name: "Accueil", minutes: 5, intent: "Warm up.", seedQuestions: ["Q ?"], escalation: ["E ?"], deescalation: ["D ?"] };
const anAuthoredScenario = (over: Partial<OralScenario> = {}): OralScenario => ({
  id: scenarioId("authored-warmup-b"),
  lang: "fr",
  sessionType: "warmup",
  targetBand: "B",
  topic: "human-resources",
  phases: [PHASE],
  ...over,
});

describe("runPipeline, authored only (D203)", () => {
  it("asks the provider for nothing but the review of the authored items, sources and oral plan notwithstanding", async () => {
    const { provider, calls } = countingCalls();
    const out = await run({ provider, oralPlan: ORAL_PLAN, authoredOnly: true, authored: { items: [anAuthoredItem()], passages: [] } });
    expect(calls).toEqual(["reviewItem"]);
    expect(out.report.counts).toMatchObject({ sources: 0, passages: 0, itemsDrafted: 0, itemsPassed: 0, scenarios: 0 });
    expect(out.report.stage4Yield).toBe(0);
    expect(out.report.authored).toEqual({ submitted: 1, passed: 1, published: 1 });
  });

  it("still carries the previous bank, so a carried item keeps its id", async () => {
    const previous = await run();
    const out = await run({ bankVersion: 2, authoredOnly: true, carried: { items: previous.validation.valid, passages: previous.passages } });
    expect(out.validation.valid.map((i) => i.id)).toEqual(previous.validation.valid.map((i) => i.id));
  });
});

describe("runPipeline, with authored scenarios (D203)", () => {
  it("ships an authored scenario that fills its session, after the carried ones, and counts it as new", async () => {
    const carried = { items: [], passages: [], scenarios: [anAuthoredScenario({ id: scenarioId("carried"), sessionType: "full", phases: [{ ...PHASE, minutes: 22 }] })] };
    const out = await run({ oralPlan: ORAL_PLAN, authoredOnly: true, carried, authored: { items: [], passages: [], scenarios: [anAuthoredScenario()] } });
    expect(out.scenarios.map((s) => s.id)).toEqual(["carried", "authored-warmup-b"]);
    expect(out.report.counts).toMatchObject({ scenarios: 1, scenariosCarried: 1 });
  });

  it("discards an authored scenario whose phases do not fill the session, or that duplicates one kept, never repairing it", async () => {
    const out = await run({
      oralPlan: ORAL_PLAN,
      authoredOnly: true,
      authored: { items: [], passages: [], scenarios: [anAuthoredScenario(), anAuthoredScenario(), anAuthoredScenario({ id: scenarioId("short"), phases: [{ ...PHASE, minutes: 3 }] })] },
    });
    expect(out.scenarios.map((s) => s.id)).toEqual(["authored-warmup-b"]);
    expect(out.scenarioStage.rejected).toEqual([
      { id: "authored-warmup-b", reasons: ["duplicate of authored-warmup-b"] },
      { id: "short", reasons: ["phases last 3 minutes, the warmup session 5"] },
    ]);
  });

  it("discards an authored scenario of a session type the oral plan gives no length", async () => {
    const out = await run({ authoredOnly: true, authored: { items: [], passages: [], scenarios: [anAuthoredScenario({ sessionType: "opinion" })] } });
    expect(out.scenarios).toEqual([]);
    expect(out.scenarioStage.rejected[0]?.reasons).toEqual(["no session length is planned for opinion"]);
  });
});

describe("defaultWritingPlan", () => {
  it("drafts every writing sub-skill against every topic at every band", () => {
    const p = profile();
    const plan = defaultWritingPlan(p, ["B", "C"]);
    expect(plan).toHaveLength(p.subSkills.writing.length * p.topics.length * 2);
    expect(new Set(plan.map((r) => `${r.subSkill}|${r.topic}|${r.targetBand}`)).size).toBe(plan.length);
    expect(new Set(plan.map((r) => r.type))).toEqual(new Set(["cloze", "error-id", "best-completion"]));
  });
});
