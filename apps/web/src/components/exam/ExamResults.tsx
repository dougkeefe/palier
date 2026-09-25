"use client";

import type { ItemId } from "@palier/domain";
import { sessionId } from "@palier/domain";
import { Button, Callout, Card, EmptyState, Glyph, itemRenderers } from "@palier/ui";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";

import { type ResultsView, type ReviewRow, resultsView } from "../../features/exam/results";
import { Link } from "../../i18n/navigation";
import type { Container } from "../../lib/container";
import { useContainer } from "../ContainerProvider";
import { ReportItem } from "../practice/ReportItem";

type Loaded =
  | { readonly status: "loading" }
  | { readonly status: "not-found" }
  | { readonly status: "ready"; readonly view: ResultsView };

const load = async (container: Container): Promise<Loaded> => {
  const id = new URLSearchParams(window.location.search).get("run");
  if (id === null) return { status: "not-found" };
  try {
    const report = await container.useCases.examReport({ runId: sessionId(id) });
    return { status: "ready", view: resultsView(report) };
  } catch {
    // An unknown run, one still in progress, or a form this bank no longer ships.
    return { status: "not-found" };
  }
};

/**
 * The results screen (product-requirements.md §8.5, progress.md D84), where "the
 * warmth comes back": the default palette again, though still no Coco (§10.1).
 * Every rule on it lives in the tested view model, `features/exam/results.ts`.
 * Nothing here names or styles a pilot item (ruling 9).
 */
export function ExamResults() {
  const t = useTranslations("exam");
  const tCommon = useTranslations("common");
  const state = useContainer();
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    if (state.status !== "ready") return;
    let live = true;
    void load(state.container).then((result) => live && setLoaded(result));
    return () => {
      live = false;
    };
  }, [state]);

  if (state.status === "failed") return <Callout tone="incorrect">{tCommon("loadFailed")}</Callout>;
  if (state.status !== "ready" || loaded.status === "loading") return <p role="status">{tCommon("loading")}</p>;
  if (loaded.status === "not-found") {
    return (
      <EmptyState
        heading={t("notFoundTitle")}
        action={
          <Link href="/exam" className="pl-btn pl-btn--primary pl-focusable">
            {t("takeAnother")}
          </Link>
        }
      >
        {t("notFoundBody")}
      </EmptyState>
    );
  }
  return <Results container={state.container} view={loaded.view} />;
}

function Results({ container, view }: { container: Container; view: ResultsView }) {
  const t = useTranslations("exam");
  const tCommon = useTranslations("common");
  const tSub = useTranslations("subSkills");

  return (
    <div className="app-stack">
      <Card className="app-result">
        <p className="app-result__band">{t("resultBand", { band: view.band })}</p>
        <p className="app-result__score">{t("resultScore", { raw: view.raw, scored: view.scored })}</p>
        {view.namesOwnCut ? <p>{t("resultCut", { band: view.band, min: view.bandMin })}</p> : null}
        {view.up === null ? null : <p>{t("nearUp", { points: view.up.pointsAway, band: view.up.band })}</p>}
        {view.down === null ? null : <p>{t("nearDown", { answers: view.down.answers, band: view.down.band })}</p>}
        {view.pauses > 0 ? <Callout tone="info">{t("paused", { count: view.pauses })}</Callout> : null}
        {view.extraTime ? <Callout tone="info">{t("withExtraTime")}</Callout> : null}
        {view.retake ? <Callout tone="info">{t("retake")}</Callout> : null}
      </Card>

      <section className="app-stack" aria-labelledby="exam-cuts">
        <h2 id="exam-cuts">{t("cutsTitle")}</h2>
        <ul className="app-cuts">
          {view.cuts.map((cut) => (
            <li key={cut.band} aria-current={cut.band === view.band ? "true" : undefined}>
              {t("cutRow", { band: cut.band, min: cut.min, max: cut.max })}
            </li>
          ))}
        </ul>
      </section>

      <section className="app-stack" aria-labelledby="exam-sub-skills">
        <h2 id="exam-sub-skills">{t("subSkillsTitle")}</h2>
        <ul className="app-list">
          {view.subSkills.map((s) => (
            <li key={s.subSkill}>{t("subSkillCount", { subSkill: tSub(s.subSkill), correct: s.correct, total: s.total })}</li>
          ))}
        </ul>
      </section>

      <section className="app-stack" aria-labelledby="exam-calibration">
        <h2 id="exam-calibration">{t("calibrationTitle")}</h2>
        <p>{t("sureWrong", { count: view.sureWrong })}</p>
        <p>{t("unsureRight", { count: view.unsureRight })}</p>
        <p className="app-muted">{t("calibrationNote")}</p>
      </section>

      <section className="app-stack" aria-labelledby="exam-review">
        <h2 id="exam-review">{t("reviewTitle")}</h2>
        <ol className="app-review-list">
          {view.review.map((row) => (
            <li key={row.item.id}>
              <ReviewEntry row={row} container={container} />
            </li>
          ))}
        </ol>
      </section>

      <div className="app-actions">
        <Link href="/exam" className="pl-btn pl-btn--primary pl-focusable">
          {t("takeAnother")}
        </Link>
        <Link href="/home" className="pl-btn pl-btn--secondary pl-focusable">
          {tCommon("backHome")}
        </Link>
      </div>
    </div>
  );
}

/**
 * One item of the walkthrough, closed until opened, with the answer shown as the
 * drill's feedback shows it. Every item has the same controls, pilots included.
 */
function ReviewEntry({ row, container }: { row: ReviewRow; container: Container }) {
  const t = useTranslations("exam");
  const tDrill = useTranslations("drill");
  const locale = useLocale() === "fr" ? "fr" : "en";
  const [queue, setQueue] = useState<"idle" | "adding" | "added" | "failed">(row.canQueue ? "idle" : "added");
  const { item } = row;
  const Renderer = itemRenderers[item.type];
  const keyOption = item.options.find((o) => o.id === item.key);
  const chosenOption = row.correct ? undefined : item.options.find((o) => o.id === row.chosen);
  const inItemLang = (chunks: ReactNode) => <span lang={item.lang}>{chunks}</span>;

  const add = (id: ItemId) => {
    setQueue("adding");
    container.useCases.queueForReview({ itemId: id }).then(
      () => setQueue("added"),
      () => setQueue("failed"),
    );
  };

  return (
    <details className="app-review-entry">
      <summary className="app-review-entry__summary pl-focusable">
        <span>{t("reviewItem", { n: row.position })}</span>
        <span className={row.correct ? "app-review-entry__status--correct" : "app-review-entry__status--incorrect"}>
          <Glyph name={row.correct ? "check" : "cross"} />
          {row.correct ? tDrill("statusCorrect") : tDrill("statusIncorrect")}
        </span>
      </summary>
      <div className="app-stack">
        <Renderer
          item={item}
          selected={row.chosen}
          onSelect={() => undefined}
          revealed
          statusLabels={{ correct: tDrill("statusCorrect"), incorrect: tDrill("statusIncorrect") }}
        />
        {row.chosen === null ? <p>{t("noAnswer")}</p> : null}
        {keyOption === undefined ? null : (
          <>
            <p className="app-feedback__answer">{tDrill.rich("theAnswer", { answer: keyOption.text, target: inItemLang })}</p>
            <p>{keyOption.rationale[locale]}</p>
          </>
        )}
        {chosenOption === undefined ? null : (
          <>
            <h3 className="app-feedback__subheading">
              {tDrill.rich("whyChosenWrong", { answer: chosenOption.text, target: inItemLang })}
            </h3>
            <p>{chosenOption.rationale[locale]}</p>
          </>
        )}
        <h3 className="app-feedback__subheading">{tDrill("theRule")}</h3>
        <p>{item.explanation[locale]}</p>
        <div className="app-actions">
          {queue === "added" ? (
            <p className="app-muted" role="status">
              {t("inReview")}
            </p>
          ) : (
            <Button variant="secondary" disabled={queue === "adding"} onClick={() => add(item.id)}>
              {t("addToReview")}
            </Button>
          )}
          {queue === "failed" ? <p role="status">{t("addFailed")}</p> : null}
        </div>
        <ReportItem item={item} container={container} />
      </div>
    </details>
  );
}
