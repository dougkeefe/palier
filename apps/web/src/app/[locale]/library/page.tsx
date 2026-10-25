import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { LibraryCard } from "../../../components/library/LibraryCard";
import { LibraryFilter } from "../../../components/library/LibraryFilter";
import { LibraryPhoto } from "../../../components/library/LibraryPhoto";
import { PhotoCredit } from "../../../components/library/PhotoCredit";
import libraryPhoto from "../../../components/library/images/library.webp";
import "../../../components/library/library.css";
import { filterOptions, tagsOf } from "../../../features/library/filter";
import { photosFor } from "../../../features/library/photos";
import { libraryArticlesFor, skillOf } from "../../../lib/library";

export async function generateMetadata({ params }: PageProps<"/[locale]/library">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "library" });
  return { title: t("title") };
}

/**
 * The library's index (PRD §13.2, progress.md D145, D162, D254, D256, D257): its title and line
 * beside its photograph, then every article as a card in one grid, reading's first, each skill's in
 * the taxonomy's order, under a row of pills that filters them by skill or by topic. The headings
 * run h1, then h2 per article. A server component, so the articles never reach the client's
 * JavaScript: the filter is handed the rendered cards and each card's tags.
 */
export default function LibraryPage({ params }: PageProps<"/[locale]/library">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("library");
  const lang = locale === "fr" ? "fr" : "en";
  const articles = [...libraryArticlesFor("reading"), ...libraryArticlesFor("writing")];

  return (
    <div className="app-library app-wide">
      {/* The photograph beside the title is the largest paint, and as a CSS background the browser
          would find it only once the stylesheet had loaded (as the landing page's hero, D201). */}
      <link rel="preload" as="image" href={libraryPhoto.src} fetchPriority="high" />
      <header className="app-library__hero">
        <div className="app-library__hero-text">
          <h1 className="app-hero__title">{t("title")}</h1>
          <p className="app-library__lede">{t("intro")}</p>
        </div>
        <LibraryPhoto photo="library" className="app-library__hero-photo" />
      </header>

      <LibraryFilter options={filterOptions(articles.map((article) => tagsOf(skillOf(article), article.topic)))}>
        <ol className="app-library__cards">
          {articles.map((article) => (
            <LibraryCard key={article.subSkill} article={article} lang={lang} heading="h2" />
          ))}
        </ol>
      </LibraryFilter>

      <PhotoCredit photos={photosFor("index")} />
    </div>
  );
}
