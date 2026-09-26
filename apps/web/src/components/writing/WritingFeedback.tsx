"use client";

import type { WritingSubmission } from "@palier/app";
import type { Lang, TargetBand } from "@palier/domain";
import { WRITING_CRITERIA } from "@palier/domain";
import { useTranslations } from "next-intl";
import { Fragment, type Ref } from "react";

import { segmentText } from "../../features/writing/inline-errors";
import { wordDiff } from "../../features/writing/word-diff";
import { criterionLabel } from "../../features/writing/workshop-view";

/**
 * The feedback on one submission (PRD §8.7, architecture.md §8.4): the five criteria, the
 * user's own text with each error marked where it is, the corrections numbered to match,
 * and the model answer with its changes against the user's text shown word by word.
 * `lang` is the writing's language, so a screen reader reads the French as French.
 */
export function WritingFeedback({
  submission,
  targetBand,
  lang,
  headingRef,
}: {
  submission: WritingSubmission & { readonly assessment: NonNullable<WritingSubmission["assessment"]> };
  targetBand: TargetBand;
  lang: Lang;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const t = useTranslations("writing");
  const { assessment, text } = submission;
  const segments = segmentText(text, assessment.errors);
  const numbered = segments.flatMap((segment) => (segment.kind === "error" ? [segment] : []));

  return (
    <section className="app-stack" aria-labelledby="writing-feedback-title">
      <h2 id="writing-feedback-title" ref={headingRef} tabIndex={-1} className="app-step-heading">
        {t("feedbackTitle")}
      </h2>

      <h3>{t("criteriaTitle")}</h3>
      <dl className="app-criteria">
        {WRITING_CRITERIA.map((criterion) => (
          <div key={criterion} className="app-criteria__row">
            <dt>
              {t(criterionLabel(criterion))}
              <span className="app-tag">{t("criterionBand", { band: assessment.criteria[criterion].band })}</span>
            </dt>
            <dd>{assessment.criteria[criterion].evidence}</dd>
          </div>
        ))}
      </dl>

      <h3>{t("errorsTitle")}</h3>
      <p className="app-writing-text" lang={lang}>
        {segments.map((segment, index) =>
          segment.kind === "plain" ? (
            <span key={index}>{segment.text}</span>
          ) : (
            <mark key={index} className="app-writing-mark">
              {segment.text}
              <sup>
                <span className="pl-visually-hidden">{t("errorNumber", { number: segment.number })}</span>
                <span aria-hidden="true">{segment.number}</span>
              </sup>
            </mark>
          ),
        )}
      </p>
      {numbered.length === 0 ? (
        <p>{t("errorsNone")}</p>
      ) : (
        <>
          <h4>{t("correctionsTitle")}</h4>
          <ol className="app-list">
            {numbered.map((segment) => (
              <li key={segment.number}>
                {t.rich("correctionLine", {
                  text: segment.text,
                  correction: segment.error.correction,
                  w: (chunks) => <span lang={lang}>{chunks}</span>,
                })}{" "}
                <span className="app-muted">{t("ruleLine", { rule: segment.error.rule })}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      <h3>{t("modelTitle", { band: targetBand })}</h3>
      <p className="app-muted">{t("modelLegend")}</p>
      <p className="app-writing-text" lang={lang}>
        {wordDiff(text, assessment.modelAnswer).map((run, index) => {
          const Tag = run.kind === "added" ? "ins" : "del";
          return (
            <Fragment key={index}>
              {index === 0 ? null : " "}
              {run.kind === "same" ? (
                run.text
              ) : (
                <Tag className={`app-writing-${run.kind}`}>
                  <span className="pl-visually-hidden">{t(run.kind)} </span>
                  {run.text}
                </Tag>
              )}
            </Fragment>
          );
        })}
      </p>
    </section>
  );
}
