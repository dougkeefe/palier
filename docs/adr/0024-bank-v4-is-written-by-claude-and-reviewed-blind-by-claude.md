# ADR 24: Bank v4 is written by Claude and reviewed blind by separate Claude instances

**Status:** Accepted
**Date:** 2026-10-04
**Supersedes:** ADR 19

## Context

ADR 19 made Phase 1's quality gate fully automated. It had two parts. The first was adversarial review
"by a model from a different family than the drafter, blind to the intended key". The second was
deterministic validation. The full-volume run was to use the factory's OpenAI adapter on a funded key: one
model family drafting (`gpt-6-luna`), another reviewing (`gpt-6-sol`; `apps/factory/config/models.json`).
That run never happened (progress.md D54). Until now the bank has been the scripted provider's placeholder
text.

On 4 October 2026 the owner decided how the full run is done instead:

- **Claude writes the content itself**, and the OpenAI API is not used to generate it.
- **Separate Claude subagents review it blind.**
- The owner was offered three reviewers: OpenAI reviewing only, which would have kept the review
  cross-family; separate Claude instances; or no model review. They chose separate Claude instances,
  knowing writer and reviewer would then share a family.

ADR 19's *revisit when* reads: "A human reads a sample of the generated bank and disagrees with the
automated gate's register judgement; register complaints arrive from alpha users; or the Phase 7 human
review is reached." The Phase 7 human review has been reached (Gate L, progress.md D164). No disagreement
with the gate's register judgement was recorded there, and no register complaint has arrived. So ADR 19's
own evidence does not drive this change. The owner's decision does, as ADR 23's did. This record exists
because §4.4's cross-family rule is no longer what the bank is built under, and an accepted decision is
superseded, not edited.

## Decision

From bank v4:

- **Writing.** Claude (`claude-opus-5-5`) writes the items, passages and oral scenarios through the authored
  intake (`content/authored/`, content-factory.md §5). Every item is credited
  `provenance: { origin: "authored", contributor: "claude-opus-5-5", generator: { model: "claude-opus-5-5", … } }`,
  so it says plainly that a model wrote it. The app reads it as machine-generated, not "written by hand".
  The authoring brief is committed in `docs/content-runs/v4/`.
- **Review.** Separate Claude instances review each item, never its author. They work blind, from the
  requests `palier-factory review-requests` writes: no key, no rationales, no explanation. Each returns a
  `ReviewVerdict` under the brief in `docs/content-runs/v4/`. The verdicts are committed under
  `content/factory/reviews/`, and stage 4 replays them through the recorded reviewer
  (`--provider recorded`). So the bank rebuilds byte for byte with no key and no model. The gate itself
  (`gateReasons`, confidence 0.7, no defensible distractor, no register flag, band within one) is unchanged.
  **Disagreement still discards and never repairs.**
- **Deterministic validation** (§4.5) is unchanged. Authored passages are now also held to the drafted
  passages' rules (progress.md D203).
- **The gate is still measured.** The defect eval set in `apps/factory/src/eval/` is written in
  placeholder French with the key's option marked, so a real reviewer cannot be measured on it. The
  reviewer is measured instead on a real-French defect set of the same kind: deliberately flawed items
  and clean controls, written by a Claude instance that reviews nothing. Its per-class detection is
  recorded in progress.md.
- The factory's OpenAI path is untouched and remains the default route for a future paid run. Hand-written
  contributions keep their own credit and their "written by hand" label.

## Consequences

**Positive.**

- The full-volume bank exists, at no API cost, and replaces placeholder text that no candidate could study
  from.
- Every verdict is committed and replayable, so the review is auditable item by item. A cross-family run on a
  funded key never offered that.

**Negative, named plainly.**

- Writer and reviewer share a family, so they share blind spots. §4.4 says cross-family review "reduces
  correlated error; it does not eliminate it". Same-family review does not reduce it.
- A subtle register or key error that Claude makes as a writer is the error Claude is least likely to catch
  as a reviewer.
- A2 ("a model reviewing an item blind to its key can detect most items with two defensible answers") is
  tested only against defects that a Claude instance wrote. That is weaker evidence than a second family
  would give.
- The product must therefore say it plainly: the about page, the landing FAQ and each item's provenance line
  name the model, say that the review is by instances of the same model, and say that no person reads every
  item.

## Revisit when

Any of the following happens:

- A human reader, or a cross-family reviewer on a funded key, disagrees with the gate on a sample of the v4
  bank, on register, the key or a second defensible answer.
- Item reports with reason "key-wrong" or "multiple-answers" exceed 2% of reported items.
- The item-statistics job retires more than 5% of v4's items for low discrimination once they are calibrated.

If any of these fires, re-review the bank cross-family before the next bank version. The factory's OpenAI
reviewer is the ready route: `palier-factory run --authored-only --provider openai` reviews every authored
item with `gpt-6-sol` and drafts nothing. Its verdicts would need recording under `content/factory/reviews/`
for the bank to stay reproducible.
