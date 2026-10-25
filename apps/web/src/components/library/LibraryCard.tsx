import type { LibraryArticle } from "@palier/domain";
import { Glyph, cardClass } from "@palier/ui";
import { useTranslations } from "next-intl";

import { tagsOf } from "../../features/library/filter";
import { readingMinutes } from "../../features/library/reading-time";
import { SKILL_LOOK } from "../../features/skills/skill-look";
import { Link } from "../../i18n/navigation";
import { skillOf } from "../../lib/library";
import { Cited } from "./Cited";
import { LibraryPhoto } from "./LibraryPhoto";

const SKILL_BADGE = { reading: "skillReading", writing: "skillWriting" } as const;

/**
 * One article as a card (D256, D257), on the index and under an article's "Read next": its
 * photograph with its skill on a badge, its title as a heading and a link, its summary, then its
 * topic and reading time, in its skill's fill. The badge is a solid pill, so it never relies on the
 * photograph for contrast. The link covers the card by `::after`, so the whole card answers a click
 * while its name stays the title alone. `data-tags` is what the index's filter reads.
 */
export function LibraryCard({
  article,
  lang,
  heading: Heading,
}: {
  article: LibraryArticle;
  lang: "en" | "fr";
  heading: "h2" | "h3";
}) {
  const t = useTranslations("library");
  const skill = skillOf(article);

  return (
    <li className={`${cardClass(SKILL_LOOK[skill].tone)} app-library__card`} data-tags={tagsOf(skill, article.topic).join(" ")}>
      <div className="app-library__card-media">
        <LibraryPhoto photo={article.subSkill} className="app-library__card-photo" />
        <span className="app-library__badge">
          <Glyph name={SKILL_LOOK[skill].glyph} className="app-library__badge-glyph" />
          {t(SKILL_BADGE[skill])}
        </span>
      </div>
      <Heading className="app-library__card-title">
        <Link href={`/library/${article.subSkill}`} className="app-library__entry">
          {article.title[lang]}
        </Link>
      </Heading>
      <p className="app-library__card-summary">
        <Cited text={article.summary[lang]} lang={article.lang} />
      </p>
      <div className="app-library__card-foot">
        <ul className="app-library__chips">
          <li className="app-library__chip">{t(`topics.${article.topic}`)}</li>
          <li className="app-library__chip">
            <Glyph name="clock" className="app-library__chip-glyph" />
            {t("minutes", { count: readingMinutes(article, lang) })}
          </li>
        </ul>
        <span className="app-library__more" aria-hidden="true">
          {t("readArticle")}
        </span>
      </div>
    </li>
  );
}
