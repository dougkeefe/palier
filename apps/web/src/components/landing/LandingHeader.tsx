import { useTranslations } from "next-intl";

import { Link } from "../../i18n/navigation";
import { LanguageToggle } from "../LanguageToggle";

/**
 * The landing page's own header, over the hero's photograph (D201): the brand, the page's
 * sections, the language toggle and the way in. The app's header is on every other page.
 */
export function LandingHeader() {
  const t = useTranslations("landing");
  const nav = useTranslations("nav");

  return (
    <header className="landing-header">
      <Link href="/" className="landing-header__brand pl-focusable">
        {nav("brand")}
      </Link>
      <nav className="landing-header__nav" aria-label={t("navLabel")}>
        <a href="#top" className="landing-header__link landing-header__link--current pl-focusable">
          {t("nav.home")}
        </a>
        <a href="#tests" className="landing-header__link pl-focusable">
          {t("nav.tests")}
        </a>
        <a href="#how" className="landing-header__link pl-focusable">
          {t("nav.how")}
        </a>
        <a href="#faq" className="landing-header__link pl-focusable">
          {t("nav.faq")}
        </a>
      </nav>
      <div className="landing-header__actions">
        <LanguageToggle className="landing-header__lang" />
        <Link href="/home" className="landing-pill landing-pill--light pl-focusable">
          {t("hero.ctaShort")}
        </Link>
      </div>
    </header>
  );
}
