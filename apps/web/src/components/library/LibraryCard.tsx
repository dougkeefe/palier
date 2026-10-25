import type { LibraryArticle } from "@palier/domain";
import { cardClass } from "@palier/ui";

import { SKILL_LOOK } from "../../features/skills/skill-look";
import { Link } from "../../i18n/navigation";
import { skillOf } from "../../lib/library";
import { Cited } from "./Cited";

/**
 * One article as a card (D256), on the index and under an article's "Read next": its number in the
 * skill (decoration), its title as a heading and a link, and its summary, in its skill's fill.
 * The link covers the card by `::after`, so the whole card answers a click, while its name stays
 * the title alone.
 */
export function LibraryCard({
  article,
  lang,
  number,
}: {
  article: LibraryArticle;
  lang: "en" | "fr";
  number?: number;
}) {
  return (
    <li className={`${cardClass(SKILL_LOOK[skillOf(article)].tone)} app-library__card`}>
      {number === undefined ? null : (
        <span className="app-library__number" aria-hidden="true">
          {String(number).padStart(2, "0")}
        </span>
      )}
      <h3 className="app-library__card-title">
        <Link href={`/library/${article.subSkill}`} className="app-library__entry">
          {article.title[lang]}
        </Link>
      </h3>
      <p className="app-library__card-summary">
        <Cited text={article.summary[lang]} lang={article.lang} />
      </p>
    </li>
  );
}
