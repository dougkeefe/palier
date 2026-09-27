"use client";

import type { WritingSubmission } from "@palier/app";
import type { Lang, TargetBand, WritingPrompt } from "@palier/domain";
import { Button, Callout, Card, Timer, Toast } from "@palier/ui";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { type Ref, useEffect, useId, useReducer, useRef, useState } from "react";

import { estimateText } from "../../features/key/spend-view";
import {
  INITIAL_WORKSHOP,
  type Draft,
  announcedCount,
  countWords,
  elapsedText,
  failureMessage,
  feedbackFailure,
  preflightNotice,
  reusableSubmission,
  wordTone,
  workshop,
} from "../../features/writing/workshop-view";
import type { Container } from "../../lib/container";
import { readStudyProfile } from "../../lib/study";
import { useContainer } from "../ContainerProvider";
import { NoKeyCard } from "../key/NoKeyCard";
import { WritingFeedback } from "./WritingFeedback";

/** Without a study profile, feedback aims at C, the level the SLE workshop is for (D108). */
const DEFAULT_TARGET: TargetBand = "C";

type Setup = {
  readonly keyHeld: boolean;
  readonly targetBand: TargetBand;
  readonly history: readonly WritingSubmission[];
};

const loadSetup = async (container: Container): Promise<Setup> => {
  const [status, profile, history] = await Promise.all([
    container.useCases.apiKeyStatus(),
    readStudyProfile(container.settings),
    container.useCases.writingHistory(),
  ]);
  return { keyHeld: status !== null, targetBand: profile?.targetBand ?? DEFAULT_TARGET, history };
};

/**
 * The writing workshop (product-requirements.md §8.7, progress.md D105–D108), marked as
 * supplementary because the real written test is multiple choice. Pick a prompt, write in a
 * plain editor against a word target with an elapsed-time display that is never enforced,
 * then ask for feedback: the pre-flight shows the estimate and warns near the cap, never
 * blocks, and one metered call returns the five criteria, the errors inline and a model
 * answer. Without a key the editor still works and PRD §14's inline card takes the button's
 * place. Writing is saved when feedback is asked for, and stays on this device [R12].
 */
export function WritingWorkshop() {
  const t = useTranslations("writing");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const container = useContainer();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [state, dispatch] = useReducer(workshop, INITIAL_WORKSHOP);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const feedbackRef = useRef<HTMLHeadingElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    void loadSetup(container.container).then((loaded) => live && setSetup(loaded));
    return () => {
      live = false;
    };
  }, [container]);

  // The elapsed-time display ticks while writing; it is a guide, so nothing acts on it.
  useEffect(() => {
    if (state.phase !== "writing") return;
    const timer = setInterval(() => setNowMs(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [state.phase]);

  // Focus follows the user's move: to the feedback's heading, or into the editor.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    if (state.phase === "feedback") feedbackRef.current?.focus();
    if (state.phase === "writing") editorRef.current?.focus();
  }, [state.phase]);

  if (container.status === "failed") return <p role="status">{tCommon("loadFailed")}</p>;
  if (container.status !== "ready" || setup === null) return <p role="status">{tCommon("loading")}</p>;
  const { useCases } = container.container;
  const prompts = useCases.writingPrompts();
  const promptOf = (id: string): WritingPrompt | undefined => prompts.find((prompt) => prompt.id === id);
  const estimateUsd = useCases.featureCosts().find((cost) => cost.feature === "writing-feedback")?.estimateUsd ?? null;

  const refreshHistory = async () => {
    const history = await useCases.writingHistory();
    setSetup((current) => (current === null ? current : { ...current, history }));
  };

  const onPick = (promptId: string) => {
    moved.current = true;
    const now = Date.now();
    setNowMs(now);
    dispatch({ type: "pick", promptId, nowMs: now });
  };

  const onReopen = (submission: WritingSubmission) => {
    moved.current = true;
    const now = Date.now();
    setNowMs(now);
    dispatch({ type: "reopen", submission, nowMs: now });
  };

  const onGetFeedback = async () => {
    dispatch({ type: "preflighted", preflight: await useCases.preflightSpend({ feature: "writing-feedback" }) });
  };

  const onSend = async (draft: Draft) => {
    dispatch({ type: "sending" });
    try {
      let submissionId = reusableSubmission(draft);
      if (submissionId === null) {
        const saved = await useCases.saveWriting({ promptId: draft.promptId, text: draft.text });
        submissionId = saved.id;
        dispatch({ type: "saved", id: saved.id, text: saved.text });
      }
      const assessed = await useCases.requestWritingFeedback({
        submissionId,
        targetBand: setup.targetBand,
        feedbackLang: locale === "fr" ? "fr" : "en",
      });
      moved.current = true;
      dispatch({ type: "assessed", submission: assessed });
    } catch (error) {
      const failure = feedbackFailure(error);
      if (failure === "no-key") setSetup((current) => (current === null ? current : { ...current, keyHeld: false }));
      dispatch({ type: "failed", failure });
    } finally {
      await refreshHistory();
    }
  };

  const supplementary = (
    <Callout tone="info">
      <strong>{t("supplementaryTitle")}</strong> {t("supplementary")}
    </Callout>
  );

  if (state.phase === "choosing") {
    return (
      <div className="app-stack">
        {supplementary}
        <PromptList prompts={prompts} onPick={onPick} />
        <History history={setup.history} promptOf={promptOf} onOpen={onReopen} />
      </div>
    );
  }

  const prompt = promptOf(state.draft.promptId);
  if (prompt === undefined) {
    return (
      <div className="app-stack">
        {supplementary}
        <PromptList prompts={prompts} onPick={onPick} />
      </div>
    );
  }

  const chooseAnother = (
    <Button
      variant="ghost"
      onClick={() => {
        dispatch({ type: "choose" });
        void refreshHistory();
      }}
    >
      {t("chooseAnother")}
    </Button>
  );

  if (state.phase === "feedback" && state.submission.assessment !== null) {
    const submission = { ...state.submission, assessment: state.submission.assessment };
    return (
      <div className="app-stack">
        {supplementary}
        <PromptCard prompt={prompt} />
        <WritingFeedback submission={submission} targetBand={setup.targetBand} lang={prompt.lang} headingRef={feedbackRef} />
        <div className="app-actions">
          <Button
            variant="secondary"
            onClick={() => {
              moved.current = true;
              dispatch({ type: "revise" });
            }}
          >
            {t("revise")}
          </Button>
          {chooseAnother}
        </div>
      </div>
    );
  }
  if (state.phase !== "writing") return null;

  const { draft, request } = state;
  return (
    <div className="app-stack">
      {supplementary}
      <PromptCard prompt={prompt} />
      <Editor
        prompt={prompt}
        draft={draft}
        elapsedMs={nowMs - draft.startedAtMs}
        editorRef={editorRef}
        onEdit={(text) => dispatch({ type: "edit", text })}
      />
      {!setup.keyHeld ? (
        <NoKeyCard namespace="writing" estimateUsd={estimateUsd} />
      ) : request.kind === "confirming" ? (
        <Preflight
          estimateUsd={request.preflight.estimateUsd}
          notice={preflightNotice(request.preflight)}
          onSend={() => void onSend(draft)}
          onCancel={() => dispatch({ type: "cancel" })}
        />
      ) : (
        <div className="app-stack">
          <div className="app-actions">
            <Button
              onClick={() => void onGetFeedback()}
              disabled={request.kind === "sending" || countWords(draft.text) === 0}
            >
              {request.kind === "failed" ? t("tryAgain") : t("getFeedback")}
            </Button>
          </div>
          {request.kind === "sending" ? <Toast tone="info">{t("sending")}</Toast> : null}
          {request.kind === "failed" ? <Toast tone="incorrect">{t(failureMessage(request.failure))}</Toast> : null}
        </div>
      )}
      <div className="app-actions">{chooseAnother}</div>
    </div>
  );
}

function PromptList({ prompts, onPick }: { prompts: readonly WritingPrompt[]; onPick: (id: string) => void }) {
  const t = useTranslations("writing");
  const locale = useLocale() as Lang;
  return (
    <section className="app-stack" aria-labelledby="writing-choose-title">
      <h2 id="writing-choose-title">{t("chooseTitle")}</h2>
      <ul className="app-list app-prompts">
        {prompts.map((prompt) => (
          <li key={prompt.id}>
            <Card>
              <h3 id={`prompt-${prompt.id}`}>{prompt.title[locale]}</h3>
              <p className="app-muted">
                {t("promptMeta", {
                  register: t(`register_${prompt.register}`),
                  words: prompt.wordTarget,
                  minutes: prompt.suggestedMinutes,
                })}
              </p>
              <div className="app-actions">
                <Button variant="secondary" aria-describedby={`prompt-${prompt.id}`} onClick={() => onPick(prompt.id)}>
                  {t("write")}
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PromptCard({ prompt }: { prompt: WritingPrompt }) {
  const t = useTranslations("writing");
  const locale = useLocale() as Lang;
  return (
    <Card>
      <h2>{prompt.title[locale]}</h2>
      <h3>{t("taskTitle")}</h3>
      <p lang={prompt.lang}>{prompt.task}</p>
      <p className="app-muted">{t("suggestedTime", { words: prompt.wordTarget, minutes: prompt.suggestedMinutes })}</p>
    </Card>
  );
}

function Editor({
  prompt,
  draft,
  elapsedMs,
  editorRef,
  onEdit,
}: {
  prompt: WritingPrompt;
  draft: Draft;
  elapsedMs: number;
  editorRef: Ref<HTMLTextAreaElement>;
  onEdit: (text: string) => void;
}) {
  const t = useTranslations("writing");
  const id = useId();
  const words = countWords(draft.text);
  const tone = wordTone(words, prompt.wordTarget);
  return (
    <Card>
      <div className="app-stack">
        <Timer
          label={t("timerLabel")}
          text={elapsedText(elapsedMs)}
          tone="normal"
          announcement={t("timerAnnouncement", { minutes: Math.floor(Math.max(0, elapsedMs) / 60_000) })}
        />
        <label className="app-field" htmlFor={`${id}-text`}>
          <span>{t("editorLabel")}</span>
          <textarea
            id={`${id}-text`}
            ref={editorRef}
            className="app-textarea"
            lang={prompt.lang}
            rows={12}
            spellCheck={false}
            aria-describedby={`${id}-hint ${id}-count`}
            value={draft.text}
            onChange={(event) => onEdit(event.target.value)}
          />
          <span id={`${id}-hint`} className="app-muted">
            {t("editorHint")}
          </span>
        </label>
        <p id={`${id}-count`} className={`app-word-count app-word-count--${tone}`}>
          {t("wordCount", { count: words, target: prompt.wordTarget, tone: t(`tone_${tone}`) })}
        </p>
        <p className="pl-visually-hidden" aria-live="polite">
          {t("wordCountAnnounced", { count: announcedCount(words, prompt.wordTarget) })}
        </p>
      </div>
    </Card>
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
  const t = useTranslations("writing");
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
            {t("keepEditing")}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function History({
  history,
  promptOf,
  onOpen,
}: {
  history: readonly WritingSubmission[];
  promptOf: (id: string) => WritingPrompt | undefined;
  onOpen: (submission: WritingSubmission) => void;
}) {
  const t = useTranslations("writing");
  const locale = useLocale() as Lang;
  const format = useFormatter();
  const shown = history.filter((submission) => promptOf(submission.promptId) !== undefined);
  if (shown.length === 0) return null;
  return (
    <section className="app-stack" aria-labelledby="writing-history-title">
      <h2 id="writing-history-title">{t("historyTitle")}</h2>
      <p className="app-muted">{t("historyNote")}</p>
      <ul className="app-list">
        {shown.map((submission) => {
          const prompt = promptOf(submission.promptId) as WritingPrompt;
          const label = t("historyItem", {
            title: prompt.title[locale],
            date: format.dateTime(new Date(submission.writtenAt), { dateStyle: "medium", timeStyle: "short" }),
          });
          return (
            <li key={submission.id} className="app-history">
              <span id={`history-${submission.id}`}>{label}</span>
              <span className="app-tag">
                {submission.assessment === null ? t("historyUnassessed") : t("historyAssessed")}
              </span>
              <Button variant="ghost" aria-describedby={`history-${submission.id}`} onClick={() => onOpen(submission)}>
                {t("open")}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
