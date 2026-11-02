"use client";

import { Button, Callout, Dialog, Scene } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { BRING_WAYS, type BringWay } from "../../features/onboarding/onboarding";
import { ImportForm } from "../data/ImportForm";
import { JoinForm } from "../sync/JoinForm";

/** Each way's link and dialog heading, message keys in `start`. */
const WORDS = {
  import: { link: "restoreImport", heading: "bringImportHeading" },
  pair: { link: "restorePair", heading: "bringPairHeading" },
} as const satisfies Readonly<Record<BringWay, { readonly link: string; readonly heading: string }>>;

/** What came over: nothing yet, progress with a study profile in it, or progress without one. */
export type Restored = "none" | "profile" | "data";

/**
 * Bringing progress in, from the foot of the welcome (D271): two small links, "I have a file I exported" and "I use
 * Palier on another device", for the few who need them and will look for them. Each opens a dialog with the same import
 * or pairing form `/settings/data` and `/settings/sync` use, since those screens wait until onboarding is done, so the
 * welcome itself never grows. Once a study profile has come over, the dialog offers today straight away, or the
 * questions, which then start from it.
 */
export function BringProgress({
  restored,
  onRestored,
  onToday,
  onContinue,
}: {
  readonly restored: Restored;
  readonly onRestored: () => Promise<void>;
  readonly onToday: () => void;
  /** Close and go on to the questions. */
  readonly onContinue: () => void;
}) {
  const t = useTranslations("start");
  const [open, setOpen] = useState<BringWay | null>(null);

  const actions =
    restored === "profile" ? (
      <>
        <Button arrow="go" onClick={onToday}>
          {t("restoreToday")}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setOpen(null);
            onContinue();
          }}
        >
          {t("bringContinue")}
        </Button>
      </>
    ) : (
      <Button variant="secondary" onClick={() => setOpen(null)}>
        {t("bringClose")}
      </Button>
    );

  return (
    <div className="app-onboarding__bring">
      <span>{t("bringLead")}</span>
      {BRING_WAYS.map((way) => (
        <button key={way} type="button" className="app-link app-link--button pl-focusable" onClick={() => setOpen(way)}>
          {t(WORDS[way].link)}
        </button>
      ))}
      <Dialog open={open !== null} onClose={() => setOpen(null)} heading={t(WORDS[open ?? "import"].heading)} actions={actions}>
        <div className="app-stack">
          <Scene name="devices" className="app-onboarding__bring-scene" />
          {open === "import" ? <ImportForm onImported={onRestored} /> : null}
          {open === "pair" ? (
            <>
              <p className="app-muted">{t("restorePairWhere")}</p>
              {/* Only a link whose first exchange synced has anything to show; an unavailable one says so itself. */}
              <JoinForm onJoined={(synced) => (synced ? onRestored() : undefined)} />
            </>
          ) : null}
          {restored === "profile" ? <Callout tone="correct">{t("restoredProfile")}</Callout> : null}
          {restored === "data" ? <Callout tone="info">{t("restoredData")}</Callout> : null}
        </div>
      </Dialog>
    </div>
  );
}
