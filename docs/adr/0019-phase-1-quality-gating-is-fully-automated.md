# ADR 19: Phase 1 quality gating is fully automated, with no human register gate at this stage

**Status:** Superseded by ADR 24
**Date:** 2026-09-21
**Supersedes:** Nothing accepted. It overrides the human-in-the-loop framing in `content-factory.md` §3 (assumptions A1, A3), the "5% sample for human spot check" in §4 and §6, and the human exit criteria in `implementation-plan.md` §7 Phase 1, each of which is amended in place with a pointer here.

## Context

The owner wants Phase 1 to be an autonomous, machine-only content pipeline: harvest public Government of Canada sources, generate original passages and items, gate them, and produce the bank — with no human in the quality loop at this stage. The original Phase 1 methodology gated on two human devices: a week-one assumption test (thirty passages read cold by two fluent GC French speakers) and a five-percent human sample of the finished bank, plus fluent-speaker register reads as part of the go/no-go. `content-factory.md` §3 marks A1 ("a model can produce authentic GC French") and A3 ("register failures are detectable by a model") as load-bearing, and A3 explicitly hedges "needs a human in the register loop, at least as a sampling gate."

This decision removes that human gate from Phase 1. It was taken with the trade-off stated: dropping the human register read removes the only *external* check on authenticity at this phase, so the same class of model that generates the content is also its only judge of register.

## Decision

Phase 1 gates content on automation alone:

- **Adversarial review (§4.4)** by a model from a different family than the drafter, blind to the intended key — judging key, distractor defensibility, register naturalness, and band.
- **Deterministic validation (§4.5)** — schema, structure, duplication, key-position distribution, reading level, form resolution.

No human register read, no five-percent human sample, and no week-one two-reader assumption test. The pipeline is built and a small sample batch is run end-to-end to prove it; the full-volume paid run is deferred.

The licence and originality rules are untouched and non-negotiable: §4.1 rejects any source whose terms are unclear, §4.2 produces original passages that quote nothing, and R6 forbids reproducing real PSC items.

The one human check that remains is downstream and deliberate: the Phase 7 pre-1.0 gate "both languages reviewed by a human" ([R8], `implementation-plan.md` §7 Phase 7). Nothing reaches the *public* on a purely self-graded bank.

## Consequences

Positive: Phase 1 becomes fully autonomous and fast, with no dependency on scheduling fluent-speaker reviewers. The cross-family review and deterministic validation still run and are still measured against the hand-seeded defect eval set (§6), so the gate's detection rate is a tracked number, not an assumption.

Negative and named plainly: a subtle register failure that both the drafter's family and the reviewer's family share a blind spot on will pass, because there is no external human read to catch it before the alpha. §4.4 already concedes cross-family review "is not equivalent to expert review"; this decision leans on that gate harder than the original plan did. A1 and A3 are now judged by models rather than validated by a human, so the load-bearing assumptions of the whole subsystem are unverified by an outside reader until Phase 7.

## Revisit when

A human reads a sample of the generated bank and disagrees with the automated gate's register judgement; register complaints arrive from alpha users; or the Phase 7 human review is reached — at which point the automated-only Phase 1 gate has served its purpose and the human read resumes as the higher bar. If any of these fires, restore a human sampling gate to the pipeline (the machinery for it — the 5% sample tap in §4 — is retained in the spec for exactly this reason).
