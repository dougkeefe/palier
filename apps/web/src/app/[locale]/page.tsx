import { buttonClass } from "@palier/ui";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

import { Link } from "../../i18n/navigation";

// The unauthenticated landing page (product-requirements.md §7: marketing plus
// the non-affiliation posture, the latter carried by the shell footer).
export default function HomePage({ params }: PageProps<"/[locale]">) {
  // Unwrap the route param so this static segment renders per locale. `use`
  // keeps the component synchronous, so next-intl's `useTranslations` hook can
  // run (an async component would need `getTranslations` instead).
  const { locale } = use(params);
  setRequestLocale(locale);

  const t = useTranslations("home");

  return (
    <section className="app-hero">
      <h1 className="app-hero__title">{t("title")}</h1>
      <p className="app-hero__tagline">{t("tagline")}</p>
      <Link href="/about" className={`${buttonClass("primary")} pl-focusable`}>
        {t("cta")}
      </Link>
    </section>
  );
}
