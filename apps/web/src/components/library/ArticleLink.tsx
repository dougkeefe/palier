import type { SubSkill } from "@palier/domain";
import { useTranslations } from "next-intl";

import { articleHref } from "../../features/library/links";
import { Link } from "../../i18n/navigation";

/**
 * "Read about {subSkill}": a written-expression item's way from its explanation to its library
 * article (progress.md D159), and nothing for a reading item. In a drill it opens a new tab, so
 * the session in progress is never left; the exam review opens it in place.
 */
export function ArticleLink({ subSkill, newTab = false }: { subSkill: SubSkill; newTab?: boolean }) {
  const t = useTranslations("library");
  const tSub = useTranslations("subSkills");
  const href = articleHref(subSkill);
  if (href === null) return null;
  return (
    <p className="app-feedback__library">
      <Link
        href={href}
        className="app-link pl-focusable"
        {...(newTab ? { target: "_blank", rel: "noopener" } : {})}
      >
        {t("readAbout", { subSkill: tSub(subSkill) })}
        {newTab ? <span className="pl-visually-hidden"> {t("newTab")}</span> : null}
      </Link>
    </p>
  );
}
