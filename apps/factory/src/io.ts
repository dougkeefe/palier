import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { itemStatisticsReportSchema, parseExamProfileOrThrow } from "@palier/domain";
import { ORAL_SESSION_TYPES } from "@palier/domain";
import type { ExamForm, ExamProfile, Item, ItemStatisticsReport, OralScenario, Passage } from "@palier/domain";
import type { OpenAiModels, OpenAiPricing } from "@palier/adapters/openai";

import type { RecordedRunData } from "./eval/conformance.js";
import { canonicalStringify } from "./lib/json.js";
import type { OralSessionPlan, SourceCandidate } from "./lib/types.js";
import type { BankBuild, BankManifest } from "./pipeline/bank-build.js";
import type { CarriedBank } from "./pipeline/run.js";

/**
 * The factory's only file I/O — kept out of the pipeline so the stages stay pure
 * and testable. Paths are resolved under a `root` (the repo root by default) so a
 * test can point the whole thing at a temp directory. Everything written is
 * canonical JSON, so a rebuild is byte-identical.
 */

export const PROFILE_PATH = "content/profiles/psc-sle.json";
export const SOURCES_PATH = "content/factory/sources.seed.json";
/** The oral sessions a batch plans scenarios for (progress.md D114). */
export const ORAL_SESSIONS_PATH = "content/factory/oral-sessions.json";
export const MODELS_PATH = "apps/factory/config/models.json";
export const PRICING_PATH = "apps/factory/config/pricing.json";
export const SOURCE_QUEUE_PATH = "content/factory/source-queue.json";
export const BATCH_REPORT_PATH = "content/factory/batch-report.json";
export const EVAL_REPORT_PATH = "content/factory/eval-report.json";
/**
 * The live API's recorded completions (progress.md D112), written by `apps/web`'s live smoke
 * with `--record` into `@palier/testing`. Read here by path, since the factory may not import
 * that package; the eval reports its schema-conformance rate from them.
 */
export const RECORDED_COMPLETIONS_DIR = "packages/testing/src/recorded/openai";
/** Written by the monthly statistics job in `apps/web` (progress.md D94), read here. */
export const ITEM_STATISTICS_PATH = "content/factory/item-statistics.json";

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

export const loadProfile = (root: string): ExamProfile =>
  parseExamProfileOrThrow(readJson(join(root, PROFILE_PATH)));

export const loadSources = (root: string): SourceCandidate[] =>
  readJson(join(root, SOURCES_PATH)) as SourceCandidate[];

export const loadModels = (root: string): OpenAiModels => {
  const raw = readJson(join(root, MODELS_PATH)) as Record<string, string>;
  return {
    passage: raw.passage!,
    draft: raw.draft!,
    review: raw.review!,
    ...(raw.scenario === undefined ? {} : { scenario: raw.scenario }),
  };
};

/**
 * The oral session plan, shape-checked, because a session length that is not a positive
 * number, or a type the domain does not know, would build scenarios no client can run.
 */
export const loadOralSessions = (root: string): OralSessionPlan => {
  const raw = readJson(join(root, ORAL_SESSIONS_PATH)) as Partial<Record<keyof OralSessionPlan, unknown>>;
  const { lang, bands, sessions } = raw;
  if (lang !== "fr" && lang !== "en") throw new Error(`${ORAL_SESSIONS_PATH}: lang must be "fr" or "en"`);
  if (!Array.isArray(bands) || bands.length === 0 || !bands.every((b) => b === "B" || b === "C")) {
    throw new Error(`${ORAL_SESSIONS_PATH}: bands must list B and/or C`);
  }
  if (!Array.isArray(sessions) || sessions.length === 0) throw new Error(`${ORAL_SESSIONS_PATH}: sessions must be a list`);
  for (const [index, session] of (sessions as Partial<Record<"sessionType" | "minutes", unknown>>[]).entries()) {
    const known = (ORAL_SESSION_TYPES as readonly unknown[]).includes(session.sessionType);
    if (!known || typeof session.minutes !== "number" || !(session.minutes > 0)) {
      throw new Error(`${ORAL_SESSIONS_PATH}: session ${String(index)} needs a known sessionType and positive minutes`);
    }
  }
  return raw as OralSessionPlan;
};

export const loadPricing = (root: string): OpenAiPricing => {
  const raw = readJson(join(root, PRICING_PATH)) as Record<string, unknown>;
  const pricing: Record<string, { inputPerMTok: number; outputPerMTok: number }> = {};
  for (const [model, value] of Object.entries(raw)) {
    if (value !== null && typeof value === "object" && "inputPerMTok" in value) {
      pricing[model] = value as { inputPerMTok: number; outputPerMTok: number };
    }
  }
  return pricing;
};

/**
 * The latest item-statistics report, or `null` before the first one exists. A report
 * that does not parse throws: it decides which items retire, so a damaged one must stop
 * the build rather than be read as "retire nothing".
 */
export const loadItemStatistics = (root: string): ItemStatisticsReport | null => {
  const path = join(root, ITEM_STATISTICS_PATH);
  if (!existsSync(path)) return null;
  return itemStatisticsReportSchema.parse(readJson(path)) as unknown as ItemStatisticsReport;
};

const RECORDED_METHODS = new Set(["generateItems", "reviewItem", "assessWriting"]);

/**
 * Every recorded run, sorted by file name. A file that is not a run, or a completion that is not
 * a whole recorded completion, fails loudly rather than quietly moving the rate (the same checks
 * `@palier/testing`'s `runOf` makes for the replay gate).
 */
export const loadRecordedRuns = (root: string): RecordedRunData[] => {
  const dir = join(root, RECORDED_COMPLETIONS_DIR);
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const raw = readJson(join(dir, file)) as { promptVersion?: unknown; completions?: unknown };
      if (typeof raw.promptVersion !== "string" || !Array.isArray(raw.completions)) {
        throw new Error(`${file} is not a recorded run`);
      }
      for (const [index, c] of (raw.completions as Partial<Record<keyof RecordedRunData["completions"][number], unknown>>[]).entries()) {
        if (
          !RECORDED_METHODS.has(c.method as string) ||
          typeof c.model !== "string" ||
          typeof c.content !== "string" ||
          typeof c.attempt !== "number" ||
          typeof c.request !== "object" ||
          c.request === null
        ) {
          throw new Error(`${file}: completion ${String(index)} is not a recorded completion`);
        }
      }
      return { file, promptVersion: raw.promptVersion, completions: raw.completions as RecordedRunData["completions"] };
    });
};

export const writeJsonFile = (root: string, relPath: string, data: unknown): void => {
  const path = join(root, relPath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, canonicalStringify(data));
};

const bankDir = (root: string, version: number): string => join(root, "content", "bank", `v${String(version)}`);

/** Whether a bank version has already been written. A published version is immutable. */
export const bankVersionExists = (root: string, version: number): boolean =>
  existsSync(join(bankDir(root, version), "manifest.json"));

/** The highest bank version below `version` that has been written, or `null`. */
export const latestBankVersionBelow = (root: string, version: number): number | null => {
  for (let v = version - 1; v >= 1; v--) if (bankVersionExists(root, v)) return v;
  return null;
};

/**
 * A published bank version's items, passages, forms and scenarios, read back through its
 * manifest, or `null` when that version was never written. The next version carries them
 * (D82, D114). v1 lists no forms and v1 and v2 no scenarios, which read as none.
 */
export const loadPublishedBank = (root: string, version: number): CarriedBank | null => {
  if (!bankVersionExists(root, version)) return null;
  const manifest = readJson(join(bankDir(root, version), "manifest.json")) as Partial<BankManifest> &
    Pick<BankManifest, "shards" | "passageShards">;
  const file = (path: string): unknown => readJson(join(root, "content", path));
  return {
    items: manifest.shards.flatMap((s) => file(s.path) as unknown[]) as Item[],
    passages: manifest.passageShards.flatMap((s) => file(s.path) as unknown[]) as Passage[],
    forms: (manifest.forms ?? []).map((f) => file(f.path) as ExamForm),
    scenarios: manifest.scenarios ? (file(manifest.scenarios.path) as OralScenario[]) : [],
  };
};

export const writeBank = (root: string, bank: BankBuild): void => {
  // Clear this version's directory first, so a rebuild leaves no stale,
  // content-hashed shards from an earlier run behind (the bank is additive
  // across versions, so only v{n} is cleared, never sibling versions).
  rmSync(bankDir(root, bank.version), { recursive: true, force: true });
  for (const file of bank.files) {
    const path = join(root, "content", file.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, file.content);
  }
};
