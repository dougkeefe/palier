"use client";

import { normalizePairCode } from "@palier/app";
import { Button, Toast } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { joinFailure } from "../../features/sync/sync-view";
import { deviceLabel } from "../../lib/device-label";
import { useContainer } from "../ContainerProvider";
import { useSync } from "./SyncRunner";

type JoinState =
  | { readonly status: "idle" }
  | { readonly status: "invalid" | "joinRejected" | "unavailable" }
  | { readonly status: "restoring" | "joined"; readonly count: number };

/**
 * Linking this device with a code from another (ADR 5), with the "restoring your progress" count (§14). Shared by
 * `/settings/sync` and onboarding's welcome (D270, D271), which is where a new device meets it first. `onJoined` runs
 * once the link is made and the first exchange has settled, with whether that exchange synced, so the caller can
 * re-read what came over. A failure of the caller's own never turns the link's outcome into a failure.
 */
export function JoinForm({ onJoined }: { onJoined?: (synced: boolean) => Promise<void> | void }) {
  const t = useTranslations("sync");
  const container = useContainer();
  const sync = useSync();
  const id = useId();
  const [typed, setTyped] = useState("");
  const [join, setJoin] = useState<JoinState>({ status: "idle" });

  const onJoin = async () => {
    if (container.status !== "ready") return;
    const normal = normalizePairCode(typed);
    if (normal === null) {
      setJoin({ status: "invalid" });
      return;
    }
    setJoin({ status: "restoring", count: 0 });
    let synced: boolean;
    try {
      const outcome = await container.container.useCases.pairDevice({
        code: normal,
        label: deviceLabel(navigator.userAgent),
        onPulled: (count) => setJoin({ status: "restoring", count }),
      });
      sync.settle(outcome);
      synced = outcome.status === "synced";
      setJoin(outcome.status === "synced" ? { status: "joined", count: outcome.pulled } : { status: "unavailable" });
      setTyped("");
    } catch (error) {
      setJoin({ status: joinFailure(error) });
      return;
    }
    await Promise.resolve(onJoined?.(synced)).catch(() => undefined);
  };

  return (
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
        <Button type="submit" variant="primary" disabled={join.status === "restoring" || container.status !== "ready"}>
          {t("joinAction")}
        </Button>
      </div>
      {join.status === "invalid" ? <Toast tone="incorrect">{t("joinInvalid")}</Toast> : null}
      {join.status === "joinRejected" ? <Toast tone="incorrect">{t("joinRejected")}</Toast> : null}
      {join.status === "unavailable" ? <Toast tone="incorrect">{t("unavailable")}</Toast> : null}
      {join.status === "restoring" ? <Toast tone="info">{t("restoring", { count: join.count })}</Toast> : null}
      {join.status === "joined" ? <Toast tone="correct">{t("joined", { count: join.count })}</Toast> : null}
    </form>
  );
}
