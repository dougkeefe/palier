import { openAiProvider } from "@palier/adapters/openai";
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
 * It passes when there are at least `ORAL_STABILITY_MIN_RUNS` reports, and every criterion's
 * spread is at most one level and its agreement at least `ORAL_STABILITY_AGREEMENT`. Both are
 * **eval parameters, not profile data** (ADR 9): the PSC publishes nothing about a practice
 * tool's scorer.
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
  /** Reports the adapter accepted: one per call, a retried call's second reply included. */
  readonly runs: number;
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

/** The stability of the recorded reports, or `null` when the recording has not been made. */
export const oralStability = async (runs: readonly RecordedRunData[]): Promise<OralStabilityReport | null> => {
  const run = runs.find((candidate) => candidate.file === ORAL_STABILITY_FILE);
  if (run === undefined) return null;
  const replayed = await Promise.all(run.completions.filter((c) => c.method === "assessOral").map(replay));
  const reports = replayed.filter((report): report is OralAssessment => report !== null);
  const byCriterion = Object.fromEntries(
    ORAL_CRITERIA.map((criterion) => [criterion, stabilityOf(reports.map((report) => report.criteria[criterion].band))]),
  ) as Record<OralCriterion, CriterionStability>;
  const passed =
    reports.length >= ORAL_STABILITY_MIN_RUNS &&
    Object.values(byCriterion).every(
      (c) => c.spread <= ORAL_STABILITY_MAX_SPREAD && c.agreement >= ORAL_STABILITY_AGREEMENT,
    );
  return {
    file: run.file,
    promptVersion: run.promptVersion,
    runs: reports.length,
    byCriterion,
    agreementThreshold: ORAL_STABILITY_AGREEMENT,
    maxSpread: ORAL_STABILITY_MAX_SPREAD,
    passed,
  };
};
