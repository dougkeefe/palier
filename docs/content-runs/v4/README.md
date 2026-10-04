# Content run v4: written by Claude, reviewed blind by Claude

The record of how `content/bank/v4` was made (progress.md D203–D207, ADR 24). Read it alongside the committed
inputs: `content/authored/claude-*.json` (the contributions) and `content/factory/reviews/` (the verdicts).

- **`authoring-brief.md`**: what every author instance was told. Each instance took one assignment, either
  a reading topic (5 passages × 5 questions) or a writing sub-skill (33 items), and ran
  `palier-factory check-authored` until it was clean. The 20 oral scenarios had their own assignment, which
  used this brief for register and bands.
- **`review-brief.md`**: what every reviewer instance was told. A reviewer saw only the blind requests from
  `palier-factory review-requests`, never the item files. No instance reviewed items it had written.
- **`eval/`**: the reviewer measured, as ADR 19 asked and ADR 24 keeps. The factory's own eval set is
  written in placeholder French with the key's option marked, so it cannot measure a real reviewer. Instead
  a separate instance, which reviewed nothing, wrote 60 real-French items in six classes of ten:
  - five defect classes: two defensible keys, wrong key, register, mis-tagged band, ambiguous;
  - one class of clean controls.

  The reviewers judged them under the same brief, blind, and the domain's `gateReasons` scored each verdict.
  `score.json` holds the result.

The defects and the reviewer come from the same model family. So the eval's figure shows what Claude catches
in Claude's own mistakes; it does not show what a second family would catch (ADR 24, *Consequences*).
