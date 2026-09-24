import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

import { OnboardingWizard } from "../../../components/onboarding/OnboardingWizard";

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
