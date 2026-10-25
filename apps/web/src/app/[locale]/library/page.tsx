import { Glyph } from "@palier/ui";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { LibraryCard } from "../../../components/library/LibraryCard";
import { LibraryPhoto } from "../../../components/library/LibraryPhoto";
import { PhotoCredit } from "../../../components/library/PhotoCredit";
import libraryPhoto from "../../../components/library/images/library.webp";
import "../../../components/library/library.css";
import { photosFor } from "../../../features/library/photos";
import { SKILL_LOOK } from "../../../features/skills/skill-look";
import { libraryArticlesFor } from "../../../lib/library";

/** Reading first, as the exam sits it and as `/progress` lists the skills. */
const SKILLS = [
  { skill: "reading", heading: "readingHeading", lede: "readingLede" },
  { skill: "writing", heading: "writingHeading", lede: "writingLede" },
] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/library">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "library" });
  return { title: t("title") };
}

/**
 * The library's index (PRD §13.2, progress.md D145, D162, D254, D256): its title and a way to each
 * skill, then one section per skill, reading first, each article a card in the taxonomy's order
 * with its summary. The headings run h1, h2 per skill, h3 per article, so a screen reader moves
 * article by article. A server component, so the articles never reach the client's JavaScript.
 */
export default function LibraryPage({ params }: PageProps<"/[locale]/library">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("library");
  const lang = locale === "fr" ? "fr" : "en";

  return (
    <div className="app-library app-wide">
      {/* The photograph beside the title is the largest paint, and as a CSS background the browser
          would find it only once the stylesheet had loaded (as the landing page's hero, D201). */}
      <link rel="preload" as="image" href={libraryPhoto.src} fetchPriority="high" />
      <header className="app-library__hero">
        <div className="app-library__hero-text">
          <h1 className="app-hero__title">{t("title")}</h1>
          <p className="app-library__lede">{t("intro")}</p>
          <nav aria-label={t("jumpLabel")}>
            <ul className="app-library__jump">
              {SKILLS.map(({ skill, heading }) => (
                <li key={skill}>
                  <a href={`#library-${skill}`} className="app-library__jump-link pl-focusable">
                    <Glyph name={SKILL_LOOK[skill].glyph} className="app-library__jump-glyph" />
                    <span className="app-library__jump-name">{t(heading)}</span>
                    <span className="app-library__jump-count">
                      {t("articleCount", { count: libraryArticlesFor(skill).length })}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <LibraryPhoto photo="library" className="app-library__hero-photo" />
      </header>

      {SKILLS.map(({ skill, heading, lede }) => {
        const articles = libraryArticlesFor(skill);
        return (
          <section key={skill} aria-labelledby={`library-${skill}`} className="app-library__skill">
            <div className="app-library__skill-head">
              <div className="app-library__skill-text">
                <span className={`app-library__mark app-library__mark--${SKILL_LOOK[skill].tone}`} aria-hidden="true">
                  <Glyph name={SKILL_LOOK[skill].glyph} />
                </span>
                <h2 id={`library-${skill}`} className="app-library__skill-title">
                  {t(heading)}
                </h2>
                <p className="app-library__skill-count">{t("articleCount", { count: articles.length })}</p>
                <p className="app-library__skill-lede">{t(lede)}</p>
              </div>
              <LibraryPhoto photo={skill} className="app-library__skill-photo" />
            </div>
            <ol className="app-library__cards">
              {articles.map((article, index) => (
                <LibraryCard key={article.subSkill} article={article} lang={lang} number={index + 1} />
              ))}
            </ol>
          </section>
        );
      })}

      <PhotoCredit photos={photosFor("index")} />
    </div>
  );
}
