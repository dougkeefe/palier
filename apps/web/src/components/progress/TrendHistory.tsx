"use client";

import type { TargetBand } from "@palier/domain";
import { MIN_EVIDENCE, type TrendPoint } from "@palier/engine";
import { TrendChart } from "@palier/ui";
import { useFormatter, useTranslations } from "next-intl";
import { useId } from "react";

import { dayInstant, hasHistory, historyRows } from "../../features/trend/trend-history";

/**
 * The practice trend over time (product-requirements.md §8.9, progress.md D198): the target band's
 * accuracy at the end of each week, its interval shaded, a gap where a week had too little evidence
 * (R10). **The chart is a picture, `aria-hidden`; the figures are a table.** On screen the table is
 * in a disclosure under the chart; printed, it is simply there, since paper has no disclosure. It is
 * one table either way, never a hidden copy (D148's lesson).
 */
export function TrendHistory({ points, band, printing }: { points: readonly TrendPoint[]; band: TargetBand; printing: boolean }) {
  const t = useTranslations("progress");
  const format = useFormatter();
  const headingId = useId();
  const rows = historyRows(points, band);
  const dayName = (day: string) => format.dateTime(dayInstant(day), { month: "short", day: "numeric", timeZone: "UTC" });

  const heading = (
    <h3 id={headingId} className="app-trend-history__title">
      {t("historyTitle", { band })}
    </h3>
  );
  const first = rows[0];
  const last = rows.at(-1);
  if (!hasHistory(rows) || first === undefined || last === undefined) {
    return (
      <div className="app-trend-history">
        {heading}
        <p className="app-muted">{t("historyNone", { band, needed: MIN_EVIDENCE })}</p>
      </div>
    );
  }

  const table = (
    <table className="app-table app-trend-table" aria-labelledby={headingId}>
      <thead>
        <tr>
          <th scope="col">{t("historyWeek")}</th>
          <th scope="col">{t("historyAccuracy")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.day}>
            <th scope="row">{dayName(row.day)}</th>
            <td>
              {row.line.estimate === null
                ? t("historyShort")
                : printing
                  ? t.rich("historyCellPaper", { ...row.line.percents, range: (chunks) => <span className="app-nowrap">{chunks}</span> })
                  : t("historyCell", row.line.percents)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="app-trend-history">
      {heading}
      <TrendChart points={rows.map((row) => row.line.estimate)} startLabel={dayName(first.day)} endLabel={dayName(last.day)} />
      {printing ? (
        table
      ) : (
        <details className="app-trend-history__figures">
          <summary className="pl-focusable">{t("historyFigures")}</summary>
          {table}
        </details>
      )}
    </div>
  );
}
