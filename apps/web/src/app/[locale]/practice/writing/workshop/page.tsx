import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { WritingWorkshop } from "../../../../../components/writing/WritingWorkshop";

export async function generateMetadata({ params }: PageProps<"/[locale]/practice/writing/workshop">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "writing" });
  return { title: t("title") };
}

// The writing workshop (product-requirements.md §8.7, progress.md D105–D108). A static
// route, so the service worker precaches it by name as it does the drills (D60).
export default function WritingWorkshopPage({ params }: PageProps<"/[locale]/practice/writing/workshop">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("writing");

  return (
    <section className="app-stack app-island">
      <h1 className="app-hero__title">{t("title")}</h1>
      <WritingWorkshop />
    </section>
  );
}
