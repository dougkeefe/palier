"use client";

import { Card } from "@palier/ui";
import { useLocale, useTranslations } from "next-intl";

import { estimateText } from "../../features/key/spend-view";
import { Link } from "../../i18n/navigation";

/**
 * PRD §14's inline card for a key-gated feature: what it does, what it would cost and a link
 * to add a key. Never a modal and never a blocked page, so the editor above it still works
 * (progress.md D108). The cost is `featureCosts`' estimate for writing feedback.
 */
export function NoKeyCard({ estimateUsd }: { estimateUsd: number | null }) {
  const t = useTranslations("writing");
  const locale = useLocale();
  return (
    <Card>
      <h2>{t("noKeyTitle")}</h2>
      <div className="app-stack">
        <p>{t("noKeyWhat")}</p>
        <p>
          {estimateUsd === null
            ? t("noKeyCostUnpriced")
            : t("noKeyCost", { amount: estimateText(estimateUsd, locale) })}
        </p>
        <p className="app-muted">{t("noKeyStillWrite")}</p>
        <div className="app-actions">
          <Link href="/settings/key" className="pl-btn pl-btn--secondary pl-focusable">
            {t("noKeyAdd")}
          </Link>
        </div>
      </div>
    </Card>
  );
}
