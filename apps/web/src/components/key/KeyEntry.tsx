"use client";

import { Button, Card, Toast } from "@palier/ui";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId, useReducer, useRef, useState } from "react";

import {
  INITIAL_KEY_SCREEN,
  type KeyScreenState,
  afterSaveAction,
  checkFailure,
  checkMessage,
  checkTone,
  keyScreen,
  saveFailure,
} from "../../features/key/key-view";
import type { Container } from "../../lib/container";

/** What {@link useKeyEntry} hands {@link KeyEntry}: the key form's state and its three actions. */
export type KeyEntryState = {
  readonly state: KeyScreenState;
  readonly typed: string;
  readonly setTyped: (typed: string) => void;
  readonly tabOnly: boolean;
  readonly setTabOnly: (tabOnly: boolean) => void;
  readonly busy: boolean;
  /** Whether the user has saved or removed a key here, so focus may follow; never on the first render. */
  readonly moved: boolean;
  readonly save: () => Promise<void>;
  readonly check: () => Promise<void>;
  readonly remove: () => Promise<void>;
};

export function useKeyEntry(
  useCases: Container["useCases"] | null,
  { checkOnSave }: { readonly checkOnSave: boolean },
): KeyEntryState {
  const [state, dispatch] = useReducer(keyScreen, INITIAL_KEY_SCREEN);
  const [typed, setTyped] = useState("");
  const [tabOnly, setTabOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    if (useCases === null) return;
    let live = true;
    void useCases.apiKeyStatus().then(
      (status) => live && dispatch({ type: "loaded", status }),
      () => live && dispatch({ type: "loaded", status: null }),
    );
    return () => {
      live = false;
    };
  }, [useCases]);

  const check = async () => {
    if (useCases === null) return;
    dispatch({ type: "checking" });
    try {
      await useCases.checkApiKey();
      dispatch({ type: "checked", result: { kind: "valid" } });
    } catch (error) {
      dispatch({ type: "checked", result: checkFailure(error) });
    }
  };

  const save = async () => {
    if (useCases === null) return;
    setBusy(true);
    setMoved(true);
    try {
      await useCases.saveApiKey({ key: typed, remember: !tabOnly });
      const status = await useCases.apiKeyStatus();
      setTyped("");
      if (status === null) {
        dispatch({ type: "saveRefused", notice: "saveFailed" });
        return;
      }
      dispatch({ type: "saved", status });
      if (afterSaveAction({ checkOnSave }) === "check") await check();
    } catch (error) {
      dispatch({ type: "saveRefused", notice: saveFailure(error) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (useCases === null) return;
    setMoved(true);
    await useCases.removeApiKey();
    setTabOnly(false);
    dispatch({ type: "removed" });
  };

  return { state, typed, setTyped, tabOnly, setTabOnly, busy, moved, save, check, remove };
}

/**
 * The key's own form, shared by `/settings/key` and onboarding's key step (progress.md D100, D220):
 * - with no key, the masked field, "for this tab only", and save;
 * - with a key, where it is held and how it ends, check and remove, and the check's result in plain
 *   words (§14), never the raw error.
 *
 * The field is cleared as soon as the key is saved, and the key is never shown again, only its last
 * four characters (architecture.md §6.2). Focus moves to what replaced the form, and back to the field
 * when the key is removed (§11).
 *
 * {@link useKeyEntry} holds the state, so the key screen can keep its own loading gate around the page;
 * {@link KeyEntry} renders it. It is its own `<form>`, so it must never sit inside another.
 */
export function KeyEntry({
  entry,
  heading,
  savedExtra,
}: {
  readonly entry: KeyEntryState;
  readonly heading: "h2" | "h3";
  /** Shown in the saved card, between the check in progress and its result: the key screen's way back. */
  readonly savedExtra?: ReactNode;
}) {
  const t = useTranslations("key");
  const id = useId();
  const fieldRef = useRef<HTMLInputElement>(null);
  const savedRef = useRef<HTMLHeadingElement>(null);
  const { state, moved } = entry;
  const Heading = heading;

  // Focus follows the change the user made, never the first render.
  useEffect(() => {
    if (!moved) return;
    if (state.phase === "saved" && state.check.kind === "idle") savedRef.current?.focus();
    if (state.phase === "empty" && state.notice === "removed") fieldRef.current?.focus();
  }, [state, moved]);

  if (state.phase === "loading") return null;

  return state.phase === "empty" ? (
    <Card>
      <Heading>{t("formTitle")}</Heading>
      <form
        className="app-stack"
        onSubmit={(event) => {
          event.preventDefault();
          void entry.save();
        }}
      >
        <label className="app-field" htmlFor={`${id}-key`}>
          <span>{t("fieldLabel")}</span>
          <input
            id={`${id}-key`}
            ref={fieldRef}
            type="password"
            className="app-input"
            autoComplete="off"
            spellCheck={false}
            aria-describedby={`${id}-hint`}
            value={entry.typed}
            onChange={(event) => entry.setTyped(event.target.value)}
          />
          <span id={`${id}-hint`} className="app-muted">
            {t("fieldHint")}
          </span>
        </label>
        <label className="app-choice">
          <input type="checkbox" checked={entry.tabOnly} onChange={(event) => entry.setTabOnly(event.target.checked)} />
          <span className="app-choice__label">{t("tabOnly")}</span>
          <span className="app-choice__hint">{t("tabOnlyHint")}</span>
        </label>
        <div className="app-actions">
          <Button type="submit" disabled={entry.busy}>
            {t("save")}
          </Button>
        </div>
        {state.notice === null ? null : (
          <Toast tone={state.notice === "removed" ? "info" : "incorrect"}>{t(state.notice)}</Toast>
        )}
      </form>
    </Card>
  ) : (
    <Card>
      <Heading ref={savedRef} tabIndex={-1} className="app-step-heading">
        {t("savedTitle")}
      </Heading>
      <p>{t(state.status.storage === "device" ? "savedDevice" : "savedTab", { lastFour: state.status.lastFour })}</p>
      <div className="app-actions">
        <Button onClick={() => void entry.check()} disabled={state.check.kind === "checking"}>
          {t("check")}
        </Button>
        <Button variant="secondary" onClick={() => void entry.remove()}>
          {t("remove")}
        </Button>
      </div>
      {state.check.kind === "checking" ? <Toast tone="info">{t("checking")}</Toast> : null}
      {savedExtra}
      {state.check.kind === "done" ? (
        <Toast tone={checkTone(state.check.result)}>
          {t(checkMessage(state.check.result), {
            status: state.check.result.kind === "failed" ? String(state.check.result.status) : "",
          })}
        </Toast>
      ) : null}
    </Card>
  );
}
