"use client";

import { usePathname } from "next/navigation";

import { globalErrorCopyFor, localeOfPath } from "./copy";
import { ErrorView } from "./ErrorView";

/**
 * `global-error.tsx`'s whole document (progress.md D141). It replaces the root layout, so it
 * writes its own `<html>` and `<body>`, names its language from the path, and titles itself.
 * `global-error.tsx` imports the design system's CSS, since the layout that normally does is
 * the thing that failed.
 */
export function GlobalErrorDocument({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const locale = localeOfPath(usePathname());
  const copy = globalErrorCopyFor(locale);

  return (
    <html lang={locale}>
      <body>
        <title>{copy.title}</title>
        <main id="main" className="app-main">
          <ErrorView copy={copy} error={error} onRetry={retry} homeHref={`/${locale}/home`} />
        </main>
      </body>
    </html>
  );
}
