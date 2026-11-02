"use client";

import type { ReactNode } from "react";

import { chromeFor } from "../features/chrome/chrome";
import { usePathname } from "../i18n/navigation";
import { OnboardingGate } from "./OnboardingGate";

/**
 * The app's chrome around a page (`chromeFor`): the shared header, `main` and footer on most pages; nothing on the
 * landing page, which brings its own as designed (progress.md D201); and onboarding's slim focus frame, with no
 * navigation, sync status or settings for a first-time user to wander into (D269). A client component because it
 * reads the pathname: the layout persists across soft navigations, so a decision made there would go stale on the
 * way from the landing page into the app, or from onboarding to today. The headers and footers stay server
 * components, handed in as slots. On the app's pages it also holds `OnboardingGate`, which sends a visitor who has not
 * been through onboarding there (D270).
 */
export function Shell({
  header,
  footer,
  focusHeader,
  focusFooter,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  focusHeader: ReactNode;
  focusFooter: ReactNode;
  children: ReactNode;
}) {
  const chrome = chromeFor(usePathname());
  if (chrome === "own") return children;
  const focus = chrome === "focus";
  return (
    <>
      {focus ? focusHeader : header}
      <main id="main" tabIndex={-1} className={focus ? "app-main app-main--focus" : "app-main"}>
        {children}
      </main>
      {focus ? null : <OnboardingGate />}
      {focus ? focusFooter : footer}
    </>
  );
}
