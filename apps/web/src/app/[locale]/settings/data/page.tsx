import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { DataSettings } from "../../../../components/data/DataSettings";

export async function generateMetadata({ params }: PageProps<"/[locale]/settings/data">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "data" });
  return { title: t("title") };
}

export default function DataSettingsPage({ params }: PageProps<"/[locale]/settings/data">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("data");

  return (
    <section className="app-stack app-island">
      <h1 className="app-hero__title">{t("title")}</h1>
      <DataSettings />
    </section>
  );
}
