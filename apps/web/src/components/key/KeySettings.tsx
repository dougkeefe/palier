"use client";

import { Card } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { returnAfterKey } from "../../features/key/key-view";
import { Link } from "../../i18n/navigation";
import { REALTIME_ROUTE_SOURCE_URL } from "../../lib/report";
import { useContainer } from "../ContainerProvider";
import { KeyEntry, useKeyEntry } from "./KeyEntry";
import { RealtimeEndpointSettings } from "./RealtimeEndpointSettings";
import { SpendSettings } from "./SpendSettings";

/**
 * `/settings/key`'s key half (product-requirements.md §8.10; progress.md D100), top to bottom:
 * - the key's own form, `KeyEntry`, shared with onboarding's key step (D220): save, check, remove, and
 *   each check's result in plain words (§14);
 * - the plain statement of where the key is kept and what it is used for, with the guide;
 * - the one exception, studio mode's route, said plainly with a link to its source (architecture.md §6.3, D186), and
 *   the way around it, the user's own endpoint (`RealtimeEndpointSettings`, D192);
 * - then the spend half, `SpendSettings` (Phase 4 Slice 2, D101–D104).
 *
 * Reached from the diagnostic's gate (`?next=diagnostic`, ADR 25), a held key offers the way back.
 */
const noSubscription = () => () => undefined;

export function KeySettings() {
  const t = useTranslations("key");
  const tCommon = useTranslations("common");
  const container = useContainer();
  const entry = useKeyEntry(container.status === "ready" ? container.container.useCases : null, { checkOnSave: false });
  // Read in the browser only, so the server's render and the first client render agree.
  const back = useSyncExternalStore(
    noSubscription,
    () => returnAfterKey(new URLSearchParams(window.location.search).get("next")),
    () => null,
  );

  if (container.status === "failed") return <p role="status">{tCommon("loadFailed")}</p>;
  if (container.status !== "ready" || entry.state.phase === "loading") return <p role="status">{tCommon("loading")}</p>;
  const { useCases } = container.container;

  return (
    <div className="app-stack">
      <p>{t("intro")}</p>

      <KeyEntry
        entry={entry}
        heading="h2"
        savedExtra={
          back === null ? null : (
            <Link href={back} className="pl-btn pl-btn--primary pl-focusable">
              {t("continueToDiagnostic")}
            </Link>
          )
        }
      />

      <Card>
        <h2>{t("whereTitle")}</h2>
        <p>{t("whereStored")}</p>
        <p>{t("whereNever")}</p>
        <p className="app-muted">{t("whereLimit")}</p>
        <Link href="/settings/key/guide" className="app-link pl-focusable">
          {t("guideLink")}
        </Link>
      </Card>

      <Card>
        <h2>{t("realtimeTitle")}</h2>
        <p>{t("realtimeNote")}</p>
        <a href={REALTIME_ROUTE_SOURCE_URL} className="app-link pl-focusable" rel="noreferrer">
          {t("realtimeSource")}
        </a>
        {/* Removing the key forgets the endpoint too (D192), so the form reads it again when the key changes. */}
        <RealtimeEndpointSettings key={entry.state.phase} useCases={useCases} />
      </Card>

      <SpendSettings />
    </div>
  );
}
