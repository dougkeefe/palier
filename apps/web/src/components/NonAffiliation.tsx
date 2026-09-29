import { useTranslations } from "next-intl";

/**
 * The non-affiliation statement, in one place (R5). product-requirements.md §2 wants it
 * "in the footer of every page, in the onboarding, and in the results screen next to any
 * band estimate", and Gate K kept all three (progress.md D145). Every surface renders this
 * component rather than the key, so the wording cannot drift between them.
 *
 * `footer` is the footer's quiet line; `inline` sits beside a band estimate or at the head
 * of onboarding, where it has to be seen without shouting over the result it qualifies.
 */
export function NonAffiliation({ variant = "inline" }: { variant?: "footer" | "inline" }) {
  const t = useTranslations("footer");
  // The footer's line keeps its original class, which the smoke and offline specs find it by.
  const className = variant === "footer" ? "app-nonaffiliation app-footer__disclaimer" : "app-nonaffiliation app-nonaffiliation--inline";
  return <p className={className}>{t("nonAffiliation")}</p>;
}
