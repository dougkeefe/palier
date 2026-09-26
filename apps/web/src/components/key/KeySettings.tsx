"use client";

import { Button, Card, Toast } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useEffect, useId, useReducer, useRef, useState } from "react";

import {
  INITIAL_KEY_SCREEN,
  checkFailure,
  checkMessage,
  checkTone,
  keyScreen,
  saveFailure,
} from "../../features/key/key-view";
import { Link } from "../../i18n/navigation";
import { useContainer } from "../ContainerProvider";
import { SpendSettings } from "./SpendSettings";

/**
 * `/settings/key`'s key half (product-requirements.md §8.10; progress.md D100), top to bottom:
 * - with no key, the masked field, "for this tab only", and save;
 * - with a key, where it is held and how it ends, check and remove, and the check's result
 *   in plain words (§14), never the raw error;
 * - the plain statement of where the key is kept and what it is used for, with the guide;
 * - then the spend half, `SpendSettings` (Phase 4 Slice 2, D101–D104).
 *
 * The field is cleared as soon as the key is saved, and the key is never shown again, only
 * its last four characters (architecture.md §6.2). Focus moves to what replaced the form,
 * and back to the field when the key is removed (§11).
 */
export function KeySettings() {
  const t = useTranslations("key");
  const tCommon = useTranslations("common");
  const container = useContainer();
  const id = useId();
  const fieldRef = useRef<HTMLInputElement>(null);
  const savedRef = useRef<HTMLHeadingElement>(null);
  const [state, dispatch] = useReducer(keyScreen, INITIAL_KEY_SCREEN);
  const [typed, setTyped] = useState("");
  const [tabOnly, setTabOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const moved = useRef(false);

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    void container.container.useCases.apiKeyStatus().then(
      (status) => live && dispatch({ type: "loaded", status }),
      () => live && dispatch({ type: "loaded", status: null }),
    );
    return () => {
      live = false;
    };
  }, [container]);

  // Focus follows the change the user made, never the first render.
  useEffect(() => {
    if (!moved.current) return;
    if (state.phase === "saved" && state.check.kind === "idle") savedRef.current?.focus();
    if (state.phase === "empty" && state.notice === "removed") fieldRef.current?.focus();
  }, [state]);

  if (container.status === "failed") return <p role="status">{tCommon("loadFailed")}</p>;
  if (container.status !== "ready" || state.phase === "loading") return <p role="status">{tCommon("loading")}</p>;
  const { useCases } = container.container;

  const onSave = async () => {
    setBusy(true);
    moved.current = true;
    try {
      await useCases.saveApiKey({ key: typed, remember: !tabOnly });
      const status = await useCases.apiKeyStatus();
      setTyped("");
      if (status === null) dispatch({ type: "saveRefused", notice: "saveFailed" });
      else dispatch({ type: "saved", status });
    } catch (error) {
      dispatch({ type: "saveRefused", notice: saveFailure(error) });
    } finally {
      setBusy(false);
    }
  };

  const onCheck = async () => {
    dispatch({ type: "checking" });
    try {
      await useCases.checkApiKey();
      dispatch({ type: "checked", result: { kind: "valid" } });
    } catch (error) {
      dispatch({ type: "checked", result: checkFailure(error) });
    }
  };

  const onRemove = async () => {
    moved.current = true;
    await useCases.removeApiKey();
    setTabOnly(false);
    dispatch({ type: "removed" });
  };

  return (
    <div className="app-stack">
      <p>{t("intro")}</p>

      {state.phase === "empty" ? (
        <Card>
          <h2>{t("formTitle")}</h2>
          <form
            className="app-stack"
            onSubmit={(event) => {
              event.preventDefault();
              void onSave();
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
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
              />
              <span id={`${id}-hint`} className="app-muted">
                {t("fieldHint")}
              </span>
            </label>
            <label className="app-choice">
              <input type="checkbox" checked={tabOnly} onChange={(event) => setTabOnly(event.target.checked)} />
              <span className="app-choice__label">{t("tabOnly")}</span>
              <span className="app-choice__hint">{t("tabOnlyHint")}</span>
            </label>
            <div className="app-actions">
              <Button type="submit" disabled={busy}>
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
          <h2 ref={savedRef} tabIndex={-1} className="app-step-heading">
            {t("savedTitle")}
          </h2>
          <p>{t(state.status.storage === "device" ? "savedDevice" : "savedTab", { lastFour: state.status.lastFour })}</p>
          <div className="app-actions">
            <Button onClick={() => void onCheck()} disabled={state.check.kind === "checking"}>
              {t("check")}
            </Button>
            <Button variant="secondary" onClick={() => void onRemove()}>
              {t("remove")}
            </Button>
          </div>
          {state.check.kind === "checking" ? <Toast tone="info">{t("checking")}</Toast> : null}
          {state.check.kind === "done" ? (
            <Toast tone={checkTone(state.check.result)}>
              {t(checkMessage(state.check.result), {
                status: state.check.result.kind === "failed" ? String(state.check.result.status) : "",
              })}
            </Toast>
          ) : null}
        </Card>
      )}

      <Card>
        <h2>{t("whereTitle")}</h2>
        <p>{t("whereStored")}</p>
        <p>{t("whereNever")}</p>
        <p className="app-muted">{t("whereLimit")}</p>
        <Link href="/settings/key/guide" className="app-link pl-focusable">
          {t("guideLink")}
        </Link>
      </Card>

      <SpendSettings />
    </div>
  );
}
