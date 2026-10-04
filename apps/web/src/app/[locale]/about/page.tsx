import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { NonAffiliation } from "../../../components/NonAffiliation";
import { Link } from "../../../i18n/navigation";
import { CONTRIBUTING_URL, REPOSITORY_URL } from "../../../lib/report";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("title") };
}

/**
 * "What this is, what it is not, who made it, licence" (product-requirements.md §7), and
 * §13.0's "the about page says all of this plainly": a machine-written bank, gated by
 * automation with no person reading every item (architecture.md §20 Q3), and how the product
 * is honest about that. Drafted by the agent at Gate K; the human reads it at Gate L
 * (progress.md D145). `bankToday` went when the full-volume bank shipped, written by Claude
 * and reviewed blind by Claude (D203, D204).
 */
export default function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = use(params);
  setRequestLocale(locale);

  const t = useTranslations("about");

  return (
    <article className="app-prose">
      <h1 className="app-hero__title">{t("title")}</h1>
      <p>{t("independence")}</p>
      <p>{t("noRealItems")}</p>

      <h2>{t("whatTitle")}</h2>
      <p>{t("what")}</p>

      <h2>{t("notTitle")}</h2>
      <ul>
        <li>{t("notCourse")}</li>
        <li>{t("notPredictor")}</li>
        <li>{t("notOfficial")}</li>
      </ul>

      <h2>{t("bankTitle")}</h2>
      <p>{t("bankMachine")}</p>
      <p>{t("bankHonest")}</p>

      <h2>{t("whoTitle")}</h2>
      <p>{t("who")}</p>

      <h2>{t("licenceTitle")}</h2>
      <p>{t("licence")}</p>

      <NonAffiliation />

      <h2>{t("linksTitle")}</h2>
      <ul>
        <li>
          <Link href="/privacy" className="app-link pl-focusable">
            {t("privacyLink")}
          </Link>
        </li>
        <li>
          <a href={CONTRIBUTING_URL} className="app-link pl-focusable">
            {t("contributeLink")}
          </a>
        </li>
        <li>
          <a href={REPOSITORY_URL} className="app-link pl-focusable">
            {t("sourceLink")}
          </a>
        </li>
      </ul>
    </article>
  );
}
