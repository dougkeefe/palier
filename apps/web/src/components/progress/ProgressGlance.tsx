"use client";

import type { OralTotals, ProgressReport } from "@palier/app";
import type { ScoredSkill, TargetBand } from "@palier/domain";
import { BandMeter, Card, Glyph, ProgressRail } from "@palier/ui";
import { useTranslations } from "next-intl";

import { type GlanceCard, glanceCards, practiceTime } from "../../features/progress/progress-view";
import { SKILL_LOOK } from "../../features/skills/skill-look";

/**
 * The progress page's overview (progress.md D245), the deep panel Today's hero is (D219): all the time
 * practised, then the three domains side by side, each in its own fill and glyph and named in words.
 * A scored skill leads with its accuracy at the target band and its interval, or, short of the
 * evidence for one, its answers toward the first figure as a rail (R10); speaking with its sessions.
 * It restates the reports the page already holds and says "answers", never "items answered", so the
 * detail's line stays the one place that sentence is.
 */
export function ProgressGlance({
  reports,
  oral,
  band,
}: {
  reports: Readonly<Record<ScoredSkill, ProgressReport>>;
  oral: OralTotals;
  band: TargetBand;
}) {
  const t = useTranslations("progress");
  const time = practiceTime(reports, oral);
  return (
    <Card tone="deep" className="app-progress__hero">
      <div className="app-progress__hero-text">
        <h2 className="app-progress__eyebrow">{t("glanceTitle", { band })}</h2>
        <p className="app-progress__hero-title">{t("glanceTotal", time)}</p>
      </div>
      <ol className="app-progress__skills">
        {glanceCards(reports, oral, band).map((card) => (
          <li key={card.kind}>
            <GlanceSkill card={card} band={band} />
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** One domain's card: its mark and name, its headline as a figure and a picture of it, then its totals. */
function GlanceSkill({ card, band }: { card: GlanceCard; band: TargetBand }) {
  const t = useTranslations("progress");
  const tSkills = useTranslations("skills");
  const tToday = useTranslations("today");
  const tBands = useTranslations("bands");
  const tDiagnostic = useTranslations("diagnostic");
  const look = SKILL_LOOK[card.kind];
  const name = card.kind === "oral" ? tToday("oralName") : tSkills(card.kind);
  return (
    <Card tone={look.tone} className="app-progress__skill">
      <div className="app-progress__skill-head">
        <Glyph name={look.glyph} className="app-progress__skill-glyph" />
        <h3>{name}</h3>
      </div>
      {card.kind === "oral" ? (
        <>
          <p className="app-progress__figure">
            {card.sessions}{" "}
            <span className="app-progress__figure-label">{t("glanceOralLabel", { sessions: card.sessions })}</span>
          </p>
          <p className="app-progress__skill-line">{t("glanceOralMinutes", { minutes: card.minutes })}</p>
          <p className="app-progress__skill-line">{t("oralDevice")}</p>
        </>
      ) : (
        <>
          {card.headline.status === "estimate" ? (
            <>
              <p className="app-progress__figure">
                {t("glanceFigure", { accuracy: card.headline.line.percents.accuracy })}{" "}
                <span className="app-progress__figure-label">{t("glanceFigureLabel", { band, ...card.headline.line.percents })}</span>
              </p>
              <BandMeter
                label={tBands("items", { band })}
                valueText={tDiagnostic("estimate", card.headline.line.percents)}
                estimate={card.headline.line.estimate}
              />
            </>
          ) : (
            <>
              <p className="app-progress__figure">
                {t("glanceBuildingFigure", { attempted: card.headline.attempted, threshold: card.headline.threshold })}{" "}
                <span className="app-progress__figure-label">{t("glanceBuildingLabel", { band })}</span>
              </p>
              <ProgressRail current={card.headline.attempted} total={card.headline.threshold} label={t("glanceBuildingLabel", { band })} />
            </>
          )}
          <p className="app-progress__skill-line">{t("glanceAnswers", { count: card.answered, minutes: card.minutes })}</p>
        </>
      )}
    </Card>
  );
}
