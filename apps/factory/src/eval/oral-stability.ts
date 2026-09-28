import { PROMPT_VERSION, openAiProvider } from "@palier/adapters/openai";
import type { FetchLike } from "@palier/adapters/openai";
import type { Band, OralAssessment, OralCriterion, OralRequest } from "@palier/domain";
import { ORAL_CRITERIA, bandRank } from "@palier/domain";

import type { RecordedCompletionData, RecordedRunData } from "./conformance.js";

/**
 * The oral scorer's stability (Phase 5 exit criterion 4, progress.md D126): the same session
 * scored several times, recorded live by `pnpm --filter @palier/web oral-stability` into
 * `assessOral-stability.json`, never hand-written (D112). An unstable scorer undermines the
 * whole report, because a user compares one session to the next.
 *
 * For each criterion, over the reports the adapter accepted:
 * - **the spread** is how many PSC levels apart the highest and lowest band are;
 * - **the agreement** is the share of reports that gave the most common band.
 *
 * It passes when the recording was made on the prompts that ship, every one of at least
 * `ORAL_STABILITY_MIN_RUNS` calls gave a report, and every criterion's spread is at most one level
 * and its agreement **at or above** `ORAL_STABILITY_AGREEMENT`. Both are **eval parameters, not
 * profile data** (ADR 9): the PSC publishes nothing about a practice tool's scorer.
 *
 * **A run is a call, not a reply** (progress.md D127): a completion with `attempt` 1 starts one, a
 * retry belongs to it, and the call's report is its last reply the adapter accepts. A call with no
 * accepted reply is a failed run, which fails the eval: a report the user could not have had is not
 * a stable one.
 */

/** The file the stability recording writes. */
export const ORAL_STABILITY_FILE = "assessOral-stability.json";

/** How many reports of the one session exit criterion 4 asks for. */
export const ORAL_STABILITY_MIN_RUNS = 5;

/** The per-criterion agreement a stable scorer reaches: four reports in five on one band. */
export const ORAL_STABILITY_AGREEMENT = 0.8;

/** The most a criterion's band may move across the reports: one PSC level. */
export const ORAL_STABILITY_MAX_SPREAD = 1;

export type CriterionStability = {
  readonly bands: readonly Band[];
  readonly spread: number;
  readonly agreement: number;
};

export type OralStabilityReport = {
  readonly file: string;
  readonly promptVersion: string;
  /** Whether the recording was made on the prompts that ship; an older one is stale evidence. */
  readonly current: boolean;
  /** Calls recorded: each a report asked for once, its retry included. */
  readonly runs: number;
  /** Calls whose every reply the adapter refused, so no report came of them. */
  readonly failedRuns: number;
  readonly byCriterion: Readonly<Record<OralCriterion, CriterionStability>>;
  readonly agreementThreshold: number;
  readonly maxSpread: number;
  readonly passed: boolean;
};

/** The report a recorded completion replays to, through the adapter, or `null` when it refuses it. */
const replay = async (completion: RecordedCompletionData): Promise<OralAssessment | null> => {
  const fetchImpl: FetchLike = () =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ choices: [{ message: { content: completion.content } }], usage: completion.usage }),
      text: () => Promise.resolve(""),
    });
  const { model } = completion;
  const provider = openAiProvider({
    apiKey: "sk-replay-not-a-key",
    models: { passage: model, draft: model, review: model, assess: model },
    fetchImpl,
    maxRetries: 0,
  });
  return provider.assessOral(completion.request as OralRequest).then(
    (report) => report,
    () => null,
  );
};

const stabilityOf = (bands: readonly Band[]): CriterionStability => {
  const ranks = bands.map(bandRank);
  const counts = new Map<Band, number>();
  for (const band of bands) counts.set(band, (counts.get(band) ?? 0) + 1);
  const modal = Math.max(0, ...counts.values());
  return {
    bands,
    spread: ranks.length === 0 ? 0 : Math.max(...ranks) - Math.min(...ranks),
    agreement: bands.length === 0 ? 0 : modal / bands.length,
  };
};

/** The recording's calls: an `attempt` 1 opens one, and its retry is part of it. */
const callsOf = (completions: readonly RecordedCompletionData[]): RecordedCompletionData[][] => {
  const calls: RecordedCompletionData[][] = [];
  for (const completion of completions) {
    const call = calls.at(-1);
    if (completion.attempt === 1 || call === undefined) calls.push([completion]);
    else call.push(completion);
  }
  return calls;
};

/** A call's report: its last reply the adapter accepts, or `null` when it accepts none. */
const reportOf = async (call: readonly RecordedCompletionData[]): Promise<OralAssessment | null> => {
  const replayed = await Promise.all(call.map(replay));
  return replayed.filter((report): report is OralAssessment => report !== null).at(-1) ?? null;
};

/**
 * The stability of the recorded reports, or `null` when the recording has not been made. A
 * recording made on another `promptVersion` than the one that ships is reported, and never passes.
 */
export const oralStability = async (
  runs: readonly RecordedRunData[],
  promptVersion: string = PROMPT_VERSION,
): Promise<OralStabilityReport | null> => {
  const run = runs.find((candidate) => candidate.file === ORAL_STABILITY_FILE);
  if (run === undefined) return null;
  const calls = callsOf(run.completions.filter((c) => c.method === "assessOral"));
  const replayed = await Promise.all(calls.map(reportOf));
  const reports = replayed.filter((report): report is OralAssessment => report !== null);
  const byCriterion = Object.fromEntries(
    ORAL_CRITERIA.map((criterion) => [criterion, stabilityOf(reports.map((report) => report.criteria[criterion].band))]),
  ) as Record<OralCriterion, CriterionStability>;
  const current = run.promptVersion === promptVersion;
  const failedRuns = calls.length - reports.length;
  const passed =
    current &&
    failedRuns === 0 &&
    calls.length >= ORAL_STABILITY_MIN_RUNS &&
    Object.values(byCriterion).every(
      (c) => c.spread <= ORAL_STABILITY_MAX_SPREAD && c.agreement >= ORAL_STABILITY_AGREEMENT,
    );
  return {
    file: run.file,
    promptVersion: run.promptVersion,
    current,
    runs: calls.length,
    failedRuns,
    byCriterion,
    agreementThreshold: ORAL_STABILITY_AGREEMENT,
    maxSpread: ORAL_STABILITY_MAX_SPREAD,
    passed,
  };
};

/** The eval's one line on the scorer's stability, as `palier-factory eval` prints it (D127). */
export const describeOralStability = (report: OralStabilityReport | null, shipping: string = PROMPT_VERSION): string => {
  if (report === null) {
    return "oral stability: not recorded yet; run `pnpm --filter @palier/web oral-stability` on a funded key (progress.md D126)";
  }
  const verdict = report.passed ? "passed" : "FAILED";
  const stale = report.current ? "" : `, recorded on prompt v${report.promptVersion}, not v${shipping}: re-record`;
  const failed = report.failedRuns === 0 ? "" : `, ${String(report.failedRuns)} call(s) gave no report`;
  const criteria = Object.entries(report.byCriterion)
    .map(([criterion, c]) => `${criterion} spread ${String(c.spread)}, agreement ${c.agreement.toFixed(2)}`)
    .join("; ");
  return `oral stability over ${String(report.runs)} call(s): ${verdict}${stale}${failed} (${criteria})`;
};
