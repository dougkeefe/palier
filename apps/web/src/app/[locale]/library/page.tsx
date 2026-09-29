import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { Cited } from "../../../components/library/Cited";
import { Link } from "../../../i18n/navigation";
import { libraryArticles } from "../../../lib/library";

export async function generateMetadata({ params }: PageProps<"/[locale]/library">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "library" });
  return { title: t("title") };
}

/**
 * The library's index (PRD §13.2, progress.md D145, D159): one article per written-expression
 * sub-skill, in the taxonomy's order, each with its summary. A server component, so the articles
 * never reach the client's JavaScript. Reading's articles come after 1.0 (Gate K).
 */
export default function LibraryPage({ params }: PageProps<"/[locale]/library">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("library");
  const lang = locale === "fr" ? "fr" : "en";

  return (
    <article className="app-prose app-library">
      <h1 className="app-hero__title">{t("title")}</h1>
      <p>{t("intro")}</p>
      <h2>{t("skillHeading")}</h2>
      <ul className="app-library__index">
        {libraryArticles().map((article) => (
          <li key={article.subSkill}>
            <Link href={`/library/${article.subSkill}`} className="app-link pl-focusable app-library__entry">
              {article.title[lang]}
            </Link>
            <p className="app-muted">
              <Cited text={article.summary[lang]} lang={article.lang} />
            </p>
          </li>
        ))}
      </ul>
      <p className="app-muted">{t("readingLater")}</p>
    </article>
  );
}
