"use client";

import { useTranslations } from "next-intl";

import { isCurrent } from "../../features/nav/nav";
import { SETTINGS_ITEMS, showsSettingsNav } from "../../features/settings/settings-nav";
import { Link, usePathname } from "../../i18n/navigation";

/**
 * The settings menu above every settings screen (progress.md D264), on a pill track like the header's, the screen you
 * are on marked `aria-current="page"`. A client component because it reads the pathname; on the overview it renders
 * nothing, since the cards there are the menu.
 */
export function SettingsNav() {
  const t = useTranslations("settings");
  const pathname = usePathname();

  if (!showsSettingsNav(pathname)) return null;

  return (
    <nav className="app-settings-nav" aria-label={t("navLabel")}>
      {SETTINGS_ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className="app-header__link pl-focusable"
          aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
        >
          {t(`items.${item.key}.name`)}
        </Link>
      ))}
    </nav>
  );
}
