import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { gateReasons, parseExamProfileOrThrow, reviewRequestFor } from "@palier/domain";
import type { ExamProfile } from "@palier/domain";

import { scriptedAiProvider } from "../providers/scripted-ai-provider.js";
import { perItemReasons } from "../pipeline/validate.js";
import {
  DEFECT_CLASSES,
  buildEvalSet,
  cleanControlItem,
  runEvalDetection,
} from "./eval-set.js";

const profile = (): ExamProfile =>
  parseExamProfileOrThrow(
    JSON.parse(readFileSync("content/profiles/psc-sle.json", "utf8")) as unknown,
  );

describe("review-gate evaluation set", () => {
  it("carries 40–60 items across the five defect classes", () => {
    const set = buildEvalSet(10);
    expect(set.length).toBe(50);
    expect(new Set(set.map((e) => e.defect))).toEqual(new Set(DEFECT_CLASSES));
  });

  it("lets a clean control item through the whole gate", async () => {
    const item = cleanControlItem();
    const verdict = await scriptedAiProvider().reviewItem(reviewRequestFor(item));
    expect(gateReasons(item, verdict)).toEqual([]);
    expect(perItemReasons(item, profile())).toEqual([]);
  });

  it("detects at least 90% of every defect class (the Phase-1 bar)", async () => {
    const report = await runEvalDetection(buildEvalSet(10), scriptedAiProvider(), profile());
    for (const defect of DEFECT_CLASSES) {
      expect(report.byClass[defect].rate).toBeGreaterThanOrEqual(0.9);
    }
    expect(report.minClassRate).toBeGreaterThanOrEqual(0.9);
    expect(report.overallRate).toBeGreaterThanOrEqual(0.9);
  });
});
