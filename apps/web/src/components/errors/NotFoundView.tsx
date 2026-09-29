import { useTranslations } from "next-intl";

import { Link } from "../../i18n/navigation";

/**
 * The localised 404 (progress.md D141): `[locale]/not-found.tsx`, which every unknown path
 * under a locale reaches through `[locale]/[...rest]`. It is not an error the app made, so
 * it offers the way home and no diagnostic bundle.
 */
export function NotFoundView() {
  const t = useTranslations("errors");
  const product = useTranslations("metadata");

  return (
    <section className="app-prose app-error">
      <title>{`${t("notFoundTitle")} · ${product("title")}`}</title>
      <h1 className="app-hero__title">{t("notFoundTitle")}</h1>
      <p>{t("notFoundBody")}</p>
      <p>
        <Link className="pl-btn pl-btn--primary pl-focusable" href="/home">
          {t("home")}
        </Link>
      </p>
    </section>
  );
}
