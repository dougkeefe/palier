# Palier: Progress

**Last updated:** 19 September 2026
**Current phase:** 0, Foundations and contracts
**Next milestone:** gates enforced (`implementation-plan.md` §9)

This file is the repo's memory between agent sessions. It records **state**, not plan:
what is done, what is in flight, what was decided along the way. It deliberately does
not restate the work breakdowns in `implementation-plan.md` §7 — two copies of a plan
diverge, and the plan is authoritative. Tasks here are named tersely and point at the
section that defines them.

| Authoritative for | Not authoritative for |
| --- | --- |
| What has been built, by whom, when | What should be built, and in what order (`implementation-plan.md` §7) |
| Deviations from the plan, and why | Why an architectural choice was made (`adr/`) |
| Which branch is working on what | Whether a requirement is satisfied (`product-requirements.md` §0.1) |

---

## Working agreement for agent sessions

Read this section before doing anything else in this repository.

1. **Read the status table and the deviations log first.** Both are short. The deviations
   log is the part you cannot reconstruct from the code.
2. **Claim before you build.** Add a row to *In flight* in your first commit on the
   branch. This is a courtesy signal, not a lock — see the honesty note below.
3. **Update in the same commit as the work.** A tick that lands in a separate commit is
   a tick that gets forgotten. If the work is not merged, the box is not ticked.
4. **Append to the session log; do not rewrite it.** New entries go at the top of the
   log, with the date, the branch and one line on what changed. Never edit an older
   entry — correct it with a newer one, the way `adr/` works.
5. **Record a deviation the moment you make one.** Anything you did differently from
   `implementation-plan.md`, or any constraint you hit that the plan did not anticipate,
   goes in *Deviations* with its reason. A future session will otherwise re-litigate it
   or, worse, silently undo it.
6. **Do not tick an exit criterion you have not run.** Paste the command and its result
   into the session log entry. "Should pass" is not a pass.

**Honesty note on claims.** Parallel sessions work in separate worktrees branched from
`main`, so a claim is only visible to others once it merges. This file is as accurate as
the last merge and nothing more. It prevents the common case — two sessions picking the
same obvious next task — and will not prevent a genuine race. Coordinate through the
human for anything expensive.

---

## Status

| Phase | Goal | Size | State |
| --- | --- | --- | --- |
| 0 Foundations | An empty application that already enforces every rule | 2–3 wk | **in progress** |
| 1 Content factory | Find out whether a generated bank is good enough | 3–4 wk | not started |
| 2 Practice MVP | Ship something publicly useful | 3–4 wk | not started |
| 3 Exams and item statistics | The number users actually came for | 2 wk | not started |
| 4 BYOK, generation, writing workshop | Turn on the parts that cost money, safely | 2 wk | not started |
| 5 Oral, practice mode | Oral rehearsal at a cost anyone can afford | 2–3 wk | not started |
| 6 Oral, studio mode | The feature people tell colleagues about | 2 wk | not started |
| 7 Polish and hardening | 1.0 | 2–3 wk | not started |
| 8 English mirror | Prove the architecture | 2 wk | not started |

Task states: `[ ]` not started · `[~]` in flight · `[x]` done and verified · `[!]` blocked or deferred, with a note.

### In flight

| Branch | Task | Session started |
| --- | --- | --- |
| `dougkeefe/continue-implementation` | Phase 0 gates, test infrastructure, domain types (§12.4–12.6) | 19 September 2026 |

---

## Phase 0: Foundations and contracts

Defined in `implementation-plan.md` §7. The first-week list in §12 is the suggested order.

### Scaffolding

- [x] Monorepo: pnpm workspaces, Turborepo, TypeScript project references, strict everywhere
- [x] Eight workspaces created (`apps/web`, `apps/factory`, six `packages/*`), each with an explicit `exports` map
- [ ] `CLAUDE.md` per package, stating that package's invariants (§7, and §10 requires keeping them current)
- [ ] Name decided and domain registered (§12.1 — "Palier" is still a working name)
- [ ] `LICENSE` (MIT), `LICENSE-CONTENT` (CC BY 4.0), `README` non-affiliation statement [R5, R13]
- [ ] `adr/README.md` covering the format and the never-edit-only-supersede rule

### Domain and contracts

- [ ] `@palier/domain`: full type set, branded ids
- [ ] `@palier/domain`: Zod schemas for every content artefact, JSON Schema generated to `docs/schemas/`
- [ ] `@palier/domain`: `ExamProfile` loader
- [ ] `@palier/domain`: `psc-sle` profile transcribed from `product-requirements.md` §5 (ADR 9)
- [ ] `@palier/app`: every port interface from §3.3, no implementations behind them
- [ ] Item type registry (§3.4), with the five members and the a11y contract

### Test infrastructure

Built now rather than retrofitted — §7 is emphatic about this.

- [ ] Vitest workspace across all packages
- [ ] fast-check
- [ ] MSW handlers shared between Node and browser
- [ ] PGlite harness
- [ ] Playwright with the hermetic composition-root flag
- [ ] fake-indexeddb
- [ ] `@axe-core/playwright`
- [ ] Per-package coverage reporting with the §6.3 targets enforced
- [ ] `@palier/testing`: in-memory implementation of every port
- [ ] `@palier/testing`: port contract suites, exported as functions
- [ ] `@palier/testing`: fixture builders, seeded Random, FakeClock
- [ ] `@palier/testing`: the 60-item canonical fixture bank
- [ ] The three CI lanes from §6.5, with their time budgets enforced as build failures

### Gates

- [x] Typecheck (`turbo check-types`)
- [x] Lint — one root ESLint config over every workspace; D1 resolved
- [x] dependency-cruiser encoding the §3.1 arrows, plus the forbidden imports of `openai`, `dexie`, `next`, `react` outside their allowed packages
- [x] eslint-plugin-boundaries for intra-package layering — but see the honesty note in D5
- [~] Unit tests — Vitest runs in `pnpm verify` with one smoke test; the harness proper is the next task
- [ ] Contrast validation on the token set
- [ ] i18n key parity [R8]
- [ ] axe on the shell [R9]
- [ ] Lighthouse budget
- [ ] Bundle size

### UI and app shell

- [ ] `@palier/ui`: design tokens as CSS custom properties, light and dark
- [ ] `@palier/ui`: six primitives (Button, Card, OptionRow, ProgressRail, Callout, EmptyState)
- [ ] `apps/web`: locale-prefixed routing, next-intl wired [R8]
- [ ] `apps/web`: layout shell, with the non-affiliation statement present from day one [R5]
- [ ] `apps/web`: composition root with null adapters (§3.5)

### Exit criteria

- [ ] `pnpm build && pnpm test && pnpm lint` green with every gate active
- [x] A deliberate boundary violation on a scratch branch fails CI — **verified by running it**, not assumed. Both an arrow violation and a vendor-ban violation were run on `scratch/deliberate-violation`; output in the session log. Running it caught two bugs that made the gate silently vacuous.
- [ ] The `psc-sle` profile validates
- [ ] Band mapping property test passes: total and monotonic over every variant
- [ ] Port contract suites exist and pass against the in-memory implementations
- [ ] Fast lane under 90 seconds on an empty codebase — record the number, it is the baseline defended for the rest of the project

### Suggested next three

1. `@palier/domain` types and the `psc-sle` profile (§12.4) — everything else depends on it.
2. dependency-cruiser, proven against a deliberate violation (§12.5) — this is the gate that makes the architecture real, and it also closes deviation D1.
3. Vitest workspace, fast-check, and the band-mapping property test (§12.6).

---

## Phases 1 to 8

Each phase's work breakdown lives in `implementation-plan.md` §7 and is expanded into
tasks here **when the phase starts**, not before. Only the exit criteria are tracked
in advance, because they are the actual gate.

### Phase 1: Content factory — go/no-go on item quality

Pipeline spec is `content-factory.md`. §7 is the schedule and the decision points only.

- [ ] Week 1 assumption test (A1): 30 hand-drafted passages read cold by two fluent GC French speakers, **before any pipeline code**
- [ ] 500–700 published French items, reading and written expression, bands B and C
- [ ] Stage 4 yield between 45 and 75 percent
- [ ] Review gate detection ≥ 90 percent in **every** defect class (phase bar; 80 percent is the ongoing operational threshold)
- [ ] Defect rate below 5 percent on a 5 percent human sample
- [ ] Two or three fluent speakers read 30 items with no register flags
- [ ] Cost per accepted item measured

**If these fail:** work down the descoping list in `content-factory.md` §9 in order. Option 5 is a legitimate outcome, not a failure.

### Phase 2: Practice MVP — public alpha

- [ ] Diagnostic → accuracy per band tag with interval → daily session, on two devices paired by code [R1, R4, R10, R14]
- [ ] Full offline operation after first load [R4]
- [ ] Engine unit tests exhaustive at every boundary, golden fixtures locked
- [ ] Sync simulator passes several hundred seeds including full partition and heal, no lost or duplicated attempts
- [ ] Every adapter passes its port contract suite

### Phase 3: Exams and item statistics — closed pilot

- [ ] All four exam variants runnable and correctly scored, golden fixture per variant at every cut boundary [R3]
- [ ] A full 90-minute exam survives reload and network drop (E2E journey 3)
- [ ] Statistics job flags and retires a seeded reversed-key item on synthetic data
- [ ] Scoring is idempotent
- [ ] Closed pilot run, 20–30 people

### Phase 4: BYOK, generation, writing workshop

- [ ] **Key-leak test written before the key vault**, and passing (tier 11) [R12]
- [ ] Every AI response schema-validated before use; malformed / rate-limit / invalid-key / timeout all degrade gracefully
- [ ] Spend meter matches actual OpenAI billing within a few percent

### Phase 5: Oral, practice mode

- [ ] A 10-minute session produces a report a user would act on
- [ ] Cost per session measured and displayed accurately
- [ ] Audio never leaves the device without an explicit per-session opt-in, asserted by the extended key-leak test [R12]
- [ ] Scoring stability: same transcript five times, at most one band of variation
- [ ] Session state machine contract-tested against a fake transport

### Phase 6: Oral, studio mode

**Decision gate before starting.** If phase 5's reports land well and measured realtime cost is high, shipping 1.0 without studio mode is the honest answer. Record that call here with its evidence.

- [ ] Session establishes in under 2.5 seconds from tap to first word
- [ ] Disconnection mid-session recovers or fails cleanly with the transcript preserved
- [ ] Manual realtime checklist (`architecture.md` §14) passes on Chrome, Safari, Firefox, desktop and mobile

### Phase 7: Polish and hardening — 1.0

- [ ] Every gate green, no known accessibility defects, no known security defects
- [ ] Both languages reviewed by a human [R8]
- [ ] Repo public, licences in place, contribution path tested by someone else submitting an item [R13]

### Phase 8: English mirror

- [ ] Factory re-run with the mirror configuration
- [ ] **Zero application code changes.** Any change required is a defect in phases 0–7 to be understood, not an expected cost

---

## Requirement coverage

From `implementation-plan.md` §8. Status is *satisfied and verified*, not *worked on*.

| # | Requirement | Phase | Status |
| --- | --- | --- | --- |
| R1 | Practises all three tested skills | 2, 5, 6 | not started |
| R2 | Format and register match the real tests | 1 | not started |
| R3 | Mock exams mirror published structure and cuts | 3 | not started |
| R4 | Works with no key and offline after first load | 2 | not started |
| R5 | Never presents as official | 0, 7 | not started |
| R6 | No real test items, no PSC reproduction | 1 | not started |
| R7 | Rationale per option, explanation per item | 1 | not started |
| R8 | Fully bilingual, equal prominence | 0, 1, 7 | not started |
| R9 | WCAG 2.2 AA | 0, all | not started |
| R10 | No estimate without evidence and uncertainty | 2 | not started |
| R11 | Export, import, delete, each in one action | 2, 7 | not started |
| R12 | Key, audio, transcripts and submissions stay local | 4, 5 | not started |
| R13 | Free and open source | 0, 7 | not started |
| R14 | Progress across devices, with an off switch | 2 | not started |

Eleven of fourteen are covered by the end of phase 3. That is the evidence behind
"stopping after phase 3 leaves a complete product".

---

## Deviations

Things done differently from `implementation-plan.md`, or constraints the plan did not
anticipate. Add to this list; do not remove entries. When a deviation is resolved, mark
it and say what resolved it.

### D1 — Default-export ban is enforced in `apps/web` only
**Date:** 19 September 2026 · **Status:** RESOLVED 19 September 2026

The rule is "named exports only, except Next.js file conventions".
`apps/web/eslint.config.mjs` enforces it with a core-ESLint `no-restricted-syntax` rule
and an exhaustive exemption list. `packages/*` and `apps/factory` have **no** ESLint
config, because linting TypeScript needs a parser and `typescript-eslint` is not in the
tree; adding it would have broken the "no dependency beyond pnpm, Turborepo and project
references" constraint the restructure was given.

**Resolution:** as predicted. `typescript-eslint@8.70.0` is now a direct root
devDependency and the ban is enforced repo-wide from the single root
`eslint.config.mjs`. Verified by running it: a default export in
`packages/domain/src` errors, and `page.tsx` and `layout.tsx` still pass. See D5
for why there is now one config rather than one per workspace.

### D2 — `apps/web` is excluded from the root `tsc -b` solution
**Date:** 19 September 2026 · **Status:** accepted, permanent

`apps/web` typechecks against route types Next.js generates into `.next/types`
(`LayoutProps` and friends), which do not exist until `next typegen` runs. Including it
in `tsconfig.json`'s `references` makes a clean `tsc -b` fail. It therefore runs through
its own `check-types` script (`next typegen && tsc --noEmit`), ordered by Turborepo's
`dependsOn: ["^build"]`. It keeps its own `references` so editors resolve the packages.
There is a comment in `tsconfig.json` saying so.

### D3 — `@palier/adapters` subpath exports deferred
**Date:** 19 September 2026 · **Status:** open, closes when the first adapter lands

§3.2 specifies five subpath exports (`/dexie`, `/bank`, `/openai`, `/sync`, `/vault`).
The package currently declares one root export, because five `exports` entries resolving
to five empty modules assert a boundary with nothing behind it. Add the subpaths with the
first adapter. The lint rule forbidding cross-imports between adapter directories is the
thing that actually enforces §3.2, and it arrives with dependency-cruiser.

### D4 — Per-package `CLAUDE.md` files not yet written
**Date:** 19 September 2026 · **Status:** open, phase 0

§7 requires each package to declare its invariants in a `CLAUDE.md`, and §10 requires
keeping them current in the same PR as any change to those invariants. The packages are
currently empty, so there are no invariants to state. Write them alongside the first real
code in each package, not before.

---

### D5 — One root ESLint config; `apps/web/eslint.config.mjs` deleted
**Date:** 19 September 2026 · **Status:** accepted

`apps/web` had the only ESLint config, holding the exhaustive Next.js
default-export exemption list. Closing D1 meant linting `packages/*` too, and two
configs would have meant stating "named exports only" twice, running two ESLint
processes inside a 90-second budget, and giving `eslint-plugin-boundaries` two
partial views of a repo whose boundaries are the whole point. There is now one
root `eslint.config.mjs`. `eslint` and `eslint-config-next` moved to root
devDependencies, because that is where the config that imports them lives —
pnpm's strict isolation blocks the root from reaching into `apps/web`'s tree.

The config is deliberately **not** type-aware. Nothing it enforces needs type
information, and `recommendedTypeChecked` would build a full TypeScript program
on every lint run. Revisit when `@palier/engine` holds algorithms worth
`no-floating-promises`.

**Honesty note on `eslint-plugin-boundaries`.** §4.2 names it and D1's stated
resolution named it, so it is installed and configured. With the packages still
near-empty, the only rule of its earning anything today is `no-unknown-files`,
which makes a file landing in an unclassified directory an error and so stops the
element map rotting as the packages fill. The cross-adapter import ban that §3.2
actually wants lives in `.dependency-cruiser.cjs`, which matches on paths and
needs no classification. Split the `adapters` element when the first adapter
lands.

### D6 — dependency-cruiser cruises `src` and resolves through `dist`
**Date:** 19 September 2026 · **Status:** accepted

Entry points are the `src` directories, so a violation reports at
`packages/engine/src/leak.ts:1` rather than at a line in generated output. But a
workspace import resolves through the `exports` map to `<pkg>/dist/index.js`, so
the `to` side of every arrow rule matches `^packages/<name>/` without anchoring
to `src`. **The packages must therefore be built before the cruise**, which
`pnpm verify` guarantees by running `check-types` (and so `^build`) first.

There is deliberately no alias mapping `@palier/*` to `src`. An alias is a second
source of truth that drifts from the `exports` map, and it would let this gate
bless an import that does not resolve at runtime.

`apps/web` gets its own two-line config that reuses the root rule set and only
swaps the `tsConfig`, because the cruiser takes one per run and `apps/web` is the
only workspace on `moduleResolution: bundler` (see D2).

**Two bugs this config shipped with, both caught only by running the deliberate
violation and both making the gate silently vacuous.** Recorded because the
failure mode — a green build that checks nothing — is the one worth recognising
on sight:

1. `node_modules` was in `exclude`, which drops vendor modules from the graph
   entirely, so every vendor ban had nothing to match. `doNotFollow` is the
   correct mechanism: it stops the cruise at the boundary but still records the
   dependency.
2. `dist` was in `exclude` for the same reason, which made every *arrow* rule
   vacuous, since a workspace import resolves into `dist`.

### D7 — Vitest installed with the gates, not with the test infrastructure
**Date:** 19 September 2026 · **Status:** accepted

`docs/prompts.md` Session 3 says to add no test tooling, and also that `pnpm
verify` must run tests. A `verify` whose fourth step is a stub that always exits
zero is precisely the failure the phase 0 exit criteria exist to prevent, so
`vitest` and `@vitest/coverage-v8` landed here with one real smoke test. The rest
of §6.1 — fast-check, MSW, PGlite, fake-indexeddb, Playwright, axe, the projects
list and the per-package coverage thresholds — is the next task.

### D8 — ESLint held at 9.39.5 although 10 is current
**Date:** 19 September 2026 · **Status:** open, revisit when the peer range widens

`pnpm add eslint@9.39.5` prints a deprecation warning and it is correct: ESLint
10.11.0 is current. `eslint-config-next@16.3.5` pulls
`eslint-plugin-import@2.32.0`, which declares
`peerDependencies.eslint: ^2 || … || ^9` and does not accept 10. Verified against
the registry rather than assumed. Revisit when `eslint-config-next` drops
`eslint-plugin-import` or that plugin widens its range.

---

## Session log

Newest first. One entry per session that changed something. Never edit an older entry.

### 19 September 2026 — `dougkeefe/continue-implementation` (1 of 3: the gates)

Architecture enforcement, per `implementation-plan.md` §4 and `prompts.md` Session 3.
One root `eslint.config.mjs` replacing the per-app one, `dependency-cruiser` encoding
the §3.1 arrows and the vendor bans, a `pnpm verify` chain, and the fast/medium CI
lanes with the 90-second budget enforced as a hard kill. Deviations D5 to D8 recorded;
**D1 resolved**.

Dependencies added, all exact: `dependency-cruiser@18.3.1` and
`eslint-plugin-boundaries@7.2.0` are the only genuinely new trees. `eslint@9.39.5`,
`@eslint/js@9.39.5`, `typescript-eslint@8.70.0` and `eslint-config-next@16.3.5` were
already resolved in the lockfile and moved to the root. `vitest@5.0.1` and
`@vitest/coverage-v8@5.0.1` per D7. `@types/node` bumped to 22.18.11 to match Vitest 5's
peer range and the local Node 22.19.0. Added `.nvmrc` so CI and local agree.

**Verified:**

- `pnpm verify` green, **3.4 seconds cold** (caches and `dist` deleted first). That is
  the fast-lane baseline this project defends; the budget is 90 seconds.
- Lint negative tests, all five bite and were reverted: a default export in
  `packages/domain/src` → *"Named exports only…"*; `async`/`await`/`Promise` in domain
  → three separate errors naming §3.2; `Date.now()` in `packages/engine/src` →
  *"@palier/engine is pure. Take a Clock as a parameter"*. `page.tsx` and `layout.tsx`
  still pass, so the Next.js exemption list survived the move.
- `turbo check-types` now covers all eight workspaces rather than `apps/web` alone;
  every package gained a non-composite `tsconfig.vitest.json` that includes its tests,
  and its build `tsconfig.json` now excludes them so no test reaches `dist`.

**The deliberate boundary violation, on `scratch/deliberate-violation`, since the exit
criterion says to run it rather than assume it.** Running it was not a formality: it
caught two bugs that made the gate silently vacuous. Both are written up in D6.

*Run 1 — `@palier/engine` importing `dexie`, undeclared.* Typecheck fails first, which
is the wrong gate for this exercise:

```
@palier/engine:check-types: src/leak.ts(1,19): error TS2307: Cannot find module 'dexie'
  or its corresponding type declarations.
```

*Run 2 — the same import, with `dexie` genuinely declared and installed in
`@palier/engine`, so the cruiser is what must stop it:*

```
  error no-dexie-outside-adapters: packages/engine/src/leak.ts → node_modules/.pnpm/dexie@4.4.6/node_modules/dexie/import-wrapper.mjs
    `dexie` belongs in packages/adapters/src/dexie and nowhere else
    (implementation-plan.md 4.1). Depend on the port instead, and let the
    composition root wire the concrete thing.

  error engine-has-no-dependencies: packages/engine/src/leak.ts → node_modules/.pnpm/dexie@4.4.6/node_modules/dexie/import-wrapper.mjs
    @palier/engine is pure and takes no npm or Node core dependency at all
    (implementation-plan.md 3.2, architecture.md 7). Clock and Random arrive as
    parameters (ADR 7, ADR 8). If you need a library here, the code probably
    belongs in @palier/app.

x 2 dependency violations (2 errors, 0 warnings). 11 modules, 4 dependencies cruised.
```

*Run 3 — an arrow violation rather than a vendor one: `@palier/domain` importing
`@palier/engine`, properly declared, so only the §3.1 rule can catch it:*

```
  error domain-depends-on-nothing: packages/domain/src/index.ts → packages/engine/dist/index.d.ts
    @palier/domain sits at the bottom of the graph and depends on nothing
    (implementation-plan.md 3.1, ADR 10). If domain needs this, the thing it
    needs is in the wrong package.

x 1 dependency violations (1 errors, 0 warnings). 10 modules, 3 dependencies cruised.
```

Branch deleted afterwards. The messages were legible on the first read, which is the
acceptance check `prompts.md` sets for this session, so no `comment` needed rewriting.

**Note for the next session:** the previous entry's closing note said `docs/` was
untracked. It was committed in `3d6b524` and that note is now stale.

### 19 September 2026 — `dougkeefe/palier-monorepo-restructure`
Restructured the `create-next-app` root into a pnpm + Turborepo monorepo matching §3.2.
Nine workspaces. `apps/web` moved intact via `git mv`. Every package has an explicit
`exports` map pointing at built `dist`; `src/index.ts` is `export {}` in all six.
TypeScript project references across the graph, with `strict`,
`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` in `tsconfig.base.json`.

Added exactly one dependency: `turbo@2.11.2`. TypeScript held at 5.9.3, Next at 16.3.5.
Config shapes taken from a scratch `create-turbo` scaffold and the official
add-to-existing-repository and internal-packages docs, then the scaffold deleted.

Verified:
- `pnpm exec tsc -b --verbose` — 7 reference projects, topological order, clean.
- `pnpm turbo build --force` — 8/8 tasks; second run `>>> FULL TURBO`, and cache restore
  reproduces every `dist` and `.next`, which is what proves the `outputs` declarations
  are complete.
- Negative tests, all three bite and were reverted: `noUncheckedIndexedAccess` → `TS2532`;
  `exactOptionalPropertyTypes` → `TS2375`; `domain` importing `@palier/app` → `TS2307`.
- Lint: a default export in a normal file errors; `page.tsx`, `layout.tsx` and the three
  config files pass.
- `pnpm turbo dev` → `http://localhost:3000` returns 200 with the starter markup.
  `next dev` left `apps/web/AGENTS.md` alone and wrote nothing at the repo root.

Recorded deviations D1 through D4.

**Note for the next session:** `docs/` is untracked in git. It predates this branch, but
it should be committed before anyone relies on this file as shared state.
