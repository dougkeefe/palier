"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "../i18n/navigation";

/**
 * Switches the interface language while preserving the current route
 * (product-requirements.md §12: equal prominence, labelled with the other
 * language's own name, never a flag).
 *
 * A client component because it needs the locale-agnostic pathname to build the
 * same route under the other prefix. The visible text is the other language's
 * own name and carries `lang` so a screen reader pronounces "Français" or
 * "English" correctly (R9, language of parts).
 */
export function LanguageToggle() {
  const t = useTranslations("languageToggle");
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "en" ? "fr" : "en";

  return (
    <Link
      href={pathname}
      locale={other}
      lang={other}
      className="app-lang-toggle pl-focusable"
    >
      {t("otherLanguage")}
    </Link>
  );
}
