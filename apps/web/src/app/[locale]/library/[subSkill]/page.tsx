import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { NotFoundView } from "../../../../components/errors/NotFoundView";
import { Cited } from "../../../../components/library/Cited";
import { Link } from "../../../../i18n/navigation";
import { articleFor } from "../../../../lib/library";

export async function generateMetadata({ params }: PageProps<"/[locale]/library/[subSkill]">): Promise<Metadata> {
  const { locale, subSkill } = await params;
  const article = articleFor(subSkill);
  if (article === null) {
    const t = await getTranslations({ locale, namespace: "errors" });
    return { title: t("notFoundTitle"), robots: { index: false } };
  }
  return { title: article.title[locale === "fr" ? "fr" : "en"] };
}

/**
 * One library article (PRD §13.2, progress.md D162): the rule, the traps, then examples, each a
 * sentence to write and, usually, the one it replaces. The examples are in the article's language
 * and marked up with it, and so is every cited run in the prose. An unknown sub-skill renders the
 * 404 in place, never `notFound()`, which cannot run under the strict CSP (D141).
 */
export default function LibraryArticlePage({ params }: PageProps<"/[locale]/library/[subSkill]">) {
  const { locale, subSkill } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("library");
  const tSub = useTranslations("subSkills");
  const article = articleFor(subSkill);
  if (article === null) return <NotFoundView />;
  const lang = locale === "fr" ? "fr" : "en";

  return (
    <article className="app-prose app-library">
      <p>
        <Link href="/library" className="app-link pl-focusable">
          {t("back")}
        </Link>
      </p>
      <h1 className="app-hero__title">{article.title[lang]}</h1>
      <p className="app-library__summary">
        <Cited text={article.summary[lang]} lang={article.lang} />
      </p>

      {article.sections.map((section) => (
        <section key={section.heading.en}>
          <h2>{section.heading[lang]}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.en}>
              <Cited text={paragraph[lang]} lang={article.lang} />
            </p>
          ))}
        </section>
      ))}

      <h2>{t("examples")}</h2>
      <ul className="app-library__examples">
        {article.examples.map((example) => (
          <li key={example.write} className="app-library__example">
            {example.avoid === undefined ? null : (
              <p>
                <span className="app-library__tag">{t("insteadOf")}</span>{" "}
                <span lang={article.lang} className="app-library__avoid">
                  {example.avoid}
                </span>
              </p>
            )}
            <p>
              <span className="app-library__tag">{t("write")}</span>{" "}
              <span lang={article.lang} className="app-library__write">
                {example.write}
              </span>
            </p>
            <p className="app-muted">
              <Cited text={example.why[lang]} lang={article.lang} />
            </p>
          </li>
        ))}
      </ul>

      {article.related === undefined ? null : (
        <>
          <h2>{t("related")}</h2>
          <ul>
            {article.related.map((related) => (
              <li key={related}>
                <Link href={`/library/${related}`} className="app-link pl-focusable">
                  {articleFor(related)?.title[lang] ?? tSub(related)}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <p>
        <Link href="/practice/writing" className="pl-btn pl-btn--secondary pl-focusable">
          {t("practise")}
        </Link>
      </p>
    </article>
  );
}
