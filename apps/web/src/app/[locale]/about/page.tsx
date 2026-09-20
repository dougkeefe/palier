import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

// "What this is, what it is not" (product-requirements.md §7). Reinforces R5
// beyond the footer disclaimer, and gives the shell a second real route to
// assert accessibility against.
export default function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = use(params);
  setRequestLocale(locale);

  const t = useTranslations("about");

  return (
    <article className="app-prose">
      <h1 className="app-hero__title">{t("title")}</h1>
      <p>{t("independence")}</p>
      <p>{t("noRealItems")}</p>
    </article>
  );
}
