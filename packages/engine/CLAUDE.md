# @palier/engine

Pure algorithms: the band mapper, the exam scorer, the trend calculator, the Leitner
scheduler, the selector and the daily planner (`implementation-plan.md` §3.2) — the pure
engine core is now complete — plus `subSkillBreakdown`, the progress screen's per-sub-skill
**counts** (whole history, no window, weakest first; progress.md D66). It is deliberately
separate from `weakestSubSkills`, which the planner uses for targeting and which windows and
thresholds. It returns tallies, never a percentage, so it makes no estimate (R10). Its sibling
`examSubSkillBreakdown` tallies one mock exam's **scored** items the same way, with unanswered items
counted as wrong and pilots left out, since pilots are never revealed (progress.md D84, D85).
**Item statistics** (architecture.md §7.6, progress.md D94): `itemStatistics` is a group-by and a
point-biserial over **whole-number sums**, so it is a function of the event set to the last bit (D73), and
`retirementVerdicts` applies the profile's `itemStatistics` rules with **the minimum counts first and every
threshold strict**. `restBucket`/`restBuckets` give an item's quintile on the *other* scored items, which is
what makes a point-biserial computable without an ability estimate (ADR 7). `trendEvidence` counts the
items behind the practice trend, and those with trusted statistics, over the trend's own window, for the
readiness disclosure; it never reweights the trend. **Spend** (`spend.ts`, progress.md D103):
`spendTotals` sums a ledger's rows into this session (since `sessionStart`), this week (Monday 00:00
UTC) and this month (the 1st, 00:00 UTC), with no upper bound; `capState` compares **whole micro-dollars**
against `CAP_WARNING_PERCENT` (PRD §8.10's 80%, product behaviour, not profile data), so 80% and 100% are
exact; `estimateFeatureCost` is `null`, never a low figure, when a model is unpriced; `preflight` gives the
cap state before and after an estimate. **The oral session machine** (`oral-session.ts`, progress.md D116),
the engine's first state machine: `startOralSession(phases)` enters phase 0, and `stepOralSession(state, event)`
takes a tick, a difficulty flag, an end request or a closed transport, each stamped `atMs` since the session
opened, and returns the next state and the commands (`enter-phase`, `adapt`, `close` with a reason) for
`@palier/app`'s driver to carry out. **Phases are entered in order and never skipped or repeated**, even
when one event crosses several boundaries; at or past the scenario's length the session is `completed`
with every phase entered; **every close carries a reason**, exactly once, and an ended machine says nothing
more; an earlier `atMs` than one already seen counts as the later. Property-tested, nine invariants. **Fluency**
(`fluency.ts`, progress.md D123): `fluencyMetrics(turns, fillers)` gives words a minute, the filler count and the mean
pause **over spoken answers only** (`input: "voice"`), each `null` rather than zero when nothing spoken measures it.
`speakingMs(turns)` is the time those spoken answers took, the same measure, summed; the progress summary's "minutes
spoken" is it over every session (progress.md D145);
the filler list is handed in, since it is content data, and words are domain's `spokenWords`. **The pause is each spoken
turn's `pauseMs`, which the screen measures; never the gap between turns**, which counts the time the question was heard
(D127). **An oral report's fixes bias the plan** (D124, closing D35): `SelectionCriteria.boost` favours its sub-skills at
`FOCUS_WEIGHT` (2), **multiplied** with `WEAKEST_WEIGHT` rather than joining the weakest set, so a weakest sub-skill stays
ahead (D127), in practice mode only; `DayPlanInput.focusSubSkills` passes them to new items, never maintenance's rule.
Absent or empty changes nothing, so the goldens did not move. **Engagement** (`engagement.ts`, progress.md D159):
`localDay(at, timeZone)` is the device's calendar day, read by `Intl` part rather than a locale's separator; `streak` walks
back from `today`, where today still to do breaks nothing, and a missed day is **frozen while fewer than the allowance are
frozen in that day's own calendar month**. A frozen day keeps the streak but adds nothing to its length, and a freeze is kept
only when an active day precedes it. The allowance is handed in, since it is a product rule, not exam data. Both are
functions of the day *set*, property-tested. `milestonesReached` is a threshold check over facts the app gathers, in the
fixed `MILESTONES` order. Everything is
re-exported from `src/index.ts` — the package's public surface is the barrel, not a relative
path, so a new algorithm is not done until it is exported there.

**May import** `@palier/domain`, and nothing else. **Zero npm dependencies and zero Node
core modules, by design, by lint rule and by the compiler:** the build loads no ambient types
(`"types": []`), so a Node global fails `tsc -b`, and only `tsconfig.vitest.json` adds `node` for the
tests' fixture reads (progress.md D154). If you need a library here, the code probably belongs in
`@palier/app`.

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
- **A calculation over attempts is a function of the attempt set, not of its order.** Two synced
  devices hold the same attempts in different orders, and must show the same trend (§6.2 tier 5).
  `calculateTrend` and `weakestSubSkills` break equal `ts` by id, and a property holds each to
  permutation invariance (progress.md D73, D77). Any new windowed or order-sensitive calculation
  needs the same tie-break.
- **Mutation-checked, on demand.** `pnpm mutation` runs Stryker over `src/` (D77). Run it after
  any engine rewrite, and give every survivor a test or a written reason it is equivalent. It
  is in no CI lane.
- **Golden fixtures are the contract** (§5). Recorded outputs live in `src/__fixtures__/*.json`;
  a change that moves a golden value fails its test and must be explained in the PR, never
  regenerated to make the test pass. The records: `exam-band-boundaries.golden.json` (the scorer
  at every cut of reading-unsupervised, `scorer.golden.test.ts`); **one
  `exam-band-boundaries.<variant>.golden.json` per profile variant** (Phase 3, [R3]), hand-checked
  against `product-requirements.md` §5 and driven by `Object.entries(profile.variants)` in
  `scorer.variants.golden.test.ts`, so a variant with no golden, or a golden whose cuts drift from
  the profile, fails; each form carries the variant's pilots, all answered correctly; and `practice-record.golden.json`, 120 recorded answers
  with the Leitner state after each (`scheduler.golden.test.ts`), the trend with its Wilson
  intervals (`trend-calculator.golden.test.ts`), and one seeded selection and day plan
  (`selector.golden.test.ts`). They run in the fast lane's `engine` project. That is the
  "engine golden regression" gate (§7 Phase 2).
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
