"use client";

import type { Item } from "@palier/domain";
import { Button } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";

import type { Container } from "../../lib/container";
import { REPORT_REASONS, type ReportReason, reportIssueUrl } from "../../lib/report";

/**
 * The one-tap report control on every feedback panel (product-requirements.md §13.0),
 * with the item's provenance "visible on request". A disclosure, not a dialog: the
 * reasons open in place, and choosing one enables a link to a prefilled GitHub issue.
 * Nothing leaves the device until the user submits that issue themselves.
 */
export function ReportItem({ item, container }: { item: Item; container: Container }) {
  const t = useTranslations("report");
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("key-wrong");
  const [bankVersion, setBankVersion] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    container.items.bankVersion().then(
      (v) => live && setBankVersion(v),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [open, container]);

  return (
    <div className="app-report">
      <Button variant="ghost" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
        {t("open")}
      </Button>
      {open ? (
        <div id={panelId} className="app-stack">
          <p className="app-muted">{t(`provenance_${item.provenance.origin}`)}</p>
          <fieldset className="app-fieldset">
            <legend>{t("legend")}</legend>
            {REPORT_REASONS.map((r) => (
              <label key={r} className="app-choice">
                <input type="radio" name={`${panelId}-reason`} value={r} checked={reason === r} onChange={() => setReason(r)} />
                <span className="app-choice__label">{t(`reason_${r}`)}</span>
              </label>
            ))}
          </fieldset>
          <a
            className="pl-btn pl-btn--secondary pl-focusable"
            href={reportIssueUrl({ itemId: item.id, reason, reasonLabel: t(`reason_${reason}`), bankVersion })}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("fileIssue")}
          </a>
        </div>
      ) : null}
    </div>
  );
}
