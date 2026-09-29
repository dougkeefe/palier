"use client";

import type { GeneratePracticeSetResult, GeneratedSet } from "@palier/app";
import type { SubSkill, TargetBand } from "@palier/domain";
import { Button, Callout, Card, Toast } from "@palier/ui";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useReducer, useRef, useState } from "react";

import {
  failureMessage,
  generateFailure,
  generator,
  initialGenerator,
  resultSummary,
  resumedGenerator,
} from "../../features/generate/generate-view";
import { estimateText } from "../../features/key/spend-view";
import { preflightNotice } from "../../features/writing/workshop-view";
import type { Container } from "../../lib/container";
import { readStudyProfile } from "../../lib/study";
import { deviceTimeZone } from "../../lib/time-zone";
import { useContainer } from "../ContainerProvider";
import { NoKeyCard } from "../key/NoKeyCard";
import { PracticeSession } from "../practice/PracticeSession";

/** Without a study profile, a set aims at C, the level this product is built for (as D108 does). */
const DEFAULT_TARGET: TargetBand = "C";

/** The practice language is French until the English mirror (Phase 8). */
const TARGET_LANG = "fr" as const;

type Setup = {
  readonly keyHeld: boolean;
  readonly targetBand: TargetBand;
  readonly latest: GeneratedSet | null;
  /** A set this device asked for and is still making, from before this screen opened (D143). */
  readonly inFlight: { readonly subSkill: SubSkill; readonly result: Promise<GeneratePracticeSetResult> } | null;
};

const loadSetup = async (container: Container): Promise<Setup> => {
  const [status, profile, latest] = await Promise.all([
    container.useCases.apiKeyStatus(),
    readStudyProfile(container.settings),
    container.useCases.latestGeneratedSet(),
  ]);
  const held = container.useCases.generationInFlight();
  return {
    keyHeld: status !== null,
    targetBand: profile?.targetBand ?? DEFAULT_TARGET,
    latest,
    inFlight: held === null ? null : { subSkill: held.request.subSkill, result: held.result },
  };
};

/**
 * "Generate a fresh set" (architecture.md §8.3, progress.md D110–D111): choose a
 * written-expression sub-skill, see the pre-flight estimate exactly as the workshop shows it
 * (never a block), and one metered use case drafts a set, reviews each item blind, and keeps
 * what passes. The set is practised with the ordinary renderers, each item carrying its
 * provenance badge and the one-tap contribution. Without a key, PRD §14's inline card. The
 * last set stays on this device, so a reload never loses what was paid for, and none of it
 * is ever synced, exported or counted in progress.
 */
export function GenerateSet() {
  const tCommon = useTranslations("common");
  const container = useContainer();
  const [setup, setSetup] = useState<Setup | null>(null);

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    void loadSetup(container.container).then((loaded) => live && setSetup(loaded));
    return () => {
      live = false;
    };
  }, [container]);

  if (container.status === "failed") return <p role="status">{tCommon("loadFailed")}</p>;
  if (container.status !== "ready" || setup === null) return <p role="status">{tCommon("loading")}</p>;
  const subSkills = container.container.profile.subSkills.writing;
  const first = subSkills[0];
  if (first === undefined) return null;
  return (
    <Generator
      container={container.container}
      setup={setup}
      subSkills={subSkills}
      initialSubSkill={first}
      onSetup={setSetup}
    />
  );
}

function Generator({
  container,
  setup,
  subSkills,
  initialSubSkill,
  onSetup,
}: {
  container: Container;
  setup: Setup;
  subSkills: readonly SubSkill[];
  initialSubSkill: SubSkill;
  onSetup: (update: (current: Setup | null) => Setup | null) => void;
}) {
  const t = useTranslations("generate");
  const tSub = useTranslations("subSkills");
  const id = useId();
  const [state, dispatch] = useReducer(generator, setup.inFlight?.subSkill ?? initialSubSkill, (subSkill) =>
    setup.inFlight === null ? initialGenerator(subSkill) : resumedGenerator(subSkill),
  );
  const resultRef = useRef<HTMLHeadingElement>(null);
  const subSkillRef = useRef<HTMLSelectElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const noKeyRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const { useCases } = container;
  const notCounted = <Callout tone="info">{t("notCounted")}</Callout>;
  const estimateUsd = useCases.featureCosts().find((cost) => cost.feature === "item-generation")?.estimateUsd ?? null;

  // Focus follows the user's move, so it never falls back to the page (WCAG 2.4.3): to the
  // result's heading once a set arrives; to the status line while one is generating, since the
  // controls are disabled and it says what is happening; to the no-key card if the key went
  // mid-run; and back to the sub-skill after a cancel, a failure or a finished set.
  const requestKind = state.phase === "choosing" ? state.request.kind : null;
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    if (state.phase === "result") resultRef.current?.focus();
    else if (!setup.keyHeld) noKeyRef.current?.focus();
    else if (requestKind === "sending") statusRef.current?.focus();
    else if (requestKind === "idle" || requestKind === "failed") subSkillRef.current?.focus();
  }, [state.phase, requestKind, setup.keyHeld]);

  const back = () => {
    moved.current = true;
    dispatch({ type: "back" });
  };

  const onGenerate = async () => {
    dispatch({ type: "preflighted", preflight: await useCases.preflightSpend({ feature: "item-generation" }) });
  };

  // Settles a run into the screen: the result, or the failure in plain words. Stable, so the
  // effect below follows a run from before this screen opened exactly once (D143).
  const settle = useCallback(
    async (pending: Promise<GeneratePracticeSetResult>) => {
      try {
        const result = await pending;
        moved.current = true;
        dispatch({ type: "generated", result });
        if (result.set !== null) onSetup((current) => current && { ...current, latest: result.set });
      } catch (error) {
        const failure = generateFailure(error);
        if (failure === "no-key") onSetup((current) => current && { ...current, keyHeld: false });
        moved.current = true;
        dispatch({ type: "failed", failure });
      }
    },
    [onSetup],
  );

  // A run from before this screen opened is followed, never asked for again.
  const resumed = setup.inFlight?.result;
  useEffect(() => {
    if (resumed !== undefined) void settle(resumed);
  }, [resumed, settle]);

  const onSend = async (subSkill: SubSkill) => {
    moved.current = true;
    dispatch({ type: "sending" });
    await settle(useCases.generatePracticeSet({ subSkill, targetBand: setup.targetBand, lang: TARGET_LANG }));
  };

  if (state.phase === "practising") {
    return (
      <div className="app-stack">
        {notCounted}
        <PracticeSession key={state.set.id} mode="generated" set={state.set} onDone={back} />
      </div>
    );
  }

  if (state.phase === "result") {
    const summary = resultSummary(state.result);
    const set = state.result.set;
    return (
      <div className="app-stack">
        {notCounted}
        <Card>
          <h2 ref={resultRef} tabIndex={-1} className="app-step-heading">
            {t("resultTitle")}
          </h2>
          <div className="app-stack">
            <p>{t(summary.key, { kept: summary.kept, drafted: summary.drafted })}</p>
            <p className="app-muted">{t("resultWhy")}</p>
            <div className="app-actions">
              {set === null ? null : <Button onClick={() => dispatch({ type: "practise", set })}>{t("practise")}</Button>}
              <Button variant="secondary" onClick={back}>
                {t("generateAnother")}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const { request, subSkill } = state;
  return (
    <div className="app-stack">
      <p>{t("intro")}</p>
      {notCounted}
      {!setup.keyHeld ? (
        <NoKeyCard namespace="generate" estimateUsd={estimateUsd} headingRef={noKeyRef} />
      ) : request.kind === "confirming" ? (
        <Preflight
          estimateUsd={request.preflight.estimateUsd}
          notice={preflightNotice(request.preflight)}
          onSend={() => void onSend(subSkill)}
          onCancel={() => {
            moved.current = true;
            dispatch({ type: "cancel" });
          }}
        />
      ) : (
        <Card>
          <div className="app-stack">
            <label className="app-field" htmlFor={`${id}-sub-skill`}>
              <span>{t("subSkillLabel")}</span>
              <select
                ref={subSkillRef}
                id={`${id}-sub-skill`}
                className="app-input"
                aria-describedby={`${id}-sub-skill-hint`}
                value={subSkill}
                disabled={request.kind === "sending"}
                onChange={(event) => dispatch({ type: "choose-sub-skill", subSkill: event.target.value as SubSkill })}
              >
                {subSkills.map((s) => (
                  <option key={s} value={s}>
                    {tSub(s)}
                  </option>
                ))}
              </select>
              <span id={`${id}-sub-skill-hint`} className="app-muted">
                {t("subSkillHint", { band: setup.targetBand })}
              </span>
            </label>
            <div className="app-actions">
              <Button onClick={() => void onGenerate()} disabled={request.kind === "sending"}>
                {request.kind === "failed" ? t("tryAgain") : t("generate")}
              </Button>
            </div>
            {request.kind === "sending" ? (
              <div ref={statusRef} tabIndex={-1}>
                <Toast tone="info">{t("sending")}</Toast>
              </div>
            ) : null}
            {request.kind === "failed" ? <Toast tone="incorrect">{t(failureMessage(request.failure))}</Toast> : null}
          </div>
        </Card>
      )}
      {setup.latest === null || request.kind === "sending" ? null : (
        <LastSet set={setup.latest} onPractise={() => dispatch({ type: "practise", set: setup.latest as GeneratedSet })} />
      )}
    </div>
  );
}

function Preflight({
  estimateUsd,
  notice,
  onSend,
  onCancel,
}: {
  estimateUsd: number | null;
  notice: ReturnType<typeof preflightNotice>;
  onSend: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("generate");
  const locale = useLocale();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <Card>
      <h2 ref={headingRef} tabIndex={-1} className="app-step-heading">
        {t("preflightTitle")}
      </h2>
      <div className="app-stack">
        <p>
          {estimateUsd === null
            ? t("preflightUnpriced")
            : t("preflightEstimate", { amount: estimateText(estimateUsd, locale) })}
        </p>
        {notice === null ? null : <Callout tone={notice.tone}>{t(notice.key)}</Callout>}
        <p className="app-muted">{t("sendsTo")}</p>
        <div className="app-actions">
          <Button onClick={onSend}>{t("send")}</Button>
          <Button variant="secondary" onClick={onCancel}>
            {t("cancel")}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function LastSet({ set, onPractise }: { set: GeneratedSet; onPractise: () => void }) {
  const t = useTranslations("generate");
  const format = useFormatter();
  return (
    <section className="app-stack" aria-labelledby="generate-last-title">
      <h2 id="generate-last-title">{t("lastTitle")}</h2>
      <p>
        {t("lastBody", {
          count: set.items.length,
          date: format.dateTime(new Date(set.createdAt), { dateStyle: "medium", timeStyle: "short", timeZone: deviceTimeZone() }),
        })}
      </p>
      <div className="app-actions">
        <Button variant="secondary" onClick={onPractise}>
          {t("lastPractise")}
        </Button>
      </div>
    </section>
  );
}
