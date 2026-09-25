import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { ExamPicker } from "../../../components/exam/ExamPicker";

export async function generateMetadata({ params }: PageProps<"/[locale]/exam">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "exam" });
  return { title: t("title") };
}

// The mock-exam picker (product-requirements.md §8.4, progress.md D84 ruling 12).
// Static, like every exam route, so the service worker can precache it (D60).
export default function ExamPage({ params }: PageProps<"/[locale]/exam">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("exam");

  return (
    <section className="app-stack app-island">
      <h1 className="app-hero__title">{t("title")}</h1>
      <p>{t("intro")}</p>
      <ExamPicker />
    </section>
  );
}
