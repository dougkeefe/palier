import { parseArgs } from "node:util";

import type { AiProvider } from "@palier/adapters/openai";
import { openAiProvider, PROMPT_VERSION } from "@palier/adapters/openai";

import {
  BATCH_REPORT_PATH,
  EVAL_REPORT_PATH,
  SOURCE_QUEUE_PATH,
  bankVersionExists,
  loadModels,
  loadPricing,
  loadProfile,
  latestBankVersionBelow,
  loadItemStatistics,
  loadPublishedBank,
  loadSources,
  writeBank,
  writeJsonFile,
} from "./io.js";
import { scriptedAiProvider } from "./providers/scripted-ai-provider.js";
import { applyStatistics } from "./pipeline/carry.js";
import { DEFAULT_PER_SOURCE, runPipeline } from "./pipeline/run.js";
import type { RunInput } from "./pipeline/run.js";
import { discardReasonCounts } from "./pipeline/metrics.js";
import { runEval } from "./eval/report.js";

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

/** The prompt version the scripted provider's items record. */
export const SCRIPTED_PROMPT_VERSION = "scripted-1";

/** The bank version a plain `palier-factory run` writes: the next one to publish. */
export const DEFAULT_BANK_VERSION = 2;

export type RunOptions = {
  readonly now: string;
  readonly bankVersion: number;
  readonly perSource: number;
  readonly provider: AiProvider;
  readonly promptVersion: string;
  /**
   * Apply `content/factory/item-statistics.json` to the carried bank (the default).
   * Off only to reproduce a version built before the report existed.
   */
  readonly applyItemStatistics?: boolean;
};

/**
 * The pipeline's whole input for a run rooted at `root`: the committed profile and
 * sources, and the previous bank version carried forward. The CLI and the
 * committed-bank drift test both build their input here, so they cannot disagree
 * about what produced `content/bank/`.
 */
export const runInputFor = (root: string, options: RunOptions): RunInput => {
  // The latest published version below this one, not just n-1: skipping a number
  // must never drop every id users already hold (architecture.md §5.5).
  const previous = latestBankVersionBelow(root, options.bankVersion);
  const published = previous === null ? null : loadPublishedBank(root, previous);
  // Where a retirement takes effect: the carried bank gains the statistics (D94).
  const carried =
    published === null ? null : applyStatistics(published, options.applyItemStatistics === false ? null : loadItemStatistics(root));
  return {
    sources: loadSources(root),
    profile: loadProfile(root),
    provider: options.provider,
    now: options.now,
    batchId: `batch-${options.now.slice(0, 10)}`,
    bankVersion: options.bankVersion,
    promptVersion: options.promptVersion,
    perSource: options.perSource,
    ...(carried === null ? {} : { carried }),
  };
};

const positiveInteger = (value: string | undefined): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
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
      "bank-version": { type: "string", default: String(DEFAULT_BANK_VERSION) },
      "per-source": { type: "string", default: String(DEFAULT_PER_SOURCE) },
      force: { type: "boolean", default: false },
      "per-class": { type: "string", default: "10" },
    },
  });

  const command = positionals[0] ?? "run";
  const useOpenAi = values.provider === "openai";
  const provider = buildProvider(useOpenAi, deps);
  const promptVersion = useOpenAi ? PROMPT_VERSION : SCRIPTED_PROMPT_VERSION;

  if (command === "run") {
    const bankVersion = positiveInteger(values["bank-version"]);
    const perSource = positiveInteger(values["per-source"]);
    if (bankVersion === null || perSource === null) {
      deps.log(
        `--bank-version and --per-source take a positive integer (got ${String(values["bank-version"])} and ${String(values["per-source"])})`,
      );
      return 1;
    }
    // A published bank version is immutable (architecture.md §5.5): users' clients
    // and exam results point into it. Rewriting one takes an explicit --force.
    if (bankVersionExists(deps.root, bankVersion) && !values.force) {
      deps.log(
        `refusing to overwrite content/bank/v${String(bankVersion)}: a published bank version is immutable. ` +
          `Pass --bank-version ${String(bankVersion + 1)} for a new one, or --force to rebuild it.`,
      );
      return 1;
    }
    const out = await runPipeline(
      runInputFor(deps.root, {
        now: deps.now,
        bankVersion,
        perSource,
        provider,
        promptVersion,
      }),
    );

    writeJsonFile(deps.root, SOURCE_QUEUE_PATH, out.harvest);
    writeJsonFile(deps.root, BATCH_REPORT_PATH, out.report);
    // Inspection artefacts: the raw drafts and every discard with its reasons.
    writeJsonFile(deps.root, "content/factory/drafted.json", out.drafted);
    writeJsonFile(deps.root, "content/factory/discards.json", out.review.discarded);
    // A bank whose forms are wrong or missing is never written: a form is immutable
    // once published, and every result scored against it would inherit the fault.
    const formsOk = out.validation.formIssues.length === 0;
    if (formsOk) writeBank(deps.root, out.bank);
    else for (const issue of out.validation.formIssues) deps.log(`FORM: ${issue}`);

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
    if (!formsOk) deps.log(`bank v${String(bankVersion)} not written: its forms failed validation`);
    else deps.log(`bank v${String(bankVersion)}: ${String(out.bank.manifest.counts.items)} items, forms ${out.forms.map((f) => f.id).join(", ")}`);
    return yieldOk && out.validation.keyDistributionOk && formsOk ? 0 : 1;
  }

  if (command === "eval") {
    const report = await runEval(deps.root, provider, Number(values["per-class"]));
    writeJsonFile(deps.root, EVAL_REPORT_PATH, report);
    deps.log(`eval: overall ${report.overallRate.toFixed(3)}, min class ${report.minClassRate.toFixed(3)}`);
    const { promptVersion, rate, measuredOn } = report.schemaConformance;
    deps.log(
      rate === null
        ? `schema conformance: no recorded run on prompt v${promptVersion}; re-record (docs/deploy.md)`
        : `schema conformance on prompt v${promptVersion}: ${rate.toFixed(3)} over ${measuredOn.join(", ")}`,
    );
    return report.minClassRate >= DETECTION_BAR ? 0 : 1;
  }

  deps.log(`unknown command: ${command} (expected "run" or "eval")`);
  return 1;
};
