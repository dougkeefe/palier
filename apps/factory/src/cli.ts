import { parseArgs } from "node:util";

import type { AiProvider } from "@palier/adapters/openai";
import { openAiProvider, PROMPT_VERSION } from "@palier/adapters/openai";

import {
  BATCH_REPORT_PATH,
  EVAL_REPORT_PATH,
  SOURCE_QUEUE_PATH,
  loadModels,
  loadPricing,
  loadProfile,
  loadSources,
  writeBank,
  writeJsonFile,
} from "./io.js";
import { scriptedAiProvider } from "./providers/scripted-ai-provider.js";
import { runPipeline } from "./pipeline/run.js";
import { discardReasonCounts } from "./pipeline/metrics.js";
import { buildEvalSet, runEvalDetection } from "./eval/eval-set.js";

/**
 * The factory CLI (content-factory.md §4). Subcommands `run` and `eval`. It stays
 * a CLI — nothing here runs in a browser. The default provider is the scripted
 * one, so the whole pipeline runs reproducibly with no key; `--provider openai`
 * with `OPENAI_API_KEY` set switches to the real adapter for the deferred paid run.
 */

export type CliDeps = {
  readonly root: string;
  readonly now: string;
  readonly log: (line: string) => void;
  readonly env?: Record<string, string | undefined>;
  /** Overrides provider construction in tests. */
  readonly provider?: AiProvider;
};

export const buildProvider = (
  useOpenAi: boolean,
  deps: CliDeps,
): AiProvider => {
  if (deps.provider) return deps.provider;
  const env = deps.env ?? {};
  if (useOpenAi) {
    const apiKey = env.OPENAI_API_KEY;
    if (apiKey === undefined || apiKey.length === 0) {
      throw new Error("--provider openai needs OPENAI_API_KEY set (BYOK, ADR 2).");
    }
    return openAiProvider({
      apiKey,
      models: loadModels(deps.root),
      pricing: loadPricing(deps.root),
    });
  }
  return scriptedAiProvider();
};

const YIELD_MIN = 0.45;
const YIELD_MAX = 0.75;
const DETECTION_BAR = 0.9;

export const runFactory = async (argv: readonly string[], deps: CliDeps): Promise<number> => {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: {
      provider: { type: "string", default: "scripted" },
      "bank-version": { type: "string", default: "1" },
      "per-class": { type: "string", default: "10" },
    },
  });

  const command = positionals[0] ?? "run";
  const useOpenAi = values.provider === "openai";
  const provider = buildProvider(useOpenAi, deps);
  const profile = loadProfile(deps.root);
  const promptVersion = useOpenAi ? PROMPT_VERSION : "scripted-1";

  if (command === "run") {
    const out = await runPipeline({
      sources: loadSources(deps.root),
      profile,
      provider,
      now: deps.now,
      batchId: `batch-${deps.now.slice(0, 10)}`,
      bankVersion: Number(values["bank-version"]),
      promptVersion,
    });

    writeJsonFile(deps.root, SOURCE_QUEUE_PATH, out.harvest);
    writeBank(deps.root, out.bank);
    writeJsonFile(deps.root, BATCH_REPORT_PATH, out.report);
    // Inspection artefacts: the raw drafts and every discard with its reasons.
    writeJsonFile(deps.root, "content/factory/drafted.json", out.drafted);
    writeJsonFile(deps.root, "content/factory/discards.json", out.review.discarded);

    const y = out.report.stage4Yield;
    deps.log(
      `run: ${String(out.report.counts.itemsPublished)} published / ${String(out.report.counts.itemsDrafted)} drafted, ` +
        `yield ${y.toFixed(3)}, cost/item ${String(out.report.costPerAcceptedItemUsd)} USD`,
    );
    deps.log(`discard reasons: ${JSON.stringify(discardReasonCounts(out.review.discarded))}`);
    if (out.providerFailures > 0) {
      deps.log(`provider failures (malformed responses, skipped): ${String(out.providerFailures)}`);
    }
    const yieldOk = y >= YIELD_MIN && y <= YIELD_MAX;
    if (!yieldOk) deps.log(`WARNING: stage-4 yield ${y.toFixed(3)} is outside [${String(YIELD_MIN)}, ${String(YIELD_MAX)}]`);
    if (!out.validation.keyDistributionOk) deps.log("WARNING: key-position distribution is skewed");
    return yieldOk && out.validation.keyDistributionOk ? 0 : 1;
  }

  if (command === "eval") {
    const report = await runEvalDetection(buildEvalSet(Number(values["per-class"])), provider, profile);
    writeJsonFile(deps.root, EVAL_REPORT_PATH, report);
    deps.log(`eval: overall ${report.overallRate.toFixed(3)}, min class ${report.minClassRate.toFixed(3)}`);
    return report.minClassRate >= DETECTION_BAR ? 0 : 1;
  }

  deps.log(`unknown command: ${command} (expected "run" or "eval")`);
  return 1;
};
