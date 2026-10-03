"use client";

import { useLocale, useTranslations } from "next-intl";

import { getPathname, Link, usePathname } from "../i18n/navigation";

/**
 * Switches the interface language while preserving the current route
 * (product-requirements.md §12: equal prominence, labelled with the other
 * language's own name, never a flag).
 *
 * A client component because it needs the locale-agnostic pathname to build the
 * same route under the other prefix. The visible text is the other language's
 * own name and carries `lang` so a screen reader pronounces "Français" or
 * "English" correctly (R9, language of parts).
 *
 * **Switching is a document load, never a soft navigation** (progress.md D163).
 * The locale is the root layout's segment, so a client-side switch remounts the
 * whole layout, and React writes the Trusted Types policy's `<script>` back
 * through `innerHTML`, which the production CSP refuses: the layout throws and
 * `global-error` renders. So `onNavigate` cancels the router's navigation and
 * loads the page instead. It stays next-intl's `Link` because its click handler
 * writes the locale cookie, and the proxy cannot: once the service worker
 * controls the page, the navigation reaches the proxy as the worker's `fetch`,
 * not as a document request, and next-intl leaves the cookie alone for those.
 *
 * `className` restyles it where the app's header is not the one around it: the landing page's
 * own header, over its photograph (D201).
 */
export function LanguageToggle({ className = "app-lang-toggle" }: { className?: string }) {
  const t = useTranslations("languageToggle");
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "en" ? "fr" : "en";
  const href = getPathname({ href: pathname, locale: other });

  return (
    <Link
      href={pathname}
      locale={other}
      lang={other}
      className={`${className} pl-focusable`}
      onNavigate={(event) => {
        event.preventDefault();
        window.location.assign(href);
      }}
    >
      {t("otherLanguage")}
    </Link>
  );
}
