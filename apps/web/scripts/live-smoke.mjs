import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

import { PROMPT_VERSION } from "@palier/adapters/openai";

import { runLiveSmoke } from "../src/lib/live-smoke.ts";

/**
 * The nightly live smoke and the fixture recorder (Phase 4 CI gates, progress.md D112): a fixed
 * set of real calls on the key in `OPENAI_API_KEY`, through the adapter and the ledger, the oral
 * turn loop's three (D117) and one session's report (D122) included. It prints
 * the measured tokens per method and per feature, and the `features` block that replaces
 * `pricing.json`'s typical figures (D103). The key is read from the environment and handed to the
 * vault; it is never printed.
 *
 * - **No key: it says so and exits 0**, because the nightly lane runs it only when the
 *   `OPENAI_SMOKE_KEY` secret is set, and a fork without the secret is not a failure.
 * - **A failed call, or a configured model OpenAI no longer lists, exits 1**, so the nightly
 *   lane opens its issue.
 * - **`--record`** (or `LIVE_SMOKE_RECORD=1`, for a shell or a chat that mangles `--`) writes each completion to `packages/testing/src/recorded/openai/`, one file per
 *   method, as the schema-conformance fixtures. The files hold the message content and the token
 *   counts, never a header, an id or the key.
 *
 * Runs under Node's type stripping, as `billing-check.mjs` does; build the packages first
 * (`turbo run build --filter=@palier/web^...`).
 */
const require = createRequire(import.meta.url);

export const RECORDED_DIR = new URL("../../../packages/testing/src/recorded/openai/", import.meta.url);

const usd = (amount) => `US$${amount.toFixed(6)}`;

/**
 * The `pricing.json` `features` block a run measured: a typical use of each feature, as its calls.
 * `oral-assessment` is left out: the smoke's session is short, so its report is no typical one, and
 * pricing takes a real session's (docs/deploy.md; progress.md D127). The diagnostic's interpretation is
 * in: the smoke's run is a whole one, so its call is a typical one (ADR 25).
 */
export const measuredFeatures = (result) => ({
  "writing-feedback": [
    { role: "assess", inputTokens: result.byMethod.assessWriting.inputTokens, outputTokens: result.byMethod.assessWriting.outputTokens },
  ],
  "item-generation": [
    { role: "draft", inputTokens: result.byMethod.generateItems.inputTokens, outputTokens: result.byMethod.generateItems.outputTokens },
    {
      role: "review",
      inputTokens: result.byMethod.reviewItem.inputTokens * result.byMethod.reviewItem.calls,
      outputTokens: result.byMethod.reviewItem.outputTokens * result.byMethod.reviewItem.calls,
    },
  ],
  "diagnostic-interpretation": [
    {
      role: "assess",
      inputTokens: result.byMethod.interpretDiagnostic.inputTokens,
      outputTokens: result.byMethod.interpretDiagnostic.outputTokens,
    },
  ],
});

/** Every method the recorder keeps, the oral turn loop's three (D117) and the report (D122) included. */
const RECORDED_METHODS = [
  "generateItems",
  "reviewItem",
  "assessWriting",
  "examinerTurn",
  "transcribe",
  "speak",
  "assessOral",
  "interpretDiagnostic",
];

/** The profile's oral level descriptors in English, which the report's prompt quotes (ADR 9). */
export const englishDescriptors = (profile) =>
  Object.fromEntries(Object.entries(profile.oral.descriptors).map(([band, text]) => [band, text.en]));

/** The fixture files a run records, one per method it made a call of, as `{ path, content }`. */
export const recordings = (result) =>
  RECORDED_METHODS.filter((method) => result.completions.some((c) => c.method === method)).map((method) => ({
    name: `${method}.json`,
    content: `${JSON.stringify(
      {
        note: "Recorded from the live API by `pnpm --filter @palier/web live-smoke --record` (progress.md D112). Regenerate, never hand-edit.",
        recordedAt: result.startedAt,
        promptVersion: PROMPT_VERSION,
        completions: result.completions.filter((c) => c.method === method),
      },
      null,
      2,
    )}\n`,
  }));

/**
 * The whole script, testable: returns the exit code.
 *
 * @param {{
 *   argv?: readonly string[],
 *   env?: Record<string, string | undefined>,
 *   log?: (line: string) => void,
 *   error?: (line: string) => void,
 *   write?: (name: string, content: string) => void,
 *   fetchImpl?: import("@palier/adapters/openai").FetchLike,
 * }} [options]
 * @returns {Promise<number>}
 */
export const main = async ({
  argv = process.argv.slice(2),
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
    log("live-smoke: skipped. OPENAI_API_KEY is not set, so no live call was made (docs/deploy.md, OPENAI_SMOKE_KEY).");
    return 0;
  }
  const { note: _models, voice, ...roles } = require("../src/lib/ai-models.json");
  const pricing = require("../src/lib/pricing.json");
  const prompts = require("@palier/content/writing/prompts.json");
  const profile = require("@palier/content/profiles/psc-sle.json");
  let result;
  try {
    result = await runLiveSmoke({
      apiKey: apiKey.trim(),
      models: {
        passage: roles.passage,
        draft: roles.draft,
        review: roles.review,
        assess: roles.assess,
        transcribe: roles.transcribe,
        speech: roles.speech,
        examiner: roles.examiner,
        realtime: roles.realtime,
      },
      voice,
      prices: pricing.models,
      descriptors: englishDescriptors(profile),
      prompts,
      ...(fetchImpl === undefined ? {} : { fetchImpl }),
    });
  } catch (failure) {
    const name = failure instanceof Error ? failure.name : "Error";
    error(`live-smoke: a live call failed with ${name}, the adapter's own name for the fault. Nothing was recorded.`);
    return 1;
  }
  if (result.missingModels.length > 0) {
    error(`live-smoke: OpenAI no longer lists ${result.missingModels.join(", ")}. Update src/lib/ai-models.json. No other call was made.`);
    return 1;
  }
  for (const [method, m] of Object.entries(result.byMethod)) {
    log(`${method}: ${String(m.calls)} call(s), average in ${String(m.inputTokens)}  out ${String(m.outputTokens)}`);
  }
  for (const [feature, f] of Object.entries(result.byFeature)) {
    log(`${feature}: ${String(f.calls)} call(s), in ${String(f.inputTokens)}  out ${String(f.outputTokens)}  ${usd(f.costUsd)}`);
  }
  const conformant = result.completions.filter((c) => c.conformant).length;
  log(`completions: ${String(result.completions.length)}, ${String(conformant)} accepted on the first try`);
  log(`measured features for pricing.json: ${JSON.stringify(measuredFeatures(result))}`);
  log(
    `oral-assessment, on the smoke's short fixed session, NOT a typical report, do not copy into pricing.json: in ${String(result.byMethod.assessOral.inputTokens)}  out ${String(result.byMethod.assessOral.outputTokens)}`,
  );
  log("oral-practice is priced per minute of a session, which Phase 5 Slice 3 measures; the per-call figures above are its parts (D117).");
  if (argv.includes("--record") || env.LIVE_SMOKE_RECORD === "1") {
    for (const file of recordings(result)) write(file.name, file.content);
    log(`recorded ${String(result.completions.length)} completion(s) to packages/testing/src/recorded/openai/`);
  }
  return 0;
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(await main());
