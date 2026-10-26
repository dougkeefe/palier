"use client";

import type { OralProgress, OralTotals, ProgressReport } from "@palier/app";
import type { ScoredSkill, TargetBand } from "@palier/domain";
import type { TrendPoint } from "@palier/engine";
import { SCORED_SKILLS } from "@palier/domain";
import { Button, Callout, Card, TabPanel, Tabs, TallyBar, tabIds } from "@palier/ui";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

import { DETAIL_TABS, ORAL_RECENT_SESSIONS, oralDetail, tallyScale } from "../../features/progress/progress-view";
import { SKILL_LOOK, type SkillKind } from "../../features/skills/skill-look";
import { TREND_HISTORY_WEEKS, historyBand } from "../../features/trend/trend-history";
import { highestScoredTarget, readStudyProfile, targetFor } from "../../lib/study";
import { deviceTimeZone } from "../../lib/time-zone";
import { useContainer } from "../ContainerProvider";
import { ExportButton } from "../data/ExportButton";
import { NonAffiliation } from "../NonAffiliation";
import { TrendMeters } from "../practice/TrendMeters";
import { OralCards } from "./OralCards";
import { ProgressGlance } from "./ProgressGlance";
import { TrendHistory } from "./TrendHistory";

/** Prefixes the detail's tab and panel ids. */
const DETAIL_ID = "progress-detail";

type Loaded = {
  readonly reports: Readonly<Record<ScoredSkill, ProgressReport>>;
  /** Each skill's trend at the end of each of the last `TREND_HISTORY_WEEKS` weeks (D198). */
  readonly histories: Readonly<Record<ScoredSkill, readonly TrendPoint[]>>;
  /** The band the overview reads: the highest scored skill's target (D259). */
  readonly band: TargetBand;
  /** The band each skill's history follows: that skill's target (D259). */
  readonly bands: Readonly<Record<ScoredSkill, TargetBand>>;
  readonly oral: OralTotals;
  /** Speaking's detail: its newest sessions and its newest report (D247). */
  readonly oralProgress: OralProgress;
  readonly printedAt: string;
};

/**
 * Progress (product-requirements.md §8.9), laid out as a dashboard in Today's language (D245):
 *
 * - **At a glance**, the deep panel: all the time practised, then the three domains side by side,
 *   each a card in its own fill and glyph: a scored skill's accuracy at the target band with its
 *   interval, or its answers toward the first figure as a rail (R10); speaking's sessions and minutes.
 * - **In detail**, for the domain its tabs pick (D247: three equal tabs, never a radio group, which
 *   reads as a question). A scored skill: the practice trend with its interval, and over time, week
 *   by week at the target band (D198), beside accuracy by sub-skill, plain counts with a bar each
 *   whose length is the answers given (no percentage on a handful of answers, R10). Speaking: its
 *   newest sessions, measured, beside what its newest report says to work on (`OralCards`).
 *   Each hero card has a way into its tab.
 * - Then the honest panel on what this does and does not say, the export, and the statement.
 *
 * **It is also the one-page PDF summary** (Gate K, progress.md D145): printed, the page
 * drops the tabs, the export and the site chrome, and shows both skills at once, so
 * "Print or save as PDF" is the whole of it and no PDF library ships.
 * A skill the tabs do not show is **mounted only while printing** (`usePrinting`), not
 * hidden on screen: a hidden copy is still in the document, and "13 items answered" twice is
 * ambiguous to anything reading it, a test's locator included.
 *
 * Everything below the tabs renders in one pass once every report has loaded.
 * Static cards drawn early were pushed down when the report arrived above them, a layout
 * shift of 0.148 that Lighthouse caught (performance 0.94).
 */
export function ProgressScreen() {
  const t = useTranslations("progress");
  const tCommon = useTranslations("common");
  const tSkills = useTranslations("skills");
  const tToday = useTranslations("today");
  const format = useFormatter();
  const container = useContainer();
  const [skill, setSkill] = useState<SkillKind>("reading");
  const [loaded, setLoaded] = useState<Loaded | "failed" | null>(null);
  const printing = usePrinting();
  const head = useRef<HTMLDivElement>(null);

  // A hero card's way in: its tab is shown and focused, and the detail's heading brought to the top.
  const showDetail = (kind: SkillKind) => {
    flushSync(() => setSkill(kind));
    document.getElementById(tabIds(DETAIL_ID, kind).tab)?.focus({ preventScroll: true });
    head.current?.scrollIntoView({ block: "start" });
  };

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    const { useCases, clock, settings } = container.container;
    const timeZone = deviceTimeZone();
    Promise.all([
      Promise.all(SCORED_SKILLS.map((s) => useCases.progressReport({ skill: s }))),
      Promise.all(SCORED_SKILLS.map((s) => useCases.practiceTrendHistory({ skill: s, weeks: TREND_HISTORY_WEEKS, timeZone }))),
      readStudyProfile(settings),
      useCases.oralTotals(),
      useCases.oralProgress({ limit: ORAL_RECENT_SESSIONS }),
    ]).then(
      ([reports, histories, profile, oral, oralProgress]) =>
        live &&
        setLoaded({
          reports: Object.fromEntries(SCORED_SKILLS.map((s, i) => [s, reports[i]!])) as Record<ScoredSkill, ProgressReport>,
          histories: Object.fromEntries(SCORED_SKILLS.map((s, i) => [s, histories[i]!])) as Record<ScoredSkill, TrendPoint[]>,
          band: historyBand(profile === null ? null : highestScoredTarget(profile)),
          bands: Object.fromEntries(
            SCORED_SKILLS.map((s) => [s, historyBand(profile === null ? null : targetFor(profile, s))]),
          ) as Record<ScoredSkill, TargetBand>,
          oral,
          oralProgress,
          printedAt: clock.now(),
        }),
      () => live && setLoaded("failed"),
    );
    return () => {
      live = false;
    };
  }, [container]);

  const failed = container.status === "failed" || loaded === "failed";
  return (
    <div className="app-stack app-progress">
      {failed ? (
        <Callout tone="incorrect">{tCommon("loadFailed")}</Callout>
      ) : loaded === null ? (
        <p role="status">{tCommon("loading")}</p>
      ) : (
        <>
          <p className="app-muted app-print-only">
            {t("printedOn", { date: format.dateTime(new Date(loaded.printedAt), { dateStyle: "long" }) })}
          </p>
          {/* Paper already shows both skills in full and the oral card below, so the overview is the screen's alone. */}
          {printing ? null : (
            <ProgressGlance reports={loaded.reports} oral={loaded.oral} band={loaded.band} onSeeDetail={showDetail} />
          )}
          <div className="app-progress__head app-screen-only" ref={head}>
            <h2>{t("detailTitle")}</h2>
            <Tabs
              label={t("detailTabs")}
              items={DETAIL_TABS.map((kind) => ({
                id: kind,
                label: kind === "oral" ? tToday("oralName") : tSkills(kind),
                glyph: SKILL_LOOK[kind].glyph,
                tone: SKILL_LOOK[kind].tone,
              }))}
              selected={skill}
              onSelect={setSkill}
              idPrefix={DETAIL_ID}
            />
          </div>
          {printing ? (
            <div className="app-progress__detail">
              {SCORED_SKILLS.map((s) => (
                <SkillCards
                  key={s}
                  skill={s}
                  report={loaded.reports[s]}
                  history={loaded.histories[s]}
                  band={loaded.bands[s]}
                  printing
                  printOnly={s !== skill}
                />
              ))}
            </div>
          ) : (
            <TabPanel idPrefix={DETAIL_ID} id={skill} className="app-progress__detail">
              {skill === "oral" ? (
                <OralCards detail={oralDetail(loaded.oralProgress)} totals={loaded.oral} />
              ) : (
                <SkillCards
                  key={skill}
                  skill={skill}
                  report={loaded.reports[skill]}
                  history={loaded.histories[skill]}
                  band={loaded.bands[skill]}
                  printing={false}
                  printOnly={false}
                />
              )}
            </TabPanel>
          )}
          {printing ? (
            <Card>
              <h2>{t("oralTitle")}</h2>
              <p>
                {loaded.oral.sessions === 0
                  ? t("oralNone")
                  : t("oralLine", { sessions: loaded.oral.sessions, minutes: Math.round(loaded.oral.msSpoken / 60_000) })}
              </p>
              <p className="app-muted">{t("oralDevice")}</p>
            </Card>
          ) : null}
          <div className="app-progress__footer">
            <Card tone="quiet">
              <h2>{t("honestTitle")}</h2>
              <p>{t("honestDoes")}</p>
              <p>{t("honestDoesNot")}</p>
            </Card>
            <Card className="app-screen-only">
              <h2>{t("exportTitle")}</h2>
              <p>{t("exportBody")}</p>
              <div className="app-actions">
                <ExportButton variant="secondary" />
                <Button variant="secondary" onClick={() => window.print()}>
                  {t("printAction")}
                </Button>
              </div>
              <p className="app-muted">{t("printBody")}</p>
            </Card>
          </div>
          <NonAffiliation />
        </>
      )}
    </div>
  );
}

/**
 * One skill's trend and sub-skill cards. The skill is named in each heading only when
 * printed, where both skills stand side by side; on screen the switch names it. The trend
 * over time sits in the trend card on screen, and in a card of its own across the page on paper.
 * Each sub-skill's bar is drawn to the most practised one's scale (D245); paper keeps the counts.
 */
function SkillCards({
  skill,
  report,
  history,
  band,
  printing,
  printOnly,
}: {
  skill: ScoredSkill;
  report: ProgressReport;
  history: readonly TrendPoint[];
  band: TargetBand;
  printing: boolean;
  printOnly: boolean;
}) {
  const t = useTranslations("progress");
  const tSkills = useTranslations("skills");
  const tSub = useTranslations("subSkills");
  const className = printOnly ? "app-print-only" : undefined;
  const scale = tallyScale(report.bySubSkill);
  const skillName = <span className="app-print-only">{t("skillSuffix", { skill: tSkills(skill) })}</span>;
  return (
    <>
      <Card className={className}>
        <h2>
          {t("trendTitle")}
          {skillName}
        </h2>
        <TrendMeters trend={report.trend} />
        <div className="app-progress__facts">
          <p className="app-muted">{t("answered", { count: report.answered })}</p>
          <p className="app-muted">{t("timeAnswering", { minutes: Math.round(report.msAnswering / 60_000) })}</p>
        </div>
        {printing ? null : <TrendHistory points={history} band={band} printing={false} />}
      </Card>
      <Card className={className}>
        <h2>
          {t("subSkillTitle")}
          {skillName}
        </h2>
        {report.bySubSkill.length === 0 ? (
          <p className="app-muted">{t("subSkillEmpty")}</p>
        ) : (
          <>
            <p className="app-progress__eyebrow app-screen-only">{t("subSkillOrder")}</p>
            <ul className="app-plan app-progress__tallies">
              {report.bySubSkill.map((row) => (
                <li key={row.subSkill} className="app-plan__row app-progress__tally">
                  <span className="app-plan__kind">{tSub(row.subSkill)}</span>
                  <TallyBar correct={row.correct} attempted={row.attempted} scale={scale} />
                  <span className="app-muted">{t("subSkillRow", { correct: row.correct, attempted: row.attempted })}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
      {/* Printed, the trend over time is its own row across the page, so the summary stays one page (D198). */}
      {printing ? (
        <Card className={["app-trend-history-card", className].filter(Boolean).join(" ")}>
          <TrendHistory points={history} band={band} printing />
        </Card>
      ) : null}
    </>
  );
}

/**
 * Whether the page is being printed: between `beforeprint` and `afterprint`, which a print from
 * the browser's menu fires as well as `window.print()`, **or** while the print media query
 * matches, as it does when print is emulated. Either is enough: Chromium's PDF export fires
 * `afterprint` while the page is still laid out for print, and the media query outlasts it.
 * The events are flushed at once, so the print snapshot already has the second skill.
 */
const PRINT = "print";

const subscribePrintMedia = (onChange: () => void) => {
  const media = window.matchMedia(PRINT);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

function usePrinting(): boolean {
  const [printEvent, setPrintEvent] = useState(false);
  const printMedia = useSyncExternalStore(
    subscribePrintMedia,
    () => window.matchMedia(PRINT).matches,
    () => false,
  );
  useEffect(() => {
    const before = () => flushSync(() => setPrintEvent(true));
    const after = () => setPrintEvent(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  return printEvent || printMedia;
}
