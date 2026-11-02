"use client";

import { useEffect } from "react";

import { needsOnboarding } from "../features/chrome/chrome";
import { usePathname, useRouter } from "../i18n/navigation";
import { readStudyProfile } from "../lib/study";
import { useContainer } from "./ContainerProvider";

/**
 * Sends a visitor with no study profile to onboarding (D270), from every app page but the few open before it
 * (`needsOnboarding`). Checked on every page change, since the layout persists, so a link followed after "Delete
 * everything" lands on onboarding too. Replaced, not pushed, so Back from onboarding does not bounce through the page
 * again. Draws nothing. Today and a drill keep their own redirect (D224), which also spares them drawing an empty plan.
 */
export function OnboardingGate() {
  const pathname = usePathname();
  const router = useRouter();
  const container = useContainer();

  useEffect(() => {
    if (container.status !== "ready" || !needsOnboarding(pathname)) return;
    let live = true;
    void readStudyProfile(container.container.settings).then(
      (profile) => {
        if (live && profile === null) router.replace("/start");
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [container, pathname, router]);

  return null;
}
