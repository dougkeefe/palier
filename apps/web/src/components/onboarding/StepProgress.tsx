import { useTranslations } from "next-intl";

import { stepDots } from "../../features/onboarding/onboarding";

/**
 * Onboarding's progress (D269): a dot per step, the current one drawn long, and "Step 2 of 6" beside them. The words
 * carry the step, so the dots are hidden from assistive technology.
 */
export function StepProgress({ index, total }: { index: number; total: number }) {
  const t = useTranslations("start");
  return (
    <div className="app-onboarding__progress">
      <span className="app-onboarding__dots" aria-hidden="true">
        {stepDots(index, total).map((dot, i) => (
          <span key={i} className={`app-onboarding__dot app-onboarding__dot--${dot}`} />
        ))}
      </span>
      <span className="app-onboarding__count">{t("stepOf", { current: index + 1, total })}</span>
    </div>
  );
}
