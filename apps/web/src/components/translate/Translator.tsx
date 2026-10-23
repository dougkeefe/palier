"use client";

import { MAX_TRANSLATION_CHARS } from "@palier/app";
import type { Lang, StudyResource, Translation } from "@palier/domain";
import { Button, Callout, Card, Toast } from "@palier/ui";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useReducer, useRef, useState } from "react";

import { articleHref } from "../../features/library/links";
import {
  type Answered,
  SOURCE_CHOICES,
  TARGET_LANG,
  answerKind,
  charactersLeft,
  correctionRows,
  correctionSegments,
  editorLang,
  failureMessage,
  initialTranslator,
  isStale,
  resourceInOtherLanguage,
  resourceTitle,
  resumedTranslator,
  studyFocus,
  textProblem,
  translateFailure,
  translateRequest,
  translator,
  translatorFeedbackLang,
} from "../../features/translate/translate-view";
import { Link } from "../../i18n/navigation";
import type { Container } from "../../lib/container";
import { useContainer } from "../ContainerProvider";
import { NoKeyCard } from "../key/NoKeyCard";
import { SpendOffer } from "../key/SpendOffer";
import { usePreflight } from "../key/use-preflight";
import { Waiting } from "../key/Waiting";

type Setup = { readonly keyHeld: boolean };

/**
 * The translator (progress.md D248): English or French on the left, always French on the right.
 * English comes back translated for the federal public service, with notes on its choices; the
 * user's own French comes back corrected, with what it did well, each correction marked over their
 * words with its reason, and where to study it: Palier's library article and curated government
 * references, never a link a model wrote. One press spends, its estimate beside the button (D237),
 * and nothing is stored: the answer stays on this screen, and a request still out when the screen
 * was left is followed when it opens again (D143).
 */
export function Translator() {
  const tCommon = useTranslations("common");
  const container = useContainer();
  const [setup, setSetup] = useState<Setup | null>(null);

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    void container.container.useCases.apiKeyStatus().then((status) => live && setSetup({ keyHeld: status !== null }));
    return () => {
      live = false;
    };
  }, [container]);

  if (container.status === "failed") return <p role="status">{tCommon("loadFailed")}</p>;
  if (container.status !== "ready" || setup === null) return <p role="status">{tCommon("loading")}</p>;
  return <Workspace container={container.container} keyHeld={setup.keyHeld} onKeyLost={() => setSetup({ keyHeld: false })} />;
}

function Workspace({ container, keyHeld, onKeyLost }: { container: Container; keyHeld: boolean; onKeyLost: () => void }) {
  const t = useTranslations("translate");
  const locale = useLocale();
  const feedbackLang = translatorFeedbackLang(locale);
  const id = useId();
  const { useCases } = container;
  const [held] = useState(() => useCases.translationInFlight());
  const [state, dispatch] = useReducer(translator, held, (h) => (h === null ? initialTranslator() : resumedTranslator(h.request)));
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const answerRef = useRef<HTMLHeadingElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const estimateUsd = useCases.featureCosts().find((cost) => cost.feature === "translation")?.estimateUsd ?? null;
  const sending = state.request.kind === "sending";

  // The estimate beside the button (D237), worked out again once each request settles.
  const preflight = usePreflight(useCases, "translation", { enabled: keyHeld && !sending, reloadOn: state.answered });

  // Focus follows the user's move (WCAG 2.4.3): to the status line while the text is worked on,
  // since the controls are held; to the answer's heading once it arrives.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    if (sending) statusRef.current?.focus();
    else if (state.answered !== null) answerRef.current?.focus();
  }, [sending, state.answered]);

  const settle = useCallback(
    async (pending: Promise<Translation>, request: Answered["request"]) => {
      try {
        const translation = await pending;
        moved.current = true;
        dispatch({ type: "answered", answered: { request, translation } });
      } catch (error) {
        const failure = translateFailure(error);
        if (failure === "no-key") onKeyLost();
        dispatch({ type: "failed", failure });
      }
    },
    [onKeyLost],
  );

  // A request from before this screen opened is followed, never asked for again.
  useEffect(() => {
    if (held !== null) void settle(held.result, held.request);
  }, [held, settle]);

  const onSend = () => {
    if (sending || textProblem(state.text) !== null) return;
    const request = translateRequest(state.text, state.choice, feedbackLang);
    moved.current = true;
    setCopy("idle");
    dispatch({ type: "sending" });
    void settle(useCases.translateText(request), request);
  };

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  };

  const problem = textProblem(state.text);
  const left = charactersLeft(state.text);
  const offered = keyHeld && !sending && preflight !== null;
  const answer = state.answered;

  return (
    <div className="app-stack">
      <p>{t("intro")}</p>
      <Card>
        <div className="app-stack">
          <div className="app-translate__head">
            <fieldset className="app-segmented" disabled={sending}>
              <legend className="app-segmented__legend">{t("sourceLabel")}</legend>
              {SOURCE_CHOICES.map((choice) => (
                <label key={choice} className="app-segmented__option">
                  <input
                    type="radio"
                    name={`${id}-source`}
                    value={choice}
                    checked={state.choice === choice}
                    onChange={() => dispatch({ type: "choose", choice })}
                  />
                  <span>{t(`source_${choice}`)}</span>
                </label>
              ))}
            </fieldset>
            <p className="app-translate__target">{t("targetLabel")}</p>
          </div>

          <div className="app-translate__panes">
            <label className="app-field" htmlFor={`${id}-text`}>
              <span>{t("editorLabel")}</span>
              <textarea
                id={`${id}-text`}
                className="app-textarea"
                {...(editorLang(state.choice) === undefined ? {} : { lang: editorLang(state.choice) })}
                rows={10}
                aria-describedby={`${id}-hint ${id}-count`}
                value={state.text}
                readOnly={sending}
                onChange={(event) => dispatch({ type: "edit", text: event.target.value })}
              />
              <span id={`${id}-hint`} className="app-muted">
                {t("editorHint")}
              </span>
              <span id={`${id}-count`} className={`app-word-count${left < 0 ? " app-word-count--near" : ""}`}>
                {left < 0
                  ? t("charactersOver", { count: -left, limit: MAX_TRANSLATION_CHARS })
                  : t("charactersLeft", { count: left })}
              </span>
            </label>

            <section className="app-field" aria-labelledby={`${id}-output-label`}>
              <h2 id={`${id}-output-label`} ref={answerRef} tabIndex={-1} className="app-translate__label">
                {t("outputLabel")}
              </h2>
              <div className="app-translate__output" lang={TARGET_LANG}>
                {answer === null ? <span className="app-translate__placeholder">{t("outputEmpty")}</span> : answer.translation.output}
              </div>
              {answer === null ? null : (
                <div className="app-actions">
                  <Button variant="secondary" onClick={() => void onCopy(answer.translation.output)}>
                    {t("copy")}
                  </Button>
                  {copy === "idle" ? null : (
                    <span role="status" className="app-muted">
                      {copy === "copied" ? t("copied") : t("copyFailed")}
                    </span>
                  )}
                </div>
              )}
            </section>
          </div>

          {!keyHeld ? null : (
            <>
              {offered ? <SpendOffer id={`${id}-offer`} namespace="translate" preflight={preflight} /> : null}
              <div className="app-actions">
                <Button onClick={onSend} disabled={!offered || problem !== null} aria-describedby={offered ? `${id}-offer` : undefined}>
                  {state.request.kind === "failed" ? t("tryAgain") : t(`button_${state.choice}`)}
                </Button>
                {state.text === "" && answer === null ? null : (
                  <Button variant="secondary" onClick={() => dispatch({ type: "clear" })} disabled={sending}>
                    {t("clear")}
                  </Button>
                )}
              </div>
            </>
          )}
          {sending ? (
            <div ref={statusRef} tabIndex={-1}>
              <Waiting>{t("sending")}</Waiting>
            </div>
          ) : null}
          {state.request.kind === "failed" ? <Toast tone="incorrect">{t(failureMessage(state.request.failure))}</Toast> : null}
          {answer !== null && isStale(state) ? <Callout tone="info">{t("stale")}</Callout> : null}
        </div>
      </Card>

      {keyHeld ? null : <NoKeyCard namespace="translate" estimateUsd={estimateUsd} />}

      {answer === null ? null : <Explanation answered={answer} resources={container.studyResources} />}
    </div>
  );
}

/** What the answer means: a translation's notes, or a correction's strengths, marks, reasons and study links. */
function Explanation({ answered, resources }: { answered: Answered; resources: readonly StudyResource[] }) {
  const t = useTranslations("translate");
  const { request, translation } = answered;
  const kind = answerKind(translation);
  return (
    <section className="app-stack" aria-label={t(kind === "corrected" ? "correctionsTitle" : "notesTitle")}>
      <Callout tone="info">{t("aiNote")}</Callout>
      <p className="app-muted">{t(kind === "corrected" ? "readAsFrench" : "readAsEnglish")}</p>
      {kind === "corrected" ? (
        <Corrections text={request.text} translation={translation} resources={resources} />
      ) : (
        <Notes translation={translation} sourceLang={translation.source} />
      )}
    </section>
  );
}

function Notes({ translation, sourceLang }: { translation: Translation; sourceLang: Lang }) {
  const t = useTranslations("translate");
  return (
    <>
      <h2>{t("notesTitle")}</h2>
      {translation.notes.length === 0 ? (
        <p>{t("notesNone")}</p>
      ) : (
        <ul className="app-list">
          {translation.notes.map((note, index) => (
            <li key={index}>
              {t.rich("noteLine", {
                source: note.source,
                rendering: note.rendering,
                s: (chunks) => <span lang={sourceLang}>{chunks}</span>,
                r: (chunks) => <strong lang={translation.target}>{chunks}</strong>,
              })}{" "}
              <span className="app-muted">{note.why}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Corrections({
  text,
  translation,
  resources,
}: {
  text: string;
  translation: Translation;
  resources: readonly StudyResource[];
}) {
  const t = useTranslations("translate");
  const tSub = useTranslations("subSkills");
  const locale = useLocale();
  const rows = correctionRows(text, translation, resources);
  const focus = studyFocus(translation);
  const lang = translation.target;

  return (
    <>
      {translation.strengths.length === 0 ? null : (
        <>
          <h2>{t("strengthsTitle")}</h2>
          <ul className="app-list">
            {translation.strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </>
      )}

      <h2>{t("correctionsTitle")}</h2>
      {rows.length === 0 ? (
        <p>{t("correctionsNone")}</p>
      ) : (
        <>
          <h3>{t("markedTitle")}</h3>
          <p className="app-writing-text" lang={lang}>
            {correctionSegments(text, translation).map((segment, index) =>
              segment.kind === "plain" ? (
                <span key={index}>{segment.text}</span>
              ) : (
                <mark key={index} className="app-writing-mark">
                  {segment.text}
                  <sup>
                    <span className="pl-visually-hidden" lang={locale}>
                      {t("errorNumber", { number: segment.number })}
                    </span>
                    <span aria-hidden="true">{segment.number}</span>
                  </sup>
                </mark>
              ),
            )}
          </p>

          <ol className="app-translate__corrections">
            {rows.map((row) => (
              <li key={row.number} className="app-stack">
                <p>
                  {t.rich("correctionLine", {
                    original: row.original,
                    correction: row.correction.correction,
                    w: (chunks) => <strong lang={lang}>{chunks}</strong>,
                  })}{" "}
                  <span className="app-tag">{tSub(row.correction.subSkill)}</span>
                </p>
                <p>{row.correction.why}</p>
              </li>
            ))}
          </ol>

          <h2>{t("focusTitle")}</h2>
          <p className="app-muted">{t("focusBody")}</p>
          <ul className="app-translate__study">
            {focus.map((subSkill) => (
              <li key={subSkill} className="app-stack">
                <h3>{tSub(subSkill)}</h3>
                <StudyLinks subSkill={subSkill} resources={resources.filter((resource) => resource.subSkill === subSkill)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/** Palier's own article on a sub-skill, then the curated references for it, each in a new tab. */
function StudyLinks({ subSkill, resources }: { subSkill: StudyResource["subSkill"]; resources: readonly StudyResource[] }) {
  const t = useTranslations("translate");
  const tSub = useTranslations("subSkills");
  const locale = useLocale();
  const guide = articleHref(subSkill);
  return (
    <ul className="app-list" aria-label={t("studyTitle")}>
      {guide === null ? null : (
        <li>
          <Link href={guide} className="app-link pl-focusable" target="_blank" rel="noopener">
            {t("guideLink", { subSkill: tSub(subSkill) })}
            <span className="pl-visually-hidden"> {t("newTab")}</span>
          </Link>
        </li>
      )}
      {resources.map((resource) => (
        <li key={resource.id}>
          <a
            href={resource.url}
            hrefLang={resource.lang}
            className="app-link pl-focusable"
            target="_blank"
            rel="noopener noreferrer"
          >
            {resourceTitle(resource, locale)}
            <span className="pl-visually-hidden"> {t("newTab")}</span>
          </a>{" "}
          <span className="app-muted">
            {resourceInOtherLanguage(resource, locale)
              ? t("resourceInOtherLang", { source: t(`source_${resource.source}`) })
              : t(`source_${resource.source}`)}
          </span>
        </li>
      ))}
    </ul>
  );
}
