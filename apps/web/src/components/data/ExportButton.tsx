"use client";

import { Button, Toast } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { exportFileName } from "../../lib/report";
import { useContainer } from "../ContainerProvider";

/**
 * Export everything in one action [R11]: `exportData` → a downloaded JSON file. The
 * document never leaves the browser except as the file the user saves.
 */
export function ExportButton({ variant = "primary" }: { variant?: "primary" | "secondary" }) {
  const t = useTranslations("data");
  const tCommon = useTranslations("common");
  const container = useContainer();
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  const onExport = async () => {
    if (container.status !== "ready") return;
    try {
      const doc = await container.container.useCases.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFileName(doc.exportedAt);
      link.click();
      URL.revokeObjectURL(url);
      setState("done");
    } catch {
      setState("failed");
    }
  };

  return (
    <div className="app-stack">
      <div className="app-actions">
        <Button variant={variant} onClick={() => void onExport()} disabled={container.status !== "ready"}>
          {t("exportAction")}
        </Button>
      </div>
      {state === "done" ? <Toast tone="correct">{t("exported")}</Toast> : null}
      {state === "failed" ? <Toast tone="incorrect">{tCommon("loadFailed")}</Toast> : null}
    </div>
  );
}
