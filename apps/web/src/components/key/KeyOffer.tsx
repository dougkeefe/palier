import { useTranslations } from "next-intl";
import type { ReactNode, Ref } from "react";

import { Link } from "../../i18n/navigation";

/**
 * Step 5 of onboarding, the optional key (product-requirements.md §8.1): three lines on what
 * a key unlocks, what it costs, and that it stays in the browser, then the guide. Shared by
 * the wizard's last step on the skip path and the diagnostic's readout (progress.md D100),
 * which supply the heading level and the actions, since one ends a form and the other a page.
 *
 * The copy is honest about ADR 3 as it stands: no screen yet sends the key anywhere but OpenAI.
 * Studio mode is in 1.0 (progress.md D165), and its route, `POST /api/realtime/secret`, is built
 * (Phase 6 Slice 1) but called by no screen. The realtime exception joins this copy in the same
 * pull request as the studio screen that uses it (D173).
 */
export function KeyOffer({
  heading,
  headingRef,
  actions,
}: {
  readonly heading: "h2" | "h3";
  readonly headingRef?: Ref<HTMLHeadingElement>;
  readonly actions: ReactNode;
}) {
  const t = useTranslations("key");
  const Heading = heading;
  return (
    <div className="app-stack">
      <Heading ref={headingRef} tabIndex={-1} className="app-step-heading">
        {t("offerHeading")}
      </Heading>
      <ul className="app-stack">
        <li>{t("offerUnlocks")}</li>
        <li>{t("offerCosts")}</li>
        <li>{t("offerStays")}</li>
      </ul>
      <Link href="/settings/key/guide" className="app-link pl-focusable">
        {t("guideLink")}
      </Link>
      <div className="app-actions">{actions}</div>
    </div>
  );
}
