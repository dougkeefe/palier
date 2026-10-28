import { useTranslations } from "next-intl";

import { SETTINGS_HREF } from "../features/settings/settings-nav";
import { Link } from "../i18n/navigation";
import { NonAffiliation } from "./NonAffiliation";
import { ShortcutSheet } from "./ShortcutSheet";

/**
 * The site footer, on every page. It carries the persistent, unmissable
 * non-affiliation statement required from day one (R5, product-requirements.md
 * §2: "in the footer of every page"), and the link to the settings area (D264), where your levels and goals, the key,
 * export, import, delete and the sync switch are [R11, R12, R14], then the library (D162), the about page and the
 * privacy notice (progress.md D145), always in the same place (WCAG 3.2.6). Deep teal, with the giant wordmark cropped
 * at the bottom, as designed (progress.md D202).
 */
export function Footer() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");

  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <NonAffiliation variant="footer" />
        {/* A <div>, not a <p>: the shortcut sheet's dialog, with its headings, is inside it. */}
        <div className="app-footer__links">
          <Link href={SETTINGS_HREF} className="app-link pl-focusable">
            {t("settings")}
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
      {/* Decoration: drawn by the stylesheet from the attribute, so it is no text to read or to contrast-check. */}
      <div className="app-footer__wordmark" data-wordmark={nav("brand")} aria-hidden="true" />
    </footer>
  );
}
