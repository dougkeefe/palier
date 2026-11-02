"use client";

import { Button, Callout, Card, Toast } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { sectionId } from "../../features/settings/settings-sections";
import { Link } from "../../i18n/navigation";
import { useContainer } from "../ContainerProvider";
import { SettingsSections } from "../settings/SettingsSections";
import { ExportButton } from "./ExportButton";
import { ImportForm } from "./ImportForm";
import { OralStorageSettings } from "./OralStorageSettings";
import { TelemetrySettings } from "./TelemetrySettings";

/**
 * The data pane (product-requirements.md §8.11's danger zone, [R11]): export, import and
 * delete, each one action, with the plain sentence that there is no other copy. Delete
 * asks once, in place, with focus moved to the question, so it cannot be done by one
 * stray tap and nothing is hidden behind a modal.
 */
export function DataSettings() {
  const t = useTranslations("data");
  const container = useContainer();
  const fileId = useId();
  const confirmRef = useRef<HTMLHeadingElement>(null);
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirming" | "deleted">("idle");
  const ready = container.status === "ready";

  useEffect(() => {
    if (deleteStep === "confirming") confirmRef.current?.focus();
  }, [deleteStep]);

  const onDelete = async () => {
    if (container.status !== "ready") return;
    await container.container.useCases.wipeData();
    setDeleteStep("deleted");
  };

  return (
    <div className="app-stack">
      <SettingsSections screen="data" />
      <p>{t("intro")}</p>
      <Callout tone="info">{t("noRecovery")}</Callout>

      <Card id={sectionId("data", "export")}>
        <h2>{t("exportTitle")}</h2>
        <ExportButton />
      </Card>

      <Card id={sectionId("data", "import")}>
        <h2>{t("importTitle")}</h2>
        <ImportForm />
      </Card>

      <TelemetrySettings />

      <OralStorageSettings refresh={deleteStep === "deleted" ? 1 : 0} />

      <Card id={sectionId("data", "delete")}>
        <h2>{t("deleteTitle")}</h2>
        {deleteStep === "deleted" ? (
          <div className="app-stack">
            <Toast tone="info">{t("deleted")}</Toast>
            <Link href="/start" className="pl-btn pl-btn--primary pl-focusable">
              {t("startAgain")}
            </Link>
          </div>
        ) : deleteStep === "confirming" ? (
          <section className="app-stack app-confirm" aria-labelledby={`${fileId}-confirm`}>
            <h3 id={`${fileId}-confirm`} ref={confirmRef} tabIndex={-1} className="app-step-heading">
              {t("confirmTitle")}
            </h3>
            <p>{t("confirmBody")}</p>
            <div className="app-actions">
              <Button variant="danger" onClick={() => void onDelete()}>
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
            <div className="app-actions">
              <Button variant="danger" onClick={() => setDeleteStep("confirming")} disabled={!ready}>
                {t("deleteAction")}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
