# Palier: Progress

**Last updated:** 20 September 2026
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
| `dougkeefe/continue-dev-from-progress` | `@palier/engine` pure core, ahead of Phase 1 (sequencing note in `implementation-plan.md` §7). Slices 1–3 merged (Scorer + TrendCalculator, Scheduler, Selector — commit `70ad6b6`). Slice 4, the **Planner** (D34, D35), completes the core | 20 September 2026 |

---

## Phase 0: Foundations and contracts

Defined in `implementation-plan.md` §7. The first-week list in §12 is the suggested order.

### Scaffolding

- [x] Monorepo: pnpm workspaces, Turborepo, TypeScript project references, strict everywhere
- [x] Eight workspaces created (`apps/web`, `apps/factory`, six `packages/*`), each with an explicit `exports` map
- [x] `CLAUDE.md` per package, stating that package's invariants (§7, and §10 requires keeping them current) — all six written, plus the root router `CLAUDE.md`; D4 resolved, D15 recorded
- [ ] Name decided and domain registered (§12.1 — "Palier" is still a working name)
- [x] `LICENSE` (MIT), `LICENSE-CONTENT` (CC BY 4.0), `README` non-affiliation statement [R5, R13]
- [x] `adr/README.md` covering the format, the never-edit-only-supersede rule, and numbers-on-acceptance (D16)

### Domain and contracts

- [x] `@palier/domain`: full type set, branded ids
- [x] `@palier/domain`: Zod schemas for every content artefact, JSON Schema generated to `docs/schemas/`
- [x] `@palier/domain`: `ExamProfile` loader
- [x] `@palier/domain`: `psc-sle` profile transcribed from `product-requirements.md` §5 (ADR 9) — with one inferred band, see D12
- [~] `@palier/app`: port interfaces from §3.3 — 7 of 12 under `src/ports/` (`ItemRepository`,
  `AttemptStore`, `ScheduleStore`, `SettingsStore`, `KeyVault`, `Clock`, `Random`);
  `SessionStore`/`OralStore` (no §3.3 signature) and `AiProvider`/`SyncTransport`/`TelemetrySink`
  (net-new domain types) deferred; `ports.stub.ts` deleted. See D18–D20
- [x] Item type registry (§3.4): React-free `ItemTypeDefinition` in `@palier/domain`,
  `itemRenderers` in `@palier/ui`, compile-time exhaustiveness in `apps/web`, plus the §4.5
  architecture test — **ADR 17** written, D13 resolved

### Test infrastructure

Built now rather than retrofitted — §7 is emphatic about this.

- [x] Vitest across all packages — one root process, nine projects; see deviation D9
- [x] fast-check
- [x] MSW handlers shared between Node and browser
- [x] PGlite harness — proven by a real integration test against embedded Postgres
- [x] Playwright with the hermetic composition-root flag
- [x] fake-indexeddb
- [x] `@axe-core/playwright`
- [x] Per-package coverage reporting with the §6.3 targets enforced — proven by a deliberate drop
- [~] `@palier/testing`: in-memory implementation of every port — **five** now (`ItemRepository`
  added, alongside `AttemptStore`, `ScheduleStore`, `SettingsStore`, `KeyVault`), all importing
  the real ports from `@palier/app`; `SessionStore`/`OralStore`/`AiProvider`/`SyncTransport`/`TelemetrySink`
  follow their ports
- [x] `@palier/testing`: port contract suites, exported as functions
- [x] `@palier/testing`: fixture builders, seeded Random, FakeClock
- [x] `@palier/testing`: the 60-item canonical fixture bank — `src/fixtures/bank.ts`, generated
  across the scored-skill taxonomy (all 18 reading+writing sub-skills), bands A/B/C, rotating
  keys; every item schema-valid and `validate()`-clean, proven by `bank.test.ts`. Seeds
  passages, two forms and one scenario too (D31)
- [x] The three CI lanes from §6.5, with their time budgets enforced as build failures

### Gates

- [x] Typecheck (`turbo check-types`)
- [x] Lint — one root ESLint config over every workspace; D1 resolved
- [x] dependency-cruiser encoding the §3.1 arrows, plus the forbidden imports of `openai`, `dexie`, `next`, `react` outside their allowed packages
- [x] eslint-plugin-boundaries for intra-package layering — but see the honesty note in D5
- [x] Unit tests
- [x] Contrast validation on the token set — a unit test over `@palier/ui`'s token set; every
  text pair clears 4.5:1 and every brand/UI pair 3:1 in both themes. `accent` is documented as
  decorative and excluded. Proven to bite (a weakened token failed, naming the pair)
- [x] i18n key parity [R8] — `apps/web/src/i18n/messages.test.ts`, fast lane. Proven to bite (dropped a `fr.json` key → failed)
- [x] axe on the shell [R9] — `@axe-core/playwright` on `/en`, `/fr`, `/en/about` and the toggle-focused state, medium lane. Proven to bite (an empty `<button>` → `button-name`)
- [x] Lighthouse budget — `@lhci/cli`, desktop preset, performance and accessibility ≥ 95 on `/en` and `/fr` (both scored 1.0), medium lane. Proven to bite
- [x] Bundle size — `scripts/check-bundle-size.mjs`, shared first-load JS 165.7 KB of the 180 KB budget, medium lane. Proven to bite

### UI and app shell

- [x] `@palier/ui`: design tokens as CSS custom properties, light and dark — TS source of truth
  (`tokens.ts`), a generated `tokens.css` under a drift guard, and a static `components.css`;
  shipped via the `./tokens.css` and `./components.css` export subpaths (D22)
- [x] `@palier/ui`: six primitives (Button, Card, OptionRow, ProgressRail, Callout, EmptyState) —
  pure logic in `.ts` (tested to the 90% branch glob), thin React renderers in `.tsx` (D21)
- [x] `apps/web`: locale-prefixed routing, next-intl wired [R8] — `[locale]` segment, `proxy.ts` (Next 16 rename, D24), `en`/`fr` prerendered
- [x] `apps/web`: layout shell, with the non-affiliation statement present from day one [R5] — header (equal-prominence language toggle, quiet sync placeholder), footer disclaimer, `@palier/ui` tokens+primitives, Tailwind removed (D25)
- [x] `apps/web`: composition root with null adapters (§3.5) — `src/lib/container.ts` (D23), hermetic path wires `@palier/testing` in-memory ports; production path throws until Phase 2 adapters exist

### Exit criteria

- [x] `pnpm build && pnpm test && pnpm lint` green with every gate active — green, and **every
  phase-0 gate is now built**: typecheck, lint, boundaries, unit tests, contrast, i18n key
  parity, axe on the shell, Lighthouse (perf + a11y ≥ 95) and bundle size. The last four
  landed with the `apps/web` shell + next-intl. Fast lane cold ~5 s; medium lane adds
  axe/Lighthouse/bundle
- [x] A deliberate boundary violation on a scratch branch fails CI — **verified by running it**, not assumed. Both an arrow violation and a vendor-ban violation were run on `scratch/deliberate-violation`; output in the session log. Running it caught two bugs that made the gate silently vacuous.
- [x] The `psc-sle` profile validates
- [x] Band mapping property test passes: total and monotonic over every variant — over all four, driven by `Object.entries(profile.variants)` rather than a hard-coded list
- [x] Port contract suites exist and pass against the in-memory implementations — four ports, 23 assertions; the rest follow their ports
- [x] Fast lane under 90 seconds on an empty codebase — **4.6 seconds cold**, caches and `dist` deleted first, with the domain package and 246 tests in place. That is the baseline defended for the rest of the project.

### Suggested next three

The item type registry landed (session log, 19 September 2026), resolving D13 with **ADR 17**;
the phase-0 scaffolding landed too (session log, 20 September 2026) — the `LICENSE` /
`LICENSE-CONTENT` / `README` non-affiliation files [R5, R13] and the 60-item canonical fixture
bank. Every phase-0 CI gate is built and every deferred phase-0 *mechanism* is closed. **One
substantive phase-0 item remains:**

1. The remaining ports and the first use cases: `SessionStore` and `OralStore` need their
   signatures deciding and recording (D18's discipline), and
   `AiProvider`/`SyncTransport`/`TelemetrySink` need their domain types (AI requests and
   verdicts, sync documents, device identity, telemetry events) before they can be
   transcribed. The codebase deliberately defers each until a consumer drives its shape
   (`packages/app/CLAUDE.md`, `packages/testing/CLAUDE.md`), so this is best paired with the
   first `@palier/app` use case — once one lands, `container.ts` gains `buildUseCases`. The
   item type registry is available for a scoring/session use case to consume via
   `itemTypeDefinition(item.type).score(...)`, and the fixture bank
   (`fixtureBankRepository()`) now gives such a use case realistic data to run against.

The French non-affiliation string in `apps/web/messages/fr.json` was owner-confirmed
(D27, resolved); no open owner questions remain for this slice.

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

**The pure `@palier/engine` core is being built ahead of this phase** (sequencing note in
`implementation-plan.md` §7; it is content-agnostic, so it does not wait on Phase 1). Landed so
far: the exam **Scorer**, the **TrendCalculator**, the Leitner **Scheduler**, the **Selector**
(with the weakest-sub-skills helper) and the daily **Planner** — session log, 20 September 2026.
The pure engine core (`implementation-plan.md` §3.2) is now complete. The phase's own tasks are
expanded here when the phase formally starts; only the exit criteria are tracked in advance.

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
**Date:** 19 September 2026 · **Status:** RESOLVED 19 September 2026

§7 requires each package to declare its invariants in a `CLAUDE.md`, and §10 requires
keeping them current in the same PR as any change to those invariants. The packages are
currently empty, so there are no invariants to state. Write them alongside the first real
code in each package, not before.

**Resolution, and the order is deliberately inverted.** All six are now written, along
with a root `CLAUDE.md` router. The reasoning above is wrong in one respect: these files
do not merely *describe* a package, they **constrain the agent that writes it**, so
writing them after the code gets the leverage backwards. §5 calls them "the
highest-leverage documentation in the repo" for that reason. Where a package is still
empty, its file states the invariants the specs already fix — `app`'s ports carry no
vendor type (§2.4), `ui` imports domain types only (§3.1), `adapters` may not
cross-import (§3.2) — none of which needed code to exist first. §10 still applies:
update a package's file in the same PR as any change to its invariants.

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

### D9 — One root Vitest process, and why the integration lane is gated by an env var
**Date:** 19 September 2026 · **Status:** accepted

§7 says "Vitest workspace across all packages", which reads like a Turborepo
fan-out with a `test` script per package. It is instead **one root Vitest process
with nine projects**, and there is no `test` task in `turbo.json`. Vitest
computes coverage for the whole process and refuses `coverage` inside a project
config, so the §6.3 per-package targets can only be expressed as glob-keyed
thresholds in one root block. Eight forked runners could not produce one report
that enforces them.

`test.projects`, not `test.workspace`: the latter has been deprecated since
Vitest 3.2 and `vitest.workspace.ts` is gone.

**A trap worth knowing about.** The fast lane was originally going to skip the
integration project with `--project='!integration'`. Any `--project` filter
silently zeroes coverage in Vitest 5.0.1 — the run passes, the summary reads
`Unknown% (0/0)`, and every threshold in the config becomes decorative. Caught by
running it and reading the number. The integration project is therefore gated by
`PALIER_INTEGRATION=1` instead, so the fast lane runs `vitest run --coverage`
with no filter at all.

Two other findings, both verified rather than assumed:
- Glob thresholds do not inherit the top-level `perFile`; set it per glob.
- `coverage.excludeAfterRemap: true` is required, because a test in one package
  executes another's built `dist` and v8 source-maps it back into that package's
  `src`. Without it, `@palier/domain` could reach its 100% target on the strength
  of somebody else's tests.

Vitest is pinned at exactly `5.0.1`, released four days ago, because
`@vitest/coverage-v8` demands an exact peer match and the repo pins everything
else. Fallback is `4.1.11`; the `projects` API and glob thresholds are identical
across both, so it is a one-line revert.

### D10 — Test files may import `@palier/testing`; nothing else is relaxed
**Date:** 19 September 2026 · **Status:** accepted

The §3.1 arrows forbid every package from reaching `@palier/testing`. But §6.2
tier 3 requires the opposite for tests: the Dexie adapter's test imports
`attemptStoreContract` from `@palier/testing` and runs it against the real store,
which is the entire return on the ports layer (ADR 10). Each arrow rule is
therefore generated twice — once for production code, once for test files with
`testing` removed from the forbidden set. Verified narrow: an adapters *test*
importing `@palier/ui` still fails.

`@palier/testing` declares `vitest` as a **peer** dependency, because its
contract suites call `describe` and `it` at module scope. `vitest` and
`fast-check` are root devDependencies that no package declares (D9), so
`not-in-package-json` is split into a production rule and a test rule that
exempts exactly those two and nothing else.

### D11 — `playwright.config.ts` joins the default-export exemption list
**Date:** 19 September 2026 · **Status:** accepted

The rule was "named exports only, except Next.js file conventions". Playwright
resolves its config by default export and offers no named alternative, so the
exemption is now "framework file conventions" and the list names
`playwright.config.ts` explicitly. `AGENTS.md` updated to match, with a note that
adding a line to that list needs a better reason than convenience.

### D12 — `writing-unsupervised` carries an inferred `X 0-10` band
**Date:** 19 September 2026 · **Status:** open until checked against the PSC

`product-requirements.md` §5.2 gave the unsupervised written expression bands as
`A 11-16, B 17-23, C 24-30`, leaving raw scores **0 to 10 mapping to no band at
all**. Every other variant covers its full range. The band mapping must be total
— §6.2 makes it a property and phase 0 makes it an exit criterion — so this had
to be resolved before the profile could be written.

`content/profiles/psc-sle.json` carries `X: [0, 10]`, and §5.2 has been amended
with a footnote saying the row is **inferred, not transcribed**. The reasoning:
the unsupervised *reading* test does publish `X 0-8`, so X plainly exists on
unsupervised variants, and an omission in transcription is far likelier than a
fact about the test.

**The alternative was seriously considered and rejected.** It was to encode the
gap as a first-class `unbanded: [[0, 10]]` value and make the mapper return a
discriminated union, so the compiler forced every consumer to handle "no band".
That is more faithful to ADR 9's principle of holding published figures rather
than inferred ones. It was rejected because it makes every call site pay,
forever, for what is almost certainly a typo upstream — and because the footnote
plus this entry keep the inference visible, which was the real thing at risk.

**This is the one number in the profile nobody has checked against a source.** A
wrong band boundary is silent: it produces a plausible result for every user with
nothing to notice. Verify it against the PSC's published table before launch, and
close this entry when you do.

### D13 — The item type registry is deferred, and wants ADR 16
**Date:** 19 September 2026 · **Status:** RESOLVED 19 September 2026 by ADR 17

§3.4 specifies one `registerItemType` call carrying `schema`, `render`, `score`,
`validate`, `generatePrompt` and an `a11yContract`. It cannot be built as
specified, because `render` is "a React component from `@palier/ui`" and
**nothing may import `@palier/ui`** (§3.1). A single registry object therefore
cannot exist in any package below `apps/web`, and building one now would mean
either putting React types in `@palier/domain` — which the vendor ban forbids —
or inventing the split under time pressure.

The shape that probably works: an `ItemTypeDefinition` *without* `render` in
domain (React-free, which is the half CI and `apps/factory` need), a parallel
`itemRenderers` map in `@palier/ui`, and a compile-time exhaustiveness assertion
in the composition root that both cover the same `ItemType` union.

That is a change to §3.4, so it wants an ADR, written in the commit that
implements it. Not a quiet deviation now.

**Correction, 19 September 2026:** this entry said "ADR 16". That number was taken by the
estimate-store decision before the registry was unblocked, so the registry wants **ADR 17**
— or whatever is next free when it lands. Numbers go in order of acceptance, not
reservation. See D16. Also unresolved there: §3.4's literal
has six keys while §4 and §10 both say "all five members" and name the a11y
contract separately — the architecture test cannot assert "five" until someone
says which five.

**Resolution (ADR 17).** Built as this entry and its correction proposed: a React-free
`ItemTypeDefinition` in `@palier/domain` (`schema`, `score`, `validate`, `generatePrompt`,
`a11yContract`), an `itemRenderers` `Record<ItemType, ItemRenderer>` in `@palier/ui`, and a
compile-time exhaustiveness assertion in `apps/web/src/lib/item-types.ts`. The "which five"
question is settled — `schema`, `render`, `score`, `validate`, `generatePrompt`, with
`render` the member that lives in `@palier/ui` and `a11yContract` counted separately — and
the §4.5 architecture test (`packages/domain/src/__tests__/architecture.test.ts`) now exists
and asserts the domain-side members. It took **ADR 17**, not 16: the estimate store claimed
16 first, exactly as D16 predicted. The registry is a `Record<ItemType, …>` rather than an
imperative `registerItemType`, so a missing type is a `tsc` error, not a runtime one.

### D14 — zod's NodeNext declaration risk was checked and did not materialise
**Date:** 19 September 2026 · **Status:** closed

zod 4.6.5's export map declares a single `"types": "./index.d.cts"` for both the
`import` and `require` conditions, which under `moduleResolution: NodeNext` in an
ESM package has been reported to degrade inference to `any`. Because
`@palier/domain` is `composite` with `declaration: true`, a degraded type would
have been baked into `dist/index.d.ts` and propagated to every consumer.

Checked before writing any real code, by emitting a probe and reading the `.d.ts`
rather than trusting the editor. Inference was intact and TS2742 did not occur,
so **no patch was needed**. Recorded so the next person does not re-run the
investigation, and so that a future zod bump has a named thing to re-check.

What *did* bite, and shapes every schema in the package: `z.infer` of
`.optional()` produces `b?: T | undefined`, which is not assignable to a
hand-written `b?: T` under `exactOptionalPropertyTypes` — and annotating the
schema as `z.ZodType<T>` does not bridge it either. The resolution is that
optional fields are written `?: T | undefined`, schemas end in `.readonly()` so
the inferred type matches exactly, and a `Equals<>` assertion in a `.test-d.ts`
holds the two together. Fixtures **omit** absent keys rather than setting them to
`undefined`, which the JSON round-trip test enforces.

### D15 — `CLAUDE.md` is the canonical root document; `AGENTS.md` points at it
**Date:** 19 September 2026 · **Status:** accepted

The include ran `CLAUDE.md` → `@AGENTS.md`, with `AGENTS.md` holding layout, rules and
commands. `prompts.md` Session 2 asks for a root `CLAUDE.md` router of at most 120 lines
carrying most of that same material, so the two would have stated the same rules twice and
drifted. The direction is therefore reversed: `CLAUDE.md` is the router and everything in
`AGENTS.md` that constrained behaviour moved into it; `AGENTS.md` is now a pointer plus
`@CLAUDE.md`, so Codex-style agents that only read `AGENTS.md` land on the same content.
No cycle — `CLAUDE.md` imports nothing.

`apps/web/CLAUDE.md` still reads `@AGENTS.md` and is left alone: that `AGENTS.md` is
written and re-added by `next dev` (see the note in it), and is the Next.js-specific file
the root router points at.

### D16 — ADR numbers are assigned on acceptance, not reserved in advance
**Date:** 19 September 2026 · **Status:** accepted

D13 and `implementation-plan.md` §4 both named "ADR 16" for a decision that had not been
written: the item type registry split in D13's case, and "a contributor who disagrees
writes ADR 16" in §4's. Meanwhile the estimate-store conflict (D17, contradiction 2) needed
a record and took 16, because it was the one that was actually ready.

The rule, now stated in `implementation-plan.md` §4 and in the root `CLAUDE.md`: **take the
next free number when the ADR is accepted.** Reserving one in prose creates a number two
things believe they own. D13 carries a correction pointing at ADR 17; §4 and §12 no longer
name a specific next number, and §7 no longer says "ADRs 1 to 15", since that line would
need editing every time one lands.

### D17 — Ten contradictions between documents, resolved rather than carried
**Date:** 19 September 2026 · **Status:** accepted

Writing the agent documentation (D15) meant reading the whole set in one sitting, which
surfaced ten places where two documents disagreed. They were reported rather than resolved
at the time, then resolved in a second pass. **No new position was taken in any of them
except one.** The rule applied throughout: `docs/README.md`'s table says what each document
is authoritative for, so the document that is *not* authoritative for a statement is the one
that gets corrected. That rule is now written into `docs/README.md` so the next conflict is
cheaper.

One conflict was a genuine open question rather than a stale sentence, and so became
**ADR 16, derived state is not persisted**: `implementation-plan.md` §3.3 declared there is
no `EstimateStore`, `architecture.md` §9.1 declared an `estimates` table, and
`architecture.md` §9.4 agreed with the plan against its own §9.1. The table is gone. It
mattered because a persisted estimate is a second source of truth for the number the product
leads with, and last-write-wins on a derived value is how a stale figure overwrites a correct
one.

The rest, and what each was brought in line with:

| # | Was | Now | Authority |
| --- | --- | --- | --- |
| 1 | `architecture.md` §4 showed three packages, `content-schema`, engine under `apps/web/lib`, factory under `tools/`; §17 said "engine and content-schema" are published | Tree matches the repo; §17 says `@palier/engine` and `@palier/domain` | ADR 10, plan §3.2 |
| 2 | `estimates` table in §9.1 and in the §2 diagram | Removed, with a note saying why | **ADR 16** (new) |
| 3 | `product-requirements.md` §8.11 listed band estimates as syncing | Neither column; recomputed per device | ADR 16, `architecture.md` §9.4 |
| 4 | R12 said the key never leaves the device "except to the AI provider" | Admits the ADR 3 ephemeral-token mint, for the key and that route only | ADR 3; amendment recorded in §0.1 |
| 5 | `architecture.md` §19 ran a second roadmap with an email and GitHub claim flow | §19 points at plan §7 and §9; the duplicate roadmap is deleted | ADR 5, plan §7 |
| 6 | §1 and §18 said the bank is "machine-authored end to end", "no human author anywhere" | Machine-drafted by default, hand-authored items pass the same gates | ADR 6 |
| 7 | §3.4's literal had six keys; §4.5 and §10 said "five members" | "Five members plus the a11y contract", stated once and used consistently. The `render`/`@palier/ui` impossibility is now flagged in §3.4 itself, not only in D13 | Editorial; the split still wants ADR 17 |
| 8 | §13.0 said uncalibrated items are "weighted down in the band estimate" | The estimate discloses what it rests on; statistics retire items, they do not reweight | ADR 7 |
| 9 | §15 said telemetry carries "the estimated ability of whoever answered" | A coarse session-accuracy bucket, which is what §9.2 actually stores | ADR 7, `architecture.md` §9.2 |
| 10 | Minors: `/settings/sync` labelled "claim-this-account"; onboarding promised an email sign-in; diagnostic 12 minutes in §8.1 and 15 in §6.2; 400–600 items in `architecture.md` §18 against 500–700 elsewhere; `@palier/adapter-*` naming in plan §6.2 and §6.3 | All corrected to the authoritative statement | ADR 5, `content-factory.md` §2, ADR 10 |

**What was deliberately not resolved.** The `writing-unsupervised` `X 0-10` band (D12) is
still inferred and still needs checking against the PSC's published table — it is not a
contradiction between documents but a gap in the source. And the item type registry (D13)
is still blocked on a decision; §3.4 now says so in place rather than only in this log.

Every amendment to `product-requirements.md` is dated in place, in the style §5.2 already
used, because a requirement that changes silently is worse than one that never changed.

### D18 — `ISO`, `Clock` and `Random` live in `@palier/app`, not `@palier/domain`
**Date:** 19 September 2026 · **Status:** accepted

`Clock` and `Random` are ports (§3.3), so they belong with the other ports in
`@palier/app`, not in `@palier/engine` (which only receives them) nor in `@palier/testing`
(where `fakeClock`/`seededRandom` merely implement them). `ISO` is the type the `Clock` and
the stores trade in, so it lives beside them. `@palier/domain` is left untouched — its
`Attempt.ts` keeps a plain `string` timestamp, and it *must not* import upward to reach an
app type anyway.

**The alternative was considered:** `ISO` as a domain primitive reused by `Attempt.ts` and
every store. Cleaner conceptually, but it retypes a domain field, its schema and its tests
for no behavioural gain, and the value crosses to `Date.parse` and JSON as a bare string
regardless. Deferred; revisit if a domain type ever needs to name an instant.

### D19 — `ScheduleEntry` is minimal until the scheduler lands
**Date:** 19 September 2026 · **Status:** open, closes with the first `@palier/app` use case

§3.3 names `ScheduleEntry` in the `ScheduleStore` signature but gives it no shape. Its full
Leitner form — the box number indexing ADR 8's four intervals — is the `Scheduler`'s output
and belongs to the engine session that builds it. `@palier/app` therefore carries only what
the `ScheduleStore` port itself needs: `{ itemId, due, skill }`. The box is *added*, not
reshaped, when the scheduler arrives, so this is a safe minimum rather than a guess at the
final type. `app/CLAUDE.md`'s "deciding an unspecified port is a decision to record" is why
this is here rather than silent.

**Update, 20 September 2026.** The engine `Scheduler` has landed (`scheduler.ts`, session log),
but the box does **not** yet live on `app`'s `ScheduleEntry` — and it cannot, cleanly, because
the scheduler is in `@palier/engine`, which may not import `@palier/app` (D32). The scheduler
returns its own `Review` type, `{ box, due }`, and the app-side reshape — adding `box` to
`ScheduleEntry` and mapping a `Review` into `{ itemId, due, skill, box }` — is the job of the
first `@palier/app` use case that persists a schedule. So this stays open, now closing with that
use case rather than with the scheduler. `ScheduleEntry` is untouched for the moment.

### D20 — `ItemCriteria` and the in-memory query semantics decided ahead of the `Selector`
**Date:** 19 September 2026 · **Status:** open until the engine `Selector` lands

§3.3 gives `ItemRepository.query` the comment "skill, subSkill, band, exclude, limit" but no
type. `ItemCriteria` is defined in `@palier/app` from existing domain unions
(`ScoredSkill`, `SubSkill`, `TargetBand`, `ItemId[]`), every field optional and combining as
a **conjunction**. The in-memory `ItemRepository` filters by the supplied fields, applies
`exclude`, then `limit`; `byIds` preserves request order and drops misses. These semantics
are the contract every implementation is held to, so if the `Selector` needs richer querying
(ordering, weighting) it extends the criteria and the contract together, in its own session.

### D21 — `@palier/ui` gains React (peer) and a jsdom test lane
**Date:** 19 September 2026 · **Status:** accepted

`@palier/ui`'s primitives are React components, so the package needs React. `react` and
`react-dom` are declared as **peerDependencies** (`^19`) with matching devDependencies:
`apps/web` already pins `react@19.2.8`, and a peer avoids a second copy of React in the tree.
`.dependency-cruiser.cjs` already allowed `react` under `^(packages/ui/|apps/web/)`, so no gate
changed — verified by the cruise staying clean (112 modules).

For unit tests, `@testing-library/react@16.3.0` and `jsdom@26.1.0` are ui **devDependencies**
(used only by ui's own tests, not exported, so not deps the way `@palier/testing` exports its
harnesses). The root Vitest config runs the `ui` project in **jsdom**; every other project stays
on `node`. What it replaces: nothing present renders a component to a DOM, which the §6.2 tier-1
"option row's keyboard handling" style tests need. `@testing-library/user-event` was considered
and dropped — `fireEvent.click` covers what these tests assert, so it was not added.

The drift-guard test reads a file off disk and so carries a `// @vitest-environment node`
docblock, because under jsdom `import.meta.url` is not a `file://` URL.

**A lint carve-out came with this.** The `no-hardcoded-string-in-JSX` rule (`NO_JSX_LITERALS`)
matched `**/*.tsx`, and its selector also flags numeric and boolean expression-container literals
(`selected={true}`, `current={3}`), which makes idiomatic component *tests* impossible to write.
`eslint.config.mjs` now sets `ignores: TEST_FILES` on that block — the same carve-out the purity
rules already take (`docs/README` principle: "these rules govern the shipped package, not its
tests"). `NO_DEFAULT_EXPORT` still applies to test files via the baseline block. Shipped `.tsx`
is unaffected and still routes every user-visible string through i18n.

### D22 — `@palier/ui` token CSS: TS source of truth, generated CSS under a drift guard
**Date:** 19 September 2026 · **Status:** accepted

§7 asks for "design tokens as CSS custom properties". The packages build with `tsc -b` only (no
CSS bundler), and a stylesheet needs to be a real importable file, not a string. So:

- `src/tokens/tokens.ts` is the **single source of truth** — the §10.2 table as typed data.
- `src/tokens/css.ts`'s `renderTokensCss()` generates the `:root` + `@media (prefers-color-scheme)`
  + `[data-theme]` custom-property blocks.
- `src/styles/tokens.css` is committed and held to the generator by a **drift-guard test** (the
  same discipline as the `docs/schemas` JSON-Schema guard). Proven to bite (a one-hex-digit edit
  failed the guard).
- `src/styles/components.css` is hand-authored for what inline styles cannot express:
  `:focus-visible` (WCAG 2.4.11), target size (2.5.8), `prefers-reduced-motion` (§10.5), radii and
  elevation (§10.4).
- Both ship through new `exports` subpaths (`./tokens.css`, `./components.css`), copied into
  `dist/styles/` by an added step in the `build` script (tsc does not copy non-TS assets). This
  keeps D3's principle — an export entry has real content behind it.

**Contrast findings, recorded because a wrong contrast is silent (cf. D12).** Every text token
(`ink`, `ink-muted`, `correct`, `incorrect`, `info`) clears 4.5:1 and `primary` clears 3:1 on both
backgrounds in both themes; `--surface` as the primary-button label over `--primary` clears 4.5:1
either way (light 10.32, dark 5.77). `accent` is **2.32:1** on the light background and is
therefore *deliberately not* asserted as a text/UI pair: §10.2 assigns it to highlights, the
streak and the mascot — decorative, never body text or an information-bearing boundary. The
contrast test documents this exclusion in place.

### D23 — The composition root lives at `apps/web/src/lib/container.ts`, not `apps/web/lib/`
**Date:** 19 September 2026 · **Status:** accepted

§3.5 names `apps/web/lib/container.ts`. It is instead `apps/web/src/lib/container.ts`, because
the enforcement tooling is all rooted at `src/**`: the `boundaries` script cruises
`apps/web/src`, the Vitest `web` project includes `src/**/*.test.ts`, and coverage includes
`apps/*/src/**`. Under `src/`, the composition root's imports are validated by
dependency-cruiser, its wiring test is discovered, and it appears in the coverage report;
under a top-level `lib/` none of that holds. A one-directory move buys three enforcement
guarantees, so it was taken. The `@/*` alias also resolves `@/lib/container` either way.

### D24 — Locale negotiation uses `proxy.ts` (Next.js 16 renamed Middleware to Proxy)
**Date:** 19 September 2026 · **Status:** accepted

The plan and next-intl's own docs say "middleware.ts". Next.js 16 renamed the Middleware
convention to **Proxy** — the file is `src/proxy.ts` and its default export runs before
matched requests (`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`:
"Starting with Next.js 16, Middleware is now called Proxy. The functionality remains the
same"). The next-intl handler (`createMiddleware`, imported from `next-intl/middleware` — a
module name, unrelated to the file convention) is exported from `proxy.ts`. `src/proxy.ts`
was already on the eslint default-export exemption list, so no gate changed. `src/i18n/request.ts`
**was** added to that list, because the next-intl plugin imports its default export and there
is no named alternative.

### D25 — Tailwind removed from `apps/web`; the design system is `@palier/ui`
**Date:** 19 September 2026 · **Status:** accepted

`apps/web` shipped from `create-next-app` with Tailwind v4 (`@tailwindcss/postcss`,
`tailwindcss`, `postcss.config.mjs`, an `@import "tailwindcss"` in `globals.css`). The design
system of record is `@palier/ui` — the tokens and the `.pl-*` component classes — so a second,
utility-based styling system alongside it is drift waiting to happen. Both Tailwind packages,
`postcss.config.mjs` and its eslint exemption line were removed; `globals.css` now imports
`@palier/ui`'s `tokens.css` + `components.css` (via the layout) and carries only the page-frame
layout (header/main/footer, skip link) that a primitive does not. Verified: the production
build and all gates pass without Tailwind or PostCSS.

### D26 — Lighthouse and bundle-size gate tooling
**Date:** 19 September 2026 · **Status:** accepted

Two phase-0 gates needed new tooling, both wired into the medium lane (`verify.yml`), both
run against the production build:

- **Lighthouse:** `@lhci/cli@0.15.1` (`apps/web/lighthouserc.json`), **desktop preset**,
  asserting `categories:performance` and `categories:accessibility` ≥ 0.95 on `/en` and
  `/fr`. Desktop rather than the mobile default deliberately, for a flake-free gate (§6.5
  zero-tolerance); the shell scores 1.0 on both. The mobile Core-Web-Vitals field budgets in
  architecture.md §13 (LCP/INP/CLS) are a separate, later addition.
- **Bundle size:** a **zero-dependency** Node script (`apps/web/scripts/check-bundle-size.mjs`)
  that gzips the App Router runtime + polyfills from `.next/build-manifest.json`
  (`rootMainFiles` + `polyfillFiles`) and asserts < 180 KB. This measures the shared
  first-load JS every route pays, which is the dominant term for an RSC-first shell; the
  Turbopack build emits no `app-build-manifest.json`, so per-route chunk attribution is
  deferred until a route ships a large client island. `PALIER_BUNDLE_BUDGET_KB` overrides the
  budget, which is how the gate is proven to bite. Current: 165.7 KB of 180.

`next-intl@4.14.5` was added as an `@palier/web` dependency — architecturally mandated
(architecture.md §3), so a note rather than an ADR.

### D27 — The French non-affiliation string was a Canadian-French draft, now confirmed
**Date:** 19 September 2026 · **Status:** RESOLVED 19 September 2026

`product-requirements.md` §2 gives the non-affiliation statement **in English only**. The
footer carries it on every page and `fr.json` key parity is CI-gated, so a French string is
required; PRD §12 forbids silent machine translation. `apps/web/messages/fr.json` therefore
carries a Canadian-French rendering ("outil d'étude indépendant à code source ouvert…
Commission de la fonction publique du Canada…").

**Resolution:** the owner confirmed the wording (19 September 2026), so the string is no
longer an unreviewed draft. The broader full-French interface review R8 schedules for phase 7
still applies to the app's growing string set, but this specific string is settled.

### D28 — `ItemResponse` is an alias for `OptionId` until a non-MCQ type lands
**Date:** 19 September 2026 · **Status:** open, closes when a non-multiple-choice type is added

§3.4 types `score` as `(item, response) => Outcome` but gives `response` no type. Every
current item type is single-key multiple-choice, so `ItemResponse` is defined in
`@palier/domain` as an alias for `OptionId`, and `scoreMcq` is the one scorer registered for
all four types. It is a **named** alias, not a bare `OptionId` at each call site, precisely so
that widening it to a discriminated union (a cloze response, a drag-order, a free-text span)
when a non-MCQ type arrives is a one-line change in one place that the compiler then chases
through every scorer. This is D19/D20's discipline — decide the minimum the contract needs,
name it, and record that it is a minimum — applied to the registry's response type. ADR 17's
*revisit when* names the same trigger.

### D29 — `PromptSpec` is minimal until the content factory lands
**Date:** 19 September 2026 · **Status:** open, closes with `apps/factory` (Phase 1)

`generatePrompt` is one of the five registry members (§3.4) and must be present for the
registry contract to be complete, but its output `PromptSpec` is owned by the content factory
(Phase 1), which does not exist yet. So `@palier/domain` carries a **minimal** `PromptSpec`
(`{ itemType, targetBand, subSkill, instructions }`) and a per-type instruction string, which
is enough to make the member real and per-type-dispatched without pre-inventing the factory's
prompt shape. The factory fleshes it out in its own session, the same way D19 keeps
`ScheduleEntry` minimal until the scheduler. Recorded so the next session does not mistake the
minimal shape for the intended one.

### D30 — Lighthouse runs the median of five, not a single run
**Date:** 20 September 2026 · **Status:** accepted, corrects D26

D26 introduced the Lighthouse gate as `numberOfRuns: 1` on the desktop preset and called it
"flake-free... the shell scores 1.0 on both". CI has since shown that claim to be wrong: the
same `/en` page scores across a wide band on GitHub's shared runners — 0.77 on #6's PR and
`main` runs, 0.81 on #7's run, and ≥0.95 on one #6 push run — so the gate passed or failed
essentially at random, and has been **red on `main` since #6 introduced it**, unrelated to
any application change. A single Lighthouse run is not "deterministic by construction" (the
premise §6.5's zero-retry policy rests on), chiefly because the first run against a
just-started server is anomalously slow.

`lighthouserc.json` now sets `numberOfRuns: 5` with `aggregationMethod: "median"`, which is
Lighthouse's own recommended practice: the median discards the cold first run and the tails,
so the asserted number reflects the page's steady-state score rather than one sample. This is
**measurement methodology, not a retry** — it does not re-run a failed step hoping for a
different answer; it takes a more stable statistic of a known-noisy measurement. The 0.95
threshold and the desktop preset are unchanged. If the median still lands below 0.95, that is
now honest signal that the page has a real performance defect to fix, not runner noise.

### D31 — The canonical fixture bank seeds forms and a scenario, not only items
**Date:** 20 September 2026 · **Status:** accepted

§6.4 asks for "a canonical fixture bank of about 60 items". `packages/testing/src/fixtures/bank.ts`
carries exactly sixty items, and also the passages its comprehension items reference, two exam
forms whose item ids resolve within the bank, and one oral scenario. The extra artefacts are
there because `MemoryBank` (and so a seeded `ItemRepository`) exposes `passage`/`form`/`scenario`
lookups, and a fixture bank that leaves those empty would force every future test of those paths
to hand-assemble its own — the exact duplication §6.4 exists to prevent. The bank is **generated**
from the existing builders over the scored-skill taxonomy (all 8 reading + 10 writing sub-skills),
across bands A/B/C, with the correct key rotating a→b→c→d so the distribution is not degenerate
(the healthy case the Phase-1 content suite guards). Reading items are `comprehension` (passage
backed); writing items rotate `cloze`/`error-id`/`best-completion`, so all four item types and
every quality-check branch are exercised. `bank.test.ts` is the contract: sixty items, each
schema-valid and `validate()`-clean, full taxonomy coverage, every key used, every passage and
form id resolving. The French/English are templated placeholders — these are fixtures, so
structure and coverage are the point, not prose (real content is the factory's job, Phase 1).

`fixtureBankRepository()` returns `memoryItemRepository(FIXTURE_BANK)` in one call. It is **not**
wired into the hermetic composition root: no route reads items until Phase 2, and wiring it
without a consumer or a test would be premature — left for the Phase-2 drill route that first
needs seeded content.

### D32 — The engine receives time and randomness as primitives, not the ports
**Date:** 20 September 2026 · **Status:** accepted

`implementation-plan.md` §3.2 says the engine's functions are "given `Clock` and `Random` as
parameters." Taken literally that is impossible: `Clock`, `Random` and `ISO` are ports and live
in `@palier/app` (D18), which `@palier/engine` may not import (§3.1). So the engine takes the
**capabilities as primitives** — `now: string` (an ISO-8601 instant, the same plain string
`Attempt.ts` already uses) and `random: () => number` (the shape of `Random.next`) — and no
engine type names `Clock`, `Random` or `ISO`. The `@palier/app` use case bridges: it reads
`clock.now()` / `random.next` and hands the values down. §3.2 now states this in place, and
`packages/engine/CLAUDE.md` carries it as an invariant.

**Why not move `ISO`/`Clock`/`Random` to `@palier/domain` instead?** That would reverse D18
(ports belong with the ports) to let a lower layer name a port type, for no behavioural gain —
the value crosses to `Date.parse` and JSON as a bare string regardless. D18's "revisit if a
domain type needs to name an instant" is not triggered: the *engine* is not a domain type.

**Exercised, not yet by this slice.** Slice 1 (Scorer, TrendCalculator) takes neither time nor
randomness — the Scorer is pure over a form and responses, the TrendCalculator over attempts
joined to items. D32 is recorded now because it governs the whole engine-core effort and the
barrel comment references it; it first *bites* with the **Scheduler** (`now`) and the
**Selector** (`random`).

**The join note, since three engine functions need it.** `Attempt` carries `itemId`, `correct`,
`skill` and timings but not `subSkill` or `targetBand`. Any calculation keyed on a band tag or a
sub-skill therefore joins attempts to items by id — `calculateTrend` takes `items` for exactly
this — and ignores an attempt whose item is absent from the supplied bank.

### D33 — Selector: Efraimidis–Spirakis sampling, and diagnostic mode is uniform
**Date:** 20 September 2026 · **Status:** accepted

Two implementation choices in `selector.ts` that §7.2 leaves open.

**The "weighted shuffle" is the Efraimidis–Spirakis method:** each candidate gets the key
`random()^(1/weight)` and the highest keys are taken. It is a weighted sample without
replacement whose inclusion probability is proportional to weight (so a weakest-sub-skill item
is drawn 3× as often), done in one `map`→`sort`→`slice` with no index arithmetic. It was chosen
over the textbook cumulative-sum scan specifically because the scan needs a "fell through to the
last bucket" fallback that `random() < 1` makes unreachable — a dead line the engine's 100%
statement/line target forbids, and which `!` or an `as` would only paper over. A visible
consequence: at equal luck the heavier item wins (the unit tests assert exactly this), rather
than the scan's "owns 3/4 of the number line" framing.

**Diagnostic mode is unweighted (uniform) sampling, not strict stratification.** §7.2 says
diagnostic "samples evenly across bands and sub-skills rather than weighting." It is implemented
as: drop the working-set band restriction (draw from every band) and the sub-skill weighting
(all weights 1), then the same no-consecutive-sub-skill spacing. Even coverage then comes from
the bank's own even sub-skill representation plus the spacing, rather than from an explicit
per-stratum round-robin. This keeps one sampling path and avoids the index-heavy stratified
picker. **Revisit when** a real diagnostic shows uneven coverage on a skewed bank; the fix is a
stratified sampler behind the same `selectItems(mode: "diagnostic")` signature, no caller change.

**Spacing** (no two consecutive items share a sub-skill) is the standard "largest group first,
fill even slots then odd" arrangement: it separates every sub-skill when the largest is at most
half the items, and degrades gracefully when one unavoidably dominates (the all-one-sub-skill
case is a unit test). `now`/`random` are primitives throughout (D32).

### D34 — The Planner budgets in item counts, not minutes
**Date:** 20 September 2026 · **Status:** open, revisit if a per-item duration ever earns a home

`architecture.md` §7.4 writes the daily plan as shares "of the daily minute goal" — due reviews
capped at 40% of it, new items ~40%, maintenance ~20%. There is **no per-item duration** anywhere:
not in `content/profiles/psc-sle.json`, not on `Item`, not in domain. Budgeting in minutes would
mean either putting a duration constant in the engine — which ADR 9 forbids ("exam rules live in
the profile, never in code", and a per-item minute estimate is exactly such a tunable number) — or
adding per-skill/per-type minute estimates to the profile now, ahead of any consumer that needs
them.

So `planDay` takes `sessionSize`, a **total item count**, and splits it 40/40/20 via the exported
`REVIEW_SHARE`/`NEW_SHARE`/`MAINTENANCE_SHARE` constants. Those shares and `TAPER_DAYS`/
`SHORTEN_FACTOR` are engine tuning heuristics kept in code, consistent with the selector's own
`RECENT_DAYS`/`WEAKEST_WEIGHT` — they are study heuristics, not published PSC exam rules, which is
the line ADR 9 actually draws. An under-filled review bucket rolls its budget into new + maintenance
at their 2:1 ratio, so a light-review day still fills to `sessionSize`.

**The alternative — minute estimates in the profile — was considered and deferred.** It is more
faithful to §7.4's wording, but it invents a tuning surface (and the arithmetic to convert it) with
no consumer, for a Phase-2 display decision (how long a session should feel) that nobody has made.
Revisit when a real "minutes per day" goal in the UI needs converting to counts; the fix is a
minute→count model behind the same `planDay(sessionSize)` seam, no caller change.

### D35 — Oral-session-findings injection is deferred to Phase 5
**Date:** 20 September 2026 · **Status:** open, closes with the oral session types (Phase 5)

§7.4 lists three plan adjustments: test-date proximity, **recent oral session findings (inject
targeted items)**, and yesterday's completion. The first and third model cleanly from plain inputs
and are built now — `testDate` drives the final-three-days taper (review only, no new items, one
short confidence set, no mock advised in the last 24h) and `lastDayCompleted: false` shortens the
day (`SHORTEN_FACTOR`, never lengthens). The **oral-findings** adjustment is deferred: the oral
session/findings domain types do not exist yet (Phase 5, alongside `OralStore` — see D18's
still-deferred ports), so building against them would invent a type ahead of its consumer, the
exact thing D19/D28/D29 warn against.

`planDay` therefore takes no oral input today. When Phase 5 lands the oral findings type, the
injection is an additive input to `DayPlanInput` and a bucket that biases the new-item selection —
no reshape of the existing signature. Recorded so the next session does not read the current
`DayPlanInput` as the final shape.

---

## Session log

Newest first. One entry per session that changed something. Never edit an older entry.

### 20 September 2026 — `dougkeefe/continue-dev-from-progress` (engine core, slice 4: the Planner)

Daily plan generation (architecture.md §7.4), slice 4, which **completes the pure `@palier/engine`
core** (`implementation-plan.md` §3.2: Selector, Scheduler, Planner, Scorer, BandMapper,
TrendCalculator). Deviations **D34** (budget in item counts, not minutes — ADR 9) and **D35** (oral
findings deferred to Phase 5) recorded. No ADR — the §3 module structure and the eight principles
are untouched. No dependency added.

Built `packages/engine/src/planner.ts` — `planDay(input, random, now)`:

- A **composition**, not new arithmetic. New items go through `selectItems` practice mode (already
  weights the three weakest sub-skills, §7.2); maintenance goes through `selectItems` diagnostic
  mode over a pool pre-filtered to the working-set bands and away from the weakest sub-skills
  ("strengths"); `weakestSubSkills` defines that split. No sampling or spacing code is added and the
  selector's surface grows by nothing. `scheduleReview` is not called — due reviews arrive already
  resolved to `Item`s (the app use case reads them from the `ScheduleStore`), so the planner needs
  no `ExamProfile`.
- **Split:** reviews capped at `REVIEW_SHARE` (40%) of the day; the remainder splits into new and
  maintenance at their 2:1 ratio, so an under-filled review bucket rolls into learning and the day
  still fills to `sessionSize`. Buckets are disjoint by construction (each `selectItems` call gets a
  pool with the already-chosen ids removed).
- **Adjustments (D35):** `testDate` within `TAPER_DAYS` (3) → taper: no new items, reviews plus one
  short confidence set from strengths, and `mockExamAdvised` true only outside the final 24h.
  `lastDayCompleted: false` → shorten by `SHORTEN_FACTOR` (0.5), never lengthen. Oral findings
  deferred.
- `now`/`random` are primitives (D32); budget is item counts, not minutes (D34). Exported from the
  barrel; `index.test.ts` extended; `packages/engine/CLAUDE.md` updated (§10).

Tests: `planner.test.ts` (the 40/40/20 split at a clean budget, review cap + roll-over, study
order, buckets never overlap incl. a due review that is also in the pool, maintenance excludes the
weakest sub-skill, shorten-after-a-miss and no-change-when-completed, the taper with its confidence
set and the 24-hour mock blackout, taper on the test day, a beyond-window normal plan, a past test
date, seed reproducibility and divergence, empty/undersupplied pool and zero budget) and
`planner.property.test.ts` (§6.2: never over budget, buckets disjoint, tapering suppresses new items
and the 24h mock rule, shortening never lengthens).

**Verified:** `pnpm verify` green (**exit 0**) — check-types 14/14, lint clean, depcruise clean
(**144 modules, 420 dependencies** in packages — +3 for the planner and its two test files; engine
still imports `@palier/domain` only, no new arrow, `random`/`now` add none; **34 in `apps/web`**),
**497 tests passed, 4 todo, 43 files**. Every glob coverage threshold held: **`@palier/engine` at
100% branch** (no breach printed). The **disjoint-buckets property was proven to bite** — dropping
the new-item exclusion from the maintenance pool failed `keeps the three buckets disjoint`, then
reverted. `planDay` confirmed present in `packages/engine/dist/index.js` (D6). **Next:** the pure
core is complete; the remaining phase-0 item is the deferred ports and the first `@palier/app` use
case (Suggested next), which is what threads `clock.now()`/`random.next` into `planDay`.

### 20 September 2026 — `dougkeefe/continue-docs-progress` (engine core, slice 3: Selector + weakest sub-skills)

Item selection (architecture.md §7.2), slice 3. The `random` primitive first bites here (D32).
Deviation **D33** recorded (Efraimidis–Spirakis weighted sampling; diagnostic mode is uniform).
No ADR, no dependency.

Built:

- `packages/engine/src/weakest-sub-skills.ts` — `weakestSubSkills(skill, attempts, items)`:
  accuracy over the last `WEAKEST_WINDOW` (50) attempts per sub-skill, `WEAKEST_MIN` (8) to
  qualify, the `WEAKEST_COUNT` (3) weakest returned weakest-first with a deterministic
  name tie-break. Joins attempts→items (D32).
- `packages/engine/src/selector.ts` — `selectItems(criteria, pool, attempts, random, now)`:
  filter (published, lang, skill, not attempted in the last `RECENT_DAYS` = 14) then a weighted
  shuffle. Practice mode restricts to the `workingSet` (target band + one below, via
  `compareBands`) and weights the three weakest sub-skills `WEAKEST_WEIGHT` (3×); diagnostic mode
  drops both (coverage, not targeting — D33). Weighted sampling is Efraimidis–Spirakis; the
  result is spaced so no two consecutive items share a sub-skill. Exported with `workingSet`;
  `index.test.ts` extended.

Tests: `weakest-sub-skills.test.ts` (three weakest, min-evidence boundary, window, skill filter,
fewer-than-three, ties, orphan attempts), `selector.test.ts` (each filter, working set, weighting
with E–S semantics, no-consecutive ordering, the all-one-sub-skill degrade, reproducibility, and
different-seed divergence, diagnostic across all bands + coverage + filters, default mode), and
`selector.property.test.ts` (§6.2: only eligible items in the working set, never a 14-day item,
each at most once and never over count, no two consecutive when feasible).

**Verified:** `pnpm verify` green (**exit 0**) — check-types 8 packages, lint clean, depcruise
clean (**141 modules, 404 dependencies** in packages — engine imports `@palier/domain` only, no
new arrow, `random`/`now` add none; **34 in `apps/web`**), **475 tests passed, 4 todo**. Every
glob coverage threshold held: **`@palier/engine` at 100% branch** (an lcov pass caught one
uncovered arm — the "item not in bank" join — before it could hide; a test now covers it).
**Next:** Slice 4, the Planner (composes the scheduler, selector and weakest-sub-skills).

### 20 September 2026 — `dougkeefe/continue-docs-progress` (engine core, slice 2: Leitner Scheduler)

The review scheduler (architecture.md §7.3), slice 2 of the engine core. **D32 first bites
here** — `now` arrives as a plain ISO string, not a `Clock`. The D19 note is updated: the box
lives on the engine's own `Review` type, not yet on `app`'s `ScheduleEntry`. No ADR, no
dependency.

Built `packages/engine/src/scheduler.ts` — `scheduleReview(profile, currentBox, grade, now)`:
correct moves up one box, incorrect resets to box 1 always, and a correct-but-`slow` or
`changedAnswer` grade holds the box (§7.3). Returns `{ box, due }`; `due` is `null` at
retirement and otherwise `now + leitnerIntervalDays(profile, newBox)` days, exact so midnight in
gives midnight out. The intervals come from the profile (ADR 8) and so does the **box count** —
`retirementBox(profile) = leitnerIntervalDays.length + 1`, so the "five boxes" is derived, not a
constant (ADR 9). `slow` arrives as a boolean the caller computes from timings, because the
timing-to-slow threshold is a product tuning decision, not a Leitner rule (D28's minimalism).
Out-of-range or non-integer boxes throw. Exported from the barrel; `index.test.ts` extended.

Tests: `scheduler.test.ts` (advance, retire, reset, both holds, incorrect-overrides-hold,
midnight due strings, the three guards, the derived retirement box) and
`scheduler.property.test.ts` (§6.2: incorrect always → box 1; correct never lowers the box nor
shortens the interval; a due date exists **iff** the item has not retired; a scheduled due is
strictly after `now`). `fc.date` needed `noInvalidDate: true`, caught by running it.

**Verified:** `pnpm verify` green (**exit 0**) — check-types 8 packages, lint clean, depcruise
clean (**136 modules, 381 dependencies** in packages — engine imports `@palier/domain` only, no
new arrow; **34 in `apps/web`**), **440 tests passed, 4 todo**. Every glob coverage threshold
held: **`@palier/engine` at 100% branch** (0 breaches). **Next:** Slice 3, the Selector
(`random` primitive first bites here).

### 20 September 2026 — `dougkeefe/continue-docs-progress` (engine core, slice 1: Scorer + TrendCalculator)

The `@palier/engine` pure core, built ahead of Phase 1 as a sequencing move (recorded in
`implementation-plan.md` §7, "sequencing is a preference" per §1). Slice 1 of four; the
Scheduler, Selector and Planner follow in their own slices. Deviation **D32** recorded (the
engine takes time/randomness as primitives, not the ports). No ADR — the §3 module structure
and the eight principles are untouched. No dependency added.

Built (`packages/engine/src/`):

- **`trend-calculator.ts`** — `calculateTrend(skill, attempts, items)` (architecture.md §7.1):
  accuracy per band tag over the last `TREND_WINDOW` (100) scored attempts, with the closed-form
  **Wilson 95%** interval, gated by `MIN_EVIDENCE` (30) — below which it returns a discriminated
  `insufficient` result naming what is still needed, so a caller cannot render a phantom figure.
  Joins attempts→items for the band tag (D32); attempts whose item is absent are ignored.
- **`scorer.ts`** — `scoreExam(form, items, responses)` (architecture.md §7.5): raw over scored
  items only, pilots marked and excluded, per item via the domain registry
  (`itemTypeDefinition(item.type).score`), band from the **form's own `bandCuts`** (not the live
  profile), pure so rescoring is idempotent.
- **`band-mapper.ts`** — refactored to share one `resolveBand` core between the variant path
  (`mapRawScore`) and the form path (`scoreExam`), so the two cannot drift (§5). `resolveBand` is
  exported for `scorer.ts` but kept off the barrel. Behaviour unchanged — the existing
  band-mapper suite is the regression guard and stayed green.
- **`index.ts`** — was `export {}`; now the real public surface (band mapper, trend, scorer).
  The BandMapper had been reachable only by a relative import, so `dist` exported nothing.
- **`__fixtures__/exam-band-boundaries.golden.json`** + `scorer.golden.test.ts` — the golden
  pattern (§5): recorded band outcomes at every cut boundary of the real reading-unsupervised
  table; a change that moves a value fails here and must be explained.

Tests: `trend-calculator.test.ts` (min-evidence, Wilson textbook [0.404, 0.596] at 50/100, 0%
and 100% clamping, window, joins, skill filter), `trend-calculator.property.test.ts` (Wilson vs
an independent reference across the range; accuracy monotonic in correctness — §6.2 tier 2),
`scorer.test.ts` (pilots, unanswered, boundaries, idempotence, missing-item throw),
`index.test.ts` (barrel), `scorer.golden.test.ts`. Engine local fixtures under
`__tests__/fixtures.ts` (the domain pattern — importing `@palier/testing` would cycle through
`@palier/app`).

**Verified:** `pnpm verify` green (**exit 0**) — check-types 8 packages, lint clean, depcruise
clean (**133 modules, 369 dependencies** in packages — `@palier/engine` still imports
`@palier/domain` only, no new arrow; **34 in `apps/web`**, unchanged), **422 tests passed, 4
todo, 36 files**. Every glob coverage threshold held: **`@palier/engine` at 100% branch**
(regained after replacing a three-way `ts` sort ternary — whose equal-timestamp arm no test hit
— with a branchless `localeCompare`; overall branches 96.73%). Built `packages/engine/dist/index.js`
confirmed non-empty and `resolveBand` confirmed absent from it.

**Two things caught by running, not assuming:** (1) the barrel was `export {}`, so the package
had shipped an empty public surface since the BandMapper landed — fixed here. (2) A redundant
"interval contains the point accuracy" property tripped on floating-point dust (`low` =
6.9e-18 at p=0); it added nothing over the exact reference-Wilson match, so it was dropped
rather than fudged with an epsilon. **Next:** Slice 2, the Scheduler (D32 first bites here).

### 20 September 2026 — `dougkeefe/continue-dev-from-docs-v3` (phase-0 scaffolding: licences, README, fixture bank)

The two remaining concrete phase-0 deliverables, per the Suggested-next scaffolding bundle.
No ADR — nothing here changes a §3 decision. Deviation **D31** recorded.

Licences and README: `LICENSE` (MIT, the code) and `LICENSE-CONTENT` (the verbatim CC BY 4.0
legal code, the content) added at the repo root; root `package.json` gains `"license": "MIT"`.
`README.md` gained the R5 non-affiliation paragraph — copied character-for-character from the
`apps/web/messages/en.json` footer string so the two cannot drift — and a Licence section, and
had two stale lines corrected (the "every package is a placeholder" line, and a pointer at the
deleted `apps/web/eslint.config.mjs` → the single root config, D5). This satisfies the *phase-0*
portion of **R5** and **R13** ("licence files present from the first commit"); the requirement
table is left untouched because full R5/R13 (repo public, human copy pass) is Phase 7.

Fixture bank: `packages/testing/src/fixtures/bank.ts` — `FIXTURE_BANK` (sixty items generated
across all 18 scored sub-skills, bands A/B/C, rotating keys; plus their passages, two exam forms
and one oral scenario) and `fixtureBankRepository()`, both re-exported from the package barrel.
Generated from the existing builders, not hand-written, so its invariants hold by construction;
`bank.test.ts` is the contract (D31). Unblocks Phase-2 engine/adapter testing (§6.4).

**Verified:** `pnpm build` green (8/8), then `pnpm verify` green (**exit 0**) — check-types
14/14, lint clean, depcruise clean (**125 modules, 330 dependencies** in packages — +2 for
`bank.ts`/`bank.test.ts`, no new arrow: `bank.ts` imports `@palier/domain` + `@palier/app` types
and same-package builders only; **34 modules** in `apps/web`, unchanged), **390 tests passed, 4
todo, 31 files** (+14 from `bank.test.ts`). Every glob coverage threshold held (overall
branches 96.51%). **Next:** the remaining ports and the first use cases (see Suggested next).

### 20 September 2026 — `dougkeefe/lighthouse-median-runs` (Lighthouse gate made deterministic)

The Lighthouse performance gate had been red on `main` since D26 introduced it: a single
desktop run of `/en` scored anywhere from 0.77 to ≥0.95 on shared CI runners, so the ≥0.95
assertion passed or failed at random. Changed `apps/web/lighthouserc.json` to `numberOfRuns:
5` with `aggregationMethod: "median"`, so the asserted score is the steady-state median rather
than one noisy sample (the cold first run is discarded). Threshold, preset and URLs unchanged.
Config-only; recorded as deviation **D30**, which corrects D26's "flake-free" claim.

### 19 September 2026 — `dougkeefe/continue-dev-from-docs-v2` (item type registry, ADR 17)

The item type registry (§3.4), the last deferred phase-0 mechanism, built across its three
homes as ADR 17 decides. **Resolves D13** and closes the §4.5 architecture-test gap. Also
recorded: deviations D28 (`ItemResponse` alias) and D29 (`PromptSpec` minimal). No runtime
dependency added.

`@palier/domain` gains `src/item-types/`: the React-free `ItemTypeDefinition`
(`schema`, `score`, `validate`, `generatePrompt`, `a11yContract`) and
`ITEM_TYPE_DEFINITIONS`, a `Record<ItemType, ItemTypeDefinition>` so a missing type is a
`tsc` error, not a runtime one — a stronger form of principle 6 than the imperative
`registerItemType` §3.4 illustrated (ADR 17 refines that literal). `score` is uniform MCQ
(`response === item.key`); per-type `validate` reports deterministic quality issues the
schema cannot express (a cloze without its `blankIndex`, an item without all four options);
per-type `schema` is `itemSchema` narrowed to the type; `generatePrompt` carries a minimal
per-type instruction (D29). `@palier/ui` gains `src/item-types/`: `itemRenderers`, the
parallel `Record<ItemType, ItemRenderer>`, and `McqItem` — a `"use client"` radio-group
renderer built on the existing `OptionRow`/`optionRowKeydown` primitives, shared by all four
types today (per-type presentation is Phase 2, ADR 17). `apps/web/src/lib/item-types.ts` is
the composition root's cross-map check: a compile-time `Equals` that both maps key on
`ItemType`, plus a runtime `assertItemTypeRegistryComplete`. The §4.5 architecture test now
exists at `packages/domain/src/__tests__/architecture.test.ts`.

Docs: **ADR 17** written; `implementation-plan.md` §3.4's "cannot be built as written" note
now points at it; `packages/domain/CLAUDE.md` and `packages/ui/CLAUDE.md` gained the registry
invariant (§10).

**Verified:**

- `pnpm verify` green (exit 0) — check-types 14/14, lint clean, depcruise clean (**123
  modules, 321 dependencies** in packages, **34 in `apps/web`** — no new arrow: domain gains
  no import, ui imports domain types only, engine untouched), **376 tests passed, 4 todo, 30
  files**; every glob threshold held (`@palier/domain` at 100%, `@palier/ui` `.ts` logic at
  90%).
- `pnpm --filter @palier/web build` green — the `"use client"` directive on `McqItem` is what
  makes the barrel safe to pull into the server graph; without it the build failed on the
  React-hook import (caught and fixed here).
- **Both gates proven to bite, then reverted:** removing the `best-completion` entry from
  `ITEM_TYPE_DEFINITIONS` failed check-types with
  `TS2741: Property '"best-completion"' is missing … required in type 'Record<…, ItemTypeDefinition>'`
  (compile-time exhaustiveness); coercing one entry's `score` to `undefined` past the type
  system failed the §4.5 architecture test with `expected 'undefined' to be 'function'`. The
  runtime cross-map drift check (`registryKeysError`) is proven by a committed test with
  mismatched inputs.

**A11y note.** The renderers carry structural a11y assertions in the ui unit tests
(radiogroup named by the stem, four radios, roving tabindex, a text label beside every
colour cue), following the six primitives' precedent. The full axe-on-state assertion lands
with the Phase-2 drill route that first mounts them — there is no route to axe today, so the
medium lane is unchanged. **Next:** the remaining ports/use cases and the licence/README +
fixture-bank scaffolding (see Suggested next).

### 19 September 2026 — `dougkeefe/continue-dev-from-docs-v1` (apps/web shell + the four shell gates)

The `apps/web` application shell, per `implementation-plan.md` §7/§3.5 and
`product-requirements.md` §2/§7/§10–§12, and the four phase-0 gates that waited on it.
**Closes the axe, Lighthouse, bundle-size and i18n-parity exit gates — every phase-0 CI gate
is now built.** Deviations D23–D27 recorded. No ADR — nothing here changes a §3 decision.

Built: locale-prefixed routing under `src/app/[locale]/` with next-intl
(`src/i18n/{routing,request,navigation}.ts`, `src/proxy.ts`), `en`/`fr` prerendered and `/`
redirecting; a root layout setting `<html lang>` and importing `@palier/ui`'s CSS; the shell
components (`Header` with an equal-prominence language toggle labelled in the other language's
own name + `lang`, a quiet `SyncStatus` placeholder, `Footer` carrying the R5 non-affiliation
statement on every page); a landing page and an `/about` page; `messages/{en,fr}.json` at full
key parity; and the composition root `src/lib/container.ts` wiring the `@palier/testing`
in-memory ports behind `PALIER_HERMETIC`.

Dependencies added (D26): `next-intl@4.14.5` (dep, architecture.md §3), `@lhci/cli@0.15.1`
(devDep). Tailwind removed (D25): `@tailwindcss/postcss`, `tailwindcss`, `postcss.config.mjs`
gone; the app composes `@palier/ui` plus a small `globals.css` page frame.

Config: `next.config.ts` wraps the next-intl plugin; `eslint.config.mjs` exempts
`src/i18n/request.ts` (plugin default export) and adds Node globals for `**/*.mjs`, and drops
the `postcss.config.mjs` exemption; `verify.yml`'s medium job gained bundle-size and
Lighthouse steps; `.gitignore` gained `.lighthouseci/`, `test-results/`, `playwright-report/`.
`docs/adr/README.md` written (format, never-edit-only-supersede, numbers-on-acceptance).

**Verified:**

- `pnpm verify` green — check-types 14/14, lint clean, depcruise clean (112 modules in
  packages, **31 in `apps/web`**), **345 tests passed, 4 todo, 26 files**; coverage held every
  glob threshold. **Cold fast lane ~5 s** (caches and `dist` deleted first) against the 90 s
  budget.
- `pnpm --filter @palier/web build` green — `/en`, `/fr`, `/en/about`, `/fr/about` prerender
  as SSG; Proxy (middleware) active.
- Medium lane green: integration 2/2, **E2E 8/8** (axe clean on `/en`, `/fr`, `/en/about` and
  the toggle-focused state; header keyboard focus order; locale switch preserving the route;
  footer disclaimer present), bundle size **165.7 KB of 180**, Lighthouse **perf 1.0 / a11y
  1.0** on both locales.
- **All four new gates proven to bite, then reverted:** i18n parity (dropped a `fr.json` key
  → `hold identical key paths` failed); axe (empty `<button>` → `button-name` violation);
  bundle size (`PALIER_BUNDLE_BUDGET_KB=100` → over budget by 65.7 KB); Lighthouse (impossible
  `minScore: 1.01` → `Assertion failed. Exiting with status code 1`).

**Raised for the owner:** the French non-affiliation string is a Canadian-French *draft*
(D27), not sourced — confirm before launch. **Next:** the item type registry (ADR 0017, D13),
the remaining ports/use cases, and the licence/README files — see the Suggested next three.

### 19 September 2026 — `dougkeefe/osaka-v1` (@palier/ui tokens, contrast gate, six primitives)

`@palier/ui` filled in per `implementation-plan.md` §7 and `product-requirements.md` §10–§12: the
design tokens, the contrast-validation gate, and the six primitives. **Closes the contrast exit
criterion.** Deviations D21 and D22 recorded. No ADR — nothing here changes a §3 decision.

`packages/ui/src/` now holds: `tokens/tokens.ts` (the §10.2 table as the single source of truth)
and `tokens/css.ts` (`renderTokensCss`); `contrast.ts` (WCAG luminance + ratio, closed-form, no
dependency); `styles/tokens.css` (generated, drift-guarded) and `styles/components.css`
(hand-authored focus/target-size/reduced-motion/elevation); `primitives/logic.ts` (pure:
`buttonClass`, `optionRowState`, `optionRowKeydown`, `railGeometry`, `calloutState`) and the six
`.tsx` renderers (`Button`, `Card`, `OptionRow`, `ProgressRail`, `Callout`, `EmptyState`) plus a
shared `Glyph`; a barrel of named exports. Correct/incorrect always carry a glyph **and** a text
label (colour is never the only signal, §10.2); every user-visible string arrives via
props/children (no JSX literals).

Dependencies added (D21): `react`/`react-dom` as ui peerDependencies (`^19`) + devDependencies
(`19.2.8`); `@testing-library/react@16.3.0`, `jsdom@26.1.0`, `@types/react`/`@types/react-dom` as
ui devDependencies. `vitest.config.mts` runs the `ui` project in jsdom; `eslint.config.mjs`
exempts test files from the no-JSX-literal rule (the carve-out the purity rules already take).

**Verified:**

- `pnpm verify` green — check-types 14/14, lint clean, depcruise clean (**112 modules, 269
  dependencies** plus 6 in `apps/web`; `react` resolves only under `packages/ui/`), **337 tests
  passed, 4 todo, 24 files**. Coverage held every glob threshold, including
  `packages/ui/src/**/*.ts` at 90% branch; overall 99.5% branch.
- **Cold fast lane 4.56 seconds** (caches and `dist` deleted first), against the 90-second budget.
- **The contrast gate bites** — weakening `--ink-muted` (light) to `#CFC7D6` failed with
  `light: --ink-muted on --bg clears 4.5:1 (is 1.55…:1)` and the `--surface` pair beside it.
  Reverted.
- **The drift guard bites** — one hex digit changed in `tokens.css` failed the guard. Reverted.
- The `.tsx` rendering carries no coverage floor by design (§6.3), but every new branch has a
  behaviour-named test regardless (DoD §10): Button variants + className merge, OptionRow
  selection/ARIA/roving-tabindex/glyph, Card, ProgressRail ARIA, Callout, EmptyState with and
  without an illustration, and every Glyph.

**Deferred, and where the next session hits it:** the `apps/web` shell (routing, layout, null
composition root) now consumes these tokens and primitives and is what the axe, Lighthouse and
i18n-parity gates wait on — see the Suggested next three.

### 19 September 2026 — `dougkeefe/guangzhou-v2` (@palier/app port interfaces)

The first seven ports of `@palier/app` from §3.3, contract-first, then the testing layer
repointed onto them. Deviations D18–D20 recorded. No dependency added.

`packages/app/src/ports/` now holds `time.ts` (`ISO`, `Clock`, `Random`),
`item-repository.ts` (`ItemCriteria`, `ItemRepository`), `attempt-store.ts`,
`schedule-store.ts` (`ScheduleEntry`, `ScheduleStore`), `settings-store.ts`, `key-vault.ts`,
a `ports/` barrel, and a `ports.test-d.ts` asserting branded ids are not interchangeable at
a port boundary. All signatures transcribed from §3.3, our types only; `KeyVault.withApiKey`
keeps its callback shape.

`@palier/testing`: **`ports.stub.ts` deleted** — the definition of done for this task. The
four in-memory stores and their contracts now import the real ports from `@palier/app` and
the real domain types (`Attempt`, `Skill`, `ItemId`) from `@palier/domain`; `fakeClock` and
`seededRandom` re-export `Clock`/`ISO`/`Random` from `@palier/app`. New: `memoryItemRepository`
and `itemRepositoryContract` (13 assertions: ordered `byIds` dropping misses, conjunctive
`query` by skill/sub-skill/band, `exclude`, `limit`, `passage`/`form`/`scenario` returning
`null` when absent, `bankVersion`), plus a local unit test for the empty-bank defaults.
Fixture builders `anItem`, `anAttempt`, `aScheduleEntry`, `aPassage`, `anExamForm`,
`anOralScenario` added (§6.4) — `@palier/domain` keeps its own copy under `src/__tests__`,
which is not exported.

Type-home decisions, all recorded: `ISO`/`Clock`/`Random` in `@palier/app` not `@palier/domain`
(D18); `ScheduleEntry` minimal until the scheduler (D19); `ItemCriteria` + query semantics
decided ahead of the `Selector` (D20). `@palier/domain` untouched.

**Verified:**

- `pnpm verify` green — check-types 14/14, lint clean, depcruise clean (94 modules, 223
  dependencies, plus 6 in `apps/web`), **260 tests passed, 4 todo, 19 files**.
- Coverage held every glob threshold: overall 99.3% branch. The new `memoryItemRepository`
  reached 100% branch only after adding the empty-bank unit test — the shared contract always
  hands it a full bank, so the constructor defaults needed their own test (§10: every new
  branch gets one).
- `@palier/app` is type-only, so its files produce no coverage rows and the
  `packages/app/src/**` 95% glob is satisfied vacuously today; it becomes live when a use
  case lands there. Flagged rather than assumed (the D9 family of coverage traps).
- `grep` confirms no `ports.stub` reference remains in any package's `src`.

**Deferred, and where the next session will hit it:** `SessionStore`/`OralStore` still have
no §3.3 signatures, and `AiProvider`/`SyncTransport`/`TelemetrySink` still need their domain
types — see the Suggested next three and D18's discipline for deciding the unspecified ones.

### 19 September 2026 — `dougkeefe/agent-claude-md-docs` (2 of 2: contradictions resolved)

The ten contradictions reported at the end of the previous entry, resolved. Documentation
only; no source, config or dependency changed. Deviations D16 and D17 recorded, D13 carries
a correction, **ADR 16 written**.

Method, and it is the part worth keeping: `docs/README.md`'s table already said what each
document is authoritative for, so nine of the ten needed no judgement — the non-authoritative
document was simply stale and got corrected against a decision already recorded (ADR 3, 5, 6,
7, 10, and plan §7). That rule is now written into `docs/README.md` for the next one. The
tenth, the estimate store, was a real open question and became ADR 16 rather than an edit,
because `architecture.md` changes by superseding ADR and not by a passing correction.

Files: `docs/adr/0016-derived-state-is-not-persisted-no-estimate-store.md` (new);
`architecture.md` §1, §2, §4, §9.1, §17, §18, §19 and a reconciliation note at the head;
`product-requirements.md` R12, §7, §8.1, §8.11, §13.0, §15, each amendment dated in place;
`implementation-plan.md` §3.3, §3.4, §4, §6.2, §6.3, §7, §10, §12; `docs/README.md` gained
the conflict rule and a 0.2 revision entry; root `CLAUDE.md` ADR count 15 → 16.

**Verified:** `pnpm verify` green — 246 tests, 4 todo, 18 files; depcruise clean, 84 modules
and 185 dependencies plus 6 in `apps/web`. Every replaced string was asserted present before
substitution, so a silent no-op edit was not possible. `architecture.md` §9.1 and the §2
diagram were re-read after the change to confirm no other reference to an estimate store
survives, and `grep` confirms none in `packages/`, `apps/` or `content/`.

**Two things left open on purpose,** both flagged where a future session will hit them
rather than only here: the inferred `writing-unsupervised` `X 0-10` band (D12) still needs
ten minutes against the PSC's published table, and the item type registry (D13) still needs
ADR 17 — `implementation-plan.md` §3.4 now says in place that its literal cannot be built as
written, which is where someone will actually read it.

### 19 September 2026 — `dougkeefe/agent-claude-md-docs` (1 of 2: agent-facing documentation)

`prompts.md` Session 2. A root `CLAUDE.md` router (103 lines, budget 120) and a
`CLAUDE.md` in all six packages. Documentation only; no source, config or dependency
changed.

The router carries, in order: what the project is; the eight §2 principles at one line
each; the six-package table with each package's real import ceiling; the hard rules as
imperatives; a 21-row *where to look* table mapping a task to a document **and section**;
and `pnpm verify` with the three traps that make it non-obvious — build-before-cruise
(D6), `apps/web` typechecking separately (D2), and `--project` silently zeroing coverage
(D9). Deviations D4 **resolved** and D15 recorded.

`packages/app`, `adapters`, `ui` and `testing` are new. `domain` and `engine` were
tightened from ~45 lines to 34 with no fact dropped — the `BAND_RANK` ordering trap, the
`exactOptionalPropertyTypes`/`z.infer` resolution, the `docs/schemas` drift guard and the
engine non-goals with their ADRs are all still there. All six now sit at 26 to 34 lines,
above the brief's 10-to-20; the four required sections cost about ten lines of structure
before any content, and shrinking further meant deleting facts the repo paid to learn.

**Verified:** `pnpm verify` green — 246 tests, 4 todo, 18 files; depcruise clean over 84
modules and 185 dependencies, plus 6 in `apps/web`. Every *where to look* row was opened
and read against the section it names, and every ADR citation checked against the record
it cites.

**Ten contradictions between documents were found and reported to the owner rather than
resolved here**, per the brief. The ones that touch code: `architecture.md` §4 still
describes the three-package layout ADR 10 superseded, and §17 with it; §9.1 persists an
`estimates` table that `implementation-plan.md` §3.3 says must not exist; and
`product-requirements.md` §8.11 lists band estimates as syncing, which `architecture.md`
§9.4 rules out by construction. The remainder are in the reply for that session. None was
written into these files — where a contradiction touched a rule, the file follows the
document `docs/README.md` names as authoritative for it.

### 19 September 2026 — `dougkeefe/continue-implementation` (3 of 3: domain types and the exam profile)

`@palier/domain` filled in per `architecture.md` §5 and `prompts.md` Session 5, plus the
band mapper in `@palier/engine`. Both packages at **100% branch, function, statement and
line coverage**, enforced in config. Deviations D12 to D14 recorded.

One dependency added: `zod@4.6.5`, in `@palier/domain` only.

Branded ids (`ItemId`, `PassageId`, `FormId`, `ScenarioId`, `AttemptId`, `SessionId`,
`DeviceId`) via a phantom property rather than a `unique symbol`, which is TS4023 under
`declaration` + `composite`. The full type set from §5, the taxonomies from
`product-requirements.md` §13, Zod schemas for all six content artefacts, JSON Schema
published to `docs/schemas/`, and the `ExamProfile` loader — synchronous and I/O-free,
taking an already-read value, because §3.2 says domain does no I/O.

`content/profiles/psc-sle.json` transcribed from §5. **All four variants, all cut scores,
checked line by line against the source table** and asserted row by row in
`psc-sle.test.ts` rather than trusted.

**Verified:**

- `pnpm verify` green. 246 tests, 4 `todo`, 18 files.
- `@palier/domain` and `@palier/engine` both at 100% on every metric. Where a branch was
  unreachable it was **removed rather than ignored**: `orderedCuts` now does the
  `Partial<Record<Band, …>>` narrowing once in domain, so the engine has no defensive
  `continue` that no test could honestly cover.
- The band mapping property passes over every variant, driven by
  `describe.each(Object.entries(profile.variants))`. Totality is asserted **exhaustively**
  (≤ 56 calls, cheaper and stronger than sampling); fast-check covers monotonicity.
- The profile gate bites. `writing-supervised` C moved from `[43,51]` to `[44,51]` and the
  suite failed with
  `variants.writing-supervised.cuts: Raw scores 43 to 43 are covered by no band: B ends at 42 and C starts at 44.`
  Reverted.
- The branded-id test bites. `Brand<T, B>` reduced to `T` and `tsc` reported
  `TS2578: Unused '@ts-expect-error' directive` three times — which is why the test uses
  `@ts-expect-error` rather than an equality assertion that would quietly start passing.
  Reverted.
- The JSON Schema drift guard bites: changing `subSkills` from a record to an object
  failed the snapshot until regenerated with `pnpm exec vitest run -u`.
- **Layer 4 of the boundary proof**, now that there is real source to violate. On
  `scratch/arrow-violation`, `@palier/domain` importing `@palier/engine` with the
  dependency properly declared:

```
  error domain-depends-on-nothing: packages/domain/src/bands.ts → packages/engine/dist/index.d.ts
    @palier/domain sits at the bottom of the graph and depends on nothing
    (implementation-plan.md 3.1, ADR 10). If domain needs this, the thing it
    needs is in the wrong package.
```

  Branch deleted. Together with commit 1's runs, all four layers of the gate are now
  proved by running them.

**Two things raised for you, both in the deviations log:**

1. **The `writing-unsupervised` band gap (D12).** §5.2 published
   `A 11-16, B 17-23, C 24-30` on a 30-item paper, leaving 0 to 10 mapping to nothing —
   `prompts.md` Session 5 asks explicitly that this be reported. The profile now carries an
   **inferred** `X: [0, 10]` and §5.2 is amended with a footnote saying so. It is the one
   number in the profile that has not been checked against a source, and a wrong band
   boundary is silent. Worth ten minutes against the PSC's published table.
2. **The item type registry (D13).** It cannot be built as §3.4 specifies: `render` must be
   a `@palier/ui` React component and nothing may import `@palier/ui`, so the registry
   cannot live anywhere below `apps/web`. Deferred rather than worked around; it wants
   ADR 16. §3.4 also has six keys while §4 and §10 say "five members", which needs
   settling before the architecture test can assert a count.

Also of note: `zod`'s NodeNext declaration risk was checked before any code was written
and **did not materialise** (D14). What did bite is `exactOptionalPropertyTypes` versus
`z.infer`, which is why optional fields are written `?: T | undefined` and every schema
ends in `.readonly()`.

### 19 September 2026 — `dougkeefe/continue-implementation` (2 of 3: test infrastructure)

The harness built before there is anything to test, per `implementation-plan.md` §6
and `prompts.md` Session 4. Vitest across nine projects, fast-check, MSW, PGlite,
fake-indexeddb, Playwright with axe, the §6.3 coverage thresholds enforced in config,
and the medium and nightly lanes wired. Deviations D9 to D11 recorded.

Dependencies added, all exact: `fast-check@4.10.1` at the root;
`msw@2.15.0`, `@electric-sql/pglite@0.5.8` and `fake-indexeddb@6.2.5` as
**dependencies** of `@palier/testing`, because it exports those harnesses rather than
merely testing with them; `vitest@5.0.1` as its **peer**; `@playwright/test@1.63.0` and
`@axe-core/playwright@4.13.0` in `apps/web`, beside the app they drive.

`@palier/testing` now holds a seeded `Random` (mulberry32, four lines, auditable) and a
`FakeClock`, in-memory `AttemptStore`, `ScheduleStore`, `SettingsStore` and `KeyVault`,
their four contract suites exported as functions, MSW handlers shared between Node and
browser, the PGlite harness, the hermetic composition-root flag, and the generic fixture
builder. It has three `exports` entries — the root, `./msw/browser` (importing
`msw/browser` from the root would break every Node consumer) and `./setup` (side-effectful,
for `setupFiles`) — which keeps D3's principle of not declaring an entry point with
nothing behind it.

The real port interfaces are deliberately **not** invented here. `src/ports.stub.ts`
carries local placeholders with a comment naming the file they move to when
`@palier/app` lands; only the ports §3.3 actually specifies are stubbed, so nobody
mistakes an invention for a contract.

**Verified:**

- `pnpm verify` green. **Fast lane 4.1 seconds cold**, caches and `dist` deleted first,
  against a 90-second budget. 42 tests, 4 `todo`, across 7 files.
- Coverage thresholds bite. A three-branch function with no test was added to
  `packages/testing/src`, and the run failed with
  `ERROR: Coverage for branches (80%) does not meet "packages/testing/src/**/*.ts" threshold (90%)`.
  Reverted.
- The medium lane runs real embedded Postgres: 2 tests, 1.13s, `select 1` and a
  create/insert/select round trip.
- The test-file relaxation on the arrow rules is narrow. An adapters test importing
  `@palier/ui` still fails with
  `adapters-depend-on-app-and-domain-only-in-tests`. Reverted.
- `depcruise` now sees a real graph rather than an empty one: 45 modules, 61
  dependencies, clean.

**Three things caught by running rather than assuming**, all written up in D9 to D11:
any `--project` filter zeroes Vitest 5.0.1's coverage report while still passing; the
arrow rules forbade the very import §6.2 tier 3 requires; and `playwright.config.ts`
needs a default export, so the exemption list is now "framework file conventions" rather
than "Next.js file conventions".

**Still open in this area:** the 60-item canonical fixture bank and the remaining
in-memory ports both need the domain types, so they follow in the next commit.
`SessionStore` and `OralStore` have no signatures in §3.3 at all — that is a gap in the
plan, not an omission here.

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
