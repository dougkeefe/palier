import { Card, Glyph, buttonClass } from "@palier/ui";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { NotFoundView } from "../../../../components/errors/NotFoundView";
import { Cited } from "../../../../components/library/Cited";
import { LibraryCard } from "../../../../components/library/LibraryCard";
import { LibraryPhoto } from "../../../../components/library/LibraryPhoto";
import { PhotoCredit } from "../../../../components/library/PhotoCredit";
import "../../../../components/library/library.css";
import { EXAMPLES_ID, READ_NEXT_ID, contentsOf, sectionId } from "../../../../features/library/contents";
import { photosFor } from "../../../../features/library/photos";
import { Link } from "../../../../i18n/navigation";
import { adjacentArticles, articleFor, skillOf } from "../../../../lib/library";

const SKILL_HEADING = { reading: "readingHeading", writing: "writingHeading" } as const;

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
 * One library article (PRD §13.2, progress.md D162, D254, D256): where it sits, then the point,
 * the traps and the examples, with the page's contents beside them. A writing article's examples
 * are each a sentence to write and, usually, the one it replaces; a reading article's are each an
 * excerpt to read. The examples are in the article's language and marked up with it, and so is
 * every cited run in the prose. It ends on related articles, the way to practise, and the
 * articles either side in its skill. An unknown sub-skill renders the 404 in place, never
 * `notFound()`, which cannot run under the strict CSP (D141).
 */
export default function LibraryArticlePage({ params }: PageProps<"/[locale]/library/[subSkill]">) {
  const { locale, subSkill } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("library");
  const article = articleFor(subSkill);
  if (article === null) return <NotFoundView />;
  const lang = locale === "fr" ? "fr" : "en";
  const skill = skillOf(article);
  const skillName = t(SKILL_HEADING[skill]);
  const { previous, next } = adjacentArticles(article);
  const related = (article.related ?? []).flatMap((segment) => articleFor(segment) ?? []);

  const contents = contentsOf(article).map((entry) => ({
    id: entry.id,
    label:
      entry.kind === "section"
        ? (article.sections[entry.index]?.heading[lang] ?? "")
        : entry.kind === "examples"
          ? t("examples")
          : t("related"),
  }));

  return (
    <article className="app-library app-wide">
      <nav aria-label={t("breadcrumb")} className="app-library__breadcrumb">
        <ol>
          <li>
            <Link href="/library" className="pl-focusable">
              {t("title")}
            </Link>
          </li>
          <li>
            <Link href={`/library#library-${skill}`} className="pl-focusable">
              {skillName}
            </Link>
          </li>
          <li aria-current="page">{article.title[lang]}</li>
        </ol>
      </nav>

      <header className="app-library__head">
        <div className="app-library__head-text">
          <h1 className="app-hero__title app-library__title">{article.title[lang]}</h1>
          <p className="app-library__summary">
            <Cited text={article.summary[lang]} lang={article.lang} />
          </p>
        </div>
        <LibraryPhoto photo={skill} className="app-library__head-photo" />
      </header>

      <div className="app-library__body">
        <nav aria-labelledby="library-contents" className="app-library__contents">
          <p id="library-contents" className="app-library__contents-title">
            {t("onThisPage")}
          </p>
          <ol>
            {contents.map(({ id, label }) => (
              <li key={id}>
                <a href={`#${id}`} className="pl-focusable">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="app-library__content">
          {article.sections.map((section, index) => (
            <section key={section.heading.en} aria-labelledby={sectionId(index)}>
              <h2 id={sectionId(index)}>{section.heading[lang]}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.en}>
                  <Cited text={paragraph[lang]} lang={article.lang} />
                </p>
              ))}
            </section>
          ))}

          <section aria-labelledby={EXAMPLES_ID}>
            <h2 id={EXAMPLES_ID}>{t("examples")}</h2>
            <ol className="app-library__examples">
              {article.examples.map((example) => (
                <li key={"excerpt" in example ? example.excerpt : example.write} className="app-library__example">
                  {"excerpt" in example ? (
                    <>
                      <p className="app-library__tag">{t("excerpt")}</p>
                      <p lang={article.lang} className="app-library__excerpt">
                        {example.excerpt}
                      </p>
                    </>
                  ) : (
                    <>
                      {example.avoid === undefined ? null : (
                        <p className="app-library__line app-library__line--avoid">
                          <Glyph name="cross" className="app-library__line-glyph" />
                          <span className="app-library__tag">{t("insteadOf")}</span>{" "}
                          <span lang={article.lang} className="app-library__avoid">
                            {example.avoid}
                          </span>
                        </p>
                      )}
                      <p className="app-library__line app-library__line--write">
                        <Glyph name="check" className="app-library__line-glyph" />
                        <span className="app-library__tag">{t("write")}</span>{" "}
                        <span lang={article.lang} className="app-library__write">
                          {example.write}
                        </span>
                      </p>
                    </>
                  )}
                  <p className="app-library__why">
                    <Cited text={example.why[lang]} lang={article.lang} />
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {related.length === 0 ? null : (
            <section aria-labelledby={READ_NEXT_ID}>
              <h2 id={READ_NEXT_ID}>{t("related")}</h2>
              <ul className="app-library__cards app-library__cards--related">
                {related.map((other) => (
                  <LibraryCard key={other.subSkill} article={other} lang={lang} />
                ))}
              </ul>
            </section>
          )}

          <Card tone="deep" className="app-library__practise">
            <h2 className="app-library__practise-title">{t("practiseTitle")}</h2>
            <Link href={`/practice/${skill}`} className={`${buttonClass("light", "next")} pl-focusable`}>
              {skill === "reading" ? t("practiseReading") : t("practise")}
            </Link>
          </Card>

          <nav aria-label={t("siblings", { skill: skillName })} className="app-library__pager">
            {previous === null ? null : (
              <Link href={`/library/${previous.subSkill}`} className="app-library__pager-link pl-focusable">
                <span className="app-library__pager-label">{t("previous")}</span>
                <span className="app-library__pager-title">{previous.title[lang]}</span>
              </Link>
            )}
            {next === null ? null : (
              <Link
                href={`/library/${next.subSkill}`}
                className="app-library__pager-link app-library__pager-link--next pl-focusable"
              >
                <span className="app-library__pager-label">{t("next")}</span>
                <span className="app-library__pager-title">{next.title[lang]}</span>
              </Link>
            )}
          </nav>
        </div>
      </div>

      <PhotoCredit photos={photosFor(skill)} />
    </article>
  );
}
