"use client";

import { useTranslations } from "next-intl";

import { Glyph } from "@palier/ui";

import { isCurrent } from "../features/nav/nav";
import { SETTINGS_HREF } from "../features/settings/settings-nav";
import { Link, usePathname } from "../i18n/navigation";

/**
 * The header's gear (progress.md D264): the way into the settings area from every page, at the top right. The glyph is
 * `aria-hidden`, so the link is named, and titled, in words. A client component because it reads the pathname, so
 * inside the area it is marked `aria-current="page"` and drawn as the white pill, as the header's destinations are.
 */
export function SettingsLink() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <Link
      href={SETTINGS_HREF}
      className="pl-icon-btn pl-focusable app-header__settings"
      aria-label={t("settings")}
      title={t("settings")}
      aria-current={isCurrent(pathname, SETTINGS_HREF) ? "page" : undefined}
    >
      <Glyph name="gear" />
    </Link>
  );
}
