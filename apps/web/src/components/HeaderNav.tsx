"use client";

import { useTranslations } from "next-intl";

import { NAV_ITEMS, isCurrent } from "../features/nav/nav";
import { Link, usePathname } from "../i18n/navigation";

/**
 * The header's destinations on their quiet pill track (D202). A client component because it reads the
 * pathname, so the page you are on is marked `aria-current="page"` and drawn as the white pill.
 */
export function HeaderNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="app-header__nav" aria-label={t("primary")}>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className="app-header__link pl-focusable"
          aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
        >
          {t(item.key)}
        </Link>
      ))}
    </nav>
  );
}
