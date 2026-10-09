import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { ExplainerVideo } from "../../../../../components/key/ExplainerVideo";
import { KeyGuideSteps } from "../../../../../components/key/KeyGuideSteps";
import { Link } from "../../../../../i18n/navigation";

/**
 * The one-page key guide §8.1 step 5 links to: creating a key and setting a spend limit on
 * OpenAI's own dashboard, which is the control that actually bounds the loss
 * (architecture.md §6.4). The screenshots §8.1 asked for are the owner's video (progress.md D220),
 * with the same steps written out beneath it. The page is static and the steps work offline; the
 * video needs the network, since the service worker never caches it.
 */

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
      <ExplainerVideo />
      <KeyGuideSteps pasteInto="keyScreen" />
      <Link href="/settings/key" className="pl-btn pl-btn--primary pl-focusable">
        {t("guideBack")}
      </Link>
    </article>
  );
}
