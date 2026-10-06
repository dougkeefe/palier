"use client";

import { useSyncExternalStore } from "react";

import { skillFromQuery } from "../../features/diagnostic/result-view";
import { DiagnosticResult } from "./DiagnosticResult";

const noSubscription = () => () => undefined;

/**
 * `/diagnostic/result?skill=…`'s island (ADR 25): the skill is read from the address in the
 * browser, as the oral report reads its session, so the page is one static route for both skills.
 * The server renders nothing for it, so hydration never disagrees.
 */
export function DiagnosticResultPage() {
  const query = useSyncExternalStore(
    noSubscription,
    () => new URLSearchParams(window.location.search).get("skill") ?? "",
    () => null,
  );
  return query === null ? null : <DiagnosticResult skill={skillFromQuery(query)} />;
}
