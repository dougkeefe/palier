import { useTranslations } from "next-intl";

/**
 * The site footer, on every page. It carries the persistent, unmissable
 * non-affiliation statement required from day one (R5, product-requirements.md
 * §2: "in the footer of every page").
 */
export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <p className="app-footer__disclaimer">{t("nonAffiliation")}</p>
      </div>
    </footer>
  );
}
