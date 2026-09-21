# @palier/engine

Pure algorithms: the band mapper, the exam scorer, the trend calculator, the Leitner
scheduler, the selector and the daily planner (`implementation-plan.md` §3.2) — the pure
engine core is now complete. Everything is
re-exported from `src/index.ts` — the package's public surface is the barrel, not a relative
path, so a new algorithm is not done until it is exported there.

**May import** `@palier/domain`, and nothing else. **Zero npm dependencies and zero Node
core modules, by design and by lint rule.** If you need a library here, the code probably
belongs in `@palier/app`.

## Invariants

- **Pure.** No I/O, no storage, no network, no prompts. **Time and randomness arrive as
  parameters** (ADR 7, ADR 8); `Date.now()`, `Math.random()` and `performance.now()` are
  banned by ESLint in this package. Call none of them, ever.
- **Take primitives, not the ports (D32).** The engine may not import `@palier/app`, where
  `Clock`, `Random` and `ISO` live, so a function that needs time takes `now: string` (an
  ISO-8601 instant) and one that needs randomness takes `random: () => number`. The use case
  reads `clock.now()` / `random.next` and passes the value down. If a signature tempts you to
  name `Clock`/`Random`/`ISO`, the type belongs to the app use-case slice instead.
- **`Attempt` carries no `subSkill` or `targetBand`** — any calculation keyed on those joins
  attempts to items by id (`calculateTrend` takes `items` for exactly this), and ignores an
  attempt whose item is absent from the bank.
- **Golden fixtures are the contract** (§5). Recorded outputs live in `src/__fixtures__/*.json`;
  a change that moves a golden value fails its test and must be explained in the PR, never
  regenerated to make the test pass.
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
