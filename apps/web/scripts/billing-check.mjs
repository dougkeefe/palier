import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

import { runBillingCheck } from "../src/lib/billing-check.ts";

/**
 * Gate G (progress.md D97, docs/deploy.md): run a fixed handful of real calls on the funded
 * key in `OPENAI_API_KEY`, through the adapter and the ledger, and print what the meter says,
 * to compare with OpenAI's usage page for the same minutes. The key is read from the
 * environment and handed to the vault; it is never printed.
 *
 * Runs under Node's type stripping, as `item-statistics.mjs` does; build the packages first
 * (`turbo run build --filter=@palier/web^...`).
 */
const require = createRequire(import.meta.url);

const usd = (amount) => `US$${amount.toFixed(6)}`;

/**
 * The whole script, testable: returns the exit code.
 *
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   log?: (line: string) => void,
 *   error?: (line: string) => void,
 *   now?: () => string,
 * }} [options]
 * @returns {Promise<number>}
 */
export const main = async ({ env = process.env, log = console.log, error = console.error, now } = {}) => {
  const apiKey = env.OPENAI_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    error("billing-check: OPENAI_API_KEY is not set. Gate G needs a funded test key; see docs/deploy.md.");
    return 1;
  }
  const { note: _models, ...roles } = require("../src/lib/ai-models.json");
  const pricing = require("../src/lib/pricing.json");
  const result = await runBillingCheck({
    apiKey: apiKey.trim(),
    models: { passage: roles.passage, draft: roles.draft, review: roles.review },
    prices: pricing.models,
    ...(now === undefined ? {} : { now }),
  });
  for (const call of result.calls) {
    log(
      `${call.ts}  ${call.model}  in ${String(call.inputTokens)}  out ${String(call.outputTokens)}  ` +
        (call.costUsd === null ? "unpriced" : usd(call.costUsd)),
    );
  }
  log(`calls: ${String(result.calls.length)}  input tokens: ${String(result.inputTokens)}  output tokens: ${String(result.outputTokens)}`);
  log(`the meter says: ${usd(result.meterUsd)} this month, from these calls alone`);
  log(`window (UTC): ${result.startedAt} to ${result.endedAt}`);
  log("Compare with OpenAI's usage page for this key and window, once it has caught up (it can lag by minutes).");
  return 0;
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(await main());
