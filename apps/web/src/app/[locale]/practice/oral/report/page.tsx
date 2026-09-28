import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { OralReport } from "../../../../../components/oral/OralReport";

export async function generateMetadata({ params }: PageProps<"/[locale]/practice/oral/report">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "oralReport" });
  return { title: t("title") };
}

// The report on a spoken session (product-requirements.md §8.6, progress.md D126). A static route
// like every other screen; the session is named in `?session=`, which the island reads, as the
// exam results name their run, so the worker serves it offline with `ignoreSearch`.
export default function OralReportPage({ params }: PageProps<"/[locale]/practice/oral/report">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("oralReport");

  return (
    <section className="app-stack app-island">
      <h1 className="app-hero__title">{t("title")}</h1>
      <OralReport />
    </section>
  );
}
