"use client";

import type { GeneratedSet } from "@palier/app";
import type { Item, Passage as PassageData, ScoredSkill, SessionId } from "@palier/domain";
import { attemptId, sessionId } from "@palier/domain";
import type { SkillTrend } from "@palier/engine";
import { Button, Callout, EmptyState, Passage, ProgressRail, Sheet, itemRenderers } from "@palier/ui";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, type Ref, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";

import { currentItem, drillReducer, pendingAnswer, startDrill, summaryOf } from "../../features/drill/drill";
import { Link } from "../../i18n/navigation";
import { ArticleLink } from "../library/ArticleLink";
import type { Container } from "../../lib/container";
import { isPageKey } from "../../lib/keyboard";
import { DIAGNOSTIC_SIZE, REVIEW_SET_LIMIT, readStudyProfile, sessionSizeFor } from "../../lib/study";
import { useContainer } from "../ContainerProvider";
import { KeyOffer } from "../key/KeyOffer";
import { NonAffiliation } from "../NonAffiliation";
import { useSync } from "../sync/SyncRunner";
import { GeneratedProvenance } from "./GeneratedProvenance";
import { ReportItem } from "./ReportItem";
import { TrendMeters } from "./TrendMeters";

export type PracticeMode = "drill" | "diagnostic" | "review" | "generated";

export type PracticeSessionProps =
  | { readonly mode: "drill" | "diagnostic"; readonly skill: ScoredSkill }
  | { readonly mode: "review" }
  | { readonly mode: "generated"; readonly set: GeneratedSet; readonly onDone: () => void };

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
 * A drill (product-requirements.md §8.3) or a diagnostic (§6.2) for one skill, or a
 * review set (§8.8) across both.
 *
 * All three run the same answer loop over `answerItem`. They differ in where the items
 * come from (`startSession`'s plan, `runDiagnostic`'s coverage sample, or
 * `reviewQueue`'s due stack), in whether each answer is followed by feedback (a
 * diagnostic gives none until the end, so it measures rather than teaches), and in the
 * ending (a summary, or accuracy per band with its interval, R10).
 *
 * A generated set (architecture.md §8.3, progress.md D110–D111) is the one exception to the
 * answer loop: its items were made on this device, so it is handed in whole rather than
 * loaded, and each answer is scored by `scoreGeneratedAnswer`, which writes no attempt, no
 * schedule entry and no session. It never reaches the trend and never syncs.
 */
export function PracticeSession(props: PracticeSessionProps) {
  if (props.mode === "generated") return <GeneratedSession set={props.set} onDone={props.onDone} />;
  return <LoadedSession {...props} />;
}

function GeneratedSession({ set, onDone }: { set: GeneratedSet; onDone: () => void }) {
  const t = useTranslations("common");
  const state = useContainer();
  if (state.status === "failed") return <Callout tone="incorrect">{t("loadFailed")}</Callout>;
  if (state.status !== "ready") return <p role="status">{t("loading")}</p>;
  return (
    <Runner
      container={state.container}
      mode="generated"
      skill={set.skill}
      items={set.items}
      sessionId={sessionId(set.id)}
      onDone={onDone}
    />
  );
}

function LoadedSession(props: Exclude<PracticeSessionProps, { readonly mode: "generated" }>) {
  const { mode } = props;
  const skill = props.mode === "review" ? null : props.skill;
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

const load = async (
  container: Container,
  skill: ScoredSkill | null,
  mode: Exclude<PracticeMode, "generated">,
): Promise<Loaded> => {
  if (mode === "review" || skill === null) {
    const { items } = await container.useCases.reviewQueue({ limit: REVIEW_SET_LIMIT });
    return { status: "ready", items, sessionId: sessionId(container.ids.ulid()) };
  }
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
  onDone,
}: {
  container: Container;
  mode: PracticeMode;
  skill: ScoredSkill | null;
  items: readonly Item[];
  sessionId: SessionId;
  onDone?: () => void;
}) {
  const t = useTranslations("drill");
  const tCommon = useTranslations("common");
  const tSkills = useTranslations("skills");
  const [state, dispatch] = useReducer(drillReducer, items, (initial) => startDrill(initial, performance.now()));
  // Keyed by the item it belongs to, so a new item shows no stale passage.
  const [loadedPassage, setLoadedPassage] = useState<{ itemId: string; passage: PassageData | null } | null>(null);
  const [recordFailed, setRecordFailed] = useState(false);
  const [trend, setTrend] = useState<SkillTrend | null>(null);
  const sync = useSync();
  const itemRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLHeadingElement>(null);
  // One attempt id per item, minted once, so a retried confirm is the store's no-op
  // rather than a second attempt (D44).
  const attemptIds = useRef(new Map<number, string>());
  const item = currentItem(state);
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
    let live = true;
    const record = (): Promise<boolean> => {
      // A generated item is scored on the device and recorded nowhere (D110).
      if (mode === "generated") {
        return container.useCases
          .scoreGeneratedAnswer({ itemId: pending.item.id, response: pending.response })
          .then((result) => result.correct);
      }
      const id = attemptIds.current.get(state.index) ?? container.ids.ulid();
      attemptIds.current.set(state.index, id);
      return container.useCases
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
        .then((result) => result.attempt.correct);
    };
    record().then(
      (correct) => {
        if (!live) return;
        setRecordFailed(false);
        dispatch({ type: "answered", correct });
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
  // inside it. Keys typed into a text field are left alone. A layout effect, so the
  // listener is on before the first item is painted: `Runner` mounts only once the
  // items have loaded, with its first item, and a passive effect can run after that
  // paint, so "1" and Enter pressed as the item appeared were lost (progress.md D196,
  // as the exam runner's were, D179).
  useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Keys typed into a field, Enter on a real button (Confirm, Next, a link: that
      // control's own click), and a chord or held key are not the drill's
      // (`lib/keyboard.ts`). Enter on an option radio confirms.
      if (!isPageKey(event, event.target as HTMLElement | null)) return;
      // The reducer resolves the key against its current state (see the "key" event).
      if (event.key === "Enter" || /^[1-9]$/.test(event.key)) {
        dispatch({ type: "key", key: event.key, at: performance.now() });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus: to the feedback heading on answer, back to the item's options on advance (§11).
  useEffect(() => {
    if (state.phase === "feedback") feedbackRef.current?.focus();
  }, [state.phase]);
  // Including the first item: a set is usually reached by a link, and a link that
  // keeps focus would take the user's Enter for itself instead of confirming.
  useEffect(() => {
    if (state.phase === "answering") {
      itemRef.current?.querySelector<HTMLElement>("[role='radio'][tabindex='0']")?.focus();
    }
  }, [state.index, state.phase]);

  // The ending: close a drill's session; read a diagnostic's accuracy back.
  useEffect(() => {
    if (state.phase !== "complete" || items.length === 0) return;
    let live = true;
    if (mode === "drill") {
      // A completed session is a sync trigger, debounced (architecture.md §9.4).
      void container.useCases.completeSession({ sessionId: session }).then(() => sync.notify("session-complete"));
    } else if (mode === "diagnostic" && skill !== null) {
      void container.useCases.diagnosticReadout({ skill }).then((readout) => live && setTrend(readout));
    }
    return () => {
      live = false;
    };
  }, [state.phase, mode, container, session, skill, items.length, sync]);

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
    if (mode === "generated") return <GeneratedComplete {...summaryOf(state)} onDone={onDone} />;
    return mode === "diagnostic" && skill !== null ? (
      <DiagnosticComplete skillName={tSkills(skill)} trend={trend} />
    ) : (
      <DrillComplete {...summaryOf(state)} />
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
      {recordFailed ? <RecordFailed generated={mode === "generated"} onDone={onDone} /> : null}
      {inFeedback && mode !== "diagnostic" ? (
        <Feedback
          item={item}
          chosen={state.selected}
          correct={state.outcomes.at(-1) === "correct"}
          headingRef={feedbackRef}
          container={container}
          generated={mode === "generated"}
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
  container,
  generated,
  last,
  onNext,
}: {
  item: Item;
  chosen: string | null;
  correct: boolean;
  headingRef: Ref<HTMLHeadingElement>;
  container: Container;
  /** A runtime-generated item carries its provenance badge and contribution; there is no bank item to report. */
  generated: boolean;
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
      <ArticleLink subSkill={item.subSkill} newTab />
      {generated ? (
        <GeneratedProvenance item={item} />
      ) : (
        <ReportItem item={item} container={container} />
      )}
    </Sheet>
  );
}

/**
 * An answer that could not be recorded. A drill says so and asks for a retry. A generated set
 * saves nothing, so its only failure is an item no longer on this device (a wipe in another
 * tab, say), where a retry can never succeed: it says so and offers the way back instead.
 */
function RecordFailed({ generated, onDone }: { generated: boolean; onDone: (() => void) | undefined }) {
  const t = useTranslations("drill");
  const tGenerate = useTranslations("generate");
  if (!generated) return <Callout tone="incorrect">{t("recordFailed")}</Callout>;
  return (
    <Callout tone="incorrect">
      {tGenerate("scoreFailed")}{" "}
      <Button variant="secondary" onClick={onDone}>
        {tGenerate("back")}
      </Button>
    </Callout>
  );
}

/**
 * The end of a generated set: the score, a reminder that it never counts, and the way back to
 * the fresh-set screen. No session is closed and no sync is triggered, because nothing was
 * recorded (D110).
 */
function GeneratedComplete({ answered, correct, onDone }: { answered: number; correct: number; onDone: (() => void) | undefined }) {
  const t = useTranslations("generate");
  return (
    <EmptyState
      heading={t("doneTitle")}
      action={
        <Button variant="primary" onClick={onDone}>
          {t("back")}
        </Button>
      }
    >
      {t("doneBody", { correct, answered })}
    </EmptyState>
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

/**
 * The diagnostic's readout. On the diagnostic path it is also where onboarding's step 5,
 * the optional key, is offered: after the diagnostic, never before (§8.1, progress.md D100).
 * It is offered only while no key is held, and it is never a gate.
 */
function DiagnosticComplete({ skillName, trend }: { skillName: string; trend: SkillTrend | null }) {
  const t = useTranslations("diagnostic");
  const tKey = useTranslations("key");
  const tCommon = useTranslations("common");
  const container = useContainer();
  const [offerKey, setOfferKey] = useState(false);

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    void container.container.useCases.apiKeyStatus().then(
      (status) => live && setOfferKey(status === null),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [container]);

  return (
    <section className="app-stack">
      <h2>{t("resultTitle", { skill: skillName })}</h2>
      {trend === null ? <p role="status">{tCommon("loading")}</p> : <TrendMeters trend={trend} />}
      <p className="app-muted">{t("resultNote")}</p>
      <NonAffiliation />
      <Link href="/home" className="pl-btn pl-btn--primary pl-focusable">
        {t("toToday")}
      </Link>
      {offerKey ? (
        <KeyOffer
          heading="h3"
          actions={
            <Link href="/settings/key" className="pl-btn pl-btn--secondary pl-focusable">
              {tKey("offerAdd")}
            </Link>
          }
        />
      ) : null}
    </section>
  );
}
