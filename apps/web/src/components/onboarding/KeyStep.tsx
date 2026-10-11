"use client";

import { Button } from "@palier/ui";
import { useLocale, useTranslations } from "next-intl";
import { type Ref, useEffect, useId, useRef } from "react";

import { estimateText } from "../../features/key/spend-view";
import { keyStepCosts, keyStepFinish } from "../../features/onboarding/key-step";
import { Link } from "../../i18n/navigation";
import type { Container } from "../../lib/container";
import { ExplainerVideo } from "../key/ExplainerVideo";
import { KeyEntry, useKeyEntry } from "../key/KeyEntry";
import { KeyGuideSteps } from "../key/KeyGuideSteps";

/**
 * Onboarding's key step, the fourth (product-requirements.md §8.1 as amended, progress.md D220, D224), in the order
 * the owner asked for:
 * 1. **why** Palier runs on the user's own key: it keeps Palier free, and it is safer. Where the key
 *    goes is `key.offerStays`, the one sentence that carries studio mode's exception (D186), so it
 *    cannot drift from the key screen's;
 * 2. **what it costs**: OpenAI bills the user, and a typical use of each feature a new user meets, priced
 *    from `pricing.json` (`keyStepCosts`);
 * 3. **how**: the owner's video, the same steps written out, and the key's own form (`KeyEntry`), which
 *    checks the key as soon as it is saved, so a missing billing step shows here.
 *
 * Why and what it costs are disclosures, closed until asked, and the step scrolls the video into view as it opens,
 * so the video is the first thing in sight (D222).
 *
 * It is rendered outside the wizard's `<form>`, since `KeyEntry` is a form of its own, and carries its
 * own actions. It stays skippable: drills, review and mock exams need no key. Either way on leads to the
 * placement, the last step.
 */
export function KeyStep({
  useCases,
  headingRef,
  onBack,
  onNext,
}: {
  readonly useCases: Container["useCases"];
  readonly headingRef: Ref<HTMLHeadingElement>;
  readonly onBack: () => void;
  readonly onNext: () => void;
}) {
  const t = useTranslations("start");
  const tKey = useTranslations("key");
  const locale = useLocale();
  const entry = useKeyEntry(useCases, { checkOnSave: true });
  const costs = keyStepCosts(useCases.featureCosts());
  const held = entry.state.phase === "saved";
  const finish = keyStepFinish(held);
  const id = useId();
  const video = useRef<HTMLDivElement>(null);

  // As the step opens, the least scroll that shows the whole video, none when it already shows (D222). This runs
  // before the wizard focuses the heading, which then stays in view and moves nothing.
  useEffect(() => {
    video.current?.scrollIntoView({ block: "nearest" });
  }, []);

  return (
    <div className="app-stack app-key-step">
      <h2 ref={headingRef} tabIndex={-1} className="app-step-heading">
        {t("keyHeading")}
      </h2>
      <p>{t("keyIntro")}</p>

      <div className="app-key-step__more-group">
        <details className="app-key-step__more">
          <summary>{t("keyWhyHeading")}</summary>
          <div className="app-stack">
            <p>{t("keyWhyFree")}</p>
            <p>{t("keyWhySafer")}</p>
            <p>{tKey("offerStays")}</p>
          </div>
        </details>

        <details className="app-key-step__more">
          <summary>{t("keyCostHeading")}</summary>
          <div className="app-stack">
            <p>{t("keyCostWho")}</p>
            <ul className="app-list">
              {costs.map((cost) => (
                <li key={cost.feature}>
                  {t(cost.perMinute ? "keyCostMinute" : "keyCostUse", {
                    feature: tKey(`feature_${cost.feature}`),
                    amount: estimateText(cost.estimateUsd, locale),
                  })}
                </li>
              ))}
            </ul>
            <p>{t("keyCostLimit")}</p>
            <p className="app-muted">{t("keyCostFree")}</p>
          </div>
        </details>
      </div>

      <section className="app-stack" aria-labelledby={`${id}-how`}>
        <h3 id={`${id}-how`}>{t("keyHowHeading")}</h3>
        <div ref={video}>
          <ExplainerVideo />
        </div>
        <details className="app-key-step__more">
          <summary>{t("keyHowRead")}</summary>
          <KeyGuideSteps pasteInto="below" />
        </details>
        <Link href="/settings/key/guide" className="app-link pl-focusable" target="_blank" rel="noopener">
          {t("keyHowGuide")}
          <span className="pl-visually-hidden"> {tKey("newTab")}</span>
        </Link>
      </section>

      <KeyEntry entry={entry} heading="h3" />

      <div className="app-actions">
        <Button variant="secondary" onClick={onBack}>
          {t("back")}
        </Button>
        <Button
          variant={finish.primary ? "primary" : "ghost"}
          {...(finish.primary ? { arrow: "next" as const } : {})}
          onClick={onNext}
        >
          {t(finish.label)}
        </Button>
      </div>
    </div>
  );
}
