"use client";

import type { ResumeExamResult } from "@palier/app";
import type { ExamMode, ScoredSkill } from "@palier/domain";
import { SCORED_SKILLS, sessionId } from "@palier/domain";
import { Button, Callout, Card } from "@palier/ui";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";

import { EXTRA_TIME, type VariantChoice, announcedMinutes, limitMs, variantChoices } from "../../features/exam/rules";
import { Link, useRouter } from "../../i18n/navigation";
import type { Container } from "../../lib/container";
import { useContainer } from "../ContainerProvider";

/** The practice language is French until the English mirror (Phase 8). */
const TARGET_LANG = "fr" as const;
const MODES: readonly ExamMode[] = ["supervised", "unsupervised"];

type Loaded =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | {
      readonly status: "ready";
      readonly choices: readonly VariantChoice[];
      readonly inProgress: ResumeExamResult | null;
    };

const load = async (container: Container): Promise<Loaded> => {
  const [forms, inProgress] = await Promise.all([
    container.useCases.examForms(),
    // Looking for a run in progress must not count as resuming it (D85).
    container.useCases.examInProgress(),
  ]);
  return { status: "ready", choices: variantChoices(container.profile, forms, TARGET_LANG), inProgress };
};

/**
 * The mock-exam picker (product-requirements.md §8.4, progress.md D84 ruling 12):
 * choose a skill and a format, optionally with extra time, and start. The variants
 * are the profile's (ADR 9), each with the item count and minutes its form carries.
 * A run already in progress is offered first, since §14 says an exam resumes.
 */
export function ExamPicker() {
  const t = useTranslations("exam");
  const tCommon = useTranslations("common");
  const tSkills = useTranslations("skills");
  const state = useContainer();
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const [skill, setSkill] = useState<ScoredSkill>("reading");
  const [mode, setMode] = useState<ExamMode>("supervised");
  const [extraTime, setExtraTime] = useState(false);
  const [starting, setStarting] = useState<"idle" | "starting" | "failed">("idle");

  useEffect(() => {
    if (state.status !== "ready") return;
    let live = true;
    load(state.container).then(
      (result) => live && setLoaded(result),
      () => live && setLoaded({ status: "failed" }),
    );
    return () => {
      live = false;
    };
  }, [state]);

  if (state.status === "failed" || loaded.status === "failed") {
    return <Callout tone="incorrect">{tCommon("loadFailed")}</Callout>;
  }
  if (state.status !== "ready" || loaded.status === "loading") {
    return <p role="status">{tCommon("loading")}</p>;
  }

  const container = state.container;
  const chosen = loaded.choices.find((c) => c.variant.skill === skill && c.variant.mode === mode);
  const form = chosen?.form ?? null;

  const start = (event: FormEvent) => {
    event.preventDefault();
    if (form === null || starting === "starting") return;
    setStarting("starting");
    const runId = sessionId(container.ids.ulid());
    container.useCases
      .startExam({ runId, formId: form.id, ...(extraTime ? { timeAllowance: EXTRA_TIME } : {}) })
      .then(
        () => router.push({ pathname: "/exam/run", query: { run: runId } }),
        () => setStarting("failed"),
      );
  };

  const { inProgress } = loaded;

  return (
    <div className="app-stack">
      {inProgress === null ? null : (
        <Card className="app-stack">
          <h2>{t("resumeTitle")}</h2>
          <p>
            {t("resumeBody", {
              skill: tSkills(inProgress.form.skill),
              format: t(inProgress.form.mode),
              minutes: announcedMinutes(inProgress.remainingMs),
            })}
          </p>
          <Link
            href={{ pathname: "/exam/run", query: { run: inProgress.run.id } }}
            className="pl-btn pl-btn--primary pl-focusable"
          >
            {t("resumeAction")}
          </Link>
        </Card>
      )}

      <form className="app-stack" onSubmit={start}>
        <fieldset className="app-segmented">
          <legend className="app-segmented__legend">{t("skillLabel")}</legend>
          {SCORED_SKILLS.map((s) => (
            <label key={s} className="app-segmented__option">
              <input type="radio" name="skill" value={s} checked={skill === s} onChange={() => setSkill(s)} />
              <span>{tSkills(s)}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="app-fieldset">
          <legend>{t("formatLabel")}</legend>
          {MODES.map((m) => {
            const choice = loaded.choices.find((c) => c.variant.skill === skill && c.variant.mode === m);
            const choiceForm = choice?.form ?? null;
            return (
              <label key={m} className="app-choice">
                <input type="radio" name="format" value={m} checked={mode === m} onChange={() => setMode(m)} />
                <span className="app-choice__label">{t(m)}</span>
                <span className="app-choice__hint">
                  {choiceForm === null
                    ? t("unavailable")
                    : t("formDetail", {
                        items: choiceForm.itemIds.length,
                        minutes: limitMs(choiceForm, extraTime ? EXTRA_TIME : 1) / 60_000,
                      })}
                </span>
              </label>
            );
          })}
          <p className="app-muted">{t("formatNote")}</p>
        </fieldset>

        <label className="app-choice">
          <input type="checkbox" checked={extraTime} onChange={(e) => setExtraTime(e.target.checked)} />
          <span className="app-choice__label">{t("extraTime", { factor: EXTRA_TIME })}</span>
          <span className="app-choice__hint">{t("extraTimeNote")}</span>
        </label>

        {starting === "failed" ? <Callout tone="incorrect">{t("startFailed")}</Callout> : null}
        <div className="app-actions">
          <Button type="submit" disabled={form === null || starting === "starting"}>
            {starting === "starting" ? t("starting") : t("start")}
          </Button>
        </div>
      </form>
    </div>
  );
}
