"use client";

import type { ReactNode } from "react";

import { showsAppChrome } from "../features/landing/landing";
import { usePathname } from "../i18n/navigation";

/**
 * The app's chrome around a page: the shared header, `main` and footer, on every page but the
 * landing page, which brings its own as designed (progress.md D201). A client component because
 * it reads the pathname: the layout persists across soft navigations, so a decision made there
 * would go stale on the way from the landing page into the app. The header and footer stay server
 * components, handed in as slots.
 */
export function Shell({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  if (!showsAppChrome(pathname)) return children;
  return (
    <>
      {header}
      <main id="main" tabIndex={-1} className="app-main">
        {children}
      </main>
      {footer}
    </>
  );
}
