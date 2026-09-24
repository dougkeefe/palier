# Palier: Progress

**Last updated:** 24 September 2026
**Current phase:** **Phase 2 (Practice MVP) is open.** Phase 1 is built (automated content factory,
ADR 19; the D54 real-model go-signal exists — session log, 24 September 2026). Much of Phase 2 has
landed ahead of the formal start: the pure `@palier/engine` core, the `@palier/app` practice loop,
and the `/ids`, `/dexie`, `/openai` adapters. The bank `ItemRepository` (`adapters/bank`) now
lands too, so the app can plan a day from the real committed bank, not only the fixture bank.
The web slice has landed too: the production composition root wires the real adapters, and a service
worker makes the app and the bank work offline after one load (D58–D60). **Gate A is resolved** (adopt
the PRD's UI direction).
The data use cases (`exportData`/`importData`/`wipeData`) have landed too (D61, D62).
The single-device UI has landed too (D63–D67), so **Slice 1 is complete**: the whole practice app works
on one device, offline after one load.
**Gate B is resolved** (human, 24 September 2026: the lower Leitner box wins a concurrent edit, D69),
and **Slice 2 is complete** (`dougkeefe/pangyo`; D69–D72, ADR 21): two devices pair by code and
converge, on the real route handlers over PGlite. **Next step:** Slice 3, starting with the sync
simulator. See [Next, decided](#next-decided). The **full-volume published
bank** (D54) is a standing human gate that has now been **sequenced to the end**: build every
feature phase (2–6) against the baseline committed bank, then run the content gate at 1.0
(D56).

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
7. **Leave the next step decided, not a menu.** Before you finish, rewrite the *Next,
   decided* section (below the phase-0 checklist) so the session after you opens to a
   *single* unambiguous next slice: its scope, the ports and engine functions it uses, and
   what "done" looks like. The test is simple — the next session should be able to start
   building without re-deriving which direction to go. This section is **current state, so
   you rewrite it every slice** (like the status table), which is the opposite of rule 4's
   append-only session log — keep it terse *because* it is superseded, not accumulated. When
   the honest next step is a fork only a human can settle — a product or UI choice, the
   Phase 1 content go/no-go, two designs with a real trade-off — say so *in place* and name
   the gate. **A named gate is decided; a list of options is not.** If you leave a menu, you
   have handed the next session the same decision you were meant to close.

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
| 1 Content factory | Find out whether a generated bank is good enough | 3–4 wk | **built** (D54 go-signal met; full-volume publish pending) |
| 2 Practice MVP | Ship something publicly useful | 3–4 wk | **in progress** |
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
| `dougkeefe/yamoussoukro` | **Phase 2 Slice 3 — convergence proof + public launch (D57), the last Phase 2 slice.** The sync simulator (tier 5) in `@palier/testing` over the memory server and, in the integration lane, the real route handlers on PGlite; the engine golden record; the one-off mutation check; the remaining gates confirmed; deploy tooling, then the public deploy with the human (Gate C, provisioned together). | 24 September 2026 |

*(The prior rows — Slice 2 (#20), Slice 1 (#19), `adapters/bank` (#18), the `adapters/dexie` slice (#16) and the Phase-1 content
factory — merged and were removed; the In-flight table tracks current work, not history, and the
session log below is the permanent record.)*

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
- [~] `@palier/app`: port interfaces from §3.3 — under `src/ports/`: `ItemRepository`,
  `AttemptStore`, `ScheduleStore`, `SessionStore`, `SettingsStore`, `KeyVault`, `Clock`, `Random`,
  plus `IdGenerator` (a 9th port §3.3 does not name, D48); `OralStore` (no §3.3 signature) and
  `AiProvider`/`SyncTransport`/`TelemetrySink` (net-new domain types) deferred; `ports.stub.ts`
  deleted. See D18–D20, D45, D48
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
- [~] `@palier/testing`: in-memory implementation of every port — `ItemRepository`, `AttemptStore`,
  `ScheduleStore`, `SettingsStore`, `KeyVault`, `SessionStore` (memory stores) and
  `counterIdGenerator` (the `IdGenerator`, D48), all importing the real ports from `@palier/app`;
  `OralStore`/`AiProvider`/`SyncTransport`/`TelemetrySink` follow their ports
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

### Next, decided

**Next: Slice 3, part 1 — the sync simulator** (implementation-plan.md §6.2 tier 5). It is buildable
now, and it is the largest piece of Slice 3 that needs no human.

**Slice 2 is complete** (session log, 24 September 2026, `dougkeefe/pangyo`; D69–D72, ADR 21).

**Part 1's scope.**
- **Put the harness in `@palier/testing`**, beside `memorySyncServer`, which already holds the revision
  semantics the simulator needs:
  - two or three virtual devices, each a full `syncNow` graph over the memory stores;
  - one server, either `memorySyncServer` or the Drizzle repository behind the handlers on PGlite (the
    PGlite variant sits in the integration lane);
  - a transport wrapper, driven by `seededRandom`, that delays, drops and reorders calls, and can
    **partition** a device fully.
- **Scenarios:** random interleavings of answering (`answerItem` over the fixture bank), importing,
  pairing and syncing, then a heal and a final round of syncs.
- **Assertions at quiescence:**
  - every device holds the same attempt set, with none lost and none duplicated;
  - every device holds the same schedule;
  - each schedule entry equals the `mergeRecord` fold of its concurrent versions;
  - `practiceTrend` is identical on every device;
  - a device offline for a "week" does not overwrite newer work.
- **Seed counts:** a few hundred seeds in the medium lane, and a large count under `CI_LANE=nightly`.

**Done looks like:** the Phase 2 exit criterion "sync simulator passes several hundred seeds including
full partition and heal, no lost or duplicated attempts" is ticked, with its command output, and
`pnpm verify` plus `verify:medium` are green within their time budgets.

**Then the rest of Slice 3:**
- wire the remaining Phase 2 CI gates: engine golden regression, contract suites, the simulator in the
  medium lane, and E2E 1/2/6/7/8;
- the one-off mutation check;
- the public deploy, behind **Gate C** below.

**Gate C — hosting and database (human, gates the public deploy only).** Someone with the accounts has
to provision serverless Postgres (§3: "Neon or equivalent") and a Vercel project. The environment needs
`DATABASE_URL` and a random `RATE_LIMIT_SALT`, and `apps/web/drizzle/` has to be applied at deploy
(ADR 21). Until then the deployed app works fully offline-first, and its sync routes answer 503, which
the UI shows quietly.

**Standing human gates (do not self-direct):**

- **The full-volume published bank (D54).** The real-model go-signal exists (session log, 24 September
  2026); the remaining step is the full run to 500–700 published items on a funded key, then shipping
  that bank as `content/bank/v{n}/`. **Timing now settled (D56): sequenced to the end.** Every feature
  phase (2–6) is built and used against the baseline committed bank; the content run is a 1.0 gate, not
  a per-phase blocker. The baseline bank's French is synthetic (D54), so the app is feature-usable
  before this gate, not study-ready.
- ~~**Product and UI direction**~~ — **resolved 24 September 2026** as Gate A (Phase 2 section): adopt
  the PRD's §8/§10/§11/§14 direction for the single-device screens. The *pairing* UI is Slice 2, after
  Gate B.
- ~~**The `adapters/sync` `ScheduleEntry` merge (D43)**~~ — **resolved 24 September 2026** as Gate B:
  the lower box wins a concurrent edit (D69).
- **Gate C — hosting and database provisioning** (above). It gates only Slice 3's public deploy.

Standing human items, unchanged: **D12** (the inferred `X 0-10` band, checked against the PSC's table
before launch) and the name/domain decision in §12.1.

---

## Phases 1 to 8

Each phase's work breakdown lives in `implementation-plan.md` §7 and is expanded into
tasks here **when the phase starts**, not before. Only the exit criteria are tracked
in advance, because they are the actual gate.

### Phase 1: Content factory — automated go/no-go on item quality (ADR 19)

Pipeline spec is `content-factory.md`. §7 is the schedule and the decision points only.
**Fully automated — no human in the quality loop at this stage (ADR 19, D51).** Machine-generated
from public GC sources (ADR 6); gated by cross-family review + deterministic validation alone.

- [x] `adapters/openai` — the `AiProvider` adapter (resequenced from Phase 4), Zod-parsed at the edge, contract-tested. Over `fetch`, not the SDK (D53); held to `aiProviderContract` + retry/error-translation/usage tests. `./openai` subpath live (D3)
- [x] The 5-stage CLI pipeline in `apps/factory`: harvest (licence-cleared public GC sources) → passages (original, nothing quoted) → draft → cross-family review → deterministic validation → bank build. Each stage a pure function with a naming test
- [x] Review-gate evaluation set (50 deliberately-defective items across 5 classes, authored programmatically as test fixtures) + a detection harness with a clean control
- [x] A small sample batch (10 published / 26 drafted) run end to end and committed: `content/factory/{source-queue,batch-report,eval-report}.json`, `content/bank/v1/`
- [x] Review gate detection **100 percent in every defect class** on the eval set (`eval-report.json`; phase bar is ≥90%)
- [x] Stage 4 yield **0.577** on the sample (within 45–75%; `batch-report.json`)
- [x] Deterministic validation + bank-build reproducibility green in CI — the run test asserts a byte-identical rebuild; verified by regenerating and `diff -r` (identical)
- [x] Cost per accepted item measured on the sample run — **0.133 USD** (scripted pricing; `batch-report.json`). Real figures come from the deferred paid run

**How the exit criteria were met (D54):** the sample batch and every metric were produced against a
deterministic **scripted** `AiProvider`, because this environment has no funded OpenAI key — exactly
the contingency the plan pre-authorised. The pipeline, the adapter, the gate wiring and the metric
computations are all real and tested; the committed sample's *French is synthetic* and the detection
/ yield / cost numbers are the harness measuring itself on controlled input, not a judgement of a
real model. The numbers become meaningful at the paid run.

**Deferred follow-on (not an exit criterion):** full-volume run to 500–700 published items (reading + written expression, bands B/C) **on a funded key with the real openai adapter** (`palier-factory run --provider openai`), once the model ids in `apps/factory/config/models.json` are verified. This is the run that actually tests A1/A2/A3.

**Human register check is deferred, not deleted:** the Phase 7 [R8] "both languages reviewed by a human" gate (ADR 19's revisit trigger).

**If these fail:** work down the descoping list in `content-factory.md` §9 in order. Option 5 is a legitimate outcome, not a failure.

### Phase 2: Practice MVP — public alpha

**The pure `@palier/engine` core is being built ahead of this phase** (sequencing note in
`implementation-plan.md` §7; it is content-agnostic, so it does not wait on Phase 1). Landed so
far: the exam **Scorer**, the **TrendCalculator**, the Leitner **Scheduler**, the **Selector**
(with the weakest-sub-skills helper) and the daily **Planner** — session log, 20 September 2026.
The pure engine core (`implementation-plan.md` §3.2) is now complete. The **first `@palier/app`
use cases `planDailySession` and `answerItem` have also landed ahead of this phase** (session
log, 20 September 2026; D36/D37 and D38–D42). Between them the practice loop exists in
`@palier/app`: plan a day from the bank, then score, record and schedule an answer.
`StartSession` / `CompleteSession` (§3.2) build on them and want the deferred `SessionStore`
first. **The first real adapters have also landed:** `adapters/ids` (D48) and `adapters/dexie` —
the five local store ports over IndexedDB at schema v1, incl. the encrypted `KeyVault` (D49, D50).
**Phase 2 formally opened 24 September 2026** (session log). The `implementation-plan.md` §7 work
breakdown, expanded on start with what has already landed ticked — each tick points at its
session-log evidence; nothing is ticked without it.

**Work breakdown (§7)**

- [x] `@palier/engine`: Scorer, TrendCalculator, Scheduler, Planner, Selector, BandMapper — the pure core (20 September 2026)
- [x] `adapters/dexie`: the store ports at schema v1, with the migration harness (D49/D50)
- [x] `adapters/bank`: manifest fetch, lazy shard loading, content-hash cache (24 September 2026, this slice) — the service-worker registration itself is the web slice
- [x] Composition root wires the real adapters + the service worker caches the bank by content-hashed URL (24 September 2026, `dougkeefe/algiers`; D58–D60) — production path no longer throws; offline shell/route/bank proven in the `offline` Playwright project
- [x] `adapters/ids`: the ULID generator (D48; not one of the five §3.2 names, but a real adapter)
- [x] `adapters/sync` (24 September 2026, `dougkeefe/pangyo`; D69–D71): `httpSyncTransport`, pairing by code, push/pull by revision watermark, retry, held to `syncTransportContract`. **`adapters/vault` is not built, by decision (D71)**: its device secret already lives in `dexieKeyVault` (D50). The "offline queue" is the ledger diff: a record changed offline stays dirty until a push takes it (D69)
- [x] Sync backend (24 September 2026, `dougkeefe/pangyo`; D70, ADR 21): Postgres + Drizzle on Node, the sync/device/pairing routes, rate limiting by IP HMAC, SHA-256 device secrets, committed migrations; PGlite integration lane. Deploy-time provisioning is Slice 3
- [x] `@palier/app` use cases: `StartSession`, `AnswerItem`, `CompleteSession`, `RunDiagnostic` landed (20–21 September 2026); `ExportData`, `ImportData`, `WipeData` landed (24 September 2026, `dougkeefe/algiers`; D61, D62); `SyncNow` plus the pairing/device/switch/delete-everywhere use cases landed (24 September 2026, `dougkeefe/pangyo`; D69)
- [x] UI: the whole single-device set **landed** (24 September 2026, `dougkeefe/algiers`; D63–D67), and the sync settings with pairing by code, the stateful header indicator and the background runner (24 September 2026, `dougkeefe/pangyo`; D72)
- [x] Item reporting control and the GitHub issue path: on every feedback panel, four reason codes, a prefilled issue on the project repository (24 September 2026; E2E-tested)
- [x] The sync simulator (tier 5): two/three-device scenarios, seeded faults, convergence assertions (24 September 2026, `dougkeefe/yamoussoukro`; D76). It found two real sync defects, both fixed at the source (D74, D75), and a trend-order gap (D73)
- [x] Every real adapter passes its port contract suite — `ids`, `dexie` (all six ports, `SyncStateStore` included), `bank`, `openai` and `sync` (24 September 2026; `pnpm verify` runs every one)

**Exit criteria** (the actual gate)

- [x] Diagnostic → accuracy per band tag with interval → daily session, on two devices paired by code [R1, R4, R10, R14]. Journey 1 covers the diagnostic to accuracy per band with its interval; **journey 8** covers daily sessions on two browser contexts paired by code, with the progress screen reading identically on both (session log, 24 September 2026, `dougkeefe/pangyo`)
- [x] Full offline operation after first load [R4] — for everything Phase 2 builds: journey 2 (a whole drill session) passes with the network off after one online load, over real IndexedDB and the service-worker-cached bank (session log, 24 September 2026). Mock exams are Phase 3, and their offline run is Phase 3's journey 3
- [ ] Engine unit tests exhaustive at every boundary, golden fixtures locked
- [x] Sync simulator passes several hundred seeds including full partition and heal, no lost or duplicated attempts, and the same trend on every device: 400 seeds on the memory server and 100 through the real route handlers on PGlite in the medium lane, and 4,000 + 200 once by hand (session log, 24 September 2026, `dougkeefe/yamoussoukro`; D76)
- [x] Every adapter passes its port contract suite — `ids`, `dexie` ×6, `bank`, `openai`, `sync`; and `sync` passes it through the real route handlers too, on the memory repository (fast lane) and on PGlite (integration lane). Session log, 24 September 2026, `dougkeefe/pangyo`

**Completion slices (D57).** The §7 work breakdown above is grouped into **three** bigger slices that
carry Phase 2 to every exit criterion, with two human gates between them. This mirrors
`implementation-plan.md` §7 Phase 2 "Completion slices" — **keep the two in sync** (the fuller scope
and each slice's *done* live in the plan). Current position: **Slices 1 and 2 complete** (Gate B resolved, D69); Slice 3 is next.

- [x] **Slice 1 — Single-device practice app, offline-complete.** **Done 24 September 2026** (`dougkeefe/algiers`; D58–D67; session-log evidence). Composition-root wiring of
  bank/dexie/ids + service-worker offline cache [R4] **(landed, D58–D60)** +
  `ExportData`/`ImportData`/`WipeData`, then (after **Gate A**, now resolved) the full single-device UI:
  onboarding, home/readiness, today's plan, diagnostic, drill/feedback, review queue, progress,
  settings + data pane, item reporting.
- [x] **Gate A — product & UI direction (human).** Screens, copy, states. Gates Slice 1's UI.
  **Resolved 24 September 2026 (human decision, `dougkeefe/algiers`):** adopt the direction the PRD
  already specifies rather than invent one — §8 screens, §10 visual language, §11 accessibility, §14
  states — for the single-device subset: `/start` (steps 1–4; step 5, the key, is Phase 4), `/home`
  (practice-trend readiness only), the reading/writing drill + feedback panel, the diagnostic,
  `/review`, `/progress`, `/settings/data`, and item reporting. The name stays the working "Palier"
  (§12.1 is still a standing gate). Coco is a minimal static treatment. §9 streak/XP are deferred, since
  they are not in Slice 1's *done* and `@palier/engine` has none.
- [x] **Slice 2 — Multi-device sync.** **Done 24 September 2026** (`dougkeefe/pangyo`; D69–D72, ADR 21). Sync backend (Postgres/Drizzle/routes/pairing/rate-limit, ADR 5);
  `adapters/vault` + `adapters/sync` behind `SyncTransport`, applying the D43 rule; `SyncNow` + pairing
  UI. Completes the two-device exit criterion. Behind **Gate B**.
- [x] **Gate B — the `ScheduleEntry` merge decision (human, D43).** `updatedAt` / lower Leitner box /
  device-local. Gates all of Slice 2. **Resolved 24 September 2026 (human decision, `dougkeefe/pangyo`): the
  lower box wins a concurrent edit**, and concurrency is detected by a per-document server revision (D69).
- [ ] **Slice 3 — Convergence proof + public launch.** Sync simulator (tier 5), remaining CI gates +
  mutation check, full-offline + Lighthouse ≥95 confirmation, public deploy. **Phase 2 complete.**

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
| R1 | Practises all three tested skills | 2, 5, 6 | reading and written expression practised end to end (24 September 2026); oral is Phases 5–6 |
| R2 | Format and register match the real tests | 1 | not started |
| R3 | Mock exams mirror published structure and cuts | 3 | not started |
| R4 | Works with no key and offline after first load | 2 | practice and progress verified offline (journey 2 on the `offline` project, 24 September 2026); mock exams are Phase 3 |
| R5 | Never presents as official | 0, 7 | not started |
| R6 | No real test items, no PSC reproduction | 1 | not started |
| R7 | Rationale per option, explanation per item | 1 | not started |
| R8 | Fully bilingual, equal prominence | 0, 1, 7 | not started |
| R9 | WCAG 2.2 AA | 0, all | not started |
| R10 | No estimate without evidence and uncertainty | 2 | satisfied and verified (24 September 2026): below `MIN_EVIDENCE` a band shows no bar, only how many more answers it needs; above it, the Wilson interval is drawn beside the estimate (journey 1, `trend-lines.test.ts`, `BandMeter` tests) |
| R11 | Export, import, delete, each in one action | 2, 7 | Phase 2 half verified (24 September 2026): `/settings/data` does each in one action; journey 6 round-trips export → delete → import and finds the same progress. Phase 7's server-side delete waits for sync |
| R12 | Key, audio, transcripts and submissions stay local | 4, 5 | not started |
| R13 | Free and open source | 0, 7 | not started |
| R14 | Progress across devices, with an off switch | 2 | satisfied and verified on the hermetic lane (24 September 2026): journey 8 pairs two devices by code and both show the same progress; the switch is tested off, with server deletion offered, in `sync.spec.ts`. A public deployment with a real database is Slice 3 |

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

### D74 — a pair redeem that fails in transit forgets the device's identity and ledger
**Date:** 24 September 2026 · **Status:** accepted. **Found by the sync simulator** (seed 74, 3 devices)

A redeem can succeed on the server and lose its answer. The server has then moved the device's secret
into the new account (and dropped the old one if it is now empty), while the device still believes its
old identity. Every later sync went into the new account **from the old account's watermark and ledger**:
the device pushed its own history there, but never received what the new account held below that
watermark, and every sync reported success. That is permanent, silent divergence from one lost response.
The user saw "pairing failed" and might reasonably not retry.

**Fix, in `pairDevice`:** on `SyncUnavailableError` from the redeem, reset the ledger and set `identity:
null` before rethrowing. The next sync re-registers, and because registration is idempotent per secret
(D69 #7) the server answers with the account the device is really in, followed by a full exchange from
watermark 0. If the redeem never reached the server, the device simply re-registers into its old account
and re-offers its records, which conflict and merge harmlessly. Nothing local is lost either way.
Registration stays deferred until a completed session (§9.3), so a device with no completed session stays
unregistered until the user retries pairing.

- **The app's `fakeServer` was not idempotent on registration**, although the port promises it. It now
  is, and every existing test passed unchanged. New test: `sync-account.test.ts`, "forgets its account
  when a redeem's answer is lost, so the next sync learns which account it is in" (it failed first).
- **Proven to bite:** with the fix removed, regression seed 74 fails.

### D75 — sync settles against the live record, not the snapshot it read before the network call
**Date:** 24 September 2026 · **Status:** accepted. **Found by the sync simulator** (seed 7, 2 devices)

The background runner can sync mid-drill (a `focus` trigger). `syncNow` read every record, waited on the
network, and then decided "clean, so take the server's copy" against that **snapshot**. An answer made in
the gap was overwritten: its schedule change vanished, although its attempt survived. With Gate B that
could hide a failure. A lower box made on the device gave way to the other device's higher one, so an
item the user just missed would not come back for review.

**Fix:** `settle` re-reads the device's current copy of each pulled record (`readRecord` in
`sync/records.ts`: `schedule.get`, `settings.get`, `sessions.all()` for a session). A copy that changed
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

---

## Session log

Newest first. One entry per session that changed something. Never edit an older entry.

### 24 September 2026 — `dougkeefe/yamoussoukro` (Slice 3, part 2: the engine golden record)

- **Built:** `packages/engine/src/__fixtures__/practice-record.golden.json`, the §5 "recorded set of
  item responses with expected accuracy figures, intervals, schedule states". It holds 12 reading items
  (A×3, B×5, C×4) and 120 answers, so the 100-attempt window cuts the history, plus the outputs:
  - the Leitner state after every answer;
  - the trend (A insufficient; B and C estimated, with Wilson intervals);
  - one seeded `selectItems`;
  - one seeded `planDay`.

  Three golden tests replay it, beside the existing exam-band golden. They were recorded after D73's
  tie-break, so no existing value moved.
- **Checked independently, not only recorded:** all 120 Leitner rows were recomputed in Python from the
  profile's `[1, 3, 7, 21]` (0 mismatches). The window was recounted by hand (A 26, B 41/27 correct, C
  33/13), and both estimated intervals match an independent Wilson formula to 12 decimal places.
- **Proven to bite, each restored afterwards:**
  - `TREND_WINDOW` 100 → 99 fails the trend golden;
  - `WEAKEST_WEIGHT` 3 → 1 fails both selection goldens;
  - dropping `slow` from the Leitner hold rule fails 9 of 120 schedule rows;
  - `RECENT_DAYS` 14 → 13 moves nothing, correctly, since the recent answers are 6 days old.
- **Evidence:** `pnpm verify` → green, 1382 tests (8 todo), boundaries clean (296 and 127 modules).

### 24 September 2026 — `dougkeefe/yamoussoukro` (Slice 3, part 1: the sync simulator, and the two defects it found)

The Phase 2 exit criterion "sync simulator passes several hundred seeds including full partition and heal,
no lost or duplicated attempts" is **met**.

- **Built** (D76): `packages/testing/src/simulator/` and its PGlite twin in `apps/web`. Also a new gated
  Vitest project, `integration-testing`, which `test:integration` now runs.
- **Found and fixed at the source.** Each fix has a named unit test that failed first:
  - **D74**: a lost pair-redeem answer left a device syncing into its new account from its old watermark,
    so it silently never received the account's older records (seed 74, 3 devices).
  - **D75**: an answer made during the device's own background sync was overwritten by the pull (seed 7,
    2 devices).
  - **D73**: the trend was not a function of the attempt set. There was a tie-break gap in
    `calculateTrend`, and a `recent` order that differed between the memory store and Dexie. **No golden
    value moved.**
- **A first oracle that could not see a class of bug, and its fix:** reverting the D69 #5 ledger skip did
  *not* fail the first version, because quiesce rounds consumed every echo and sides were snapshots taken
  after any loss. Sides are now built from answer writes, and the week phase syncs once a day. After that,
  the revert failed 7 of 16 two-device seeds.
- **Evidence:**
  - `pnpm verify` → green: 1259 tests (8 todo); boundaries clean (292 and 127 modules); thresholds held;
    ~21 s wall.
  - `pnpm test:integration` → 5 files, 39 tests, **13.0 s**, which includes 400 memory seeds (~9 s) and
    100 PGlite seeds (~11 s) in parallel projects.
  - By hand: `PALIER_SIM_SEEDS=4000` → clean (78 s); `PALIER_SIM_SEEDS_PGLITE=200` → clean (21 s).
  - **Proven to bite, each restored afterwards:**
    - ledger skip removed → 7 two-device seeds fail;
    - D74 fix removed → regression seed 74 fails;
    - D75 re-read removed → seeds 7 and 12, in both device counts, plus both regression seeds, fail;
    - colliding id streams (`idSpacing: 1`) → `lost-attempt`;
    - a server that acknowledges and drops one push → `lost-attempt`.

### 24 September 2026 — `dougkeefe/pangyo` (Slice 2, part 4: the sync UI and journey 8 — Slice 2 complete)

The last part of Slice 2. **Two devices pair by code and converge.** *Next, decided* is now Slice 3.

- **Built:**
  - `SyncRunner` in the layout, driving `shouldSync`/`delayFor` on load, focus, reconnect, a completed
    session (debounced) and on demand, with its display logic in `features/sync/sync-view.ts`;
  - the header's `SyncStatus`, now stateful and linking to `/settings/sync`;
  - `/settings/sync`: the switch with the server-deletion offer, status, what syncs and what never
    does, devices with remove, add a device by code, link with a code (the "restoring" count), the
    no-recovery sentence with the export, and the danger zone;
  - a footer link to the sync settings, a `sync` namespace in both locales, and §8.1's onboarding line;
  - the data pane's copy corrected for sync (D72).
- **E2E (`e2e/sync.spec.ts`, hermetic):**
  - **journey 8**: two contexts, pairing by keyboard, then each drills and the whole progress screen
    reads identically on both;
  - **journey 7's sync half**: offline mid-drill, then the reconnect trigger syncs;
  - the sync settings axe-clean in every state, with keyboard switching and focus on each
    confirmation.
- **A Lighthouse regression caught and fixed before it landed** (D72): a transient "Syncing…" label
  shifted the header on every load.
- **Evidence:**
  - `pnpm verify` → green: 104 files, 1165 tests (8 todo); boundaries clean (281 and 126 modules).
  - `pnpm build && pnpm verify:medium` → integration "37 passed"; Playwright "29 passed": 21 hermetic,
    journeys 7 and 8 and the sync settings test among them, 1 warmup and 7 production.
  - **Proven to bite:** with the hermetic id counter put back to one shared stream, journey 8 fails,
    "Expected 19 items answered, Received 13". Restored.
  - `pnpm --filter @palier/web bundle-size` → 165.7 KB of 180 KB, unchanged.
  - `pnpm --filter @palier/web lighthouse` on **9 routes** (`/fr/settings/sync` added) → median
    performance **1.0** and accessibility **1.0** everywhere, **max CLS 0 on every route**. The first
    run, before the D72 fix, measured 0.0003.
  - Screenshots of the pairing flow: `.context/sync-*.png`, which is gitignored.

### 24 September 2026 — `dougkeefe/pangyo` (Slice 2, parts 2 and 3: the sync backend, the HTTP adapter, the wiring)

Parts 2 and 3 landed as one commit. The proof that the protocol is right needs both halves: the adapter
held to the contract **through the real route handlers**.

- **Server (D70, ADR 21):**
  - `apps/web/src/server/` holds the Drizzle schema plus committed SQL migration, a
    per-account-keyed `SyncRepository` with its Drizzle implementation, pure handlers
    (validation, 401/404/413/429/503), SHA-256 secrets, and rate limits in Postgres by IP HMAC.
  - `db.ts` gives PGlite when hermetic, postgres.js on `DATABASE_URL`, and 503 otherwise.
  - Seven Node route files hold one-line bindings.
- **Adapter (D71):** `@palier/adapters/sync` → `httpSyncTransport`. There is no `adapters/vault`, by
  decision.
- **Wiring:**
  - The composition root gains `sync` and `syncState` ports and eight sync use cases.
  - In hermetic mode each page load is its own device, with a server-valid secret and a separate id
    stream.
  - `sync-triggers.ts` and `device-label.ts` are the pure halves of part 4's runner and registration.
- **Defect found by the contract, fixed at the source:** a non-UUID device id reached Postgres and came
  back as a 500 (the adapter then reported "network unreachable"). The handler now answers 404 first.
- **New dependencies**, each stated in ADR 21:
  - `drizzle-orm`, `postgres` and `zod` (already pinned by domain) in `apps/web`;
  - `@electric-sql/pglite` as a direct `apps/web` dependency;
  - `drizzle-kit` as a development dependency.

  None replaces anything.
- **Evidence:**
  - `pnpm verify` → green: 103 files, 1154 tests (8 todo); boundaries clean (281 and 121 modules).
    Every `apps/web/src/app/**/route.ts` is at 100% branch (threshold 95), `handlers.ts` at 97.9%,
    `http-sync-transport.ts` at 100%.
  - `pnpm test:integration` → 37 passed, including `syncTransportContract` through the route files on
    Drizzle over PGlite, and the concurrent-push revision case.
  - **`no-sql-outside-web-server` bit on its first run** (a test importing `drizzle-orm`), and was
    fixed by moving the truncate into `server/__tests__/reset.ts`.
  - `PALIER_HERMETIC=1 next dev` → `POST /api/account/device` 200 and `GET /api/sync?watermark=0` →
    `{"docs":[],"watermark":0,"more":false}`.

### 24 September 2026 — `dougkeefe/pangyo` (Slice 2, part 1: Gate B decided, and the sync core)

**Gate B is decided** (human): the lower Leitner box wins a concurrent edit. A second human call
arrived with it: the server stores **SHA-256** of the device secret, not Argon2id. That call is
recorded with the server in part 2 (D70).

- **Mechanism (D69):**
  - A naive `min(box)` would stop a box ever rising after its first sync. Instead, every server
    document carries a per-account revision, and a push states its base revision.
  - A stale base returns a conflict, and the device merges with `mergeRecord`, the one rule sync and
    import share.
  - Change is found by diffing each record's hash against a ledger, held behind a new
    **`SyncStateStore`** port.
- **Built:**
  - the `SyncTransport` port (§3.3 amended) and the `SyncStateStore` port;
  - `syncNow`, plus `requestPairCode`, `pairDevice`, `listDevices`, `removeDevice`, `setSyncEnabled`
    and `deleteEverywhere`;
  - `importData` on `mergeRecord`;
  - `memorySyncServer`, `memorySyncStateStore`, `syncTransportContract`, `syncStateStoreContract` and
    `syncHandlers` in `@palier/testing`;
  - `dexieSyncStateStore` on `syncMeta`, with no schema bump.
- **A defect found by the tests, fixed before it landed:** a device's own push came back on its next
  pull and was merged as if concurrent, so the older copy won. A document at or below the ledger
  revision is now skipped (D69 #5).
- **Test changed, and why:** `data-rights.test.ts` "never overwrites a local schedule entry, session or
  setting". Gate B supersedes keep-local (D62), so it is now the merge case (D69 #6).
- **Evidence:**
  - `pnpm verify` → green: 96 files, 1044 tests (8 todo); boundaries clean (277 and 83 modules);
    thresholds held.
  - Branch coverage: `sync-now.ts`, `sync-account.ts`, `merge.ts`, `records.ts`, `import-data.ts` and
    `dexie/sync-state-store.ts` each at 100%.
  - **Proven to bite:** with the ledger check removed (every pull merges, the naive `min`), three
    `sync-now.test.ts` cases fail, "lets a box rise after it has synced" among them. Restored, and 18/18
    pass.

### 24 September 2026 — `dougkeefe/phase-2-development` (PR #19: fix the CI Lighthouse failure on `/fr/progress`)

The branch was renamed from `dougkeefe/algiers` (the entries below keep that name) and opened as PR #19.
CI's Lighthouse budget then failed `/fr/progress` at performance **0.88**, 5 of 5 runs.

- **Correcting the part 4 entry below:** it logged `/fr/progress`'s remaining 0.06 layout shift as
  "within budget, noted rather than hidden". That was the defect, only smaller on my machine. On CI it
  costs the route its performance budget.
- **Cause and fix:** **D68.** On island screens the footer was in view beside the loading state and was
  pushed off when content arrived. App screens now keep the footer below the fold.
- **Evidence:**
  - `pnpm --filter @palier/web lighthouse` → exit 0, performance 1.0 and accessibility 1.0 on all 8
    routes, **max CLS 0 on every route** (was 0.0595 on `/fr/progress`).
  - `lhci collect` with `cpuSlowdownMultiplier=4`, 2 runs × 8 routes → max CLS 0, performance 1.0 on all.
  - With the rule removed, `/fr/progress` shifts 0.0595 again; restored byte-identical (`cmp`) and rebuilt.
  - `pnpm verify` → 944 passed; `pnpm test:e2e` cold → "26 passed".
  - CI's re-run on the push is the confirmation that matters; it is not in yet.

### 24 September 2026 — `dougkeefe/algiers` (Slice 1, part 4: review, progress, your data, item reporting — Slice 1 complete)

The last PR of Slice 1. **The single-device practice app is complete**, and *Next, decided* is now
Gate B.

- **Screens:** `/review` (the due stack across both skills, drilled in `mode: "review"`, and the "Nothing
  due" reward state with a minimal Coco), `/progress` (the trend per skill, sub-skill **counts** weakest
  first, items answered, time spent answering, the honest "what this does and does not tell you" panel,
  export), `/settings/data` (export, import with its counts reported, delete everything behind an in-place
  confirmation, and the no-recovery sentence), and **item reporting** on every feedback panel (four
  reasons, provenance, a prefilled GitHub issue). Review and Progress join the nav; "Your data" is in the
  footer on every page.
- **Logic below the UI** (**D66**): `reviewQueue` and `progressReport` in `@palier/app`,
  `subSkillBreakdown` in `@palier/engine` (100%, a new function, **no golden value moved**).
  `@palier/ui` gains `Toast` and `Mascot`.
- **Four real defects the journeys exposed, fixed at the source** (**D67**): the cold-dev-server race
  (a serial `warmup` project); a fast "1"+Enter being dropped (keys now resolved in the reducer); Enter
  re-activating the nav link after arriving by it (a set now focuses its first option); and pages with
  no descriptive title (per-route titles, WCAG 2.4.2).
- **Correcting my part 3 entry, as rule 4 says (it stays as written):** its honesty note blamed the 13
  cold failures on a half-stopped server. That was wrong. It was the cold-compile race D67 describes, now
  fixed.
- **Test changes and why:** the smoke test "header focus order is skip link, brand, then nav" now asserts
  the nav's *first link*, whatever it is, rather than a name, since the nav grows with the screens and the
  order it guards is unchanged. `axeClean` (a helper new in part 3) waits for the page's title before
  auditing (D67 #4).
- **Evidence:**
  - `pnpm verify` → green: 88 files, 944 tests; boundaries clean (256 and 83 modules); thresholds held.
  - `pnpm test:e2e`, **three cold runs** → "26 passed" each: 19 hermetic (smoke, journeys 1, 2, 6, the
    invalid import, the review empty state, the report control, titles) + 1 warm-up + 6 production (shell,
    unvisited route, every shard, journey 2 offline, journey 7, journey 4). Then the warm hermetic project
    **six times** → "20 passed" each, the load under which journey 6 had once flaked.
  - `pnpm --filter @palier/web lighthouse` on **8 routes** (`/review`, `/progress`, `/settings/data` added)
    → the first run **failed**: `/fr/progress` scored performance 0.94 on a layout shift of 0.148, because
    its static cards were drawn before the report and then pushed down. The report now renders in one
    pass. Re-run → exit 0, median performance **1.0** and accessibility **1.0** on all 8 routes.
    `/fr/progress` keeps a small shift (max 0.06, within budget), noted rather than hidden.
  - After the last two fixes (the progress layout, and the home card counting both skills' due items to
    match `/review`): `pnpm verify` → 944 passed; `pnpm test:e2e` cold → "26 passed".

### 24 September 2026 — `dougkeefe/algiers` (Slice 1, part 3: the UI's first half — onboarding, today, drill, diagnostic)

The third PR of Slice 1, and the first UI, built to the PRD direction Gate A adopted.

- **Screens** (static RSC shells, one client island each): `/start` (onboarding steps 1–4, §8.1),
  `/home` (readiness card from the new `practiceTrend`, **D64**; today's plan as §8.2's rows; "done for
  today" for D62's empty re-plan; the review count; the test-date countdown), `/practice/reading` and
  `/practice/writing` (the drill: select-then-confirm, the feedback sheet with the answer, both rationales,
  the rule and the sub-skill, keyboard 1–4/Enter, focus to the sheet heading and back to the options),
  and `/diagnostic` (coverage sample, no per-item feedback, a readout per band with its interval).
- **`ContainerProvider`** builds the browser-only container once after hydration, importing it lazily
  (shared first-load JS unchanged). The daily goal becomes a session size behind `planDay`'s seam
  (**D63**, which resolves D34). The UI calls where the PRD and the requirements disagreed are **D65**.
- **`@palier/ui`:** `BandMeter`, `Sheet`, `Passage` (+ `bandMeterGeometry`, `sheetState`, tested).
  `McqItem`'s layout CSS moved into the package, where its component lives.
- **Logic in tested `.ts`:** the drill state machine (timings, changed-answer, the key map), the study
  profile and session sizing, onboarding's steps, the trend lines. All strings are in
  `messages/{en,fr}.json` at parity, including the 18 sub-skill names.
- **Found by the gates, and fixed at the source:** axe failed the feedback sheet at contrast 1.23, because
  its slide-in faded in from `opacity: 0`; it now moves without fading (D65). Lint's
  `react-hooks/set-state-in-effect` flagged two state resets inside effects; the loaded data is now keyed
  by what it was loaded for. The drill's keys only worked while focus was inside the session; they now
  listen on the window.
- **One existing test's expectation moved, and why:** `smoke.spec.ts` "header focus order is skip link,
  brand, then nav" expected the third Tab stop to be "About". The new "Today" link is now the nav's first
  item, so the test expects "Today" then "About". The order it guards (skip link, brand, nav) is unchanged.
- **Evidence:**
  - `pnpm verify` → green: 85 files, 919 tests; boundaries clean (249 and 73 modules); thresholds held.
  - `pnpm build` → all 9 routes prerendered; `bundle-size` → "165.7 KB of 180.0 KB … within budget"
    (unchanged, so the lazy container import works).
  - `pnpm test:e2e` from a **cold** dev cache → "18 passed": 9 smoke; 5 journeys (journey 1, journey 2
    with axe on the feedback-open state, focus-on-advance, first-run set-up, French parity); 4 offline,
    including **journey 2 with the network off, start to finish**, which ticks the [R4] exit criterion.
  - **Honesty note:** one earlier cold run failed 13 tests on dev-server 500s and did not reproduce in
    three cold re-runs. It came straight after I had `pkill`ed a hand-started dev server on port 3000,
    which Playwright reuses outside CI, so a half-stopped server is the likely cause. If it recurs in CI,
    it is real and wants chasing, not retrying.
  - `pnpm --filter @palier/web lighthouse`, with `/en/start`, `/en/home` and `/fr/practice/reading` added to
    `lighthouserc.json` → exit 0; median performance **1.0** and accessibility **1.0** on all 5 routes (25 runs).

### 24 September 2026 — `dougkeefe/algiers` (Slice 1, part 2: `exportData` / `importData` / `wipeData`)

The data-rights use cases [R11], the second PR of Slice 1.

- `packages/app/src/use-cases/`: `exportData` (a versioned `palier-export` v1 document, lists sorted so
  equal state exports byte-identically, **no key-vault content**); `importData` (validates the whole file
  first, then merges without ever overwriting a local record, **D62**); `wipeData` (clears the four stores
  and the API key, **keeps the device secret**, D50). All three are bound in `buildUseCases`.
- The four store ports gain `all()`/`clear()` (**D61**, §3.3 amended in place) in the port, the memory
  impl, the Dexie impl and the contract suites. No Dexie schema change.
- **Tests:** 30 cases in `data-rights.test.ts` over stateful local stubs (D37), including every
  `parseExportDocument` rejection path. New contract cases run against memory and Dexie.
  `container.test.ts` round-trips export → wipe → import through the assembled graph, hermetic and over
  real IndexedDB, and checks the device secret survives a wipe.
- **Two test mistakes of mine, caught by running them, not implementation bugs:** (1) "the next plan
  equals the previous plan" is false by design, because the container's one seeded `Random` advances
  with every plan, so the check is now the review queue the planner reads; (2) "the restored state still
  plans a day" is false on the 10-item baseline bank. That is recorded as D62's finding for the home
  screen.
- **Evidence:** `pnpm verify` → green: 80 files, 862 tests (was 818); boundaries clean (244 and 54
  modules); coverage thresholds held.

### 24 September 2026 — `dougkeefe/algiers` (Slice 1, part 1: production composition root + offline service worker)

Human decisions first. This session is the **whole of Slice 1**, shipped as ordered PRs. **Gate A is
resolved** by adopting the PRD's already-specified UI direction (Phase 2 section). This entry covers the
first PR: the web slice.

- **Composition root** (`apps/web/src/lib/container.ts`): the production path no longer throws. It wires
  `httpBankRepository({ baseUrl: "/content", version: 1 })`, `dexieStores()`, `webCryptoIdGenerator()`,
  a new `systemClock()` and `seededRandom(selectionSeedFor(now))` (**D58**). It is **browser-only**, and
  its in-memory half now comes through a new bundleable `@palier/testing/in-memory` subpath (**D59**).
- **Offline [R4]** (**D60**): `scripts/prepare-public.mjs` copies `content/bank/` into a gitignored
  `public/content/` and compiles `src/sw/worker.ts` to `public/sw.js` (no new dependency). The worker
  precaches every route × locale and the whole bank, and serves the bank and `/_next/static/`
  cache-first. It registers in production builds only. `apps/web/turbo.json` makes a bank change bust the
  web build cache. `next.config.ts` sets the `/sw.js` and bank cache headers.
- **Tests:** `container.test.ts` runs the real production graph over `fake-indexeddb`, planning a day from
  the **committed** bank (every planned id checked against the shards on disk). 19 worker cases run over
  an in-memory `CacheStorage`; a compile-and-run check holds the worker to no runtime imports. Also
  `register.test.ts`, `system-clock.test.ts`, and the `in-memory` module-graph guard. A new Playwright
  `offline` project runs on `next start`.
- **Evidence:**
  - `pnpm verify` → green: 79 files, 818 tests; boundaries "no dependency violations found" (239 and 54
    modules); coverage thresholds held.
  - `pnpm build` → green; `pnpm --filter @palier/web bundle-size` → "shared first-load JS (gzipped):
    165.7 KB of 180.0 KB … within budget".
  - `pnpm test:e2e` → "12 passed": 9 hermetic smoke + 3 offline — shell reload, an unvisited `/fr/about`,
    every bank shard.
  - **Proven to bite:** with the worker's `strategyFor` forced to passthrough, all 3 offline cases failed
    with `net::ERR_INTERNET_DISCONNECTED`; restored byte-identical (`cmp`) and green again.
  - `pnpm --filter @palier/web lighthouse` → exit 0, perf & a11y ≥ 0.95 on `/en` and `/fr`, 5 runs each.
- **Not ticked:** the [R4] exit criterion. The shell and bank work offline, but "full offline operation"
  means *doing a session* offline, which needs the Slice 1 UI. It is ticked when journey 2 passes on the
  `offline` project.
- *Next, decided* → the data use cases (`exportData`/`importData`/`wipeData`).

### 24 September 2026 — `dougkeefe/continue-dev-from-progress-v3` (bank hardening + content-sequencing decision)

Reviewed the `adapters/bank` change and hardened one finding, then recorded a product decision.

- **Fix:** `httpBankRepository` cached rejected promises, so a transient manifest/shard fetch failure
  (a 5xx, or an offline first read on the one long-lived instance the composition root builds) poisoned
  the instance permanently — every later bank read failed until a page reload. Each of the five caches
  now clears its own slot on rejection (a `.catch` that resets the `??=` promise or `delete`s the map
  entry), so only *fulfilled* results are cached; a later call retries. Named test added
  (`retries the manifest after a transient failure…`). `pnpm verify` green.
- **Decision (D56):** feature phases 2–6 are built against the **baseline committed bank**; the
  full-volume content run (D54) is sequenced to a **1.0 gate**, not a per-phase blocker. Human choice:
  get the product feature-complete first, gate on content last. Recorded the synthetic-baseline caveat
  (feature-usable ≠ study-ready) in D56 and the standing gates. *Next, decided* is unchanged — the
  Phase-2 web slice remains the next buildable step.
- **Plan (D57):** grouped Phase 2's remaining work into **three** bigger slices (single-device app →
  multi-device sync → convergence + launch) with two named human gates (A: product/UI direction; B: the
  D43 merge). Documented in **both** `implementation-plan.md` §7 Phase 2 and the Phase 2 section here,
  required to agree. Human decision on grain (three, larger) and on the two-document mirror.

### 24 September 2026 — `dougkeefe/moroni` (open Phase 2; `adapters/bank`, the HTTP `ItemRepository`)

Formally opened **Phase 2** (status row → in progress; §7 work breakdown expanded into the Phase 2
section with the already-landed pieces ticked) and built the slice *Next, decided* had queued:
**`adapters/bank`**, the fourth of the five §3.2 adapter directories.

- `packages/adapters/src/bank/`: `httpBankRepository({ baseUrl, version?, fetchImpl? })` implements
  the `ItemRepository` port over `fetch`. The manifest is fetched once and memoized; a `query`
  fetches **only** the shards whose `skill` it needs (a reading query never pulls the writing shard);
  each shard is cached by its content-hashed path, so a hit is a hit forever. `byIds` loads all item
  shards (the manifest carries no id→shard index — noted in the code). `form(id)` fetches only the
  mapped file; `scenario(id)` reads the un-manifested `oral/scenarios.json` and treats its 404 as
  "no scenarios", not an error. Public surface is the port plus `BankUnavailableError`/
  `BankContentError`; the manifest type and `FetchLike` stay internal (adapters/CLAUDE.md).
- Structure-checks the edge rather than re-running the domain Zod schemas — **D55**, because the
  shared contract's fixtures are deliberately schema-incomplete and the bank is our own
  build-validated content. The package stays zod-free.
- Held to `itemRepositoryContract` from `@palier/testing` (the same suite the in-memory repo passes),
  served through a new **`bankHandlers`** MSW helper added to `@palier/testing` (a small re-impl of
  the factory's `buildBank` grouping; testing may not import the factory). Adapter-specific tests
  cover manifest memoization, lazy per-skill loading, the content-hash cache, form/scenario laziness,
  error translation, malformed-manifest rejection, and **reading the real committed
  `content/bank/v1/` off disk** (10 items / 8 passages / `bankVersion 1`). `bankHandlers` has its own
  unit test in the testing project (its cross-project execution from `adapters` does not attribute
  coverage — same reason the pre-existing `handlers.ts` reads 0%).
- Wiring: `./bank` export opened (D3); `adapters-bank` eslint element added (D5).

**Verification.** `pnpm verify` → **EXIT=0**. `check-types` clean; `lint` clean; `boundaries` clean
(237 modules, no violations); **780 tests pass** (+ 8 todo), 74 files; coverage thresholds all met
(branches 95.42% overall; `packages/adapters/src/**` and `packages/testing/src/**` both back above
their 90% bars after the `bankHandlers` unit test).

**Next, decided** rewritten to the Phase-2 **web slice**: wire the bank into the composition root
with a content-hash service-worker cache for offline use [R4].

### 24 September 2026 — `dougkeefe/phase-1-implementation` (first real-model run of the factory, and the hardening it forced)

Ran the pipeline against real OpenAI models on a funded key (drafter `gpt-6-luna`, reviewer
`gpt-6-sol`) — the deferred D54 run, done by the owner. **The load-bearing assumptions look
supported:** the drafter produced authentic Canadian federal-workplace French (the reviewer's own
notes repeatedly called it "natural," "idiomatic," "Canadian," "not France-specific, not
translated"), and blind cross-family review caught real defects (defensible distractors, low
confidence). Cost ≈ 0.03 USD/item at placeholder pricing. **This is the real go signal Phase 1
existed to produce** (D54's numbers now exist; the *published bank* still awaits a full-volume run).

Five things the real run exposed and forced, each fixed and tested:

- **Register over-flagging.** The review prompt said "flag … textbook," and the reviewer dutifully
  flagged legitimately-formal administrative prose — yield 0.083. Recalibrated (prompt v3): flag
  register **only** for translated / France-specific / artificial-textbook French; formal Canadian
  public-service register is correct and must not be flagged. Yield → 0.85.
- **Key-position bias.** The real model put the answer at "a" ~85% of the time (published keys
  a:11/b:0/c:1/d:1) — a gameable bank, correctly caught by the §4.5 key-position check. Fixed by a
  deterministic, content-seeded **option shuffle at assembly** (`debiasKeyPosition`), so the key
  distributes uniformly regardless of drafter bias. The scripted reviewer now finds the answer by a
  content marker (`CORRECT_MARKER`) rather than a stem hash, so it survives the shuffle.
- **Brittleness.** One malformed response aborted the whole batch. Now each draft/passage call is
  caught and skipped (discard-not-repair, §4.3), surfaced as a `providerFailures` count.
- **Shape compliance.** The model sometimes omitted `rationale`; the drafting prompt now carries a
  filled example and insists every option include both-locale rationale (prompt v2). No failures after.
- **Bank-build debris.** `writeBank` now clears `content/bank/v{n}` before writing, so a rebuild
  leaves no stale content-hashed shards (idempotent output).

Also: the factory bin auto-loads a repo-root `.env` via Node's built-in loader (no `dotenv`
dependency), so a BYOK key needs no `export`. Diagnostics added: a `discard reasons` tally and
committed `drafted.json`/`discards.json`. The committed sample remains the **reproducible scripted**
one (CI-safe, no key); real content is a `--provider openai` run.

Verified: `pnpm verify` green — **749 tests + 8 todo**, coverage thresholds met (overall branches 95.4%).

### 23 September 2026 — `dougkeefe/lilongwe` (full Phase 1 — the automated content factory, ADR 19)

Built the whole Phase-1 subsystem, gated automatically, ending with a committed reproducible sample
batch. **ADR 20** (AI DTOs live in `@palier/domain`); deviations **D52** (`AiProvider` Phase-1 subset,
§3.3 amended: `generatePassage` added, `generate*` return drafts), **D53** (openai adapter over
`fetch`, no SDK dependency), **D54** (scripted-provider sample run; paid run deferred; harvest-from-seed;
near-dup via Jaccard).

Built:

- **`@palier/domain`**: the AI boundary DTOs (`ai.ts`) — `AiCapabilities`, the generate/review request
  types, `ItemDraft`/`PassageDraft`, `ReviewVerdict`, `UsageRecord` — and their structured-output
  re-validation schemas (`schemas/ai.ts`), barrel-exported; **not** in `CONTENT_SCHEMAS` (DTOs, not
  content artefacts). 100% coverage held.
- **`@palier/app`**: `ports/ai-provider.ts` — the Phase-1 `AiProvider` interface, referencing the
  domain DTOs; barrel-exported.
- **`@palier/testing`**: `fakeAiProvider` + `aiProviderContract`, wired into `contracts-run.test.ts`.
- **`@palier/adapters/openai`**: `openAiProvider` over `fetch` — model config as data, `json_object`
  structured output with Zod re-validation + one retry, usage→`UsageRecord`, full HTTP/network/malformed
  error translation into our types (`errors.ts`), no `openai` module imported. Held to `aiProviderContract`
  (canned `fetch`) plus retry/error/usage/base-url unit tests. `./openai` subpath live (D3); new
  `adapters-openai` eslint-boundaries element (D5). Re-exports the `AiProvider` type so the factory needs
  no `@palier/app` dependency.
- **`apps/factory`**: the five-stage CLI — `harvest` (licence gate over a committed GC source seed) →
  `passages` (assemble + deterministic checks) → `draft` (via the registry's `generatePrompt`) → `review`
  (blind gate, discard-not-repair) → `validate` (schema + registry `validate` + near-dup + key-distribution
  + reading-level + form resolution) → `bank-build` (content-hashed shards + manifest, byte-reproducible).
  Plus `scriptedAiProvider`, a metering wrapper, the batch report, and the 50-item defect eval set with a
  detection harness and a clean control. `config/models.json`+`pricing.json`; `index.ts`/`io.ts`/`cli.ts`
  wiring. `apps/factory/CLAUDE.md` written.
- **Committed sample batch** (`PALIER_NOW` pinned): `content/factory/{source-queue,batch-report,eval-report}.json`
  and `content/bank/v1/…`. 8 sources (1 rejected on licence), 8 passages, 26 drafted, **15 passed
  (yield 0.577)**, 10 published; **eval detection 1.000 in every class**; cost/item 0.133 USD;
  rebuild byte-identical (verified by regenerate + `diff -r`).

Docs updated in the same session (per §10): **ADR 20** added; `packages/{domain,app,adapters}/CLAUDE.md`
and new `apps/factory/CLAUDE.md`; `implementation-plan.md` §3.3 (AiProvider subset note) and
`content-factory.md` (scripted-run amendment); this file (header, In-flight, Phase-1 checklist ticked,
D52–D54, *Next, decided*).

Verified: **`pnpm verify` green** — check-types, lint, boundaries (no arrow/vendor violation; `openai`
confined; no SDK type in the published `.d.ts`), and **742 tests + 8 todo pass** with every coverage
threshold met (domain 100%, app 95%, adapters 90%, factory 90%, testing 90%; overall branches 95.23%).

### 21 September 2026 — `dougkeefe/osaka-v1` (`adapters/dexie` — the five local store ports, incl. the encrypted `KeyVault`)

The first of the five §3.2 adapter directories, built with human sign-off (the store adapters were
mis-gated by the prior *Next, decided* — see **D49**). The `KeyVault` was built now rather than
deferred to Phase 4, at the human's request, with its key-leak test (**D50**).

Built under `packages/adapters/src/dexie/`:

- `db.ts` — `PalierDb`, a `Dexie` subclass declaring `architecture.md` §9.1's `version(1)` verbatim
  (all thirteen tables). Lazy `this.table()` getters, not `field!: Table<...>` (ES2022
  `useDefineForClassFields` would clobber Dexie's assignment). Internal, not exported.
- `attempt-store.ts`, `schedule-store.ts`, `session-store.ts`, `settings-store.ts` — the four store
  ports. `append` reports the duplicate-id no-op as `false` via the `ConstraintError` name;
  `schedule.due` excludes retired (`due: null`) entries for free (IndexedDB does not index a null
  key path) while `get` still returns them; `sessions` translates its `type` column to the port's
  `mode`; `complete` is keep-first-write.
- `key-vault.ts` — `dexieKeyVault`. AES-GCM at rest under a **non-extractable** `CryptoKey` held in
  IndexedDB, §6.2 as written (an HKDF-from-stored-bytes variant was considered and rejected in
  review — it would let a storage-reader decrypt offline; D50). `withApiKey` callback discipline, no
  `getApiKey`; `device-secret` kept separate as the sync identity seed.
- `index.ts` — the whole public surface: `dexieStores(name?)`, returning the five ports bound to one
  `PalierDb`, every field a port type so **no Dexie type crosses the boundary**. `PalierDb` and the
  factories stay internal (tests reach them by relative import).
- Tests: each store's contract suite (`@palier/testing`) run against the Dexie impl, plus
  adapter-specific tests (reopen survival, ciphertext-at-rest, wrong-secret-fails-to-decrypt). The
  `keyVaultContract` `it.todo` key-leak placeholder promoted to a real assertion (D50).

Config/deps: `dexie@4.4.6` added to `@palier/adapters` (pre-decided by ADR 10 / §9.1, already
scoped by `no-dexie-outside-adapters`); `@palier/testing/setup` (fake-indexeddb) added to the
`adapters` fast-lane Vitest project so the stores test in Node, not only under Playwright.

Docs updated in the same commit (per §10): `packages/adapters/CLAUDE.md` (the `/dexie` invariants),
`architecture.md` §6.2 (the HKDF note) and §9.1 (five stores implemented), `implementation-plan.md`
§7 Phase 4 (the vault's storage half + unit-level key-leak test landed early), and this file
(D49/D50, status, In-flight, *Next, decided* now `adapters/bank`, D3/D5 updates).

Verified: `pnpm verify` green — check-types, lint, boundaries (**181 modules, no violations**;
`dexie` confined to `adapters/dexie`), and **637 tests + 8 todo pass**, coverage thresholds met
(branches 97.56% overall; `adapters/src/dexie` 96.15% branch / 100% funcs+lines, past the 90% bar).

### 21 September 2026 — `dougkeefe/continue-docs-progress-v2` (the `IdGenerator` port and the first adapter, `/ids`)

Step 2 of the decided runway, and the end of it: the mechanism D39 named. Deviation **D48**, which
**resolves D3 and D5 for `ids`** and closes the open half of D39. A port §3.3 does not name; no ADR;
no npm dependency (`globalThis.crypto`).

Built:

- `packages/app/src/ports/id-generator.ts` — `IdGenerator = { ulid(): string }`, content-agnostic:
  the port mints, the caller brands (`attemptId(gen.ulid())`). Exported from the ports barrel and
  `src/index.ts`.
- `packages/adapters/src/ids/` — `webCryptoIdGenerator`, a hand-written Crockford base32 ULID over
  Web Crypto, monotonic within a millisecond (`now`/`randomBytes` injectable for deterministic
  branch tests). The **first `@palier/adapters` directory**; `./ids` is the first real subpath
  export (D3), and it is its own `eslint-plugin-boundaries` element `adapters-ids` (D5 split).
- `packages/testing/src/ids/counter-id-generator.ts` — `counterIdGenerator`, deterministic (a
  counter in the ULID's random field over a fixed timestamp), so a hermetic run is reproducible.
- `packages/testing/src/contracts/id-generator.contract.ts` — `idGeneratorContract` (valid 26-char
  Crockford, unique, strictly increasing), run against **both** implementations.
- `apps/web/src/lib/container.ts` — `ids` joins `Ports` (hermetic: the counter); the production
  path still throws, so the Web Crypto adapter has no live wiring yet (proven by its own suite + the
  contract), the `settings`/`vault` precedent. Container test asserts `ids` mints increasing ULIDs.
- CLAUDE.md updated in the same commit for `@palier/app` (the new port), `@palier/adapters` (the
  `/ids` subpath + element split) and `@palier/testing` (the counter + contract), per §10.

Verified: `pnpm verify` green — check-types, lint, boundaries (167 modules, no violations), and
**590 tests + 5 todo pass** with coverage thresholds met (branches 97.65%).

### 21 September 2026 — `dougkeefe/continue-docs-progress-v2` (`RunDiagnostic`: the last practice-loop use case)

Step 1 of the decided runway ([Next, decided](#next-decided)): `RunDiagnostic`, the one clean slice
left needing **no new port and no new adapter**. Deviation **D47** (it is two use cases; the
diagnostic carries a `targetBand` its selection ignores). No ADR, no npm dependency.

Built:

- `packages/app/src/use-cases/run-diagnostic.ts` — `runDiagnostic(request, deps)`: `query({ skill })`
  + a generous `recent` slice, then `selectItems(mode: "diagnostic")` (D33 coverage sampler). Returns
  `{ items }`. `targetBand`/`count` are request fields (D47).
- `packages/app/src/use-cases/diagnostic-readout.ts` — `diagnosticReadout(request, deps)`: fetch
  recent attempts, filter to `mode === "diagnostic"`, resolve items, return `calculateTrend(…)` — the
  R10 "accuracy per band tag with its interval" readout.
- Barrels (`use-cases/index.ts`, `src/index.ts`) export both; `apps/web/src/lib/container.ts` binds
  them into `UseCases`/`buildUseCases` over the existing ports (no new port in `Ports`).
- Tests (D37 local stubs, 95% branch): `run-diagnostic.test.ts` (clock read once, pool query,
  injected randomness, requested count, multi-band coverage, reproducibility, empty pool);
  `diagnostic-readout.test.ts` (Wilson interval over diagnostic attempts, drill exclusion, resolves
  only diagnostic items, insufficient below `MIN_EVIDENCE`, absent-item tolerance, empty when none);
  a container end-to-end test (select → answer each in diagnostic mode → read accuracy per band).

Verified: `pnpm verify` green — check-types, lint, boundaries (161 modules, no violations), and
**578 tests + 5 todo pass** with coverage thresholds met (branches 97.6%).

### 21 September 2026 — `dougkeefe/continue-dev-from-docs-v4` (making the next direction decided, not a menu)

A separate entry rather than an edit to the one below (working-agreement rule 4), for the same
session: after the `SessionStore` slice landed, the *Suggested next three* was rewritten into
**[Next, decided](#next-decided)** — a committed order, not a trade-off menu. The reason it *could*
be: the pure content-agnostic layers (engine core, the `@palier/app` practice loop) are nearly
built out, so the "which unspecified port do we decide next" fork that made every recent slice a
judgement call is almost gone. The decided order is `RunDiagnostic` (no new port or adapter — the
engine's `selectItems(mode: "diagnostic")` and `calculateTrend` already exist), then the
`IdGenerator` port + the first adapter directory (D39, opening D3/D5), then **a human gate**: Phase 2
proper (real adapters + UI) is explicitly *not* an autonomous slice, because it needs product/UI
direction and leans on the Phase 1 content go/no-go. The top-of-file `Next step` line and the
section now say this in place. Docs only; no code changed, so `pnpm verify` is unaffected.

### 21 September 2026 — `dougkeefe/continue-dev-from-docs-v4` (the `SessionStore` port and `StartSession`/`CompleteSession`)

The *Suggested next three*' #1, "the one that unblocks the most": the last named-but-unspecified
persistence port and the two use cases that open and close a day. Ahead of Phase 2, on the same
content-agnostic sequencing as the engine core, `planDailySession` and `answerItem`. Deviations
**D45** (the `SessionStore` shape) and **D46** (the two use cases), and **D46 closes the
`lastDayCompleted` half of D36**. No ADR (§3 and the eight principles untouched — D38's precedent
for filling a port §3.3 already names). No npm dependency added.

Built:

- `packages/app/src/ports/session-store.ts` — `Session = { id, mode, startedAt, completedAt: ISO | null }`,
  `SessionStore = { create, complete, latest }`. The minimum its two consumers need; §3.3 amended
  in place. `Session` lives in `@palier/app` (the `ScheduleEntry` precedent), not `@palier/domain`.
- `packages/app/src/use-cases/start-session.ts` — `startSession(request, deps)`: reads
  `sessions.latest()` **before** creating this session (the ordering is load-bearing; see D46),
  derives `lastDayCompleted`, composes `planDailySession`, then creates the in-progress session
  *after* a successful plan. Caller-supplied id (D39).
- `packages/app/src/use-cases/complete-session.ts` — `completeSession(request, deps)`: stamps
  `completedAt` from the clock, returns the closed session, throws `UnknownSessionError` on an
  unknown id. Keep-first-write, so a double-submit is idempotent.
- `packages/testing` — `memorySessionStore` (insertion order breaks a `startedAt` tie in `latest()`;
  keep-first `complete`), `sessionStoreContract` (seven cases + `it.todo("survives a reopen")`),
  `aSession` builder. Barrels and `contracts-run.test.ts` updated.
- `apps/web/src/lib/container.ts` — `sessions: memorySessionStore()` joins `Ports`; `startSession`
  and `completeSession` join the `UseCases` graph.

Tests: `start-session.test.ts` (9) and `complete-session.test.ts` (5), local stubs per D37;
`container.test.ts` gained the full-loop wiring test (start → answer every item → complete → start
again). One test corrected during the run — an initial `clock.now` "called once" assertion was
wrong, because the composed `planDailySession` legitimately reads the same injected clock a second
time; changed to assert the clock is used, not a count. That is a real property of composing the
planner, not a defect.

**Verified:** `pnpm verify` green (**exit 0**) — check-types 14/14, lint clean, depcruise clean
(**157 modules, 476 dependencies** in packages, up 7/30 from the previous 150/446; **37 modules,
52 dependencies** in `apps/web`, unchanged — `@palier/app` still reaches `@palier/domain` +
`@palier/engine` only, `@palier/testing` still only `app` + `domain`, no new arrow), and the full
root Vitest run: **563 passed, 5 todo, 47 files**, overall branches 97.6%, every glob coverage
threshold held.

**A gate proven to bite:** creating the session *before* reading `latest()` (the wrong order)
failed both `reads the previous session before it creates this one …` and the orphan-guard test
`does not create a session when planning fails …`; reverted, and `pnpm verify` green again at
exit 0.

**Next:** the *Suggested next three*' #2 (`IdGenerator` port + the first adapter directory, closing
D39 and opening D3/D5) and #3 (`RunDiagnostic`, which needs no new port). `StartSession`'s
caller-supplied id makes #2 the natural follow-on: it is what will mint the session and attempt ids
the drill route threads.

### 20 September 2026 — `dougkeefe/continue-docs-progress-v1` (documentation reconciliation for `answerItem`)

A separate entry rather than an edit to the one below, because rule 4 of the working agreement
says append and never rewrite — even for the same session on the same day.

A sweep for documentation the `answerItem` work made stale. **D43** is the one finding that is
not bookkeeping: `ScheduleEntry` is a synced record with no `updatedAt`, so §9.4's
last-write-wins rule does not actually cover it, and applying it naively would let an item's
Leitner box go backwards. Found by updating `architecture.md` for D38, not by a test — nothing
in the build could have caught it, because the sync adapter does not exist yet.

Changed:

- `architecture.md` §9.1 — the `ScheduleEntry` shape beside the `Attempt` one, with three notes
  for the Phase 2 Dexie author: why the `stores()` string is unchanged (`box` is a field, not an
  index), why the nullable `due` is load-bearing (IndexedDB will not index a null key path, which
  is how retired entries leave the queue for free), and the sync gap. §9.4 now admits the gap in
  place.
- `implementation-plan.md` §3.2 — `@palier/content` recorded as a seventh *workspace* and not a
  seventh package, since §3.2 is authoritative for module structure. §3.5 — the composition-root
  sketch now parses the profile, and carries the two warnings that cost this session real time:
  **`seededRandom()` is the selection randomness and not an entropy source**, and the profile is
  configuration handed down rather than a port. §4 — "sixteen decision records" corrected to
  eighteen (it was already wrong by one before this session). §7 — the Phase 2 sync bullet now
  names the D43 decision as work.
- `packages/app/src/ports/time.ts` — the same warning on the `Random` port itself, which is where
  someone will actually read it. This is the countermeasure that would have prevented D39.
- `README.md` — the layout table gains `content`, and the status paragraph no longer claims
  `engine` is "mostly empty"; the pure core has been complete since the previous session, so that
  sentence was already stale.
- `docs/README.md` — revision history 0.3, and the line instructing a dissenting maintainer to
  "write ADR 16" corrected to "write a new ADR", which is the rule D16 settled after that exact
  sentence helped cause the collision it records.
- `CLAUDE.md` — 17 records to 18.

Nothing in `product-requirements.md` needed changing: D41 brought the code to §6.5 rather than
the other way round. `packages/domain/CLAUDE.md` and `packages/engine/CLAUDE.md` are untouched,
because neither package changed — which is the point of having withdrawn D39 and D40.

**Verified:** `pnpm verify` green (**exit 0**) after the documentation pass — 539 tests passed,
4 todo, 45 files; depcruise clean at the same 150/446 and 37/52.

### 20 September 2026 — `dougkeefe/continue-docs-progress-v1` (the second `@palier/app` use case: `answerItem`)

The use case *Suggested next three* named, built ahead of Phase 2 on the same content-agnostic
sequencing as the engine core and `planDailySession`. It **closes D19**: `ScheduleEntry` is
complete and something finally writes it. Deviations **D38** (the port reshape, and why ADR 16
does not bite), **D39** (the `attemptId` is caller-supplied — the planned mint from `Random` was
a correctness bug), **D40** (the `slow` threshold withdrawn before it was written), **D41** (not
every answer enters the queue) and **D42** (`ExamProfile` as a dep; `content/` as a workspace).
One ADR: **18**, content ships as a workspace package. No npm dependency added.

**An adversarial review of the plan changed it, and that is the main thing worth recording.** The
approved plan had three defects, all caught by reading the files rather than by a test: minting
attempt ULIDs from the `Random` port (silent attempt loss on a second device, green in every
test because the hermetic container is deterministic — D39); a `SLOW_ANSWER_MS` keyed on
`msToConfirm`, which on a `comprehension` item includes reading the passage (D40); and
scheduling every answer, contradicting `product-requirements.md` §6.5 (D41). Two of the three
would have shipped looking correct.

Built:

- `packages/app/src/ports/schedule-store.ts` — `ScheduleEntry` is
  `{ itemId, due: ISO | null, skill, box }`; `ScheduleStore` gained `get(id)`. §3.3 amended in
  place with a dated note.
- `packages/app/src/use-cases/answer-item.ts` — `answerItem(request, deps)`: reads `clock.now()`
  once, resolves the item via `items.byIds` (absent ⇒ `UnknownItemError`), scores through
  `itemTypeDefinition(item.type).score`, appends the `Attempt` **before** touching the schedule
  (so the append-only record survives a failed schedule write), then reads the current box, runs
  `scheduleReview` and persists the `Review`. Pure orchestration; the clamp on a stored box is
  the only arithmetic.
- `packages/testing` — `memoryScheduleStore` gained `get` and hides retired (`due: null`)
  entries from `due()`; `scheduleStoreContract` gained four cases; `aScheduleEntry` defaults
  `box: 1`.
- `content/package.json` + `pnpm-workspace.yaml` — `@palier/content` (ADR 18).
- `apps/web/src/lib/container.ts` — parses the profile once from
  `@palier/content/profiles/psc-sle.json`; `answerItem` joins `UseCases`. Its stale "exposes no
  `buildUseCases` yet" paragraph, which had contradicted the one below it since D36, is gone.

Tests: `answer-item.test.ts` (24, local stubs per D37) across three groups — the attempt record,
which answers enter the queue (D41), and the Leitner move persisted. It reads the **real**
profile off disk rather than inventing four intervals, so a real interval change cannot pass
unnoticed. `plan-daily-session.test.ts` updated for the reshape (the compiler found all five
sites). `container.test.ts` gained the end-to-end graph test: plan a session from the fixture
bank, answer its first item wrongly, and see the attempt and the box-1 entry land.

**Verified:** `pnpm verify` green (**exit 0**) — check-types 14/14, lint clean, depcruise clean
(**150 modules, 446 dependencies** in packages, **37 modules, 52 dependencies** in `apps/web`;
`@palier/app` still reaches `@palier/domain` + `@palier/engine` only, no new arrow), **539 tests
passed, 4 todo, 45 files**. Every glob coverage threshold held (overall branches 97.48%).
`answerItem` confirmed in `packages/app/dist/index.js` (D6).

**Three gates proven to bite, each by breaking it and reverting:** replacing the stored-box read
with a constant box 1 failed six tests while `starts an unseen item in box 1` still passed;
removing the D41 entry guard failed exactly `does not schedule a correct, fast, unwavering answer
to an unscheduled item`; and making `due()` return retired entries failed the new contract case.
**One honest note on that third one:** the first attempt to break it did *not* fail, because
`Date.parse(null)` is `NaN` and `NaN <= x` is false, so the date filter excludes retired entries
even without the explicit null check. The explicit `isQueued` filter is kept anyway — relying on
a coercion accident is not a contract — but the contract case only bites against an
implementation that genuinely returns them, which is what the second attempt confirmed.

The `@palier/content` wiring was proven **first**, before any use-case code, against all three
gates (`tsc --noEmit`, `depcruise`, Turbopack build), because a failure there would have meant
redesigning late.

**Next:** `StartSession` / `CompleteSession`, which need the deferred `SessionStore` (D18) — it
is what `lastDayCompleted` has been waiting for. The `IdGenerator` port (D39) and the first
adapter directory are the other open thread, and they are the same PR if the Phase 2 drill route
drives both.

### 20 September 2026 — `dougkeefe/naypyidaw` (the first `@palier/app` use case: `planDailySession`)

The first `@palier/app` use case, ahead of Phase 2 as a content-agnostic sequencing move (the same
one that built the engine core early; `implementation-plan.md` §7). It makes the ports layer
load-bearing (ADR 10) and first exercises the D32 bridge. Deviations **D36** (the use case, its
convention, naming and input boundary) and **D37** (app tests use local stubs, not `@palier/testing`,
because that package depends on `@palier/app`) recorded. No ADR — §3 and the eight principles are
untouched. No dependency added.

Built:

- `packages/app/src/use-cases/plan-daily-session.ts` — `planDailySession(request, deps)`: reads
  `clock.now()`, `schedule.due(now, sessionSize)` → resolves entries to items via `items.byIds`,
  queries the pool via `items.query({ skill, exclude: dueIds })`, reads `attempts.recent(skill, 500)`,
  and calls the engine `planDay(input, () => random.next(), now)`. Pure orchestration — no algorithm
  (the CLAUDE.md mistake #3). First runtime export from `@palier/app`; barrel + `src/use-cases/index.ts`
  export it.
- `apps/web/src/lib/container.ts` — `buildUseCases(ports)` binds the use case to the ports; `Container`
  gains `useCases`; the hermetic `items` became `fixtureBankRepository()` (closes D31). Header comment
  updated.

Tests: `plan-daily-session.test.ts` (11 tests, local stubs per D37) — reads the clock once and asks
the schedule for what is due at that instant; resolves due entries to reviews; excludes due ids from
the pool query; fetches recent attempts for the skill; threads the injected randomness; reproducible
under the same seed; normal plan with no test date/flag; tapers within the test-date window; shortens
after an incomplete day; no reviews but still fills when nothing is due; tolerates a due entry whose
item is absent. `apps/web/src/lib/container.test.ts` extended: the use-case graph is assembled and
plans a non-empty daily session from the fixture bank.

**Verified:** `pnpm build` green (8/8), then `pnpm verify` green (**exit 0**) — check-types 14/14,
lint clean, depcruise clean (**148 modules, 432 dependencies** in packages — `@palier/app` still
imports `@palier/domain` + `@palier/engine` only, no new arrow; **36 in `apps/web`**, +2 for the
engine `DayPlan` type and the `@palier/app` use-case import), **510 tests passed, 4 todo, 44 files**.
Every glob coverage threshold held (`@palier/app` ≥95% branch; overall branches 97.39%). The
**exclude-due-ids guard was proven to bite** — dropping `exclude: dueIds` failed `excludes the due
item ids from the candidate pool query`, then reverted. `planDailySession` confirmed present in
`packages/app/dist/index.js` (D6). **Next:** `AnswerItem`, which closes D19 (see Suggested next).

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
