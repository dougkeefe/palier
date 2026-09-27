import type { AiProvider } from "@palier/adapters/openai";

import { loadProfile, loadRecordedRuns } from "../io.js";
import { type ConformanceReport, schemaConformance } from "./conformance.js";
import { type DetectionReport, buildEvalSet, runEvalDetection } from "./eval-set.js";

/**
 * What `palier-factory eval` writes to `content/factory/eval-report.json`: the review gate's
 * detection rate on the defect set (content-factory.md §6, ADR 19), and the adapter's
 * schema-conformance rate on the live API's recorded completions (progress.md D112).
 * `committed-eval.test.ts` holds the committed file equal to a fresh run.
 */
export type EvalReport = DetectionReport & { readonly schemaConformance: ConformanceReport };

export const runEval = async (root: string, provider: AiProvider, perClass = 10): Promise<EvalReport> => ({
  ...(await runEvalDetection(buildEvalSet(perClass), provider, loadProfile(root))),
  schemaConformance: await schemaConformance(loadRecordedRuns(root)),
});
