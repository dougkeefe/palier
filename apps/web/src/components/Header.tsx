import { useTranslations } from "next-intl";

import { Link } from "../i18n/navigation";

import { HeaderMenu } from "./HeaderMenu";
import { HeaderNav } from "./HeaderNav";
import { LanguageToggle } from "./LanguageToggle";
import { SettingsLink } from "./SettingsLink";
import { SyncStatus } from "./SyncStatus";

/**
 * The site header, identical on every page (WCAG 2.2 SC 3.2.6, consistent
 * help/controls in the same place), as designed (progress.md D202): the wordmark
 * home, the primary destinations (today, review, oral practice, progress, translate) on
 * a pill track, then the quiet sync status, the equal-prominence language toggle and,
 * at the top right, the gear into the settings area (D264). Below 1100px the destinations,
 * the sync status and the language fold behind a menu button beside the gear (D267,
 * `HeaderMenu`), so a phone's header is one row: the wordmark, the button, the gear. On a
 * wide screen the panel is `display: contents` and the row is as designed.
 */
export function Header() {
  const t = useTranslations("nav");

  return (
    <header className="app-header">
      <Link href="/" className="app-header__brand pl-focusable">
        {t("brand")}
      </Link>
      <HeaderMenu
        label={t("menu")}
        panelId="app-menu"
        buttonClassName="pl-icon-btn app-header__menu-button"
        panelClassName="app-header__panel"
      >
        <HeaderNav />
        <div className="app-header__tools">
          <SyncStatus />
          <LanguageToggle />
        </div>
      </HeaderMenu>
      <div className="app-header__tools">
        <SettingsLink />
      </div>
    </header>
  );
}
