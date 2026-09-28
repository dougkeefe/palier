"use client";

import type { OralStorageEstimate } from "@palier/app";
import { Button, Callout, Card, Toast } from "@palier/ui";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { recordingsMegabytes } from "../../features/oral/practice-view";
import { useContainer } from "../ContainerProvider";

/**
 * The recordings of spoken practice in the data settings (architecture.md §9.1, progress.md D115,
 * D119): how much room they take, a warning at 200 MB, and the one-tap cleanup, which deletes every
 * recording and never a transcript. Device-local: never synced and never exported.
 */
export function OralStorageSettings() {
  const t = useTranslations("data");
  const format = useFormatter();
  const container = useContainer();
  const [estimate, setEstimate] = useState<OralStorageEstimate | null>(null);
  const [cleaned, setCleaned] = useState(false);

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    void container.container.useCases.oralStorageEstimate().then((e) => live && setEstimate(e));
    return () => {
      live = false;
    };
  }, [container]);

  const onClean = async () => {
    if (container.status !== "ready") return;
    await container.container.useCases.cleanUpAudio();
    setEstimate(await container.container.useCases.oralStorageEstimate());
    setCleaned(true);
  };

  return (
    <Card>
      <h2>{t("oralTitle")}</h2>
      <div className="app-stack">
        <p>{t("oralNote")}</p>
        {estimate === null ? null : estimate.bytes === 0 ? (
          <p>{t("oralNone")}</p>
        ) : (
          <>
            <p>
              {t("oralSize", {
                size: format.number(recordingsMegabytes(estimate.bytes), { style: "unit", unit: "megabyte", maximumFractionDigits: 1 }),
              })}
            </p>
            {estimate.warn ? <Callout tone="info">{t("oralWarn")}</Callout> : null}
            <div className="app-actions">
              <Button variant="secondary" onClick={() => void onClean()}>
                {t("oralClean")}
              </Button>
            </div>
          </>
        )}
        {cleaned ? <Toast tone="correct">{t("oralCleaned")}</Toast> : null}
      </div>
    </Card>
  );
}
