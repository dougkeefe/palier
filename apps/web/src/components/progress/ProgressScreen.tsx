"use client";

import type { OralTotals, ProgressReport } from "@palier/app";
import type { ScoredSkill, TargetBand } from "@palier/domain";
import type { TrendPoint } from "@palier/engine";
import { SCORED_SKILLS } from "@palier/domain";
import { Button, Callout, Card } from "@palier/ui";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

import { TREND_HISTORY_WEEKS, historyBand } from "../../features/trend/trend-history";
import { readStudyProfile } from "../../lib/study";
import { deviceTimeZone } from "../../lib/time-zone";
import { useContainer } from "../ContainerProvider";
import { ExportButton } from "../data/ExportButton";
import { NonAffiliation } from "../NonAffiliation";
import { TrendMeters } from "../practice/TrendMeters";
import { TrendHistory } from "./TrendHistory";

type Loaded = {
  readonly reports: Readonly<Record<ScoredSkill, ProgressReport>>;
  /** Each skill's trend at the end of each of the last `TREND_HISTORY_WEEKS` weeks (D198). */
  readonly histories: Readonly<Record<ScoredSkill, readonly TrendPoint[]>>;
  /** The band the history follows: the study profile's target. */
  readonly band: TargetBand;
  readonly oral: OralTotals;
  readonly printedAt: string;
};

/**
 * Progress (product-requirements.md §8.9): the practice trend with its interval, and
 * over time, week by week at the target band (D198), accuracy by sub-skill as plain counts (no percentage on a handful of answers, R10),
 * items answered, time spent answering, oral sessions and minutes spoken, an honest
 * panel on what this does and does not say, and the export.
 *
 * **It is also the one-page PDF summary** (Gate K, progress.md D145): printed, the page
 * drops the switch, the export and the site chrome, and shows both skills at once, so
 * "Print or save as PDF" is the whole of it and no PDF library ships.
 * The skill the switch does not show is **mounted only while printing** (`usePrinting`), not
 * hidden on screen: a hidden copy is still in the document, and "13 items answered" twice is
 * ambiguous to anything reading it, a test's locator included.
 *
 * Everything below the skill switch renders in one pass once every report has loaded.
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
  const [skill, setSkill] = useState<ScoredSkill>("reading");
  const [loaded, setLoaded] = useState<Loaded | "failed" | null>(null);
  const printing = usePrinting();

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
    ]).then(
      ([reports, histories, profile, oral]) =>
        live &&
        setLoaded({
          reports: Object.fromEntries(SCORED_SKILLS.map((s, i) => [s, reports[i]!])) as Record<ScoredSkill, ProgressReport>,
          histories: Object.fromEntries(SCORED_SKILLS.map((s, i) => [s, histories[i]!])) as Record<ScoredSkill, TrendPoint[]>,
          band: historyBand(profile?.targetBand ?? null),
          oral,
          printedAt: clock.now(),
        }),
      () => live && setLoaded("failed"),
    );
    return () => {
      live = false;
    };
  }, [container]);

  return (
    <div className="app-stack app-progress">
      <fieldset className="app-segmented app-screen-only">
        <legend className="app-segmented__legend">{tToday("skillLabel")}</legend>
        {SCORED_SKILLS.map((s) => (
          <label key={s} className="app-segmented__option">
            <input type="radio" name="skill" value={s} checked={skill === s} onChange={() => setSkill(s)} />
            <span>{tSkills(s)}</span>
          </label>
        ))}
      </fieldset>

      {container.status === "failed" || loaded === "failed" ? (
        <Callout tone="incorrect">{tCommon("loadFailed")}</Callout>
      ) : loaded === null ? (
        <p role="status">{tCommon("loading")}</p>
      ) : (
        <>
          <p className="app-muted app-print-only">
            {t("printedOn", { date: format.dateTime(new Date(loaded.printedAt), { dateStyle: "long" }) })}
          </p>
          {SCORED_SKILLS.filter((s) => s === skill || printing).map((s) => (
            <SkillCards
              key={s}
              skill={s}
              report={loaded.reports[s]}
              history={loaded.histories[s]}
              band={loaded.band}
              printing={printing}
              printOnly={s !== skill}
            />
          ))}
          <Card>
            <h2>{t("oralTitle")}</h2>
            <p>
              {loaded.oral.sessions === 0
                ? t("oralNone")
                : t("oralLine", { sessions: loaded.oral.sessions, minutes: Math.round(loaded.oral.msSpoken / 60_000) })}
            </p>
            <p className="app-muted">{t("oralDevice")}</p>
          </Card>
          <Card>
            <h2>{t("honestTitle")}</h2>
            <p>{t("honestDoes")}</p>
            <p>{t("honestDoesNot")}</p>
          </Card>
          <NonAffiliation />
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
        </>
      )}
    </div>
  );
}

/**
 * One skill's trend and sub-skill cards. The skill is named in each heading only when
 * printed, where both skills stand side by side; on screen the switch names it. The trend
 * over time sits in the trend card on screen, and in a card of its own across the page on paper.
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
  const skillName = <span className="app-print-only">{t("skillSuffix", { skill: tSkills(skill) })}</span>;
  return (
    <>
      <Card className={className}>
        <h2>
          {t("trendTitle")}
          {skillName}
        </h2>
        <TrendMeters trend={report.trend} />
        <p className="app-muted">{t("answered", { count: report.answered })}</p>
        <p className="app-muted">{t("timeAnswering", { minutes: Math.round(report.msAnswering / 60_000) })}</p>
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
