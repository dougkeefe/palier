import type { LatestExamResult } from "@palier/app";
import { formId, sessionId } from "@palier/domain";
import type { BandOutcome } from "@palier/engine";
import { FIXTURE_BANK } from "@palier/testing/in-memory";
import { describe, expect, it } from "vitest";

import { examReadiness } from "./readiness";

const [FORM] = FIXTURE_BANK.forms ?? [];
if (FORM === undefined) throw new Error("the fixture bank ships forms");

const latest = (outcome: BandOutcome): LatestExamResult => ({
  run: {
    id: sessionId("r-9"),
    formId: formId(FORM.id),
    startedAt: "2026-01-01T00:00:00.000Z",
    answers: [],
    flagged: [],
    elapsedMs: 1,
    checkpointedAt: "2026-01-01T00:00:00.000Z",
    submittedAt: "2026-01-01T01:00:00.000Z",
  },
  form: FORM,
  result: { outcome, items: [] },
});

describe("examReadiness", () => {
  it("names the band, the raw score and the band's own cut: 'C, 39 of 50. C starts at 38.'", () => {
    const view = examReadiness(
      latest({ band: "C", rank: 3, raw: 39, scored: 50, bandMin: 38, bandMax: 44, next: { band: "E", min: 45, pointsAway: 6 } }),
    );
    expect(view).toEqual({ runId: "r-9", band: "C", raw: 39, scored: 50, cutBand: "C", cutMin: 38 });
  });

  it("names the next band's cut from the bottom band, since 'X starts at 0' says nothing", () => {
    const view = examReadiness(
      latest({ band: "X", rank: 0, raw: 5, scored: 50, bandMin: 0, bandMax: 17, next: { band: "A", min: 18, pointsAway: 13 } }),
    );
    expect(view).toMatchObject({ band: "X", cutBand: "A", cutMin: 18 });
  });

  it("names the top band's own cut", () => {
    const view = examReadiness(latest({ band: "E", rank: 4, raw: 50, scored: 50, bandMin: 45, bandMax: 50, next: null }));
    expect(view).toMatchObject({ cutBand: "E", cutMin: 45 });
  });
});
