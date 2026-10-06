"use client";

import type { DiagnosticResult } from "@palier/app";
import type { ScoredSkill, SubSkill } from "@palier/domain";
import { SCORED_SKILLS } from "@palier/domain";
import type { DayPlan, SkillTrend } from "@palier/engine";
import { Callout, Card, EmptyState, buttonClass } from "@palier/ui";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { focusText, interpretationFor, placementOf, scoreOf } from "../../features/diagnostic/result-view";
import { feedbackLangFor } from "../../features/oral/report-view";
import { type ExamReadiness, examReadiness } from "../../features/exam/readiness";
import { type EvidenceLine, evidenceLine } from "../../features/telemetry/telemetry";
import { hasAnyEstimate } from "../../features/trend/trend-lines";
import { Link } from "../../i18n/navigation";
import type { Container } from "../../lib/container";
import { type StudyProfile, daysUntil, minutesFor, planRows, readStudyProfile, sessionSizeFor } from "../../lib/study";
import { useContainer } from "../ContainerProvider";
import { MilestoneMoment, StreakLine, useEngagement } from "../engagement/Engagement";
import { NonAffiliation } from "../NonAffiliation";
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
      /** What the trend rests on, for the §13.0 disclosure (D94). */
      readonly evidence: EvidenceLine | null;
      readonly dueCount: number;
      /** The last submitted mock exam, whichever skill, rescored (§8.2 zone A). */
      readonly exam: ExamReadiness | null;
      /** The latest complete diagnostic at this skill, which also placed the plan (ADR 25), or none. */
      readonly diagnostic: DiagnosticResult | null;
    };

/** How far ahead of now "due" reaches for the queue count: due now, nothing later. */
const DUE_LIMIT = 500;

const loadDashboard = async (container: Container, skill: ScoredSkill): Promise<Dashboard> => {
  const profile = await readStudyProfile(container.settings);
  if (profile === null) return { status: "needs-setup" };
  // A preview, not a session: `planDailySession` records nothing, so looking at the
  // card never counts as having started the day. It is biased by what the session will read
  // when it opens (`studyFocus`, ADR 25, D124), and only the plan waits for that.
  const [plan, trend, evidence, due, latestExam, diagnostic] = await Promise.all([
    container.useCases.studyFocus({ skill, lang: "fr", targetBand: profile.targetBand }).then((focus) =>
      container.useCases.planDailySession({
        skill,
        lang: "fr",
        targetBand: profile.targetBand,
        sessionSize: sessionSizeFor(profile.dailyGoalMinutes),
        ...(profile.testDate === null ? {} : { testDate: `${profile.testDate}T00:00:00.000Z` }),
        ...focus,
      }),
    ),
    container.useCases.practiceTrend({ skill }),
    container.useCases.practiceTrendEvidence({ skill }),
    container.schedule.due(container.clock.now(), DUE_LIMIT),
    container.useCases.latestExamResult(),
    container.useCases.diagnosticResult({ skill, targetBand: profile.targetBand }),
  ]);
  // The whole queue, both skills: the card counts what `/review` will show.
  return {
    status: "ready",
    profile,
    plan,
    trend,
    evidence: evidenceLine(evidence, container.profile.itemStatistics.minResponsesDifficulty),
    dueCount: due.length,
    exam: latestExam === null ? null : examReadiness(latestExam),
    diagnostic,
  };
};

/**
 * Home (product-requirements.md §8.2). Zone A, the readiness card: the last mock
 * exam's band against its cuts, which leads because it came from a full-length form,
 * then the latest diagnostic in plain words (ADR 25), then the practice trend per band
 * tag with its interval once there is one, or a first-run invitation to the diagnostic (§14). The two stay visually distinct, and the practice trend is
 * never a band letter (D64). Zone B, today's plan with one primary action. Zone C, the
 * review queue and the mock exam (D84 ruling 12). As designed (D202): the readiness card
 * white, the plan a deep panel, the queue a quiet one.
 */
export function HomeDashboard() {
  const t = useTranslations("today");
  const tCommon = useTranslations("common");
  const tSkills = useTranslations("skills");
  const container = useContainer();
  const engagement = useEngagement(container);
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
          <Link href="/start" className={`${buttonClass("primary", "go")} pl-focusable`}>
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
            {dashboard.diagnostic === null ? null : <DiagnosticHalf result={dashboard.diagnostic} skill={skill} />}
            {hasAnyEstimate(dashboard.trend) ? (
              <>
                <h3>{t("readinessTitle")}</h3>
                <TrendMeters trend={dashboard.trend} />
                <p className="app-muted">
                  {t("provenance", { count: dashboard.trend.windowSize, skill: tSkills(skill) })}
                </p>
                <p className="app-muted">{t("readinessNote")}</p>
                {dashboard.evidence === null ? null : (
                  <p className="app-muted">
                    {t("trendEvidence", dashboard.evidence)}
                  </p>
                )}
              </>
            ) : dashboard.diagnostic !== null ? null : (
              <>
                <h3>{t("readinessTitle")}</h3>
                <div className="app-home__inset">
                  <p>
                    <strong>{t("firstRunTitle")}</strong>
                  </p>
                  <p>{t("firstRunBody", { count: container.status === "ready" ? container.container.profile.diagnostic.size : 0 })}</p>
                  {dashboard.trend.windowSize === 0 ? null : <TrendMeters trend={dashboard.trend} />}
                </div>
                <Link href="/diagnostic" className="pl-btn pl-btn--secondary pl-focusable">
                  {t("firstRunAction")}
                </Link>
              </>
            )}
          </Card>

          <Card tone="deep" className="app-home__plan">
            <h2>{t("planTitle")}</h2>
            {engagement === null || container.status !== "ready" ? null : (
              <StreakLine streak={engagement.streak} container={container.container} />
            )}
            {dashboard.diagnostic === null ? null : <PlanPlacement result={dashboard.diagnostic} />}
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
                <Link href={`/practice/${skill}`} className={`${buttonClass("light", "go")} pl-focusable app-plan__start`}>
                  {t("start", { minutes: minutesFor(dashboard.plan.items.length) })}
                </Link>
              </>
            )}
          </Card>

          <Card tone="quiet" className="app-home__actions">
            <h2>{t("reviewTitle")}</h2>
            <p>{t("reviewDue", { count: dashboard.dueCount })}</p>
            <div className="app-home__links">
              <Link href="/review" className="app-link pl-focusable">
                {t("reviewAction")}
              </Link>
              <Link href="/exam" className="app-link pl-focusable">
                {t("examAction")}
              </Link>
              <Link href="/practice/oral" className="app-link pl-focusable">
                {t("oralAction")}
              </Link>
              <Link href="/diagnostic" className="app-link pl-focusable">
                {t("diagnosticAgain")}
              </Link>
            </div>
          </Card>
        </div>
      )}
      {engagement === null || container.status !== "ready" ? null : (
        <MilestoneMoment milestones={engagement.milestones} container={container.container} />
      )}
    </div>
  );
}

/**
 * The readiness card's diagnostic half (ADR 25): the latest run's score and date, where it started
 * the plan, and the interpretation's headline and first priority when this device holds it, with a
 * link to the whole result, and the monthly re-offer once it is due (§6.2).
 */
function DiagnosticHalf({ result, skill }: { result: DiagnosticResult; skill: ScoredSkill }) {
  const t = useTranslations("today");
  const tDiagnostic = useTranslations("diagnostic");
  const tSub = useTranslations("subSkills");
  const format = useFormatter();
  const locale = useLocale();
  const { summary } = result;
  // Quoted only in this screen's language: one kept in the other waits on the full result's offer.
  const interpretation = interpretationFor(result, feedbackLangFor(locale));
  const score = scoreOf(summary);
  const placement = placementOf(summary);
  const first = interpretation?.priorities[0];
  return (
    <div className="app-exam-result">
      <h3>{t("diagnosticTitle")}</h3>
      <p className="app-exam-result__line">
        {t("diagnosticScore", {
          correct: score.correct,
          attempted: score.attempted,
          date: format.dateTime(new Date(summary.takenAt), { dateStyle: "long" }),
        })}
      </p>
      <p>{tDiagnostic(placement.key, placement.values)}</p>
      {interpretation === null ? null : (
        <p>
          <strong>{interpretation.headline}</strong>
        </p>
      )}
      {first === undefined ? null : <p>{t("diagnosticFirst", { subSkill: tSub(first.subSkill), what: first.what })}</p>}
      <Link href={{ pathname: "/diagnostic/result", query: { skill } }} className="app-link pl-focusable">
        {t("diagnosticLink")}
      </Link>
      {result.retakeDue ? (
        <p>
          <Link href="/diagnostic" className="app-link pl-focusable">
            {t("diagnosticRetake")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

/** The plan card's line on how the diagnostic shaped the day (ADR 25): where it starts, and what it favours. */
function PlanPlacement({ result }: { result: DiagnosticResult }) {
  const t = useTranslations("today");
  const tSub = useTranslations("subSkills");
  const locale = useLocale();
  const placement = placementOf(result.summary);
  const focus = focusText(result.summary.focusSubSkills, (subSkill: SubSkill) => tSub(subSkill), locale);
  return (
    <p>
      {t(placement.key === "placementBelow" ? "planPlacedBelow" : "planPlacedAt", placement.values)}
      {focus === null ? null : <> {t("planFocus", { list: focus })}</>}
    </p>
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
          <NonAffiliation />
          <Link href={{ pathname: "/exam/results", query: { run: exam.runId } }} className="app-link pl-focusable">
            {t("examResultLink")}
          </Link>
        </>
      )}
    </div>
  );
}
