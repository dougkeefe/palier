"use client";

import type { AiFeature } from "@palier/domain";
import type { Preflight } from "@palier/engine";
import { useEffect, useState } from "react";

import { fallbackPreflight } from "../../features/key/spend-view";
import type { Container } from "../../lib/container";

/**
 * The estimate beside a spending button (progress.md D237), for `SpendOffer`: worked out while
 * `enabled`, again whenever `reloadOn` changes (each screen passes what moves once a request
 * settles, since a call moves this month's spend against the cap), and again when the page is
 * shown after being hidden, since another tab may have spent or moved the cap meanwhile. A read
 * that fails falls back to the cost table's estimate with no cap reminder, so the button is never
 * left disabled.
 */
export function usePreflight(
  useCases: Pick<Container["useCases"], "preflightSpend" | "featureCosts"> | null,
  feature: AiFeature,
  { enabled, reloadOn }: { enabled: boolean; reloadOn?: unknown },
): Preflight | null {
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState === "visible") setShown((count) => count + 1);
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, []);

  useEffect(() => {
    if (useCases === null || !enabled) return;
    let live = true;
    useCases.preflightSpend({ feature }).then(
      (loaded) => {
        if (live) setPreflight(loaded);
      },
      () => {
        if (live) setPreflight(fallbackPreflight(useCases.featureCosts(), feature));
      },
    );
    return () => {
      live = false;
    };
  }, [useCases, feature, enabled, reloadOn, shown]);

  return preflight;
}
