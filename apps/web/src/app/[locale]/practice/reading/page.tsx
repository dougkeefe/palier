import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

import { PracticeSession } from "../../../../components/practice/PracticeSession";

// A reading drill (product-requirements.md §8.3). One static route per skill rather
// than a dynamic segment, so the service worker can precache it by name (D60).
export default function ReadingDrillPage({ params }: PageProps<"/[locale]/practice/reading">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("skills");

  return (
    <section className="app-stack">
      <h1 className="app-hero__title">{t("reading")}</h1>
      <PracticeSession skill="reading" mode="drill" />
    </section>
  );
}
