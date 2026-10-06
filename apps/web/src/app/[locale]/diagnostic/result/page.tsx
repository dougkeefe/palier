import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { DiagnosticResultPage as ResultIsland } from "../../../../components/diagnostic/DiagnosticResultPage";

export async function generateMetadata({ params }: PageProps<"/[locale]/diagnostic/result">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "diagnostic" });
  return { title: t("pageTitle") };
}

// The diagnostic's result again (product-requirements.md §6.2, ADR 25), from today's card. A static route
// like every other screen; the skill is named in `?skill=`, which the island reads, as the oral report
// names its session, so the worker serves it offline with `ignoreSearch`.
export default function DiagnosticResultPage({ params }: PageProps<"/[locale]/diagnostic/result">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("diagnostic");

  return (
    <section className="app-stack app-island">
      <h1 className="app-hero__title">{t("pageTitle")}</h1>
      <ResultIsland />
    </section>
  );
}
