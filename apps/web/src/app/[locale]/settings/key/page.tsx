import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { KeySettings } from "../../../../components/key/KeySettings";

export async function generateMetadata({ params }: PageProps<"/[locale]/settings/key">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "key" });
  return { title: t("title") };
}

export default function KeySettingsPage({ params }: PageProps<"/[locale]/settings/key">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("key");

  return (
    <section className="app-stack app-island">
      <h1 className="app-hero__title">{t("title")}</h1>
      <KeySettings />
    </section>
  );
}
