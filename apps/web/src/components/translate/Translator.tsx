"use client";

import { type FeatureSpend, MAX_TRANSLATION_CHARS } from "@palier/app";
import type { Lang, StudyResource, Translation } from "@palier/domain";
import { Button, Callout, Card, IconButton, Toast } from "@palier/ui";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useReducer, useRef, useState } from "react";

import { estimateText } from "../../features/key/spend-view";
import { articleHref } from "../../features/library/links";
import {
  type Answered,
  SOURCE_CHOICES,
  TARGET_LANG,
  TRANSLATE_PAUSE_MS,
  answerKind,
  autoTranslates,
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
  shouldTranslate,
  studyFocus,
  textProblem,
  translateFailure,
  translateRequest,
  translator,
  translatorFeedbackLang,
} from "../../features/translate/translate-view";
import { preflightNotice } from "../../features/writing/workshop-view";
import { Link } from "../../i18n/navigation";
import type { Container } from "../../lib/container";
import { useContainer } from "../ContainerProvider";
import { NoKeyCard } from "../key/NoKeyCard";
import { SpendOffer } from "../key/SpendOffer";
import { usePreflight } from "../key/use-preflight";
import { Waiting } from "../key/Waiting";

type Setup = { readonly keyHeld: boolean };

/** How long the copy button shows its tick before it is the copy glyph again. */
const COPIED_MS = 2_000;

/**
 * The translator (progress.md D250, D251): English or French on the left, always French on the right.
 * English comes back translated for the federal public service, with notes on its choices; the
 * user's own French comes back corrected, with what it did well, each correction marked over their
 * words with its reason, and where to study it: Palier's library article and curated government
 * references, never a link a model wrote. It translates on a pause in typing, as Google Translate
 * does (D251, amending D237 for this screen): the visit's running total stands in for an estimate
 * before each call, and past the soft cap it stops and offers one press instead. Nothing is stored:
 * the answer stays on this screen, and a request still out when the screen was left is followed
 * when it opens again (D143).
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
  const [visitFrom] = useState(() => container.clock.now());
  const [spent, setSpent] = useState<FeatureSpend | null>(null);
  const estimateUsd = useCases.featureCosts().find((cost) => cost.feature === "translation")?.estimateUsd ?? null;
  const sending = state.request.kind === "sending";

  // Where this month would stand after one more text: past the cap, a pause no longer sends (D251).
  // Read again as each request settles, answered or failed, since each moves the month's spend and the visit's total.
  const preflight = usePreflight(useCases, "translation", { enabled: keyHeld && !sending, reloadOn: state.request });
  const auto = preflight !== null && autoTranslates(preflight.after);

  useEffect(() => {
    let live = true;
    useCases.featureSpendSince({ feature: "translation", from: visitFrom }).then(
      (loaded) => {
        if (live) setSpent(loaded);
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [useCases, visitFrom, state.request]);

  const settle = useCallback(
    async (pending: Promise<Translation>, request: Answered["request"]) => {
      try {
        const translation = await pending;
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

  const send = () => {
    if (sending || textProblem(state.text) !== null) return;
    const request = translateRequest(state.text, state.choice, feedbackLang);
    setCopy("idle");
    dispatch({ type: "sending" });
    void settle(useCases.translateText(request), request);
  };

  // The pause (D251): every keystroke, language change or settled request restarts the wait, and only a
  // text whose French is not already on screen is sent. The timer calls the newest `send`, so it sends
  // what is on screen when it fires.
  const sendLatest = useRef(send);
  useEffect(() => {
    sendLatest.current = send;
  });
  useEffect(() => {
    if (!keyHeld || !auto || !shouldTranslate(state)) return;
    const timer = setTimeout(() => sendLatest.current(), TRANSLATE_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [keyHeld, auto, state]);

  useEffect(() => {
    if (copy !== "copied") return;
    const timer = setTimeout(() => setCopy("idle"), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copy]);

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  };

  const left = charactersLeft(state.text);
  const answer = state.answered;
  const failed = state.request.kind === "failed";
  // One press spends, D237's way, where a pause does not: past the cap, and to try a failed text again.
  const pressable = keyHeld && (!auto || failed);
  const notice = preflight === null || !auto ? null : preflightNotice(preflight);

  return (
    <div className="app-stack">
      <Card>
        <div className="app-stack">
          <fieldset className="app-segmented">
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

          <div className="app-translate__panes">
            {/* The label holds the title alone: wrapping the hint and the count would make them the field's name. */}
            <div className="app-translate__pane">
              <label className="app-translate__label" htmlFor={`${id}-text`}>
                {t("editorLabel")}
              </label>
              <textarea
                id={`${id}-text`}
                className="app-textarea app-translate__box"
                {...(editorLang(state.choice) === undefined ? {} : { lang: editorLang(state.choice) })}
                rows={10}
                aria-describedby={`${id}-hint ${id}-count`}
                value={state.text}
                onChange={(event) => dispatch({ type: "edit", text: event.target.value })}
              />
              <div className="app-translate__under">
                <p id={`${id}-hint`} className="app-muted">
                  {t("editorHint")}
                </p>
                <p id={`${id}-count`} className={`app-word-count${left < 0 ? " app-word-count--near" : ""}`}>
                  {left < 0
                    ? t("charactersOver", { count: -left, limit: MAX_TRANSLATION_CHARS })
                    : t("charactersLeft", { count: left })}
                </p>
              </div>
            </div>

            <section className="app-translate__pane" aria-labelledby={`${id}-output-label`}>
              <h2 id={`${id}-output-label`} className="app-translate__label">
                {t("outputLabel")}
              </h2>
              <div className="app-translate__box app-translate__result" aria-busy={sending}>
                <div
                  className={`app-translate__output${answer !== null && isStale(state) ? " app-translate__output--stale" : ""}`}
                  lang={TARGET_LANG}
                >
                  {answer === null ? <span className="app-translate__placeholder">{t("outputEmpty")}</span> : answer.translation.output}
                </div>
                {answer === null ? null : (
                  <IconButton
                    className="app-translate__copy"
                    label={t("copy")}
                    glyph={copy === "copied" ? "check" : "copy"}
                    onClick={() => void onCopy(answer.translation.output)}
                  />
                )}
              </div>
              <div className="app-translate__under">
                {sending ? <Waiting live={false}>{t("sending")}</Waiting> : null}
                {copy === "idle" ? null : (
                  <p role="status" className="app-muted">
                    {copy === "copied" ? t("copied") : t("copyFailed")}
                  </p>
                )}
              </div>
            </section>
          </div>
          {/* Said as each answer lands, politely: focus stays in the editor, since the user is typing (D251). */}
          <p className="pl-visually-hidden" aria-live="polite">
            {state.request.kind === "idle" && answer !== null && !isStale(state) ? t("ready") : ""}
          </p>

          {!keyHeld ? null : (
            <>
              {state.request.kind === "failed" ? <Toast tone="incorrect">{t(failureMessage(state.request.failure))}</Toast> : null}
              {!auto && preflight !== null ? <Callout tone="info">{t("capPaused")}</Callout> : null}
              {pressable && preflight !== null ? (
                <>
                  <SpendOffer id={`${id}-offer`} namespace="translate" preflight={preflight} sendsToKey={null} />
                  <div className="app-actions">
                    <Button
                      onClick={send}
                      disabled={sending || textProblem(state.text) !== null || (!failed && !shouldTranslate(state))}
                      aria-describedby={`${id}-offer`}
                    >
                      {failed ? t("tryAgain") : t("translateNow")}
                    </Button>
                  </div>
                </>
              ) : null}
              {notice === null ? null : <Callout tone={notice.tone}>{t(notice.key)}</Callout>}
              {spent === null || spent.calls === 0 ? null : (
                <p>
                  {t(spent.unpriced > 0 ? "visitTotalUnpriced" : "visitTotal", {
                    amount: estimateText(spent.usd, locale),
                    count: spent.calls,
                  })}
                </p>
              )}
              <p className="app-muted">{t("sendsTo")}</p>
            </>
          )}
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
    <section className="app-stack app-translate__explanation" aria-label={t(kind === "corrected" ? "correctionsTitle" : "notesTitle")}>
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
