# @palier/engine

Pure algorithms: the band mapper today; the selector, scheduler, planner, scorer and trend
calculator as they land (`implementation-plan.md` §3.2).

**May import** `@palier/domain`, and nothing else. **Zero npm dependencies and zero Node
core modules, by design and by lint rule.** If you need a library here, the code probably
belongs in `@palier/app`.

## Invariants

- **Pure.** No I/O, no storage, no network, no prompts. **`Clock` and `Random` arrive as
  parameters** (ADR 7, ADR 8); `Date.now()`, `Math.random()` and `performance.now()` are
  banned by ESLint in this package. Call none of them, ever.
- **Small enough for one person to hold in their head**, and every calculation explainable
  to a user in one sentence (`architecture.md` §7). A change that breaks either property
  needs an ADR.
- **Band rank comes from `BAND_RANK`.** Never compare band letters as strings; use
  `compareBands`.
- **Exam rules come from the profile**, never from a constant here (ADR 9).
- **Non-goals:** no item response theory, no adaptive selection driven by information
  functions, no fitted spaced-repetition algorithm, no band letter derived from practice
  data (ADR 7, ADR 8, `architecture.md` §7.7). Each ADR names the evidence that would
  justify revisiting; read it before proposing one.
- 100% branch (§6.3), with worked examples at every boundary and properties for the
  invariants. The band mapping property runs over every variant of the profile, not a
  hard-coded list.

## The three mistakes most likely to be made here

1. **Reaching for `Date.now()`** in a scheduler. Take a `Clock`.
2. **Sorting bands alphabetically**, which puts E below X and makes the band mapping
   monotonic in the wrong direction.
3. **Putting a prompt string here.** Prompts belong in the OpenAI adapter.
