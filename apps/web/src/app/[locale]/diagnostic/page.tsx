import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { DiagnosticLauncher } from "../../../components/diagnostic/DiagnosticLauncher";

export async function generateMetadata({ params }: PageProps<"/[locale]/diagnostic">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "diagnostic" });
  return { title: t("title") };
}

// The diagnostic (product-requirements.md §6.2).
export default function DiagnosticPage({ params }: PageProps<"/[locale]/diagnostic">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("diagnostic");

  return (
    <section className="app-stack app-island">
      <h1 className="app-hero__title">{t("title")}</h1>
      <DiagnosticLauncher />
    </section>
  );
}
