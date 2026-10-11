"use client";

import type { OralHistoryEntry, OralSessionChoice } from "@palier/app";
import type { OralMode } from "@palier/domain";
import { Button, Card } from "@palier/ui";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { Ref } from "react";

import { estimateText } from "../../features/key/spend-view";
import { sessionEstimate, studioModeNote } from "../../features/oral/practice-view";
import { historyTag } from "../../features/oral/report-view";
import { Link } from "../../i18n/navigation";
import { deviceTimeZone } from "../../lib/time-zone";
import { NoKeyCard } from "../key/NoKeyCard";

const MODES: readonly OralMode[] = ["practice", "studio"];

/**
 * Spoken practice's picker (product-requirements.md §8.6, progress.md D229): the key card first when there is no key,
 * then two steps of equal weight, a mode and a session, then this device's past sessions. The modes sit side by side so
 * their costs compare at a glance, and the sessions are a grid of cards whose choose control sits at each card's foot.
 * What decides is `features/oral/practice-view.ts`; this renders it and hands the choice back to `OralPractice`.
 */
export function OralPicker({
  keyHeld,
  choices,
  perMinuteUsd,
  history,
  ownEndpoint,
  held,
  onHold,
  onChoose,
  headingRef,
}: {
  keyHeld: boolean;
  choices: readonly OralSessionChoice[];
  /** What a minute of each mode is estimated to cost, or none when it is unpriced (D117, D167). */
  perMinuteUsd: Readonly<Record<OralMode, number | null>>;
  history: readonly OralHistoryEntry[];
  /** Whether this device mints studio secrets on the user's own endpoint (D192). */
  ownEndpoint: boolean;
  held: OralMode;
  onHold: (mode: OralMode) => void;
  onChoose: (choice: OralSessionChoice) => void;
  /** "Choose a session", where focus lands when the screen comes back to the picker. */
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const t = useTranslations("oral");
  const heldPerMinute = perMinuteUsd[held];
  return (
    <div className="app-stack">
      <p>{t("intro")}</p>
      {keyHeld ? null : <NoKeyCard namespace="oral" estimateUsd={heldPerMinute} />}
      <ModeChoice perMinuteUsd={perMinuteUsd} ownEndpoint={ownEndpoint} held={held} onHold={onHold} />
      <section className="app-stack" aria-labelledby="oral-choose-title">
        <h2 id="oral-choose-title" ref={headingRef} tabIndex={-1} className="app-step-heading">
          {t("chooseTitle")}
        </h2>
        {choices.length === 0 ? <p>{t("noneAvailable")}</p> : null}
        <ul className="app-prompts app-oral-sessions">
          {choices.map((choice) => (
            <li key={choice.sessionType}>
              <SessionCard choice={choice} perMinuteUsd={heldPerMinute} keyHeld={keyHeld} onChoose={onChoose} />
            </li>
          ))}
        </ul>
      </section>
      <History history={history} />
    </div>
  );
}

/** The two modes side by side, each with its cost a minute, and below them where the chosen one sends what (D186). */
function ModeChoice({
  perMinuteUsd,
  ownEndpoint,
  held,
  onHold,
}: {
  perMinuteUsd: Readonly<Record<OralMode, number | null>>;
  ownEndpoint: boolean;
  held: OralMode;
  onHold: (mode: OralMode) => void;
}) {
  const t = useTranslations("oral");
  const locale = useLocale();
  return (
    <div className="app-stack">
      <fieldset className="app-fieldset">
        <legend className="app-step-heading">{t("modeTitle")}</legend>
        <div className="app-oral-modes">
          {MODES.map((mode) => {
            const minute = perMinuteUsd[mode];
            const hint = mode === "practice" ? "modePracticeHint" : "modeStudioHint";
            return (
              <label key={mode} className="app-choice">
                <input type="radio" name="oral-mode" value={mode} checked={held === mode} onChange={() => onHold(mode)} />
                <span className="app-choice__label">{t(mode === "practice" ? "modePractice" : "modeStudio")}</span>
                <span className="app-choice__hint">
                  {minute === null ? t(`${hint}Unpriced`) : t(hint, { amount: estimateText(minute, locale) })}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <p className="app-muted">
        {held === "practice" ? (
          <>
            <strong>{t("practiceModeTitle")}</strong> {t("practiceMode")}
          </>
        ) : (
          <>
            <strong>{t("studioModeTitle")}</strong> {t(studioModeNote(ownEndpoint))}
          </>
        )}
      </p>
    </div>
  );
}

/** One session: what it covers, then its length and estimate beside the control that chooses it, once there is a key. */
function SessionCard({
  choice,
  perMinuteUsd,
  keyHeld,
  onChoose,
}: {
  choice: OralSessionChoice;
  perMinuteUsd: number | null;
  keyHeld: boolean;
  onChoose: (choice: OralSessionChoice) => void;
}) {
  const t = useTranslations("oral");
  const locale = useLocale();
  const estimate = sessionEstimate(perMinuteUsd, choice.minutes);
  return (
    <Card className="app-oral-session">
      <h3 id={`oral-${choice.sessionType}`}>{t(`type_${choice.sessionType}`)}</h3>
      <p>{t(`purpose_${choice.sessionType}`)}</p>
      <div className="app-oral-session__foot">
        <p className="app-muted">
          {estimate === null
            ? t("sessionMetaUnpriced", { minutes: choice.minutes })
            : t("sessionMeta", { minutes: choice.minutes, amount: estimateText(estimate, locale) })}
        </p>
        {keyHeld ? (
          <Button variant="secondary" aria-describedby={`oral-${choice.sessionType}`} onClick={() => onChoose(choice)}>
            {t("choose")}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

/** This device's past sessions (D126), each opening its report, where one can be asked for when it has none. */
function History({ history }: { history: readonly OralHistoryEntry[] }) {
  const t = useTranslations("oral");
  const format = useFormatter();
  if (history.length === 0) return null;
  return (
    <section className="app-stack" aria-labelledby="oral-history-title">
      <h2 id="oral-history-title">{t("historyTitle")}</h2>
      <p className="app-muted">{t("historyNote")}</p>
      <ul className="app-list">
        {history.map((entry) => (
          <li key={entry.id} className="app-history">
            <span id={`oral-history-${entry.id}`}>
              {t("historyItem", {
                type: entry.sessionType === null ? t("historyUnknownType") : t(`type_${entry.sessionType}`),
                date: format.dateTime(new Date(entry.startedAt), { dateStyle: "medium", timeStyle: "short", timeZone: deviceTimeZone() }),
              })}
            </span>
            <span className="app-tag">{t(historyTag(entry))}</span>
            <Link
              href={{ pathname: "/practice/oral/report", query: { session: entry.id } }}
              className="app-link pl-focusable"
              aria-describedby={`oral-history-${entry.id}`}
            >
              {t("historyOpen")}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
