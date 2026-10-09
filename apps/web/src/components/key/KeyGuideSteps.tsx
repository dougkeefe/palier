import { useTranslations } from "next-intl";

import { OPENAI_BILLING, OPENAI_KEYS, OPENAI_LIMITS, OPENAI_PLATFORM } from "../../features/key/openai-links";

/**
 * Getting an OpenAI key, written out (progress.md D100, D220): the explainer video's six steps in its
 * order, then a seventh it does not show, the monthly limit, which is what actually bounds the spend
 * (architecture.md §6.4). Shared by the key guide and onboarding's key step, so the two never differ.
 * Only the sixth step's "where to paste" depends on the page. OpenAI's pages open in a new tab, so a
 * user mid-onboarding never loses the step they were on.
 */
export function KeyGuideSteps({ pasteInto }: { readonly pasteInto: "below" | "keyScreen" }) {
  const t = useTranslations("key");
  const link = (href: string, label: string) => (
    <a href={href} className="app-link pl-focusable" target="_blank" rel="noreferrer">
      {label}
      <span className="pl-visually-hidden"> {t("newTab")}</span>
    </a>
  );
  return (
    <ol className="app-stack">
      <li>
        {t("guideStep1")} {link(OPENAI_PLATFORM, t("guidePlatform"))}
      </li>
      <li>
        {t("guideStep2")} {link(OPENAI_BILLING, t("guideBilling"))}
      </li>
      <li>
        {t("guideStep3")} {link(OPENAI_KEYS, t("guideKeys"))}
      </li>
      <li>{t("guideStep4")}</li>
      <li>{t("guideStep5")}</li>
      <li>{t(pasteInto === "below" ? "guideStep6Below" : "guideStep6")}</li>
      <li>
        {t("guideStep7")} {link(OPENAI_LIMITS, t("guideLimits"))}
      </li>
    </ol>
  );
}
