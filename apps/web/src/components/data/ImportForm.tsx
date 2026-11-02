"use client";

import type { ImportDataResult } from "@palier/app";
import { Button, Toast } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";

import { useContainer } from "../ContainerProvider";

type ImportState =
  | { readonly status: "idle" }
  | { readonly status: "done"; readonly result: ImportDataResult }
  | { readonly status: "invalid" }
  | { readonly status: "failed" };

/**
 * Importing a Palier export ([R11]): one file, one action, and a sentence on what came in. Shared by `/settings/data`
 * and onboarding's welcome (D270, D271). `onImported` runs once the file is in, so the caller can re-read what came
 * over; a failure of the caller's own never turns the import into a failure.
 */
export function ImportForm({ onImported }: { onImported?: () => Promise<void> | void }) {
  const t = useTranslations("data");
  const container = useContainer();
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imported, setImported] = useState<ImportState>({ status: "idle" });

  const onImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (container.status !== "ready" || file === undefined) return;
    try {
      const result = await container.container.useCases.importData({ json: await file.text() });
      setImported({ status: "done", result });
    } catch (error) {
      setImported({ status: error instanceof Error && error.name === "InvalidExportError" ? "invalid" : "failed" });
      return;
    }
    await Promise.resolve(onImported?.()).catch(() => undefined);
  };

  return (
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
        <Button type="submit" variant="secondary" disabled={container.status !== "ready"}>
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
  );
}
