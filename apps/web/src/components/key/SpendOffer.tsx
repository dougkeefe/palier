"use client";

import type { Preflight } from "@palier/engine";
import { Callout } from "@palier/ui";
import { useLocale, useTranslations } from "next-intl";

import { estimateText } from "../../features/key/spend-view";
import { preflightNotice } from "../../features/writing/workshop-view";

/**
 * What a spending button will cost, shown beside it before it is pressed, so one press is the
 * agreement (progress.md D237, which replaced D108's separate pre-flight step): the estimate, or
 * that there is none; a reminder when this call would bring the month near the cap or past it,
 * never a block; and where the user's words go. The button names this block in its
 * `aria-describedby` by `id`, so a screen reader hears the cost on the button itself. Each screen
 * keeps its own copy under `namespace`.
 */
export function SpendOffer({
  id,
  namespace,
  preflight,
  estimateKey = "preflightEstimate",
  unpricedKey = "preflightUnpriced",
  sendsToKey = "sendsTo",
}: {
  id: string;
  namespace: "writing" | "generate" | "oral" | "oralReport" | "diagnostic" | "translate";
  preflight: Preflight;
  estimateKey?: string;
  unpricedKey?: string;
  /** The line on where the words and the key go; `null` where the screen says it elsewhere. */
  sendsToKey?: string | null;
}) {
  const t = useTranslations(namespace);
  const locale = useLocale();
  const notice = preflightNotice(preflight);
  return (
    <div id={id} className="app-stack">
      <p>
        {preflight.estimateUsd === null
          ? t(unpricedKey)
          : t(estimateKey, { amount: estimateText(preflight.estimateUsd, locale) })}
      </p>
      {notice === null ? null : <Callout tone={notice.tone}>{t(notice.key)}</Callout>}
      {sendsToKey === null ? null : <p className="app-muted">{t(sendsToKey)}</p>}
    </div>
  );
}
