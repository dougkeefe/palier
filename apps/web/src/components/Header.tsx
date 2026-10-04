import { useTranslations } from "next-intl";

import { Link } from "../i18n/navigation";

import { HeaderNav } from "./HeaderNav";
import { LanguageToggle } from "./LanguageToggle";
import { SyncStatus } from "./SyncStatus";

/**
 * The site header, identical on every page (WCAG 2.2 SC 3.2.6, consistent
 * help/controls in the same place), as designed (progress.md D202): the wordmark
 * home, the primary destinations (today, review, oral practice, progress, about) on
 * a pill track, then the quiet sync status and the equal-prominence language
 * toggle. It wraps rather than overflowing on a narrow screen (WCAG 1.4.10).
 */
export function Header() {
  const t = useTranslations("nav");

  return (
    <header className="app-header">
      <Link href="/" className="app-header__brand pl-focusable">
        {t("brand")}
      </Link>
      <HeaderNav />
      <div className="app-header__tools">
        <SyncStatus />
        <LanguageToggle />
      </div>
    </header>
  );
}
