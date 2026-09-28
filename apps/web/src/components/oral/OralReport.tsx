"use client";

import type { OralReport as Report } from "@palier/app";
import type { Lang, OralAssessment } from "@palier/domain";
import { sessionId } from "@palier/domain";
import { Button, Callout, Card, EmptyState, Toast } from "@palier/ui";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { type Ref, useCallback, useEffect, useId, useMemo, useReducer, useRef, useState } from "react";

import { estimateText, moneyText } from "../../features/key/spend-view";
import {
  type AskState,
  INITIAL_REPORT,
  ORAL_CRITERION_ROWS,
  type TranscriptRow,
  askFailureMessage,
  costLines,
  drillHref,
  drillSkill,
  fluencyWords,
  reportScreen,
  transcriptRows,
} from "../../features/oral/report-view";
import { endMessage } from "../../features/oral/practice-view";
import { preflightNotice } from "../../features/writing/workshop-view";
import { Link } from "../../i18n/navigation";
import type { Container } from "../../lib/container";
import { deviceTimeZone } from "../../lib/time-zone";
import { useContainer } from "../ContainerProvider";
import { NoKeyCard } from "../key/NoKeyCard";

/** The session named in `?session=`, or none. */
const sessionInUrl = () => {
  const id = new URLSearchParams(window.location.search).get("session");
  return id === null || id === "" ? null : sessionId(id);
};

type Extras = {
  readonly keyHeld: boolean;
  /** What one report is estimated to cost, or none when it is unpriced. */
  readonly estimateUsd: number | null;
};

const loadExtras = async (container: Container): Promise<Extras> => ({
  keyHeld: (await container.useCases.apiKeyStatus()) !== null,
  estimateUsd: container.useCases.featureCosts().find((cost) => cost.feature === "oral-assessment")?.estimateUsd ?? null,
});

/**
 * The report on a spoken session (product-requirements.md §8.6, "post-session report"; progress.md
 * D126), at `/practice/oral/report?session=…`, reached from a session's end and from the list of
 * past sessions. For a session with no report yet it offers one, on the user's key, with the
 * workshop's pre-flight. The report: a level and quoted evidence per criterion, pronunciation "not
 * assessed" (Gate J), three fixes each with its drill, five words, the transcript with each error
 * marked and its correction on tap, the fluency figures, what the session cost, and the recording,
 * played back or deleted in one tap. Its decisions are in `features/oral/report-view.ts`.
 */
export function OralReport() {
  const t = useTranslations("oralReport");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const container = useContainer();
  const [state, dispatch] = useReducer(reportScreen, INITIAL_REPORT);
  const [extras, setExtras] = useState<Extras | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const askRef = useRef<HTMLHeadingElement>(null);

  const reload = useCallback(async (ready: Container) => {
    const id = sessionInUrl();
    const report = id === null ? null : await ready.useCases.oralReport({ sessionId: id }).catch(() => null);
    dispatch({ type: "loaded", report });
  }, []);

  useEffect(() => {
    if (container.status !== "ready") return;
    let alive = true;
    void Promise.all([reload(container.container), loadExtras(container.container)]).then(([, loaded]) => {
      if (alive) setExtras(loaded);
    });
    return () => {
      alive = false;
    };
  }, [container, reload]);

  // A pre-flight or a failure takes focus to its heading, as the workshop's does.
  const askKind = state.phase === "ready" ? state.ask.kind : null;
  useEffect(() => {
    if (askKind === "confirming" || askKind === "failed") askRef.current?.focus();
  }, [askKind]);

  if (container.status === "failed") return <Callout tone="incorrect">{tCommon("loadFailed")}</Callout>;
  if (container.status !== "ready" || extras === null || state.phase === "loading") {
    return <p role="status">{tCommon("loading")}</p>;
  }
  const { useCases } = container.container;

  if (state.phase === "not-found") {
    return (
      <EmptyState
        heading={t("notFoundTitle")}
        action={
          <Link href="/practice/oral" className="app-link pl-focusable">
            {t("backToPractice")}
          </Link>
        }
      >
        {t("notFound")}
      </EmptyState>
    );
  }

  const { report, ask } = state;
  const { session } = report;
  const lang: Lang = report.scenario?.lang ?? "fr";

  const offer = async () => {
    dispatch({ type: "preflighted", preflight: await useCases.preflightSpend({ feature: "oral-assessment" }) });
  };
  const send = async () => {
    dispatch({ type: "asking" });
    try {
      await useCases.requestOralReport({ sessionId: session.id, feedbackLang: locale === "fr" ? "fr" : "en" });
      await reload(container.container);
      headingRef.current?.focus();
    } catch (error) {
      dispatch({ type: "failed", error });
    }
  };

  return (
    <div className="app-stack">
      <Summary report={report} headingRef={headingRef} />

      {session.assessment === null ? (
        <Ask
          report={report}
          ask={ask}
          extras={extras}
          askRef={askRef}
          onOffer={() => void offer()}
          onSend={() => void send()}
          onCancel={() => dispatch({ type: "cancel" })}
        />
      ) : (
        <Assessment assessment={session.assessment} report={report} lang={lang} />
      )}

      <Fluency report={report} />
      <Recording report={report} />
      <div className="app-actions">
        <Link href="/practice/oral" className="app-link pl-focusable">
          {t("backToPractice")}
        </Link>
      </div>
    </div>
  );
}

/** The session named, dated and costed: what it was, when, how it ended, and what it cost (exit criterion 2). */
function Summary({ report, headingRef }: { report: Report; headingRef: Ref<HTMLHeadingElement> }) {
  const t = useTranslations("oralReport");
  const tOral = useTranslations("oral");
  const format = useFormatter();
  const locale = useLocale();
  const { session, scenario } = report;
  const cost = costLines(report.cost);
  const amount = (usd: number) => {
    const shown = moneyText(usd, locale);
    return shown.underCent ? t("costUnderCent", { amount: shown.text }) : shown.text;
  };
  return (
    <Card>
      <h2 ref={headingRef} tabIndex={-1} className="app-step-heading">
        {scenario === null ? t("sessionUnknown") : tOral(`type_${scenario.sessionType}`)}
      </h2>
      <div className="app-stack">
        <p className="app-muted">
          {t("sessionWhen", {
            date: format.dateTime(new Date(session.startedAt), { dateStyle: "long", timeStyle: "short", timeZone: deviceTimeZone() }),
          })}{" "}
          {tOral(endMessage(session.endReason))}
        </p>
        <h3>{t("costTitle")}</h3>
        <dl className="app-criteria">
          <div className="app-criteria__row">
            <dt>{t("costPractice")}</dt>
            <dd>{amount(cost.practiceUsd)}</dd>
          </div>
          <div className="app-criteria__row">
            <dt>{t("costReport")}</dt>
            <dd>{session.assessment === null ? t("costNoReport") : amount(cost.reportUsd)}</dd>
          </div>
          <div className="app-criteria__row">
            <dt>{t("costTotal")}</dt>
            <dd>{cost.floor ? t("costFloor", { amount: amount(cost.totalUsd) }) : amount(cost.totalUsd)}</dd>
          </div>
        </dl>
        <p className="app-muted">{t("costNote")}</p>
      </div>
    </Card>
  );
}

/** Asking for the report: the offer, the pre-flight, the wait, a failure, or why there is none to ask for. */
function Ask({
  report,
  ask,
  extras,
  askRef,
  onOffer,
  onSend,
  onCancel,
}: {
  report: Report;
  ask: AskState;
  extras: Extras;
  askRef: Ref<HTMLHeadingElement>;
  onOffer: () => void;
  onSend: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("oralReport");
  const locale = useLocale();
  if (!report.canAssess) {
    return (
      <Card>
        <h2>{t("reportTitle")}</h2>
        <p>{report.session.endedAt === null ? t("stillRunning") : t("nothingToAssess")}</p>
      </Card>
    );
  }
  if (!extras.keyHeld) return <NoKeyCard namespace="oralReport" estimateUsd={extras.estimateUsd} />;
  if (ask.kind === "asking") {
    return (
      <Card>
        <h2>{t("reportTitle")}</h2>
        <Toast tone="info">{t("asking")}</Toast>
      </Card>
    );
  }
  if (ask.kind === "confirming") {
    const notice = preflightNotice(ask.preflight);
    return (
      <Card>
        <h2 ref={askRef} tabIndex={-1} className="app-step-heading">
          {t("preflightTitle")}
        </h2>
        <div className="app-stack">
          <p>
            {ask.preflight.estimateUsd === null
              ? t("preflightUnpriced")
              : t("preflightEstimate", { amount: estimateText(ask.preflight.estimateUsd, locale) })}
          </p>
          {notice === null ? null : <Callout tone={notice.tone}>{t(notice.key)}</Callout>}
          <p className="app-muted">{t("sendsTo")}</p>
          <div className="app-actions">
            <Button onClick={onSend}>{t("send")}</Button>
            <Button variant="ghost" onClick={onCancel}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      </Card>
    );
  }
  return (
    <Card>
      <h2 ref={ask.kind === "failed" ? askRef : undefined} tabIndex={-1} className="app-step-heading">
        {t("reportTitle")}
      </h2>
      <div className="app-stack">
        {ask.kind === "failed" ? (
          <Callout tone="incorrect">
            {t(askFailureMessage(ask.failure))} {t("transcriptKept")}
          </Callout>
        ) : (
          <p>{t("offer")}</p>
        )}
        <p className="app-muted">
          {extras.estimateUsd === null ? t("offerUnpriced") : t("offerCost", { amount: estimateText(extras.estimateUsd, locale) })}
        </p>
        <div className="app-actions">
          <Button onClick={onOffer}>{t(ask.kind === "failed" ? "tryAgain" : "getReport")}</Button>
        </div>
      </div>
    </Card>
  );
}

/** The report itself: the criteria, the fixes, the words and the marked-up transcript. */
function Assessment({ assessment, report, lang }: { assessment: OralAssessment; report: Report; lang: Lang }) {
  const t = useTranslations("oralReport");
  const tSkills = useTranslations("subSkills");
  const rows = useMemo(() => transcriptRows(report.session.turns, assessment.errors), [report.session.turns, assessment.errors]);
  return (
    <section className="app-stack" aria-labelledby="oral-report-title">
      <h2 id="oral-report-title">{t("reportTitle")}</h2>

      <h3>{t("criteriaTitle")}</h3>
      <dl className="app-criteria">
        {ORAL_CRITERION_ROWS.map(({ criterion, key }) => (
          <div key={criterion} className="app-criteria__row">
            <dt>
              {t(key)}
              <span className="app-tag">{t("criterionBand", { band: assessment.criteria[criterion].band })}</span>
            </dt>
            <dd>{assessment.criteria[criterion].evidence}</dd>
          </div>
        ))}
        <div className="app-criteria__row">
          <dt>
            {t("criterion_pronunciation")}
            <span className="app-tag">{t("notAssessed")}</span>
          </dt>
          <dd>{t("pronunciationWhy")}</dd>
        </div>
      </dl>

      <h3>{t("fixesTitle")}</h3>
      <ol className="app-list app-stack">
        {assessment.fixes.map((fix, index) => (
          <li key={index}>
            <p>
              {t.rich("fixLine", {
                criterion: t(`criterion_${fix.criterion}`),
                advice: fix.advice,
                b: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
            <p className="app-muted">{t("fixEvidence", { evidence: fix.evidence })}</p>
            <Link href={drillHref(fix.subSkill)} className="app-link pl-focusable">
              {t(drillSkill(fix.subSkill) === "reading" ? "drillReading" : "drillWriting", { subSkill: tSkills(fix.subSkill) })}
            </Link>
          </li>
        ))}
      </ol>
      <p className="app-muted">{t("fixesPlan")}</p>

      <h3>{t("wordsTitle")}</h3>
      <ul className="app-list app-stack">
        {assessment.missingWords.map((word, index) => (
          <li key={index}>
            <strong lang={lang}>{word.word}</strong>
            <p className="app-muted">
              {t.rich("wordSaid", { said: word.excerpt, w: (chunks) => <span lang={lang}>{chunks}</span> })}
            </p>
            <p>{t.rich("wordBetter", { example: word.example, w: (chunks) => <span lang={lang}>{chunks}</span> })}</p>
          </li>
        ))}
      </ul>

      <h3>{t("transcriptTitle")}</h3>
      <p className="app-muted">{t(assessment.errors.length === 0 ? "errorsNone" : "transcriptHow")}</p>
      <ol className="app-list app-oral-transcript">
        {rows.map((row) => (
          <TranscriptLine key={row.index} row={row} lang={lang} />
        ))}
      </ol>
    </section>
  );
}

/** One turn of the marked-up transcript. Each error is a button that shows its correction beside it. */
function TranscriptLine({ row, lang }: { row: TranscriptRow; lang: Lang }) {
  const t = useTranslations("oralReport");
  const tOral = useTranslations("oral");
  if (row.speaker === "examiner") {
    return (
      <li>
        <strong>{tOral("speakerExaminer")}</strong> <span lang={lang}>{row.text}</span>
      </li>
    );
  }
  return (
    <li>
      <strong>{tOral("speakerYou")}</strong>
      {row.typed ? <span className="app-muted"> {t("typed")}</span> : null}{" "}
      <span lang={lang} className="app-writing-text">
        {row.segments.map((segment, index) =>
          segment.kind === "plain" ? <span key={index}>{segment.text}</span> : <Correction key={index} segment={segment} lang={lang} />,
        )}
      </span>
    </li>
  );
}

function Correction({
  segment,
  lang,
}: {
  segment: Extract<TranscriptRow, { speaker: "candidate" }>["segments"][number] & { readonly kind: "error" };
  lang: Lang;
}) {
  const t = useTranslations("oralReport");
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        className="app-oral-mark pl-focusable"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((shown) => !shown)}
      >
        {segment.text}
        <sup>
          <span className="pl-visually-hidden">{t("errorNumber", { number: segment.number })}</span>
          <span aria-hidden="true">{segment.number}</span>
        </sup>
      </button>
      <span id={id} className="app-oral-correction" hidden={!open}>
        {" "}
        {t.rich("correctionLine", { correction: segment.error.correction, w: (chunks) => <span lang={lang}>{chunks}</span> })}{" "}
        <span className="app-muted">{t("ruleLine", { rule: segment.error.rule })}</span>
      </span>
    </>
  );
}

/** Words a minute, fillers and the mean pause, measured on this device from the answers' times (D123). */
function Fluency({ report }: { report: Report }) {
  const t = useTranslations("oralReport");
  const words = fluencyWords(report.fluency);
  return (
    <Card>
      <h2>{t("fluencyTitle")}</h2>
      {words.measured ? (
        <div className="app-stack">
          <dl className="app-criteria">
            <div className="app-criteria__row">
              <dt>{t("wordsPerMinute")}</dt>
              <dd>{words.wordsPerMinute === null ? t("notMeasured") : t("wordsPerMinuteValue", { count: words.wordsPerMinute })}</dd>
            </div>
            <div className="app-criteria__row">
              <dt>{t("fillers")}</dt>
              <dd>{words.fillerCount === null ? t("notMeasured") : t("fillersValue", { count: words.fillerCount })}</dd>
            </div>
            <div className="app-criteria__row">
              <dt>{t("pause")}</dt>
              <dd>{words.pauseSeconds === null ? t("notMeasured") : t("pauseValue", { seconds: words.pauseSeconds })}</dd>
            </div>
          </dl>
          <p className="app-muted">{t("fluencyNote", { count: words.spokenTurns })}</p>
        </div>
      ) : (
        <p>{t("fluencyTyped")}</p>
      )}
    </Card>
  );
}

/** The recording of the candidate's answers, kept on this device only, played back or deleted in one tap. */
function Recording({ report }: { report: Report }) {
  const t = useTranslations("oralReport");
  const container = useContainer();
  const [audio, setAudio] = useState<Blob | null | "loading">("loading");
  const [deleteFailed, setDeleteFailed] = useState(false);
  const url = useMemo(() => (audio instanceof Blob ? URL.createObjectURL(audio) : null), [audio]);
  const id = report.session.id;

  useEffect(() => {
    if (container.status !== "ready") return;
    let alive = true;
    void container.container.useCases
      .oralRecording({ sessionId: id })
      .catch(() => null)
      .then((blob) => alive && setAudio(blob));
    return () => {
      alive = false;
    };
  }, [container, id]);

  useEffect(() => {
    if (url === null) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  if (audio === "loading") return null;
  const remove = async () => {
    if (container.status !== "ready") return;
    try {
      await container.container.useCases.deleteOralRecording({ sessionId: id });
      setDeleteFailed(false);
      setAudio(null);
    } catch {
      setDeleteFailed(true);
    }
  };
  return (
    <Card>
      <h2>{t("recordingTitle")}</h2>
      {url === null ? (
        <p>{t("recordingNone")}</p>
      ) : (
        <div className="app-stack">
          <audio controls src={url} aria-label={t("recordingLabel")} />
          <p className="app-muted">{t("recordingLocal")}</p>
          {deleteFailed ? <Callout tone="incorrect">{t("recordingDeleteFailed")}</Callout> : null}
          <div className="app-actions">
            <Button variant="secondary" onClick={() => void remove()}>
              {t("recordingDelete")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
