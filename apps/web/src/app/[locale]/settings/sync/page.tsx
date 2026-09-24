import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { SyncSettings } from "../../../../components/sync/SyncSettings";

export async function generateMetadata({ params }: PageProps<"/[locale]/settings/sync">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sync" });
  return { title: t("title") };
}

export default function SyncSettingsPage({ params }: PageProps<"/[locale]/settings/sync">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("sync");

  return (
    <section className="app-stack app-island">
      <h1 className="app-hero__title">{t("title")}</h1>
      <SyncSettings />
    </section>
  );
}
