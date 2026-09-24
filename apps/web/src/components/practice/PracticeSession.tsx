"use client";

import type { Item, Passage as PassageData, ScoredSkill, SessionId } from "@palier/domain";
import { attemptId, sessionId } from "@palier/domain";
import type { SkillTrend } from "@palier/engine";
import { Button, Callout, EmptyState, Passage, ProgressRail, Sheet, itemRenderers } from "@palier/ui";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, type Ref, useEffect, useReducer, useRef, useState } from "react";

import { currentItem, drillReducer, keyIntent, pendingAnswer, startDrill, summaryOf } from "../../features/drill/drill";
import { Link } from "../../i18n/navigation";
import type { Container } from "../../lib/container";
import { DIAGNOSTIC_SIZE, readStudyProfile, sessionSizeFor } from "../../lib/study";
import { useContainer } from "../ContainerProvider";
import { TrendMeters } from "./TrendMeters";

export type PracticeMode = "drill" | "diagnostic";

type Loaded =
  | { readonly status: "loading" }
  | { readonly status: "needs-setup" }
  | { readonly status: "failed" }
  | {
      readonly status: "ready";
      readonly items: readonly Item[];
      readonly sessionId: SessionId;
    };

/** The practice language is French until the English mirror (Phase 8). */
const TARGET_LANG = "fr" as const;

/**
 * A drill (product-requirements.md §8.3) or a diagnostic (§6.2) for one skill.
 *
 * Both run the same answer loop over `answerItem`. They differ in where the items
 * come from (`startSession`'s plan, or `runDiagnostic`'s coverage sample), in whether
 * each answer is followed by feedback (a diagnostic gives none until the end, so it
 * measures rather than teaches), and in the ending (a summary, or accuracy per band
 * with its interval, R10).
 */
export function PracticeSession({ skill, mode }: { skill: ScoredSkill; mode: PracticeMode }) {
  const t = useTranslations("common");
  const state = useContainer();
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    if (state.status !== "ready") return;
    let live = true;
    load(state.container, skill, mode).then(
      (result) => live && setLoaded(result),
      () => live && setLoaded({ status: "failed" }),
    );
    return () => {
      live = false;
    };
  }, [state, skill, mode]);

  if (state.status === "failed" || loaded.status === "failed") {
    return <Callout tone="incorrect">{t("loadFailed")}</Callout>;
  }
  if (state.status !== "ready" || loaded.status === "loading") {
    return <p role="status">{t("loading")}</p>;
  }
  if (loaded.status === "needs-setup") return <NeedsSetup />;
  return (
    <Runner
      container={state.container}
      mode={mode}
      skill={skill}
      items={loaded.items}
      sessionId={loaded.sessionId}
    />
  );
}

const load = async (container: Container, skill: ScoredSkill, mode: PracticeMode): Promise<Loaded> => {
  const profile = await readStudyProfile(container.settings);
  if (mode === "drill") {
    if (profile === null) return { status: "needs-setup" };
    const started = await container.useCases.startSession({
      sessionId: sessionId(container.ids.ulid()),
      mode: "drill",
      plan: {
        skill,
        lang: TARGET_LANG,
        targetBand: profile.targetBand,
        sessionSize: sessionSizeFor(profile.dailyGoalMinutes),
        ...(profile.testDate === null ? {} : { testDate: `${profile.testDate}T00:00:00.000Z` }),
      },
    });
    return { status: "ready", items: started.plan.items, sessionId: started.session.id };
  }
  // The diagnostic samples every band whatever the target (D47). The request still
  // carries one, so a first-run diagnostic before onboarding carries C, the level
  // this product is built for.
  const { items } = await container.useCases.runDiagnostic({
    skill,
    lang: TARGET_LANG,
    targetBand: profile?.targetBand ?? "C",
    count: DIAGNOSTIC_SIZE,
  });
  return { status: "ready", items, sessionId: sessionId(container.ids.ulid()) };
};

function NeedsSetup() {
  const t = useTranslations("today");
  return (
    <EmptyState
      heading={t("setUpTitle")}
      action={
        <Link href="/start" className="pl-btn pl-btn--primary pl-focusable">
          {t("setUpAction")}
        </Link>
      }
    >
      {t("setUpBody")}
    </EmptyState>
  );
}

function Runner({
  container,
  mode,
  skill,
  items,
  sessionId: session,
}: {
  container: Container;
  mode: PracticeMode;
  skill: ScoredSkill;
  items: readonly Item[];
  sessionId: SessionId;
}) {
  const t = useTranslations("drill");
  const tCommon = useTranslations("common");
  const tSkills = useTranslations("skills");
  const [state, dispatch] = useReducer(drillReducer, items, (initial) => startDrill(initial, performance.now()));
  // Keyed by the item it belongs to, so a new item shows no stale passage.
  const [loadedPassage, setLoadedPassage] = useState<{ itemId: string; passage: PassageData | null } | null>(null);
  const [recordFailed, setRecordFailed] = useState(false);
  const [trend, setTrend] = useState<SkillTrend | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLHeadingElement>(null);
  // One attempt id per item, minted once, so a retried confirm is the store's no-op
  // rather than a second attempt (D44).
  const attemptIds = useRef(new Map<number, string>());
  const item = currentItem(state);
  // The keyboard listener reads the latest state through this ref, so it can be
  // attached once rather than re-bound on every render.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const passage = item !== null && loadedPassage?.itemId === item.id ? loadedPassage.passage : null;

  // The item's passage, if it has one.
  useEffect(() => {
    if (item?.passageId === undefined) return;
    let live = true;
    const forItem = item.id;
    void container.items.passage(item.passageId).then((p) => live && setLoadedPassage({ itemId: forItem, passage: p }));
    return () => {
      live = false;
    };
  }, [container, item]);

  // Record a confirmed answer. The only side effect in the loop.
  useEffect(() => {
    if (state.phase !== "recording") return;
    const pending = pendingAnswer(state, performance.now());
    if (pending === null) return;
    const id = attemptIds.current.get(state.index) ?? container.ids.ulid();
    attemptIds.current.set(state.index, id);
    let live = true;
    container.useCases
      .answerItem({
        attemptId: attemptId(id),
        itemId: pending.item.id,
        response: pending.response,
        sessionId: session,
        mode,
        msToFirstSelect: pending.msToFirstSelect,
        msToConfirm: pending.msToConfirm,
        changedAnswer: pending.changedAnswer,
        // No timing threshold exists yet (D40): "slow" waits for real timing data.
        slow: false,
      })
      .then(
        (result) => {
          if (!live) return;
          setRecordFailed(false);
          dispatch({ type: "answered", correct: result.attempt.correct });
          // A diagnostic gives no per-item feedback: straight on to the next item.
          if (mode === "diagnostic") dispatch({ type: "next", at: performance.now() });
        },
        () => {
          if (!live) return;
          setRecordFailed(true);
          dispatch({ type: "failed" });
        },
      );
    return () => {
      live = false;
    };
  }, [state, container, session, mode]);

  // §8.3's keys, whenever the drill is on screen — not only while focus happens to be
  // inside it. Keys typed into a text field are left alone.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target !== null && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      // Enter on a real button (Confirm, Next, a link) is that control's own click;
      // handling it here as well would act twice. Enter on an option radio confirms.
      if (event.key === "Enter" && target !== null && (target.tagName === "BUTTON" || target.tagName === "A") && target.getAttribute("role") !== "radio") {
        return;
      }
      const intent = keyIntent(event.key, stateRef.current);
      if (intent === null) return;
      event.preventDefault();
      if (intent.type === "select") dispatch({ type: "select", option: intent.option, at: performance.now() });
      else if (intent.type === "confirm") dispatch({ type: "confirm" });
      else dispatch({ type: "next", at: performance.now() });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus: to the feedback heading on answer, back to the item's options on advance (§11).
  useEffect(() => {
    if (state.phase === "feedback") feedbackRef.current?.focus();
  }, [state.phase]);
  useEffect(() => {
    if (state.index > 0 && state.phase === "answering") {
      itemRef.current?.querySelector<HTMLElement>("[role='radio'][tabindex='0']")?.focus();
    }
  }, [state.index, state.phase]);

  // The ending: close a drill's session; read a diagnostic's accuracy back.
  useEffect(() => {
    if (state.phase !== "complete" || items.length === 0) return;
    let live = true;
    if (mode === "drill") {
      void container.useCases.completeSession({ sessionId: session });
    } else {
      void container.useCases.diagnosticReadout({ skill }).then((readout) => live && setTrend(readout));
    }
    return () => {
      live = false;
    };
  }, [state.phase, mode, container, session, skill, items.length]);

  if (items.length === 0) {
    return (
      <EmptyState
        heading={t("nothingTitle")}
        action={
          <Link href="/home" className="pl-btn pl-btn--secondary pl-focusable">
            {tCommon("backHome")}
          </Link>
        }
      >
        {t("nothingBody")}
      </EmptyState>
    );
  }

  if (state.phase === "complete") {
    return mode === "drill" ? (
      <DrillComplete {...summaryOf(state)} />
    ) : (
      <DiagnosticComplete skillName={tSkills(skill)} trend={trend} />
    );
  }

  if (item === null) return null;
  const Renderer = itemRenderers[item.type];

  const inFeedback = state.phase === "feedback";

  return (
    <div className="app-session">
      <ProgressRail
        current={state.outcomes.length}
        total={items.length}
        label={t("progress", { current: state.index + 1, total: items.length })}
      />
      <p className="app-session__count" aria-hidden="true">
        {t("progress", { current: state.index + 1, total: items.length })}
      </p>
      {passage === null ? null : (
        <Passage title={passage.title} body={passage.body} lang={passage.lang} label={t("passageLabel")} />
      )}
      <div ref={itemRef}>
        <Renderer
          item={item}
          selected={state.selected}
          onSelect={(option) => dispatch({ type: "select", option, at: performance.now() })}
          revealed={inFeedback}
          statusLabels={{ correct: t("statusCorrect"), incorrect: t("statusIncorrect") }}
        />
      </div>
      {recordFailed ? <Callout tone="incorrect">{t("recordFailed")}</Callout> : null}
      {inFeedback && mode === "drill" ? (
        <Feedback
          item={item}
          chosen={state.selected}
          correct={state.outcomes.at(-1) === "correct"}
          headingRef={feedbackRef}
          last={state.index === items.length - 1}
          onNext={() => dispatch({ type: "next", at: performance.now() })}
        />
      ) : (
        <div className="app-session__actions">
          <Button onClick={() => dispatch({ type: "confirm" })} disabled={state.selected === null || state.phase !== "answering"}>
            {t("confirm")}
          </Button>
          <p className="app-session__hint">{t("keyboardHint")}</p>
        </div>
      )}
    </div>
  );
}

/**
 * The feedback panel (§8.3): the correct answer, why it is right, why the chosen
 * distractor was tempting, the rule, and the sub-skill it trains. Explanations are in
 * the interface language (§12); the options stay in the item's own.
 */
function Feedback({
  item,
  chosen,
  correct,
  headingRef,
  last,
  onNext,
}: {
  item: Item;
  chosen: string | null;
  correct: boolean;
  headingRef: Ref<HTMLHeadingElement>;
  last: boolean;
  onNext: () => void;
}) {
  const t = useTranslations("drill");
  const tSub = useTranslations("subSkills");
  const locale = useLocale() === "fr" ? "fr" : "en";
  const keyOption = item.options.find((o) => o.id === item.key);
  const chosenOption = correct ? undefined : item.options.find((o) => o.id === chosen);
  const inItemLang = (chunks: ReactNode) => <span lang={item.lang}>{chunks}</span>;

  return (
    <Sheet
      tone={correct ? "correct" : "incorrect"}
      heading={correct ? t("headingCorrect") : t("headingIncorrect")}
      headingRef={headingRef}
      action={<Button onClick={onNext}>{last ? t("finish") : t("next")}</Button>}
    >
      {keyOption === undefined ? null : (
        <>
          <p className="app-feedback__answer">{t.rich("theAnswer", { answer: keyOption.text, target: inItemLang })}</p>
          <p>{keyOption.rationale[locale]}</p>
        </>
      )}
      {chosenOption === undefined ? null : (
        <>
          <h3 className="app-feedback__subheading">
            {t.rich("whyChosenWrong", { answer: chosenOption.text, target: inItemLang })}
          </h3>
          <p>{chosenOption.rationale[locale]}</p>
        </>
      )}
      <h3 className="app-feedback__subheading">{t("theRule")}</h3>
      <p>{item.explanation[locale]}</p>
      <p className="app-feedback__matters">
        {t("whyMatters", { band: item.targetBand, subSkill: tSub(item.subSkill) })}
      </p>
    </Sheet>
  );
}

function DrillComplete({ answered, correct }: { answered: number; correct: number }) {
  const t = useTranslations("drill");
  const tCommon = useTranslations("common");
  return (
    <EmptyState
      heading={t("completeTitle")}
      action={
        <Link href="/home" className="pl-btn pl-btn--primary pl-focusable">
          {tCommon("backHome")}
        </Link>
      }
    >
      {t("summary", { correct, answered })}
    </EmptyState>
  );
}

function DiagnosticComplete({ skillName, trend }: { skillName: string; trend: SkillTrend | null }) {
  const t = useTranslations("diagnostic");
  const tCommon = useTranslations("common");
  return (
    <section className="app-stack">
      <h2>{t("resultTitle", { skill: skillName })}</h2>
      {trend === null ? <p role="status">{tCommon("loading")}</p> : <TrendMeters trend={trend} />}
      <p className="app-muted">{t("resultNote")}</p>
      <Link href="/home" className="pl-btn pl-btn--primary pl-focusable">
        {t("toToday")}
      </Link>
    </section>
  );
}
