"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

import { errorCopyOf } from "./copy";
import { ErrorView } from "./ErrorView";

/**
 * `[locale]/error.tsx`'s screen: a route that threw, inside the app's own layout, so the
 * header, the footer and next-intl are all still there (progress.md D141).
 */
export function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("errors");
  const product = useTranslations("metadata");
  const locale = useLocale();
  const copy = errorCopyOf((key) => t(key), "route");
  const title = `${copy.title} · ${product("title")}`;

  // The page's own title is already in the head, and Next streams a page's metadata in after
  // the page has mounted, so a rendered <title> loses. The error holds the document's title
  // while it shows (WCAG 2.4.2), and on recovery gives back the last title the page set.
  useEffect(() => {
    let pageTitle = document.title;
    const hold = () => {
      if (document.title === title) return;
      pageTitle = document.title;
      document.title = title;
    };
    hold();
    const observer = new MutationObserver(hold);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => {
      observer.disconnect();
      document.title = pageTitle;
    };
  }, [title]);

  return <ErrorView copy={copy} error={error} onRetry={retry} homeHref={`/${locale}/home`} />;
}
