"use client";

import type { ScoredSkill } from "@palier/domain";
import { SCORED_SKILLS } from "@palier/domain";
import type { Preflight } from "@palier/engine";
import { Button, Callout, Toast } from "@palier/ui";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { skillFromQuery } from "../../features/diagnostic/result-view";
import { estimateText } from "../../features/key/spend-view";
import { preflightNotice } from "../../features/writing/workshop-view";
import type { Container } from "../../lib/container";
import { useContainer } from "../ContainerProvider";
import { NoKeyCard } from "../key/NoKeyCard";
import { PracticeSession } from "../practice/PracticeSession";
import { DiagnosticResult } from "./DiagnosticResult";

type Gate =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "no-key"; readonly estimateUsd: number | null }
  | { readonly status: "ready"; readonly preflight: Preflight };

const loadGate = async (container: Container): Promise<Gate> => {
  const key = await container.useCases.apiKeyStatus();
  if (key === null) {
    const cost = container.useCases.featureCosts().find((row) => row.feature === "diagnostic-interpretation");
    return { status: "no-key", estimateUsd: cost?.estimateUsd ?? null };
  }
  return { status: "ready", preflight: await container.useCases.preflightSpend({ feature: "diagnostic-interpretation" }) };
};

/**
 * The diagnostic's front door (product-requirements.md §6.2, ADR 25): it runs on the user's key,
 * so with none it says what the key buys and where to add one, and the key screen offers the way
 * back. With a key, it says what the written result will cost before the first question, so
 * starting is the consent to pay for it. Then pick a skill and run it; one skill at a time, so a
 * user can stop after reading and come back for writing.
 *
 * `?result=<skill>`, from today's card, shows that skill's latest result instead, on this same
 * page rather than a route of its own, so the e2e lanes compile, precache and police one page
 * fewer (progress.md D213). Read through `useSearchParams`, so a soft navigation from today's card
 * sees the new address.
 */
export function DiagnosticLauncher() {
  const result = useSearchParams().get("result");
  return result === null ? <Launcher /> : <DiagnosticResult skill={skillFromQuery(result)} />;
}

function Launcher() {
  const t = useTranslations("diagnostic");
  const tSkills = useTranslations("skills");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const container = useContainer();
  const [skill, setSkill] = useState<ScoredSkill>("reading");
  const [started, setStarted] = useState(false);
  const [gate, setGate] = useState<Gate>({ status: "loading" });

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    loadGate(container.container).then(
      (next) => live && setGate(next),
      () => live && setGate({ status: "failed" }),
    );
    return () => {
      live = false;
    };
  }, [container]);

  if (started) return <PracticeSession skill={skill} mode="diagnostic" />;
  if (container.status === "failed" || gate.status === "failed") {
    return <Callout tone="incorrect">{tCommon("loadFailed")}</Callout>;
  }
  if (container.status !== "ready" || gate.status === "loading") return <p role="status">{tCommon("loading")}</p>;
  if (gate.status === "no-key") {
    return <NoKeyCard namespace="diagnostic" estimateUsd={gate.estimateUsd} returnTo="diagnostic" />;
  }

  const notice = preflightNotice(gate.preflight);
  return (
    <form
      className="app-stack"
      onSubmit={(event) => {
        event.preventDefault();
        setStarted(true);
      }}
    >
      <p>{t("intro", { count: container.container.profile.diagnostic.size })}</p>
      <p className="app-muted">
        {gate.preflight.estimateUsd === null
          ? t("preflightUnpriced")
          : t("preflightEstimate", { amount: estimateText(gate.preflight.estimateUsd, locale) })}{" "}
        {t("sendsTo")}
      </p>
      {notice === null ? null : <Toast tone={notice.tone}>{t(notice.key)}</Toast>}
      <fieldset className="app-fieldset">
        <legend>{t("chooseSkill")}</legend>
        {SCORED_SKILLS.map((s) => (
          <label key={s} className="app-choice">
            <input type="radio" name="skill" value={s} checked={skill === s} onChange={() => setSkill(s)} />
            <span className="app-choice__label">{tSkills(s)}</span>
          </label>
        ))}
      </fieldset>
      <div className="app-actions">
        <Button type="submit">{t("start", { skill: tSkills(skill) })}</Button>
      </div>
    </form>
  );
}
