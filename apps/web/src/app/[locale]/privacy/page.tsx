import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { Link } from "../../../i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return { title: t("title") };
}

/** The never-synced list, in the settings' own words (architecture.md §9.4: "appears verbatim"). */
const NEVER_KEYS = ["neverKey", "neverAudio", "neverTranscripts", "neverSubmissions", "neverCosts"] as const;

/**
 * The privacy notice (architecture.md §12, progress.md D145): what the server holds, what
 * is never held, what is deleted on a schedule (§9.4's 180 days, built in D138), the third
 * parties, and the user's controls. Drafted by the agent at Gate K; the human reads it at
 * Gate L. A change to what is held or kept changes this page in the same pull request.
 */
export default function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = use(params);
  setRequestLocale(locale);

  const t = useTranslations("privacy");
  const tSync = useTranslations("sync");

  return (
    <article className="app-prose">
      <h1 className="app-hero__title">{t("title")}</h1>
      <p>{t("intro")}</p>

      <h2>{t("heldTitle")}</h2>
      <p>{t("held")}</p>

      <h2>{t("neverTitle")}</h2>
      <p>{t("neverIntro")}</p>
      <ul>
        {NEVER_KEYS.map((key) => (
          <li key={key}>{tSync(key)}</li>
        ))}
      </ul>
      <p>{t("neverServer")}</p>

      <h2>{t("deletedTitle")}</h2>
      <p>{t("deleted")}</p>

      <h2>{t("thirdTitle")}</h2>
      <p>{t("third")}</p>

      <h2>{t("noTrackingTitle")}</h2>
      <p>{t("noTracking")}</p>

      <h2>{t("rightsTitle")}</h2>
      <p>{t("rights")}</p>
      <p className="app-actions">
        <Link href="/settings/data" className="app-link pl-focusable">
          {t("dataLink")}
        </Link>
        <Link href="/settings/sync" className="app-link pl-focusable">
          {t("syncLink")}
        </Link>
      </p>
    </article>
  );
}
