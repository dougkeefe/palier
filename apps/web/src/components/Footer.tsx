import { useTranslations } from "next-intl";

import { Link } from "../i18n/navigation";

/**
 * The site footer, on every page. It carries the persistent, unmissable
 * non-affiliation statement required from day one (R5, product-requirements.md
 * §2: "in the footer of every page"), and the links to the data pane and the sync
 * settings, so export, delete and the sync switch are one step from anywhere [R11, R14]
 * and always in the same place (WCAG 3.2.6).
 */
export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <p className="app-footer__disclaimer">{t("nonAffiliation")}</p>
        <p className="app-footer__links">
          <Link href="/settings/data" className="app-link pl-focusable">
            {t("yourData")}
          </Link>
          <Link href="/settings/sync" className="app-link pl-focusable">
            {t("sync")}
          </Link>
        </p>
      </div>
    </footer>
  );
}
