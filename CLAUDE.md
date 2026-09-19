# Palier

Palier is a free, open-source web app for practising the Public Service Commission's
Second Language Evaluation — reading, written expression and oral, French first, at level
C. The browser is the system of record (ADR 1): the item bank ships as static JSON, drills
and mock exams need no account and no key, and everything that costs money runs on the
user's own OpenAI key from their own browser (ADR 2). Structurally it is a practice engine
for a banded language exam and the SLE is its first *profile*, so every SLE-specific number
lives in `content/profiles/psc-sle.json` rather than in code (ADR 9).

**Read `docs/progress.md` before anything else** — the status table, then the deviations
log, which is the part you cannot reconstruct from the code. Its working agreement says how
to claim work and how to record what you did. Follow it.

## The eight principles (`implementation-plan.md` §2)

1. **The core is pure.** Scoring, trend, selection and scheduling are deterministic functions over plain data.
2. **Dependencies point inward.** Nothing in the core knows React, Next.js, IndexedDB, OpenAI or HTTP.
3. **Every external thing sits behind a port** we own, with an in-memory implementation for tests.
4. **No vendor type crosses a boundary.** The adapter translates into our types at the edge.
5. **Exam rules are data** — counts, timings, cuts, descriptors, taxonomy — in a versioned profile (ADR 9).
6. **New capability is registration, not modification.** No switch statement gains a case.
7. **One composition root** per app names concrete adapters; everything else is handed what it needs.
8. **Prefer techniques whose parameters we can measure** (ADR 7, ADR 8). A default, not a prohibition.

## The six packages (ADR 10, `implementation-plan.md` §3.2)

| Package | Holds | May import |
| --- | --- | --- |
| `@palier/domain` | Types, branded ids, invariants, Zod schemas for every content artefact, the profile loader | `zod` and nothing else — no workspace package, no `node:*` |
| `@palier/engine` | Selector, Scheduler, Planner, Scorer, BandMapper, TrendCalculator. All pure | `@palier/domain` only. Zero npm, zero Node core |
| `@palier/app` | The port interfaces (§3.3) and the use cases that consume them | `domain`, `engine` |
| `@palier/adapters` | Dexie, bank, OpenAI, sync, vault — one directory and one subpath export each | `app`, `domain`. Never another adapter directory |
| `@palier/ui` | Design tokens, primitives, the item renderers registered by type | `domain`, types only |
| `@palier/testing` | In-memory ports, port contract suites, fixture builders, seeded Random, FakeClock, fixture bank | `app`, `domain` |

`apps/web` may import everything and holds the one composition root; `apps/factory` takes
`domain` and the OpenAI adapter. No package may import anything absent from its own
`package.json` — pnpm's strict isolation and `dependency-cruiser` both enforce that.

## Hard rules

- **Dependencies point inward, and `dependency-cruiser` fails the build on any arrow that does not** (§3.1). Test files may additionally import `@palier/testing`; nothing else is relaxed (D10). Build before you cruise — a workspace import resolves through `dist` (D6).
- **No vendor type crosses a package boundary.** An OpenAI response, a Dexie table, a React node: translate at the adapter edge. `openai`, `dexie`, `next` and `react` are banned outside the packages allowed them.
- **Exam rules live in the profile JSON, never in code** (ADR 9). Item counts, time limits, cut scores, level descriptors, the sub-skill taxonomy, and the four Leitner intervals (ADR 8). Typing a number from `product-requirements.md` §5 into a `.ts` file is the mistake.
- **Before proposing any architectural change, read `docs/adr/`** and check whether the decision is already recorded. If it is, quote its *revisit when* clause and say honestly whether that evidence has appeared. If it has not, drop the proposal.
- **Never edit an accepted ADR — supersede it** with a new one (§4). Same discipline in `progress.md`: append to the session log, never rewrite an entry.
- **No new dependency without stating what it replaces**, or why nothing already present does the job. One that changes the architecture needs an ADR.
- **Every new branch in every package gets a unit test that names the behaviour** (§10) — adapters, route handlers, factory stages and UI logic included, not only the core. A coverage number going up is not a test.
- **Never change a test to make an implementation pass.** If a test is wrong, stop and say which one and why.
- **Golden fixtures are the contract.** Any engine change that moves a golden value is explained in the PR (§5).
- **Named exports only.** The exemption list in the root `eslint.config.mjs` is exhaustive and covers framework file conventions only; adding to it needs a better reason than convenience (D11).
- **`tsconfig.base.json` is the single source of compiler settings.** `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are not relaxed per package.
- **Packages are ESM with `NodeNext`**, so relative imports in `packages/*` and `apps/factory` carry the `.js` extension; `apps/web` alone is on `bundler`. Packages are consumed through their built `dist` via an explicit `exports` map — a new public entry point means a new `exports` entry.
- **Update a package's `CLAUDE.md` in the same PR as any change to its invariants** (§10).

## Where to look

| When you need | Read |
| --- | --- |
| What is built, in flight, or deliberately deviated from the plan | `docs/progress.md` — status, then deviations |
| Why a choice was made, and what evidence would reverse it | `docs/adr/`, 16 records, each with a *revisit when*. Take the next free number |
| Whether something is a requirement or an opinion | `product-requirements.md` §0 and §0.1 (the 14 requirements) |
| Exam variants, item counts, time limits, band cut tables | `product-requirements.md` §5 |
| Screens, states, copy, visual language, accessibility commitments | `product-requirements.md` §8, §10, §11, §14 |
| Content standards: register, sub-skill taxonomy, item quality bar | `product-requirements.md` §13 |
| Module boundaries and the dependency graph | `implementation-plan.md` §3.1–§3.2 |
| A port's signature | `implementation-plan.md` §3.3 |
| Item type registry, profile shape, composition root | `implementation-plan.md` §3.4–§3.5 |
| How a gate is enforced, and what it catches | `implementation-plan.md` §4, `.dependency-cruiser.cjs`, `eslint.config.mjs` |
| Test tiers, coverage targets, CI lanes, what is deliberately untested | `implementation-plan.md` §6 |
| What to build next, and the exit criteria that gate it | `implementation-plan.md` §7 |
| Definition of done for any PR | `implementation-plan.md` §10 |
| Engine algorithms: trend, selection, Leitner, scoring, statistics | `architecture.md` §7 |
| Content model, item and passage schemas, bank build and delivery | `architecture.md` §5 |
| BYOK threat model, and the one server call that sees the key | `architecture.md` §6, ADR 2, ADR 3 |
| Local and cloud data model, identity, pairing, sync protocol | `architecture.md` §9, ADR 4, ADR 5 |
| API routes, performance budgets | `architecture.md` §10, §13 |
| The content pipeline, its metrics, its descoping options | `content-factory.md`, §6 and §9 especially |
| A prompt for the next session, or the shape of a review | `docs/prompts.md` |
| Anything under `apps/web` | `apps/web/AGENTS.md`, maintained by `next dev` |

## Verify

```
pnpm verify        # check-types → lint → boundaries → test, in that order (§4)
```

`&&`-chained rather than a Turborepo task because §4 specifies the order. `check-types`
carries `dependsOn: ["^build"]`, so every `dist` exists before `dependency-cruiser`
resolves imports through it and before Vitest imports it. `apps/web` runs its own
`check-types` (`next typegen && tsc --noEmit`) because it needs the route types Next.js
generates, and so sits outside the root `tsc -b` solution (D2).

`pnpm test` is **one** root Vitest process with nine projects and glob-keyed coverage
thresholds. Never add a `--project` filter to the fast lane: it silently zeroes coverage
and every threshold becomes decorative (D9). The integration project is gated by
`PALIER_INTEGRATION=1` instead.

Also: `pnpm build`, `pnpm dev`, `pnpm check-types`, `pnpm lint`, `pnpm boundaries`,
`pnpm test`, `pnpm verify:medium`, `pnpm exec tsc -b`.

**Nothing merges that does not pass `pnpm verify`.**
