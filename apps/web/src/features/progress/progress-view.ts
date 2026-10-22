import type { OralTotals, ProgressReport } from "@palier/app";
import type { ScoredSkill, TargetBand } from "@palier/domain";
import { SCORED_SKILLS } from "@palier/domain";
import type { SubSkillTally } from "@palier/engine";

import { type TrendLine, trendLines } from "../trend/trend-lines";

/**
 * The progress page's overview and sub-skill bars (progress.md D245), kept out of the `.tsx` so each
 * decision is tested. Nothing here computes a new figure: the overview restates the reports the page
 * already reads, at the study profile's target band.
 */

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

const minutesOf = (ms: number): number => Math.round(Math.max(0, ms) / MS_PER_MINUTE);

/**
 * A scored skill's headline at the target band: its estimate once there is one (with its interval,
 * R10), else how far the answers at that band have come toward the first figure, as a rail.
 */
export type GlanceHeadline =
  | { readonly status: "estimate"; readonly line: TrendLine }
  | { readonly status: "building"; readonly attempted: number; readonly threshold: number };

export type GlanceCard =
  | {
      readonly kind: ScoredSkill;
      readonly headline: GlanceHeadline;
      readonly answered: number;
      /** Time spent answering, in whole minutes. */
      readonly minutes: number;
    }
  | { readonly kind: "oral"; readonly sessions: number; readonly minutes: number };

const headlineAt = (report: ProgressReport, band: TargetBand): GlanceHeadline => {
  const trend = report.trend.byBand[band];
  if (trend.status === "insufficient") {
    // The rail is full at the threshold and never runs past it.
    return { status: "building", attempted: Math.min(trend.attempted, trend.needed), threshold: trend.needed };
  }
  return { status: "estimate", line: trendLines(report.trend, [band])[0] as TrendLine };
};

/** The overview's three cards, in the order the app always names the skills: reading, writing, then speaking. */
export const glanceCards = (
  reports: Readonly<Record<ScoredSkill, ProgressReport>>,
  oral: OralTotals,
  band: TargetBand,
): readonly GlanceCard[] => [
  ...SCORED_SKILLS.map(
    (kind): GlanceCard => ({
      kind,
      headline: headlineAt(reports[kind], band),
      answered: reports[kind].answered,
      minutes: minutesOf(reports[kind].msAnswering),
    }),
  ),
  { kind: "oral", sessions: oral.sessions, minutes: minutesOf(oral.msSpoken) },
];

/**
 * All the time practised, answering at both skills and speaking, as hours and the minutes past them.
 * It adds the whole minutes each card shows, so the total never differs from its cards by a rounding.
 */
export const practiceTime = (
  reports: Readonly<Record<ScoredSkill, ProgressReport>>,
  oral: OralTotals,
): { readonly hours: number; readonly minutes: number } => {
  const total = SCORED_SKILLS.reduce((sum, skill) => sum + minutesOf(reports[skill].msAnswering), minutesOf(oral.msSpoken));
  return { hours: Math.floor(total / MINUTES_PER_HOUR), minutes: total % MINUTES_PER_HOUR };
};

/** The scale every sub-skill's bar is drawn to: the most answers any one has, so a handful draws short. */
export const tallyScale = (rows: readonly SubSkillTally[]): number => Math.max(0, ...rows.map((row) => row.attempted));
