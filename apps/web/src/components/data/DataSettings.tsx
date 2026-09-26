"use client";

import type { ImportDataResult } from "@palier/app";
import { Button, Callout, Card, Toast } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { Link } from "../../i18n/navigation";
import { useContainer } from "../ContainerProvider";
import { ExportButton } from "./ExportButton";
import { TelemetrySettings } from "./TelemetrySettings";

type ImportState =
  | { readonly status: "idle" }
  | { readonly status: "done"; readonly result: ImportDataResult }
  | { readonly status: "invalid" }
  | { readonly status: "failed" };

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
  const fileRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLHeadingElement>(null);
  const [imported, setImported] = useState<ImportState>({ status: "idle" });
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirming" | "deleted">("idle");
  const ready = container.status === "ready";

  useEffect(() => {
    if (deleteStep === "confirming") confirmRef.current?.focus();
  }, [deleteStep]);

  const onImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (container.status !== "ready" || file === undefined) return;
    try {
      const result = await container.container.useCases.importData({ json: await file.text() });
      setImported({ status: "done", result });
    } catch (error) {
      setImported({ status: error instanceof Error && error.name === "InvalidExportError" ? "invalid" : "failed" });
    }
  };

  const onDelete = async () => {
    if (container.status !== "ready") return;
    await container.container.useCases.wipeData();
    setDeleteStep("deleted");
  };

  return (
    <div className="app-stack">
      <p>{t("intro")}</p>
      <Callout tone="info">{t("noRecovery")}</Callout>

      <Card>
        <h2>{t("exportTitle")}</h2>
        <ExportButton />
      </Card>

      <Card>
        <h2>{t("importTitle")}</h2>
        <form
          className="app-stack"
          onSubmit={(event) => {
            event.preventDefault();
            void onImport();
          }}
        >
          <p>{t("importBody")}</p>
          <label className="app-field" htmlFor={fileId}>
            <span>{t("importLabel")}</span>
            <input id={fileId} ref={fileRef} type="file" accept="application/json,.json" className="app-input" />
          </label>
          <div className="app-actions">
            <Button type="submit" variant="secondary" disabled={!ready}>
              {t("importAction")}
            </Button>
          </div>
          {imported.status === "done" ? (
            <Toast tone="correct">
              {t("imported", {
                // A merged record changed this device's copy, so it counts as imported (D69).
                attempts: imported.result.attempts.added + imported.result.attempts.merged,
                reviews: imported.result.schedule.added + imported.result.schedule.merged,
                sessions: imported.result.sessions.added + imported.result.sessions.merged,
                exams: imported.result.examRuns.added + imported.result.examRuns.merged,
                kept:
                  imported.result.attempts.kept +
                  imported.result.schedule.kept +
                  imported.result.sessions.kept +
                  imported.result.examRuns.kept +
                  imported.result.settings.kept,
              })}
            </Toast>
          ) : null}
          {imported.status === "invalid" ? <Toast tone="incorrect">{t("importInvalid")}</Toast> : null}
          {imported.status === "failed" ? <Toast tone="incorrect">{t("importFailed")}</Toast> : null}
        </form>
      </Card>

      <TelemetrySettings />

      <Card>
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
