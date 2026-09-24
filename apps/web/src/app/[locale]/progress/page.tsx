import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { ProgressScreen } from "../../../components/progress/ProgressScreen";

export async function generateMetadata({ params }: PageProps<"/[locale]/progress">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "progress" });
  return { title: t("title") };
}

export default function ProgressPage({ params }: PageProps<"/[locale]/progress">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("progress");

  return (
    <section className="app-stack app-island">
      <h1 className="app-hero__title">{t("title")}</h1>
      <ProgressScreen />
    </section>
  );
}
