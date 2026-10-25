import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { Cited } from "../../../components/library/Cited";
import { Link } from "../../../i18n/navigation";
import { libraryArticlesFor } from "../../../lib/library";

/** Reading first, as the exam sits it and as `/progress` lists the skills. */
const SKILLS = [
  { skill: "reading", heading: "readingHeading" },
  { skill: "writing", heading: "writingHeading" },
] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/library">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "library" });
  return { title: t("title") };
}

/**
 * The library's index (PRD §13.2, progress.md D145, D162, D254): one article per reading and
 * written-expression sub-skill, reading first, each skill in the taxonomy's order, each article with
 * its summary. A server component, so the articles never reach the client's JavaScript.
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
      {SKILLS.map(({ skill, heading }) => (
        <section key={skill} aria-labelledby={`library-${skill}`}>
          <h2 id={`library-${skill}`}>{t(heading)}</h2>
          <ul className="app-library__index">
            {libraryArticlesFor(skill).map((article) => (
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
        </section>
      ))}
    </article>
  );
}
