# Palier: Progress archive, deviations D1 to D99

Moved verbatim from `docs/progress.md` on 24 October 2026 (D255). Its index there points here. The rules are
`progress.md`'s: never edit a session entry, and mark a deviation resolved in place, updating its index line too.

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
**Date:** 19 September 2026 · **Status:** partially resolved (`/ids`, `/dexie`, `/openai`, `/bank`); open for `/sync`, `/vault`

§3.2 specifies five subpath exports (`/dexie`, `/bank`, `/openai`, `/sync`, `/vault`).
The package currently declares one root export, because five `exports` entries resolving
to five empty modules assert a boundary with nothing behind it. Add the subpaths with the
first adapter. The lint rule forbidding cross-imports between adapter directories is the
thing that actually enforces §3.2, and it arrives with dependency-cruiser.

**Update, 21 September 2026 (D48).** The first adapter has landed, and it is not one of the five:
`./ids` (the `IdGenerator`, a Web Crypto ULID generator). It is a real subpath resolving to real
content, so D3's principle now has its first instance. The five named directories stay unexported
until each lands.

**Update, 21 September 2026 (D49).** `./dexie` is now live too — the first of the five named
directories. It exports one Dexie-free thing, `dexieStores(name?)`, deliberately: `PalierDb`
(a `Dexie` subclass) is internal, so no vendor type sits in the published `.d.ts`. `/bank`,
`/openai`, `/sync`, `/vault` remain unexported until each lands.

**Update, 24 September 2026 (bank slice).** `./bank` is now live — `httpBankRepository`, the
`ItemRepository` over the committed shards. Its public surface is the port plus
`BankUnavailableError`/`BankContentError`; the manifest type and the GET-only `FetchLike` stay
internal, so no HTTP/fetch type sits in the published `.d.ts`. `/openai` also landed (Phase 1). Only
`/sync` and `/vault` remain unexported, both behind the D43 `ScheduleEntry`-merge gate.

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

**Update, 21 September 2026 (D48).** Done. The first adapter (`/ids`) landed, and the `adapters`
element is now `adapters-ids` (most specific) followed by the general `adapters` catch-all, so
`no-unknown-files` keeps classifying every adapter file. The remaining §3.2 directories each get
their own element as they land. `no-cross-adapter-imports` in `.dependency-cruiser.cjs` remains the
rule that actually enforces the ban.

**Update, 24 September 2026 (bank slice).** `adapters-bank` joins `adapters-ids` and
`adapters-openai` ahead of the `adapters` catch-all. (`/dexie` never took its own element — it uses
the catch-all — so the element list is not exhaustive of the directories; it only needs to keep
`no-unknown-files` classifying, which the catch-all already does.)

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
**Date:** 19 September 2026 · **Status:** **resolved 25 September 2026 by D96** (checked against the PSC: the published table has `X` at 0 to 10)

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
**Date:** 19 September 2026 · **Status:** RESOLVED 20 September 2026 by D38

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

**Resolution (D38), 20 September 2026.** `answerItem` is that use case. `ScheduleEntry` is now
`{ itemId, due: ISO | null, skill, box }` and `ScheduleStore` gained `get`. The prediction in the
original entry held: the box was *added*, not reshaped, so nothing that read `itemId`/`due`/`skill`
changed meaning. One thing the entry did not anticipate — `due` had to become nullable, because
the engine `Review` returns `due: null` at retirement and a non-null `due` would have forced an
encoding. See D38.

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
**Date:** 20 September 2026 · **Status:** RESOLVED 24 September 2026 by D63 (the minute→count model landed at the caller, `planDay` unchanged)

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
**Date:** 20 September 2026 · **Status:** **resolved 28 September 2026 by D124** (Phase 5 Slice 3): the latest oral report's fixes are `focusSubSkills`, an additive `DayPlanInput` field, as this entry foresaw

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

### D36 — The first `@palier/app` use case: `planDailySession`, and its input boundary
**Date:** 20 September 2026 · **Status:** accepted

The first use case (`packages/app/src/use-cases/plan-daily-session.ts`) composes the ports and the
engine `planDay` (architecture.md §7.4) into today's plan. Four choices it settles:

- **Convention.** Use cases live under `src/use-cases/`, one file per use case, each a plain async
  function taking `(request, deps)` — `deps` are the collaborators the composition root supplies
  (`packages/app/CLAUDE.md`: "use cases receive their collaborators"). This is the **first runtime
  (non-type) export** from `@palier/app`; the barrel gained it beside the port types.
- **Naming vs §3.2.** The §3.2 app row lists `StartSession, AnswerItem, …`, not a plan use case;
  architecture §7.4 ("Daily plan generation") is where the daily plan is specified. `planDailySession`
  implements §7.4 and is what `StartSession` will build on. Following the D32/D34 precedent — engine
  reality reconciled to plan wording through a deviation, not by editing §3.2's illustrative list —
  this is recorded rather than the list silently rewritten.
- **Input boundary.** The study parameters `planDay` needs that no port cleanly vends — `skill`,
  `lang`, `targetBand`, `sessionSize`, optional `testDate` — arrive as a typed **request object**
  from the caller, *not* read from `SettingsStore` (untyped k/v) or a `SessionStore` (deferred, no
  §3.3 signature). `lastDayCompleted` is accepted optionally but its real source is the deferred
  `SessionStore`, so today's caller omits it (D35's "don't invent a type ahead of its consumer").
  The optional fields are spread only when present, never passed as explicit `undefined`
  (`exactOptionalPropertyTypes`, D14).
- **Orchestration constants.** Due reviews are fetched with `limit = request.sessionSize` (the
  planner caps reviews at 40% of it, so more is waste). Recent attempts are fetched with
  `attempts.recent(skill, RECENT_ATTEMPTS_FETCHED = 500)` because the planner's two attempt
  consumers want different windows (weakest sub-skill: last 50 per sub-skill; recent-exclusion: 14
  days) and each applies its own internally — the use case supplies a broad slice and lets them
  narrow it. A precise history-window policy is a Phase-2 tuning decision, deferred.

The hermetic composition root's `items` became `fixtureBankRepository()` (was an empty
`memoryItemRepository()`), so the use case has real seeded items to plan against and the wiring
test asserts a non-empty plan — **this closes D31's "wire it with the first consumer"**.

**Update, 21 September 2026 — the `lastDayCompleted` half is now closed by D46.** This entry
left `lastDayCompleted` an optional request field with "its real source is the deferred
`SessionStore`". That store has landed (D45), and `StartSession` (D46) now derives the signal
from `SessionStore.latest()` and passes it down, so the optional is produced by `CompleteSession`
and consumed by `StartSession` through the port — no UI involvement. The parameter stays a
`planDailySession` request field (D42's line held): the derivation belongs to `StartSession`,
which reads the store, not to a new `sessions` dep on the planner.

### D37 — `@palier/app` unit tests use local port stubs, not `@palier/testing`
**Date:** 20 September 2026 · **Status:** accepted

`@palier/testing` depends on `@palier/app` (a production dependency, because its in-memory ports and
contract suites import the port types from there). So adding `@palier/testing` to `@palier/app` — even
as a devDependency for tests — makes Turborepo's build task graph cyclic (`app build → testing build
→ app build`), which it refuses. This is the **same cycle `@palier/engine` already sidesteps** (its
slice-1 log: local fixtures, "importing `@palier/testing` would cycle through `@palier/app`").

So `@palier/app`'s use-case unit tests construct small inline port stubs (a fixed `clock.now`, a
seeded `random.next`, a `schedule.due` returning a set array, an `items` repo over a local item list
built from `@palier/domain`, an `attempts.recent` returning a fixed slice). This is in fact **better**
for a use-case unit test than a shared in-memory store: it controls each port's output precisely,
including the miss and empty-queue guards. The "same graph from `@palier/testing`" that
`implementation-plan.md` §3.5 describes still happens — at the **composition root** (`apps/web`, which
*is* allowed to import `@palier/testing`), in the `buildUseCases` wiring test that plans a real
session from the fixture bank. `packages/app/CLAUDE.md`'s testing line was corrected to say so.

### D38 — `ScheduleEntry` completed and `ScheduleStore.get` added; §3.3 amended in place
**Date:** 20 September 2026 · **Status:** accepted, closes D19

`ScheduleEntry` is now `{ itemId, due: ISO | null, skill, box }`, and `ScheduleStore` is
`{ due, get, put }`. §3.3's signature block carries a dated in-place amendment, because §3.3 is
authoritative for port signatures — unlike §3.2's *illustrative* use-case list, which D36
deliberately left alone. No ADR: §3 and the eight principles are untouched and D19 anticipated
the change.

**Why `get`.** `scheduleReview` needs the item's **current** box, and `due(now, limit)` /
`put(entry)` cannot supply it. `get` is also the only way to reach a retired entry, which `due`
deliberately hides.

**Why `due` is nullable.** The engine's `Review` is `{ box, due: string | null }` — null at
retirement. Mirroring it exactly makes the map a field copy with no encoding step. The
alternatives were considered and rejected: a `retired: boolean` beside a non-null `due` stores
two facts that can disagree, which is the failure mode ADR 16 exists to prevent; deleting the
entry loses the box, so an item answered wrong long after retirement would restart with no
history.

**A consequence that is load-bearing and was nearly missed.** `architecture.md` §9.1 indexes
this store as `schedule: 'itemId, due, skill'`, and IndexedDB will not index a record whose key
path is null — so a retired row drops out of the `due` index while staying addressable by
`itemId`. That happens to be exactly the wanted behaviour, so it is now an asserted line in
`scheduleStoreContract` ("never returns a retired entry from due, but still returns it from
get") rather than something the Dexie adapter discovers in Phase 2.

**ADR 16 was checked, as the hard rule requires, and does not bite.** Its *revisit when* offers
"persisting a derived value as a cache, keyed by a hash of its inputs and never synced", and the
schedule **is** synced (`architecture.md` §9.4), so the question is real rather than rhetorical.
The answer: the schedule is a persisted projection §3.3 and `architecture.md` §9.1 already
sanction, not new derived state — ADR 16's target was the *band estimate*, and it removed a table
that duplicated something recomputable on demand. The box is not that.

**The alternative — replaying the Leitner rule over `AttemptStore.forItem(id)` — was seriously
considered.** It needs no port change, has one source of truth, and D32's join note already makes
"recompute from attempts" the house style. It was rejected because the fold needs the `slow`
judgement for every past attempt, so the box would silently re-derive — and retired items
un-retire — the day that judgement is tuned; because it is O(history) on every answer; and
because `due` has to be written to the schedule regardless, so it reads two ports instead of one
for no saving.

**Also added: a clamp.** `retirementBox(profile)` is `leitnerIntervalDays.length + 1`, and that
list is profile data editable in a content pull request (ADR 8). Shortening it would make
`scheduleReview` throw a `RangeError` on every item already past the new top, so a stored box is
clamped to the current retirement box. A named test covers it.

### D39 — The `attemptId` is caller-supplied; nothing in the app mints one
**Date:** 20 September 2026 · **Status:** open, closes with an `IdGenerator` port (Phase 2)

`Attempt.id` is "a client-generated ULID" (`architecture.md` §9.4) and nothing in the repo mints
one. The obvious move — mint it in the use case from the `Clock` and `Random` ports, both already
injected — **is a correctness bug**, and it is recorded here because it is attractive and its
failure is silent.

`Random` is not an entropy source. `seeded-random.ts` says so itself: "chosen for being auditable
rather than for being strong — nothing here is cryptographic, and `@palier/adapters/vault` uses
Web Crypto for the things that are." It is mulberry32 with 32 bits of state, and §3.5 wires
`random: seededRandom()` in **production**, so two devices would mint the same id stream. An
`AttemptStore` treats a duplicate id as a **no-op**, not an error — `memory/attempt-store.ts` and
its contract suite both say so, because a retried sync push must not double-count — so a
collision is silent attempt loss. And it lands on exactly the claim sync rests on: attempts are
conflict-free *because* they are keyed by a client-generated ULID (ADR 16, `architecture.md`
§9.4). The hermetic container is deterministic, so every test would have stayed green.

Minting in `@palier/domain` was the other candidate and is ruled out by that package's own
`ids.ts`: "minting an id needs randomness, and `@palier/domain` is pure. **The adapters mint;
domain only names.**" Its 100%-on-all-four-metrics coverage threshold also forbids the defensive
branches a real encoder wants — the same trap D33 records for the cumulative-sum scan.

So `AnswerItemRequest` carries `attemptId`. This is D18/D19/D28/D29's discipline — decide the
minimum the contract needs, name it, record that it is a minimum — and it buys something real:
a retried answer is idempotent, because replaying the same id is a no-op at the store.

**What closes this:** an `IdGenerator { newAttemptId(): AttemptId }` port in `@palier/app`, a
Web Crypto implementation in `@palier/adapters` with same-millisecond monotonicity, and a
deterministic counter in `@palier/testing`. It is a port §3.3 does not name, so it wants its own
deviation, and it lands the **first** adapter directory — which also opens D3's subpath exports
and the D5 eslint element split. Its consumer is the Phase 2 drill route; building it now would
have been inventing a port ahead of the thing that drives its shape.

### D40 — The "slow" judgement stays with the caller; no threshold is invented
**Date:** 20 September 2026 · **Status:** open, revisit when there is timing data (ADR 8)

An engine constant `SLOW_ANSWER_MS` with `isSlowAnswer(msToConfirm)` was planned, on the D34
reasoning that study heuristics live in engine code beside `RECENT_DAYS` and `TAPER_DAYS`. It was
**withdrawn before it was written**, for two reasons.

It would reverse a decision `scheduler.ts` made deliberately one session earlier: "the
timing-to-slow threshold is a product tuning decision the caller owns, so it arrives as a boolean
rather than a duration — the scheduler only knows the Leitner rule."

More concretely, `msToConfirm` is the wrong quantity. It is time-to-confirm, which on a
`comprehension` item includes reading the passage. One global millisecond constant across
`comprehension` and `cloze` would mark nearly every reading item slow and pin it in its box
forever — a silent, plausible-looking wrong answer of the kind D12 warns about.

So `AnswerItemRequest` carries `slow: boolean`. ADR 8's *revisit when* is the bar a real
threshold has to clear: "enough review data accumulates to fit intervals from this product's own
usage". When one is written it keys off `msToFirstSelect` — deliberation, not reading — and is
per-`ItemType`, not one number.

### D41 — Not every answer enters the review queue
**Date:** 20 September 2026 · **Status:** accepted

`product-requirements.md` §6.5: "Every item answered **incorrectly**, and every item answered
correctly but **slowly or with low confidence**, enters a spaced repetition queue." Scheduling
every answer uniformly would contradict that sentence, so `answerItem` applies it:

- An item **already in the schedule** always reschedules. That is the Leitner rule, and it is
  what moves an item up a box; an item that could never advance could never retire.
- An item **not yet in the schedule** enters only on a failing signal — `!correct ||
  changedAnswer || slow`. A correct, fast, unwavering first answer writes no entry at all.

`changedAnswer` is §6.5's "low confidence"; it was already modelled on `Attempt` for this reason.

There is **no switch on `AttemptMode`.** A diagnostic or exam answer is evidence like any other,
and a mode switch here is what principle 6 forbids. **Pilot items are the one real exception and
they are deliberately not handled here**: `scoreExam` excludes pilots from the raw score
(`architecture.md` §7.5), but pilot-ness is a property of the *form*, not the item, so
`answerItem` cannot see it and must not guess. Excluding pilots from the queue belongs to
`SubmitExam` (Phase 3), which holds the form.

### D42 — The `ExamProfile` reaches a use case as a dep; `content/` became a workspace
**Date:** 20 September 2026 · **Status:** accepted, recorded as **ADR 18**

Two halves of one problem.

**Where it goes.** `scheduleReview` needs the profile and §3.3 names no profile port. D36 put
non-port *study parameters* in the `request`; a profile is not one — it is configuration the
composition root owns, and every use case sees the same one. So it is a `dep`. The rule is now
written into `packages/app/CLAUDE.md` so the next use case does not re-litigate it: configuration
is a dep, per-call parameters are a request field.

**How it gets there, which was the genuinely blocked part.** A relative import out of `apps/web`
fails `.dependency-cruiser.cjs`'s `no-relative-escape`, and `.json` is in the cruiser's resolver
extension list, so the gate does see it. `content/` is therefore a pnpm workspace,
`@palier/content`, private, holding no code and publishing one `exports` entry per artefact;
`apps/web` declares it and imports by package name. Proven by running all three gates —
`tsc --noEmit`, `depcruise`, and the Turbopack production build — before any use-case code was
written.

**It is a seventh workspace, not a seventh package, and ADR 10 is unchanged.** ADR 18 argues
that in full. The rejected alternatives: a build-time copy under a drift guard (the D22
`tokens.css` idiom) duplicates the one file ADR 9 makes canonical; a Node-only
`@palier/testing` subpath leans on test infrastructure for a production-shaped concern; a
`@palier/domain` subpath puts content inside a code package, which is the arrangement ADR 14
separated.

**The honest cost:** bundling the profile means a profile change needs a redeploy, which is
weaker than ADR 9's "a change is a content pull request rather than a development task". Phase 2
closes it — the bank adapter fetches content and caches it by hash (`architecture.md` §5.3).

### D43 — A synced `ScheduleEntry` has no `updatedAt`, and last-write-wins can regress a box
**Date:** 20 September 2026 · **Status:** **resolved 24 September 2026 by D69** (Gate B, human: the lower box wins a concurrent edit)

Found while updating `architecture.md` §9.1 for D38, not while writing the code — which is why
it is recorded rather than fixed.

The schedule is replicated (`architecture.md` §12: "a replica of progress records (attempts,
schedule, vocabulary, exam results)"), and §9.4 resolves conflicts by **last write wins on
`updatedAt`**. `ScheduleEntry` is `{ itemId, due, skill, box }` — **no `updatedAt`**. So the
general rule does not actually apply to it, and if it were applied naively it would be wrong in
a way that matters: two devices drilling the same item offline would let the *later* write win
regardless of what it says, so a device that answered correctly and advanced the box could be
overwritten by one that had answered correctly an hour earlier from a lower box. Leitner
progress would silently go backwards.

**Deliberately not decided now.** Three options, all reasonable, and none of them can be chosen
without the sync design in front of you:

1. Add `updatedAt` to `ScheduleEntry` and take the §9.4 rule as written. Simplest, and wrong in
   the case above roughly as often as devices disagree.
2. Merge by taking the **lower** box. The conservative reading of Leitner — a disagreement means
   at least one device saw a failure, and re-reviewing an item the user knows costs a few
   seconds while skipping one they do not costs the exam. Needs no new field.
3. Treat the schedule as device-local and never sync it, rebuilding it per device from the
   merged attempt log. Closest to ADR 16's instinct, but it needs the `slow` judgement for every
   historical attempt, which is exactly what D38 rejected for the single-device case.

Option 2 is the current favourite because it needs no schema change and fails safe, but this
entry deliberately does not choose. `architecture.md` §9.1 and §9.4 both point here, and
`implementation-plan.md` §7's Phase 2 sync bullet names it as work.

### D44 — `AttemptStore.append` returns whether the id was new, so a retried answer is fully idempotent
**Date:** 21 September 2026 · **Status:** accepted

D39 claimed "a retried answer is idempotent, because replaying the same id is a no-op at the
store." That was true of the **attempt record** and false of everything `answerItem` does after
it. `append` returned `Promise<void>`, so the use case could not tell a fresh answer from a
replay; it read `schedule.get` and reran the Leitner rule unconditionally. A genuine retry — a
network retry or a double-submit carrying the same `attemptId` — therefore advanced the box a
second time: an already-scheduled item answered correctly, fast and unwavering went box 2 → 3 on
the first call and 3 → 4 on the identical retry, so the item was reviewed later than earned and
retired early. (Incorrect and correct-but-shaky answers happened to be idempotent, since they
reset to box 1 or held the box, which is why the gap was easy to miss.)

The fix is the **D38 move again**: a use case's correctness needs a signal the port cannot give,
so the port is amended in place. `append` now resolves to `boolean` — `true` when the attempt was
newly stored, `false` on the duplicate no-op. `answerItem` reads it and, on a replay, returns the
schedule exactly as it already stands (`reviewOf(existing)`) rather than re-applying the move. The
attempt append stays a silent no-op at the store; the boolean makes that no-op *visible to the use
case* without making it an error, which is the whole point.

`§3.3`, `packages/app/CLAUDE.md`, the in-memory store and its contract suite are updated together.
The alternative — detecting the replay by scanning `AttemptStore.forItem` for the id before
appending — was rejected: it adds a read on every answer and infers from a query what the write
already knows. Considered and rejected because it re-derives a fact the store holds, the same
instinct D38 records against replaying the Leitner fold.

### D45 — `SessionStore` shape decided; §3.3 amended in place
**Date:** 21 September 2026 · **Status:** accepted

§3.3 named `SessionStore` with only the comment `/* checkpointing, resume */` — the last of the
persistence ports left named-but-unspecified. Deciding it is the D18/D19/D20/D38 move: decide the
minimum its consumers need, name it, record it as a minimum. Its two consumers are `StartSession`
and `CompleteSession` (D46), and between them they need only:

```ts
Session = { id: SessionId, mode: AttemptMode, startedAt: ISO, completedAt: ISO | null }
SessionStore = { create(s): Promise<void>; complete(id, at): Promise<Session | null>; latest(): Promise<Session | null> }
```

Choices this settles:

- **`Session` lives in `@palier/app`, not `@palier/domain`** — the `ScheduleEntry` precedent
  (D18/D38). `@palier/engine` never consumes a `Session` (its functions take study parameters);
  it carries no content-artefact role and so no Zod schema, `.test-d.ts` or JSON round-trip
  obligation. It references domain types by name only — `SessionId` (`ids.ts`) and `AttemptMode`
  (`Attempt.ts`) — exactly as `ScheduleEntry` references `ItemId`/`Skill`. `@palier/domain` is
  untouched; no new domain types.
- **`mode` reuses `AttemptMode`, not the oral `sessionType`.** `architecture.md` §9.1 indexes
  `sessions: 'id, type, startedAt'`; the `type` column is the session's *mode*
  (`drill | diagnostic | exam | review`), which every `Attempt` in the session already carries.
  The oral `sessionType` (`warmup | work | …`) is a field of `OralScenario` on a different axis,
  and its store is the still-deferred `OralStore`. `mode`/`startedAt` are included to honour §9.1's
  sanctioned projection even though neither use-case *branch* reads `mode` — the same reasoning by
  which `ScheduleEntry` kept `skill`.
- **`create` returns `void`, not the D44 boolean.** That boolean existed because `answerItem` had a
  non-idempotent follow-on (the Leitner reschedule) to guard; `StartSession` has none, so the honest
  minimum is `void`, like `ScheduleStore.put`. If the exam runner later needs the signal, that is a
  D44-style amendment when its consumer arrives, not a speculative one now.
- **`complete` returns `Session | null`** so `CompleteSession` gets its `UnknownSessionError` guard
  (the "a use case needs a signal `void` cannot give" move as D38/D44, built in from the start). It
  is **keep-first-write**: re-completing returns the original `completedAt`, so a double-submit is
  idempotent and the contract holds it to that.
- **No `get(id)`.** Neither consumer reads a session by id, so it waits for one that does — the same
  restraint by which `ScheduleStore.get` was added only when `answerItem` needed it. The exam runner's
  resume is its likely first consumer, and it is also what will drive the deferred
  checkpoint/resume state the `/* checkpointing, resume */` comment gestured at.

**No ADR** — §3.3 already names the port; the module structure (§3) and the eight principles are
untouched (D38's explicit precedent). §3.3 is amended in place, `architecture.md` §9.1 gains the
`Session` record, and `packages/app/CLAUDE.md` / `packages/testing/CLAUDE.md` are updated.

### D46 — `StartSession` and `CompleteSession`, and closing D36's `lastDayCompleted`
**Date:** 21 September 2026 · **Status:** accepted, closes D36 (the `lastDayCompleted` half)

The two use cases §3.2 already lists by name, so unlike `planDailySession` (D36) no naming
reconciliation was needed. Both are pure orchestration over the D45 `SessionStore`.

- **The session id is caller-supplied** (D39). `Attempt.id` and now `Session.id` are ULIDs and
  nothing in the app mints one — `@palier/domain`'s `ids.ts`: "the adapters mint; domain only
  names", and the `Random` port is a seeded mulberry32, not an entropy source. `answerItem` already
  takes a `sessionId`, so the loop is forced: `startSession` accepts the id, the caller threads it
  through every `answerItem`, `completeSession` closes it. The Web-Crypto `IdGenerator` port (D39,
  still open) is where it will come from.
- **`StartSession` composes `planDailySession` and owns `lastDayCompleted`.** It reads
  `SessionStore.latest()`, turns `completedAt !== null` into the boolean, and passes it down — so
  the completion rule lives in the app layer, not the UI request. `planDailySession` stays usable
  standalone with the signal omitted. **This closes D36's dangling optional**: it is now produced by
  `completeSession` and consumed by `startSession`, through the port. The alternative — the caller
  plans then starts — was rejected: `lastDayCompleted` must be known *before* planning, so that
  derivation (and `SessionStore.latest()`) would have to move into the UI, leaking a domain rule out.
- **The `latest()`-before-`create()` ordering is load-bearing, not stylistic.** If `create` ran
  first, the just-opened in-progress session (`completedAt: null`) would be its own `latest()` and
  pin `lastDayCompleted` to `false` forever. A named test proves the order (a call-order-recording
  stub), and `create` runs only *after* a successful plan, so a planning failure leaves no orphan
  session — another named test.
- **`CompleteSession`** stamps `completedAt` from the injected `Clock` and returns the closed record,
  throwing `UnknownSessionError` on an unknown id.

Tests are local port stubs (D37), not `@palier/testing` (which would cycle the build graph): three
`lastDayCompleted` branches (`latest()` null ⇒ omitted; prior completed ⇒ `true`; prior in-progress
⇒ `false`, observed through the plan shortening), the ordering, the orphan guard, and
`CompleteSession`'s guard + keep-first idempotency. The composition-root wiring test runs the whole
loop — start, answer every planned item under the session id, complete, start again — against the
in-memory graph. The engine/app own the taper *magnitude*; the container proves only that records
land and the signal is threaded.

### D47 — `RunDiagnostic` is two use cases, and the diagnostic carries a `targetBand` it does not select on
**Date:** 21 September 2026 · **Status:** accepted

§3.2 names one `RunDiagnostic`, but a diagnostic spans three moments a single call cannot: select
the set, let the user answer each item, then read the accuracy. So it is **two thin sibling use
cases** — `runDiagnostic` (selection) and `diagnosticReadout` (the readout) — with the answers
recorded in between through the *existing* `answerItem` with `mode: "diagnostic"`, unchanged. No new
port, no adapter, no ADR (§3 and the eight principles untouched); both are pure orchestration, the
D37 local-stub testing.

- **`runDiagnostic`** reads `ItemRepository.query({ skill })` + a generous `AttemptStore.recent`
  slice (for `selectItems`' 14-day exclusion) and returns `selectItems(mode: "diagnostic")` — the
  engine's coverage sampler (all bands, no sub-skill weighting, D33). It closes out the pure
  `@palier/app` layer's *selection* half.
- **`diagnosticReadout`** fetches recent attempts, **filters to `mode === "diagnostic"`**, resolves
  their items and returns `calculateTrend(skill, …)` — accuracy per band tag with a Wilson interval,
  which *is* the R10 readout. A short diagnostic reads `"insufficient"` per band until `MIN_EVIDENCE`
  accrues; that is R10 ("no estimate without evidence and uncertainty"), not a gap.
- **The diagnostic carries a `targetBand` its selection ignores.** `SelectionCriteria` requires
  `targetBand`, but the diagnostic branch (`selector.ts`) never reads it — coverage samples every
  band. Rather than invent a placeholder in code, `runDiagnostic`'s request carries the user's
  declared/aspirational target (onboarding collects it; the readout is read against it), documented
  in place. The alternative — making `SelectionCriteria.targetBand` optional (an engine change to a
  100%-branch pure file, plus a practice-mode guard) — was considered and declined for this slice;
  D20 leaves that door open if a later selector consumer needs it.
- **Set size is a request field, not a constant.** `count` is caller-sized (the `sessionSize`
  precedent, D34/D36); the `recent(skill, N)` fetch is a generous internal constant, a Phase-2
  tuning detail (D36), not an invented threshold.

### D48 — The `IdGenerator` port and the first `@palier/adapters` directory (`/ids`)
**Date:** 21 September 2026 · **Status:** accepted; resolves D3 and D5 for `ids`, closes the open half of D39

The mechanism D39 named: nothing in the app may mint an id — `@palier/domain`'s `ids.ts` ("the
adapters mint; domain only names") and the `Random` port is a seeded mulberry32, not entropy, so
minting from it would give two devices one id stream and an `AttemptStore` would silently drop the
collision as a duplicate (ADR 16, `architecture.md` §9.4). `answerItem`/`startSession` take a
caller-minted id today for exactly that reason (D39); this is what will mint them. A port §3.3 does
not name → its own deviation, no ADR (§3 and the eight principles untouched).

- **Port shape `{ ulid(): string }`, content-agnostic.** A ULID is a ULID whatever it identifies,
  so the port mints the string and the caller brands it (`attemptId(gen.ulid())`). This keeps the
  port ignorant of attempts/sessions and scales to every future id kind without a new method. The
  alternative — typed `attemptId()`/`sessionId()` methods — was declined: it hard-codes the port to
  today's two consumers and buys nothing, since the brand constructors are unchecked casts anyway.
- **First adapter: `@palier/adapters/ids`.** `webCryptoIdGenerator` — a hand-written Crockford
  base32 ULID (48-bit ms timestamp + 80 bits from `crypto.getRandomValues`, 26 chars),
  **monotonic within a millisecond**: on a same-ms or backward-clock call it keeps the high
  timestamp and increments the random component, so a burst is strictly increasing (attempt
  ordering depends on it). No npm dependency — `globalThis.crypto` is present in Node 20+ and
  browsers. `now`/`randomBytes` are injectable so the monotonic branch is deterministically tested.
- **Deterministic counterpart in `@palier/testing`.** `counterIdGenerator` encodes an incrementing
  counter into the ULID's random field over a fixed timestamp — reproducible, so a hermetic
  Playwright run is (§6.4) — and is held to the **same `idGeneratorContract`** as the adapter
  (unique, valid 26-char Crockford, strictly increasing). Run against both implementations.
- **Wired ahead of a consumer.** `ids` joins the composition root's `Ports` (hermetic path: the
  counter; production still throws until the rest of Phase 2 lands, so the Web Crypto adapter has no
  live wiring yet and is proven by its own suite + the contract). This is the `settings`/`vault`
  precedent — a port present in the graph before a use case consumes it. The Phase-2 drill route is
  the consumer that will actually call it, exactly as D39 predicted.
- **D3 and D5 done for `ids`, deliberately, not as a side effect.** D3: `@palier/adapters`'s first
  real subpath export, `./ids`, now resolves to real content. D5: the `eslint-plugin-boundaries`
  `adapters` element is split — `adapters-ids` first, the general catch-all after — so
  `no-unknown-files` keeps classifying as the package fills. Both stay open for the five §3.2
  adapter directories still to land.

### D49 — `adapters/dexie` built as the first Phase-2 slice, ahead of the "human gate", with human sign-off
**Date:** 21 September 2026 · **Status:** accepted; advances D3 and D5 for `dexie`

The *Next, decided* section this session inherited said the runway was spent and the next step was
a human gate covering "the real adapters — Dexie stores, bank, vault, sync — **and the UI**". That
framing was too coarse: it bundled the **local store adapters** with the UI/sync work they do not
depend on. The store adapters are content-agnostic (they persist attempts/schedule/sessions/
settings/key, never touching item quality, so the Phase 1 go/no-go does not gate them) and
design-agnostic (no UI rides on them). They are fully specified — ports in `@palier/app`, contract
suites in `@palier/testing`, in-memory reference impls, `fake-indexeddb` installed, schema v1 in
`architecture.md` §9.1 *with* per-store implementation notes written for this very adapter — and
follow the `/ids` precedent exactly. The human confirmed building them now (and the `KeyVault` with
them — D50). So this is not a self-directed override of the gate: the gate was brought to the human
and the human sequenced it.

Built under `packages/adapters/src/dexie/`: `PalierDb` (a `Dexie` subclass declaring the whole of
`architecture.md` §9.1's `version(1)` verbatim — all thirteen tables, though only five have
adapters, so the rest land without a schema bump) and the five store factories
`dexieAttemptStore` / `dexieScheduleStore` / `dexieSessionStore` / `dexieSettingsStore` /
`dexieKeyVault`, each held to its existing contract suite plus adapter-specific tests (reopen
survival, the duplicate-id `false`, the retired-entry-hidden-from-`due`-but-not-`get`, the
`type`↔`mode` translation, the completion keep-first).

Two implementation notes worth keeping:

- **The public surface is one Dexie-free function, `dexieStores(name?)`.** Its `DexieStores` fields
  are all `@palier/app` port types, so no vendor type crosses the boundary (§2.4). `PalierDb`
  (whose getters return `Table<...>`) and the per-store factories are internal — exporting
  `PalierDb` would put a vendor type in the published `.d.ts` and, under pnpm's strict isolation,
  force the composition root's typecheck to reach for `dexie`, which the vendor ban forbids it. This
  is a small refinement of the plan (which had said "re-export the factories + `PalierDb`").
- **`PalierDb` uses lazy getters over `this.table()`, not `field!: Table<...>`.** `tsconfig.base`
  targets ES2022 and leaves `useDefineForClassFields` at its default `true`, so a field declaration
  would emit `attempts = undefined` and clobber the table object Dexie assigns in `super()`.

`dexie@4.4.6` is a new dependency, but a pre-decided one: ADR 10 / §9.1 name the directory
`adapters/dexie` and `.dependency-cruiser.cjs` already scoped the `dexie` module to
`packages/adapters/src/dexie` (`no-dexie-outside-adapters`). No ADR needed. Advances D3 (`./dexie`
live) and D5 (a second `adapters` element).

### D50 — the encrypted `KeyVault` built in Phase 2, not deferred to Phase 4
**Date:** 21 September 2026 · **Status:** accepted; partially satisfies [R12] (the storage half)

§7 puts the key vault in Phase 4. The human chose to build it now, with the Dexie stores, and to
align the docs to that. Recorded here because it moves work across a phase boundary.

- **Encryption approach: §6.2 as written, a non-extractable `CryptoKey` at rest.** The API key is
  AES-GCM ciphertext under a **non-extractable** `CryptoKey` held in the `keyVault` table.
  Non-extractable is load-bearing: a storage-reader (a browser extension) gets an opaque handle
  whose raw bytes Web Crypto refuses to export, so the key cannot be decrypted offline or in another
  origin. It does not defend against XSS of our own origin, and §6.2 already says so.
  - **A first draft deviated and code review caught it.** The plan proposed persisting the device
    *secret* as raw bytes and deriving the AES key by HKDF at use time, to dodge a feared
    structured-clone limitation on `CryptoKey`. That is strictly *weaker* than §6.2: the stored
    bytes plus the public HKDF salt/info let a storage-reader decrypt offline — giving up the exact
    "extensions reading storage" protection §6.2 promises. The feared limitation also does not
    exist: a non-extractable `CryptoKey` round-trips through IndexedDB's structured clone and stays
    usable, verified against `fake-indexeddb`. So the implementation follows §6.2 verbatim; there is
    no crypto deviation to record, only this note that one was considered and rejected.
- **The callback discipline holds.** `withApiKey` decrypts, hands the plaintext to the callback and
  returns the callback's result; there is no `getApiKey`. `clear` wipes the API key but not the
  device secret (which doubles as the sync identity seed, §9.3).
- **The key-leak test was written *with* the vault, honouring the [R12] "before, not after"
  discipline.** The `keyVaultContract`'s `it.todo("never returns the key…")` is now a real
  assertion running against every implementation (no method but the callback surfaces the key), and
  the Dexie adapter adds its own: what sits at rest is ciphertext, and replacing the device secret
  makes the ciphertext fail to authenticate. This is the *unit* half of [R12]; the *E2E* key-leak
  test across the whole app stays a Phase 4 exit criterion. `implementation-plan.md` §7 Phase 4 is
  annotated to say so.

### D51 — Phase 1 is redirected to a fully automated content factory (ADR 19)
**Date:** 21 September 2026 · **Status:** accepted (human-directed); recorded in **ADR 19**

Human direction: Phase 1 should be an autonomous, machine-only pipeline that prepares content from
public sources, with no human in the quality loop, and its full implementation is the next slice.

The premise was half-already-true and it is worth stating so the change is understood correctly.
Machine generation from public GC sources is *already* the design — **ADR 6** ("generated content is
the default authoring path", revisit: never) plus `content-factory.md` §4.1 (harvest public GC
material) and §4.2 (rewrite into original passages, "nothing is quoted"). What Phase 1 *added* on
top was human validation: a week-one two-reader assumption test, a 5% human sample, and
fluent-speaker register reads as the go/no-go. **That human gate is what this decision removes**,
not the generation method.

- **The register gate is now cross-family LLM review only** (§4.4), plus deterministic validation
  (§4.5). The trade-off was put to the human with the risk named — the same class of model both
  generates and is the sole judge of its own register, so a shared blind spot ships — and the human
  chose it. **ADR 19** records the decision, the risk, and a *revisit when* (a later human read
  disagrees, alpha register complaints, or the Phase 7 gate). The 5% human-sample machinery is
  retained but off, so restoring it is a switch, not a rebuild.
- **The one human check kept:** the Phase 7 pre-1.0 gate "both languages reviewed by a human"
  ([R8]). Nothing reaches the *public* on a purely self-graded bank. (I flagged this as the floor;
  the human did not remove it.)
- **`adapters/openai` resequences from Phase 4 into Phase 1**, because the factory cannot run
  without it. Phase 4 keeps the runtime-generation / writing / oral / BYOK-key extensions; the core
  provider + translation layer land now. `implementation-plan.md` §7 Phase 1 and Phase 4 both say so.
- **Scope chosen: build now, small run.** Build the whole pipeline + `adapters/openai`, run a small
  sample batch (tens of items) end to end to prove it; the full-volume paid run to 500–700 items is
  a deferred follow-on gated on the small run and a funded key (ADR 2). `apps/factory` is an empty
  stub today, so this is a large multi-part slice that wants its own implementation plan.
- **Non-negotiables reaffirmed, not touched:** §4.1 rejects unclear licences, §4.2 quotes nothing
  (the published bank is CC BY 4.0, ADR 12), and R6 forbids reproducing real PSC items.

Docs amended in place with pointers to ADR 19: `content-factory.md` §3/§4/§6/§8,
`implementation-plan.md` §7 Phase 1 (rewritten) and Phase 4, and this file (*Next, decided*, the
Phase 1 checklist, the header).

### D52 — `AiProvider` landed as a Phase-1 subset; §3.3 amended in place
**Date:** 23 September 2026 · **Status:** accepted

§3.3 lists a seven-method `AiProvider`. Phase 1 only needs the factory-facing part, so
`packages/app/src/ports/ai-provider.ts` carries `capabilities`, `generatePassage`, `generateItems`,
`reviewItem`, `lastUsage`. `assessWriting`/`assessOral`/`transcribe`/`openVoiceSession` and their
net-new domain types are deferred to Phases 4–5 — the same "the minimum the consumer needs"
discipline as `SessionStore` (D45). Two shape amendments to §3.3, made in place:

1. **`generatePassage` is added** (not in §3.3). The factory's stage 2 needs AI passage construction
   (content-factory.md §4.2), and it is provider-agnostic like the rest of the port.
2. **`generateItems`/`generatePassage` return *drafts* (`ItemDraft`/`PassageDraft`), not assembled
   `Item[]`/`Passage[]`.** The factory assembles the full artefact — content-derived id, provenance,
   status, `wordCount`/`readability` — keeping id-minting and provenance policy out of the adapter,
   which the adapters' "no use-case logic" invariant requires. The AI DTOs themselves live in
   `@palier/domain`, not `@palier/app`, so `apps/factory` can build them without importing the port
   layer — that placement is **ADR 20**, the one part of this that rose to an ADR.

### D53 — the openai adapter is written over `fetch`, not the `openai` SDK
**Date:** 23 September 2026 · **Status:** accepted

The plan and `.dependency-cruiser.cjs` reserve the `openai` module for `packages/adapters/src/openai`
and `apps/factory`. The adapter is instead written over the global `fetch` and adds **no dependency**.
Three reasons: the "no new dependency" rule is satisfied without argument; an SDK type becomes
*impossible* to leak across the boundary (the mistake adapters/CLAUDE.md warns of), because there is
no SDK type; and tests inject a `fetch` the way `webCryptoIdGenerator` injects its clock, so the whole
adapter is hermetic with no MSW route added to the shared handlers. The structured-output contract
(§8.2) is honoured by `response_format: { type: "json_object" }` plus **Zod re-validation of every
response with one retry** — the re-validation is the guarantee, not the model's promise. The
`no-openai-outside-adapters-and-factory` ban stays in place, simply never exercised. Model ids are
config (`config/models.json`), never hardcoded (§8.1).

### D54 — Phase 1 ran against a deterministic scripted provider; the paid run is deferred
**Date:** 23 September 2026 · **Status:** open until the paid run

The Phase-1 exit metrics (detection ≥90%/class, yield 45–75%, cost/item) are only *meaningful*
against a real, funded OpenAI key, which this environment lacks. The docs pre-authorised exactly this
(the prior *Next, decided*: "build against a mock/recorded AI adapter and leave the real run as the
final step"; the full paid run is an explicit deferred follow-on). So the complete, real-key-ready
system was built and the sample batch + every metric were produced against `scriptedAiProvider` — a
deterministic stand-in committed in `apps/factory`. The committed sample's **French is synthetic**;
the detection/yield/cost numbers are the harness measuring itself on controlled input, not a
judgement of a real model. This is stated plainly wherever the numbers appear.

Two smaller decisions travel with it, both to keep the pipeline deterministic and CI-reproducible:

- **Harvest reads a committed, curated source seed** (`content/factory/sources.seed.json`) and applies
  the licence gate; live scraping/discovery is out of Phase-1 scope. The licence and originality rules
  (§4.1, §4.2, R6) are unchanged and enforced (an unclear-licence source is rejected; the seed carries
  one to prove it).
- **Near-duplicate detection uses a normalised-stem hash + token Jaccard**, not embeddings (§4.5 names
  "embedding similarity"). Avoids an embeddings dependency and a second AI call; embedding similarity
  is a noted enhancement for the paid run.

This entry **closes when the paid run happens** and the numbers become real — the same gate D51 and
ADR 19 point at.

---

### D55 — the bank adapter structure-checks the edge; it does not re-run the domain Zod schemas
**Date:** 24 September 2026 · **Status:** accepted

`adapters/CLAUDE.md` says every response is Zod-parsed at the edge, and the plan for `adapters/bank`
said the same. Building it surfaced that the rule is about *vendor* payloads: the OpenAI adapter
re-validates because the model's output is untrusted. The **bank is our own content**, validated
field-by-field at build time by the factory's deterministic validation stage (`content-factory.md`
§4.5), and — decisively — the shared `itemRepositoryContract` seeds `CONTRACT_BANK` from the fixture
builders, whose default `anItem()` is deliberately schema-*incomplete* (a `comprehension` item with
no `passageId`). A full `itemSchema.safeParse` on the read path rejects those fixtures, so the very
suite that proves the adapter substitutable for the in-memory repo (which never validates) cannot pass
against a fully-validating adapter.

So `httpBankRepository` **structure-checks** the delivery — the manifest's control fields (they drive
which shard is fetched), that a shard body is a JSON array and a form a JSON record, and that a body is
valid JSON — turning a corrupt or truncated delivery into a `BankContentError`, without re-asserting
every content field. Full per-field re-validation stays reserved for genuine vendor payloads (the
OpenAI adapter, `architecture.md` §8.2). Consequence: the package stays **zod-free** (it imports no
domain schema, only types — matching how the OpenAI adapter avoids importing `zod` directly), so the
manifest is validated by a small hand-rolled guard rather than a Zod schema (the "no new dependency"
rule). Revisit if the bank ever carries third-party or user-submitted content that has *not* passed
the factory gate — that content is vendor-equivalent and would want full re-validation.

### D56 — feature phases build against the baseline bank; the content run is a 1.0 gate
**Date:** 24 September 2026 · **Status:** accepted (human decision)

`implementation-plan.md` sequences the content factory as Phase 1 precisely so the "is a
machine-generated bank good enough?" question (ADR 19, A1/A2/A3) is answered early. Product decision
(24 September 2026): **defer that answer to the end.** Build every feature phase — 2 (practice MVP),
3 (exams + item statistics), 4 (BYOK, generation, writing workshop), 5–6 (oral) — against the
**baseline committed bank** (`content/bank/v1/`, the D54 sample), so the whole product is
feature-complete and exercisable before any funded content run. The full-volume run to 500–700
published items on a funded key (D54) then happens as a **1.0 gate**, alongside Phase 7 polish, not as
a per-phase blocker.

The accepted trade-off: (1) the baseline bank's French is **synthetic** (D54), so the app is
feature-usable but **not study-ready** until the content gate — every screen and flow works, but real
SLE practice waits for real content; (2) content-quality risk (the thing Phase 1 was built to
de-risk) is carried unvalidated until late, in exchange for de-risking the *product* first. Nothing in
the architecture blocks this: the bank is data behind a port (`ItemRepository`), the shard layout is
fixed by the bank build, and swapping the baseline bank for the full-volume one is a content-only
change, no code. Revisit if a feature turns out to *depend* on real content characteristics the
synthetic sample cannot stand in for (e.g. item-statistics calibration in Phase 3 needing realistic
difficulty spread) — that feature's validation, not its build, moves to after the content run.

### D57 — Phase 2's remainder is planned as three bigger slices, mirrored in two documents
**Date:** 24 September 2026 · **Status:** accepted (human decision)

`progress.md` normally does not restate the `implementation-plan.md` §7 work breakdown, "because two
copies of a plan diverge." Human decision (24 September 2026), two parts: (1) group Phase 2's remaining
work into **three** deliberately-large slices — *single-device practice app (offline)* → *multi-device
sync* → *convergence proof + launch* — rather than many small ones, because the requester wants coherent
shippable steps, not a task list; (2) document the slice list in **both** `implementation-plan.md` §7
Phase 2 and here, and require the two to **agree**. This is a deliberate, scoped exception to the
"one copy" rule: the plan holds the authoritative fuller scope and each slice's *done*; progress.md holds
a terse mirror plus live `[~]`/`[!]`/`[ ]` state. Both cross-reference each other and say "keep in sync,"
so an editor touching one must update the other. Two human gates sit between the slices — **Gate A**
(product/UI direction) gates Slice 1's UI, **Gate B** (the D43 `ScheduleEntry` merge) gates all of Slice
2 — and are named, not left as menus (working-agreement rule 7). *Next, decided* is unchanged: the single
next buildable step is the web slice at the head of Slice 1.

### D58 — the production clock lives beside the composition root; the selection seed is per day
**Date:** 24 September 2026 · **Status:** accepted

Two things §3.5's sketch names and nothing had built. **`systemClock()`** had no home: no production
`Clock` existed anywhere. It is `apps/web/src/lib/system-clock.ts`, not a new `@palier/adapters/clock`
subpath, because it is one vendor-free line with one consumer and D3 says a subpath lands with a real
adapter behind it. Precedent for a non-adapters port impl in the root already exists (`seededRandom` from
`@palier/testing`, per §3.5). **Promote it** the day a second entry point outside `apps/web` needs a clock.

**The production seed.** §3.5 writes `seededRandom()` but the function takes a seed, and nothing said
which. It is `selectionSeedFor(clock.now())`: FNV-1a over the UTC `YYYY-MM-DD`. A reload replays today's
plan exactly instead of reshuffling it under the user, and each new day draws a fresh order. Not an
entropy source — identifiers still come only from `@palier/adapters/ids` (D39). Rejected: a constant seed
(every day's order identical given the same pool) and a time-of-construction seed (the plan changes on
every reload, which reads as a bug).

### D59 — the production container is browser-only; `@palier/testing/in-memory` is its bundleable half
**Date:** 24 September 2026 · **Status:** accepted

Wiring the production path surfaced a constraint the plan did not state: **the production graph can only
be built in a browser.** `dexieStores()` needs IndexedDB, and the bank's base URL is origin-relative
(`/content`), which Node's `fetch` cannot resolve. So `createContainer({ hermetic: false })` is for client
components, never server rendering; the UI's container provider (Slice 1's UI PRs) builds it after
hydration. This fits architecture.md §13's "session engine as a single client island".

Two consequences. (1) **`@palier/testing`'s root entry point cannot be bundled for a browser** — it
re-exports the contract suites (vitest's `describe` at module scope), `mswServer` (`msw/node`) and the
PGlite harness. The composition root now imports the in-memory ports through a new **`./in-memory`**
subpath that reaches only `@palier/app` and `@palier/domain`; a test walks its module graph and fails if
anything else appears. The root entry point still re-exports everything, so no other import moved. (2)
**The `web` Vitest project gains `@palier/testing/setup`** (`fake-indexeddb/auto`), exactly as `adapters`
has, so `container.test.ts` runs the *real* production graph in the fast lane, with `fetch` stubbed to serve
the committed `content/bank/` from disk. That test is the fast-lane proof that the app plans a day from
the committed bank. The old "refuses to build a production container" case asserted behaviour that no
longer exists and was replaced, not weakened: the new cases assert more.

### D60 — the bank ships as a generated `public/` copy; the service worker is compiled from TypeScript
**Date:** 24 September 2026 · **Status:** accepted

**Serving.** `scripts/prepare-public.mjs` runs before `next dev` and `next build` (before, because Next
serves only `public/` files that exist at build time). It copies `content/bank/` → `public/content/bank/`,
located through `@palier/content`'s exports map (ADR 18). The copy is **gitignored**: `content/bank/` stays
the one source of truth. Rejected: a route handler streaming the files (server code, not the static CDN
asset architecture.md §2/§5.5 requires) and a rewrite (cannot reach outside `public/` alone). Because
`@palier/content` has no build task, a bank change would not have busted `apps/web`'s Turborepo cache, so
`apps/web/turbo.json` adds `$TURBO_ROOT$/content/bank/**` to the build's inputs and the generated files to
its outputs.

**The service worker** is `src/sw/worker.ts`: typechecked, linted, and unit-tested (19 cases over an
in-memory `CacheStorage`). The same script compiles it to `public/sw.js` with `ts.transpileModule`, using
the `typescript` already in `apps/web`'s devDependencies, so there is **no new dependency**
(serwist/next-pwa would have been one, for a need this small). It precaches every route in every locale
plus the whole served bank on install, serves `/content/bank/**` and `/_next/static/**` cache-first, and
everything else network-first with a cache fallback. Its cache name carries a stamp hashed from its
inputs, so a deploy gets a fresh cache and `activate` deletes the old one. The file may have **no runtime
imports** — the output is a classic script — and a test compiles and runs it to hold that line.
Registration happens **only in production builds**: under `next dev` a cache-first `/_next/static/` would
pin stale hot-reload chunks and break the hermetic lane.

**Testing it** needs a production server, which Next's own offline guide also says ("dev mode is not a
reliable reference"). So Playwright gains an **`offline` project** on `next start` (port 3100) beside the
hermetic `chromium` project on `next dev`. The medium lane already builds before `verify:medium`. Proven to
bite: with the worker forced to pass everything through, all three offline cases failed with
`net::ERR_INTERNET_DISCONNECTED`.

### D61 — every store port gains `all()` and `clear()`; §3.3 amended in place
**Date:** 24 September 2026 · **Status:** accepted

`ExportData` must read every record and `WipeData` must delete them, and no §3.3 method can do either.
`AttemptStore` reads by skill, time and item; `ScheduleStore` by due date and id; `SessionStore` and
`SettingsStore` not at all. So `AttemptStore`, `ScheduleStore`, `SessionStore` and `SettingsStore` each
gain the same pair, in the port, the in-memory impl, the Dexie impl, and the contract suite, which holds
both to it. `SettingsStore.all()` returns `{ key, value }` entries (a new `SettingEntry` type).
`ScheduleStore.all()` **includes retired entries**: they carry an item's history, and the Dexie impl
scans the primary key, not the `due` index that hides them. No Dexie schema change, so no migration.
This is the "a use case needs a signal the port could not give" move of D38/D44, and §3.3 carries a dated
note.

One port per aggregate rather than a new cross-cutting `BackupStore`, because §3.3 says "one port per
aggregate", and a second port over the same tables is two sources of truth for one table. Slice 2's sync
push will need the same enumeration. Cost: six hand-written stubs in `@palier/app`'s tests gained two
inert members each. No assertion changed.

### D62 — `importData` validates the whole file first and never overwrites a local record
**Date:** 24 September 2026 · **Status:** accepted — its keep-local rule is **superseded by D69** (import now merges by Gate B's rule)

Importing onto a device that already has progress is a **merge**, and the schedule's merge rule is the
open Gate B question (D43). So import decides nothing it does not have to. **Attempts merge as a union**:
append-only and keyed by ULID, so an already-present attempt is the store's duplicate no-op (ADR 16,
D44). That aggregate's rule is already settled. **Schedule entries, sessions and settings are added only
where the device has no record of that key; the local copy wins.** So: import after a wipe restores
everything (the round trip `container.test.ts` runs over real IndexedDB), importing the same file twice
changes nothing, and importing onto a device with history keeps that history. When Gate B lands a merge
rule, import is the second place to apply it.

The file is **parsed and validated whole before anything is written** (`parseExportDocument`,
`InvalidExportError` naming the first bad record), so a file with one bad record changes nothing. The
document is versioned (`format: "palier-export"`, `version: 1`) and carries **no key-vault content**: no
API key [R12], and no device secret (a sync credential). Band estimates are absent because nothing stores
them (ADR 16).

**Finding worth carrying into the UI:** with the baseline committed bank (6 reading and 4 writing
items), one full session answers every reading item. The planner then excludes them for 14 days, and the
wrong answers are not due until tomorrow, so **a same-day re-plan is empty.** That is correct
behaviour, not a bug. The home screen must present it as "done for today", not as an error.

### D63 — the daily goal becomes a session size at the caller: about 1.5 minutes an item
**Date:** 24 September 2026 · **Status:** accepted; resolves D34's revisit

D34 left the planner budgeting in items and named its own trigger: "revisit when a real minutes-per-day
goal in the UI needs converting to counts". Onboarding's daily goal (§8.1: 10, 20 or 30 minutes) is that
goal. The conversion is `sessionSizeFor(goalMinutes)` in `apps/web/src/lib/study.ts`: one heuristic,
**1.5 minutes per item** (answer plus feedback), a floor of five items, so 10/20/30 → 7/13/20. It sits
behind the unchanged `planDay(sessionSize)` seam, exactly as D34 said the fix would, and `planDay` does not
change. It is a study heuristic in D34's own sense, not a published exam rule, so it is code, not profile
(ADR 9). **Principle 8's measurable replacement** is the user's own `msToConfirm` timings once there are
enough of them to fit — the same bar ADR 8 and D40 set for `slow`. The diagnostic's size is §6.2's 30 per
skill, caller-sized as D47 says; a smaller bank yields every item it has.

### D64 — `practiceTrend`, a sibling of `diagnosticReadout` for the readiness card
**Date:** 24 September 2026 · **Status:** accepted

§8.2's readiness card is "your practice trend, *always*", so drills must move it. But the only trend use
case, `diagnosticReadout`, reads diagnostic attempts alone (D47). `practiceTrend` is its sibling: the
same thin wrapper over `calculateTrend`, over **drill, review and diagnostic** attempts, and **excluding
exam attempts**, because §8.2 keeps the exam result and the practice trend "visually distinct" and folding
one into the other would erase that line. A sibling rather than a mode flag on `diagnosticReadout`, because
each name then says exactly which evidence it reads. `MIN_EVIDENCE` is 30 per band tag, so with the
10-item baseline bank every band honestly reads "insufficient" (R10), and the card says how many more
answers each band needs.

### D65 — the Slice 1 UI's calls where the PRD and the requirements pull apart
**Date:** 24 September 2026 · **Status:** accepted

Gate A adopted the PRD's direction. Building it forced these calls, each recorded so it is not re-litigated:

- **The drill keeps the header and footer.** §8.3 says "no navigation chrome", but R5 puts the
  non-affiliation statement on every page and WCAG 3.2.6 wants help and controls in the same place on every
  page. The requirement wins over the design note. The drill is still single-column and focused, with its
  Confirm action bottom-anchored.
- **The feedback sheet slides but does not fade.** Its first draft faded in from `opacity: 0`, and axe caught
  every word in it at contrast 1.23 during the fade. That is a real 1.4.3 failure for 200 ms, not a test
  artefact. `transform` only.
- **The drill's keys (1–4, Enter) listen on the window**, not the session element, because focus is on the
  page body when an item first appears. Enter on a real button or link is left to that control; Enter on an
  option radio confirms.
- **A diagnostic gives no feedback per item.** It is placement, so it measures rather than teaches (§6.2),
  and the readout comes at the end.
- **One static route per skill** (`/practice/reading`, `/practice/writing`), not a dynamic `[skill]`
  segment, so the service worker can precache each by name (D60).
- **Deferred, not dropped:** self-hosted fonts (Source Serif 4 is named first in the passage stack, so a
  font added in Phase 7 needs no CSS change); Coco; streak/XP (§9); onboarding step 5, the key (Phase 4);
  English as a target language (offered as "coming later", Phase 8). The §8.1 line "your progress syncs"
  is replaced by "your progress stays on this device" until sync exists (Slice 2): the PRD's copy would be
  false today.
- **`slow` is always `false`** (D40: no threshold until there is timing data). The shaky-answer signal
  travels as `changedAnswer`.

### D66 — `reviewQueue`, `progressReport`, and an engine `subSkillBreakdown` for the last three screens
**Date:** 24 September 2026 · **Status:** accepted

Three pieces of logic the review and progress screens need, each placed where the layering rules put it,
not in a component:

- **`reviewQueue({ limit })`** (`@palier/app`): what is due now across both skills (§8.8: "a single
  stack"), resolved through the bank. An entry whose item has left the bank is dropped from the set but
  stays scheduled. The set is capped at `REVIEW_SET_LIMIT` (40) in the UI.
- **`progressReport({ skill })`** (`@palier/app`): the practice trend, per-sub-skill tallies, the count
  answered, and time spent answering (summed `msToConfirm`, labelled as such, since reading the feedback
  is not measured). Over the **whole** record via `AttemptStore.all()` (`calculateTrend` sorts by `ts`
  itself, so `all()`'s lack of order is safe), and without exam attempts (D64's line).
- **`subSkillBreakdown`** (`@palier/engine`, 100%): tallies per sub-skill, weakest first, no window, no
  minimum. It is **not** a refactor of `weakestSubSkills`: that one windows to 50 and thresholds at 8
  because it *targets* practice, and reshaping a function the planner depends on to share a loop was not
  worth the risk. It returns counts, never a percentage (R10). **No golden value moved**: it is a new
  function, and every existing engine test is unchanged.

### D67 — what the E2E journeys found, and the fixes (none of them test-only)
**Date:** 24 September 2026 · **Status:** accepted

Writing journeys 4, 6 and 7 exposed four real defects. Each was fixed at the source:

1. **A cold dev server fails under parallel first requests.** Turbopack answered "Unexpected end of JSON
   input" (server and browser) when four workers hit uncompiled routes at once. The medium lane always
   starts cold, so this would have flaked in CI. (An earlier session-log line guessed a half-stopped
   server; that guess was wrong.) **Fix:** a `warmup` Playwright setup project that visits every route
   once, serially, before the parallel `chromium` project, with the route list from the same `routesFrom`
   as the service worker. Verified: three cold full runs and six warm hermetic runs, all green.
2. **A fast "1" then Enter could be dropped.** The window key listener read state through a ref refreshed
   in an effect after each render, so an Enter arriving first saw "nothing selected". **Fix:** raw keys
   go into the reducer as a `key` event, resolved against its current state. A named test replays the race.
3. **Enter after arriving by the header nav re-activated the nav link.** The header survives a
   client-side navigation, so focus stayed on "Review", and the listener rightly leaves Enter on links
   alone. **Fix:** when a set opens, focus moves to its first option, not only on advance (§11).
4. **Pages had no title for a moment after navigation, and one shared title always.** axe caught an
   empty `<title>` while Next streamed the new metadata in. Behind it, every page was titled just "Palier",
   a weak WCAG 2.4.2. **Fix:** every page sets its own title (`Review · Palier`), tested. `axeClean` also
   waits for a title before auditing, because a mid-navigation frame is not a state a user rests on.

And one tooling note: **journey 4 moves the browser's date with `page.clock.setFixedTime`**, because
`page.clock.install()`'s fake timers (even resumed) stall Dexie and React. `setFixedTime` pins `Date` and
leaves the timers alone.

### D68 — app screens keep the footer below the fold, so content arriving after hydration never moves it
**Date:** 24 September 2026 · **Status:** accepted

CI's Lighthouse run on PR #19 failed `/fr/progress` at **performance 0.88** (all 5 runs), below the 0.95
budget. Locally it scored 1.0, with a layout shift of 0.06 that I had wrongly logged as "within budget".
The layout-shift audit names the culprit: **the footer.** An island screen renders a one-line loading
state, so the footer, non-affiliation statement included, sits in the first viewport. It is then pushed
off-screen when the content arrives. CI's slower runner makes that shift far larger, and home and review
share the pattern.

**Fix, for the whole class, not one page:** every island page's section carries `.app-island`, and
`.app-main:has(.app-island) { min-height: 100vh }`. The footer starts below the fold on those screens,
content only grows from there, and nothing visible moves. Measured locally: max CLS **0 on all 8 routes**,
both at the budget's settings and with the CPU slowed 4× to stand in for CI; with the rule removed,
`/fr/progress` shifts 0.0595 again. **Trade-off, deliberately taken:** on app screens the non-affiliation
footer is one scroll down rather than in first view. It is still on every page (R5's requirement), and
the landing and about pages, where first impressions form, keep it in view. The CI re-run is the real
confirmation of the 0.88; it is pending as this is written.

### D69 — Gate B: the lower box wins a *concurrent* edit, detected by revision; the ledger is a new port
**Date:** 24 September 2026 · **Status:** accepted (Gate B is a human decision; the mechanism is derived). Resolves D43

**The decision (human, 24 September 2026):** of D43's three options, **take the lower Leitner box**.

**What implementing it forced.** Applied blindly, `min(box)` is wrong the other way from last-write-wins:
once box 1 has synced, the device's own later box 2 loses to it every time, so **no box could ever rise
after its first sync**. The rule can only apply to edits that are actually *concurrent*, and telling those
apart needs causal information that `ScheduleEntry` does not carry. So:

1. **Every server document carries a per-account `revision`**, strictly increasing, and it doubles as the
   pull watermark. It is a counter, not a timestamp, so clock skew between devices cannot hide a write.
2. **A push names the `baseRevision` it was derived from.** The server accepts it only while that revision
   is still current; otherwise it returns its own copy as a conflict. The **device** merges and re-pushes,
   so server payloads stay opaque (architecture.md §9.2) and every merge rule sits in one pure function,
   `mergeRecord` in `packages/app/src/sync/merge.ts`.
3. **A device finds its changes by diff, not an outbox.** A new **`SyncStateStore` port** holds the
   watermark, the identity, the device-local switch and a **ledger**: per document, the revision it last
   agreed with the server and a hash of the record at that moment (64-bit, two FNV-1a passes over stable
   JSON). A record whose hash differs is dirty. No store's write path knows sync exists, and imports and
   merges are covered automatically. `SyncNow` enumerates each store's `all()`, which is the use D61
   anticipated. Dexie holds the ledger on the `syncMeta` table §9.1 already declared, so there is **no
   schema bump**. §3.3 did not name this port, which makes it the same kind of decision as `IdGenerator`
   (D48).
4. **Merge rules** (symmetric, with a stable-JSON tie-break, so two devices always agree):
   - **schedule:** the lower box wins; on an equal box the earlier `due` wins, and a retired entry counts
     as latest.
   - **session:** a completed copy beats an in-progress one, and the earlier `completedAt` wins. This is
     §9.1's write-once argument.
   - **setting:** the local value wins. Through the server's serialisation, that makes the last device to
     push win.
   - **attempt:** immutable.
5. **Found while testing:** a device pulls its own last push back on the next sync. Taken as a concurrent
   edit, that echo let the older server copy out-merge the device's newer one. **A document at or below
   the ledger's revision is not news, and is skipped.** A test pins this.
6. **`importData` applies the same `mergeRecord`, replacing D62's keep-local rule.** A file carries no
   causal history, so every record already present is treated as concurrent: an old file can send an item
   back for an early review but can never skip one. Import after a wipe is unchanged, and so is importing
   the same file twice. `ImportCount` gains `merged`.
   - **One `data-rights.test.ts` case changed, deliberately:** "never overwrites a local schedule entry,
     session or setting" asserted keep-local, which Gate B supersedes. It is now "merges a record the
     device already has: lower box, completed session, local setting". Its schedule and setting
     assertions are unchanged; the session's now completes. A new case asserts the lower box travels in
     from a file.
7. **§3.3 is amended in place:**
   - `push(items)` takes per-document base revisions;
   - `pull(watermark: number)` returns `{ docs, watermark, more }`, so no separate cursor is needed;
   - `registerDevice(label)` and `redeemPairCode(code, label)`;
   - **registration is idempotent per secret**, so a retry never makes a second account.

   `normalizePairCode` and the pair-code constants live beside the port.

**Proven to bite:** with the ledger check removed, so that every pulled copy merges (the naive `min`),
three `sync-now.test.ts` cases fail. They are "lets a box rise after it has synced", "fast-forwards a record
this device has not changed" and "keeps the lower box on both devices". The file was restored and all 18
pass.

### D70 — the sync backend: `apps/web/src/server`, Drizzle on Node, SHA-256 secrets, rate limits in a table (ADR 21)
**Date:** 24 September 2026 · **Status:** accepted (the SHA-256 call is a human decision; the rest is derived)

**SHA-256, not Argon2id (human decision, 24 September 2026).** Architecture.md §9.2 said Argon2id. A slow,
salted hash defends a low-entropy password against guessing; the device secret is 256 random bits, so
there is nothing to guess. Argon2id would also have cost:
- a native dependency;
- tens of milliseconds and a large block of memory on every sync request;
- a device id sent with every request, because a salted hash cannot be looked up.

SHA-256, unsalted and uniquely indexed, lets the bearer alone find its device. It is the standard
treatment for high-entropy bearer tokens.

**The rest, derived:**
- **Where.** `apps/web/src/server/` holds:
  - the Drizzle schema;
  - a `SyncRepository` whose every method is keyed by account. With no cross-account read path it can
    be audited the way §9.2 asks, without row-level security.
  - `drizzleSyncRepository`;
  - pure `Request → Response` handlers;
  - `db.ts`, the server's one composition point.

  Route files are one-line `serve(...)` bindings. There is no new package. A **new dependency-cruiser
  ban**, `no-sql-outside-web-server`, keeps `drizzle-orm|drizzle-kit|postgres` inside
  `apps/web/src/server/`. It bit on its first run: a route-level integration test imported `sql`, and
  the truncate moved into a server test helper.
- **Node, not Edge.** Next 16 deprecates Edge (its own runtime docs), and postgres.js needs TCP.
  §10 is amended.
- **`db.ts`:**
  - hermetic → an in-process PGlite (`@electric-sql/pglite` is now a direct `apps/web` dependency) with
    the committed migrations applied, memoised on `globalThis` so a dev server that re-evaluates the
    module keeps one database. **Verified under `next dev`**: registration returned 200 and a pull
    `{docs:[],watermark:0,more:false}` with no `serverExternalPackages` entry needed;
  - `DATABASE_URL` → postgres.js with `prepare: false`, for serverless poolers;
  - neither → `null`, and **every route answers 503**.
- **Protocol:**
  - every request carries `Authorization: Bearer <secret>` (64 hex); anything else is 401;
  - registration is idempotent for a live secret, and a revoked secret registers afresh;
  - bodies are validated with `zod` (the version `@palier/domain` pins, now also an `apps/web`
    dependency); a bad body is 400, over 1 MB or 500 items is 413;
  - a device id that is not a UUID is 404 before any query. PGlite had answered it with a 500, which
    the transport contract caught.
  - revoking a device the account does not hold is **404, not 403** (tier 11).
- **Rate limits in Postgres, no library.** The key is an HMAC of the route, IP and UTC day under
  `RATE_LIMIT_SALT`, so no IP and no stable pseudonym for one is stored (§12). The limits:
  - registering: 20 an hour;
  - issuing codes: 20 an hour;
  - redeeming: 10 per ten minutes.

  A returning device does not count against registration.
- **Tier 4 lane.** A second integration project, `integration-web`, is rooted at `apps/web`, and
  `test:integration` runs both. It holds:
  - the `SyncRepository` contract on PGlite;
  - a concurrency case where two 20-item pushes produce revisions 1–40 exactly once;
  - the hermetic `syncApi`;
  - **`syncTransportContract` through the HTTP adapter and the real route files on PGlite.**

  The same contract runs in the fast lane over the in-memory repository. That is what holds
  `@palier/testing`'s `syncHandlers` copy of the protocol to the real one. The in-memory repository and
  the repository contract live under `src/server/__tests__/`, outside the build and coverage.
- **Coverage honesty:** every `route.ts` is at 100% branch in the fast lane, and `handlers.ts` at 97.9%.
  `drizzle-repository.ts` reads **0% in the fast lane**. It is exercised only by the integration lane,
  which runs without coverage (D9). That is the designed split, not a gap anything hides.
- **Not built:** tombstones (nothing deletes a single record), the 90-day tombstone purge, the 180-day
  inactive-account deletion, and production migrations at deploy (`drizzle-kit generate … --out=./drizzle`
  produced the committed `0000_sync_backend.sql`). These are scheduled-job and deploy work for Slice 3.

### D71 — no `adapters/vault`; the sync adapter takes its credential from the root; a hermetic page load is its own device
**Date:** 24 September 2026 · **Status:** accepted

- **`adapters/vault` is not created.** §3.2 lists `/vault`, but D50 already put its whole job, the device
  secret, in `dexieKeyVault`, and pairing's hashing is server-side (D70). An empty subpath would be an
  `exports` entry with nothing behind it (D3). The eslint element comment is updated to say so.
- **`@palier/adapters/sync`** is `httpSyncTransport({ baseUrl, credentials, fetchImpl?, retryDelayMs?,
  sleep? })` over the platform `fetch`, with no vendor at all. The composition root passes
  `credentials: () => keyVault.deviceSecret()`, so the adapter never imports `/dexie`, as
  `no-cross-adapter-imports` requires. Translation:
  - a network fault, 429 or 5xx → `SyncUnavailableError`;
  - 401 → `SyncUnauthorizedError`;
  - a 404 on redeem → `PairCodeRejectedError`;
  - a 404 on revoke → a no-op;
  - any other 4xx → `SyncProtocolError`.

  It retries once on a fault or 502/503/504, **but never retries a redeem**: a code works once, so a
  retry after a lost response would spend it. Responses are structure-checked (D55's approach), so a
  captive portal's HTML reads as "unavailable". The sync base URL is `""`: same origin (§9.3).
- **The hermetic container is one device per page load.** The journeys' in-memory graph now gets:
  - a random 64-hex device secret, the only kind the server accepts;
  - an id counter seeded `random32 × 2^20`.

  With the old `memoryKeyVault()` default secret and `counterIdGenerator(0)`, every browser context
  would have been the same device minting the same ULIDs, which is the attempt-loss collision D39
  exists to prevent, and journey 8 could not have told two devices apart. Within a device the counter
  is still deterministic. The sync transport in hermetic mode is the **real** HTTP adapter against the
  dev server's PGlite routes (tier 6).

### D72 — the sync UI's calls: an "on" state, a delayed "Syncing…", local delete stays local, journey 7's sync half is hermetic
**Date:** 24 September 2026 · **Status:** accepted

- **The header has a fifth state, `on`.** §8.11 lists synced, syncing, offline and off. "On" means sync
  is switched on but this device has no copy on the server yet, because registration waits for the first
  completed session (§9.3). Showing "Synced" there would claim a copy that does not exist. An
  unreachable server shows as "Offline" in the header (§14: a quiet indicator only). The settings
  status line names the real reason (offline, unavailable, removed).
- **"Syncing…" appears only after 400 ms.** The first Lighthouse run after the runner landed showed
  max CLS 0.0003 on eight routes, up from D68's 0: on every load the label flipped "Sync on" →
  "Syncing…" → "Sync on" for a run with nothing to do, and the neighbouring nav items moved. With the
  delay, CLS is **0 on all nine routes**.
- **The data pane's "Delete everything" stays this-device-only**, as its confirmation says.
  "Delete everything everywhere" is §8.11's danger zone on `/settings/sync` (`deleteEverywhere`: the
  server first, and nothing local is touched if that fails). A local wipe keeps the sync identity and
  ledger, so the server copy is neither re-pulled nor deleted. The data pane's copy no longer says
  "there is no copy anywhere else", which sync made false, and import's copy now describes the merge.
- **Onboarding says what §8.1 says:** "Your progress syncs across your devices. You can turn that off
  in settings." This reverses D65's interim line.
- **Device labels are language-neutral**, `Chrome · macOS`: a label is stored once and shown in both
  locales (R8).
- **Journey 7's "sync catches up" half runs on the hermetic lane** (`e2e/sync.spec.ts`), not on the
  `offline` production project, which has no database and answers 503. The flow goes offline
  mid-drill, finishes, and comes back online; the `reconnect` trigger syncs without being asked
  (checked well inside the 30-second session debounce), and the other device receives the attempts.
  The offline half stays in `offline.spec.ts`.
- **Warmup also compiles the seven API routes**, serially, so two journey-8 devices do not hit a cold
  route at once (D67's race).
- **Proven to bite:** with the hermetic id counter put back to `counterIdGenerator(0)`, one shared id
  stream (the D71 collision), journey 8 fails with "Expected 19 items answered, Received 13". Six
  attempts were silently lost to the duplicate no-op.

### D73 — the trend is a function of the attempt *set*: ties break by id, and `recent` orders by id everywhere
**Date:** 24 September 2026 · **Status:** accepted

§6.2 tier 5 asks that "every device computes the same ability estimate from that set". Two things let
two devices holding the same attempts disagree:

- **`calculateTrend` sorted by `ts` alone.** Its sort is stable, so attempts with equal `ts` kept their
  input order, and when `TREND_WINDOW` (100) cut inside such a run the result depended on the order a
  device happened to receive its attempts. A new tier 2 property, "gives the same trend for the same
  attempts in any order, even when their times tie", failed on its first run. **Fix:** equal instants
  order by id (a ULID, so by creation). **No golden or unit value moved:** all 179 engine tests passed
  unchanged, because only a tie inside the window's cut is affected.
- **`memoryAttemptStore.recent` returned arrival order; `dexieAttemptStore.recent` returns id order.**
  The contract's "insertion order" case could not tell the two apart, because its ids were appended in
  order. For a synced attempt, arrival and creation differ. Two contract cases were **added** ("orders
  recent by id, so an attempt synced in late sorts by when it was made" and "keeps the highest ids when
  recent is capped"); Dexie already passed both, the memory store now sorts. None was weakened. The
  port's doc comment now states the order.

In production (Dexie) neither could bite on its own today, since Dexie orders by id and real `ts` values
rarely tie to the millisecond; both are fixed because the simulator's trend property depends on them.

**Ids compare by code unit, never `localeCompare`** (changed after review). Collation varies by locale:
Danish sorts "AA" after "Z", for example, so two devices in two locales could disagree, and IndexedDB
orders keys by code unit. A contract case, "orders recent by code unit, as IndexedDB orders keys", holds
both stores to it.

### D74 — a pair redeem that fails in transit forgets the device's identity and ledger
**Date:** 24 September 2026 · **Status:** accepted. **Found by the sync simulator** (seed 74, 3 devices)

A redeem can succeed on the server and lose its answer. The server has then moved the device's secret
into the new account (and dropped the old one if it is now empty), while the device still believes its
old identity. Every later sync went into the new account **from the old account's watermark and ledger**:
the device pushed its own history there, but never received what the new account held below that
watermark, and every sync reported success. That is permanent, silent divergence from one lost response.
The user saw "pairing failed" and might reasonably not retry.

**Fix: a failed redeem changes only a flag, and the next sync asks the server.** On
`SyncUnavailableError` from the redeem, `pairDevice` sets a new `SyncState` field, `accountUnconfirmed`, and
changes nothing else. The next `syncNow` calls `registerDevice` first. Registration is idempotent per
secret (D69 #7), so the server answers with the account the device is really in:
- **Same account:** the flag clears, and the sync carries on from its ledger.
- **A different account:** the ledger resets, and the exchange starts from watermark 0.

A device with no identity and the flag set does not wait for a completed session, since pairing was a
request to sync. Dexie reads a state row saved before the field existed as `false`.

- **Why not the first version of this fix.** The first version reset the ledger and forgot the identity on
  every failed redeem. Review before merge showed that the common failures (offline, a 429 from the pair
  rate limit, a 5xx) never reach the server. The reset device then treated every record as a concurrent
  edit, so the lower box and the local setting won, and **other devices' newer work was rolled back**.
  The reviewer reproduced it; `sync-account.test.ts` "rolls nothing back when a redeem never reached the
  server" pins it, and fails against the first version.
- **Edge accepted:** a flagged device whose secret was revoked meanwhile re-registers into a fresh account
  instead of being told "removed". It needs two rare failures together, and the result is visible in the
  device list.
- **The app's `fakeServer` was not idempotent on registration**, although the port promises it. It now
  is, and every existing test passed unchanged. New test: `sync-account.test.ts`, "learns on its next
  sync which account it is in when a redeem's answer was lost" (it failed first).
- **Proven to bite:** with the flag removed, regression seed 74 fails. With the first version restored,
  the two new `sync-account` tests fail.
- **Simulator consequence (D76):** the heal phase now syncs every device once *before* comparing accounts.
  Otherwise a device whose failed redeem the server *did* apply would join that account only on its next
  sync, after the heal had already judged it paired (seeds 195 and 339, before the change).

### D75 — sync settles against the live record, not the snapshot it read before the network call
**Date:** 24 September 2026 · **Status:** accepted. **Found by the sync simulator** (seed 7, 2 devices)

The background runner can sync mid-drill (a `focus` trigger). `syncNow` read every record, waited on the
network, and then decided "clean, so take the server's copy" against that **snapshot**. An answer made in
the gap was overwritten: its schedule change vanished, although its attempt survived. With Gate B that
could hide a failure. A lower box made on the device gave way to the other device's higher one, so an
item the user just missed would not come back for review.

**Fix:** `settle` re-reads the device's current copy of each pulled record (`liveRecords` in
`sync/records.ts`: `schedule.get` and `settings.get`, plus one `sessions.all()` per pulled page or push
batch, since `SessionStore` has no by-id read. Review caught that the first version read all sessions once
per session document, O(N²) on a large first pull). A copy that changed
since the snapshot counts as a local edit, so it merges by Gate B instead of being replaced. Attempts are
immutable and are not re-read. Three tests were added to `sync-now.test.ts`, one each for a schedule entry,
a setting and a session changed mid-sync. All three failed before the fix.

**Residual, recorded rather than closed:** the window is now one store read wide rather than a network round
trip: an answer landing *between* `settle`'s read and its write could still be overwritten. Closing it
needs a transaction spanning both, which the store ports do not offer. **Revisit when** a store port gains
transactions, or the simulator's interleaving model reaches store-operation granularity (see D76).
**Proven to bite:** with the re-read removed, seed 7 and three others fail.

### D76 — the sync simulator: where it lives, what it asserts, and what it cannot see
**Date:** 24 September 2026 · **Status:** accepted

- **Where.** `packages/testing/src/simulator/` (network, device, oracle, run, seeds), exported from the
  root entry and never from `./in-memory`. The profile is passed in, because `@palier/testing` has no
  dependency on `@palier/content`. The real-server variant lives in `apps/web`
  (`src/app/api/simulator.integration.test.ts`), because testing may not import `apps/web`. It drives each
  device through `httpSyncTransport` → the route files → the handlers → Drizzle → PGlite, with a separate
  `x-forwarded-for` per device so the per-IP rate limits apply as they would for separate browsers.
- **The devices are the real use cases** (`startSession`, `answerItem`, `completeSession`, `syncNow`,
  `requestPairCode`, `pairDevice`, `setSyncEnabled`, `exportData`, `importData`, `practiceTrend`) over
  the memory stores. Each device has its own id stream, 2^20 apart (D71), and its own clock skew of up to
  ±3 hours. Like the app's `SyncRunner`, a device runs at most one sync at a time, and study continues
  while a background sync is in flight.
- **The network holds each call until a seeded scheduler delivers it**, because the memory server acts when
  called. It reorders across devices, drops before the server (10%), drops the response after the server
  has acted (10%), and partitions. The server runs each delivered call to completion, so a run is a total
  order and replays exactly from its seed.
- **Four phases, each ending in heal → pair everyone → sync to quiescence → check:**
  1. **chaos**: all devices at once, with every action and faults;
  2. **concurrent edits** from a converged state, every device partitioned;
  3. **study during the device's own sync**;
  4. **a week offline**: the others sync once a day, *not* to quiescence, so a device's own echo is still
     in flight when it answers again.
- **Checks:**
  - no attempt lost;
  - none duplicated;
  - every store identical;
  - `practiceTrend` identical;
  - no schedule entry that no answer wrote;
  - after each partition, every record equals `expectedAfterHeal(base, sides)`. That is: changed on one
    side means that side's copy (the week-offline property); changed on several means their
    `mergeRecord` fold (Gate B); a setting changed on several may be any of them, since the last to push
    wins.

  A lone device's side is built from **what its answers wrote**, not from its store afterwards, because a
  sync that overwrote an answer (D75), or a device's own echo overwriting its newer box (D69 #5), would
  otherwise be hidden in the snapshot. That change is what made the ledger-skip revert bite. The first
  design missed it.
- **Lanes:**

  | Lane | Seeds |
  | --- | --- |
  | Fast (`testing` project) | 16 × two devices + 16 × three, plus the regression seeds and proofs that each check bites |
  | Medium (`integration-testing`, new gated project; `test:integration` runs it) | 400 on the memory server, and 100 through the real handlers on PGlite |
  | Nightly (`CI_LANE=nightly`) | 100,000 and 2,000 |

  `PALIER_SIM_SEEDS` and `PALIER_SIM_SEEDS_PGLITE` override the counts. Measured: about 20 ms a seed in
  memory and about 110 ms on PGlite.
- **What it cannot see (honest limits):**
  - interleavings finer than a network call: store operations resolve at once, so an answer never lands
    between two store calls inside `settle` (D75's residual);
  - merges between two devices both at home in the three-device week phase, which are legitimate and
    not checked against answers;
  - device removal, `deleteEverywhere` and tombstones, which it does not exercise;
  - a failing seed replays the chaos script as it stood, so each fixed defect also keeps its own named
    unit test in `@palier/app`.

### D77 — the one-off mutation check: Stryker on the command runner, run in place; 14 gaps closed, 5 equivalents
**Date:** 24 September 2026 · **Status:** accepted

§6.2 says: "run it once at the end of phase 2, act on what it finds, and drop it from the schedule if it
finds nothing."
- **Tooling:** `@stryker-mutator/core` and `@stryker-mutator/vitest-runner` 10.0.0 are root
  devDependencies. §6.1 names Stryker, and nothing present mutates code, so they replace nothing. There
  is a root `mutation` script and `stryker.config.json`, in JSON so the default-export exemption list is
  untouched. `reports/` and `.stryker-tmp/` are gitignored. It is **in no CI lane.**
- **Two deviations from the obvious setup, both forced:**
  - **The command runner** (`pnpm exec vitest run --project=engine`), not the vitest runner. Under the
    root multi-project config, the vitest runner never activated a mutant: 8.35% and "0 tests ran" on
    seven of eight files, identically with coverage analysis on or off.
  - **`inPlace: true`**, because Stryker's sandbox copy breaks pnpm's nested workspace links. Stryker
    restores the files afterwards, and `git status` confirmed that after every run.
- **First real run: 95.09%** (387 killed of 407, 20 survived, 5 min 24 s). Each survivor was either
  given a test naming the behaviour, or recorded here as equivalent:
  - **Closed, 14:**
    - both error `name`s;
    - `resolveBand` ordering a cut table given highest-first;
    - `pointsToBand` at exactly the cut (null, not 0);
    - the taper at exactly three days, and the mock-exam advice at exactly 24 hours;
    - the scheduler's refusal message;
    - the 14-day exclusion at exactly 14 days;
    - both `subSkillBreakdown` sort keys deciding alone;
    - an orphaned attempt not taking a trend window slot;
    - `weakestSubSkills` at exactly its 50-answer window.
  - **Equivalent, 5, each kept as written:**
    - `testDate !== undefined`: with no date, the NaN arithmetic already disables the taper;
    - `mode: "practice"` in the planner and `?? "practice"` in the selector: both are only ever
      compared with `"diagnostic"`;
    - `chosen !== null &&` in the scorer: scoring a null response is false anyway;
    - `new Array(n)` against `new Array()`: filled by index either way.
- **Second run: 98.54%** (403 killed, 1 timeout, 6 survived, 4 min 57 s). The sixth survivor was a
  new-visible gap: the taper's review cap was never exceeded by the due reviews in any test. It now has a
  test ("caps the reviews while tapering…"), proven by applying that mutant by hand. So **404 of 410
  mutants are detected, and all 5 survivors are equivalent.**
- **Found alongside:** `weakestSubSkills` windowed on `ts` alone, the same gap D73 closed in the trend. A
  permutation property failed once its generator actually passed the 50-per-sub-skill window. The fix
  is the same id tie-break. **No golden value moved.**
- **Keep it, on demand:** it found real gaps, so per §6.5 it runs again after any engine rewrite
  (`pnpm mutation`, about 5 minutes). It stays out of every lane.

### D78 — deploy tooling: migrations at a production build only, baseline headers now, the retention jobs in Phase 7
**Date:** 24 September 2026 · **Status:** accepted

Gate C was provisioned together with the human (their choice). Everything that did not need their accounts
was built first:

- **Migrations apply at deploy, and only a production deployment or a person applies them.**
  - `apps/web/src/server/migrate.ts` decides and applies. `vercel.json`'s build command runs it after
    `next build`, through `scripts/db-migrate.mjs`.
  - It **skips** with no `DATABASE_URL`, and for any `VERCEL_ENV` other than `production`. So a preview
    cannot touch the production schema, even if one is misconfigured with a database. Off Vercel, a
    person with `DATABASE_URL` set has asked for it.
  - A failed migration fails the deploy, and the old deployment stays live.
  - Migrations must therefore stay backward-compatible (`docs/deploy.md`).
  - Rejected: migrating on the server's first request (a race between cold starts, and a schema change
    under live traffic), and migrating by hand only (every future schema change becomes a human step
    that will be forgotten).
  - `migrate.ts` has no relative imports, so Node 22's type stripping runs it: **no new dependency and
    no build step.** Its decision and orchestration are unit-tested. `applyWithPostgres` has no branch,
    and its first real run is the first production deploy (session log).
- **Baseline security headers on every response now, the strict CSP later.** Architecture §12's HSTS,
  `nosniff`, `Referrer-Policy: no-referrer` and a microphone-on-self-only `Permissions-Policy` are header
  config with no runtime cost. A public deploy should not ship without them. They are asserted on the
  production server (`e2e/production.spec.ts`). The strict CSP needs nonces for Next's inline scripts
  plus tier 11's check on the built output, so it stays Phase 7's. Lighthouse is unchanged at 1.0/1.0.
- **The 90-day tombstone purge and the 180-day inactive-account deletion move to Phase 7** (ADR 21 left
  them to "Slice 3 or Phase 7"). Nothing creates a tombstone yet (no record type has a per-record delete),
  and no account can reach 180 days of inactivity before Phase 7. Building a scheduler now would be a job
  with nothing to do. The plan's Phase 7 retention work (`implementation-plan.md` §7) is where both land.
- **`RATE_LIMIT_SALT` is required in production, in the runbook rather than in code.** `db.ts` falls back
  to a random salt per process, which on serverless means a salt per instance, so the per-IP limits would
  not hold across instances. `docs/deploy.md` makes setting it a step of Gate C. Making a missing salt
  fail loudly is left to Phase 7's hardening, because failing the whole sync service over it would trade
  a weaker limit for an outage.

### D79 — Phase 3 is planned as four slices, mirrored in two documents
**Date:** 24 September 2026 · **Status:** accepted

D57 made a scoped exception to the "one copy of the plan" rule for Phase 2: the slices appear in both
`implementation-plan.md` §7 and here, and the two must agree. Phase 3 takes the same exception, as the
Phase 2 *Next, decided* already proposed. D57 is not edited. The four slices:

1. **The exam core, no UI.** It carries two of the four exit criteria: the per-variant goldens [R3] and
   idempotent scoring.
2. **Forms and a bank that can fill them.** The committed bank has 10 items and no forms. The smallest
   variant needs 25 scored items.
3. **The runner and results UI, and E2E journey 3.** Behind **Gate D**, the exam UI direction.
4. **Telemetry and the item-statistics job**, then the closed pilot, which is the plan's human gate.

The order follows the dependencies. The UI needs forms to run, the forms need a bank, and the
statistics job needs submitted runs. Slice 1 needs none of these: it runs over the fixture bank's two
forms.

### D80 — an exam run lives in the session id space, and an exam attempt is a pure function of its answer
**Date:** 24 September 2026 · **Status:** accepted

Four decisions of Phase 3 Slice 1. The plan left them open, and the sync simulator settled the last.

- **`ExamRun` is an `@palier/app` aggregate, and its id is a `SessionId`.**
  - Like `Session` (D45), nothing in the engine consumes a run: `scoreExam` takes the form, the items
    and a response map. So the type stays out of `@palier/domain`.
  - Every `Attempt` groups by `sessionId`, so the attempts a submission records point back at their
    run without a cast. A run is never written to the `SessionStore`, so the practice plan's
    `latest()` (D46) cannot mistake an exam for a finished practice day.
- **The run holds elapsed exam time and no result.**
  - A resume restores the timer from `elapsedMs`, which never goes backwards, and not from the wall
    clock. So the time a tab was closed never counts (PRD §14: "mock exams resume with the clock as it
    was").
  - The result is rescored on demand (ADR 16). That is safe because a form and its `bandCuts` are
    immutable, and it makes scoring idempotent by construction. A fast-check property holds it: exit
    criterion 4.
  - `put` is a plain upsert. The write-once `submittedAt` lives in the use cases, which refuse any
    write to a submitted run, and in `mergeRecord`.
- **The merge rule.** A submitted copy beats an in-progress one, and of two submitted copies the
  earlier `submittedAt` wins, as sessions do. Of two in-progress copies, the one with more elapsed
  exam time wins, and the other copy's answers are discarded. That is accepted: one run in progress on
  two devices at once needs the candidate to sit the same exam in two browsers offline. The
  alternative, a union of answers, would invent a run neither device held.
- **An exam attempt's id is `${runId}:${itemId}:${recordHash(answer)}`, and its `ts` is the answer's
  `answeredAt`, not the moment of submission.**
  - The plan said `${runId}:${itemId}`, stamped at submit. **The simulator's new exam phase showed
    that to be wrong.** Two devices submitting the same synced run offline recorded one id with two
    contents, because each stamped its own submission time. Attempts are append-only (`writeRecord`
    appends, and a known id is a no-op), so the copies never converge.
  - With the plan's rule, 40 three-device seeds produced **79 violations** (lost-attempt 36,
    diverged 16, merge-oracle 15, no-quiescence 12). With this rule they produce **0**.
  - Now a retry, or a second device with the same answers, derives byte-identical attempts. Two
    devices with *different* answers derive different ids and both attempts are kept, as a union.
    Nothing is overwritten. The practice trend excludes exam attempts (D64), so nothing a user sees
    double-counts.
  - **Slice 4's statistics job should read a run's responses from the winning run**, not from its
    attempts, since a concurrent double submission can leave attempts for answers the winning run
    does not hold.
  - This extends D39: the caller mints the run id, and the attempt ids are a function of it and of
    data. Nothing is minted from `Random`.
  - Residual: two devices on different bank versions submitting the same answer would record
    different `bankVersion`s under one id. That needs a deploy to land mid-exam, and the same run
    submitted offline on two devices across it.
- **Pilots:** `submitExam` records a pilot's attempt through `recordAttempt`, the score-and-append half
  split out of `answerItem`, and never schedules it (the D41 hand-off). The existing `answerItem`
  tests pass unchanged.
- **A rule-independent oracle check** (`unsubmittedRuns`): a run submitted anywhere ends submitted
  everywhere, with the earliest submission. The partition oracle folds by `mergeRecord` itself, so it
  cannot catch a wrong merge rule. With the rule weakened so an in-progress run wins, the partition
  oracle reported nothing, and this check reported 45 violations in 40 seeds.

### D81 — the export format is version 2, and version 1 files still import
**Date:** 24 September 2026 · **Status:** accepted

Exam runs are progress [R11], so the export carries them as a fifth list, `examRuns`, and
`EXPORT_VERSION` becomes 2. `export-document.ts` already required an old export to stay importable.
A version 1 file is therefore read as a version 2 document with no exam runs, which is exactly what it
describes, and a version 2 file must carry the list.

Three existing data-rights tests pinned the export's field list and the per-store import counts. They
were widened by the new field, because the shape changed on purpose. Their point, that no key-vault
content is exported and that round trips are exact, is unchanged. `aDevice` now also holds two exam
runs, so those round trips cover exam runs too. The browser-safe `@palier/testing/in-memory`
export-list test likewise gained `memoryExamRunStore`.

The data-settings import toast still counts attempts, reviews and sessions only. Adding mock exams to
its bilingual copy belongs with the exam UI in Slice 3.

### D82 — forms are assembled per variant; bank v2 carries v1 forward; the scripted provider was rebuilt to fill it
**Date:** 24 September 2026 · **Status:** accepted

Phase 3 Slice 2. *Next, decided* named the form stage and the bigger bank. Building them turned up four
things it had not anticipated, and each is settled here.

- **The form stage** (`apps/factory/src/pipeline/forms.ts`) builds one `ExamForm` per
  `Object.entries(profile.variants)`, and every number in it comes from the variant: `items`, pilots =
  `items − scored`, `minutes`, `orderedCuts`. The draw is stratified. Sub-skills are taken round-robin
  in taxonomy order, bands are interleaved within each sub-skill, and the whole draw is seeded
  (`formSeed`, defaulting to a hash of the batch id). Items on one passage sit together. **Pilots sit
  at evenly spaced positions** and are drawn like any item, so they are neither leftovers nor
  findable by position. A bank that cannot fill a variant throws `FormShortfallError`. `runPipeline`
  reports that as a form issue beside the batch's other numbers, and **the CLI writes no bank with a
  form issue**.
- **Form id and version.** *Next, decided* said `version: 1`. The form instead takes
  `id: ${lang}-${variant}-v${bankVersion}` and `version: bankVersion`. An exam run is rescored from its
  form (ADR 16), so an id reused with different items would silently rescore old results. With the bank
  version in the id, a regenerated bank can never do that. **Residual:** a run started on form
  `…-v2` needs that form in whatever bank the client reads later. The next bank version must therefore
  **carry forms forward too**, and the carry-forward below covers items and passages only. That is the
  full-volume content run's first task (D54).
- **`checkForms` was nearly empty.** It checked id resolution and the total count, silently skipped an
  unknown variant, and nothing read its output. It now flags:
  - an unknown variant;
  - a pilot count, time limit or cut table that differs from the variant's;
  - an item of another skill or language;
  - any `examFormSchema` failure.
- **Bank v2 carries v1 forward.** architecture.md §5.5 promises item ids are stable across versions,
  and live users hold attempts and schedule entries on v1 ids, which `byIds` silently drops when
  unknown. The CLI therefore reads `v{n−1}` as `carried`. Carried items are re-validated with the new
  drafts and placed ahead of them, so a new near-duplicate is the item dropped. The batch report counts
  them as `itemsCarried`, apart from `itemsPublished`, so yield and cost per item stay this batch's.
  All 10 of v1's ids are in v2, which the adapter test asserts.
- **A published version is now protected.** `writeBank` used to delete `content/bank/v{n}` first, so
  the old default `--bank-version 1` would have destroyed the published v1. The default is now 2
  (`DEFAULT_BANK_VERSION`), and `run` refuses an existing version without `--force`.
- **The scripted provider could not fill a bank.** `hashNum` of seeds differing in a trailing digit
  gives consecutive word indices, so every stem was a run of consecutive words: about 80 distinct stems
  per band. Writing seeds also ignored band and type. A third of v1's reviewed items were
  near-duplicates. Each stem word is now picked through SHA-256, and band and type join the seed.
  **The new v2 run has 0 near-duplicates among 368 drafts.** A consequence: HEAD no longer
  reproduces v1. That is acceptable, because a published version is immutable and is never
  regenerated; it stays reproducible from its own commit.
- **The run is sized from the profile.** All reading sub-skills are drafted per passage, and the
  writing plan covers every writing sub-skill × topic × band (240 rows). `--per-source` (default 2) is
  the one knob, tuned by trial:

  | per source | reading | writing |
  | --- | --- | --- |
  | 2 | 85 | 147 |
  | 3 | 128 | 147 |

  2 was chosen: 85 reading is 1.4× the largest reading variant (60), and 147 writing is 2.3× the
  largest writing variant (65). The whole v2 bank is about 30 KB gzipped.
- **The committed bank is checked on disk.** `committed-bank.test.ts` reruns the pipeline through the
  CLI's own `runInputFor`, at the committed report's `generatedAt`, and compares every file under
  `content/bank/v2`. It also checks the batch report. Before this, "byte-reproducible" was only an
  in-memory rebuild.
- **The worker precaches the current bank only.** This refines D60, which precached every served
  version. `prepare-public.mjs` reads `BANK_VERSION` from the composition root, as it already read
  `BANK_BASE_PATH`, and the worker precaches that manifest alone. Every version is still copied and
  served, and an old one is cached on first request. A `BANK_VERSION` with no committed bank fails the
  build.
- **The journey 8 flake had two causes.**
  - The helper waited for a "Last synced" line that was already showing. The hermetic clock is fixed,
    so the line's time never changes either.
  - `SyncRunner` silently dropped a "Sync now" pressed while a background run (focus, or the 30 s
    after-session debounce) was in flight, so an explicit demand could return having pulled before the
    other device pushed.

  The fixes:
  - A demand made mid-run now runs once more after it. `runsAgainAfterCurrent` in
    `lib/sync-triggers.ts` is pure and tested.
  - The status line carries `aria-busy` while an exchange is in flight.
  - The helper waits for a pull *sent after* its click, then for the status to stop being busy.

  The test's assertions are unchanged.

### D83 — Slice 4 is split, so work continues while Gate D is open
**Date:** 24 September 2026 · **Status:** accepted

D79 made Slice 4 (telemetry and the statistics job) follow Slice 3, because its opt-in lives on the
results screen. Only part of it depends on that screen:
- the statistics (architecture.md §7.6);
- the `POST /api/telemetry` route and its table;
- the retirement job;
- exit criterion 3, which runs on synthetic data.

None of those needs a runner or Gate D. So Slice 4 becomes:
- **4a**: the statistics core, the route and the job, no UI, buildable now;
- **4b**: the opt-in, the post-exam prompt, client batching and the readiness disclosure, after Slice 3.

The alternative was idling on a human gate, which working-agreement rule 7 treats as a menu. D79 is not
edited. `implementation-plan.md` §7 mirrors the split.

### D84 — Gate D: PRD §8.4–§8.5 adopted with twelve rulings, and pilots are never revealed
**Date:** 25 September 2026 · **Status:** accepted (human decision)

Gate D asked whether to adopt the exam screens PRD §8.4–§8.5 describe. Those sections are about ten
lines. Read against the rest of the PRD and the Slice 1 core, they carry one contradiction and several
gaps, so the gate was settled as "adopt, with rulings".

| # | Ruling | Why |
| --- | --- | --- |
| 1 | **The clock freezes while the tab is closed, and results show "paused n times".** | §6.3 says "no pausing after the first 60 seconds"; §14 says an exam resumes "with the clock as it was". Slice 1's `elapsedMs` already freezes. A dropped connection costs no time, and the result stays honest |
| 2 | **Retakes allowed**, labelled "you have seen these items; this result will read high" | §6.3's "one attempt per form" would mean one mock exam per variant, ever, while v2 has one form each |
| 3 | **Optional 1.5× extra time**, and its results are marked | WCAG's essential-time exception applies, but the real SLE offers accommodations |
| 4 | **Selecting is answering**; no confirm step; answers change freely through the navigator | As the real test works |
| 5 | **The submit dialog counts unanswered and flagged items**; time running out submits automatically | |
| 6 | **Confidence is inferred**: "unsure" = flagged or a changed answer, and the screen says so | A per-item sure/unsure toggle would change the exercise |
| 7 | **Sub-skill results are counts** ("4 of 6"), not percentage bars | About 6 items per sub-skill; R10 |
| 8 | **Near-miss**: always the gap to the next band up, and to the band below when within 2 of its cut | Computed from the form's cuts |
| 9 | **Pilots are never revealed to the user** (the human's call; the recommendation was to reveal them after submit) | The real test does not |
| 10 | **"Add to review queue" on items not already queued** | Wrong scored answers are queued at submit (D41) |
| 11 | **A muted `@palier/ui` exam token set**; no Coco, no motion | §8.4's "deliberately colder" |
| 12 | **`/exam` chooses skill and format**, reached from home's quick action and the readiness card | |

**What ruling 9 changes elsewhere.**
- architecture.md §7.5 said pilots are "marked as such in the review". It is amended in place with a
  dated note, as §9 has been. The comment on `ExamForm.pilotItemIds` follows.
- Scoring is unchanged: pilots are still excluded, and `scorer.test.ts` still quotes the original
  sentence as the spec it was written against.
- **Two things would give pilots away, so Slice 3 must avoid both:**
  - Any per-item marker or style.
  - Ruling 10, if keyed to "answered right". A wrong pilot is never auto-queued (D41), so it would
    be the one wrong answer showing an "add" button. The button is therefore keyed to "not already in
    the queue", which covers correct answers and wrong pilots alike.
- The results' figures count scored items only. That is visible only as the published "of 50" total,
  which the real score report states too.

**Data the rulings need.** Ruling 1 needs a resume count and ruling 3 a time allowance, so `ExamRun`
gains two optional fields in Slice 3. Ruling 6 needs nothing new: `ExamAnswer.changedAnswer` and
`flagged` already exist.

### D85 — the exam core's additions for the UI: two optional run fields, `forms()`, and what counts as a pause
**Date:** 25 September 2026 · **Status:** accepted

Phase 3 Slice 3's core half. *Next, decided* named the two run fields. Building them, and the screens that
read them, forced five calls it did not anticipate.

- **`ExamRun.timeAllowance?` and `ExamRun.resumes?`** (absent = 1 and 0). They are written only when they
  differ from the defaults. So a run without extra time, never paused, is byte-identical to one written
  before the fields existed, and hashes the same, so no sync ledger turns dirty on upgrade.
  - `startExam` takes the allowance and refuses anything not finite and ≥ 1.
  - `resumeExam` gives the time left with it, as `runLimitMs(run, form)`.
- **`parseExamRun` had to learn them, or they would vanish.** It rebuilt a run field by field, and export,
  import and sync all go through it, so a synced run would have silently lost its extra time. It now
  validates both fields, copies each only when present, and rejects a malformed value.
  - **The export stays at version 2**, the condition *Next, decided* set. Absent fields mean the defaults,
    and an older build ignores the extra keys.
- **A resume counts as a pause only once exam time has run** (`elapsedMs > 0`).
  - The picker starts a run, then the runner opens it, so a first load straight after `startExam` must not
    count.
  - `resumeExam` therefore writes now: it increments `resumes` and checkpoints. The old read-only lookup
    is kept as a separate use case, `examInProgress`, because the picker's "resume your exam in progress"
    card must not count as a pause just by looking.
  - One existing test changed for this. `exam-run.test.ts` "resumes the latest unsubmitted run…" expected
    the stored run back unchanged. It now expects `resumes: 1` and the new checkpoint, which is ruling 1's
    behaviour.
- **`mergeRecord` is unchanged, so a concurrent `resumes` increment can be lost.** A whole record wins, and
  the copy with more exam time is kept with its own count. This is the same argument D80 accepts for two
  in-progress copies' answers: it needs one run open on two devices at once. A merge test names the
  residual.
- **`ItemRepository.forms()`**, amended into `implementation-plan.md` §3.3 in place, as D38 and D61 were.
  - The picker lists the profile's variants (ADR 9) and needs each one's form. The alternative, deriving
    `fr-${variant}-v${BANK_VERSION}` in the web app, would bind the app to the factory's id convention
    (D82), and it does not hold for the hermetic fixture forms.
  - The HTTP adapter lists through `form()`'s per-path cache, so listing and then opening a form fetches
    it once.
  - The contract gains two cases. The memory repository, the HTTP adapter and every local stub implement
    it.
- **Four new `@palier/app` use cases** (`exam-report.ts`):
  - `examReport`: the rescored result, the form's items, which items are queued, and whether this is a
    retake of a form already submitted, with ties broken by run id;
  - `latestExamResult`: the readiness card, passing over a run whose form has left the bank;
  - `examForms`;
  - `queueForReview`: box 1, as a wrong answer gets. It is a no-op on an item already due and reopens a
    retired one.
- **One new engine function, `examSubSkillBreakdown`**: tallies per sub-skill over **scored** items only,
  unanswered counting as wrong, and weakest first by the same comparator as `subSkillBreakdown`. It is new,
  so no golden value moved.

### D86 — the exam token set, a tenth `warning` token, and `Dialog` and `Timer` in `@palier/ui`
**Date:** 25 September 2026 · **Status:** accepted

Ruling 11 (D84) asked for "a muted `@palier/ui` exam token set … no motion", and §8.4 for a clock that turns
amber at ten minutes and red at two.

- **The exam set overrides tokens under `[data-mode="exam"]`**, and the rest fall back to the default.
  - It overrides neutral greys for `bg`, `surface`, `ink` and `ink-muted`, a slate `primary`, a grey
    `accent`, and slightly deeper `incorrect` and `warning`.
  - `renderTokensCss` emits these blocks after the `[data-theme]` blocks, in the same three steps: light,
    then the OS dark preference, then the manual toggle. The toggle selectors are specific enough to beat
    the OS rule.
  - The contrast gate now runs every pair over **both sets × both themes**: 60 checks, where there were 26.
    The drift guard and new order assertions cover the CSS.
- **`warning` is a tenth token**, `#8A5300` light and `#F2B35B` dark, at 4.5:1 or better on both
  backgrounds. The amber clock carries information, so it cannot be `accent`, which §10.2 makes decorative
  and the gate leaves out. The red clock is `incorrect`.
  - `tokens.test.ts` pinned the nine names, and its list gains `warning`. The shape changed on purpose.
- **No motion in exam mode, whatever the user's preference.** A `[data-mode="exam"]` rule switches off the
  transitions and animations the reduced-motion block lists. Exam mode also paints its area in the set's
  `bg` and `ink`.
- **`Timer` is presentation only.** The thresholds are the web app's product constants (*Next, decided*),
  so the tone arrives decided.
  - The visible `m:ss` is not a live region.
  - A visually hidden polite span carries the caller's once-a-minute line (§11).
  - A low-time tone adds a clock glyph and words (§10.2).
  - The CLAUDE.md line that listed "timer thresholds" as ui logic now says "timer tone classes".
- **`Dialog` is the native `<dialog>` with `showModal()`.** The platform makes the page inert, holds focus
  and handles Escape, so no focus-trap code or dependency was needed. Focus goes back to the opener on
  close. A `side` placement makes it the navigator drawer. jsdom has no modal dialogs, so its tests stand
  in for `showModal` and `close`.
- Two glyphs, `clock` and `flag`, join the set.

### D87 — the exam UI's calls, and three defects journey 3 found
**Date:** 25 September 2026 · **Status:** accepted

Phase 3 Slice 3's UI half. It builds to D84's rulings, and these are the calls those rulings left open.

- **Navigation is the router's, and offline it falls back to a document load.**
  - The picker goes to `/exam/run?run=<id>` and the runner to `/exam/results?run=<id>` with next-intl's
    `router.push`. Offline, the RSC fetch fails and Next loads the document instead. The worker serves that
    from its cache with `ignoreSearch` (D60), which is why all three routes stay static.
  - Journey 3 submits offline and lands on the results, so this is proven, not assumed. The plan had
    guessed a forced `window.location.assign`. That was not needed, and it would have lost the hermetic
    in-memory run.
  - The run id is read from `window.location.search` in the island. Nothing uses `useSearchParams`, so no
    Suspense boundary and no client-side bailout.
- **The clock** is the run's stored `elapsedMs` plus `performance.now()` since the page loaded. It ticks once
  a second.
  - It checkpoints every **10 s** of exam time (`CHECKPOINT_EVERY_MS`, a product constant), on
    `visibilitychange` → hidden and on `pagehide`, besides every answer and flag. A crash can lose at most
    10 s.
  - The thresholds are `AMBER_MS` (10 min) and `RED_MS` (2 min). The live region's line changes only
    when `announcedMinutes` does (§11).
  - Time running out submits, and a failed submission retries after 3 s rather than in a tight loop.
- **Every write goes through one promise chain.** `answerExamItem` and `checkpointExam` each read the run
  and put it back, so two in flight at once could each drop the other's change: a lost answer. The reducer
  never awaits anything. It appends each answer and flag to an `outbox`, and the island drains the outbox
  in order. A failed batch stays in the outbox and is written again, and every write is idempotent.
- **Keys:** 1–4 choose, and so answer (ruling 4). Enter goes to the next item, and F flags. As in the drill,
  the reducer resolves them (D67).
- **Three defects journey 3 found, each fixed at the source.** None of the fixes changes an assertion.
  1. **Enter on an option also clicked it.** An option is a `<button role="radio">`, so Enter's native click
     arrived after the reducer had moved on, and it answered the *next* item with this one's choice. The
     journey saw 31 answers where it had given 30. The listener now calls `preventDefault()` on the Enter
     it takes. The drill never showed this, because it ignores a select while it records.
  2. **Focus came back from the navigator a task late.** `Dialog` restored focus on the `close` event,
     which a browser fires a task after `close()`. A key pressed in between landed on "All items" and
     reopened the drawer. `Dialog` now restores focus at once when its caller closes it, and the runner
     then moves focus on to the item. A ui test holds this with a `close()` that fires no event.
  3. **The first cut of the journey could not see a reload.** Thirty keyboard answers take under a second,
     so the clock read 90:00 both before and after the reload. The journey now waits past one checkpoint
     interval before reloading.
- **Results** (`features/exam/results.ts`):
  - **The near-miss below** (ruling 8) reads "within 2 of its cut" as `raw − bandMin ≤ 2`. The line then
    says `raw − bandMin + 1` fewer correct answers would have dropped the result a band.
  - **The bottom band does not name its own cut**, since "X starts at 0" says nothing and the gap to the next
    band says it all. For the same reason the readiness card names the next band's cut from X: "X, 5 of 50.
    A starts at 18."
  - **Calibration gives counts, not item lists.** A list could give a pilot away by its absence, for
    example a flagged pilot that is missing from "unsure and right" (ruling 9).
- **The review walkthrough** shows every item in a closed `<details>`. It reuses the item renderer with
  `revealed`, and the drill's feedback copy and item-report control. "Add to review queue" is a new use case
  (D85), keyed to "not queued" (ruling 10).
- **Home's readiness card** is now titled "Where you stand", with two subsections. The exam half ("Your last
  mock exam") leads, and the practice trend follows, as §8.2's two distinct things. The "Mock exams arrive
  later" line is gone. The review card gains the mock-exam link (ruling 12).
- **Exam mode covers the runner's section only.** The header and footer keep the default palette, for D65's
  reason: R5 and WCAG 3.2.6 want them the same on every page.
- **A navigator entry is one ICU message** (`navEntry`), so its accessible name reads "Item 3: answered,
  flagged". Two adjacent spans would have read "Item 3answered".
- **Deferred, not dropped:** §14's "resume *or discard*". Nothing discards a run. Starting a new exam leaves
  the old one unfinished, and `unsubmitted()` offers the newest. A discard needs a store write (a
  `discardedAt`) and a merge rule, so it waits for a reason stronger than tidiness.
- **Existing tests touched:**
  - `offline.spec.ts`'s `waitForOfflineReady` moved to `helpers.ts`, with no assertion changed.
  - `journeys.spec.ts`'s titles test gained two exam routes.
  - The import toast's copy gained a mock-exam count at the end of the sentence, so journey 6's
    "Imported N answers" still matches.

### D88 — Slice 4 is one slice again
**Date:** 25 September 2026 · **Status:** accepted (human decision); supersedes D83's split

D83 split Slice 4 into **4a** (statistics, route, job, no UI) and **4b** (opt-in, prompt, batching,
disclosure). The only reason was to keep working while Gate D was open. 4b needed the results screen, and
the results screen was behind Gate D.

That reason has gone. Gate D was resolved (D84) and Slice 3 has built the results screen (D87). No human
gate stands between Slice 3 and any part of Slice 4, and the closed pilot follows Slice 4 either way. The
human asked for Slice 4 to be next as a whole, so it is rejoined. D83 is not edited.
`implementation-plan.md` §7 mirrors the change.

Rejoining it settles two client questions that 4b would have met:
- **Telemetry events queue in IndexedDB**, not in memory, because a mock exam can be submitted offline.
  That needs Dexie schema v2.
- **The opt-in belongs to the device and never syncs.** Consent given in one browser must not enrol
  another, and PRD §15 keeps sync and telemetry apart.

### D89 — the pre-merge review: ruling 10's button keying gave pilots away, and seven more fixes
**Date:** 25 September 2026 · **Status:** accepted; **refines D84 ruling 10, in service of ruling 9; confirmed by the human 25 September 2026 (D96)**

A candid review of the Slice 3 branch before its PR found eight real defects. All are fixed, and each has a
test or an E2E assertion.

- **🔥 "Add to review queue" keyed to "not already queued" revealed wrong pilots.** D84 chose that keying so
  a pilot would not be the one *correct* answer with a button. But a submit queues every wrong scored answer
  and never a pilot (D41), so among the *wrong* answers the pilots were exactly the ones still showing the
  button. A changed answer gave them away the same way.
  - The button now starts the same on every item.
  - A tap on an item already queued is `queueForReview`'s existing no-op, and reads "In your review queue"
    either way.
  - `ExamReport.queued` and `ReviewRow.canQueue` are removed, so nothing can key the screen to the queue
    again.
  - This departs from ruling 10's letter ("on items not already queued"), and it is ruling 9 that forces it:
    pilots are never revealed. The human should confirm.
  - The tests pinning the old keying were written on this branch and are replaced, not weakened.
    `exam.spec.ts` now asserts all 25 entries start with the button.
- **⚠️ A run whose form a later bank dropped wedged `/exam` and `/exam/run` for good.** `examInProgress` and
  `resumeExam({})` threw `UnknownFormError`, and nothing discards a run (D87). Both now take the newest
  unsubmitted run whose form still resolves, passing over the rest. A *named* run still throws.
  - One `exam-run.test.ts` case, which expected the throw for the no-id call, now expects the pass-over,
    and a new case keeps the named throw.
- **🤔 `latestExamResult` failed the whole home screen** when a run's form was present but an item had left
  the bank, because `scoreExam` throws. Such a run is now passed over.
- **🤔 The runner:**
  - **A write the store refuses** (`ExamAlreadySubmittedError`, the same run submitted in another tab) no
    longer retries forever and holds the submit back. The runner goes to the results.
  - **Keys with a modifier or on repeat are ignored**, so Ctrl/Cmd+F no longer flags and a held Enter no
    longer skips items.
  - **A passage that fails to load says so**, and the next visit retries.
  - **Its timers are cleared on unmount**, so a pending results `router.push` cannot pull back someone who
    has left.
  - **The submission status line takes focus** when the runner stops running, since that unmounts any open
    dialog with focus inside it (§11).
- **The review's second pass** caught one smell in the first pass's own fix. The pass-over scan had left
  `ExamRunStore.unsubmitted()` unused. The scan now uses that indexed read first, and walks every run only
  when the newest is stranded.

### D90 — the medium lane ran out of budget on PR #25, and Lighthouse now has its own port
**Date:** 25 September 2026 · **Status:** accepted; **the budget's headroom is flagged for the human**

PR #25's push run failed its medium lane, while the pull-request run on the same commit passed.
- **The root cause is the 240 s budget.** `verify:medium` was killed at exactly 240 s, with 30 of 33
  Playwright tests passed. The passing run used 200 s. Before this slice, `main`'s last three runs already
  used 204, 211 and 215 s. This slice's two exam specs added about 15 s, and a slow runner (integration at
  67 s against 47 s) did the rest.
- **The Lighthouse `NO_FCP` was a knock-on.** Playwright's hermetic `next dev` and Lighthouse both used
  `localhost:3000`. `timeout` killed pnpm but not the dev server under it, so `lhci` navigated to that
  orphaned server, hung for 21 minutes, and failed on `NO_FCP`.
- **The fixes:**
  - **Lighthouse serves on port 3200** (`lighthouserc.json`), so a leftover test server can never answer it.
    Rerun locally: 12 URLs × 5 runs, every median 1.0 / 1.0.
  - **Journey 3's clock wait is shortened.** It waited past a 10 s checkpoint; now one answer is stamped
    after about 4 s of exam time, which proves the restored clock just as well. The journey went from
    20.4 s to 12.6 s locally.
- **Not fixed, because it is a §6.5 decision:** the lane runs at roughly 200–245 s against a 240 s budget,
  so runner variance alone can fail it. That was already true on `main`. The human chooses among raising
  the budget, moving work to nightly, or leaving it as it is.

### D91 — the medium lane's budget is 5 minutes
**Date:** 25 September 2026 · **Status:** accepted (human decision); settles D90's flag

D90 found the medium lane running at about 200–245 s against its 240 s budget, and `main` at 204–215 s
before Phase 3 Slice 3, so runner variance alone could fail it. **The human raised the budget to 5
minutes (300 s).**
- `implementation-plan.md` §6.5 is amended in place, with a dated note.
- The workflow's `timeout`, job and step names, error message and step summary follow.
- The budget is still enforced as a build failure, so a slow test still fails the lane rather than creeping.

The two alternatives were:
- keeping 4 minutes and moving the 100-seed PGlite simulator run to nightly, which would move Phase 2's
  medium-lane evidence (D76);
- leaving the budget as it was.

Slice 4 adds another E2E journey, so the headroom is needed soon either way. There is no branch protection
on `main`, so renaming the "Medium lane (budget 5m)" check breaks no required status.

### D92 — telemetry is two ports, the consent is device-local, and saying yes on the prompt shares that exam
**Date:** 25 September 2026 · **Status:** accepted

Phase 3 Slice 4's client half. *Next, decided* named `TelemetrySink { record, flush }` from §3.3, a persisted
queue and a device-local opt-in. Building them forced these calls.

- **One port became two**, amended into §3.3 in place, as D38, D61 and D85 were.
  - The queue must survive an offline submit, so it lives in IndexedDB. The batch goes out over `fetch`.
    One adapter directory cannot hold both, because adapter directories never import each other.
  - **`TelemetrySink { send(batch) }`** is the network half. `adapters/telemetry` has `httpTelemetrySink`,
    with its own `./telemetry` subpath.
  - **`TelemetryStore`** is the device-local half: the consent (`"unasked" | "on" | "off"`) and the queue.
    It is `dexieTelemetryStore` in production.
  - `record` and `flush` became use cases over the pair: `recordExamTelemetry` and `flushTelemetry`, with
    `telemetryConsent` and `setTelemetryConsent`.
- **The consent is device-local by construction.** No sync collector reads the store and no export carries
  it, exactly like `SyncStateStore`. So consent given in one browser never enrols another (PRD §15).
  `wipeData` and `deleteEverywhere` clear it, back to "unasked" with an empty queue.
- **Dexie schema v2 adds `telemetryQueue: "++id"` and `telemetryMeta: "id"`.**
  - **The migration harness did not exist.** Phase 2's breakdown ticks "`adapters/dexie` … with the
    migration harness (D49/D50)", but `db.ts` had only `version(1)`, and nothing opened an old database.
  - It is built now: each version's `stores()` block is an exported constant. `migration.test.ts` opens a
    database as a v1 build did, with realistic rows in every v1 table, reopens it as `PalierDb`, and asserts
    every row survived and the new store starts empty. With `version(2)` removed, all three cases fail.
- **What is sent, and when.**
  - One event per answered item, pilots included. It is built from the stored run and its rescore, never
    from its attempts (D80).
  - `responseMs` is the answer's `msToConfirm`, rounded and clamped to the wire's bound.
  - `restBucket` is the quintile on the *other* scored items: an unanswered item counts wrong, as in
    `scoreExam`, and a pilot's rest is every scored item (`restBuckets` in the engine).
  - **`submitExam` queues only at the first stamp**, and only while consent is "on". So a replay, or a
    run synced in already submitted, never queues. **A telemetry failure never costs a submission**: the run
    is stored first, and a queue failure is swallowed.
  - Residual: the same run submitted offline on two devices, both sharing, sends twice. This is D80's
    case again, and at pilot scale it moves a proportion by one response.
- **Saying yes on the prompt shares the exam on screen.** That is the exam whose case the prompt makes, and
  it is what lets journey 9 submit offline and then opt in. It happens only when consent was not already
  "on", so an exam queued at submit is not queued twice. Turning sharing on from `/settings/data` shares
  future exams only.
- **"No thanks" is the dismissal.** *Next, decided* asked for "answered either way or dismissed". Both leave
  sharing off, and the prompt never returns either way, so a third control would be the same button twice.
- **Turning sharing off empties the queue.** Nothing waiting is sent after a no.
- **A refused batch is dropped.** *Next, decided* did not anticipate this. The sink turns a network fault,
  429 or 5xx into `TelemetryUnavailableError`, and the batch waits. Any other refusal (400, 413) is
  `TelemetryRejectedError`. Without the second error, one batch an older build wrote and the server now
  refuses would hold up the queue forever. A batch leaves the queue only once the service has answered
  it, so an event can arrive twice, never not at all.
- **Every sync trigger flushes**, at once, single-flight (`lib/single-flight.ts`), silently, and whatever
  `shouldSync` or the sync switch says, since telemetry is not sync.
  - **A found gap:** `ExamRunner` never told the sync runner about a submitted exam, so a submitted exam
    waited for the next focus to sync. It now calls `notify("session-complete")`.
- **The request carries no identity at all**: no `Authorization` header, and `credentials: "omit"`, so not
  even the locale cookie. Journey 9 asserts both.
- **Existing tests touched, and why:**
  - `data-rights.test.ts`'s and `sync-account.test.ts`'s device fixtures gained a telemetry store, because
    `wipeData` and `deleteEverywhere` now take one. No assertion changed, and a new case in each asserts the
    clear.
  - `dexie/index.test.ts`'s "wires all seven ports" became eight, with one more assertion. The shape
    changed on purpose.
  - `routes.test.ts`'s mock of `server/db` gained `telemetryApi`.

### D93 — the telemetry route: Node, its own repository, a date and no identity
**Date:** 25 September 2026 · **Status:** accepted

- **Node, not Edge.** architecture.md §10 lists `POST /api/telemetry` on Edge. D70 and `apps/web/CLAUDE.md`
  put every route on Node, because Next 16 deprecates Edge and the Postgres driver needs Node. §10 is
  amended with a note.
- **The table is `telemetry_events(id, item_id, correct, response_ms, rest_bucket, bank_version,
  received_on)`**, migration `0001`, additive, so safe while the old deployment serves (D78).
  - `rest_bucket` is §9.2's `session_accuracy_bucket`, named for what it is.
  - **`created_at` became `received_on`, a date.** Arrival instants could link one person's events
    together, and the job needs no more than a month.
  - As sketched, it has no account id. It also has no device id and no IP. §9.2 is amended.
- **Its own repository, handler and binding** (`TelemetryRepository`, `createTelemetryApi`,
  `serveTelemetry`).
  - `SyncRepository` can only ever read one account's records, and telemetry has no accounts. The job reads
    every event.
  - Both repositories share one database, which `db.ts` now memoises once. So the hermetic lane never builds
    a second PGlite, and `SyncApi`'s pinned key list in `db.test.ts` is untouched.
  - The rate-limit upsert became `rateLimitHit`, shared by both repositories. The sync handlers' request
    helpers moved to `http.ts` unchanged, with the body cap now a parameter.
- **Limits are operational constants in the handler**, as `RATE_LIMITS` is:
  - a 64 KB body;
  - at most `TELEMETRY_MAX_BATCH` (200) events, the client's own cap, read from `@palier/app` so the two
    cannot drift; more is 413;
  - 120 batches an hour per IP hash. That is generous, because a government office's pilot shares one
    egress address.
- **Validation is the domain's strict schema.** An event carrying an identity is 400 and is never stored.
  A valid batch is 202 with no body.
- **The smoke check** in `docs/deploy.md` posts an empty batch and expects 400, which proves a database is
  configured without adding an event to the statistics.

### D94 — the retirement rules are profile data, one report file, and a retirement takes effect at the next bank build
**Date:** 25 September 2026 · **Status:** accepted

- **The profile gains `itemStatistics`** (ADR 9): `pCorrectMin 0.15`, `pCorrectMax 0.95`,
  `pointBiserialMin 0`, `minResponsesDifficulty 30` and `minResponsesDiscrimination 100`.
  - "A negative point-biserial retires" is written as a floor, retiring **below** it, so it can be retuned.
  - Every threshold is strict: exactly 0.95 right, or a point-biserial of exactly 0, keeps the item.
  - The thresholds are band-independent, because PRD §13.3 gives one pair for every band. "At its target
    band" is read as the item's own proportion; events carry no respondent band to condition on.
  - The schema refuses a floor at or above the ceiling, and trusting a point-biserial on fewer responses than
    a proportion.
  - The profile's `version` stays 1: nothing reads it, and the block is additive.
- **The engine:** `itemStatistics` (a group-by and a point-biserial over whole-number sums, so it is a
  function of the event set to the last bit, D73) and `retirementVerdicts` (minimum counts first). Both are
  at 100% branch, with worked examples at 29/30 and 99/100 responses and at each threshold, and a
  permutation property.
  - A correlation with no variance is `null`, never 0.
  - **`ItemStats.pointBiserial` is therefore `number | null`.** This is a content-schema change, and
    `docs/schemas/item.schema.json` is regenerated. No bank item carries stats yet, so nothing moves.
- **One report file, `content/factory/item-statistics.json`, where *Next, decided* named
  `retirements.json`.** It holds a verdict for every item with events: responses, proportion, point-biserial,
  which checks were trusted, and the reasons. A retirement is a verdict with a reason. The factory needs the
  stats as well as the ids, for the readiness disclosure, and one file keeps them from disagreeing. It is
  parsed by the domain's `itemStatisticsReportSchema` on both sides.
- **The job** (`apps/web/src/server/item-statistics-job.ts`, run by `scripts/item-statistics.mjs`) is
  self-contained like `migrate.ts`, so Node's type stripping runs it with no build step.
  - It reads events through `EVENTS_SQL`, which the Drizzle repository reads through too, so the integration
    lane reads exactly as the job does.
  - It reads the bank through `@palier/adapters/bank` over a file-backed `fetch`, so no second bank loader
    exists.
  - Its bank version is `BANK_VERSION`, read from the composition root as `prepare-public.mjs` reads it.
- **The workflow** (`.github/workflows/item-statistics.yml`) runs monthly and on demand, and opens the report
  as a pull request with `gh`, so no new action is needed.
  - It skips with a notice when `TELEMETRY_DATABASE_URL` is not set. That secret, and allowing Actions to
    open pull requests, are human steps in `docs/deploy.md`.
  - A pull request opened with the workflow token starts no other workflow, so its checks are run by hand.
- **A retirement takes effect at the next bank build.** Nothing wrote `status: "retired"` anywhere.
  - Now `runInputFor` applies the report to the carried bank (`pipeline/carry.ts`): judged items gain
    `stats`, and an item with a reason becomes retired. It stays in the bank for the ids users hold, as
    architecture.md §5.5 requires.
  - The form stage skips a retired item. The test proves it bites: 64 items fill the 60-item form, and with
    5 retired they no longer do.
  - A damaged report stops the build rather than read as "retire nothing".
  - `committed-bank.test.ts` passes `applyItemStatistics: false`, because v2 was built before any report
    existed, and a later report applies to the next version, never to v2. Its assertions are unchanged.
- **"Trusted" means at least `minResponsesDifficulty` responses**: a proportion correct is usable from about
  30. The readiness card says how many of the items behind the practice trend are trusted, over the trend's
  own window (`trendEvidence`). Against today's bank that is "None of the items behind this trend has enough
  recorded answers yet…". The statistics never reweight the trend (ADR 7).
- **Three user reports also retire an item** (PRD §13.3). This stays out, because reports are GitHub issues,
  not data the job reads.

### D95 — Gate E: what the closed pilot runs on
**Date:** 25 September 2026 · **Status:** **resolved 25 September 2026 by D97** (human: a product pilot on the baseline bank, now; paid content stays at 1.0)

Slice 4 leaves Phase 3 with one open exit criterion, the closed pilot (implementation-plan.md §7: "to seed
item statistics and to find out whether the bank holds up in front of real users"). D56 put the
full-volume content run at 1.0, so the bank today is the synthetic baseline (D54). A pilot on it can test
the product, but its item statistics would describe items the content run replaces. D56's revisit clause
names this very case and moves the feature's *validation* to after the content run.

The human chooses:
- **a product pilot on `content/bank/v2`**, with its statistics recorded as indicative only, and the
  calibration half rerun after the content run (the recommendation, because it keeps D56); or
- **the funded content run first**, pulled forward from 1.0, so the pilot calibrates real items.

### D96 — three standing items settled: D89 confirmed, D12 verified, the name is Palier
**Date:** 25 September 2026 · **Status:** accepted (human decisions); D12 verified against the source

- **D89 is confirmed** (the human, on the recommendation). "Add to review queue" starts the same on every
  item of the walkthrough. This departs from D84 ruling 10's wording ("on items not already queued"),
  because keying the button to the queue singled out the wrong pilots, and ruling 9 says pilots are never
  revealed. Nothing changes in code.
- **D12 is verified, and closed.** The human asked for the check to be made, not assumed. Every cut table
  in `content/profiles/psc-sle.json` was compared with the PSC's own pages on 25 September 2026, and all
  four match exactly:

  | Variant | PSC page | Published | Profile |
  | --- | --- | --- | --- |
  | writing, unsupervised | [Unsupervised Test of Written Expression](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service/managers/unsupervised-test-written-expression.html) (modified 2025-04-25) | X 0–10, A 11–16, B 17–23, C 24–30 | the same |
  | reading, unsupervised | [Unsupervised Test of Reading Comprehension](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service/unsupervised-test-reading-comprehension.html) (2025-04-25) | X 0–8, A 9–13, B 14–18, C 19–25 | the same |
  | writing, supervised | [SLE, Test of Written Expression](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service/managers/sle-written.html) (2026-03-06) | X 0–19, A 20–30, B 31–42, C 43–51, E 52–55 | the same |
  | reading, supervised | [SLE, Test of Reading Comprehension](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service/managers/sle-reading.html) (2026-03-06) | X 0–17, A 18–27, B 28–37, C 38–44, E 45–50 | the same |

  The unsupervised writing page states it outright: "An 'X' is the result for those below level 'A' who
  obtain a score of 0 to 10." The inference was right, and it is now transcribed. No number moves, so no
  golden changes. The PRD §5.2 footnote gains a verification note.
  - **Re-check these when the PSC revises its tests.** The two unsupervised pages were last modified on
    25 April 2025 and the two supervised ones on 6 March 2026, and ADR 9 exists because these numbers
    change without notice.
- **The name stays Palier, and the domain will be `palier.dougkeefe.com`** (the human). It replaces §12.1's
  `.ca` shortlist. palier.ca, seuil.ca and niveauc.ca were already registered (WHOIS, 25 September 2026).
  - Pointing the subdomain at the Vercel project is a later human step, "eventually". Nothing in the app
    names its own origin: sync and telemetry are same-origin, and the bank is origin-relative.
  - The trademark and language-school check §12.1 asks for remains the human's, before launch.

### D97 — Gate E: a product pilot now; Phase 4 is four slices, its screens adopted as written, and a funded key when needed
**Date:** 25 September 2026 · **Status:** accepted (human decisions); resolves D95

- **Gate E (D95) is resolved: a product pilot on `content/bank/v2`, now.** The human chose the
  recommendation.
  - The paid content run stays at 1.0, as D56 has it.
  - The pilot tests the product: the exam flow, the results, sync, and whether people opt in. Its item
    statistics describe synthetic items, so they are **indicative only**, and no retirement they suggest
    is merged without that caveat in its review.
  - The calibration half reruns on real items after the content run, which is what D56's revisit clause
    provides.
  - The pilot is a checkpoint, not a blocker (implementation-plan.md §7), so Phase 4 starts beside it.
    Phase 3's last exit criterion is ticked when the pilot is recorded.
- **Phase 4 is planned as four slices**, mirrored in `implementation-plan.md` §7. This is the same scoped
  exception D57 and D79 made: keep the two documents in sync.
  1. **The key, safely.**
     - The tier-11 key-leak test first.
     - `/settings/key` without the spend parts, and onboarding step 5.
     - Validation, do-not-remember mode, the browser `AiProvider` path through `withApiKey`, and graceful
       degradation.
     - This carries exit criterion 1 and the first half of 2.
  2. **Spend.**
     - The cost ledger (the v1 `costLedger` table), pricing as data, and the spend meter (session, week,
       month).
     - The soft cap with its 80% warning, the per-feature cost table, and the pre-flight estimate.
     - It ends at **Gate G**, the billing check against a funded test account (exit criterion 3).
  3. **The writing workshop** (§8.7).
     - The prompt library, and the editor with its word target and timer.
     - `assessWriting` (a new `AiProvider` capability with its DTOs in domain, ADR 20), the inline offsets,
       and the model answer with changes highlighted.
     - Submissions stay on the device, never synced or exported to the server (R12), which needs a new
       local table.
  4. **Runtime item generation and the CI gates.**
     - The compressed draft plus single review, local-only storage, the provenance badge and the one-tap
       contribution.
     - AI schema conformance against recorded fixtures, the nightly live smoke, and the eval harness.
     - This carries the second half of exit criterion 2.

  The order follows risk: nothing that spends a key is built before the test that proves the key cannot
  leak. The spend meter comes before any feature that spends.
- **Gate F is resolved: PRD §8.1 step 5, §8.7 and §8.10 are adopted as written**, as Gates A and D were.
  The calls they leave open are recorded as they are made, as D87 did.
- **Gate G: a funded test key, when needed.** The human will provide one when Slice 2 reaches the billing
  check. Until then, everything is built against recorded fixtures and MSW, as Phase 1 was (D54).

### D98 — do-not-remember mode is a `KeyVault` option, held in the adapter's closure
**Date:** 26 September 2026 · **Status:** accepted; §3.3 amended in place, as D38 and D85 were

architecture.md §6.2 asks for an optional "do not remember" mode, with the key held in memory for the
session only. *Next, decided* left the port shape to this slice.

- **`putApiKey(key, { remember })`**, where `remember` defaults to `true`, so every existing caller is
  unchanged. There is also a new **`apiKeyStorage(): "device" | "tab" | null`**, because the key screen must
  say where the key is held. It answers a word, never the key. There is still no `getApiKey`.
- **A tab-only key lives in the vault adapter's closure and nowhere else.** The composition root builds
  one vault per page load, so the closure belongs to the tab, and a reload forgets the key.
  - Putting a tab-only key **deletes any stored ciphertext** first, so the device never holds a key the
    user asked it not to keep.
  - Putting a remembered key drops the tab copy. `withApiKey` prefers the tab copy, and `clear` forgets
    both.
- **Residual:** two tabs share one IndexedDB. A tab-only key saved in one tab deletes a key the other tab
  had remembered. The other tab then finds no key and says so. This is the honest reading of "don't keep
  it on this device".
- The contract gains four cases. The Dexie adapter adds five of its own:
  - no `api-key` row after a tab-only put;
  - a fresh vault over the same database has no key;
  - a stored key is deleted by a tab-only put;
  - ciphertext is written again when a remembered key replaces a tab-only one;
  - the device secret survives clearing a tab-only key.
- **Existing tests touched:** the local vault stubs in `data-rights.test.ts` and `sync-account.test.ts`
  gained `apiKeyStorage`. This is a shape change only, and no assertion moved.

### D99 — `AiProvider.verifyKey`, a factory made inside `withApiKey`, and a time limit on every call
**Date:** 26 September 2026 · **Status:** accepted; §3.3 amended in place

- **`verifyKey(): Promise<void>` joins the port.** It is `GET /v1/models`: one cheap call that spends no
  tokens and records no usage. It resolves, or throws the adapter's own error.
  - The adapter structure-checks the answer (D55's approach). A 200 without a `data` array, or a body that
    is not JSON (a captive portal), is `InvalidResponseError`.
  - A completion whose 2xx body is not JSON now reads the same way, where it used to escape as a raw
    `SyntaxError`.
- **`AiProviderFactory = (apiKey) => AiProvider`, and `withAiProvider` in `@palier/app`.** The browser makes
  a provider from the key **inside** `KeyVault.withApiKey`, once per call, and drops it when the call
  settles (§3.3, ADR 2).
  - `withAiProvider` is the only caller of the factory, and every AI use case goes through it. Slice 1's
    only such use case is `checkApiKey`.
  - Tests hold two things: the factory runs only while the vault's callback is active, and after
    `removeApiKey` nothing is cached.
  - Both graphs wire the real adapter, as they do the sync transport. The hermetic lane stubs OpenAI with
    `page.route`, never with a fake in the container.
- **Every call has a time limit**, which is operational, not an exam rule, so it is not profile data:
  - `timeoutMs`, default 120 s, for completions (a reasoning model can take minutes);
  - `verifyTimeoutMs`, default 10 s, for the key check.
  - The limit **races** the work, so a `fetch` that ignores the abort still times out. It covers reading
    the body, not just the headers.
  - The result is `ProviderTimeoutError`, **never retried**: a retried generation could bill twice.
- **The key is cut out of an echoed error body** before `ProviderRequestError` carries it. A proxy that
  echoes the request would otherwise put the key in an error's message (tier 11: "never in an error
  object"). A test runs six failure modes with a sentinel key and finds it in no message, stack, cause or
  serialisation.
- **The browser's model ids are data** (`apps/web/src/lib/ai-models.json`, architecture.md §8.1), a copy of
  the factory's. Slice 1 makes no model call; Slice 4 verifies these ids before it uses them.
- **`openAiHandlers`** in `@palier/testing` stand in for the models endpoint in six modes (ok, 401, 429,
  500, malformed, never answers). `container-key.test.ts` runs the key check through the real adapter over
  them. D53 kept the adapter's own tests on an injected `fetch`, and they stay there.
- **Existing code and tests touched:**
  - The factory's `scriptedAiProvider` and `meterProvider` implement `verifyKey`; the meter passes it
    through and accounts nothing. Each has a new test.
  - Three factory test doubles and the adapter's `cannedFetch` gained the method, or a `/models` answer and
    an optional body, because `FetchLike`'s `body` is now optional. No assertion moved.
