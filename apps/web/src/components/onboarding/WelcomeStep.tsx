import { Button } from "@palier/ui";
import { useTranslations } from "next-intl";
import type { ReactNode, Ref } from "react";

import { NonAffiliation } from "../NonAffiliation";

/**
 * Onboarding's first step (D269): a welcome in place of D224's direction question, whose English choice was disabled
 * and whose answer was never kept. What Palier is, and the non-affiliation statement (R5, PRD §2: "in the onboarding");
 * the owner cut the rest to the one line (D272). Continuing means a new user; under the way on, in small type, `bring`
 * offers the import and the pairing to the few who need them (D271).
 *
 * Outside the wizard's `<form>`, since the import and the pairing are forms of their own, so it carries its own way on.
 */
export function WelcomeStep({
  headingRef,
  progress,
  onNext,
  ready,
  bring,
}: {
  readonly headingRef: Ref<HTMLHeadingElement>;
  /** The wizard's dots and "Step 1 of 6", at the start of the step's last row. */
  readonly progress: ReactNode;
  readonly onNext: () => void;
  /** Whether the container is ready: until then the way on waits, as every other step's does. */
  readonly ready: boolean;
  /** The quiet ways to bring progress in, under the way on. */
  readonly bring: ReactNode;
}) {
  const t = useTranslations("start");
  return (
    <div className="app-stack app-onboarding__body">
      <div className="app-onboarding__head">
        <h2 ref={headingRef} tabIndex={-1} className="app-step-heading">
          {t("welcomeHeading")}
        </h2>
        <p className="app-onboarding__lead">{t("welcomeIntro")}</p>
      </div>
      <NonAffiliation />
      <div className="app-onboarding__bottom">
        {progress}
        <Button arrow="next" onClick={onNext} disabled={!ready}>
          {t("next")}
        </Button>
      </div>
      {bring}
    </div>
  );
}
