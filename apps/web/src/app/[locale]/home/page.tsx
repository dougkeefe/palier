import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

import { HomeDashboard } from "../../../components/home/HomeDashboard";

// Today's plan and the readiness card (product-requirements.md §8.2).
export default function TodayPage({ params }: PageProps<"/[locale]/home">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("today");

  return (
    <section className="app-stack">
      <h1 className="app-hero__title">{t("title")}</h1>
      <HomeDashboard />
    </section>
  );
}
