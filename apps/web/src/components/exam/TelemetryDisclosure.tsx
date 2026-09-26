"use client";

import { useTranslations } from "next-intl";

/**
 * Exactly what opt-in telemetry sends and what it never sends (product-requirements.md
 * §15, progress.md D92), in one place, so the post-exam prompt and the data settings
 * say the same thing. The five "sent" lines are the five fields of a `TelemetryEvent`.
 */
export function TelemetryDisclosure({ headingLevel }: { headingLevel: "h3" | "h4" }) {
  const t = useTranslations("telemetry");
  const Heading = headingLevel;
  return (
    <>
      <Heading className="app-feedback__subheading">{t("sentTitle")}</Heading>
      <ul className="app-list">
        <li>{t("sentItem")}</li>
        <li>{t("sentCorrect")}</li>
        <li>{t("sentTime")}</li>
        <li>{t("sentRest")}</li>
        <li>{t("sentBank")}</li>
      </ul>
      <Heading className="app-feedback__subheading">{t("notSentTitle")}</Heading>
      <p>{t("notSent")}</p>
    </>
  );
}
