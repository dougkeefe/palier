"use client";

import type { Item } from "@palier/domain";
import { Callout, EmptyState, Mascot } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link } from "../../i18n/navigation";
import { REVIEW_SET_LIMIT, minutesFor } from "../../lib/study";
import { useContainer } from "../ContainerProvider";
import { PracticeSession } from "../practice/PracticeSession";

/**
 * The review queue (product-requirements.md §8.8): the due stack with its count and an
 * estimated time, drilled straight through, and a genuine reward state when nothing is
 * due (§14: "Coco asleep. 'Nothing due. Come back tomorrow, or do a set anyway.'").
 */
export function ReviewScreen() {
  const t = useTranslations("review");
  const tCommon = useTranslations("common");
  const container = useContainer();
  const [due, setDue] = useState<readonly Item[] | "failed" | null>(null);

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    container.container.useCases.reviewQueue({ limit: REVIEW_SET_LIMIT }).then(
      ({ items }) => live && setDue(items),
      () => live && setDue("failed"),
    );
    return () => {
      live = false;
    };
  }, [container]);

  if (container.status === "failed" || due === "failed") {
    return <Callout tone="incorrect">{tCommon("loadFailed")}</Callout>;
  }
  if (due === null) return <p role="status">{tCommon("loading")}</p>;
  if (due.length === 0) {
    return (
      <EmptyState
        illustration={<Mascot />}
        heading={t("emptyTitle")}
        action={
          <Link href="/home" className="pl-btn pl-btn--primary pl-focusable">
            {t("emptyAction")}
          </Link>
        }
      >
        {t("emptyBody")}
      </EmptyState>
    );
  }
  return (
    <div className="app-stack">
      <p className="app-muted">{t("summary", { count: due.length, minutes: minutesFor(due.length) })}</p>
      <PracticeSession mode="review" />
    </div>
  );
}
