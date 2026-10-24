import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { Translator } from "../../../../../components/translate/Translator";

export async function generateMetadata({ params }: PageProps<"/[locale]/practice/writing/translate">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "translate" });
  return { title: t("title") };
}

// The translator (progress.md D250). A static route, so the service worker precaches it by name
// as it does the workshop (D60).
export default function TranslatePage({ params }: PageProps<"/[locale]/practice/writing/translate">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("translate");

  return (
    <section className="app-stack app-island">
      <h1 className="app-hero__title">{t("title")}</h1>
      <Translator />
    </section>
  );
}
