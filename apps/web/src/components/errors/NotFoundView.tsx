import { useTranslations } from "next-intl";

import { Link } from "../../i18n/navigation";

/**
 * The localised 404 (progress.md D141): what `[locale]/[...rest]` renders for every unknown path
 * under a locale, and what `[locale]/not-found.tsx` renders for a `notFound()`. It is not an error
 * the app made, so it offers the way home and no diagnostic bundle. `titled` renders its own
 * `<title>`, for `not-found.tsx`, which has no metadata of its own.
 */
export function NotFoundView({ titled = false }: { titled?: boolean }) {
  const t = useTranslations("errors");
  const product = useTranslations("metadata");

  return (
    <section className="app-prose app-error">
      {titled ? <title>{`${t("notFoundTitle")} · ${product("title")}`}</title> : null}
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
