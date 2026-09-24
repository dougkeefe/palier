"use client";

import type { SyncOutcome } from "@palier/app";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { deviceLabel } from "../../lib/device-label";
import { type SyncTrigger, delayFor, shouldSync } from "../../lib/sync-triggers";
import { INITIAL_VIEW, type SyncView, viewFromOutcome, viewFromState, viewSyncing } from "../../features/sync/sync-view";
import { useContainer } from "../ContainerProvider";

type SyncContextValue = {
  readonly view: SyncView;
  /** Report something that may warrant a sync (architecture.md §9.4); the runner decides. */
  readonly notify: (trigger: SyncTrigger) => void;
  /** Re-read the stored state, after the settings page changes it. */
  readonly refresh: () => Promise<void>;
  /** Show the outcome of an exchange the settings page ran itself (pairing). */
  readonly settle: (outcome: SyncOutcome) => void;
};

const SYNCING_LABEL_DELAY_MS = 400;

const SyncContext = createContext<SyncContextValue>({
  view: INITIAL_VIEW,
  notify: () => undefined,
  refresh: () => Promise.resolve(),
  settle: () => undefined,
});

/**
 * Runs sync in the background (architecture.md §9.4) and tells the header and the
 * settings page what it is doing. It syncs on load and on focus when more than five
 * minutes have passed, thirty seconds after a session completes, on reconnect, and on
 * demand. The decisions are `shouldSync`/`delayFor`, and the display is `sync-view.ts`,
 * so this component holds only the listeners. Sync never interrupts study (§11):
 * whatever happens here only moves the quiet indicator.
 */
export function SyncRunner({ children }: { children: ReactNode }) {
  const container = useContainer();
  const [view, setView] = useState<SyncView>(INITIAL_VIEW);
  const lastStarted = useRef<number | null>(null);
  const running = useRef(false);
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (container.status !== "ready") return;
    const state = await container.container.useCases.syncState();
    setView(viewFromState(state, navigator.onLine));
  }, [container]);

  const run = useCallback(
    async (trigger: SyncTrigger) => {
      if (container.status !== "ready" || running.current) return;
      if (!shouldSync(trigger, performance.now(), lastStarted.current)) return;
      running.current = true;
      lastStarted.current = performance.now();
      // "Syncing…" only once an exchange takes a moment. A run that turns out to have
      // nothing to do (no identity yet, sync off) resolves in milliseconds, and flashing
      // the label for it would shift the header on every page load (D68's rule).
      const showing = setTimeout(() => setView(viewSyncing), SYNCING_LABEL_DELAY_MS);
      try {
        const outcome = await container.container.useCases.syncNow({ label: deviceLabel(navigator.userAgent) });
        setView((before) => viewFromOutcome(outcome, before, navigator.onLine));
      } catch {
        setView((before) => viewFromOutcome({ status: "unavailable", reason: "error" }, before, navigator.onLine));
      } finally {
        clearTimeout(showing);
        running.current = false;
      }
    },
    [container],
  );

  const notify = useCallback(
    (trigger: SyncTrigger) => {
      const delay = delayFor(trigger);
      clearTimeout(pending.current);
      if (delay === 0) void run(trigger);
      else pending.current = setTimeout(() => void run(trigger), delay);
    },
    [run],
  );

  const settle = useCallback((outcome: SyncOutcome) => {
    setView((before) => viewFromOutcome(outcome, before, navigator.onLine));
  }, []);

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    void container.container.useCases.syncState().then((state) => {
      if (!live) return;
      setView(viewFromState(state, navigator.onLine));
      notify("load");
    });
    const onFocus = () => notify("focus");
    const onOnline = () => notify("reconnect");
    const onOffline = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      live = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearTimeout(pending.current);
    };
  }, [container, notify, refresh]);

  const value = useMemo(() => ({ view, notify, refresh, settle }), [view, notify, refresh, settle]);
  return <SyncContext value={value}>{children}</SyncContext>;
}

export const useSync = (): SyncContextValue => useContext(SyncContext);
