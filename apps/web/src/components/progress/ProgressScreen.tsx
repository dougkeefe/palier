"use client";

import type { ProgressReport } from "@palier/app";
import type { ScoredSkill } from "@palier/domain";
import { SCORED_SKILLS } from "@palier/domain";
import { Callout, Card } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useContainer } from "../ContainerProvider";
import { ExportButton } from "../data/ExportButton";
import { TrendMeters } from "../practice/TrendMeters";

/**
 * Progress (product-requirements.md §8.9): the practice trend with its interval,
 * accuracy by sub-skill as plain counts (no percentage on a handful of answers, R10),
 * items answered, time spent answering, an honest panel on what this does and does not
 * say, and the export.
 *
 * Everything below the skill switch renders in one pass once the report has loaded.
 * Static cards drawn early were pushed down when the report arrived above them, a layout
 * shift of 0.148 that Lighthouse caught (performance 0.94).
 */
export function ProgressScreen() {
  const t = useTranslations("progress");
  const tCommon = useTranslations("common");
  const tSkills = useTranslations("skills");
  const tToday = useTranslations("today");
  const tSub = useTranslations("subSkills");
  const container = useContainer();
  const [skill, setSkill] = useState<ScoredSkill>("reading");
  const [loaded, setLoaded] = useState<{ skill: ScoredSkill; report: ProgressReport | "failed" } | null>(null);
  const report = loaded?.skill === skill ? loaded.report : null;

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    container.container.useCases.progressReport({ skill }).then(
      (r) => live && setLoaded({ skill, report: r }),
      () => live && setLoaded({ skill, report: "failed" }),
    );
    return () => {
      live = false;
    };
  }, [container, skill]);

  return (
    <div className="app-stack">
      <fieldset className="app-segmented">
        <legend className="app-segmented__legend">{tToday("skillLabel")}</legend>
        {SCORED_SKILLS.map((s) => (
          <label key={s} className="app-segmented__option">
            <input type="radio" name="skill" value={s} checked={skill === s} onChange={() => setSkill(s)} />
            <span>{tSkills(s)}</span>
          </label>
        ))}
      </fieldset>

      {container.status === "failed" || report === "failed" ? (
        <Callout tone="incorrect">{tCommon("loadFailed")}</Callout>
      ) : report === null ? (
        <p role="status">{tCommon("loading")}</p>
      ) : (
        <>
          <Card>
            <h2>{t("trendTitle")}</h2>
            <TrendMeters trend={report.trend} />
            <p className="app-muted">{t("answered", { count: report.answered })}</p>
            <p className="app-muted">{t("timeAnswering", { minutes: Math.round(report.msAnswering / 60_000) })}</p>
          </Card>
          <Card>
            <h2>{t("subSkillTitle")}</h2>
            {report.bySubSkill.length === 0 ? (
              <p className="app-muted">{t("subSkillEmpty")}</p>
            ) : (
              <ul className="app-plan">
                {report.bySubSkill.map((row) => (
                  <li key={row.subSkill} className="app-plan__row">
                    <span className="app-plan__kind">{tSub(row.subSkill)}</span>
                    <span className="app-muted">{t("subSkillRow", { correct: row.correct, attempted: row.attempted })}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2>{t("honestTitle")}</h2>
            <p>{t("honestDoes")}</p>
            <p>{t("honestDoesNot")}</p>
          </Card>
          <Card>
            <h2>{t("exportTitle")}</h2>
            <p>{t("exportBody")}</p>
            <ExportButton variant="secondary" />
          </Card>
        </>
      )}
    </div>
  );
}
