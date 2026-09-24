import { useTranslations } from "next-intl";

import { Link } from "../i18n/navigation";

import { LanguageToggle } from "./LanguageToggle";
import { SyncStatus } from "./SyncStatus";

/**
 * The site header, identical on every page (WCAG 2.2 SC 3.2.6, consistent
 * help/controls in the same place). Carries the brand link home, the quiet sync
 * status, and the equal-prominence language toggle.
 */
export function Header() {
  const t = useTranslations("nav");

  return (
    <header className="app-header">
      <Link href="/" className="app-header__brand pl-focusable">
        {t("brand")}
      </Link>
      <nav className="app-header__nav" aria-label={t("primary")}>
        <Link href="/home" className="app-header__link pl-focusable">
          {t("home")}
        </Link>
        <Link href="/review" className="app-header__link pl-focusable">
          {t("review")}
        </Link>
        <Link href="/progress" className="app-header__link pl-focusable">
          {t("progress")}
        </Link>
        <Link href="/about" className="app-header__link pl-focusable">
          {t("about")}
        </Link>
        <SyncStatus />
        <LanguageToggle />
      </nav>
    </header>
  );
}
