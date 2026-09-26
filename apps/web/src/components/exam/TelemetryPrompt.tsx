"use client";

import type { SessionId } from "@palier/domain";
import { Button, Callout, Card } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { type PromptStep, stepAfter } from "../../features/telemetry/telemetry";
import type { Container } from "../../lib/container";
import { useSync } from "../sync/SyncRunner";
import { TelemetryDisclosure } from "./TelemetryDisclosure";

/**
 * The post-exam telemetry prompt (product-requirements.md §15: "the case for it is made
 * honestly on the results screen after the first mock exam"; progress.md D92). The
 * results screen shows it once, while this device has not been asked.
 *
 * - It says exactly what is sent and what is not, and that the choice is this device's.
 * - "Share" also shares the exam on screen, the one whose case it makes, then flushes at
 *   once. Offline, the batch waits in the queue for the next trigger that finds the
 *   network. "No thanks" is the dismissal too: both leave sharing off for good.
 * - Once answered, the buttons give way to a status line, which takes focus so it is
 *   read out rather than silently lost (§11).
 * - Nothing about it depends on which items were pilots (D84 ruling 9).
 */
export function TelemetryPrompt({ container, runId }: { container: Container; runId: SessionId }) {
  const t = useTranslations("telemetry");
  const { flushTelemetry } = useSync();
  const headingId = useId();
  const statusRef = useRef<HTMLParagraphElement>(null);
  const [step, setStep] = useState<PromptStep>("asking");
  const answered = step === "shared" || step === "declined";

  useEffect(() => {
    if (answered) statusRef.current?.focus();
  }, [answered]);

  const choose = (consent: "on" | "off") => {
    setStep("saving");
    container.useCases.setTelemetryConsent(consent === "on" ? { consent, runId } : { consent }).then(
      () => {
        setStep(stepAfter(consent));
        if (consent === "on") flushTelemetry();
      },
      () => setStep("failed"),
    );
  };

  return (
    <section aria-labelledby={headingId}>
      <Card className="app-stack">
        <h2 id={headingId}>{t("promptTitle")}</h2>
        <p>{t("promptWhy")}</p>
        <p>{t("promptAsk")}</p>
        <TelemetryDisclosure headingLevel="h3" />
        <p className="app-muted">{t("device")}</p>
        {answered ? (
          <p ref={statusRef} role="status" tabIndex={-1}>
            {t(step)}
          </p>
        ) : (
          <>
            {step === "failed" ? <Callout tone="incorrect">{t("failed")}</Callout> : null}
            <div className="app-actions">
              <Button variant="primary" onClick={() => choose("on")} disabled={step === "saving"}>
                {step === "saving" ? t("saving") : t("share")}
              </Button>
              <Button variant="secondary" onClick={() => choose("off")} disabled={step === "saving"}>
                {t("decline")}
              </Button>
            </div>
          </>
        )}
      </Card>
    </section>
  );
}
