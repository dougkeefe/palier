"use client";

import type { Item } from "@palier/domain";
import { Callout, EmptyState, Mascot } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link } from "../../i18n/navigation";
import { REVIEW_SET_LIMIT, minutesFor, readStudyProfile } from "../../lib/study";
import { useContainer } from "../ContainerProvider";
import { PracticeSession } from "../practice/PracticeSession";

/**
 * The review queue (product-requirements.md §8.8): the due stack with its count and an
 * estimated time, drilled straight through, and a genuine reward state when nothing is
 * due (§14: "Coco asleep. 'Nothing due. Come back tomorrow, or do a set anyway.'").
 *
 * With no study profile it loads nothing and stays on its loading line: `OnboardingGate` is sending the visitor to
 * onboarding, and the queue's read of the bank, half a megabyte, would only hold that page back (D270), as Today's
 * own check spares it the plan.
 */
export function ReviewScreen() {
  const t = useTranslations("review");
  const tCommon = useTranslations("common");
  const container = useContainer();
  const [due, setDue] = useState<readonly Item[] | "failed" | null>(null);

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    const { settings, useCases } = container.container;
    readStudyProfile(settings)
      .then(async (profile) => {
        if (profile === null) return;
        const { items } = await useCases.reviewQueue({ limit: REVIEW_SET_LIMIT });
        if (live) setDue(items);
      })
      .catch(() => live && setDue("failed"));
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
