"use client";

import { TARGET_BANDS } from "@palier/domain";
import type { SkillTrend } from "@palier/engine";
import { BandMeter } from "@palier/ui";
import { useTranslations } from "next-intl";

import { trendLines } from "../../features/trend/trend-lines";

/**
 * A skill's practice trend as one meter per band tag (product-requirements.md §8.2
 * Zone A): accuracy with its Wilson interval, or, below `MIN_EVIDENCE`, how many more
 * answers are needed (R10). Never a band letter: drills are not a calibrated
 * instrument (§8.2).
 */
export function TrendMeters({ trend }: { trend: SkillTrend }) {
  const tBands = useTranslations("bands");
  const t = useTranslations("diagnostic");
  return (
    <div className="app-stack">
      {trendLines(trend, TARGET_BANDS).map((line) => (
        <BandMeter
          key={line.band}
          label={tBands("items", { band: line.band })}
          valueText={
            line.estimate === null
              ? t("insufficient", { attempted: line.attempted, needed: line.needed })
              : t("estimate", line.percents)
          }
          estimate={line.estimate}
        />
      ))}
    </div>
  );
}
