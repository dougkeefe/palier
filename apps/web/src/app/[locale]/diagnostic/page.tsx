import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

import { DiagnosticLauncher } from "../../../components/diagnostic/DiagnosticLauncher";

// The diagnostic (product-requirements.md §6.2).
export default function DiagnosticPage({ params }: PageProps<"/[locale]/diagnostic">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("diagnostic");

  return (
    <section className="app-stack">
      <h1 className="app-hero__title">{t("title")}</h1>
      <DiagnosticLauncher />
    </section>
  );
}
