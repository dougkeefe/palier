"use client";

import type { DiagnosticResult } from "@palier/app";
import type { Pointer, ScoredSkill, SubSkill, TargetBand } from "@palier/domain";
import { SCORED_SKILLS } from "@palier/domain";
import { type DayPlan, type SkillTrend, localDay } from "@palier/engine";
import { Callout, Card, EmptyState, buttonClass } from "@palier/ui";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { focusText, interpretationFor, placementOf, scoreOf } from "../../features/diagnostic/result-view";
import { feedbackLangFor } from "../../features/oral/report-view";
import { type ExamReadiness, examReadiness } from "../../features/exam/readiness";
import { type NextStep, nextStep } from "../../features/home/next-step";
import { pickPointer } from "../../features/home/pointer";
import { type EvidenceLine, evidenceLine } from "../../features/telemetry/telemetry";
import { hasAnyEstimate } from "../../features/trend/trend-lines";
import { Link } from "../../i18n/navigation";
import type { Container } from "../../lib/container";
import { type StudyProfile, daysUntil, minutesFor, planRows, readStudyProfile, sessionSizeFor } from "../../lib/study";
import { deviceTimeZone } from "../../lib/time-zone";
import { useContainer } from "../ContainerProvider";
import { MilestoneMoment, StreakLine, useEngagement } from "../engagement/Engagement";
import { Cited } from "../library/Cited";
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
      /** The one step the plan card leads with (D214). */
      readonly step: NextStep;
      /** Today's quick grammar pointer, in the language practised, on what the writing plan favours (D216, D218). */
      readonly pointer: Pointer | null;
    };

/** How far ahead of now "due" reaches for the queue count: due now, nothing later. */
const DUE_LIMIT = 500;

const loadDashboard = async (container: Container, skill: ScoredSkill): Promise<Dashboard> => {
  const profile = await readStudyProfile(container.settings);
  if (profile === null) return { status: "needs-setup" };
  // A preview, not a session: `planDailySession` records nothing, so looking at the
  // card never counts as having started the day. It is biased by what the session will read
  // when it opens (`studyFocus`, ADR 25, D124), and only the plan waits for that.
  const studying = container.useCases.studyFocus({ skill, lang: "fr", targetBand: profile.targetBand });
  // The pointer is a grammar point, so it follows the writing plan's focus whichever skill is shown (D218).
  const grammar =
    skill === "writing" ? studying : container.useCases.studyFocus({ skill: "writing", lang: "fr", targetBand: profile.targetBand });
  const [grammarFocus, plan, trend, evidence, due, latestExam, examAtSkill, diagnostic] = await Promise.all([
    grammar,
    studying.then((focus) =>
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
    container.useCases.latestExamResult({ skill }),
    container.useCases.diagnosticResult({ skill, targetBand: profile.targetBand }),
  ]);
  const step = nextStep({
    diagnostic: diagnostic === null ? null : { takenAt: diagnostic.summary.takenAt, retakeDue: diagnostic.retakeDue },
    trend,
    targetBand: profile.targetBand,
    mockExamAdvised: plan.mockExamAdvised,
    lastExamAt: examAtSkill?.run.submittedAt ?? null,
  });
  const pointer = pickPointer(container.pointers, {
    focusSubSkills: grammarFocus.focusSubSkills ?? [],
    day: localDay(container.clock.now(), deviceTimeZone()),
  });
  // The whole queue, both skills: the link counts what `/review` will show.
  return {
    status: "ready",
    profile,
    plan,
    trend,
    evidence: evidenceLine(evidence, container.profile.itemStatistics.minResponsesDifficulty),
    dueCount: due.length,
    exam: latestExam === null ? null : examReadiness(latestExam),
    diagnostic,
    step,
    pointer,
  };
};

/**
 * Home (product-requirements.md §8.2, as amended by D214–D215). The page is built around what to
 * do next, at the skill being looked at:
 *
 * - **Today's plan leads**, the deep panel across two-thirds of the width. It opens with the next
 *   step when that is not the plan itself: the diagnostic first, a retake when it is due, then a
 *   mock exam once practice at the target is measurable (`nextStep`). Then the rows and one primary
 *   action, then the other ways on: the review queue with its due count, speaking, the mock exam
 *   with what it is for, the library and the diagnostic again. There is no separate review card:
 *   the plan's first row already draws on the same due items.
 * - **A quick pointer** beside it (D216): one piece of advice a day, on what the plan favours.
 * - **Where you stand** below the pointer: the diagnostic in plain words (ADR 25), the practice
 *   trend per band tag (never a band letter, D64), and the last mock exam's band against its cuts
 *   once there is one. Each says in a line what it is, so the two are not confused.
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

      {dashboard.status === "loading" || container.status !== "ready" ? (
        <p role="status">{tCommon("loading")}</p>
      ) : (
        <div className="app-home">
          <Card tone="deep" className="app-home__plan">
            <h2>{t("planTitle")}</h2>
            {countdown === null ? null : <p className="app-countdown">{t("testCountdown", { days: countdown })}</p>}
            <NextStepBanner
              step={dashboard.step}
              targetBand={dashboard.profile.targetBand}
              taper={dashboard.plan.mockExamAdvised}
              diagnosticSize={container.container.profile.diagnostic.size}
            />
            {engagement === null ? null : <StreakLine streak={engagement.streak} container={container.container} />}
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
            <MorePractice
              dueCount={dashboard.dueCount}
              step={dashboard.step}
              hasDiagnostic={dashboard.diagnostic !== null}
              targetBand={dashboard.profile.targetBand}
            />
          </Card>

          <div className="app-home__side">
            {dashboard.pointer === null ? null : <PointerCard pointer={dashboard.pointer} />}

            <Card className="app-home__readiness">
              <h2>{t("readinessCardTitle")}</h2>
              {dashboard.diagnostic === null ? (
                <p className="app-muted">{t("standEmpty")}</p>
              ) : (
                <DiagnosticHalf result={dashboard.diagnostic} skill={skill} />
              )}
              {hasAnyEstimate(dashboard.trend) ? (
                <>
                  <h3>{t("readinessTitle")}</h3>
                  <TrendMeters trend={dashboard.trend} />
                  <p className="app-muted">
                    {t("provenance", { count: dashboard.trend.windowSize, skill: tSkills(skill) })}
                  </p>
                  <p className="app-muted">{t("readinessNote")}</p>
                  {dashboard.evidence === null ? null : <p className="app-muted">{t("trendEvidence", dashboard.evidence)}</p>}
                </>
              ) : null}
              {dashboard.exam === null ? null : <ExamHalf exam={dashboard.exam} />}
            </Card>
          </div>
        </div>
      )}
      {engagement === null || container.status !== "ready" ? null : (
        <MilestoneMoment milestones={engagement.milestones} container={container.container} />
      )}
    </div>
  );
}

/**
 * The plan's head when the next step is not the plan itself (D214): what to do, why, and one way
 * to do it. The diagnostic's says it needs the key, and that the plan below works meanwhile.
 */
function NextStepBanner({
  step,
  targetBand,
  taper,
  diagnosticSize,
}: {
  step: NextStep;
  targetBand: TargetBand;
  taper: boolean;
  diagnosticSize: number;
}) {
  const t = useTranslations("today");
  if (step === "plan") return null;
  const [title, body, href, action]: [string, string, "/diagnostic" | "/exam", string] =
    step === "diagnostic"
      ? [t("nextDiagnosticTitle"), t("nextDiagnosticBody", { count: diagnosticSize }), "/diagnostic", t("nextDiagnosticAction")]
      : step === "retake-diagnostic"
        ? [t("nextRetakeTitle"), t("diagnosticRetake"), "/diagnostic", t("diagnosticAgain")]
        : [t("nextExamTitle"), taper ? t("nextExamTaper") : t("nextExamReady", { target: targetBand }), "/exam", t("examAction")];
  return (
    <section className="app-home__next" aria-labelledby="app-home-next">
      <p className="app-home__eyebrow">{t("nextLabel")}</p>
      <h3 id="app-home-next">{title}</h3>
      <p>{body}</p>
      <Link href={href} className={`${buttonClass("light", "go")} pl-focusable`}>
        {action}
      </Link>
      {step === "diagnostic" ? <p className="app-muted">{t("nextDiagnosticMeanwhile")}</p> : null}
    </section>
  );
}

/**
 * The plan's other ways on, where the review card was (D215): the queue with its due count,
 * speaking, the mock exam with what it is for, the library, and the diagnostic again once there is
 * one. A way the banner above already offers is not repeated.
 */
function MorePractice({
  dueCount,
  step,
  hasDiagnostic,
  targetBand,
}: {
  dueCount: number;
  step: NextStep;
  hasDiagnostic: boolean;
  targetBand: TargetBand;
}) {
  const t = useTranslations("today");
  return (
    <section className="app-home__more" aria-labelledby="app-home-more">
      <h3 id="app-home-more">{t("moreTitle")}</h3>
      <ul className="app-home__links">
        <li>
          <Link href="/review" className="app-link pl-focusable">
            {t("moreReview", { count: dueCount })}
          </Link>
        </li>
        <li>
          <Link href="/practice/oral" className="app-link pl-focusable">
            {t("oralAction")}
          </Link>
        </li>
        {step === "mock-exam" ? null : (
          <li>
            <Link href="/exam" className="app-link pl-focusable">
              {t("examAction")}
            </Link>
            <p className="app-muted">{t("moreExamHint", { target: targetBand })}</p>
          </li>
        )}
        <li>
          <Link href="/library" className="app-link pl-focusable">
            {t("libraryAction")}
          </Link>
        </li>
        {hasDiagnostic && step !== "retake-diagnostic" ? (
          <li>
            <Link href="/diagnostic" className="app-link pl-focusable">
              {t("diagnosticAgain")}
            </Link>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

/**
 * Today's quick grammar pointer (D216, D218): written in the language practised, whatever the
 * screen's, so the whole paragraph carries that `lang` and its examples are set in italics. The
 * heading and the topic are the screen's, and it links the sub-skill's library article.
 */
function PointerCard({ pointer }: { pointer: Pointer }) {
  const t = useTranslations("today");
  const tSub = useTranslations("subSkills");
  return (
    <Card tone="tint" className="app-home__pointer">
      <h2>{t("pointerTitle")}</h2>
      <p className="app-home__eyebrow">{t("pointerTopic", { subSkill: tSub(pointer.subSkill) })}</p>
      <p className="app-home__pointer-text" lang={pointer.lang}>
        <Cited text={pointer.text} lang={pointer.lang} />
      </p>
      <Link href={`/library/${pointer.subSkill}`} className="app-link pl-focusable">
        {t("pointerMore")}
      </Link>
    </Card>
  );
}

/**
 * Where you stand's diagnostic half (ADR 25): what the diagnostic is for, the latest run's score
 * and date, where it started the plan, and the interpretation's headline and first priority when
 * this device holds it, with a link to the whole result. The monthly re-offer is the plan's banner.
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
      <p className="app-muted">{t("diagnosticWhat")}</p>
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
      <Link href={{ pathname: "/diagnostic", query: { result: skill } }} className="app-link pl-focusable">
        {t("diagnosticLink")}
      </Link>
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
 * Where you stand's exam half, once a mock exam has been submitted: what a mock exam is, then
 * "C, 39 of 50. C starts at 38." (§8.2) beside the non-affiliation statement, and the full result.
 * Before the first, the plan's banner and its other ways on say when one is worth taking (D214).
 */
function ExamHalf({ exam }: { exam: ExamReadiness }) {
  const t = useTranslations("today");
  return (
    <div className="app-exam-result">
      <h3>{t("examTitle")}</h3>
      <p className="app-muted">{t("examWhat")}</p>
      <p className="app-exam-result__line">{t("examResult", { ...exam })}</p>
      <NonAffiliation />
      <Link href={{ pathname: "/exam/results", query: { run: exam.runId } }} className="app-link pl-focusable">
        {t("examResultLink")}
      </Link>
    </div>
  );
}
