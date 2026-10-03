import type { TargetBand } from "@palier/domain";
import { TARGET_BANDS } from "@palier/domain";
import type { TrendPoint } from "@palier/engine";

import { type TrendLine, trendLines } from "./trend-lines";

/**
 * The progress page's trend over time (product-requirements.md §8.9, progress.md D198), kept out
 * of the `.tsx` so each decision is tested.
 */

/** How many weeks `/progress` draws, today the last. A display choice, not exam data (ADR 9 covers exam rules). */
export const TREND_HISTORY_WEEKS = 12;

/** One week's row: the local day it ends on, and the target band's line that day. */
export type HistoryRow = {
  readonly day: string;
  readonly line: TrendLine;
};

/** The band the chart follows: the study profile's target, or the profile's highest band before one is set. */
export const historyBand = (targetBand: TargetBand | null): TargetBand => targetBand ?? (TARGET_BANDS.at(-1) as TargetBand);

/** Each week's line at `band`, in the points' order, so the chart and the table read the same figures. */
export const historyRows = (points: readonly TrendPoint[], band: TargetBand): HistoryRow[] =>
  points.map((point) => ({ day: point.day, line: trendLines(point.trend, [band])[0] as TrendLine }));

/** Whether any week has a figure to draw. With none, the page says so in words and draws nothing. */
export const hasHistory = (rows: readonly HistoryRow[]): boolean => rows.some((row) => row.line.estimate !== null);

/**
 * A local day as an instant to format, at noon UTC, so formatting it with `timeZone: "UTC"` names
 * that same day wherever the device is.
 */
export const dayInstant = (day: string): Date => new Date(`${day}T12:00:00.000Z`);
