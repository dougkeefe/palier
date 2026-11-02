import { useTranslations } from "next-intl";

import { Link } from "../i18n/navigation";
import { NonAffiliation } from "./NonAffiliation";
import { ShortcutSheet } from "./ShortcutSheet";

/**
 * Onboarding's footer (progress.md D269): a quiet line on the paper rather than the app footer's deep teal panel, so
 * the flow above keeps the eye. It still carries what every page must: the non-affiliation statement (R5, "in the
 * footer of every page"), the about page and privacy notice, and the shortcut sheet, in the same order as the app
 * footer's (WCAG 3.2.6). The settings link is left out with the gear: there is nothing to set before onboarding.
 */
export function FocusFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="app-focus-footer">
      <NonAffiliation variant="footer" />
      {/* A <div>, not a <p>: the shortcut sheet's dialog, with its headings, is inside it. */}
      <div className="app-focus-footer__links">
        <Link href="/about" className="app-link pl-focusable">
          {t("about")}
        </Link>
        <Link href="/privacy" className="app-link pl-focusable">
          {t("privacy")}
        </Link>
        <ShortcutSheet />
      </div>
    </footer>
  );
}
