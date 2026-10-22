"use client";

import type { OralTotals } from "@palier/app";
import type { OralFix } from "@palier/domain";
import { Card } from "@palier/ui";
import { useFormatter, useTranslations } from "next-intl";

import { drillHref, drillMessage } from "../../features/oral/report-view";
import type { OralDetail } from "../../features/progress/progress-view";
import { Link } from "../../i18n/navigation";
import { deviceTimeZone } from "../../lib/time-zone";

const reportHref = (session: string) => ({ pathname: "/practice/oral/report", query: { session } }) as const;

/**
 * Speaking's detail on `/progress` (progress.md D247), the twin of a scored skill's two cards: the
 * sessions, newest first, each with its spoken time and its measured pace and a way to its report;
 * beside them what the newest report says to work on, each fix a way into its drill. With no report yet it
 * links the newest session a report can still be asked of, never one the report screen would refuse. A report's
 * criterion levels stay on the report, beside the evidence that makes them honest (R10), and nothing
 * here spends: a report is asked for on its own screen, with its cost shown first.
 */
export function OralCards({ detail, totals }: { detail: OralDetail; totals: OralTotals }) {
  const t = useTranslations("progress");
  const tOral = useTranslations("oral");
  const format = useFormatter();
  const dateOf = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeZone: deviceTimeZone() });
  return (
    <>
      <Card>
        <h2>{t("oralSessionsTitle")}</h2>
        {detail.status === "empty" ? (
          <>
            <p>{t("oralNone")}</p>
            <p>
              <Link href="/practice/oral" className="app-link pl-focusable">
                {t("oralStart")}
              </Link>
            </p>
          </>
        ) : (
          <>
            <div className="app-progress__facts">
              <p className="app-muted">
                {t("oralLine", { sessions: totals.sessions, minutes: Math.round(totals.msSpoken / 60_000) })}
              </p>
              <p className="app-muted">{t("oralDevice")}</p>
            </div>
            <p className="app-progress__eyebrow">{t("oralRecentOrder")}</p>
            <ul className="app-plan app-progress__sessions">
              {detail.rows.map((row) => (
                <li key={row.id} className="app-plan__row app-progress__session">
                  <span className="app-plan__kind" id={`progress-oral-${row.id}`}>
                    {row.sessionType === null ? tOral("historyUnknownType") : tOral(`type_${row.sessionType}`)}
                  </span>
                  <span className="app-muted">
                    {t("oralRow", {
                      date: dateOf(row.startedAt),
                      minutes: row.minutes,
                      paced: row.wordsPerMinute === null ? "no" : "yes",
                      words: row.wordsPerMinute ?? 0,
                    })}
                  </span>
                  <span className="app-progress__session-end">
                    {row.assessed ? <span className="app-tag">{tOral("historyAssessed")}</span> : null}
                    <Link
                      href={reportHref(row.id)}
                      className="app-link pl-focusable"
                      aria-describedby={`progress-oral-${row.id}`}
                    >
                      {tOral("historyOpen")}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
      <Card>
        <h2>{t("oralLatestTitle")}</h2>
        {detail.status === "empty" ? (
          <p className="app-muted">{t("oralLatestEmpty")}</p>
        ) : detail.status === "unreported" ? (
          detail.askable === null ? (
            <>
              <p>{t("oralUnreportedNone")}</p>
              <p>
                <Link href="/practice/oral" className="app-link pl-focusable">
                  {t("oralStart")}
                </Link>
              </p>
            </>
          ) : (
            <>
              <p>{t("oralUnreported")}</p>
              <p>
                <Link href={reportHref(detail.askable)} className="app-link pl-focusable">
                  {t("oralUnreportedOpen")}
                </Link>
              </p>
            </>
          )
        ) : (
          <>
            <p className="app-progress__eyebrow">{t("oralLatestDate", { date: dateOf(detail.report.startedAt) })}</p>
            <OralFixes fixes={detail.report.fixes} />
            <p className="app-muted">{t("oralLatestLevels")}</p>
            <p>
              <Link href={reportHref(detail.report.id)} className="app-link pl-focusable">
                {t("oralLatestOpen")}
              </Link>
            </p>
          </>
        )}
      </Card>
    </>
  );
}

/** The report's fixes, most costly first: the criterion each cost, and the drill for its sub-skill. */
function OralFixes({ fixes }: { fixes: readonly OralFix[] }) {
  const tReport = useTranslations("oralReport");
  const tSkills = useTranslations("subSkills");
  return (
    <ol className="app-plan app-progress__fixes">
      {fixes.map((fix, index) => (
        <li key={index} className="app-plan__row app-progress__fix">
          <span className="app-plan__kind">{tReport(`criterion_${fix.criterion}`)}</span>
          <Link href={drillHref(fix.subSkill)} className="app-link pl-focusable">
            {tReport(drillMessage(fix.subSkill), { subSkill: tSkills(fix.subSkill) })}
          </Link>
        </li>
      ))}
    </ol>
  );
}
