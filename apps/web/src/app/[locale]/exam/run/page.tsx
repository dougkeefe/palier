import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { ExamRunner } from "../../../../components/exam/ExamRunner";

export async function generateMetadata({ params }: PageProps<"/[locale]/exam/run">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "exam" });
  return { title: t("runTitle") };
}

// The mock-exam runner (product-requirements.md §8.4). The run is named in the
// query string and read in the browser, so the route stays static and precached
// (D60). `data-mode="exam"` applies the muted token set and switches motion off
// (D84 ruling 11, D86).
export default function ExamRunPage({ params }: PageProps<"/[locale]/exam/run">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("exam");

  return (
    <section className="app-stack app-island app-exam-page" data-mode="exam">
      <h1 className="app-hero__title">{t("runTitle")}</h1>
      <ExamRunner />
    </section>
  );
}
