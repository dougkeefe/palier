"use client";

import type { DiagnosticResult as Result } from "@palier/app";
import type { DiagnosticInterpretation, ScoredSkill, SubSkill } from "@palier/domain";
import { Button, Callout, Card, EmptyState } from "@palier/ui";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import {
  type InterpretationState,
  STRENGTHS_SHOWN,
  atLineStart,
  canRetry,
  failureMessage,
  focusText,
  initialInterpretation,
  interpretationFailure,
  placementOf,
  scoreOf,
} from "../../features/diagnostic/result-view";
import { estimateText } from "../../features/key/spend-view";
import { feedbackLangFor } from "../../features/oral/report-view";
import { Link } from "../../i18n/navigation";
import type { Container } from "../../lib/container";
import { readStudyProfile } from "../../lib/study";
import { useContainer } from "../ContainerProvider";
import { NonAffiliation } from "../NonAffiliation";

type Loaded =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "none" }
  | {
      readonly status: "ready";
      readonly result: Result;
      readonly keyHeld: boolean;
      /** What writing the interpretation costs, for the offer, or `null` when unpriced. */
      readonly estimateUsd: number | null;
    };

/** The target the result reads against: the profile's, or C, the level this product is built for. */
const loadResult = async (container: Container, skill: ScoredSkill): Promise<Loaded> => {
  const profile = await readStudyProfile(container.settings);
  const [result, key] = await Promise.all([
    container.useCases.diagnosticResult({ skill, targetBand: profile?.targetBand ?? "C" }),
    container.useCases.apiKeyStatus(),
  ]);
  const cost = container.useCases.featureCosts().find((row) => row.feature === "diagnostic-interpretation");
  return result === null
    ? { status: "none" }
    : { status: "ready", result, keyHeld: key !== null, estimateUsd: cost?.estimateUsd ?? null };
};

/**
 * The diagnostic's result (product-requirements.md §6.2, ADR 25), at the end of a run and at
 * `/diagnostic/result?skill=…`: the score, right and wrong, by level and by sub-skill; the level
 * the plan now starts at and what it favours; and the written interpretation, kept on this device.
 * At the run's own end (`askOnOpen`) it is asked for at once on the user's key, since starting was
 * the consent; anywhere else, or kept in the other language, it is only offered, with its cost, so
 * opening a page never spends. It never shows a question, and it names no band (ADR 7). The score
 * and the placement stand on their own if the interpretation fails.
 */
export function DiagnosticResult({ skill, askOnOpen = false }: { skill: ScoredSkill; askOnOpen?: boolean }) {
  const t = useTranslations("diagnostic");
  const tSkills = useTranslations("skills");
  const tCommon = useTranslations("common");
  const tSub = useTranslations("subSkills");
  const locale = useLocale();
  const container = useContainer();
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const [words, setWords] = useState<InterpretationState>({ kind: "idle" });

  const ask = useCallback(
    async (ready: Container, targetBand: Result["summary"]["targetBand"]) => {
      setWords({ kind: "asking" });
      // A request still out from a moment ago is joined, never repeated (D127, D143).
      const pending =
        ready.useCases.diagnosticInterpretationInFlight({ skill, targetBand }) ??
        ready.useCases.requestDiagnosticInterpretation({ skill, targetBand, feedbackLang: feedbackLangFor(locale) });
      try {
        setWords({ kind: "ready", interpretation: await pending });
      } catch (error) {
        setWords({ kind: "failed", failure: interpretationFailure(error) });
      }
    },
    [skill, locale],
  );

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    const ready = container.container;
    loadResult(ready, skill).then(
      (next) => {
        if (!live) return;
        setLoaded(next);
        if (next.status !== "ready") return;
        const start = initialInterpretation(next.result, next.keyHeld, askOnOpen, feedbackLangFor(locale));
        setWords(start);
        if (start.kind === "asking") void ask(ready, next.result.summary.targetBand);
      },
      () => live && setLoaded({ status: "failed" }),
    );
    return () => {
      live = false;
    };
  }, [container, skill, ask, askOnOpen, locale]);

  if (container.status === "failed" || loaded.status === "failed") {
    return <Callout tone="incorrect">{tCommon("loadFailed")}</Callout>;
  }
  if (container.status !== "ready" || loaded.status === "loading") return <p role="status">{tCommon("loading")}</p>;
  if (loaded.status === "none") {
    return (
      <EmptyState
        heading={t("noneTitle")}
        action={
          <Link href="/diagnostic" className="pl-btn pl-btn--primary pl-focusable">
            {t("noneAction")}
          </Link>
        }
      >
        {t("noneBody")}
      </EmptyState>
    );
  }

  const { summary } = loaded.result;
  const score = scoreOf(summary);
  const placement = placementOf(summary);
  const name = (subSkill: SubSkill) => tSub(subSkill);
  const focus = focusText(summary.focusSubSkills, name, locale);

  return (
    <section className="app-stack">
      <h2>{t("resultTitle", { skill: tSkills(skill) })}</h2>

      <Card>
        <p className="app-diagnostic__score">{t("scoreLine", { correct: score.correct, attempted: score.attempted })}</p>
        <p className="app-muted">{t("scoreWrong", { wrong: score.wrong })}</p>
        <h3>{t("byLevelTitle")}</h3>
        <ul className="app-list">
          {summary.bands.map((band) => (
            <li key={band.band}>{t("levelRow", { band: band.band, correct: band.correct, attempted: band.attempted })}</li>
          ))}
        </ul>
        <p>
          <strong>{t(placement.key, placement.values)}</strong>
          {focus === null ? null : <> {t("focusLine", { list: focus })}</>}
        </p>
        <p className="app-muted">{t("questionsNote")}</p>
      </Card>

      <Card>
        <h3>{t("interpretationTitle")}</h3>
        {/* One live region for every state, so the result is announced as it arrives, not mounted silently. */}
        <div aria-live="polite">
          <Interpretation
            state={words}
            estimateUsd={loaded.estimateUsd}
            onAsk={() => void ask(container.container, summary.targetBand)}
            subSkillName={name}
          />
        </div>
      </Card>

      <Card tone="quiet">
        <h3>{t("bySubSkillTitle")}</h3>
        <ul className="app-list">
          {summary.subSkills.map((tally) => (
            <li key={tally.subSkill}>
              {t("subSkillRow", {
                name: atLineStart(name(tally.subSkill), locale),
                correct: tally.correct,
                attempted: tally.attempted,
              })}
            </li>
          ))}
        </ul>
      </Card>

      <NonAffiliation />
      <Link href="/home" className="pl-btn pl-btn--primary pl-focusable">
        {t("toToday")}
      </Link>
    </section>
  );
}

/**
 * The written half: being written, written, offered with its cost, failed with a way to ask again,
 * or no key to write it with.
 */
function Interpretation({
  state,
  estimateUsd,
  onAsk,
  subSkillName,
}: {
  state: InterpretationState;
  estimateUsd: number | null;
  onAsk: () => void;
  subSkillName: (subSkill: SubSkill) => string;
}) {
  const t = useTranslations("diagnostic");
  const locale = useLocale();
  switch (state.kind) {
    case "idle":
    case "asking":
      return <p>{t("asking")}</p>;
    case "ready":
      return <Written interpretation={state.interpretation} subSkillName={subSkillName} />;
    case "offer":
      return (
        <div className="app-stack">
          {state.existing === null ? null : <Written interpretation={state.existing} subSkillName={subSkillName} />}
          <p>
            {state.existing === null ? t("offer") : t("offerOtherLanguage")}{" "}
            {estimateUsd === null ? t("preflightUnpriced") : t("offerCost", { amount: estimateText(estimateUsd, locale) })}
          </p>
          <div className="app-actions">
            <Button variant="secondary" onClick={onAsk}>
              {state.existing === null ? t("offerAction") : t("offerAgainAction")}
            </Button>
          </div>
        </div>
      );
    case "no-key":
      return (
        <div className="app-stack">
          <p>{t("noKeyResult")}</p>
          <Link href="/settings/key" className="app-link pl-focusable">
            {t("noKeyAdd")}
          </Link>
        </div>
      );
    case "failed":
      return (
        <Callout tone="incorrect">
          <span role="alert">{t(failureMessage(state.failure))}</span> {t("scoreKept")}{" "}
          {canRetry(state.failure) ? (
            <Button variant="secondary" onClick={onAsk}>
              {t("tryAgain")}
            </Button>
          ) : null}
        </Callout>
      );
  }
}

function Written({
  interpretation,
  subSkillName,
}: {
  interpretation: DiagnosticInterpretation;
  subSkillName: (subSkill: SubSkill) => string;
}) {
  const t = useTranslations("diagnostic");
  const locale = useLocale();
  return (
    <div className="app-stack">
      <p>
        <strong>{interpretation.headline}</strong>
      </p>
      <p>{interpretation.summary}</p>
      {interpretation.strengths.length === 0 ? null : (
        <>
          <h4>{t("strengthsTitle")}</h4>
          <ul className="app-list">
            {interpretation.strengths.slice(0, STRENGTHS_SHOWN).map((strength, i) => (
              // The model's words, which can repeat: the position keeps each key apart.
              <li key={`${String(i)}-${strength}`}>{strength}</li>
            ))}
          </ul>
        </>
      )}
      <h4>{t("prioritiesTitle")}</h4>
      <ol className="app-list">
        {interpretation.priorities.map((priority) => (
          <li key={priority.subSkill}>
            <strong>{t("priorityLead", { name: atLineStart(subSkillName(priority.subSkill), locale) })}</strong> {priority.what} <span className="app-muted">{priority.why}</span>
          </li>
        ))}
      </ol>
      <p>{interpretation.planNote}</p>
    </div>
  );
}
