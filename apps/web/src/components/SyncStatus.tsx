import { useTranslations } from "next-intl";

/**
 * A quiet, always-present sync indicator (product-requirements.md §8.11, §14:
 * "a quiet header indicator only. No modal, no error toast").
 *
 * Phase 0 placeholder: sync is not built until Phase 2, so this reports the
 * "off" state statically. When the sync adapter lands it becomes stateful
 * (synced / syncing / offline / off) and a tap navigates to /settings/sync.
 */
export function SyncStatus() {
  const t = useTranslations("syncStatus");

  return (
    <span className="app-sync-status">
      <span className="app-sync-status__dot" aria-hidden="true" />
      {t("off")}
    </span>
  );
}
