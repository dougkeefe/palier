import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { OnboardingWizard } from "../../../components/onboarding/OnboardingWizard";

export async function generateMetadata({ params }: PageProps<"/[locale]/start">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "start" });
  return { title: t("title") };
}

// Onboarding (product-requirements.md §8.1): a static shell around the wizard island.
export default function StartPage({ params }: PageProps<"/[locale]/start">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("start");

  return (
    <section className="app-stack">
      <h1 className="app-hero__title">{t("title")}</h1>
      <OnboardingWizard />
    </section>
  );
}
