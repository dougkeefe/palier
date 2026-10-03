import { useTranslations } from "next-intl";

import { Link } from "../../i18n/navigation";
import { NonAffiliation } from "../NonAffiliation";
import { ShortcutSheet } from "../ShortcutSheet";

const REPOSITORY = "https://github.com/dougkeefe/palier";

/**
 * The landing page's own footer, as designed (D201). It keeps everything the app's footer
 * promises on every page: the R5 statement through `NonAffiliation`, the data, sync and key
 * links one step away (R11, R12, R14), the library, about and privacy, and the shortcut sheet.
 */
export function LandingFooter() {
  const t = useTranslations("landing");
  const nav = useTranslations("nav");
  const app = useTranslations("footer");

  return (
    <footer className="landing-footer">
      <div className="landing-footer__columns">
        <div>
          <p className="landing-footer__brand">{nav("brand")}</p>
          <p className="landing-footer__tagline">{t("footer.tagline")}</p>
        </div>
        <div className="landing-footer__column">
          <h2 className="landing-footer__heading">{t("footer.menu")}</h2>
          <a href="#tests" className="landing-footer__link pl-focusable">
            {t("nav.tests")}
          </a>
          <a href="#how" className="landing-footer__link pl-focusable">
            {t("nav.how")}
          </a>
          <a href="#faq" className="landing-footer__link pl-focusable">
            {t("nav.faq")}
          </a>
        </div>
        <div className="landing-footer__column">
          <h2 className="landing-footer__heading">{t("footer.yourDevice")}</h2>
          <Link href="/settings/data" className="landing-footer__link pl-focusable">
            {app("yourData")}
          </Link>
          <Link href="/settings/sync" className="landing-footer__link pl-focusable">
            {app("sync")}
          </Link>
          <Link href="/settings/key" className="landing-footer__link pl-focusable">
            {app("key")}
          </Link>
        </div>
        <div className="landing-footer__column">
          <h2 className="landing-footer__heading">{t("footer.more")}</h2>
          <Link href="/about" className="landing-footer__link pl-focusable">
            {app("about")}
          </Link>
          <Link href="/privacy" className="landing-footer__link pl-focusable">
            {app("privacy")}
          </Link>
          <Link href="/library" className="landing-footer__link pl-focusable">
            {app("library")}
          </Link>
          <a href={REPOSITORY} className="landing-footer__link pl-focusable">
            {t("footer.code")}
          </a>
          <a href={`${REPOSITORY}/blob/main/CONTRIBUTING.md`} className="landing-footer__link pl-focusable">
            {t("footer.contribute")}
          </a>
          <ShortcutSheet />
        </div>
      </div>
      <div className="landing-footer__statement">
        <p className="landing-footer__not-official">{t("footer.notOfficial")}</p>
        <NonAffiliation variant="footer" />
      </div>
      {/* Decoration, drawn from the attribute so it is no text at all: at a tenth of white it
          would fail a contrast check it has no need to pass. */}
      <div aria-hidden="true" className="landing-footer__wordmark" data-wordmark={nav("brand")} />
      <p className="landing-footer__photos">{t("footer.photos")}</p>
    </footer>
  );
}
