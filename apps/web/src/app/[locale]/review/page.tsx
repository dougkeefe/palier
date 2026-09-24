import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { ReviewScreen } from "../../../components/review/ReviewScreen";

export async function generateMetadata({ params }: PageProps<"/[locale]/review">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "review" });
  return { title: t("title") };
}

export default function ReviewPage({ params }: PageProps<"/[locale]/review">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("review");

  return (
    <section className="app-stack app-island">
      <h1 className="app-hero__title">{t("title")}</h1>
      <ReviewScreen />
    </section>
  );
}
