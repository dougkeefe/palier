"use client";

import type { TelemetryConsent } from "@palier/app";
import { Button, Card, Toast } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { TelemetryDisclosure } from "../exam/TelemetryDisclosure";
import { useContainer } from "../ContainerProvider";

type Changed = "none" | "on" | "off" | "failed";

/**
 * This device's telemetry choice in the data settings (progress.md D92), with the same
 * wording as the post-exam prompt. Turning it on here shares future mock exams only;
 * turning it off empties anything still waiting to be sent. Device-local: it changes
 * nothing on another device.
 */
export function TelemetrySettings() {
  const t = useTranslations("telemetry");
  const container = useContainer();
  const [consent, setConsent] = useState<TelemetryConsent | null>(null);
  const [changed, setChanged] = useState<Changed>("none");

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    void container.container.useCases.telemetryConsent().then((c) => live && setConsent(c));
    return () => {
      live = false;
    };
  }, [container]);

  const sharing = consent === "on";

  const toggle = () => {
    if (container.status !== "ready") return;
    const next = sharing ? "off" : "on";
    container.container.useCases.setTelemetryConsent({ consent: next }).then(
      () => {
        setConsent(next);
        setChanged(next);
      },
      () => setChanged("failed"),
    );
  };

  return (
    <Card>
      <h2>{t("settingsTitle")}</h2>
      <div className="app-stack">
        <p>{consent === null ? " " : sharing ? t("settingsOn") : t("settingsOff")}</p>
        <TelemetryDisclosure headingLevel="h3" />
        <p className="app-muted">{t("device")}</p>
        <div className="app-actions">
          <Button variant="secondary" onClick={toggle} disabled={consent === null}>
            {sharing ? t("turnOff") : t("turnOn")}
          </Button>
        </div>
        {changed === "on" ? <Toast tone="info">{t("turnedOn")}</Toast> : null}
        {changed === "off" ? <Toast tone="info">{t("turnedOff")}</Toast> : null}
        {changed === "failed" ? <Toast tone="incorrect">{t("failed")}</Toast> : null}
      </div>
    </Card>
  );
}
