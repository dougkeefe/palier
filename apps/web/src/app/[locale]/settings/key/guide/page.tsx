import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { Link } from "../../../../../i18n/navigation";

/**
 * The one-page key guide §8.1 step 5 links to: creating a key and setting a spend limit on
 * OpenAI's own dashboard, which is the control that actually bounds the loss
 * (architecture.md §6.4). Static, so it works offline. The screenshots §8.1 asks for need a
 * real OpenAI account, and are a standing human item (progress.md D100).
 */
const OPENAI_BILLING = "https://platform.openai.com/settings/organization/billing/overview";
const OPENAI_KEYS = "https://platform.openai.com/api-keys";
const OPENAI_LIMITS = "https://platform.openai.com/settings/organization/limits";

export async function generateMetadata({ params }: PageProps<"/[locale]/settings/key/guide">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "key" });
  return { title: t("guideTitle") };
}

export default function KeyGuidePage({ params }: PageProps<"/[locale]/settings/key/guide">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("key");

  return (
    <article className="app-prose">
      <h1 className="app-hero__title">{t("guideTitle")}</h1>
      <p>{t("guideIntro")}</p>
      <ol className="app-stack">
        <li>{t("guideStep1")}</li>
        <li>
          {t("guideStep2")}{" "}
          <a href={OPENAI_BILLING} className="app-link pl-focusable">
            {t("guideBilling")}
          </a>
        </li>
        <li>
          {t("guideStep3")}{" "}
          <a href={OPENAI_KEYS} className="app-link pl-focusable">
            {t("guideKeys")}
          </a>
        </li>
        <li>
          {t("guideStep4")}{" "}
          <a href={OPENAI_LIMITS} className="app-link pl-focusable">
            {t("guideLimits")}
          </a>
        </li>
        <li>{t("guideStep5")}</li>
      </ol>
      <Link href="/settings/key" className="pl-btn pl-btn--primary pl-focusable">
        {t("guideBack")}
      </Link>
    </article>
  );
}
