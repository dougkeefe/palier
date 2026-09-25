"use client";

import type { ScoredSkill } from "@palier/domain";
import { SCORED_SKILLS } from "@palier/domain";
import type { DayPlan, SkillTrend } from "@palier/engine";
import { Callout, Card, EmptyState } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { type ExamReadiness, examReadiness } from "../../features/exam/readiness";
import { hasAnyEstimate } from "../../features/trend/trend-lines";
import { Link } from "../../i18n/navigation";
import type { Container } from "../../lib/container";
import { type StudyProfile, daysUntil, minutesFor, planRows, readStudyProfile, sessionSizeFor } from "../../lib/study";
import { useContainer } from "../ContainerProvider";
import { TrendMeters } from "../practice/TrendMeters";

type Dashboard =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "needs-setup" }
  | {
      readonly status: "ready";
      readonly profile: StudyProfile;
      readonly plan: DayPlan;
      readonly trend: SkillTrend;
      readonly dueCount: number;
      /** The last submitted mock exam, whichever skill, rescored (§8.2 zone A). */
      readonly exam: ExamReadiness | null;
    };

/** How far ahead of now "due" reaches for the queue count: due now, nothing later. */
const DUE_LIMIT = 500;

const loadDashboard = async (container: Container, skill: ScoredSkill): Promise<Dashboard> => {
  const profile = await readStudyProfile(container.settings);
  if (profile === null) return { status: "needs-setup" };
  // A preview, not a session: `planDailySession` records nothing, so looking at the
  // card never counts as having started the day.
  const [plan, trend, due, latestExam] = await Promise.all([
    container.useCases.planDailySession({
      skill,
      lang: "fr",
      targetBand: profile.targetBand,
      sessionSize: sessionSizeFor(profile.dailyGoalMinutes),
      ...(profile.testDate === null ? {} : { testDate: `${profile.testDate}T00:00:00.000Z` }),
    }),
    container.useCases.practiceTrend({ skill }),
    container.schedule.due(container.clock.now(), DUE_LIMIT),
    container.useCases.latestExamResult(),
  ]);
  // The whole queue, both skills: the card counts what `/review` will show.
  return {
    status: "ready",
    profile,
    plan,
    trend,
    dueCount: due.length,
    exam: latestExam === null ? null : examReadiness(latestExam),
  };
};

/**
 * Home (product-requirements.md §8.2). Zone A, the readiness card: the last mock
 * exam's band against its cuts, which leads because it came from a full-length form,
 * then the practice trend per band tag with its interval, or a first-run invitation
 * to the diagnostic (§14). The two stay visually distinct, and the practice trend is
 * never a band letter (D64). Zone B, today's plan with one primary action. Zone C, the
 * review queue and the mock exam (D84 ruling 12).
 */
export function HomeDashboard() {
  const t = useTranslations("today");
  const tCommon = useTranslations("common");
  const tSkills = useTranslations("skills");
  const container = useContainer();
  const [skill, setSkill] = useState<ScoredSkill>("reading");
  // Keyed by the skill it was loaded for, so switching skill reads as loading until
  // the new skill's data arrives, with no reset inside the effect.
  const [loaded, setLoaded] = useState<{ skill: ScoredSkill; dashboard: Dashboard } | null>(null);
  const dashboard: Dashboard = loaded?.skill === skill ? loaded.dashboard : { status: "loading" };

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    loadDashboard(container.container, skill).then(
      (d) => live && setLoaded({ skill, dashboard: d }),
      () => live && setLoaded({ skill, dashboard: { status: "failed" } }),
    );
    return () => {
      live = false;
    };
  }, [container, skill]);

  if (container.status === "failed" || dashboard.status === "failed") {
    return <Callout tone="incorrect">{tCommon("loadFailed")}</Callout>;
  }
  if (dashboard.status === "needs-setup") {
    return (
      <EmptyState
        heading={t("setUpTitle")}
        action={
          <Link href="/start" className="pl-btn pl-btn--primary pl-focusable">
            {t("setUpAction")}
          </Link>
        }
      >
        {t("setUpBody")}
      </EmptyState>
    );
  }

  const countdown =
    dashboard.status === "ready" && container.status === "ready"
      ? daysUntil(dashboard.profile.testDate, container.container.clock.now())
      : null;

  return (
    <div className="app-stack">
      <fieldset className="app-segmented">
        <legend className="app-segmented__legend">{t("skillLabel")}</legend>
        {SCORED_SKILLS.map((s) => (
          <label key={s} className="app-segmented__option">
            <input type="radio" name="skill" value={s} checked={skill === s} onChange={() => setSkill(s)} />
            <span>{tSkills(s)}</span>
          </label>
        ))}
      </fieldset>

      {dashboard.status === "loading" ? (
        <p role="status">{tCommon("loading")}</p>
      ) : (
        <div className="app-home">
          <Card className="app-home__readiness">
            <h2>{t("readinessCardTitle")}</h2>
            {countdown === null ? null : <p className="app-countdown">{t("testCountdown", { days: countdown })}</p>}
            <ExamHalf exam={dashboard.exam} />
            <h3>{t("readinessTitle")}</h3>
            {hasAnyEstimate(dashboard.trend) ? (
              <>
                <TrendMeters trend={dashboard.trend} />
                <p className="app-muted">
                  {t("provenance", { count: dashboard.trend.windowSize, skill: tSkills(skill) })}
                </p>
                <p className="app-muted">{t("readinessNote")}</p>
              </>
            ) : (
              <div className="app-stack">
                <p>
                  <strong>{t("firstRunTitle")}</strong>
                </p>
                <p>{t("firstRunBody")}</p>
                {dashboard.trend.windowSize === 0 ? null : <TrendMeters trend={dashboard.trend} />}
                <Link href="/diagnostic" className="pl-btn pl-btn--secondary pl-focusable">
                  {t("firstRunAction")}
                </Link>
              </div>
            )}
          </Card>

          <Card className="app-home__plan">
            <h2>{t("planTitle")}</h2>
            {dashboard.plan.items.length === 0 ? (
              <div>
                <p>
                  <strong>{t("doneTitle")}</strong>
                </p>
                <p>{t("doneBody")}</p>
              </div>
            ) : (
              <>
                <ul className="app-plan">
                  {planRows(dashboard.plan).map((row) => (
                    <li key={row.kind} className="app-plan__row">
                      <span className="app-plan__kind">{t(`row_${row.kind}`)}</span>
                      <span className="app-muted">{t("rowDetail", { count: row.count, minutes: row.minutes })}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`/practice/${skill}`} className="pl-btn pl-btn--primary pl-focusable app-plan__start">
                  {t("start", { minutes: minutesFor(dashboard.plan.items.length) })}
                </Link>
              </>
            )}
          </Card>

          <Card className="app-home__actions">
            <h2>{t("reviewTitle")}</h2>
            <p>{t("reviewDue", { count: dashboard.dueCount })}</p>
            <Link href="/review" className="app-link pl-focusable">
              {t("reviewAction")}
            </Link>
            <Link href="/exam" className="app-link pl-focusable">
              {t("examAction")}
            </Link>
            <Link href="/diagnostic" className="app-link pl-focusable">
              {t("diagnosticAgain")}
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * The readiness card's exam half: "C, 39 of 50. C starts at 38." (§8.2), or an
 * invitation to take one. It links to the full result.
 */
function ExamHalf({ exam }: { exam: ExamReadiness | null }) {
  const t = useTranslations("today");
  return (
    <div className="app-exam-result">
      <h3>{t("examTitle")}</h3>
      {exam === null ? (
        <>
          <p>{t("examNone")}</p>
          <Link href="/exam" className="pl-btn pl-btn--secondary pl-focusable">
            {t("examAction")}
          </Link>
        </>
      ) : (
        <>
          <p className="app-exam-result__line">{t("examResult", { ...exam })}</p>
          <Link href={{ pathname: "/exam/results", query: { run: exam.runId } }} className="app-link pl-focusable">
            {t("examResultLink")}
          </Link>
        </>
      )}
    </div>
  );
}
