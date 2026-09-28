import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

import { PROMPT_VERSION } from "@palier/adapters/openai";

import { ORAL_STABILITY_RUNS, runOralStability } from "../src/lib/live-smoke.ts";
import { RECORDED_DIR, englishDescriptors } from "./live-smoke.mjs";

/**
 * The scoring-stability recording (Phase 5 exit criterion 4, progress.md D126): one fixed session
 * scored five times on the key in `OPENAI_API_KEY`, through the adapter and the ledger, written to
 * `packages/testing/src/recorded/openai/assessOral-stability.json`. The factory's eval reads it and
 * reports how far each criterion's band moved (`palier-factory eval`). About five report calls,
 * a few cents. Run by the human from their own terminal, as the other recordings are:
 *
 *   OPENAI_API_KEY=… pnpm --filter @palier/web oral-stability
 *
 * - **No key: it says so and exits 0.**
 * - **A report the adapter refuses twice is recorded and counted**, so the eval sees a scorer that
 *   fails one report in five rather than a re-run that hides it (progress.md D127).
 * - **Any other failed call exits 1 and writes nothing** (a refused key, an unreachable service), so a
 *   half run never becomes the fixture.
 *
 * Runs under Node's type stripping, as `live-smoke.mjs` does; build the packages first.
 */
const require = createRequire(import.meta.url);

/**
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   log?: (line: string) => void,
 *   error?: (line: string) => void,
 *   write?: (name: string, content: string) => void,
 *   fetchImpl?: import("@palier/adapters/openai").FetchLike,
 * }} [options]
 * @returns {Promise<number>}
 */
export const main = async ({
  env = process.env,
  log = console.log,
  error = console.error,
  write = (name, content) => {
    mkdirSync(RECORDED_DIR, { recursive: true });
    writeFileSync(new URL(name, RECORDED_DIR), content);
  },
  fetchImpl,
} = {}) => {
  const apiKey = env.OPENAI_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    log("oral-stability: skipped. OPENAI_API_KEY is not set, so no live call was made.");
    return 0;
  }
  const { note: _models, voice: _voice, ...roles } = require("../src/lib/ai-models.json");
  const pricing = require("../src/lib/pricing.json");
  const profile = require("@palier/content/profiles/psc-sle.json");
  let result;
  try {
    result = await runOralStability({
      apiKey: apiKey.trim(),
      models: { passage: roles.passage, draft: roles.draft, review: roles.review, assess: roles.assess },
      prices: pricing.models,
      descriptors: englishDescriptors(profile),
      ...(fetchImpl === undefined ? {} : { fetchImpl }),
    });
  } catch (failure) {
    const name = failure instanceof Error ? failure.name : "Error";
    error(`oral-stability: a live call failed with ${name}, the adapter's own name for the fault. Nothing was recorded.`);
    return 1;
  }
  const cost = result.calls.reduce((sum, c) => sum + (c.costUsd ?? 0), 0);
  write(
    "assessOral-stability.json",
    `${JSON.stringify(
      {
        note: "Recorded from the live API by `pnpm --filter @palier/web oral-stability` (progress.md D126): one session scored five times. Regenerate, never hand-edit.",
        recordedAt: result.startedAt,
        promptVersion: PROMPT_VERSION,
        completions: result.completions,
      },
      null,
      2,
    )}\n`,
  );
  const given = ORAL_STABILITY_RUNS - result.failedCalls;
  log(`recorded ${String(given)} report(s) of ${String(ORAL_STABILITY_RUNS)}, ${String(result.completions.length)} completion(s), US$${cost.toFixed(6)}`);
  if (result.failedCalls > 0) {
    log(`${String(result.failedCalls)} call(s) gave no report after the adapter's retry; they are recorded, and the eval counts them as failed runs.`);
  }
  log("now run `pnpm --filter @palier/factory exec palier-factory eval` to read the stability.");
  return 0;
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(await main());
