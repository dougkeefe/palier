"use client";

import { type DeviceSummary, normalizePairCode } from "@palier/app";
import { Button, Callout, Card, Toast } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { joinFailure, statusLine } from "../../features/sync/sync-view";
import { Link } from "../../i18n/navigation";
import { deviceLabel } from "../../lib/device-label";
import type { Container } from "../../lib/container";
import { useContainer } from "../ContainerProvider";
import { ExportButton } from "../data/ExportButton";
import { useSync } from "./SyncRunner";

type JoinState =
  | { readonly status: "idle" }
  | { readonly status: "invalid" | "joinRejected" | "unavailable" }
  | { readonly status: "restoring" | "joined"; readonly count: number };

type DeleteStep = "idle" | "confirming" | "deleted" | "failed";

/** The switch and the device list, as stored. A device list the server cannot give is empty. */
const readSettings = async (container: Container) => {
  const state = await container.useCases.syncState();
  const devices = state.identity === null ? [] : await container.useCases.listDevices().catch(() => []);
  return { enabled: state.enabled, devices };
};

/**
 * `/settings/sync` (product-requirements.md §8.11), top to bottom:
 * - the switch, which offers to delete the server copy the moment it is turned off;
 * - the status line;
 * - what syncs and what never leaves the device;
 * - the device list, with remove;
 * - adding a device by code, and linking this one with a code, with the "restoring your
 *   progress" count (§14);
 * - the no-recovery sentence with the export beneath it;
 * - the danger zone.
 *
 * No account, email or password anywhere (ADR 5). Confirmations are in place, with focus
 * moved to their question, as on the data pane.
 */
export function SyncSettings() {
  const t = useTranslations("sync");
  const tCommon = useTranslations("common");
  const container = useContainer();
  const sync = useSync();
  const id = useId();
  const offRef = useRef<HTMLHeadingElement>(null);
  const confirmRef = useRef<HTMLHeadingElement>(null);
  const [enabled, setEnabled] = useState(true);
  const [devices, setDevices] = useState<readonly DeviceSummary[]>([]);
  const [offOffer, setOffOffer] = useState<"hidden" | "asking" | "deleted">("hidden");
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [typed, setTyped] = useState("");
  const [join, setJoin] = useState<JoinState>({ status: "idle" });
  const [problem, setProblem] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("idle");
  const ready = container.status === "ready";

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    void readSettings(container.container).then((read) => {
      if (!live) return;
      setEnabled(read.enabled);
      setDevices(read.devices);
    });
    return () => {
      live = false;
    };
  }, [container]);
  useEffect(() => {
    if (offOffer === "asking") offRef.current?.focus();
  }, [offOffer]);
  useEffect(() => {
    if (deleteStep === "confirming") confirmRef.current?.focus();
  }, [deleteStep]);

  if (container.status !== "ready") return <p className="app-muted">{tCommon("loading")}</p>;
  const { useCases } = container.container;
  const label = () => deviceLabel(navigator.userAgent);

  /** After an action: re-read this page's state and the runner's. */
  const reload = async () => {
    const read = await readSettings(container.container);
    setEnabled(read.enabled);
    setDevices(read.devices);
    await sync.refresh();
  };

  /** Run an action against the server; an unreachable one shows one quiet notice. */
  const attempt = async (action: () => Promise<unknown>) => {
    setProblem(false);
    try {
      await action();
    } catch {
      setProblem(true);
    }
    await reload();
  };

  const onSwitch = async (on: boolean) => {
    await useCases.setSyncEnabled({ enabled: on });
    setEnabled(on);
    setOffOffer(!on && sync.view.paired ? "asking" : "hidden");
    await reload();
    if (on) sync.notify("demand");
  };

  const onJoin = async () => {
    const normal = normalizePairCode(typed);
    if (normal === null) {
      setJoin({ status: "invalid" });
      return;
    }
    setJoin({ status: "restoring", count: 0 });
    try {
      const outcome = await useCases.pairDevice({
        code: normal,
        label: label(),
        onPulled: (count) => setJoin({ status: "restoring", count }),
      });
      sync.settle(outcome);
      setJoin(outcome.status === "synced" ? { status: "joined", count: outcome.pulled } : { status: "unavailable" });
      setTyped("");
      await reload();
    } catch (error) {
      setJoin({ status: joinFailure(error) });
    }
  };

  const onDeleteEverywhere = async () => {
    try {
      await useCases.deleteEverywhere();
      setDeleteStep("deleted");
      await reload();
    } catch {
      setDeleteStep("failed");
    }
  };

  const line = statusLine(sync.view);

  return (
    <div className="app-stack">
      <p>{t("intro")}</p>

      <Card>
        <label className="app-switch" htmlFor={`${id}-switch`}>
          <input
            id={`${id}-switch`}
            type="checkbox"
            role="switch"
            className="app-switch__input"
            checked={enabled}
            disabled={!ready}
            onChange={(event) => void onSwitch(event.target.checked)}
          />
          <span className="app-switch__label">{t("switchLabel")}</span>
        </label>
        <p className="app-muted">{enabled ? t("switchOnHint") : t("switchOffHint")}</p>
        {offOffer === "asking" ? (
          <section className="app-stack app-confirm" aria-labelledby={`${id}-off`}>
            <h3 id={`${id}-off`} ref={offRef} tabIndex={-1} className="app-step-heading">
              {t("offTitle")}
            </h3>
            <p>{t("offBody")}</p>
            <div className="app-actions">
              <Button
                variant="danger"
                onClick={() =>
                  void attempt(async () => {
                    await useCases.setSyncEnabled({ enabled: false, deleteFromServer: true });
                    setOffOffer("deleted");
                  })
                }
              >
                {t("offDelete")}
              </Button>
              <Button variant="secondary" onClick={() => setOffOffer("hidden")}>
                {t("offKeep")}
              </Button>
            </div>
          </section>
        ) : null}
        {offOffer === "deleted" ? <Toast tone="info">{t("offDeleted")}</Toast> : null}
      </Card>

      <Card>
        <h2>{t("statusTitle")}</h2>
        <p role="status">
          {line === "statusSynced" && sync.view.lastSyncedAt !== null
            ? t("statusSynced", { when: new Date(sync.view.lastSyncedAt) })
            : t(line)}
        </p>
        <div className="app-actions">
          <Button variant="secondary" disabled={!enabled} onClick={() => sync.notify("demand")}>
            {t("syncNow")}
          </Button>
        </div>
        {problem ? <Toast tone="incorrect">{t("unavailable")}</Toast> : null}
      </Card>

      <Card>
        <h2>{t("whatTitle")}</h2>
        <div className="app-columns">
          <div>
            <h3 className="app-step-heading">{t("syncsHeading")}</h3>
            <ul className="app-list">
              <li>{t("syncsAnswers")}</li>
              <li>{t("syncsReviews")}</li>
              <li>{t("syncsSessions")}</li>
              <li>{t("syncsSettings")}</li>
            </ul>
          </div>
          <div>
            <h3 className="app-step-heading">{t("neverHeading")}</h3>
            <ul className="app-list">
              <li>{t("neverKey")}</li>
              <li>{t("neverAudio")}</li>
              <li>{t("neverTranscripts")}</li>
              <li>{t("neverSubmissions")}</li>
              <li>{t("neverCosts")}</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card>
        <h2>{t("devicesTitle")}</h2>
        {devices.length === 0 ? (
          <p className="app-muted">{t("devicesNone")}</p>
        ) : (
          <ul className="app-device-list">
            {devices.map((device) => (
              <li key={device.id} className="app-device">
                <div>
                  <p className="app-device__label">
                    {device.label}
                    {device.current ? <span className="app-tag">{t("thisDevice")}</span> : null}
                  </p>
                  <p className="app-muted">{t("lastSeen", { when: new Date(device.lastSeenAt) })}</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => void attempt(() => useCases.removeDevice({ id: device.id }))}
                >
                  {device.current ? t("removeThis") : t("remove", { label: device.label })}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2>{t("addTitle")}</h2>
        <p>{t("addBody")}</p>
        <div className="app-actions">
          <Button
            variant="primary"
            disabled={!enabled}
            onClick={() =>
              void attempt(async () => {
                setCode(await useCases.requestPairCode({ label: label() }));
              })
            }
          >
            {t("addAction")}
          </Button>
        </div>
        {code !== null ? (
          <div className="app-stack">
            <p className="app-muted">{t("codeLabel")}</p>
            <p className="app-code" aria-live="polite">
              {code.code}
            </p>
            <p className="app-muted">{t("codeExpires", { time: new Date(code.expiresAt) })}</p>
          </div>
        ) : null}
      </Card>

      <Card>
        <h2>{t("joinTitle")}</h2>
        <form
          className="app-stack"
          onSubmit={(event) => {
            event.preventDefault();
            void onJoin();
          }}
        >
          <p>{t("joinBody")}</p>
          <label className="app-field" htmlFor={`${id}-code`}>
            <span>{t("joinLabel")}</span>
            <input
              id={`${id}-code`}
              className="app-input app-input--code"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
          </label>
          <div className="app-actions">
            <Button type="submit" variant="primary" disabled={join.status === "restoring"}>
              {t("joinAction")}
            </Button>
          </div>
          {join.status === "invalid" ? <Toast tone="incorrect">{t("joinInvalid")}</Toast> : null}
          {join.status === "joinRejected" ? <Toast tone="incorrect">{t("joinRejected")}</Toast> : null}
          {join.status === "unavailable" ? <Toast tone="incorrect">{t("unavailable")}</Toast> : null}
          {join.status === "restoring" ? <Toast tone="info">{t("restoring", { count: join.count })}</Toast> : null}
          {join.status === "joined" ? <Toast tone="correct">{t("joined", { count: join.count })}</Toast> : null}
        </form>
      </Card>

      <Card>
        <Callout tone="info">{t("noRecovery")}</Callout>
        <ExportButton variant="secondary" />
      </Card>

      <Card>
        <h2>{t("dangerTitle")}</h2>
        {deleteStep === "deleted" ? (
          <div className="app-stack">
            <Toast tone="info">{t("deleted")}</Toast>
            <Link href="/start" className="pl-btn pl-btn--primary pl-focusable">
              {t("startAgain")}
            </Link>
          </div>
        ) : deleteStep === "confirming" ? (
          <section className="app-stack app-confirm" aria-labelledby={`${id}-confirm`}>
            <h3 id={`${id}-confirm`} ref={confirmRef} tabIndex={-1} className="app-step-heading">
              {t("confirmTitle")}
            </h3>
            <p>{t("confirmBody")}</p>
            <div className="app-actions">
              <Button variant="danger" onClick={() => void onDeleteEverywhere()}>
                {t("confirmAction")}
              </Button>
              <Button variant="secondary" onClick={() => setDeleteStep("idle")}>
                {t("cancel")}
              </Button>
            </div>
          </section>
        ) : (
          <div className="app-stack">
            <p>{t("deleteBody")}</p>
            {deleteStep === "failed" ? <Toast tone="incorrect">{t("deleteFailed")}</Toast> : null}
            <div className="app-actions">
              <Button variant="danger" onClick={() => setDeleteStep("confirming")}>
                {t("deleteAction")}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
