# Palier: Implementation Plan

**Working name:** Palier
**Version:** 0.1 draft
**Date:** 17 September 2026
**Owner:** Doug Keefe
**Companion documents:** product-requirements.md, architecture.md, content-factory.md, adr/
**Status:** For review

---

## 1. What this document does

This is the fourth document in the set and the most disposable one. `product-requirements.md` holds the requirements, `architecture.md` describes how the system works, `content-factory.md` covers the content subsystem, and `adr/` records why each significant choice was made. This document says in what order to build, with what module boundaries, and how to test. It meets reality first and should be expected to change first.

Two things it is authoritative for: the module structure in section 3, and the testing strategy in section 6. Everything else here is sequencing, and sequencing is a preference.

It is organised around a single structural bet: **Palier is a practice engine for a banded language exam, and the PSC SLE is its first exam profile.** Everything specific to the SLE (item counts, time limits, band cut scores, level descriptors, sub-skill taxonomy) lives in data, not in code. That costs almost nothing up front and it is what makes the codebase survive the PSC changing the test, the addition of English as a second language, and anyone forking it for a different exam entirely.

---

## 2. Architectural principles

Eight rules. Everything in section 3 follows from them.

1. **The core is pure.** Scoring, trend calculation, item selection and scheduling are deterministic functions over plain data, with no I/O, no framework, no clock and no randomness that is not injected. This is the part that must be right and it is the part that is cheapest to test.
2. **Dependencies point inward.** UI depends on application services, which depend on the engine and on ports. Nothing in the core knows about React, Next.js, IndexedDB, OpenAI or HTTP. Enforced mechanically, not by discipline.
3. **Every external thing sits behind a port.** The AI provider, the item bank, local storage, the sync transport and the key vault are all interfaces we own. The concrete implementations are interchangeable and there are in-memory versions of all of them for tests.
4. **No vendor type crosses a boundary.** An OpenAI response object never reaches the application layer. The adapter translates into our own types at the edge. This anti-corruption layer is the thing that lets a provider be swapped in a day instead of a month.
5. **Exam rules are data.** Item counts, timings, band cuts, descriptors, sub-skill taxonomy, level definitions: all of it is a versioned profile file validated against a schema. Changing them is a content PR.
6. **New capability is registration, not modification.** Adding an item type means adding a registry entry, never editing a switch statement in the session engine.
7. **One composition root.** Concrete implementations are chosen in exactly one file per application. Everything else receives what it needs.
8. **Prefer techniques whose parameters we can measure.** A method that needs a number estimated from data we do not have gives us its vocabulary and its line count without its benefit. Default to arithmetic a user could check by hand, and defer sophistication until data justifies it. ADR 7 and ADR 8 record what was deferred and what evidence brings it back. This is a default, not a prohibition: a maintainer with the data can supersede it.

---

## 3. Module architecture

### 3.1 The dependency graph

```
                    ┌──────────────────────────────┐
                    │  apps/web  (Next.js, React)  │
                    │  apps/factory (Node CLI)     │
                    └──────────────┬───────────────┘
                                   │ composition root wires these
                                   ▼
        ┌──────────────────────────────────────────────────┐
        │  adapters   /dexie  /bank  /openai  /sync /vault  │
        │  (one package, subpath exports, no cross-imports) │
        └──────────────────────┬───────────────────────────┘
                                  ▼
                        ┌───────────────────┐
                        │        app        │   ports + use cases
                        └─────────┬─────────┘
                                  ▼
                        ┌───────────────────┐
                        │      engine       │   pure algorithms
                        └─────────┬─────────┘
                                  ▼
                        ┌───────────────────┐
                        │      domain       │   types, invariants, profiles
                        └───────────────────┘

        ui  (design system) ──► domain types only, never app or engine
```

The rule in one sentence: an arrow may only point downward on this diagram, and `dependency-cruiser` fails the build on any arrow that does not.

### 3.2 Packages

Six packages. See ADR 10 for the reasoning and for the twelve-package arrangement it supersedes.

| Package | Depends on | Contains | Never contains |
| --- | --- | --- | --- |
| `@palier/domain` | nothing | Item, Passage, Attempt, Band, Skill, SubSkill, ExamForm, OralScenario, ExamProfile. Branded ids, invariants, the Zod schemas for every content artefact, the profile loader | Any I/O, any framework, any async |
| `@palier/engine` | domain | Selector, Scheduler, Planner, Scorer, BandMapper, TrendCalculator. Small enough for one person to hold entirely in their head. All pure, all given Clock and Random as parameters | Storage, network, prompts |
| `@palier/app` | domain, engine | The port interfaces (3.3) and the use cases that consume them: StartSession, AnswerItem, CompleteSession, RunDiagnostic, StartExam, SubmitExam, StartOralSession, ScoreOralSession, GenerateItems, SyncNow, ImportData, ExportData, WipeData | Concrete adapters, React |
| `@palier/adapters` | app, domain | Every adapter, one directory and one subpath export each: `/dexie`, `/bank`, `/openai`, `/sync`, `/vault`. The lint rule forbids cross-imports between them, which is the boundary that was actually wanted | Use case logic |
| `@palier/ui` | domain (types only) | Design tokens, primitives, the item renderers registered by type | Business logic, data fetching |
| `@palier/testing` | app, domain | In-memory implementations of every port, the port contract suites, fixture builders, seeded Random, fake Clock, the canonical fixture bank | |
| `apps/web` | everything | Next.js app, routes, composition root, server routes | Business rules that belong in app |
| `apps/factory` | domain, adapters/openai | The content pipeline as a CLI | |

`@palier/engine` and `@palier/domain` are the two worth publishing to npm, which keeps their boundaries honest because an external consumer would notice a leak.

**A seventh workspace, added 20 September 2026, which is not a seventh package.** `content/` is a pnpm workspace named `@palier/content`: private, no `src`, no build, no tests, no TypeScript project, and no code for anything to import. It publishes the exam profile — and, from phase 2, the bank shards — through an `exports` map, so `apps/web` can import them by package name rather than by a relative path out of its own directory, which §4's `dependency-cruiser` rules reject (`no-relative-escape`). The six packages above are unchanged and it appears in no §3.1 arrow. See ADR 18 and `progress.md` D42.

The engine receives time and randomness as **primitives** — an ISO-8601 `now: string` and a `random: () => number` — not the `Clock` and `Random` port *objects*, which live in `@palier/app`, a package the engine may not import (§3.1). "Given Clock and Random as parameters" (the engine row above) means given those capabilities: the use case that calls an engine function reads `clock.now()` / `random.next` and passes the values down, and no engine type names `Clock`, `Random` or `ISO`. See progress.md deviation D32.

### 3.3 The ports

```ts
// Content
interface ItemRepository {
  byIds(ids: ItemId[]): Promise<Item[]>
  query(c: ItemCriteria): Promise<Item[]>        // skill, subSkill, band, exclude, limit
  passage(id: PassageId): Promise<Passage | null>
  form(id: FormId): Promise<ExamForm | null>
  scenario(id: ScenarioId): Promise<OralScenario | null>
  bankVersion(): Promise<number>
}

// Local persistence, one port per aggregate
interface AttemptStore   { append(a: Attempt): Promise<boolean>; recent(skill: Skill, n: number): Promise<Attempt[]>; since(t: ISO): Promise<Attempt[]>; forItem(id: ItemId): Promise<Attempt[]> }
// `append` returns whether the attempt was newly stored (false = the duplicate-id no-op).
// Amended from `Promise<void>` 21 September 2026: `answerItem` needs the signal to keep its
// Leitner reschedule idempotent on a retry, which `void` could not supply. See progress.md D44.
// no EstimateStore: the trend is derived from recent attempts on demand, so there is
// nothing to persist, nothing to invalidate and nothing to reconcile during sync (ADR 16)
interface ScheduleStore  { due(now: ISO, limit: number): Promise<ScheduleEntry[]>; get(id: ItemId): Promise<ScheduleEntry | null>; put(e: ScheduleEntry): Promise<void> }
// ScheduleEntry = { itemId, due: ISO | null, skill, box }. `get` and the shape were added
// 20 September 2026 with the AnswerItem use case: applying the Leitner rule needs the item's
// CURRENT box, which due/put cannot supply, and `due` is null once an item retires from the
// queue. See progress.md D38, which closes D19.
interface SessionStore   { create(s: Session): Promise<void>; complete(id: SessionId, at: ISO): Promise<Session | null>; latest(): Promise<Session | null> }
// Session = { id, mode: AttemptMode, startedAt: ISO, completedAt: ISO | null }. The
// shape and signature were decided 21 September 2026 with the StartSession/CompleteSession
// use cases: the minimum those two consumers need. `complete` returns null on an unknown
// id (the CompleteSession guard) and is keep-first-write; `latest` is the sole source of
// planDailySession's lastDayCompleted. `mode` is 9.1's `type` column and reuses AttemptMode,
// not the oral sessionType. Checkpointing/resume state is deferred to its consumer, the
// Phase 3 exam runner. See progress.md D45, D46 (D46 closes D36).
interface OralStore      { /* transcripts and audio blobs, local only */ }
interface SettingsStore  { get<T>(k: string): Promise<T|null>; set<T>(k: string, v: T): Promise<void> }

// External services
interface AiProvider {
  // Amended in place 23 September 2026 (progress.md D52, ADR 20). Phase 1 built the
  // factory-facing subset only; the writing/oral/transcribe/voice methods land with
  // their phases (4–5). `generatePassage` was ADDED (§4.2 needs it), and generate*
  // return DRAFTS (the factory assembles the full artefact), not Item[]/Passage[].
  // The request/response DTOs live in @palier/domain, not here (ADR 20).
  capabilities(): AiCapabilities                                   // which of the below are supported
  generatePassage(req: GeneratePassageRequest): Promise<PassageDraft[]>   // Phase 1, added
  generateItems(req: GenerateItemsRequest): Promise<ItemDraft[]>          // draft, not Item[]
  reviewItem(req: ReviewRequest): Promise<ReviewVerdict>
  assessWriting(req: WritingRequest): Promise<WritingAssessment>   // deferred to Phase 4
  assessOral(req: OralRequest): Promise<OralAssessment>            // deferred to Phase 5
  transcribe(audio: Blob, lang: Lang): Promise<Transcript>         // deferred to Phase 5
  openVoiceSession(cfg: VoiceSessionConfig): Promise<VoiceSession>  // may throw Unsupported; deferred to Phase 6
  lastUsage(): UsageRecord | null
}

interface SyncTransport {
  push(docs: SyncDocument[], watermark: ISO): Promise<PushResult>
  pull(watermark: ISO, cursor?: string): Promise<PullResult>
  registerDevice(): Promise<DeviceIdentity>
  requestPairCode(): Promise<{ code: string; expiresAt: ISO }>
  redeemPairCode(code: string): Promise<DeviceIdentity>
  listDevices(): Promise<DeviceSummary[]>
  revokeDevice(id: DeviceId): Promise<void>
  deleteAccount(): Promise<void>
}

interface KeyVault {
  putApiKey(k: string): Promise<void>
  withApiKey<T>(fn: (k: string) => Promise<T>): Promise<T>   // never returns the key
  hasApiKey(): Promise<boolean>
  clear(): Promise<void>
  deviceSecret(): Promise<string>
}

interface TelemetrySink { record(e: TelemetryEvent): void; flush(): Promise<void> }
interface Clock  { now(): ISO }
interface Random { next(): number }
```

Two details worth defending. `KeyVault.withApiKey` hands the key to a callback rather than returning it, so there is no ergonomic way to accidentally store it in a variable that ends up in state, a log, or an error report. `AiProvider.capabilities()` exists so the UI can degrade gracefully when a provider does not support realtime voice, which is exactly what happens the day someone points this at a local model.

### 3.4 One registry and two config files

**Item type registry.** Adding a new item type touches one file plus one renderer and nothing else, and the pieces have to travel together or the type is half-implemented.

Five members, plus the a11y contract, which is counted separately everywhere in this
document because it is asserted by a different suite. Six keys in the literal below.

```ts
registerItemType('cloze', {
  schema: ClozeSchema,                        // zod, used by CI and factory
  render: ClozeRenderer,                      // React component from @palier/ui
  score: (item, response) => Outcome,         // pure
  validate: (item) => ValidationIssue[],      // deterministic quality checks
  generatePrompt: (ctx) => PromptSpec,        // used by the factory
  a11yContract: { role: 'radiogroup', ... }   // asserted by the a11y test suite
})
```

The session engine only ever calls `registry.get(item.type).score(...)`. It has no knowledge of cloze, error identification, or anything added later.

**This literal cannot be built as written; ADR 17 records the fix.** `render` is a React
component from `@palier/ui`, and §3.1 forbids every package below `apps/web` from importing
`@palier/ui`, so a single registry object has nowhere to live. Per ADR 17 the registry is
split by the dependency graph: a React-free `ItemTypeDefinition` (`schema`, `score`,
`validate`, `generatePrompt`, `a11yContract`) in `@palier/domain` — the half CI and
`apps/factory` need — a parallel `itemRenderers` map in `@palier/ui`, and a compile-time
exhaustiveness assertion in the composition root (`apps/web/src/lib/item-types.ts`) that both
cover the same `ItemType` union. It is an exhaustive `Record<ItemType, …>` rather than the
imperative `registerItemType(…)` shown above, because keying on the union makes adding a type
a compile error — a stronger form of principle 6. See `progress.md` deviation D13 (resolved).

**Exam profile, a JSON file.** Loaded and validated at build time (ADR 9).

```jsonc
// content/profiles/psc-sle.json
{
  "id": "psc-sle",
  "skills": ["reading", "writing", "oral"],
  "bands": ["X", "A", "B", "C", "E"],
  "variants": {
    "reading-supervised":   { "items": 60, "scored": 50, "minutes": 90,
                              "cuts": { "X": [0,17], "A": [18,27], "B": [28,37], "C": [38,44], "E": [45,50] } },
    "reading-unsupervised": { "items": 25, "scored": 25, "minutes": 45,
                              "cuts": { "X": [0,8], "A": [9,13], "B": [14,18], "C": [19,25] } },
    "writing-supervised":   { "items": 65, "scored": 55, "minutes": 90,
                              "cuts": { "X": [0,19], "A": [20,30], "B": [31,42], "C": [43,51], "E": [52,55] } },
    "writing-unsupervised": { "items": 30, "scored": 30, "minutes": 45,
                              "cuts": { "A": [11,16], "B": [17,23], "C": [24,30] } }
  },
  "subSkills": { "reading": [...], "writing": [...], "oral": [...] },
  "descriptors": { "oral": { "A": "...", "B": "...", "C": "..." } },
  "oralFormat": { "minutes": [20, 40], "phases": [...] }
}
```

When the PSC changes a cut score, that is a one-line content PR and a regenerated golden fixture. No code changes. The descriptors in this file are also what the oral scoring prompt quotes, so the prompt and the product stay consistent by construction.

**AI provider, a switch on one config value.** `openai` at launch. A swap is cheap because of the port and the anti-corruption layer, not because of registration machinery, so this is a small factory function. `anthropic`, `azure-openai` and `local-openai-compatible` are each a new file implementing `AiProvider`. The last is the path to a version a department could run with no commercial API.

### 3.5 Composition root

`apps/web/lib/container.ts`, the only file that names concrete adapters:

```ts
export function createContainer(env: Env): Container {
  const clock = systemClock()
  const vault = new WebCryptoVault()
  const items = new HttpBankRepository(env.bankUrl, caches)
  const stores = createDexieStores()
  const ai = createAiProvider(env.aiProvider, vault)   // small factory, see 3.4
  const sync = env.syncEnabled ? new HttpSyncTransport(vault) : new NullSyncTransport()
  const profile = parseExamProfileOrThrow(pscSleProfile)   // @palier/content, ADR 18
  return buildUseCases({ clock, random: seededRandom(), items, stores, ai, sync, telemetry, profile })
}
```

Tests build the same graph from `@palier/testing` with in-memory everything, which means a use case test runs in milliseconds with no mocking framework.

Two things about this sketch, both added 20 September 2026 after they caused real trouble.

**`random: seededRandom()` is the *selection* randomness (ADR 7), and it is not an entropy source.** It is a seeded four-line generator whose whole purpose is that a selection is reproducible, and production wires a seeded one deliberately. Nothing may mint an identifier from it: two devices would share an id stream, and because an `AttemptStore` treats a duplicate ULID as a no-op rather than an error, the collision would be silent data loss rather than a crash — which would break the very property that makes sync conflict-free (ADR 16, `architecture.md` §9.4). Identifiers come from Web Crypto, in an adapter. See `progress.md` D39.

**The `ExamProfile` is parsed here and handed down as configuration.** It is not a port and there is no `ProfileRepository` in §3.3: the composition root reads it once, validates it at that boundary, and every use case that needs it receives the same instance. A per-call study parameter — a skill, a target band, a session size — is a request field instead. See `progress.md` D42.

### 3.6 What this buys, concretely

| Future change | Work required |
| --- | --- |
| PSC changes a band cut score | Edit one JSON file, regenerate golden fixtures |
| PSC adds a new item type | One registry entry, one renderer, one scorer, one generator prompt |
| Add English as a second language | Run the content factory with the mirror configuration. No application code |
| Swap OpenAI for Anthropic, or a local model | One new adapter implementing AiProvider, one case in the factory function |
| Replace the trend calculation with a real measurement model, once there is data | Swap one pure function in `engine`, keep the golden fixtures as the regression test |
| Someone forks this for a different exam | New profile JSON, new item types if needed, new bank. The engine, UI and app layer are untouched |
| Move sync to a different backend | One new SyncTransport adapter |
| Drop sync entirely | Set the null transport at the composition root |

---

## 4. Enforcement

Architecture that is not enforced decays in about three months. Five mechanisms, all in CI from day one:

1. **`dependency-cruiser`** with the rules in 3.1 encoded, failing the build on a violation. Also forbids any import of `openai`, `dexie`, `next` or `react` outside the packages allowed to have them.
2. **`eslint-plugin-boundaries`** for intra-package layering.
3. **No default exports** and explicit package `exports` maps, so a package's public surface is declared rather than accidental.
4. **`typescript` project references** with `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Composite builds mean a boundary violation is a compile error.
5. **Architecture tests** in `packages/domain/__tests__/architecture.test.ts`: assert that engine exports are pure (no `Date.now`, no `Math.random`, no `fetch` in the built output), that every item type in the registry has all five members plus its a11y contract, and that every exam profile validates.

Plus a social mechanism that is already in place rather than planned: the `adr/` directory holds eighteen decision records covering everything decided so far. Two working rules for it. An ADR is never edited after it is accepted, only superseded by a later one, so the history of the project's thinking stays readable. And a contributor who disagrees with a decision writes the next ADR rather than arguing with a specification, which keeps disagreement productive and leaves a trail. Numbers are assigned in order of acceptance, so take the next free one rather than a number some earlier note reserved.

Each ADR carries a "revisit when" clause naming the evidence that would justify changing it. That clause is what stops a deferred decision from becoming a permanent prohibition, and it is the first thing to check when something in the architecture feels wrong.

---

## 5. Making the codebase agent-friendly

Most of this will be written by an agentic assistant, and the factory is itself an agent pipeline. That changes what good structure looks like.

- **Every package gets a `CLAUDE.md`** stating its purpose, its allowed dependencies, its invariants, and the three things a contributor most commonly gets wrong in it. An agent reads this before touching the package, and it is the highest-leverage documentation in the repo.
- **Contracts before implementation.** For each unit of work, the types, the zod schema and the test fixtures land first, in their own commit. Then the implementation. This gives the assistant an unambiguous target and it gives you a review artefact that is small enough to actually read.
- **Pure core, generated edges.** Demand hand-reviewed quality on `engine` and `domain`, where a subtle bug is invisible and expensive. Be much more relaxed about adapters and UI, where bugs are visible and cheap.
- **Tests first, and read by you.** An assistant that writes both an implementation and its tests produces a suite that agrees with whatever it implemented, which is the single most dangerous failure mode in this way of working. Two defences. For the pure core, write or closely read the unit tests and properties before the implementation exists, so the assistant has a target rather than a mirror. Everywhere else, review the test names as a list without reading the implementations: if the names do not describe behaviour you recognise and care about, the tests are decorative regardless of what coverage says.
- **Golden fixtures are the contract.** A recorded set of item responses with expected accuracy figures, intervals, schedule states and exam band outcomes. Any change to the engine that moves a golden value has to be explained in the PR. This catches the specific failure mode of an assistant confidently rewriting an algorithm and adjusting the tests to match.
- **Small vertical slices.** One phase is many PRs, each shipping something observable. Avoid the week-long branch.
- **The same gates apply to generated code.** Nothing merges that does not pass typecheck, lint, boundaries, tests, a11y and i18n parity.

---

## 6. Testing strategy

**Unit tests are the foundation and they are the bulk of the suite**, in every package, for every branch, including the boring ones. They are what a maintainer reads in two years to learn what a function is supposed to do, and what names the defect precisely when something breaks. Integration tests are the second non-negotiable: units passing in isolation prove nothing about the seams, and the seams are where this system is most likely to fail.

Four things about this project need testing that ordinary unit and integration tests cannot provide, and the specialised tiers below exist for those and only those.

The **content is mostly machine-drafted**, so the item bank is itself a test subject. Most projects test code against data; this one tests the data too, and separately measures whether the gate that checks the data works at all.

The **AI outputs are nondeterministic**, so they cannot be asserted against and must never gate a build. They need an evaluation harness producing metrics over time rather than a green tick.

**Sync is a distributed system in miniature.** Two devices, an unreliable network and an append-only log is a small problem, but it fails in ways that example-based tests do not find, and its failures cost a user their history.

And a fourth reason that is about you rather than the system: most of this code will be written by an assistant, working fast, on a codebase you will not read line by line. The test suite is what makes that safe. It is not overhead on the build, it is the mechanism that lets the build go quickly.

### 6.1 Tools

| Concern | Tool | Notes |
| --- | --- | --- |
| Unit, integration, benchmarks | Vitest | One runner, workspace mode across packages, `@vitest/coverage-v8` |
| Property-based testing | fast-check | The primary tool for the engine |
| Type-level tests | `expectTypeOf` | Branded ids and profile types are worth asserting |
| Runtime contracts | Zod | The schemas double as test oracles |
| IndexedDB in Node | fake-indexeddb | Lets Dexie adapter tests run in the fast lane |
| HTTP stubbing | MSW | Same handlers in Node and browser, so one set of stubs serves unit and E2E |
| Postgres in tests | PGlite | Embedded Postgres in WASM, starts in milliseconds, no Docker. Real Postgres via Testcontainers nightly |
| Browser E2E | Playwright | Chromium, Firefox, WebKit, plus mobile viewports |
| Accessibility | `@axe-core/playwright` | Asserted on states, not just initial renders |
| Mutation testing | Stryker | `@palier/engine` only |
| Performance | Lighthouse CI, `vitest bench` | Page budgets and engine hot paths |
| Architecture | dependency-cruiser | Already in section 4, and it is a test |
| AI evaluation | A small in-repo harness | Custom rather than a framework, to keep dependencies down |

### 6.2 The tiers

**Tier 0, make it unrepresentable.** Branded id types so an `ItemId` cannot be passed where a `PassageId` belongs. Discriminated unions for item types and session states so an impossible state does not compile. Zod parsing at every boundary, including the bank fetch and every AI response, so unvalidated data never enters the system. Every class of bug removed here is a test nobody has to write.

**Tier 1, unit tests. The foundation, and the largest part of the suite by a wide margin.**

Everything above this tier assumes the units work. A property test tells you an invariant holds across an input space but not what a function is supposed to return for a given input. An integration test tells you a use case works but points at a hundred lines when it fails. A unit test does the thing neither of those does: it states, in a form a maintainer can read in five seconds, what one piece of code is supposed to do, and when it fails it names the defect precisely. That is what makes a codebase maintainable at year two, and it is why this tier is not optional anywhere in the repo.

Scope is every package, not just the pure core:

- `@palier/domain`: every invariant, every value object constructor, every branded id guard, every profile accessor, and the serialisation round-trip for each type.
- `@palier/engine`: every function, every branch, with worked examples at the boundaries. The trend calculator against a hand-worked accuracy and a Wilson interval checked against a reference implementation. The BandMapper at every cut score and one either side of it. The selector with a fixed candidate pool and a seeded Random, asserting the exact item chosen. The scheduler at each grade with a fixed clock, asserting the exact next due date. These are the tests someone reads to understand what the engine does.
- `@palier/app`: every use case against in-memory ports, covering the happy path plus each error path and each guard clause.
- `@palier/adapters`, per adapter directory: everything the port contract suite does not already cover. Query building, pagination, retry and backoff behaviour, watermark arithmetic, error translation from a vendor error into ours, and every schema migration, forward and where applicable backward.
- `@palier/ui`: the logic, not the pixels. Formatters, the band meter's value-to-geometry mapping, the timer's threshold transitions, the option row's keyboard handling, the item type registry lookups.
- `@palier/domain` schemas: each accepts a valid artefact and rejects each specific way of being invalid, one test per rejection reason. These tests are what the content suite's error messages depend on being accurate.
- `apps/factory`: each pipeline stage in isolation with fixed inputs. Register scoring, duplicate detection, key position analysis, the sharding and manifest logic, the yield calculation.
- `apps/web`: route handlers, the composition root wiring, the realtime secret function, input validation on every server route.

**Standards, so that the tests stay readable.**

- One behaviour per test. A test that asserts five things fails for five reasons and tells you none of them.
- The test name states the behaviour, not the function: `returns the lower band when the score sits exactly on a cut` beats `bandMapper works`.
- Arrange, act, assert, with no logic in the assert. No loops, no conditionals, no computing the expected value with the same code under test.
- Fixture builders for setup, so a test shows only what is relevant to it. `anItem({ targetBand: 'C' })`, never a twenty-line object literal.
- Table-driven tests for genuinely tabular logic, such as band cuts across variants, with each row named.
- No shared mutable state between tests. Every test constructs what it needs.
- Error paths are tested as deliberately as happy paths. A guard clause without a test is a guard clause that will be deleted by someone who assumes it is dead code.
- Boundaries get explicit tests: zero items, one item, the exact cut score, an empty queue, a clock at midnight, a passage at the length limit.

**Tier 2, property-based tests.** Complements tier 1 rather than replacing it. Unit tests pin down what the code does at specific, meaningful points; properties cover the space between those points, which is where an algorithm quietly goes wrong on inputs nobody thought to write down. Both are required on the engine. The properties worth asserting:

- *Monotonicity.* Answering an additional item correctly never decreases the ability estimate, and answering incorrectly never increases it.
- *Wilson interval correctness.* Computed intervals match a reference implementation across the full range of proportions and sample sizes, including the degenerate cases of 0 and 100 percent where naive formulas break. This is a closed-form expression, so the test is a comparison, not a simulation.
- *Band mapping is total and monotonic.* Every raw score from 0 to the maximum maps to exactly one band, no gaps, no overlaps, and a higher score never yields a lower band. Run against every variant of every exam profile, which is what catches a typo in a cut score the day someone edits the profile JSON.
- *Selector invariants.* Never returns an excluded item, never one seen inside the 14 day window, never two consecutive items from the same sub-skill, and two users with identical history get different sequences.
- *Scheduler invariants.* A correct answer never shortens the next interval, an incorrect answer always returns the item to box 1, and box 5 never schedules.
- *Exam scoring.* Pilot items never affect the score, the score is always within range, and rescoring the same run is idempotent.
- *Round-trip.* Every domain object survives a JSON round-trip unchanged, which is what makes export, import and sync safe.

Failing seeds are committed as named regression cases, so a property failure becomes a permanent unit test.

**Tier 3, port contract tests.** One shared test suite per port, exported from `@palier/testing`, run against every implementation:

```ts
// packages/testing/src/contracts/attempt-store.contract.ts
export function attemptStoreContract(name: string, make: () => Promise<AttemptStore>) {
  describe(`AttemptStore contract: ${name}`, () => {
    it('returns appended attempts in insertion order', ...)
    it('is idempotent on duplicate ULIDs', ...)
    it('returns nothing for a timestamp in the future', ...)
    it('survives a reopen', ...)
  })
}

// in adapters/dexie
attemptStoreContract('dexie', () => makeDexieStores())
// in testing
attemptStoreContract('memory', () => makeMemoryStores())
```

This tier is what makes the ports architecture real rather than decorative. If the in-memory and Dexie implementations both pass the same suite, they are genuinely substitutable, which is what every test above tier 3 relies on.

**Tier 4, integration tests.** The second non-negotiable tier. Units passing in isolation proves nothing about the seams between them, and the seams are where this system is most likely to break: an adapter that satisfies its contract but serialises a date differently, a migration that works on clean data and not on real data, a use case that calls two stores in an order that leaves state inconsistent when the second one fails.

Use cases wired to real adapters, still in the fast lane:

- Dexie adapters against fake-indexeddb, including migration from schema version N to N+1 with realistic data.
- Sync against PGlite with the real Drizzle schema and the real route handlers. No mocked database.
- Bank adapter against a committed fixture bank of about 60 items, served through MSW.
- OpenAI adapter against MSW with recorded response fixtures, covering the happy path, a malformed response, a rate limit, an invalid key and a timeout.

**Tier 5, deterministic simulation for sync.** Sync is a small distributed system, and small distributed systems fail in ways that unit tests do not find. A simulator runs two or three virtual devices against a PGlite backend with a controllable network: configurable latency, dropped requests, reordering, and full partitions, all driven by a seeded scheduler.

The assertions are convergence properties. After the partition heals, every device holds the same attempt set. Every device computes the same ability estimate from that set. No attempt is lost. No attempt is duplicated. A device that was offline for a week and then syncs does not overwrite newer work from another device.

Run a few hundred seeds per CI run and a few hundred thousand nightly. Any failing seed is committed as a regression case with a one-line reproduction. This is a day of work in phase 2 and it is the difference between a sync bug being found by you and being found by someone who loses a month of study history.

**Tier 6, end-to-end.** Playwright against a hermetic build. The composition root reads an environment flag and wires stub adapters, so E2E runs with a fixture bank, a stubbed AI provider and a PGlite-backed sync service. No network, no API key, no flake from a third party.

Journeys covered, and this list is deliberately short because E2E is expensive:

1. Onboarding through diagnostic to a first band estimate.
2. A daily session end to end, including the feedback panel and the streak increment.
3. A full exam, interrupted by a page reload at the halfway point, resumed with the clock correct, submitted and scored.
4. The review queue emptying and the empty state appearing.
5. Adding, validating and wiping an API key.
6. Export to JSON, wipe everything, import, and confirm the state matches.
7. Going offline mid-session, completing the session, coming back online, and confirming sync catches up.
8. Two browser contexts as two devices, confirming progress converges.

**Tier 7, accessibility.** axe assertions on every route and, more importantly, on every *state*: the feedback panel open, the exam navigator drawer open, a dialog focused, the oral session running. Initial-render-only accessibility testing is the common mistake and it misses almost everything that matters.

Alongside axe: keyboard-only traversal of the three core flows with explicit focus-order assertions, a test that focus lands on the feedback panel heading after answering and returns to the next item on advance, a reduced-motion run asserting no information is lost, and a unit test that computes contrast ratios over the token set in both themes and fails below 4.5:1 for text and 3:1 for UI. Manual VoiceOver and NVDA passes are a release checklist item, not a CI gate.

**Tier 8, internationalisation.** Key parity between locale files, a lint rule banning string literals in JSX, ICU message syntax validation, and a pseudo-locale render at 1.4 times expansion to catch truncation before a French speaker does. Plus an assertion that content in the non-interface language carries the correct `lang` attribute, which matters for screen reader pronunciation and is easy to regress.

**Tier 9, content tests.** The item bank runs through a validation suite on every content PR. With most items machine-drafted, this is the closest thing the bank has to a test suite of its own:

- Schema conformance on every item, passage, form and scenario.
- Every distractor has a rationale, in both locales. Every item has an explanation, in both locales.
- Every `subSkill` exists in the profile taxonomy, and every profile taxonomy entry has at least a minimum number of items, so a sub-skill the dashboard reports on is never empty.
- Key position distribution across the bank tested against uniform with a chi-square. A bank where the answer is C forty percent of the time teaches test-taking, not French.
- Near-duplicate detection by normalised stem hash and by embedding similarity.
- Reading level within tolerance for the tagged band.
- Every exam form resolves all its item ids and matches its variant's counts exactly.
- Provenance present: every derived passage has a source URL, retrieval date and licence determination.

**Tier 10, AI evaluation.** Nondeterministic, so it never gates a build. A nightly harness producing tracked metrics:

- *Schema conformance rate* across N runs per call type. Should sit at essentially 100 percent; a drop means a model change broke a prompt.
- *Review gate accuracy,* which is the most valuable eval in the project. Maintain a seeded set of deliberately broken items: two defensible keys, a rationale that does not match its option, France-specific register, a mis-tagged band, an answer leaked in the stem. Feed them through stage 4 and measure the detection rate per defect class. The review gate is what stands in for a human editor, so an unmeasured review gate means an unguarded bank. Target above 90 percent detection per class, alert below 80.
- *Scoring stability.* Score the same oral transcript five times and assert the band varies by at most one and the per-criterion judgements largely agree. An unstable scorer is worse than a slightly wrong one, because users compare sessions.
- *Writing feedback regression* against a held-out set with known defects.
- *Cost per accepted item* and *stage 4 yield,* tracked per batch, since a sudden yield change is the earliest signal that a model or prompt revision has gone wrong.

Metrics land in a committed JSON file so the trend is visible in git history. Threshold breaches open an issue rather than failing a build.

**Tier 11, security tests.** These have teeth:

- *The key-leak test.* A test build instruments `fetch`, `XMLHttpRequest`, `WebSocket`, `localStorage`, `sessionStorage` and the sync payload builder. Run the entire E2E suite with a known sentinel key. Assert the sentinel never appears in any request to any origin other than `api.openai.com`, never in any storage other than the encrypted vault record, never in a synced document, and never in an error object. This is a single test and it is the most important one in the repo.
- Sync authorisation: every route rejects a missing or revoked device secret, and a request for another account's documents returns not-found rather than forbidden.
- CSP validation against the built output, asserting no inline script and no unexpected `connect-src` entry.
- The realtime secret route: assert it holds no state, writes no log line containing the key, and that its response contains only the ephemeral token and expiry.
- Dependency audit as a gate.

**Tier 12, performance.** Lighthouse CI against the budgets in architecture spec section 13, bundle size limits per route, and `vitest bench` on the selector and trend calculator so a rewrite that is a hundred times slower is caught at the PR rather than on a user's phone.

**Mutation testing.** Optional, and honestly borderline now. Stryker on `@palier/engine` weekly, as a one-off check that the unit tests assert rather than merely execute. It mattered more when the engine was large and statistical; against a small engine with exhaustive boundary tests it is a confirmation rather than a necessity. Run it once at the end of phase 2, act on what it finds, and drop it from the schedule if it finds nothing. Do not let it become a ritual.

### 6.3 Coverage targets

| Package | Target | Measured by |
| --- | --- | --- |
| `@palier/domain` | 100% branch | Unit |
| `@palier/engine` | 100% branch | Unit with worked examples at every boundary, plus properties |
| `@palier/app` | 95% branch | Unit against in-memory ports, plus integration |
| `@palier/domain` schemas | 100% branch | Unit, one test per rejection reason |
| `@palier/adapters` | 90% branch | Unit, plus the port contract suite, plus integration |
| `apps/factory` stages | 90% branch | Unit per stage with fixed inputs |
| `apps/web` route handlers | 95% branch | Unit plus integration |
| `@palier/ui` logic | 90% branch | Unit on formatters, state and keyboard handling |
| `@palier/ui` rendering | No line target | E2E plus accessibility assertions |
| Content | 100% of items validated | Content suite |

Coverage thresholds are enforced per package in the Vitest config and a drop fails the build, so coverage cannot erode quietly one PR at a time.

Two notes on the numbers. The single "no line target" entry is deliberate: chasing line coverage on rendering produces tests that assert a component rendered, which is worth nothing and costs maintenance. Everything else carries a real threshold, including adapters, where the port contract suite proves substitutability but does not exercise retry logic, error translation or migrations, all of which need their own unit tests.

And coverage is a floor, not a goal. A hundred percent branch coverage with weak assertions is worse than ninety percent with sharp ones, because it looks safe. That is what the one-off mutation check is for, and it is why the definition of done asks for a test per new branch rather than for a number to go up.

### 6.4 Test data

- **Fixture builders** in `@palier/testing` with sensible defaults and overrides: `anItem({ targetBand: 'C', subSkill: 'subjunctive' })`. No hand-written object literals scattered through tests.
- **A canonical fixture bank** of about 60 items committed to the repo, so tests never depend on the real bank and a content change cannot break the application suite.
- **Seeded Random and FakeClock** everywhere. No test reads the system clock or calls `Math.random`.
- **Recorded AI fixtures** per call type, refreshed deliberately rather than automatically, so a model change is a visible diff.

### 6.5 CI lanes and budget

A PR suite that takes fifteen minutes stops being run. Three lanes:

| Lane | Contents | Budget | When |
| --- | --- | --- | --- |
| Fast | Typecheck, lint, dependency-cruiser, **the full unit suite across every package with coverage thresholds**, property (reduced runs), contract, content, i18n parity, contrast | Under 90 seconds | Every push |
| Medium | Integration with PGlite and fake-indexeddb, sync simulation with a few hundred seeds, E2E on Chromium, axe, bundle size | Under 4 minutes | Every PR |
| Nightly | Full property runs, sync simulation at scale, E2E on Firefox and WebKit and mobile viewports, Lighthouse, AI evals, Testcontainers against real Postgres, dependency audit | Unbounded | Nightly, opens issues |
| One-off | Mutation testing on engine, at the end of phase 2 and after any engine rewrite | Unbounded | On demand |

**Flake policy: zero tolerance.** No retries in the fast or medium lanes, because everything in them is deterministic by construction and a flake means a real bug. A flaky test is quarantined with an issue the same day, not left to erode trust in the suite.

### 6.6 What is not tested, and why

Being explicit about this is part of the strategy.

- **Realtime voice end to end.** It cannot be meaningfully faked and testing against the live API is slow, costly and nondeterministic. Covered instead by contract tests on the session state machine with a fake transport, plus a manual per-release checklist covering mic permission, phase transitions, disconnection recovery and cost accounting.
- **Actual item quality.** No automated test can tell you an item is a good item. That is what the stage 4 review gate, the 5 percent sample, the review-gate eval and post-launch calibration are for.
- **Whether the band estimate predicts a real SLE result.** Unknowable without data we will never have. The product's answer is to show a confidence range and never to promise.
- **Visual regression.** Deliberately skipped. Screenshot suites on a design that is still moving produce noise, not signal. Revisit after 1.0 if the UI stabilises.

---

## 7. Phases

Nine phases. Each has a goal, entry criteria, a work breakdown, exit criteria, the CI gates it adds, and what it deliberately does not build. Estimates assume evenings and weekends, one person with an agentic assistant.

The sequencing is risk-driven rather than value-driven. The two things that can kill this project are item quality and the cost and complexity of realtime voice, so the first is proven in month one and the second is deferred until the product already works without it.

**Sequencing note, 20 September 2026.** The pure `@palier/engine` core (the Scorer, TrendCalculator, Scheduler, Selector and Planner listed under Phase 2) is being built ahead of Phase 1, in small slices. It is content-agnostic — it runs against the 60-item fixture bank whatever Phase 1 concludes about real content — so building it early does not undercut the risk-driven ordering, and Phase 1's actual go/no-go (a human register read plus the OpenAI pipeline) cannot be started autonomously anyway. Phase 2's "engine unit tests exhaustive at every boundary, golden fixtures locked" exit criterion is therefore satisfied incrementally, starting now. This is a sequencing change, which §1 says to expect; the module structure (§3) and the eight principles are untouched. See progress.md and its session log.

---

### Phase 0: Foundations and contracts
**2 to 3 weeks. Goal: an empty application that already enforces every rule.**

**Work breakdown**

- Monorepo with pnpm workspaces and Turborepo. TypeScript project references, strict everywhere.
- All six packages created with their public surface declared and their `CLAUDE.md` written, most of them empty.
- `@palier/domain`: the full type set, branded ids, the Zod schemas for every content artefact with JSON Schema generated to `docs/schemas/`, the ExamProfile loader, and the `psc-sle` profile transcribed from the requirements document section 5.
- `@palier/app`: every port interface from 3.3, with no implementations behind them yet.
- `@palier/testing`: in-memory implementations of every port, a fake Clock, a seeded Random, fixture builders.
- `@palier/ui`: design tokens as CSS custom properties, light and dark, and six primitives (Button, Card, OptionRow, ProgressRail, Callout, EmptyState).
- `apps/web`: Next.js skeleton, locale-prefixed routing, next-intl wired, layout shell, the composition root with null adapters.
- **Test infrastructure, built now rather than retrofitted.** Vitest workspace across all packages, fast-check, MSW handlers shared between Node and browser, PGlite harness, Playwright with the hermetic composition root flag, fake-indexeddb, `@axe-core/playwright`, coverage reporting per package with the targets from 6.3 enforced.
- `@palier/testing` populated properly: in-memory implementations of every port, the port contract suites as exported functions, fixture builders, seeded Random, FakeClock, and the 60 item canonical fixture bank.
- The three CI lanes from 6.5 wired with their time budgets, and the budgets enforced so a slow test is a build failure rather than a slow creep.
- CI gates: typecheck, lint, dependency-cruiser, unit tests, contrast validation on the token set, i18n key parity, axe on the shell, Lighthouse budget, bundle size.
- `adr/` committed as written, with a short `adr/README.md` covering the format and the never-edit-only-supersede rule.
- `LICENSE` (MIT), `LICENSE-CONTENT` (CC BY 4.0) and a `README` that states the non-affiliation position from day one, since the repository is public from the first commit and R5 applies to it too.

**Exit criteria**

- `pnpm build && pnpm test && pnpm lint` green with every gate active.
- A deliberate boundary violation, committed on a scratch branch, fails CI. Verify this rather than assume it.
- The `psc-sle` profile validates, and the band mapping property test (total and monotonic over every variant) passes.
- The port contract suites exist and pass against the in-memory implementations, so that phase 2's adapters have a target to satisfy on day one.
- The fast lane runs in under 90 seconds on an empty codebase, which is the baseline you protect for the rest of the project.

**Not built:** anything a user can see beyond a shell.

---

### Phase 1: The content factory
**3 to 4 weeks. Goal: find out whether a generated bank can be good enough, before building a product on top of it.**

This is a separate subsystem with its own specification. `content-factory.md` holds the pipeline, the assumptions, the metrics and the descoping options; this section is the schedule and the decision points only. Do not duplicate its contents here, because two copies of a pipeline description will diverge.

**Phase 1 is fully automated — no human in the quality loop at this stage (ADR 19).** The bank is machine-generated from public GC sources (ADR 6; `content-factory.md` §4.1–§4.2 harvest public material and rewrite it into original passages that quote nothing), and it is gated by automation alone: cross-family adversarial review (§4.4) plus deterministic validation (§4.5). The week-one two-reader assumption test and the 5% human sample are dropped; the trade-off and its risk are recorded in ADR 19, and the one human register check that remains is the Phase 7 pre-1.0 gate "both languages reviewed by a human" ([R8]). The licence and originality rules are non-negotiable and unchanged: §4.1 rejects unclear licences, §4.2 quotes nothing, and R6 forbids reproducing real PSC items.

**Build the pipeline, then run a small batch end to end.**

- **`adapters/openai`** (resequenced from Phase 4 into this phase, because the factory needs it before anything can run): the `AiProvider` implementation, model configuration as data, structured outputs with client-side re-validation, retry, and the anti-corruption translation layer.
- **The five-stage pipeline as a CLI in `apps/factory`** (§4): harvest public GC sources with a licence determination per source; passage construction (original, band-tagged, nothing quoted); item drafting through the item type registry's prompt spec; cross-family adversarial review blind to the key; deterministic validation; bank build into content-hashed shards. The content test suite runs on every content pull request from the first batch, not bolted on later.
- **The review-gate evaluation set, built before stage 4 is trusted** (§6): 40–60 items carrying deliberate defects across five classes, authored *programmatically as test fixtures* (a broken item is a fixture, not expert bank content, so this stays compatible with an automated phase). It is the only direct measurement of whether the gate works.
- **Run a small sample batch (tens of items) through the whole pipeline**, committed with its metrics, to prove the system end to end. The full-volume paid run to 500–700 items is a deferred follow-on, gated on this small run passing and on a funded key (ADR 2).

**Exit criteria (automated; ADR 19). This is still a real go/no-go.**

- The pipeline runs end to end and produces a **committed small sample batch** from public GC sources — every item schema-valid, `validate()`-clean, and licence-cleared at harvest.
- **Review-gate detection at or above 90 percent in every defect class** on the evaluation set. This is the phase bar (the ongoing operational threshold afterwards is 80 percent). It is the direct measurement that stands in for the human read.
- Stage 4 yield between 45 and 75 percent on the sample. Higher suggests the gate is too soft; lower suggests the drafting prompt is wrong.
- Deterministic validation and **bank build reproducibility** green in CI (byte-identical rebuild).
- Cost per accepted item measured on the sample run and extrapolated to volume.

**Deferred follow-on (not a Phase 1 exit criterion):** the full-volume run to 500–700 published items across reading and written expression at bands B and C, matching the volume table in `content-factory.md` §2, once the small run passes and a funded key is available.

**If the exit criteria fail**, work down the descoping list in `content-factory.md` section 9 rather than improvising. Option 5 on that list, abandoning the factory and shipping the application with a small curated bank, is a legitimate outcome rather than a failure, and the architecture keeps it available.

**CI gates added:** content schema validation, duplicate detection, bank build reproducibility, and review-gate detection on the evaluation set.

**Not built:** anything in the browser. The factory is a CLI, and it stays one.

---

### Phase 2: Practice MVP
**3 to 4 weeks. Goal: ship something publicly useful.**

**Work breakdown**

- `@palier/engine`: TrendCalculator (accuracy per band tag plus Wilson interval), Selector (filter and weighted shuffle), Scheduler (Leitner boxes), Planner, Scorer, BandMapper. Kept small enough that exhaustive unit testing with worked examples at every boundary is achievable. If it stops being that small, that is a signal to revisit, not to lower the testing bar.
- `adapters/dexie`: the store ports, schema version 1, migration harness.
- `adapters/bank`: manifest fetch, lazy shard loading, service worker cache keyed by content hash.
- `adapters/vault` and `adapters/sync`: device secret, anonymous registration, pairing by code, push and pull, watermarks, retry, offline queue. **Decide how a `ScheduleEntry` merges**, which the general last-write-wins rule does not cover: it has no `updatedAt`, and a naive merge can regress an item's Leitner box (`architecture.md` §9.1, `progress.md` D43).
- Sync backend: Postgres schema, Drizzle, the sync and device routes from architecture spec section 10, deferred account creation, pairing by code, rate limiting on device registration. No auth library, no email, no OAuth (ADR 5).
- `@palier/app`: StartSession, AnswerItem, CompleteSession, RunDiagnostic, SyncNow, ExportData, ImportData, WipeData.
- UI: onboarding, home with the readiness card (last exam result plus practice trend, kept visually distinct), today's plan, the drill session with the feedback panel, review queue, progress, settings for sync and data including the pairing flow and the plain sentence about no recovery.
- Item reporting control and the GitHub issue path.
- **The sync simulator** (tier 5). A day of work, built with the sync adapter rather than after it. Two and three device scenarios, seeded network faults, convergence assertions.
- Port contract suites satisfied by every real adapter written in this phase.

**Exit criteria**

- A user can arrive, run a diagnostic, see accuracy per band tag with its interval, and do a daily session on two devices paired by code, with progress following them. [R1, R4, R10, R14]
- Full offline operation after first load. [R4]
- Engine unit tests exhaustive at every boundary, golden fixtures locked.
- The sync simulator passes several hundred seeds, including full partition and heal, with no lost or duplicated attempts and the same trend figures computed on every device.
- Every adapter passes its port contract suite, in-memory and real implementations alike.
- axe clean and keyboard-complete on onboarding, drill and review, asserted on states rather than initial render. [R9]
- Lighthouse performance and accessibility both 95 or above.
- Deployed publicly and shared with a handful of people.

**CI gates added:** engine golden regression, port contract suites, sync simulation in the medium lane, integration against PGlite, E2E journeys 1, 2, 6, 7 and 8. Run the one-off mutation check at the end of this phase.

**Not built:** exams, API keys, oral, any AI at runtime.

---

### Phase 3: Exams and item statistics
**2 weeks. Goal: the product gains the number users actually came for.**

The mock exam is where the band letter comes from, because it is the only path with no modelling in it (ADR 7). That makes this phase the one that turns a practice tool into an exam preparation tool.

**Work breakdown**

- Exam runner driven entirely by the profile variants: item navigator, flagging, timer with the amber and red thresholds, checkpointing and resume with the clock preserved, pilot item handling.
- Results screen: band, raw score against the cut points, per-sub-skill breakdown, near-miss computed from actual cuts, confidence calibration, full review walkthrough.
- Form generation in the factory: fixed, immutable, versioned forms per variant.
- Telemetry opt-in, the post-exam prompt, the `/api/telemetry` route, the client batching.
- The item statistics job: proportion correct and point-biserial per item from accumulated telemetry, minimum response counts enforced, a PR retiring items that trip the rules. A group-by and a correlation, not a model fit.
- Minimum response counts before an item's statistics are trusted, and the readiness card language that discloses what the trend rests on.

**Exit criteria**

- All four exam variants runnable and correctly scored against the published cuts, asserted by a golden fixture per variant covering every band boundary including the exact cut scores on both sides. [R3]
- A full 90 minute exam survives a browser reload and a network drop (E2E journey 3).
- The statistics job runs end to end on synthetic data: an item seeded with a known proportion correct and a deliberately reversed key is correctly flagged and retired.
- Scoring is idempotent: rescoring a stored run produces an identical result.

**Decision gate:** run the closed pilot here, 20 to 30 people, to seed item statistics and to find out whether the bank holds up in front of real users. Nothing a user sees depends on those statistics, so a thin pilot slows down bad-item retirement rather than breaking the product. That is the practical consequence of ADR 7 and it is why this gate is a checkpoint rather than a blocker.

**Not built:** anything requiring a key.

---

### Phase 4: BYOK, generation and the writing workshop
**2 weeks. Goal: turn on the parts that cost money, safely.**

**Work breakdown**

- Key vault: Web Crypto encryption, the `withApiKey` callback discipline, validation call, do-not-remember mode. **The storage half landed early, in Phase 2** (`@palier/adapters/dexie`, `progress.md` D50): AES-GCM at rest under a non-extractable `CryptoKey` (§6.2 as written), the callback discipline, and the key-leak assertion in the contract suite. Phase 4 adds what needs a live key — the validation call, do-not-remember mode, and the E2E-level leak test below.
- `adapters/openai`: AiProvider implementation, model configuration as data, structured outputs with client-side re-validation, retry policy, the anti-corruption translation layer. **Built earlier, in Phase 1** (the content factory needs it to run; §7 Phase 1, ADR 19). Phase 4 extends it with the runtime item-generation, writing-feedback and (Phase 5) oral capabilities and the BYOK key path, but the core provider + translation layer already exist.
- Cost ledger: usage capture, pricing config, the spend meter, per-feature estimates, the pre-flight threshold warning.
- Runtime item generation: the compressed draft plus single review path, local-only storage, the provenance badge, the one-tap contribution.
- Writing workshop: prompt library, editor with word target and timer, `assessWriting` with inline offsets, model answer with highlighted changes.
- Settings for the key, with the plain statement of what happens to it.

**Exit criteria**

- **The key-leak test passes** (tier 11), running the full E2E suite with a sentinel key and asserting it never reaches any origin but OpenAI, any storage but the encrypted vault, any synced document, or any error object. Write this test before the key vault, not after. (The unit-level half — no method but the callback returns the key, and what sits at rest is ciphertext — already runs in the KeyVault contract suite from Phase 2; this criterion is the E2E-level assertion across the whole app.)
- Every AI response is schema-validated before use, with adapter tests covering malformed output, rate limit, invalid key and timeout, each degrading gracefully.
- The spend meter matches actual OpenAI billing within a few percent on a test account.

**CI gates added:** AI schema conformance against recorded fixtures, the key-leak test, nightly live smoke suite, the AI eval harness reporting schema conformance rate.

**Not built:** anything voice.

---

### Phase 5: Oral, practice mode
**2 to 3 weeks. Goal: oral rehearsal at a cost anyone can afford.**

Practice mode first, deliberately. It delivers most of the learning value, it is a tenth of the cost, it works on a weak connection, and it forces the post-session report to be built before the realtime complexity arrives.

**Work breakdown**

- Oral scenarios from the factory: the five session types, phases, seed questions, escalation and de-escalation paths.
- Turn-based session loop: question with text and TTS, record, transcribe, next question, phase advance driven by the client.
- Local storage of transcript and audio, retention policy, the cleanup flow, quota handling.
- `assessOral`: per-criterion bands with quoted evidence, three ranked fixes mapped to sub-skills, missing vocabulary in context, marked-up transcript.
- Client-side fluency metrics from timings: words per minute, filler count, mean pause.
- The loop back into the scheduler, so the three fixes become tomorrow's drill items.
- Mic permission handling and recovery, typed-answer fallback.

**Exit criteria**

- A 10 minute session produces a report a user would act on.
- Cost per session measured and displayed accurately.
- Audio never leaves the device unless the user opts into the pronunciation criterion, and that opt-in is explicit each time. Asserted by extending the key-leak test's instrumentation to audio blobs.
- **Scoring stability eval passes:** the same transcript scored five times varies by at most one band, with per-criterion agreement above the threshold. An unstable scorer undermines the whole feature, because users compare one session to the next.
- The session state machine is contract-tested against a fake transport, so phase 6 inherits a tested machine and only has to add real WebRTC underneath it.

**Not built:** realtime voice.

---

### Phase 6: Oral, studio mode
**2 weeks. Goal: the feature people tell their colleagues about.**

**Decision gate before starting.** If phase 5's reports are landing well and measured cost for realtime is high, the honest answer may be to ship 1.0 without studio mode and add it later. Make that call on evidence.

**Work breakdown**

- `/api/realtime/secret` edge function: stateless, no logging, single use, small enough to review line by line, and reviewed that way.
- The self-hosted token endpoint option, plus the one-file Worker and function in the repo.
- WebRTC session lifecycle: connect, tracks, data channel, reconnection, clean teardown, the 25 minute hard cap.
- Client-driven phase transitions over the data channel.
- The examiner session instructions, the two tools (`note_observation`, `flag_difficulty`), input transcription.
- Parallel local recording with MediaRecorder.
- The oral studio visual: the canvas voice form, the phase indicator, the repeat control, the reduced-motion fallback.
- Pre-flight cost estimate and the session cost display.

**Exit criteria**

- Session establishes in under 2.5 seconds from tap to first word.
- Disconnection mid-session recovers or fails cleanly with the transcript preserved.
- The manual realtime checklist from architecture spec section 14 passes on Chrome, Safari and Firefox, desktop and mobile.

---

### Phase 7: Polish and hardening
**2 to 3 weeks. Goal: 1.0.**

**Work breakdown**

- Device list and revocation UI, and the pairing flow polished. No claim flow in v1 (ADR 5); revisit only if users report losing progress.
- Retention job for inactive accounts, the storage alerts, the aggregation path.
- PDF progress summary, JSON export and import round-trip.
- The motion and illustration pass: Coco, the milestone moments, the streak, the band meter fill.
- Accessibility audit with VoiceOver and NVDA on all core flows, plus a pass by someone who actually uses a screen reader if you can arrange it.
- Security review: CSP tightening, Trusted Types, dependency audit, `SECURITY.md`, a deliberate attempt to get the key to leak.
- The library: MDX reference articles on the grammar and register points the sub-skill taxonomy names, linked from item explanations. Deferred this far on purpose, since the explanations carry most of the teaching and the library is only worth writing once the sub-skills have real data behind them.
- Observability: the client diagnostic bundle, the pre-filled issue path, the decision to run no error reporting service, and the realtime route excluded from Vercel logging. Verify that exclusion rather than assume it.
- Content: the about page, the non-affiliation statement in both languages, the privacy notice, the contribution guide with the originality attestation, the PR template.
- Full French review of every interface string by a fluent speaker. An English-first bilingual tool for this audience gets one chance at this.

**Exit criteria**

- Every gate green, no known accessibility defects, no known security defects, both languages reviewed by a human.
- Repo public, licences in place, contribution path documented and tested by having someone else submit an item.

---

### Phase 8: English as a second language
**Ongoing after 1.0. Goal: prove the architecture.**

Re-run the factory with the mirror configuration. If this requires application code changes, something in phases 0 through 7 was built wrong, and finding that out is part of the point. Budget two weeks for the factory run and the content review, and treat any code change as a defect to be understood rather than an expected cost.

---

## 8. Requirement coverage

Which phase satisfies which requirement from `product-requirements.md` section 0.1. This is the check that the sequencing actually delivers the product rather than an interesting codebase, and it is what to re-derive if the phases get reordered.

| # | Requirement | Satisfied by | Verified by |
| --- | --- | --- | --- |
| R1 | Practises all three tested skills | 2 (reading, writing), 5 and 6 (oral) | E2E journeys 1, 2; manual oral checklist |
| R2 | Format and register match the real tests | 1 | Register read by fluent speakers; item report rate |
| R3 | Mock exams mirror published structure and cuts | 3 | Golden fixture per variant at every cut boundary |
| R4 | Works with no key and offline after first load | 2 | E2E journey 7 with the network disabled; hermetic build has no key |
| R5 | Never presents as official | 0 (repo and shell), 7 (full copy pass) | Manual review; present in the layout shell from phase 0 |
| R6 | No real test items, no PSC reproduction | 1 | Originality attestation in the PR template; provenance on every passage |
| R7 | Rationale per option, explanation per item | 1 | Content test suite, fails the build on a missing rationale |
| R8 | Fully bilingual, equal prominence | 0 (gate), 1 (content), 7 (human review) | Locale parity check; French review before 1.0 |
| R9 | WCAG 2.2 AA | 0 (gate), every phase after | axe on states in CI; manual screen reader passes at 7 |
| R10 | No estimate without evidence and uncertainty | 2 | Unit tests on the minimum-evidence threshold; design review of the readiness card |
| R11 | Export, import, delete, each in one action | 2 (export and import), 7 (delete everywhere) | E2E journey 6 round-trip |
| R12 | Key, audio, transcripts and submissions stay local | 4 (key), 5 (audio) | The key-leak test, extended to audio blobs in phase 5 |
| R13 | Free and open source | 0 (licences committed), 7 (repo public) | Licence files present from the first commit |
| R14 | Progress across devices, with an off switch | 2 | E2E journey 8; sync simulator; the settings switch tested |

Two observations worth keeping in view. Every requirement is covered by phase 7, and eleven of the fourteen are covered by the end of phase 3, which is the evidence behind the claim that stopping after phase 3 leaves a complete product rather than a fragment. The three that are not, R1 in full, R12 and part of R11, are all in the AI and oral half of the product.

---

## 9. Timeline

| Phase | Weeks | Cumulative | Milestone |
| --- | --- | --- | --- |
| 0 Foundations | 2 to 3 | 3 | Gates enforced |
| 1 Content factory | 3 to 4 | 7 | **Go/no-go on item quality** |
| 2 Practice MVP | 3 to 4 | 11 | **Public alpha** |
| 3 Exams and item statistics | 2 | 13 | **Closed pilot** |
| 4 BYOK and generation | 2 | 15 | Key features live |
| 5 Oral practice mode | 2 to 3 | 18 | Oral rehearsal usable |
| 6 Oral studio mode | 2 | 20 | **Decision gate before starting** |
| 7 Polish and hardening | 2 | 22 | **1.0 public** |
| 8 English mirror | 2 | 24 | Architecture validated |

Roughly five months part-time on these assumptions, with something public around week 11 and the largest risk tested in week 1 of phase 1. Treat the numbers as relative sizing rather than a schedule: this is evening and weekend work with a full-time job and a department change in the middle of it, and the phase order is designed so that stopping early still leaves a finished thing.

If the time available turns out to be half of what this assumes, the reduction is: ship phases 0 to 3 as the whole product. Reading and written expression practice, mock exams scored against the real cut tables, sync across devices, no key required at all. Section 8 shows that covers eleven of the fourteen requirements. It is a genuinely useful free tool and it stands on its own.

---

## 10. Definition of done

Applies to every PR, not just phase ends:

- Typecheck, lint and boundary rules pass.
- **Every new branch in every package has a unit test.** Not a coverage number that went up, a test that names the behaviour and would fail if the behaviour changed. This applies to adapters, route handlers, factory stages and UI logic, not only to the pure core.
- New adapters pass the port contract suite and have their own unit tests for retry, error translation and migrations.
- Anything that crosses a seam has an integration test.
- New UI has an axe assertion on its states.
- Both locale files updated, no string literals in components.
- No new dependency without a note in the pull request saying what it replaces or why nothing already present does the job. A dependency that changes the architecture needs an ADR.
- Any change to engine behaviour explains its effect on the golden fixtures, and any new engine branch has a property or a unit test, not just coverage.
- Any new port implementation passes the port's contract suite.
- Any new item type registers all five members, and its a11y contract is asserted (§3.4).
- Any new user-visible surface works on a phone, with a keyboard, and with reduced motion.
- The `CLAUDE.md` of any package whose invariants changed is updated in the same PR.

---

## 11. What could still go wrong, and the response

| Signal | Response |
| --- | --- |
| Phase 1 exit criteria fail | Work down the descoping list in `content-factory.md` section 9, in order. Do not improvise a rescue |
| Nobody uses the public alpha | The bank is fine but the product is not the problem either. Check whether people know it exists before changing the product |
| Item statistics never accumulate | Lower stakes than it was, because nothing the user sees depends on them (ADR 7). The consequence is slower retirement of bad items, so lean harder on the in-app report control and check the reports weekly |
| Realtime cost is worse than modelled | Ship 1.0 without studio mode. Phase 5 already delivers the value |
| The factory's output degrades when a model changes | The batch report and the yield metric are the early warning. Pin model versions in the factory config and treat a model upgrade as a change requiring a fresh sample review |
| You lose interest in month four | The phase order means a useful public tool already shipped at week 11. Keep the repo in a state where that is a complete artefact rather than an abandoned half-product, which mostly means not leaving a half-built phase on main |
| An assumption in `product-requirements.md` section 18 turns out false | Each one names how it would be falsified. Check P2 (key setup completion) and P3 (users wanting a band letter) against real behaviour after the public alpha, because both would change the product rather than the plan |

---

## 12. First week

Concrete enough to start on Saturday:

1. Decide the name, register the domain.
2. `pnpm create` the monorepo, add Turborepo, set up project references and strict TypeScript.
3. Create the six packages with empty public surfaces and their `CLAUDE.md` files.
4. Write `@palier/domain` types and transcribe the `psc-sle` profile from requirements document section 5.
5. Wire dependency-cruiser and prove it fails on a deliberate violation.
6. Stand up the Vitest workspace and fast-check, and write the first real test: the band mapping property over the `psc-sle` profile, total and monotonic across every variant. It is a dozen lines, it will catch a cut-score typo forever, and it sets the tone for what a test looks like in this repo.
7. Commit `adr/` as written, plus a short `adr/README.md` covering the format, the rule that an ADR is superseded rather than edited, and that numbers are assigned in order of acceptance.
8. Commit the licences and a README carrying the non-affiliation statement, since the repository is public from the first commit and R5 applies to it.
9. Push, get CI green, and stop. Phase 0 is not glamorous and it is the reason the rest goes quickly.
