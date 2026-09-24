import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { itemSchema, itemTypeDefinition, parseExamProfileOrThrow } from "@palier/domain";
import type { ExamProfile } from "@palier/domain";

import { scriptedAiProvider } from "../providers/scripted-ai-provider.js";
import type { SourceCandidate } from "../lib/types.js";
import { buildBank } from "./bank-build.js";
import { runPipeline } from "./run.js";

const profile = (): ExamProfile =>
  parseExamProfileOrThrow(
    JSON.parse(readFileSync("content/profiles/psc-sle.json", "utf8")) as unknown,
  );

const sources = (): SourceCandidate[] =>
  JSON.parse(readFileSync("content/factory/sources.seed.json", "utf8")) as SourceCandidate[];

const run = () =>
  runPipeline({
    sources: sources(),
    profile: profile(),
    provider: scriptedAiProvider(),
    now: "2026-09-21T00:00:00.000Z",
    batchId: "sample-0001",
    bankVersion: 1,
    promptVersion: "scripted-1",
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
      forms: [],
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
});
