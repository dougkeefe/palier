import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import type { AiProvider } from "@palier/adapters/openai";
import { openAiProvider, PROMPT_VERSION } from "@palier/adapters/openai";

import { reviewRequestFor } from "@palier/domain";
import type { Passage, PassageId } from "@palier/domain";

import {
  AUTHORED_DIR,
  BATCH_REPORT_PATH,
  authoredFiles,
  EVAL_REPORT_PATH,
  SOURCE_QUEUE_PATH,
  bankVersionExists,
  loadModels,
  loadPricing,
  loadProfile,
  latestBankVersionBelow,
  loadAuthored,
  loadItemStatistics,
  loadPublishedBank,
  loadOralSessions,
  loadRecordedReviews,
  loadRetirements,
  loadSources,
  readContribution,
  writeBank,
  writeJsonFile,
} from "./io.js";
import { readability, wordCount } from "./lib/text.js";
import { recordedReviewProvider, reviewRequestHash } from "./providers/recorded-review-provider.js";
import { scriptedAiProvider } from "./providers/scripted-ai-provider.js";
import { authoredIssues } from "./pipeline/authored.js";
import { applyRetirements, applyStatistics } from "./pipeline/carry.js";
import { DEFAULT_PER_SOURCE, runPipeline } from "./pipeline/run.js";
import type { RunInput } from "./pipeline/run.js";
import { discardReasonCounts } from "./pipeline/metrics.js";
import { describeOralStability } from "./eval/oral-stability.js";
import { runEval } from "./eval/report.js";

/**
 * The factory CLI (content-factory.md §4). Subcommands `run` and `eval`. It stays
 * a CLI — nothing here runs in a browser. The default provider is the scripted
 * one, so the whole pipeline runs reproducibly with no key; `--provider openai`
 * with `OPENAI_API_KEY` set switches to the real adapter. `--provider recorded`
 * reviews from the verdicts committed under `content/factory/reviews/` and does nothing
 * else (D204), which is how an authored-only bank is built and rebuilt with no key.
 * `review-requests` writes what those reviewers read; `check-authored` checks a
 * contribution before it merges.
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
  name: string,
  deps: CliDeps,
): AiProvider => {
  if (deps.provider) return deps.provider;
  const env = deps.env ?? {};
  if (name === "recorded") return recordedReviewProvider(loadRecordedReviews(deps.root));
  if (name !== "openai" && name !== "scripted") {
    throw new Error(`unknown provider "${name}" (expected "scripted", "openai" or "recorded")`);
  }
  if (name === "openai") {
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
export const DEFAULT_BANK_VERSION = 4;

/** Where `review-requests` writes the blind requests by default: gitignored, never content. */
export const REVIEW_REQUESTS_PATH = ".palier/review-requests.json";

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
  /** Draft nothing: the batch is the carried bank and the authored content (D203). */
  readonly authoredOnly?: boolean;
};

/**
 * The pipeline's whole input for a run rooted at `root`: the committed profile and
 * sources, the previous bank version carried forward, and the hand-authored
 * contributions under `content/authored/` (content-factory.md §5). The CLI and the
 * committed-bank drift test both build their input here, so they cannot disagree
 * about what produced `content/bank/`.
 */
export const runInputFor = (root: string, options: RunOptions): RunInput => {
  // The latest published version below this one, not just n-1: skipping a number
  // must never drop every id users already hold (architecture.md §5.5).
  const previous = latestBankVersionBelow(root, options.bankVersion);
  const published = previous === null ? null : loadPublishedBank(root, previous);
  // Where a retirement takes effect: the carried bank gains the statistics (D94), then the
  // retirements decided rather than measured (D205).
  const carried =
    published === null
      ? null
      : applyRetirements(
          applyStatistics(published, options.applyItemStatistics === false ? null : loadItemStatistics(root)),
          loadRetirements(root),
        );
  return {
    sources: loadSources(root),
    oralPlan: loadOralSessions(root),
    profile: loadProfile(root),
    provider: options.provider,
    now: options.now,
    batchId: `batch-${options.now.slice(0, 10)}`,
    bankVersion: options.bankVersion,
    promptVersion: options.promptVersion,
    perSource: options.perSource,
    authored: loadAuthored(root),
    ...(options.authoredOnly === true ? { authoredOnly: true } : {}),
    ...(carried === null ? {} : { carried }),
  };
};

/**
 * The blind review requests for the authored items (D204): what `run` will send the
 * reviewer, built the same way, against the authored passages, with each request's hash,
 * which is what a verdict is filed under. Items already answered are left out unless `all`.
 */
export const authoredReviewRequests = (root: string, all: boolean) => {
  const authored = loadAuthored(root);
  const passages = new Map<PassageId, Passage>(authored.passages.map((p) => [p.id, p]));
  const answered = new Set(loadRecordedReviews(root).flatMap((file) => file.verdicts.map((v) => v.requestHash)));
  return authored.items
    .map((item) => {
      const request = reviewRequestFor(item, passages);
      return { requestHash: reviewRequestHash(request), itemId: item.id, request };
    })
    .filter((entry) => all || !answered.has(entry.requestHash));
};

/**
 * Fill each passage's `wordCount` and `readability` in from its body, in place, keeping
 * the file's own key order. The numbers are the factory's to compute, not the author's.
 */
const writeReadability = (path: string): void => {
  const raw = JSON.parse(readFileSync(path, "utf8")) as { passages?: { body?: unknown; wordCount?: number; readability?: unknown }[] };
  for (const passage of raw.passages ?? []) {
    if (typeof passage.body !== "string") continue;
    passage.wordCount = wordCount(passage.body);
    passage.readability = readability(passage.body);
  }
  writeFileSync(path, `${JSON.stringify(raw, null, 2)}\n`);
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
      "authored-only": { type: "boolean", default: false },
      out: { type: "string", default: REVIEW_REQUESTS_PATH },
      all: { type: "boolean", default: false },
      "write-readability": { type: "boolean", default: false },
    },
  });

  const command = positionals[0] ?? "run";

  if (command === "review-requests") {
    const requests = authoredReviewRequests(deps.root, values.all);
    writeJsonFile(deps.root, values.out, requests);
    deps.log(`review-requests: ${String(requests.length)} blind request(s) written to ${values.out}`);
    return 0;
  }

  if (command === "check-authored") {
    const files = positionals.length > 1 ? positionals.slice(1) : null;
    const paths =
      files ?? authoredFiles(deps.root).map((file) => `${AUTHORED_DIR}/${file}`);
    if (values["write-readability"]) for (const file of paths) writeReadability(join(deps.root, file));
    const contributions = paths.map((file) => readContribution(join(deps.root, file), file));
    const content = {
      items: contributions.flatMap((c) => c.items),
      passages: contributions.flatMap((c) => c.passages),
      scenarios: contributions.flatMap((c) => c.scenarios),
    };
    const version = bankVersionExists(deps.root, DEFAULT_BANK_VERSION)
      ? DEFAULT_BANK_VERSION
      : latestBankVersionBelow(deps.root, DEFAULT_BANK_VERSION);
    const bank = (version === null ? null : loadPublishedBank(deps.root, version)) ?? { items: [], passages: [] };
    const issues = authoredIssues(content, bank, loadProfile(deps.root), loadOralSessions(deps.root));
    for (const issue of issues) deps.log(`ISSUE: ${issue}`);
    deps.log(
      `check-authored: ${String(content.items.length)} item(s), ${String(content.passages.length)} passage(s), ` +
        `${String(content.scenarios.length)} scenario(s), ${String(issues.length)} issue(s)`,
    );
    return issues.length === 0 ? 0 : 1;
  }

  const useOpenAi = values.provider === "openai";
  const provider = buildProvider(values.provider, deps);
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
        authoredOnly: values["authored-only"],
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
    if (out.report.authored !== undefined) {
      const { submitted, passed, published } = out.report.authored;
      deps.log(`authored: ${String(published)} published / ${String(submitted)} submitted, ${String(passed)} passed review`);
    }
    deps.log(`discard reasons: ${JSON.stringify(discardReasonCounts(out.review.discarded))}`);
    if (out.providerFailures > 0) {
      deps.log(`provider failures (malformed responses, skipped): ${String(out.providerFailures)}`);
    }
    // Yield measures a drafter. A batch that drafted nothing has none to measure (D203).
    const drafted = out.report.counts.itemsDrafted > 0;
    if (!drafted) deps.log("no items drafted: stage-4 yield does not apply");
    const yieldOk = !drafted || (y >= YIELD_MIN && y <= YIELD_MAX);
    if (!yieldOk) deps.log(`WARNING: stage-4 yield ${y.toFixed(3)} is outside [${String(YIELD_MIN)}, ${String(YIELD_MAX)}]`);
    if (!out.validation.keyDistributionOk) deps.log("WARNING: key-position distribution is skewed");
    if (!formsOk) deps.log(`bank v${String(bankVersion)} not written: its forms failed validation`);
    else deps.log(`bank v${String(bankVersion)}: ${String(out.bank.manifest.counts.items)} items, forms ${out.forms.map((f) => f.id).join(", ")}`);
    deps.log(
      `scenarios: ${String(out.report.counts.scenarios)} new, ${String(out.report.counts.scenariosCarried)} carried, ` +
        `${String(out.scenarioStage.rejected.length)} discarded, ${String(out.scenarioStage.failedCalls)} failed calls`,
    );
    for (const rejection of out.scenarioStage.rejected) deps.log(`SCENARIO ${rejection.id}: ${rejection.reasons.join("; ")}`);
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
    deps.log(describeOralStability(report.oralStability));
    return report.minClassRate >= DETECTION_BAR ? 0 : 1;
  }

  deps.log(`unknown command: ${command} (expected "run" or "eval")`);
  return 1;
};
