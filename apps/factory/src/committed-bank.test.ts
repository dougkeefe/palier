import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { DEFAULT_BANK_VERSION, SCRIPTED_PROMPT_VERSION, runInputFor } from "./cli.js";
import { BATCH_REPORT_PATH, loadProfile } from "./io.js";
import { canonicalStringify } from "./lib/json.js";
import type { BatchReport } from "./lib/types.js";
import { DEFAULT_PER_SOURCE, runPipeline } from "./pipeline/run.js";
import { scriptedAiProvider } from "./providers/scripted-ai-provider.js";

/**
 * The committed bank is exactly what a plain `palier-factory run` produces from the
 * committed inputs: the profile, the source seed, the previous bank version it
 * carries, and the batch's timestamp (read back from the committed report). A hand
 * edit to a shard, a stale regeneration, or a provider change that was not followed
 * by a regeneration fails here (content-factory.md §4.6: a bank that is not
 * byte-reproducible cannot be audited).
 */

const REPO = process.cwd();
const BANK_DIR = join(REPO, "content", "bank", `v${String(DEFAULT_BANK_VERSION)}`);

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(join(dir, entry.name)) : [join(dir, entry.name)],
  );

// One pipeline run, shared by every test below: it is the heaviest thing in the fast lane.
let memo: ReturnType<typeof runOnce> | undefined;
const rerun = () => (memo ??= runOnce());

const runOnce = async () => {
  const committed = JSON.parse(readFileSync(join(REPO, BATCH_REPORT_PATH), "utf8")) as BatchReport;
  return {
    committed,
    out: await runPipeline(
      runInputFor(REPO, {
        now: committed.generatedAt,
        bankVersion: DEFAULT_BANK_VERSION,
        perSource: DEFAULT_PER_SOURCE,
        provider: scriptedAiProvider(),
        promptVersion: SCRIPTED_PROMPT_VERSION,
        // v2 was built on 24 September 2026, before any item-statistics report existed
        // (progress.md D94). A later report applies to the next version, never to v2.
        applyItemStatistics: false,
      }),
    ),
  };
};

describe(`the committed bank (content/bank/v${String(DEFAULT_BANK_VERSION)})`, () => {
  it("is byte-identical to a fresh run of the pipeline, file for file", async () => {
    const { out } = await rerun();
    const onDisk = filesUnder(BANK_DIR)
      .map((path) => ({ path: relative(join(REPO, "content"), path).split(sep).join("/"), content: readFileSync(path, "utf8") }))
      .sort((a, b) => (a.path < b.path ? -1 : 1));
    const rebuilt = [...out.bank.files].sort((a, b) => (a.path < b.path ? -1 : 1));
    expect(onDisk.map((f) => f.path)).toEqual(rebuilt.map((f) => f.path));
    for (const [i, file] of rebuilt.entries()) expect(onDisk[i]!.content, file.path).toBe(file.content);
  });

  it("matches the committed batch report", async () => {
    const { committed, out } = await rerun();
    expect(canonicalStringify(out.report)).toBe(canonicalStringify(committed));
  });

  it("ships a clean form for every profile variant", async () => {
    const { out } = await rerun();
    expect(out.validation.formIssues).toEqual([]);
    expect(out.forms).toHaveLength(Object.keys(loadProfile(REPO).variants).length);
    expect(out.bank.manifest.forms.map((f) => f.id)).toEqual(out.forms.map((f) => f.id).sort());
  });
});
