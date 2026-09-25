import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { ExamResults } from "../../../../components/exam/ExamResults";

export async function generateMetadata({ params }: PageProps<"/[locale]/exam/results">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "exam" });
  return { title: t("resultsTitle") };
}

// A mock exam's results (product-requirements.md §8.5), for the run named in the
// query string, rescored in the browser (ADR 16). Static, so it is precached (D60).
export default function ExamResultsPage({ params }: PageProps<"/[locale]/exam/results">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("exam");

  return (
    <section className="app-stack app-island">
      <h1 className="app-hero__title">{t("resultsTitle")}</h1>
      <ExamResults />
    </section>
  );
}
