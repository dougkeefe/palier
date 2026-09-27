"use client";

import type { Item } from "@palier/domain";
import { Button } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { contributeIssueUrl } from "../../lib/report";

/**
 * A generated item's provenance badge, "visible on request" (product-requirements.md §13.0,
 * architecture.md §8.3): generated just now, reviewed by one automated check, not calibrated.
 * Beside it, the one-tap contribution, a prefilled GitHub issue carrying the item
 * (progress.md D111). A disclosure, not a dialog, like `ReportItem`, which it replaces on a
 * generated item: there is no bank item to report.
 */
export function GeneratedProvenance({ item }: { item: Item }) {
  const t = useTranslations("generate");
  const panelId = useId();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-report">
      <Button variant="ghost" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
        {t("provenanceOpen")}
      </Button>
      {open ? (
        <div id={panelId} className="app-stack">
          <p className="app-muted">{t("provenanceBody")}</p>
          <a
            className="pl-btn pl-btn--secondary pl-focusable"
            href={contributeIssueUrl(item)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("contribute")}
          </a>
          <p className="app-muted">{t("contributeNote")}</p>
        </div>
      ) : null}
    </div>
  );
}
