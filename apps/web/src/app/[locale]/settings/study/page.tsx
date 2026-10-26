import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { StudySettings } from "../../../../components/settings/StudySettings";

export async function generateMetadata({ params }: PageProps<"/[locale]/settings/study">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "studySettings" });
  return { title: t("title") };
}

export default function StudySettingsPage({ params }: PageProps<"/[locale]/settings/study">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("studySettings");

  return (
    <section className="app-stack app-island">
      <h1 className="app-hero__title">{t("title")}</h1>
      <StudySettings />
    </section>
  );
}
