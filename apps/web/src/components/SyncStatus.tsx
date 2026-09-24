"use client";

import { useTranslations } from "next-intl";

import { Link } from "../i18n/navigation";
import { useSync } from "./sync/SyncRunner";

/**
 * A quiet, always-present sync indicator (product-requirements.md §8.11, §14: "a quiet
 * header indicator only. No modal, no error toast"): synced, syncing, offline or off,
 * plus "on" before this device has a copy on the server. Tapping it opens the sync
 * settings (§8.11).
 */
export function SyncStatus() {
  const t = useTranslations("syncStatus");
  const { view } = useSync();

  return (
    <Link href="/settings/sync" className={`app-sync-status app-sync-status--${view.indicator} pl-focusable`}>
      <span className="app-sync-status__dot" aria-hidden="true" />
      {t(view.indicator)}
    </Link>
  );
}
