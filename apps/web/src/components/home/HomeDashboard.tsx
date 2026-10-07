"use client";

import type { DiagnosticResult, StreakReport } from "@palier/app";
import type { Pointer, ScoredSkill, SubSkill, TargetBand } from "@palier/domain";
import { SCORED_SKILLS } from "@palier/domain";
import { type DayPlan, type PracticeActivity, type SkillTrend, localDay } from "@palier/engine";
import {
  Callout,
  Card,
  type CardTone,
  EmptyState,
  Glyph,
  type GlyphName,
  MonthCalendar,
  ProgressRail,
  Sparkline,
  buttonClass,
  cardClass,
} from "@palier/ui";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { focusText, interpretationFor, placementOf, scoreOf } from "../../features/diagnostic/result-view";
import { feedbackLangFor } from "../../features/oral/report-view";
import { type ExamReadiness, examReadiness } from "../../features/exam/readiness";
import { type NextStep, nextStep } from "../../features/home/next-step";
import { pickPointer } from "../../features/home/pointer";
import {
  type Month,
  type SkillCard,
  WEEK_OF_SUNDAY,
  calendarMarks,
  monthOf,
  skillCards,
  stepMonth,
  weekMinutes,
} from "../../features/home/today-view";
import { type EvidenceLine, evidenceLine } from "../../features/telemetry/telemetry";
import { hasAnyEstimate } from "../../features/trend/trend-lines";
import { Link } from "../../i18n/navigation";
import type { Container } from "../../lib/container";
import { type StudyProfile, daysUntil, minutesFor, planRows, readStudyProfile, sessionSizeFor } from "../../lib/study";
import { deviceTimeZone } from "../../lib/time-zone";
import { type ContainerState, useContainer } from "../ContainerProvider";
import { MilestoneMoment, StreakFreezeNotice, StreakTile, useEngagement } from "../engagement/Engagement";
import { Cited } from "../library/Cited";
import { NonAffiliation } from "../NonAffiliation";
import { TrendMeters } from "../practice/TrendMeters";

/** What does not change with the skill switch: the week, the queue, the day's pointer (D219). */
type Overview =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "needs-setup" }
  | {
      readonly status: "ready";
      readonly profile: StudyProfile;
      /** The device's local day, `YYYY-MM-DD`. */
      readonly today: string;
      readonly activity: PracticeActivity;
      readonly dueCount: number;
      /** Today's quick grammar pointer, in the language practised, on what the writing plan favours (D216, D218). */
      readonly pointer: Pointer | null;
    };

/** What the skill switch changes: the plan and where you stand at that skill. */
type SkillView =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | {
      readonly status: "ready";
      readonly plan: DayPlan;
      readonly trend: SkillTrend;
      /** What the trend rests on, for the §13.0 disclosure (D94). */
      readonly evidence: EvidenceLine | null;
      /** The last submitted mock exam, whichever skill, rescored (§8.2 zone A). */
      readonly exam: ExamReadiness | null;
      /** The latest complete diagnostic at this skill, which also placed the plan (ADR 25), or none. */
      readonly diagnostic: DiagnosticResult | null;
      /** The one step the plan card leads with (D214). */
      readonly step: NextStep;
    };

/** How far ahead of now "due" reaches for the queue count: due now, nothing later. */
const DUE_LIMIT = 500;

const loadOverview = async (container: Container): Promise<Overview> => {
  const profile = await readStudyProfile(container.settings);
  if (profile === null) return { status: "needs-setup" };
  const timeZone = deviceTimeZone();
  // The pointer is a grammar point, so it follows the writing plan's focus whichever skill is shown (D218).
  const [grammarFocus, activity, due] = await Promise.all([
    container.useCases.studyFocus({ skill: "writing", lang: "fr", targetBand: profile.targetBand }),
    container.useCases.practiceActivity({ timeZone }),
    container.schedule.due(container.clock.now(), DUE_LIMIT),
  ]);
  const today = localDay(container.clock.now(), timeZone);
  return {
    status: "ready",
    profile,
    today,
    activity,
    // The whole queue, both skills: the tile counts what `/review` will show.
    dueCount: due.length,
    pointer: pickPointer(container.pointers, { focusSubSkills: grammarFocus.focusSubSkills ?? [], day: today }),
  };
};

const loadSkill = async (container: Container, skill: ScoredSkill, profile: StudyProfile): Promise<SkillView> => {
  // A preview, not a session: `planDailySession` records nothing, so looking at the
  // card never counts as having started the day. It is biased by what the session will read
  // when it opens (`studyFocus`, ADR 25, D124), and only the plan waits for that.
  const studying = container.useCases.studyFocus({ skill, lang: "fr", targetBand: profile.targetBand });
  const [plan, trend, evidence, latestExam, examAtSkill, diagnostic] = await Promise.all([
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
  return {
    status: "ready",
    plan,
    trend,
    evidence: evidenceLine(evidence, container.profile.itemStatistics.minResponsesDifficulty),
    exam: latestExam === null ? null : examReadiness(latestExam),
    diagnostic,
    step,
  };
};

/** Reads the overview once the container is ready. A failure is its own state, never a blank page. */
const useOverview = (state: ContainerState): Overview => {
  const [overview, setOverview] = useState<Overview>({ status: "loading" });
  useEffect(() => {
    if (state.status !== "ready") return;
    let live = true;
    loadOverview(state.container).then(
      (o) => live && setOverview(o),
      () => live && setOverview({ status: "failed" }),
    );
    return () => {
      live = false;
    };
  }, [state]);
  return overview;
};

/**
 * Home (product-requirements.md §8.2, as amended by D214, D215 and D219), laid out as the human's
 * dashboard design, in Palier's palette and serif:
 *
 * - **The hero**, the deep panel: this week's answers, and the three skills as cards, each a way
 *   into its practice with how much of today's plan it has done.
 * - **The left column**: the statistics (the streak, the review queue, the week's minutes), then
 *   **today's plan**, which opens with the next step when that is not the plan itself (the
 *   diagnostic first, a retake when due, then a mock exam once practice at the target is
 *   measurable, `nextStep`), its rows, one primary action and the other ways on; then **where you
 *   stand**: the diagnostic in plain words, the practice trend per band tag (never a band letter,
 *   D64), and the last mock exam's band against its cuts once there is one.
 * - **The right column**: the practice calendar, the streak's days, and the day's grammar pointer.
 *
 * The skill switch sits in the plan and changes only the plan and where you stand. On mobile the
 * order is the hero, the plan, the pointer, the statistics, where you stand, then the calendar.
 */
export function HomeDashboard() {
  const t = useTranslations("today");
  const tCommon = useTranslations("common");
  const container = useContainer();
  const engagement = useEngagement(container);
  const overview = useOverview(container);
  const [skill, setSkill] = useState<ScoredSkill>("reading");
  // Keyed by the skill it was loaded for, so switching skill reads as loading until
  // the new skill's data arrives, with no reset inside the effect.
  const [loaded, setLoaded] = useState<{ skill: ScoredSkill; view: SkillView } | null>(null);
  const view: SkillView = loaded?.skill === skill ? loaded.view : { status: "loading" };
  const profile = overview.status === "ready" ? overview.profile : null;

  useEffect(() => {
    if (container.status !== "ready" || profile === null) return;
    let live = true;
    loadSkill(container.container, skill, profile).then(
      (v) => live && setLoaded({ skill, view: v }),
      () => live && setLoaded({ skill, view: { status: "failed" } }),
    );
    return () => {
      live = false;
    };
  }, [container, skill, profile]);

  if (container.status === "failed" || overview.status === "failed" || view.status === "failed") {
    return <Callout tone="incorrect">{tCommon("loadFailed")}</Callout>;
  }
  if (overview.status === "needs-setup") {
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
  if (overview.status === "loading" || container.status !== "ready") {
    return <p role="status">{tCommon("loading")}</p>;
  }

  const countdown = daysUntil(overview.profile.testDate, container.container.clock.now());
  const streak = engagement?.streak ?? null;

  return (
    <div className="app-stack">
      <Hero overview={overview} countdown={countdown} />

      <div className="app-home">
        <div className="app-home__main">
          <Statistics
            streak={streak}
            dueCount={overview.dueCount}
            msByDay={overview.activity.week.msByDay}
            container={container.container}
          />

          <Card className="app-home__plan">
            <h2>{t("planTitle")}</h2>
            <SkillSwitch skill={skill} onChange={setSkill} />
            {view.status === "loading" ? (
              <p role="status">{tCommon("loading")}</p>
            ) : (
              <PlanBody
                view={view}
                skill={skill}
                dueCount={overview.dueCount}
                targetBand={overview.profile.targetBand}
                diagnosticSize={container.container.profile.diagnostic.size}
              />
            )}
          </Card>

          {view.status === "loading" ? null : <WhereYouStand view={view} skill={skill} />}
        </div>

        <div className="app-home__side">
          <PracticeCalendar today={overview.today} streak={streak} testDate={overview.profile.testDate} />
          {overview.pointer === null ? null : <PointerSection pointer={overview.pointer} />}
        </div>
      </div>
      {engagement === null ? null : <MilestoneMoment milestones={engagement.milestones} container={container.container} />}
    </div>
  );
}

const SKILL_LOOK: Readonly<Record<SkillCard["kind"], { readonly tone: CardTone; readonly glyph: GlyphName }>> = {
  reading: { tone: "tint", glyph: "book" },
  writing: { tone: "mint", glyph: "pen" },
  oral: { tone: "rose", glyph: "mic" },
};

/**
 * The deep panel at the page's head (D219): the countdown, or "this week", over the week's answers,
 * then the three skills as cards, each a way into its practice.
 */
function Hero({ overview, countdown }: { overview: Extract<Overview, { status: "ready" }>; countdown: number | null }) {
  const t = useTranslations("today");
  const { week } = overview.activity;
  const cards = skillCards(overview.activity, sessionSizeFor(overview.profile.dailyGoalMinutes));
  return (
    <Card tone="deep" className="app-home__hero">
      <div className="app-home__hero-text">
        <p className="app-home__eyebrow">{countdown === null ? t("heroLabel") : t("testCountdown", { days: countdown })}</p>
        <p className="app-home__hero-title">
          {week.answered === 0 ? t("heroWeekEmpty") : t("heroWeek", { count: week.answered })}
        </p>
        {week.oralSessions === 0 ? null : <p>{t("heroOral", { count: week.oralSessions })}</p>}
      </div>
      <ol className="app-home__skills" aria-label={t("skillsLabel")}>
        {cards.map((card, i) => (
          <li key={card.kind}>
            <SkillCardLink card={card} number={i + 1} />
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** One skill in the hero: its number, mark and name, today's progress in words and as a rail, and its practice. */
function SkillCardLink({ card, number }: { card: SkillCard; number: number }) {
  const t = useTranslations("today");
  const tSkills = useTranslations("skills");
  const name = card.kind === "oral" ? t("oralName") : tSkills(card.kind);
  const look = SKILL_LOOK[card.kind];
  const line =
    card.kind === "oral"
      ? card.sessions === 0
        ? t("oralNotYet")
        : t("oralToday", { count: card.sessions, minutes: card.minutes })
      : t("skillToday", { done: card.done, goal: card.goal });
  return (
    <Link href={`/practice/${card.kind}`} className={`${cardClass(look.tone)} app-home__skill pl-focusable`}>
      <span className="app-home__skill-number" aria-hidden="true">
        {String(number).padStart(2, "0")}
      </span>
      <Glyph name={look.glyph} className="app-home__skill-glyph" />
      <span className="app-home__skill-name">{name}</span>
      <span className="app-home__skill-line">{line}</span>
      <ProgressRail
        current={card.rail.current}
        total={card.rail.total}
        label={card.kind === "oral" ? t("oralRail") : t("skillRail", { skill: name })}
      />
    </Link>
  );
}

/** The three statistics tiles (D219): the streak, the review queue, and the week's minutes with a line of each day. */
function Statistics({
  streak,
  dueCount,
  msByDay,
  container,
}: {
  streak: StreakReport | null;
  dueCount: number;
  msByDay: readonly number[];
  container: Container;
}) {
  const t = useTranslations("today");
  const minutes = weekMinutes(msByDay);
  return (
    <section className="app-home__stats" aria-labelledby="app-home-stats">
      <h2 id="app-home-stats">{t("statsTitle")}</h2>
      <div className="app-home__tiles">
        {/* Always drawn, so the streak arriving after the overview never shifts the tiles beside it. */}
        <Card className="app-home__tile">
          {streak === null ? <div className="app-home__tile-pending" aria-hidden="true" /> : <StreakTile streak={streak} />}
        </Card>
        <Link href="/review" className={`${cardClass("surface")} app-home__tile app-home__tile--link pl-focusable`}>
          <span className="app-home__figure">{dueCount}</span>
          <span className="app-home__figure-label">{t("statDue", { count: dueCount })}</span>
        </Link>
        <Card className="app-home__tile app-home__tile--wide">
          <div>
            <p className="app-home__figure">{minutes.total}</p>
            <p className="app-home__figure-label">{t("statMinutes", { count: minutes.total })}</p>
          </div>
          <Sparkline values={minutes.byDay} />
        </Card>
      </div>
      {streak === null ? null : <StreakFreezeNotice streak={streak} container={container} />}
    </section>
  );
}

/** The Reading/Writing switch, which picks the plan and where you stand. */
function SkillSwitch({ skill, onChange }: { skill: ScoredSkill; onChange: (skill: ScoredSkill) => void }) {
  const t = useTranslations("today");
  const tSkills = useTranslations("skills");
  return (
    <fieldset className="app-segmented">
      <legend className="app-segmented__legend">{t("skillLabel")}</legend>
      {SCORED_SKILLS.map((s) => (
        <label key={s} className="app-segmented__option">
          <input type="radio" name="skill" value={s} checked={skill === s} onChange={() => onChange(s)} />
          <span>{tSkills(s)}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** Today's plan at the chosen skill: the next step, the placement, the rows and the start, then the other ways on. */
function PlanBody({
  view,
  skill,
  dueCount,
  targetBand,
  diagnosticSize,
}: {
  view: Extract<SkillView, { status: "ready" }>;
  skill: ScoredSkill;
  dueCount: number;
  targetBand: TargetBand;
  diagnosticSize: number;
}) {
  const t = useTranslations("today");
  return (
    <>
      <NextStepBanner step={view.step} targetBand={targetBand} taper={view.plan.mockExamAdvised} diagnosticSize={diagnosticSize} />
      {view.diagnostic === null ? null : <PlanPlacement result={view.diagnostic} />}
      {view.plan.items.length === 0 ? (
        <div>
          <p>
            <strong>{t("doneTitle")}</strong>
          </p>
          <p>{t("doneBody")}</p>
        </div>
      ) : (
        <>
          <ul className="app-plan">
            {planRows(view.plan).map((row) => (
              <li key={row.kind} className="app-plan__row">
                <span className="app-plan__kind">{t(`row_${row.kind}`)}</span>
                <span className="app-muted">{t("rowDetail", { count: row.count, minutes: row.minutes })}</span>
              </li>
            ))}
          </ul>
          <Link href={`/practice/${skill}`} className={`${buttonClass("primary", "go")} pl-focusable app-plan__start`}>
            {t("start", { minutes: minutesFor(view.plan.items.length) })}
          </Link>
        </>
      )}
      <MorePractice dueCount={dueCount} step={view.step} hasDiagnostic={view.diagnostic !== null} targetBand={targetBand} />
    </>
  );
}

/** Where you stand at the chosen skill: the diagnostic, the practice trend once there is one, the last exam once there is one. */
function WhereYouStand({ view, skill }: { view: Extract<SkillView, { status: "ready" }>; skill: ScoredSkill }) {
  const t = useTranslations("today");
  const tSkills = useTranslations("skills");
  return (
    <Card className="app-home__readiness">
      <h2>{t("readinessCardTitle")}</h2>
      {view.diagnostic === null ? (
        <p className="app-muted">{t("standEmpty")}</p>
      ) : (
        <DiagnosticHalf result={view.diagnostic} skill={skill} />
      )}
      {hasAnyEstimate(view.trend) ? (
        <>
          <h3>{t("readinessTitle")}</h3>
          <TrendMeters trend={view.trend} />
          <p className="app-muted">{t("provenance", { count: view.trend.windowSize, skill: tSkills(skill) })}</p>
          <p className="app-muted">{t("readinessNote")}</p>
          {view.evidence === null ? null : <p className="app-muted">{t("trendEvidence", view.evidence)}</p>}
        </>
      ) : null}
      {view.exam === null ? null : <ExamHalf exam={view.exam} />}
    </Card>
  );
}

/**
 * The practice calendar (D219): the streak's days marked, the days its freeze kept, the test date,
 * and today. It opens on this month and steps a month at a time.
 */
function PracticeCalendar({ today, streak, testDate }: { today: string; streak: StreakReport | null; testDate: string | null }) {
  const t = useTranslations("today");
  const format = useFormatter();
  const [month, setMonth] = useState<Month>(() => monthOf(today));
  const title = format.dateTime(new Date(Date.UTC(month.year, month.month - 1, 1)), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const weekdays = WEEK_OF_SUNDAY.map((at) => ({
    short: format.dateTime(new Date(at), { weekday: "short", timeZone: "UTC" }),
    long: format.dateTime(new Date(at), { weekday: "long", timeZone: "UTC" }),
  }));
  return (
    <Card className="app-home__calendar">
      <MonthCalendar
        year={month.year}
        month={month.month}
        today={today}
        marks={calendarMarks(streak?.activeDays ?? [], streak?.frozen ?? [], testDate)}
        title={title}
        heading={<h2 className="app-home__calendar-title">{title}</h2>}
        weekdays={weekdays}
        markLabels={{ practised: t("calendarPractised"), kept: t("calendarKept"), test: t("calendarTest") }}
        todayLabel={t("calendarToday")}
        previous={{ label: t("calendarPrev"), onClick: () => setMonth((m) => stepMonth(m, -1)) }}
        next={{ label: t("calendarNext"), onClick: () => setMonth((m) => stepMonth(m, 1)) }}
      />
    </Card>
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
      <Link href={href} className={`${buttonClass("primary", "go")} pl-focusable`}>
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
 * Today's quick grammar pointer (D216, D218), as the design's quick pointers (D219): a heading with
 * the way to every article, and a card with the topic and the pointer. It is written in the
 * language practised, whatever the screen's, so the paragraph carries that `lang` and its examples
 * are set in italics. It links its sub-skill's library article.
 */
function PointerSection({ pointer }: { pointer: Pointer }) {
  const t = useTranslations("today");
  const tSub = useTranslations("subSkills");
  return (
    <section className="app-home__pointer" aria-labelledby="app-home-pointer">
      <div className="app-home__section-head">
        <h2 id="app-home-pointer">{t("pointerTitle")}</h2>
        <Link href="/library" className="app-link pl-focusable">
          {t("pointerViewAll")}
        </Link>
      </div>
      <Card className="app-home__pointer-card">
        <span className="app-home__pointer-mark" aria-hidden="true">
          <Glyph name="pen" />
        </span>
        <div className="app-home__pointer-body">
          <p className="app-home__eyebrow">{t("pointerTopic", { subSkill: tSub(pointer.subSkill) })}</p>
          <p className="app-home__pointer-text" lang={pointer.lang}>
            <Cited text={pointer.text} lang={pointer.lang} />
          </p>
          <Link href={`/library/${pointer.subSkill}`} className="app-link pl-focusable">
            {t("pointerMore")}
          </Link>
        </div>
      </Card>
    </section>
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
