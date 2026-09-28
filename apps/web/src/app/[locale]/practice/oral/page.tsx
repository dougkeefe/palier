import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { OralPractice } from "../../../../components/oral/OralPractice";

export async function generateMetadata({ params }: PageProps<"/[locale]/practice/oral">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "oral" });
  return { title: t("title") };
}

// Spoken practice, practice mode (product-requirements.md §8.6, progress.md D119). A static
// route like every other screen; the session itself needs the network and a key.
export default function OralPracticePage({ params }: PageProps<"/[locale]/practice/oral">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("oral");

  return (
    <section className="app-stack app-island">
      <h1 className="app-hero__title">{t("title")}</h1>
      <OralPractice />
    </section>
  );
}
