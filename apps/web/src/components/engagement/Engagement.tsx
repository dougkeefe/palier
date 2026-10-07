"use client";

import type { Milestones, StreakReport } from "@palier/app";
import type { MilestoneId } from "@palier/engine";
import { Button, Callout, Dialog, Mascot, StreakFlame, Toast } from "@palier/ui";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { type ShareCard, type ShareOutcome, shareCard, shareRoute } from "../../features/engagement/share";
import { MILESTONE_ITEMS, STREAK_FREEZES_PER_MONTH } from "../../features/engagement/rules";
import type { Container } from "../../lib/container";
import { deviceTimeZone } from "../../lib/time-zone";
import type { ContainerState } from "../ContainerProvider";

export type Engagement = {
  readonly streak: StreakReport;
  readonly milestones: Milestones;
};

const loadEngagement = async (container: Container): Promise<Engagement> => {
  const [streak, milestones] = await Promise.all([
    container.useCases.streakReport({ timeZone: deviceTimeZone(), freezesPerMonth: STREAK_FREEZES_PER_MONTH }),
    container.useCases.milestones({ itemsAnswered: MILESTONE_ITEMS }),
  ]);
  return { streak, milestones };
};

/**
 * The streak and the milestones, read once when home mounts (PRD §9, progress.md D159). Once, and
 * not with the skill switch, so "we kept your streak" stays on the screen it was said on. A
 * failure is `null`, the same as not loaded: engagement is never worth an error on home.
 */
export const useEngagement = (state: ContainerState): Engagement | null => {
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  useEffect(() => {
    if (state.status !== "ready") return;
    let live = true;
    loadEngagement(state.container).then(
      (e) => live && setEngagement(e),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [state]);
  return engagement;
};

/**
 * The streak's tile among Today's statistics (D219): the flame, the count, and what it counts. At
 * zero it invites rather than reports (§9: "no anxiety"), so an empty streak is never pointed out
 * as a failure.
 */
export function StreakTile({ streak }: { streak: StreakReport }) {
  const t = useTranslations("today");
  return (
    <>
      <p className="app-home__figure pl-streak">
        <StreakFlame lit={streak.doneToday} />
        <span>{streak.length}</span>
      </p>
      <p className="app-home__figure-label">{t("statStreak", { count: streak.length })}</p>
    </>
  );
}

/**
 * "We kept your streak", said once (§9, D159): marked as said as soon as it is on the screen, and
 * nothing at all when there is no freeze to announce.
 */
export function StreakFreezeNotice({ streak, container }: { streak: StreakReport; container: Container }) {
  const t = useTranslations("engagement");
  const noted = useRef(false);
  const announce = streak.freezeToAnnounce;
  useEffect(() => {
    if (announce === null || noted.current) return;
    noted.current = true;
    void container.useCases.noteStreakFreeze({ day: announce });
  }, [announce, container]);

  if (announce === null) return null;
  return (
    <Callout tone="accent">
      <strong>{t("freezeTitle")}</strong> {t("freezeBody")}
    </Callout>
  );
}

/**
 * A milestone's full-screen moment, with Coco cheering (PRD §9, §10.1). Home is the only screen
 * that shows one, so it never appears in exam mode or on a results screen. The first unseen one
 * is shown; closing it, by the button or Escape, marks it shown on every device.
 */
export function MilestoneMoment({ milestones, container }: { milestones: Milestones; container: Container }) {
  const t = useTranslations("engagement");
  const locale = useLocale();
  // The moment stays mounted once shown, and only closes, so the dialog hands focus back.
  const [id] = useState<MilestoneId | null>(milestones.unseen[0] ?? null);
  const [open, setOpen] = useState(id !== null);
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null);

  const close = useCallback(() => {
    if (id === null || !open) return;
    setOpen(false);
    void container.useCases.markMilestoneShown({ id });
  }, [container, id, open]);

  if (id === null) return null;
  const values = { count: MILESTONE_ITEMS };
  const card: ShareCard = {
    text: t(`milestones.${id}.share`, values),
    url: `${window.location.origin}/${locale}`,
  };
  const route = shareRoute(navigator, card);

  return (
    <Dialog
      open={open}
      onClose={close}
      placement="full"
      heading={t(`milestones.${id}.title`, values)}
      actions={
        <>
          {route === "none" ? null : (
            <Button variant="secondary" onClick={() => void shareCard(navigator, card).then(setOutcome)}>
              {route === "share" ? t("share") : t("copy")}
            </Button>
          )}
          <Button variant="primary" onClick={close}>
            {t("close")}
          </Button>
        </>
      }
    >
      <div className="app-moment">
        <Mascot pose="cheer" />
        <p>{t(`milestones.${id}.body`, values)}</p>
        {outcome === "copied" ? <Toast tone="correct">{t("copied")}</Toast> : null}
        {outcome === "failed" ? <Toast tone="info">{t("shareFailed")}</Toast> : null}
      </div>
    </Dialog>
  );
}
