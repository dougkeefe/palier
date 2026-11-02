"use client";

import { Button } from "@palier/ui";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, type Ref, useEffect, useId, useRef } from "react";

import { estimateText } from "../../features/key/spend-view";
import { keyStepCosts, keyStepFinish } from "../../features/onboarding/key-step";
import type { Container } from "../../lib/container";
import { ExplainerVideo } from "../key/ExplainerVideo";
import { KeyEntry, useKeyEntry } from "../key/KeyEntry";
import { KeyGuideSteps } from "../key/KeyGuideSteps";

/**
 * Onboarding's key step, the fifth (product-requirements.md §8.1 as amended, progress.md D220, D224, D269), in the order
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
 * own way on, beside the wizard's `progress`; Back is the wizard's, at the top of the card (D269). On a desktop screen its
 * three parts, why, how and the key, stand in three columns, in reading order, so it fits without scrolling (D271). It stays
 * skippable: drills, review and mock exams need no key. Either way on leads to the ready card, the last step.
 */
export function KeyStep({
  useCases,
  headingRef,
  progress,
  onNext,
}: {
  readonly useCases: Container["useCases"];
  readonly headingRef: Ref<HTMLHeadingElement>;
  /** The wizard's dots and "Step 5 of 6", at the start of the step's last row. */
  readonly progress: ReactNode;
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
      <div className="app-stack app-key-step__intro">
        <div className="app-onboarding__head">
          <h2 ref={headingRef} tabIndex={-1} className="app-step-heading">
            {t("keyHeading")}
          </h2>
        </div>
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
      </div>

      <section className="app-stack app-key-step__how" aria-labelledby={`${id}-how`}>
        <h3 id={`${id}-how`}>{t("keyHowHeading")}</h3>
        <div ref={video}>
          <ExplainerVideo />
        </div>
        <details className="app-key-step__more">
          <summary>{t("keyHowRead")}</summary>
          <KeyGuideSteps pasteInto="below" />
        </details>
      </section>

      <div className="app-stack app-key-step__entry">
        <KeyEntry entry={entry} heading="h3" />

        <div className="app-onboarding__bottom">
          {progress}
          <Button
            variant={finish.primary ? "primary" : "ghost"}
            {...(finish.primary ? { arrow: "next" as const } : {})}
            onClick={onNext}
          >
            {t(finish.label)}
          </Button>
        </div>
      </div>
    </div>
  );
}
