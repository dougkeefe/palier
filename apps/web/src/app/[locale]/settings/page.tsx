import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { Card } from "@palier/ui";

import { SETTINGS_ITEMS } from "../../../features/settings/settings-nav";
import { Link } from "../../../i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/settings">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });
  return { title: t("title") };
}

/**
 * The settings overview (progress.md D264), where the header's gear and the footer's link lead: a card for each
 * settings screen, saying what it holds. Static, so it needs no island.
 */
export default function SettingsPage({ params }: PageProps<"/[locale]/settings">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("settings");

  return (
    <section className="app-stack">
      <h1 className="app-hero__title">{t("title")}</h1>
      <p>{t("intro")}</p>
      <ul className="app-settings-overview">
        {SETTINGS_ITEMS.map((item) => (
          <li key={item.key}>
            <Card className="app-settings-card">
              <h2 className="app-settings-card__title">
                <Link href={item.href} className="app-link pl-focusable">
                  {t(`items.${item.key}.name`)}
                </Link>
              </h2>
              <p className="app-settings-card__description">{t(`items.${item.key}.description`)}</p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
