import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { GenerateSet } from "../../../../../components/generate/GenerateSet";

export async function generateMetadata({ params }: PageProps<"/[locale]/practice/writing/generate">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "generate" });
  return { title: t("title") };
}

// "Generate a fresh set" (architecture.md §8.3, progress.md D110–D111), reached from the
// writing drill. Its own static route rather than a panel beside the drill, because a drill
// listens for §8.3's keys on the whole window and two on one page would both answer.
export default function GenerateSetPage({ params }: PageProps<"/[locale]/practice/writing/generate">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("generate");

  return (
    <section className="app-stack app-island">
      <h1 className="app-hero__title">{t("title")}</h1>
      <GenerateSet />
    </section>
  );
}
