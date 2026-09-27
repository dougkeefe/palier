"use client";

import { Card } from "@palier/ui";
import { useLocale, useTranslations } from "next-intl";
import type { Ref } from "react";

import { estimateText } from "../../features/key/spend-view";
import { Link } from "../../i18n/navigation";

/**
 * PRD §14's inline card for a key-gated feature: what it does, what it would cost, what still
 * works without a key, and a link to add one. Never a modal and never a blocked page
 * (progress.md D108). The writing workshop and the fresh-set screen share it (D111), each with
 * its own copy under `namespace` and its own `featureCosts` estimate.
 */
export function NoKeyCard({
  namespace,
  estimateUsd,
  headingRef,
}: {
  namespace: "writing" | "generate";
  estimateUsd: number | null;
  /** Given when the card can replace a control that held focus, so focus can land on its heading. */
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  const t = useTranslations(namespace);
  const locale = useLocale();
  return (
    <Card>
      <h2 ref={headingRef} tabIndex={headingRef === undefined ? undefined : -1}>
        {t("noKeyTitle")}
      </h2>
      <div className="app-stack">
        <p>{t("noKeyWhat")}</p>
        <p>
          {estimateUsd === null
            ? t("noKeyCostUnpriced")
            : t("noKeyCost", { amount: estimateText(estimateUsd, locale) })}
        </p>
        <p className="app-muted">{t("noKeyStill")}</p>
        <div className="app-actions">
          <Link href="/settings/key" className="pl-btn pl-btn--secondary pl-focusable">
            {t("noKeyAdd")}
          </Link>
        </div>
      </div>
    </Card>
  );
}
