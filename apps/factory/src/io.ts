import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { parseExamProfileOrThrow } from "@palier/domain";
import type { ExamProfile } from "@palier/domain";
import type { OpenAiModels, OpenAiPricing } from "@palier/adapters/openai";

import { canonicalStringify } from "./lib/json.js";
import type { SourceCandidate } from "./lib/types.js";
import type { BankBuild } from "./pipeline/bank-build.js";

/**
 * The factory's only file I/O — kept out of the pipeline so the stages stay pure
 * and testable. Paths are resolved under a `root` (the repo root by default) so a
 * test can point the whole thing at a temp directory. Everything written is
 * canonical JSON, so a rebuild is byte-identical.
 */

export const PROFILE_PATH = "content/profiles/psc-sle.json";
export const SOURCES_PATH = "content/factory/sources.seed.json";
export const MODELS_PATH = "apps/factory/config/models.json";
export const PRICING_PATH = "apps/factory/config/pricing.json";
export const SOURCE_QUEUE_PATH = "content/factory/source-queue.json";
export const BATCH_REPORT_PATH = "content/factory/batch-report.json";
export const EVAL_REPORT_PATH = "content/factory/eval-report.json";

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

export const loadProfile = (root: string): ExamProfile =>
  parseExamProfileOrThrow(readJson(join(root, PROFILE_PATH)));

export const loadSources = (root: string): SourceCandidate[] =>
  readJson(join(root, SOURCES_PATH)) as SourceCandidate[];

export const loadModels = (root: string): OpenAiModels => {
  const raw = readJson(join(root, MODELS_PATH)) as Record<string, string>;
  return { passage: raw.passage!, draft: raw.draft!, review: raw.review! };
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

export const writeJsonFile = (root: string, relPath: string, data: unknown): void => {
  const path = join(root, relPath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, canonicalStringify(data));
};

export const writeBank = (root: string, bank: BankBuild): void => {
  // Clear this version's directory first, so a rebuild leaves no stale,
  // content-hashed shards from an earlier run behind (the bank is additive
  // across versions, so only v{n} is cleared, never sibling versions).
  rmSync(join(root, "content", "bank", `v${String(bank.version)}`), { recursive: true, force: true });
  for (const file of bank.files) {
    const path = join(root, "content", file.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, file.content);
  }
};
