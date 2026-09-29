import { useTranslations } from "next-intl";

import { Link } from "../i18n/navigation";
import { NonAffiliation } from "./NonAffiliation";
import { ShortcutSheet } from "./ShortcutSheet";

/**
 * The site footer, on every page. It carries the persistent, unmissable
 * non-affiliation statement required from day one (R5, product-requirements.md
 * §2: "in the footer of every page"), and the links to the data pane, the sync settings and
 * the key settings, then the library (D159), the about page and the privacy notice (progress.md D145), so export, delete, the sync switch and the key are one step from anywhere
 * [R11, R12, R14] and always in the same place (WCAG 3.2.6).
 */
export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <NonAffiliation variant="footer" />
        {/* A <div>, not a <p>: the shortcut sheet's dialog, with its headings, is inside it. */}
        <div className="app-footer__links">
          <Link href="/settings/data" className="app-link pl-focusable">
            {t("yourData")}
          </Link>
          <Link href="/settings/sync" className="app-link pl-focusable">
            {t("sync")}
          </Link>
          <Link href="/settings/key" className="app-link pl-focusable">
            {t("key")}
          </Link>
          <Link href="/library" className="app-link pl-focusable">
            {t("library")}
          </Link>
          <Link href="/about" className="app-link pl-focusable">
            {t("about")}
          </Link>
          <Link href="/privacy" className="app-link pl-focusable">
            {t("privacy")}
          </Link>
          <ShortcutSheet />
        </div>
      </div>
    </footer>
  );
}
