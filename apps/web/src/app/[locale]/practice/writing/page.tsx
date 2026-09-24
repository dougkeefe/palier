import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { PracticeSession } from "../../../../components/practice/PracticeSession";

export async function generateMetadata({ params }: PageProps<"/[locale]/practice/writing">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "skills" });
  return { title: t("writing") };
}

// A writing drill (product-requirements.md §8.3). One static route per skill rather
// than a dynamic segment, so the service worker can precache it by name (D60).
export default function WritingDrillPage({ params }: PageProps<"/[locale]/practice/writing">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("skills");

  return (
    <section className="app-stack">
      <h1 className="app-hero__title">{t("writing")}</h1>
      <PracticeSession skill="writing" mode="drill" />
    </section>
  );
}
