import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildEvalSet, runEvalDetection } from "./eval/eval-set.js";
import { EVAL_REPORT_PATH, loadProfile } from "./io.js";
import { canonicalStringify } from "./lib/json.js";
import { scriptedAiProvider } from "./providers/scripted-ai-provider.js";

/**
 * The committed eval report is exactly what a plain `palier-factory eval` produces
 * (progress.md D109). Nothing held it before: moving the review gate into
 * `@palier/domain` had to leave these figures where they were, and this is the
 * test that says so, now and for any later change to the gate.
 */

const REPO = process.cwd();

describe("the committed eval report (content/factory/eval-report.json)", () => {
  it("matches a fresh run of the eval with the scripted provider", async () => {
    const committed = JSON.parse(readFileSync(join(REPO, EVAL_REPORT_PATH), "utf8")) as unknown;
    const report = await runEvalDetection(buildEvalSet(10), scriptedAiProvider(), loadProfile(REPO));
    expect(canonicalStringify(report)).toBe(canonicalStringify(committed));
  });
});
