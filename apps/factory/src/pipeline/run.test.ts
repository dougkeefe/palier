import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { itemSchema, itemTypeDefinition, parseExamProfileOrThrow } from "@palier/domain";
import type { ExamProfile, Item } from "@palier/domain";

import { scriptedAiProvider } from "../providers/scripted-ai-provider.js";
import type { SourceCandidate } from "../lib/types.js";
import { buildBank } from "./bank-build.js";
import { defaultWritingPlan, runPipeline } from "./run.js";
import type { RunInput } from "./run.js";

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

  it("re-validates a carried item and reports it when it no longer passes", async () => {
    const previous = await run();
    const stale = { ...previous.validation.valid[0]!, id: "STALE", subSkill: "not-a-sub-skill" } as unknown as Item;
    const out = await run({ bankVersion: 2, carried: { items: [stale], passages: [] } });
    expect(out.validation.valid.map((i) => i.id)).not.toContain(stale.id);
    expect(out.validation.rejected.find((r) => r.itemId === stale.id)?.reasons.join(" ")).toMatch(/not in the profile taxonomy/);
    expect(out.report.counts.itemsCarried).toBe(0);
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
