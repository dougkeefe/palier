"use client";

import { Button, Toast } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";

import { type EndpointNotice, endpointNoticeIsError, endpointRefused, endpointSaved } from "../../features/key/endpoint-view";
import type { Container } from "../../lib/container";
import { SELFHOST_GUIDE_URL } from "../../lib/report";

/**
 * The own-endpoint form inside the key settings' "one exception" card (ADR 3's self-hosted escape, architecture.md
 * §6.3, progress.md D192): where studio mode gets its pass from now, the field to point it at the user's own
 * deployment, and the way back to Palier's server. The address is checked as it is saved, and kept on this device
 * only. The guide links to the repository's `selfhost/` README.
 */
export function RealtimeEndpointSettings({ useCases }: { readonly useCases: Container["useCases"] }) {
  const t = useTranslations("key");
  const id = useId();
  const [current, setCurrent] = useState<string | null | undefined>(undefined);
  const [typed, setTyped] = useState("");
  const [notice, setNotice] = useState<EndpointNotice | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void useCases.realtimeEndpoint().then(
      (url) => live && setCurrent(url),
      () => live && setCurrent(null),
    );
    return () => {
      live = false;
    };
  }, [useCases]);

  const save = async (url: string) => {
    setBusy(true);
    try {
      const kept = await useCases.setRealtimeEndpoint({ url });
      setCurrent(kept);
      setTyped("");
      setNotice(endpointSaved(kept));
    } catch (error) {
      setNotice(endpointRefused(error));
    } finally {
      setBusy(false);
    }
  };

  const refused = notice !== null && endpointNoticeIsError(notice);

  return (
    <div className="app-stack">
      <h3>{t("realtimeOwnTitle")}</h3>
      <p>{t("realtimeOwnIntro")}</p>
      {current === undefined ? null : (
        <p role="status">{current === null ? t("realtimeOwnNone") : t("realtimeOwnCurrent", { url: current })}</p>
      )}
      <form
        className="app-stack"
        onSubmit={(event) => {
          event.preventDefault();
          void save(typed);
        }}
      >
        <label className="app-field" htmlFor={`${id}-endpoint`}>
          <span>{t("realtimeOwnLabel")}</span>
          <input
            id={`${id}-endpoint`}
            type="url"
            inputMode="url"
            className="app-input"
            autoComplete="off"
            spellCheck={false}
            aria-describedby={`${id}-endpoint-hint`}
            aria-invalid={refused}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
          <span id={`${id}-endpoint-hint`} className="app-muted">
            {t("realtimeOwnHint")}
          </span>
        </label>
        <div className="app-actions">
          <Button type="submit" disabled={busy || typed.trim() === ""}>
            {t("realtimeOwnSave")}
          </Button>
          {current === null || current === undefined ? null : (
            <Button variant="secondary" disabled={busy} onClick={() => void save("")}>
              {t("realtimeOwnClear")}
            </Button>
          )}
        </div>
        {notice === null ? null : <Toast tone={refused ? "incorrect" : "info"}>{t(notice)}</Toast>}
      </form>
      <a href={SELFHOST_GUIDE_URL} className="app-link pl-focusable" rel="noreferrer">
        {t("realtimeOwnGuide")}
      </a>
    </div>
  );
}
