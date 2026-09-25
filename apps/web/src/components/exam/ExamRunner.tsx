"use client";

import type { ExamRun } from "@palier/app";
import type { ExamForm, Item, Passage as PassageData } from "@palier/domain";
import { sessionId } from "@palier/domain";
import { Button, Callout, Dialog, EmptyState, Glyph, Passage, Timer, itemRenderers } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  SUBMIT_PAUSE_MS,
  announcedMinutes,
  checkpointDue,
  clockText,
  clockTone,
  expired,
  limitMs,
  remainingMs,
} from "../../features/exam/rules";
import {
  type ExamWrite,
  answeredCount,
  currentItem,
  navigatorEntries,
  runnerReducer,
  startRunner,
  submitCounts,
} from "../../features/exam/runner";
import { Link, useRouter } from "../../i18n/navigation";
import type { Container } from "../../lib/container";
import { useContainer } from "../ContainerProvider";

type Loaded =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "none" }
  | { readonly status: "submitted"; readonly runId: string }
  | { readonly status: "ready"; readonly run: ExamRun; readonly form: ExamForm; readonly items: readonly Item[] };

/** The run named in the URL (`/exam/run?run=<id>`), read in the browser: the page is a static shell. */
const runIdFromUrl = (): string | null => new URLSearchParams(window.location.search).get("run");

const resume = async (container: Container, id: string | null): Promise<Loaded> => {
  if (id !== null) {
    const stored = await container.examRuns.get(sessionId(id));
    if (stored === null) return { status: "none" };
    if (stored.submittedAt !== null) return { status: "submitted", runId: stored.id };
  }
  // Opening a run whose clock has started counts as a pause (D84 ruling 1, D85).
  const resumed = await container.useCases.resumeExam(id === null ? {} : { runId: sessionId(id) });
  if (resumed === null) return { status: "none" };
  const items = await container.items.byIds(resumed.form.itemIds);
  return { status: "ready", run: resumed.run, form: resumed.form, items };
};

/**
 * The mock-exam runner (product-requirements.md §8.4, progress.md D84). The page
 * carries `data-mode="exam"`, so the muted token set applies and nothing moves.
 */
export function ExamRunner() {
  const t = useTranslations("exam");
  const tCommon = useTranslations("common");
  const state = useContainer();
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  // One resume per page load, even when React runs the effect twice: a second
  // resume would count a second pause.
  const resuming = useRef<Promise<Loaded> | null>(null);

  useEffect(() => {
    if (state.status !== "ready") return;
    let live = true;
    resuming.current ??= resume(state.container, runIdFromUrl());
    resuming.current.then(
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
  if (loaded.status === "submitted") {
    return (
      <EmptyState
        heading={t("resultsTitle")}
        action={
          <Link
            href={{ pathname: "/exam/results", query: { run: loaded.runId } }}
            className="pl-btn pl-btn--primary pl-focusable"
          >
            {t("resultsTitle")}
          </Link>
        }
      />
    );
  }
  if (loaded.status === "none") {
    return (
      <EmptyState
        heading={t("noRunTitle")}
        action={
          <Link href="/exam" className="pl-btn pl-btn--primary pl-focusable">
            {t("noRunAction")}
          </Link>
        }
      >
        {t("noRunBody")}
      </EmptyState>
    );
  }
  return <Runner container={state.container} run={loaded.run} form={loaded.form} items={loaded.items} />;
}

/** How long a failed submission waits before the runner tries again. */
const SUBMIT_RETRY_MS = 3_000;
/** How long a failed answer or flag waits before it is written again. */
const SAVE_RETRY_MS = 2_000;

function Runner({
  container,
  run,
  form,
  items,
}: {
  container: Container;
  run: ExamRun;
  form: ExamForm;
  items: readonly Item[];
}) {
  const t = useTranslations("exam");
  const tDrill = useTranslations("drill");
  const router = useRouter();
  const [state, dispatch] = useReducer(runnerReducer, null, () => startRunner(run, form, items, performance.now()));
  const limit = limitMs(form, run.timeAllowance ?? 1);

  // The exam clock: the elapsed time the run stored, plus time on screen since this
  // load. The time the tab was closed is never counted (D84 ruling 1).
  const [clock] = useState(() => ({ base: run.elapsedMs, since: performance.now() }));
  const elapsedNow = useCallback(() => clock.base + (performance.now() - clock.since), [clock]);
  const [elapsed, setElapsed] = useState(run.elapsedMs);
  const remaining = remainingMs(limit, elapsed);

  // Every write goes through one chain, in order. An answer and a checkpoint both
  // read the run and write it back, so two at once could each lose the other's change.
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = useCallback(<T,>(write: () => Promise<T>): Promise<T> => {
    const next = chain.current.then(write, write);
    chain.current = next.catch(() => undefined);
    return next;
  }, []);
  const lastWritten = useRef(run.elapsedMs);
  const stamp = useCallback(() => {
    const at = Math.round(Math.min(elapsedNow(), limit));
    lastWritten.current = at;
    return at;
  }, [elapsedNow, limit]);

  const draining = useRef(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const submitting = useRef(false);
  const [submitFailed, setSubmitFailed] = useState(false);

  const item = currentItem(state);
  const itemRef = useRef<HTMLDivElement>(null);
  const [loadedPassage, setLoadedPassage] = useState<{ itemId: string; passage: PassageData | null } | null>(null);
  const passage = item !== null && loadedPassage?.itemId === item.id ? loadedPassage.passage : null;

  const write = useCallback(
    (w: ExamWrite) =>
      w.kind === "answer"
        ? container.useCases.answerExamItem({
            runId: run.id,
            itemId: w.itemId,
            response: w.response,
            msToFirstSelect: w.msToFirstSelect,
            msToConfirm: w.msToConfirm,
            changedAnswer: w.changedAnswer,
            elapsedMs: stamp(),
          })
        : container.useCases.flagExamItem({ runId: run.id, itemId: w.itemId, flagged: w.flagged, elapsedMs: stamp() }),
    [container, run.id, stamp],
  );

  // Drain the outbox: every answer and flag, written in the order given. A failed
  // batch stays in the outbox and is written again; every write is idempotent.
  useEffect(() => {
    if (state.outbox.length === 0 || draining.current) return;
    draining.current = true;
    const batch = state.outbox;
    enqueue(async () => {
      for (const w of batch) await write(w);
    }).then(
      () => {
        draining.current = false;
        setSaveFailed(false);
        dispatch({ type: "sent", count: batch.length });
      },
      () => {
        draining.current = false;
        setSaveFailed(true);
        window.setTimeout(() => setRetry((n) => n + 1), SAVE_RETRY_MS);
      },
    );
  }, [state.outbox, retry, enqueue, write]);

  // The clock ticks once a second while the exam runs.
  useEffect(() => {
    if (state.phase !== "running") return;
    const id = window.setInterval(() => setElapsed(elapsedNow()), 1_000);
    return () => window.clearInterval(id);
  }, [state.phase, elapsedNow]);

  // A checkpoint with nothing else changing, every CHECKPOINT_EVERY_MS of exam time.
  useEffect(() => {
    if (state.phase !== "running" || !checkpointDue(lastWritten.current, elapsed)) return;
    void enqueue(() => container.useCases.checkpointExam({ runId: run.id, elapsedMs: stamp() })).catch(() => undefined);
  }, [elapsed, state.phase, enqueue, container, run.id, stamp]);

  // And when the tab is hidden or the page goes away, so a closed tab loses nothing.
  useEffect(() => {
    if (state.phase !== "running") return;
    const save = () => {
      void enqueue(() => container.useCases.checkpointExam({ runId: run.id, elapsedMs: stamp() })).catch(() => undefined);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", save);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", save);
    };
  }, [state.phase, enqueue, container, run.id, stamp]);

  // Time running out submits the exam (D84 ruling 5).
  useEffect(() => {
    if (state.phase === "running" && expired(remaining)) dispatch({ type: "expire" });
  }, [state.phase, remaining]);

  // Submit once every answer is written, then a short deliberate pause (§8.4), then the results.
  useEffect(() => {
    if (state.phase !== "submitting" || state.outbox.length > 0 || submitting.current) return;
    submitting.current = true;
    enqueue(() => container.useCases.submitExam({ runId: run.id, elapsedMs: stamp() })).then(
      () => {
        setSubmitFailed(false);
        dispatch({ type: "submitted" });
        window.setTimeout(() => router.push({ pathname: "/exam/results", query: { run: run.id } }), SUBMIT_PAUSE_MS);
      },
      () => {
        setSubmitFailed(true);
        window.setTimeout(() => {
          submitting.current = false;
          dispatch({ type: "submitFailed" });
        }, SUBMIT_RETRY_MS);
      },
    );
  }, [state.phase, state.outbox.length, enqueue, container, run.id, stamp, router]);

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

  // The keys (1 to 4, Enter, F) whenever the runner is on screen. Keys typed into a
  // field, and Enter on a real button or link, are left to that control.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target !== null && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (
        event.key === "Enter" &&
        target !== null &&
        (target.tagName === "BUTTON" || target.tagName === "A") &&
        target.getAttribute("role") !== "radio"
      ) {
        return;
      }
      if (event.key === "Enter" || event.key === "f" || event.key === "F" || /^[1-9]$/.test(event.key)) {
        // An option is a <button role="radio">, and Enter on a button also clicks it.
        // That click would land after the reducer has moved on, and answer the next
        // item with this one's choice (progress.md D87). The key alone is the action.
        if (event.key === "Enter") event.preventDefault();
        dispatch({ type: "key", key: event.key, at: performance.now() });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus follows the item: its chosen option, or its first (§11).
  const focusItem = useCallback(() => {
    itemRef.current?.querySelector<HTMLElement>("[role='radio'][tabindex='0']")?.focus();
  }, []);
  useEffect(() => {
    if (state.phase === "running") focusItem();
  }, [state.index, state.phase, focusItem]);
  // And back to the item when the navigator closes, however it closed.
  const lastPanel = useRef(state.panel);
  useEffect(() => {
    if (lastPanel.current === "navigator" && state.panel === "none") focusItem();
    lastPanel.current = state.panel;
  }, [state.panel, focusItem]);

  if (state.phase !== "running") {
    return (
      <div className="app-stack">
        <p role="status">{state.timedOut ? t("timeUp") : t("submitting")}</p>
        {submitFailed ? <Callout tone="incorrect">{t("submitFailed")}</Callout> : null}
      </div>
    );
  }
  if (item === null) return null;

  const Renderer = itemRenderers[item.type];
  const tone = clockTone(remaining);
  const counts = submitCounts(state);
  const flagged = state.flagged.has(item.id);
  const last = state.index === state.items.length - 1;

  return (
    <div className="app-exam">
      <div className="app-exam__bar">
        <Timer
          label={t("timeLeft")}
          text={clockText(remaining)}
          tone={tone}
          {...(tone === "normal" ? {} : { toneLabel: tone === "urgent" ? t("veryLowTime") : t("lowTime") })}
          announcement={t("minutesLeft", { minutes: announcedMinutes(remaining) })}
        />
        <p className="app-exam__count">
          {t("position", { current: state.index + 1, total: state.items.length, answered: answeredCount(state) })}
        </p>
        <Button variant="secondary" onClick={() => dispatch({ type: "openNavigator" })}>
          {t("allItems")}
        </Button>
      </div>

      {passage === null ? null : (
        <Passage title={passage.title} body={passage.body} lang={passage.lang} label={t("passageLabel")} />
      )}
      <div ref={itemRef}>
        <Renderer
          key={item.id}
          item={item}
          selected={state.answers.get(item.id) ?? null}
          onSelect={(option) => dispatch({ type: "select", option, at: performance.now() })}
          revealed={false}
          statusLabels={{ correct: tDrill("statusCorrect"), incorrect: tDrill("statusIncorrect") }}
        />
      </div>
      {saveFailed ? <Callout tone="incorrect">{t("saveFailed")}</Callout> : null}

      <div className="app-exam__actions">
        <Button variant="secondary" onClick={() => dispatch({ type: "previous", at: performance.now() })} disabled={state.index === 0}>
          {t("previous")}
        </Button>
        <Button variant="ghost" aria-pressed={flagged} onClick={() => dispatch({ type: "toggleFlag" })}>
          <Glyph name="flag" />
          {t("flag")}
        </Button>
        {flagged ? <span className="app-tag">{t("flaggedState")}</span> : null}
        <Button onClick={() => dispatch({ type: "next", at: performance.now() })} disabled={last}>
          {t("next")}
        </Button>
      </div>
      <div className="app-actions">
        <Button variant="secondary" onClick={() => dispatch({ type: "openSubmit" })}>
          {t("submit")}
        </Button>
      </div>
      <p className="app-session__hint">{t("keyboardHint")}</p>

      <Dialog
        open={state.panel === "navigator"}
        placement="side"
        heading={t("navigatorTitle")}
        onClose={() => dispatch({ type: "closePanel" })}
        actions={
          <Button variant="secondary" onClick={() => dispatch({ type: "closePanel" })}>
            {t("close")}
          </Button>
        }
      >
        <ol className="app-navigator">
          {navigatorEntries(state).map((entry) => (
            <li key={entry.itemId}>
              <button
                type="button"
                className="app-navigator__item pl-focusable"
                aria-current={entry.current ? "step" : undefined}
                onClick={() => dispatch({ type: "goTo", index: entry.index, at: performance.now() })}
              >
                {entry.flagged ? <Glyph name="flag" className="app-navigator__flag" /> : null}
                <span className="app-navigator__state">
                  {t.rich("navEntry", {
                    n: entry.index + 1,
                    answered: entry.answered ? "yes" : "no",
                    flagged: entry.flagged ? "yes" : "no",
                    current: entry.current ? "yes" : "no",
                    number: (chunks) => <span className="app-navigator__number">{chunks}</span>,
                  })}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </Dialog>

      <Dialog
        open={state.panel === "submit"}
        heading={t("submitTitle")}
        onClose={() => dispatch({ type: "closePanel" })}
        actions={
          <>
            <Button variant="secondary" onClick={() => dispatch({ type: "closePanel" })}>
              {t("keepWorking")}
            </Button>
            <Button onClick={() => dispatch({ type: "submit" })}>{t("submitConfirm")}</Button>
          </>
        }
      >
        <p>{t("submitUnanswered", { count: counts.unanswered })}</p>
        <p>{t("submitFlagged", { count: counts.flagged })}</p>
        <p>{t("submitNote")}</p>
      </Dialog>
    </div>
  );
}
