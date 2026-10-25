# Palier: Progress archive, history

Moved verbatim from `docs/progress.md` on 24 October 2026 (D255): the long form of its *Current phase* field, the
list of merged rows its *In flight* table had removed, and the checklists of every phase complete by then. The
status table in `progress.md` is the current summary; this is how the build got there.

## The *Current phase* field, as it stood on 24 October 2026

**Current phase:** **1.0 is reached** (24 October 2026, D253): the human passed Gate O and Gate M and read bank v4 with no
disagreement, so Phases 6 and 7 are complete. After 1.0, reading's library articles are built (D254), and D206's bank budget is next. The history follows.
**Phase 7 (Polish and hardening, 1.0) opened** on 28 September 2026. **Phase 6's decision gate is
resolved: studio mode is deferred past 1.0** (D131, human), so Phase 7 follows Phase 5 directly. It is planned as four
slices and three gates (D132). **Slice 1, security hardening, merged (#39)**, **Slice 2 merged (#45)**, **Gate K is
resolved** (D145, human, 29 September 2026), **Slice 3 merged (#47**; D146–D152), the relicense merged (#48, D153), the
**cleanup slice** merged (#49; D154–D158), and **Slice 4 is built** (`dougkeefe/smoke-key-next-slice`; D159–D162). Phase 3's
product pilot still runs beside it (Gate E). The history, oldest first: **Phase 2 is complete**: the last
exit criterion, "shared with a handful of people", was confirmed by the human on 24 September 2026. They
paired two real browsers on https://palier-virid.vercel.app and shared the link. Phase 3 is sliced as
four, mirrored in `implementation-plan.md` §7 (D79). **Slices 1–3 merged (#22, #23, #25); Gate D is resolved
(D84); Slice 4 (telemetry and the item-statistics job) is built** (`dougkeefe/next-progress-slice`; D92–D94),
so exit criteria 1–4 are met. **Every buildable Phase 3 item is done.** Gate E is resolved (D97): the
closed pilot runs now as a **product pilot** on the baseline bank, run by the human, and it ticks the last
criterion. **Phase 4 started beside it: Slice 1, "the key, safely", merged (#28; D98–D100)**, meeting Phase 4's
exit criterion 1 and the first half of 2. **Slice 2, "spend", is built** (`dougkeefe/next-progress-slice-v2`; D101–D104):
the cost ledger, pricing as data, the meter, the soft cap and the pre-flight estimate. **Gate G passed** the
same day: the meter matched OpenAI's billing exactly, which meets Phase 4's exit criterion 3. Slice 2 merged (#30).
**Slice 3, "the writing workshop", merged (#31; D105–D108).** **Slice 4, "runtime item generation and the CI gates",
is built** (`dougkeefe/next-progress-slice-v4`; D109–D112): the review gate in domain, `generatePracticeSet` on the
user's key (written expression only), device-local generated sets at `/practice/writing/generate`, and the Phase 4
CI gates: live-recorded schema-conformance fixtures, which found and fixed a review-prompt defect, the eval's
conformance rate and the nightly live smoke. **That ticks exit criterion 2, and Phase 4 is complete** (merged, #32).
Gate H, Phase 5's direction, is resolved (D113), so Phase 5 is planned as three slices. **Slice 1, "the session core,
no UI", merged (#34; D114–D116)**: scenarios through the bank (bank v3, with v2's forms carried forward), the
`OralStore` with §9.1's retention, the engine's session machine, and the `OralTransport` port, driven end to end over a
fake transport, which ticks exit criterion 5. **Slice 2, "the turn loop on the key", is built** (`dougkeefe/next-slice-from-progress-v2`;
D117–D120): `transcribe`, `speak` and `examinerTurn` on gpt-transcribe, tts-1 and the text model, the `AnswerSource`
port and `turnBasedTransport`, `/practice/oral` in practice mode with typed answers, local recording, and the key-leak
test extended to audio, which ticks exit criterion 3. It merged (#35). **Slice 3, "`assessOral` and the report", merged (#37)**
(`dougkeefe/check-last-branch-commit`; D122–D127): `assessOral` on the `assess` role, fluency metrics in the engine, the
report at `/practice/oral/report`, the fixes into tomorrow's plan (closing D35), a session's cost from its own ledger rows,
and the stability eval. Gate J is deferred by the human, so pronunciation reads "not assessed". **Exit criterion 4 is met** (D128): the scorer
gave the same band on every criterion in all five live reports. **Gate I passed** (D129, human). **Phase 5 is complete on four of its five criteria**: the fifth, the real session's cost
check, is deferred by the human (D130). Phase 6's decision gate was then resolved the same day: **studio mode waits until
after 1.0** (D131). See [Next, decided](#next-decided). The **full-volume published bank** (D54) is still a standing human gate, **sequenced to the end** (D56): every feature
phase before 1.0 (2–5) is built against the baseline committed bank, now `content/bank/v3`, and the content gate
runs at 1.0. **Phase 7 Slice 1 merged (#39)**, and **Slice 2, server lifecycle and observability, merged (#45)**
(D138–D144): the retention job and storage alert, `GET /api/health`, the error states with the diagnostic bundle, and both
"outlives its screen" defects. **Gate K is resolved** (D145): the human took the recommendation on all five questions and chose
to build the authored-item intake. **Slice 3, content, the contribution path and data rights, merged (#47**; D146–D152).
The **cleanup slice** asked for by the human merged (#49; D154–D158): the Dependabot queue and alerts, TypeScript 6, and
the red nightly. **Slice 4, motion, engagement and the library, is built** (`dougkeefe/smoke-key-next-slice`; D159–D162): the
streak with its silent freeze, the four milestone moments, the motion pass, self-hosted fonts and ten written-expression
library articles. The nightly live smoke has run on a real key for the first time (session log). Slice 4 merged (#51).
**Gate L passed** (D164, human), and the language-toggle defect the human found beside it is fixed (D163). **Studio mode is
back in 1.0** (D165, human): Phase 6 is three slices and two gates, built before Gate M. **Phase 6 Slice 1, the realtime
session core, merged (#53**; D166–D173). **Gate N passed** (D174, human): the voice is `cedar`. Its two findings, an examiner that
cut in on pauses and one that did not listen, are fixed (#54; D175, D176). #54 merged before its re-recording, and **CI had
never been able to fail** (D177): both lanes swallowed their exit code from Phase 0 on. **CI that can fail** is built
(`dougkeefe/next-dev-slice`; D177–D179): the v5 re-recording, which makes `main` green again; every lane through one
script; the medium lane in three parallel jobs; the fast lane's budget at 120 s (human); and `main`'s required checks set to
the four lanes, which until now always passed. It merged (#55). **Phase 6 Slice 2, the studio screen, is built**
(`dougkeefe/next-slice-from-progress-v5`; D180–D189): the mode choice, the studio view, the whole-session recording, the meter, playback from
each answer, and the key copy's exception in both languages. Tap to first word was measured live and is **not yet under
2.5 s** (D189), and the live run found a turn that never ended, which the human's session must check first. It merged (#57).
**The human's live session passed** (D191): the examiner answers a real voice and follows up, and D167's estimate stays
(human). **On the deployed site, tap to first word has a median of about 2.12 s**, so exit criterion 1 is met (D190), and
the dial's three levers for a cold first dial are built (`dougkeefe/testing-before-development`; D190). It merged (#58).
**Phase 6 Slice 3, the exception escapable, is built** (`dougkeefe/conductor/settings.local.toml-update`; D192–D194): the self-hosted secret endpoint by
popup and `postMessage`, working end to end on the production build against the repository's own Worker; the one-file
Worker and Vercel function in `selfhost/`; the route's log exclusion written into `docs/deploy.md` (Vercel has no per-route
switch, D193); and `docs/realtime-checklist.md` for Gate O. It merged (#60). **Phase 7 Slice 5, launch readiness, is built**
(`dougkeefe/docs-content-development`; D198–D199): the realtime route's rate limit, refused as `throttled`; the band trend over time on `/progress`
and its one-page printout; `robots.txt`, a sitemap and `hreflang` from one route list; and an unknown path answering 404.
**The full content run is built** (`dougkeefe/content-generation-run`; D203–D207; ADR 24), by the human's decision on 4 October 2026: Claude
wrote 630 items on 60 passages and 20 oral scenarios through the authored intake, separate Claude instances reviewed them
blind, 626 passed, and `content/bank/v4` is served with v3's synthetic content retired. That is Gate M's full-volume bank.
What remains before 1.0 is the human's: Gate O, then the rest of Gate M.

## Rows removed from *In flight*, up to 24 October 2026

*(The prior rows — the translator's explanation in the card (#99), the translator reworked (#97), Today's plan as tabs (#95), `/progress`'s tabs (#94), Dependabot cleared (#93), `/progress` as a dashboard (#92), "for this tab only" folded (#89), the review queue and retired items (#88), the translator (#96), the landing footer (#87), the README and the domain (#86), one press spends (#85), the Dependabot overrides (#83), the landing page's headline and pricing (#82), spoken practice spoken only (#80), the landing menu on a phone (#79), the explainer video (#78), the spoken-practice picker (#76), the nightly lane (#75), the sample question's language (#74), onboarding reordered (#73), step 5's disclosures (#72), onboarding's key step (#70), Today on the dashboard layout (#69), Today rebuilt around the next step (#68), the diagnostic that gives a result (#67), the full content run (#64), the app as designed (#63), the landing page as designed (#62), Phase 7 Slice 5 (#61), Phase 6 Slice 3 (#60), the human's studio session and the dial (#58), Phase 6 Slice 2 (#57), CI that can fail (#55), Gate N and its findings (#54), Phase 6 Slice 1 (#53), the language-toggle fix with Gate L and D165 (#52), Phase 7 Slice 4 (#51), the cleanup slice (#49), the relicense (#48), Phase 7 Slice 3 (#47), Slice 2 (#45), Slice 1 (#39), Phase 5 closed (#38), Phase 5 Slice 3 (#37), Slice 2 (#35), Slice 1 (#34), Phase 4 Slice 4 (#32), Slice 3 (#31), Slice 2 (#30), Slice 1 (#28), Phase 3 Slice 4 (#26), Slice 3 (#25), Slice 2 (#23), Slice 1 (#22), Phase 2 Slice 3 (#21), Slice 2 (#20), Slice 1 (#19), `adapters/bank` (#18), the `adapters/dexie` slice (#16) and the Phase-1 content
factory — merged and were removed; the In-flight table tracks current work, not history, and the
session log below is the permanent record.)*

The last row, 1.0 recorded and reading's library articles (#100), was removed when this archive was made (D255).

---

## Phase 0: Foundations and contracts

Defined in `implementation-plan.md` §7. The first-week list in §12 is the suggested order.

### Scaffolding

- [x] Monorepo: pnpm workspaces, Turborepo, TypeScript project references, strict everywhere
- [x] Eight workspaces created (`apps/web`, `apps/factory`, six `packages/*`), each with an explicit `exports` map
- [x] `CLAUDE.md` per package, stating that package's invariants (§7, and §10 requires keeping them current) — all six written, plus the root router `CLAUDE.md`; D4 resolved, D15 recorded
- [x] Name decided and domain registered (§12.1) — **name decided: Palier** (D96). **The domain is `palier.study`** (human, 18 October 2026; D238), live at `https://www.palier.study`, the apex redirecting there. It replaces D96's `palier.dougkeefe.com`
- [x] `LICENSE` (PolyForm Noncommercial 1.0.0), `LICENSE-CONTENT` (CC BY-NC-SA 4.0), `README` non-affiliation statement [R5, R13] — relicensed by ADR 23 (D153); MIT and CC BY until then
- [x] `adr/README.md` covering the format, the never-edit-only-supersede rule, and numbers-on-acceptance (D16)

### Domain and contracts

- [x] `@palier/domain`: full type set, branded ids
- [x] `@palier/domain`: Zod schemas for every content artefact, JSON Schema generated to `docs/schemas/`
- [x] `@palier/domain`: `ExamProfile` loader
- [x] `@palier/domain`: `psc-sle` profile transcribed from `product-requirements.md` §5 (ADR 9) — with one inferred band, see D12
- [x] `@palier/app`: port interfaces from §3.3 — under `src/ports/`: `ItemRepository`,
  `AttemptStore`, `ScheduleStore`, `SessionStore`, `SettingsStore`, `KeyVault`, `Clock`, `Random`,
  plus `IdGenerator` (a 9th port §3.3 does not name, D48). The deferred four landed with their phases
  (`AiProvider` D52, `SyncTransport` D69, `TelemetrySink` D92, `OralStore` D115), and the ports since
  (`CostLedger`, `WritingStore`, `GeneratedItemStore`, `OralTransport`, `AnswerSource`, `OralLiveness`,
  `RealtimeSecretSource`). `ports.stub.ts` deleted. See D18–D20, D45, D48
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
- [x] `@palier/testing`: in-memory implementation of every port — `ItemRepository`, `AttemptStore`,
  `ScheduleStore`, `SettingsStore`, `KeyVault`, `SessionStore` (memory stores) and
  `counterIdGenerator` (the `IdGenerator`, D48), all importing the real ports from `@palier/app`;
  the rest landed with their ports, each with its memory implementation and contract suite
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

---

## Phases 1 to 7, complete

Phase 3, which still has an open exit criterion, and Phase 8, not started, stay in `progress.md`. Phase 7 is
listed before Phase 6 because studio mode was deferred past 1.0 and then brought back into it (D131, D165).

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
**Done differently, 4 October 2026 (D203, ADR 24):** the human chose to have Claude write the bank and Claude instances review it blind, so 626 items shipped in `content/bank/v4` with no OpenAI call. A1–A3 are judged by one model family, not two; the OpenAI route stays ready for a cross-family re-review (ADR 24, *revisit when*).

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
- [x] Engine unit tests exhaustive at every boundary, golden fixtures locked: 100% branch; the practice-record golden beside the exam-band one (both proven to bite); and the one-off mutation check at 404/410 detected, with all 5 survivors equivalent (session log, 24 September 2026, `dougkeefe/yamoussoukro`; D77)
- [x] Sync simulator passes several hundred seeds including full partition and heal, no lost or duplicated attempts, and the same trend on every device: 400 seeds on the memory server and 100 through the real route handlers on PGlite in the medium lane, and 4,000 + 200 once by hand (session log, 24 September 2026, `dougkeefe/yamoussoukro`; D76)
- [x] Every adapter passes its port contract suite — `ids`, `dexie` ×6, `bank`, `openai`, `sync`; and `sync` passes it through the real route handlers too, on the memory repository (fast lane) and on PGlite (integration lane). Session log, 24 September 2026, `dougkeefe/pangyo`
- [x] axe clean and keyboard-complete on onboarding, drill and review, asserted on states [R9]: axe runs on each state in journeys 1, 2 and 4 and on the sync settings, and the drill and review are driven by keyboard. The rerun is in this session's `verify:medium` → Playwright "31 passed" (session log, 24 September 2026, `dougkeefe/yamoussoukro`). Slice 1 first built it (`dougkeefe/algiers`)
- [x] Lighthouse performance and accessibility both ≥95: median **1.0 / 1.0 on all 9 routes**, max CLS 0, rerun after the security headers (session log, 24 September 2026, `dougkeefe/yamoussoukro`)
- [x] Deployed publicly and shared with a handful of people — **deployed** 24 September 2026 at **https://palier-virid.vercel.app** (Vercel project `palier`, Neon Postgres `palier-db`, provisioned with the human, Gate C), with every production smoke check passing, including a two-device sync round trip over the live database. **Shared**: the human confirmed on 24 September 2026 that they paired two real browsers on the live URL and shared the link with a handful of people (session log, `dougkeefe/minnetonka-v3`). **Phase 2 complete.**

**Completion slices (D57).** The §7 work breakdown above is grouped into **three** bigger slices that
carry Phase 2 to every exit criterion, with two human gates between them. This mirrors
`implementation-plan.md` §7 Phase 2 "Completion slices" — **keep the two in sync** (the fuller scope
and each slice's *done* live in the plan). Current position: **all three slices complete; Phase 2 complete** (24 September 2026).

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
- [x] **Slice 3 — Convergence proof + public launch.** Sync simulator (tier 5), remaining CI gates +
  mutation check, full-offline + Lighthouse ≥95 confirmation, public deploy. **Phase 2 complete.**
  **Done 24 September 2026** (`dougkeefe/yamoussoukro`, PR #21; D73–D78), and deployed at
  https://palier-virid.vercel.app. "Shared with a handful of people" was confirmed by the human the same day.

### Phase 4: BYOK, generation, writing workshop

**Planned 25 September 2026 (D97)** as four slices, mirrored in `implementation-plan.md` §7. **Keep the two in
sync.** Gate F (the UI direction) is resolved: PRD §8.1 step 5, §8.7 and §8.10 are adopted as written.

- [x] **Slice 1 — The key, safely.** **Built 26 September 2026** (`dougkeefe/next-progress-slice-v1`; D98–D100;
  session-log evidence). The tier-11 key-leak test first; `/settings/key` and onboarding step 5;
  validation, do-not-remember, the browser `AiProvider` path through `withApiKey`, and graceful
  degradation.
- [x] **Slice 2 — Spend.** **Built 26 September 2026** (`dougkeefe/next-progress-slice-v2`; D101–D104; session-log
  evidence). The cost ledger, every spending call metered in `withAiProvider`, pricing as data, the meter,
  the soft cap, the per-feature table, the pre-flight estimate, and the billing check. **Gate G passed** the
  same day, which ticks exit criterion 3.
- [x] **Slice 3 — The writing workshop** (§8.7), with submissions kept on the device. **Built 26 September 2026**
  (`dougkeefe/next-progress-slice-v3`; D105–D108; session-log evidence). `assessWriting` with inline offsets, the
  `WritingStore` port over Dexie v3, the prompt library, the workshop screen, and the key-leak test extended to the
  submission's text.
- [x] **Slice 4 — Runtime item generation and the Phase 4 CI gates.** **Built 27 September 2026**
  (`dougkeefe/next-progress-slice-v4`; D109–D112; session-log evidence). The review gate in `@palier/domain`,
  `generatePracticeSet` and the `GeneratedItemStore` port, `/practice/writing/generate` with the provenance badge and
  the one-tap contribution, the key-leak specs following a generated set, and the CI gates: live-recorded fixtures,
  the eval's conformance rate, the nightly smoke, and prompt version 4, which fixed what the first recording found.

**Exit criteria** (the actual gate)

- [x] **Key-leak test written before the key vault**, and passing (tier 11) [R12]. It was the slice's first
  commit, ahead of any key code. `key-leak.spec.ts` (hermetic, real sync and telemetry) and
  `key-leak-production.spec.ts` (real Dexie) are green in the E2E suite. They were proven to bite four
  ways, each reverted: a logged key, a key written to the synced settings, a key in `localStorage`, and a
  plaintext IndexedDB row (session log, 26 September 2026, `dougkeefe/next-progress-slice-v1`; D100)
- [x] Every AI response schema-validated before use; malformed / rate-limit / invalid-key / timeout all degrade gracefully.
  **First half met** (Slice 1, D99): the adapter turns each into its own error, and the key screen puts each
  in plain words. This is tested through the real adapter over MSW (`container-key.test.ts`) and in journey
  5. **Second half met** (Slice 4, D112): 18 completions recorded from the live API are replayed through the
  adapter in the fast lane, and each must get the verdict it got when recorded. The gate was proven to bite both
  ways. The eval reports 1.0 conformance on prompt version 4. The generation path degrades through the same
  names (`generate.spec.ts`, `container-generate.test.ts`) (session log, 27 September 2026,
  `dougkeefe/next-progress-slice-v4`)
- [x] Spend meter matches actual OpenAI billing within a few percent. **Gate G, 26 September 2026:** the human
  ran `pnpm --filter @palier/web billing-check` on a funded test key. OpenAI's usage data matched the meter
  100%: 2,393 input and 4,114 output tokens, and US$0.037698. See the session log,
  `dougkeefe/next-progress-slice-v2`, and D103

### Phase 5: Oral, practice mode

**Planned 27 September 2026 (D113)** as three slices, mirrored in `implementation-plan.md` §7. **Keep the two in
sync.** Gate H is resolved: PRD §8.6's practice mode and report are adopted, with all five session types and
pronunciation offered as a per-session opt-in.

- [x] **Slice 1 — The session core, no UI.** **Built 27 September 2026, merged (#34)** (`dougkeefe/next-progress-slice-v5`;
  D114–D116; session-log evidence). The scenario stage over `generateScenario` and bank v3, with v2's items and forms
  carried forward and ten scenarios; `ItemRepository.scenarios()`; the `OralStore` on memory and Dexie with §9.1's
  retention in the use cases; the engine's session machine; `OralTransport` with its fake and contract; and
  `startOralSessionRun`, the driver.
- [x] **Slice 2 — The turn loop on the key.** **Built 27 September 2026, merged (#35)** (`dougkeefe/next-slice-from-progress-v2`; D117–D121;
  session-log evidence). `transcribe`, `speak` and `examinerTurn` on gpt-transcribe and tts-1 (human decision), priced
  in the unit each is billed by; the `AnswerSource` port and `turnBasedTransport` in app, held to the transport
  contract; `/practice/oral` with the level check, per-browser recovery and typed answers; the recording kept on this
  device and cleaned from the data settings; the key-leak test following audio and transcripts; and recorded fixtures
  for the three new methods, all accepted first time.
- [x] **Slice 3 — `assessOral` and the report**, ending at **Gate I** (exit criterion 1, human). **Built 28 September 2026, merged (#37)**
  (`dougkeefe/check-last-branch-commit`; D122–D127; session-log evidence): `assessOral` on the `assess` role with the offsets
  placed per turn; `fluencyMetrics` over spoken answers; the fixes into `StartSession`'s plan (D35 closed); `CostEntry.sessionId`;
  the report at `/practice/oral/report` and the list of past sessions; the stability eval and its recorder. Gate J deferred
  (human). Exit criterion 4 met (D128); Gate I passed (D129); criterion 2 deferred by the human (D130).

**Exit criteria** (the actual gate)

- [x] A 10-minute session produces a report a user would act on (Gate I). **Passed** (28 September 2026, human decision, D129)
- [!] Cost per session measured and displayed accurately. **Deferred by the human** (28 September 2026, D130): the cost is
  measured from each session's own ledger rows and shown on the report (D125, D127); the comparison with OpenAI's usage page,
  and recalibrating `pricing.json`'s oral placeholders, run later, when the human chooses
- [x] Audio reaches nowhere but OpenAI: each answer's clip only its transcription call, and the stored session recording only on an explicit per-session pronunciation opt-in, asserted by the extended key-leak test [R12] (amended in place, D113). **Met** (Slice 2, D120). There is no opt-in yet, so the recording must reach no request at all, and it reaches none. In the hermetic journey each clip's bytes are in exactly one request, to `/v1/audio/transcriptions`. The recording's bytes are in no request; the transcript is only on this device and in the examiner's next request; the paired phone and the export see neither. On real IndexedDB the recording is at rest in `oralAudio` through a reload. Proven to bite three ways (session log, 27 September 2026, `dougkeefe/next-slice-from-progress-v2`). Slice 3's opt-in must keep the recording's check green when the box is left unticked
- [x] Scoring stability: same transcript five times, at most one band of variation. **Met** (28 September 2026, D128): the
  human recorded `STABILITY_SESSION` scored five times on a funded key, and every criterion's band was the same in all five
  (spread 0, agreement 1.00; the bar is at most 1 and at least 0.8). `node apps/factory/dist/index.js eval` → "oral stability
  over 5 call(s): passed". The session is synthetic; a real one is the stronger evidence, named, not scheduled
- [x] Session state machine contract-tested against a fake transport. **Met** (Slice 1, D116):
  `packages/testing/src/memory/oral-session.test.ts` drives the real driver, `startOralSessionRun`, over
  `memoryOralTransport`, which `oralTransportContract` holds. It runs every fixture scenario, one per session type,
  with a `FakeClock`, and covers an early end, both drops and an in-flight answer. The machine's nine properties hold
  it at nightly strength. It was proven to bite: stamping every turn phase 0 failed all five session types (session
  log, 27 September 2026, `dougkeefe/next-progress-slice-v5`)

### Phase 7: Polish and hardening — 1.0

**Opened 28 September 2026** (`dougkeefe/next-progress-slice-v7`), directly after Phase 5, because studio mode is deferred past 1.0
(D131). The `implementation-plan.md` §7 work breakdown, expanded on start, with what already exists ticked and pointed at.
Nothing is ticked without session-log evidence.

**Work breakdown (§7)**

- [x] Device list and revocation UI, pairing polished. **Merged with Slice 3 (#47).** **The list, remove and pairing by code exist** (Phase 2 Slice 2, D72:
  `SyncSettings.tsx`, `removeDevice`, journey 8). **Slice 3, built on this branch** (D149): a confirmation before a device is removed, the pair
  code's countdown and lapse, and this device's switch following a removal elsewhere
- [x] Retention job for inactive accounts (180 days) and the 90-day tombstone purge, the storage alerts, the aggregation
  path (architecture.md §9.4; D78 moved both jobs here). **Slice 2, merged (#45)** (D138, D139): the job, its daily
  workflow and the alert at 60% and 80%. The aggregation path is the 60% response, written as a runbook step in
  `docs/deploy.md`, not built, until the alert first fires
- [x] PDF progress summary; JSON export and import round trip. **Merged with Slice 3 (#47)**; the trend *over time* that
  PRD §8.9 asks of `/progress`, and so of its printout, is **Slice 5** (D195). **The round trip exists** (D61, D62; `data-rights.test.ts`,
  journey 6). **Slice 3, built on this branch** (D148): the one-page PDF (PRD §8.9) as `/progress` printed, both skills and the oral line,
  one page on Letter and A4. A trend *over time* is named, not scheduled. **Slice 5, built** (D198): twelve weeks at the target
band, a table beside the chart, and the printout still one page in both languages
- [x] **Merged with Slice 4 (#51).** The motion and illustration pass: Coco, the milestone moments, the streak, the band meter fill, self-hosted fonts
  (D65). Slice 4: the streak (with its silent freeze) and the milestone moments are in 1.0; XP, levels and the countdown
  are after 1.0 (Gate K, D145). **Slice 4, built on this branch** (D159–D161): the streak and its one-time freeze note, the
  four milestone moments with Coco cheering and a text-only share, the band meter's entrance fill, one motion switch, and
  Inter, Figtree and Source Serif 4 self-hosted
- [x] Accessibility audit with VoiceOver and NVDA on the core flows, and a screen-reader user's pass if one can be arranged.
  Human (Gate L). **Passed at Gate L** (D164). **The agent's half is built on this branch, Slice 3**: PRD §11's shortcut
  sheet at `?` (D150) and the `lang` audit (D151)
- [x] Security review: CSP tightening, Trusted Types, dependency audit, `SECURITY.md`, a deliberate attempt to leak the key.
  **Slice 1, merged (#39)** (D133–D137). Gate L's red-team read passed (D164)
- [x] **Merged with Slice 4 (#51).** The library: MDX reference articles on the taxonomy's grammar and register points, linked from item explanations.
  Slice 4: one article per written-expression sub-skill, ten, in both languages; reading's after 1.0 (Gate K, D145). The
  articles' French is part of Gate L. **Slice 4, built on this branch** (D162): ten articles as structured JSON, not MDX, at
  `/library`, linked from every written-expression explanation. **Reading's eight, after 1.0** (D254): excerpts in place
  of sentences to write, linked from every reading explanation
- [x] **Merged with Slice 2 (#45); the realtime route's log exclusion is Phase 6 Slice 3's (D193).** Observability: the client diagnostic bundle, the prefilled issue path, no error reporting service (ADR 15). **The
  item-report issue path exists** (Phase 2). **Slice 2, merged (#45)** (D140–D142): the diagnostic bundle, the error
  states with a prefilled issue, and `/api/health`. The realtime route's exclusion from Vercel logging moves with studio
  mode (D131)
- [x] **Merged with Slice 3 (#47).** Content: the about page, the non-affiliation statement in both languages, the privacy notice, the contribution guide
  with the originality attestation, the PR template. **Slice 3, built on this branch** (D146, D147, D152): the about page and `/privacy`
  drafted, the statement beside every band and in onboarding, `CONTRIBUTING.md`, the PR template and the authored-item
  intake. Their French is Gate L's
- [x] Full French review of every interface string by a fluent speaker, with the workshop prompts (D107) and the bank's
  register (ADR 19). Human (Gate L). **Passed at Gate L** (D164)

**Completion slices (D132).** Four slices and three gates, mirroring `implementation-plan.md` §7 Phase 7 "Completion slices".
**Keep the two in sync**: the plan holds the fuller scope and each slice's *done*.

- [x] **Slice 1 — Security hardening, no new UI.** **Built 28 September 2026, merged (#39)** (`dougkeefe/next-progress-slice-v7`;
  D133–D137; session-log evidence). The strict CSP and Trusted Types on the built output, the dependency audit
  gate and Dependabot, `SECURITY.md`, `RATE_LIMIT_SALT` failing the deploy, and the deliberate attempt to leak the key.
- [x] **Slice 2 — Server lifecycle and observability.** **Built 28 September 2026, merged (#45)** (`dougkeefe/next-slice-from-progress-v3`;
  D138–D144; session-log evidence), with finding 13's wipe half. The retention job and the storage alert, `/api/health`, the error
  states with the diagnostic bundle, and the two "outlives its screen" defects.
- [x] **Gate K — Phase 7's UI and content direction (human).** **Resolved 29 September 2026** (D145): the agent drafts the
  privacy notice and about page; the statement in onboarding and beside every band; the streak and milestones in 1.0, XP,
  levels and the countdown after; ten written-expression library articles; the PDF as a print stylesheet over `/progress`;
  and the authored-item intake built in Slice 3.
- [x] **Slice 3 — Content, the contribution path and data rights.** **Built 29 September 2026, merged (#47)**
  (`dougkeefe/next-slice-from-progress-v2`; D146–D152; session-log evidence). The about page and privacy notice, the
  statement in onboarding and beside every band, `CONTRIBUTING.md` with the originality attestation, the PR template and the
  authored-item intake, the device-removal confirmation and pairing polish, the one-page PDF, the shortcut sheet and the
  `lang` audit.
- [x] **Slice 4 — Motion, engagement and the library**, as Gate K decided (D145): the motion and illustration pass, self-hosted
  fonts, the streak with its silent freeze, the milestone moments, and ten written-expression library articles. **Built
  29 September 2026, merged (#51)** (`dougkeefe/smoke-key-next-slice`; D159–D162; session-log evidence).
- [x] **Gate L — the human reviews (human).** R8's French review, the VoiceOver and NVDA pass, and the red-team read.
  **Passed 29 September 2026** (D164): the human found no issue in any of the three.
- [x] **Slice 5 — Launch readiness** (planned 2 October 2026, D195; the scope and each piece's *done* are
  `implementation-plan.md` §7 Phase 7's, keep the two in sync). Built before Gate O, since it changes the route Gate O reads:
  1. the realtime route's rate limit, 60 posts an hour per IP hash, refused as a new `throttled` code (D169's question);
  2. the band trend over time on `/progress` and its printout (PRD §8.9, named since D148);
  3. `robots.txt`, a sitemap with `hreflang` alternates, and the public origin from Vercel's production URL;
  4. an unknown path answering 404, by a rewrite in the proxy, or a deviation saying why not (D141).

  **Built 3 October 2026, merged (#61)** (`dougkeefe/docs-content-development`; D198–D200; session-log evidence): all four, the 404 by the
  rewrite, which Next 16 carries.
- [x] **Gate M — public (human).** **Passed 24 October 2026** (D253): the outside item submission and the trademark check. ~~The repo made public~~ (**public**, confirmed 2 October 2026, D195), an outside item
  submission [R13], the domain, §12.1's trademark check, and ~~the full-volume bank (D54)~~ (**built**: `content/bank/v4`,
  written by Claude and reviewed blind by Claude, 4 October 2026, D203, ADR 24). **It waits on Phase 6's Gate O** (D165).

**Exit criteria** (the actual gate)

- [x] Every gate green, no known accessibility defects, no known security defects. The accessibility and security halves
  passed at Gate L (D164); Gate M passed (D253)
- [x] Both languages reviewed by a human [R8]. Gate L (D164)
- [x] Repo public, licences in place, contribution path tested by someone else submitting an item [R13]. **Public and
  licensed** (D153, D195); the outside submission made at Gate M (D253)

### Phase 6: Oral, studio mode — in 1.0, before Gate M

**Decision gate before starting.** If phase 5's reports land well and measured realtime cost is high, shipping 1.0 without studio mode is the honest answer. Record that call here with its evidence. **Noted 27 September 2026 (D113):** GPT-Live's published US$0.05 a minute probably removes the "cost is high" premise. It is the leading candidate, and adopting it needs an ADR superseding ADR 3's mechanism, plus the checks D113 lists.

**The call, 28 September 2026 (human, D131): studio mode is deferred past 1.0.** The section sits after Phase 7 for that
reason; its number is kept so the cross-references hold. The evidence:
- **Gate I passed** (D129): practice mode's report is one a user would act on, so 1.0 has an oral feature without realtime.
- **Cost was not the reason.** Practice mode's estimate is about US$0.0076 a minute against GPT-Live's US$0.05 (D130).
- **D113's checks, read by an agent session on 28 September 2026:**
  1. French: the Live API's voice table lists English and Portuguese voices only. No French voice is documented.
  2. The session length: a limit exists (a session carries `expires_at` and can close as `expired`), but its value is not
     published.
  3. A browser credential: none. The server exchanges the browser's offer at `POST /v1/live/sessions` with the key.
- **ADR 3 stands, dormant.** A deferral is not "the feature is dropped", so its *revisit when* is not met.

**What reopens it:** a French voice documented and heard by the human at C-level quality, or a documented browser-direct
credential, or 1.0 shipped.

**Brought back into 1.0, 29 September 2026 (human, D165).** It supersedes the deferral above. D131's two blockers were the
Live API's. OpenAI's **Realtime API**, the one ADR 3 was written for, has neither problem:
- it still mints a short-lived browser secret (`/v1/realtime/client_secrets`);
- its ten voices speak every supported language, French among the strongest;
- a session lasts up to 60 minutes.

ADR 3 stands as written and is live again. The section keeps its place after Phase 7 so the cross-references hold. Read it as
built after Phase 7's slices and before Gate M.

**Completion slices (D165).** Three slices and two gates, mirroring `implementation-plan.md` §7 Phase 6 "Completion slices".
**Keep the two in sync**: the plan holds the fuller scope and each slice's *done*.

- [x] **Slice 1 — The realtime session core, no UI.** Merged (#53; D166–D173). The work:
  - `oral-studio` as a feature, the `realtime` model and voice, and the prices with the 25-minute cap as data;
  - `note` events, notes into `assessOral`, and the `time-cap` end reason;
  - the `RealtimeSecretSource` port and `POST /api/realtime/secret` on Node;
  - `realtimeTransport` over WebRTC, with one reconnect, then a clean failure;
  - the key-leak test extended to the route (its fake-peer half moved to Slice 2, D171).

  *Done:* exit criterion 2 at the port level, met by `container-studio.test.ts` (session log).
- [x] **Gate N — the examiner's voice (human).** Beside Slice 1, and before Slice 2. `marin` and `cedar` heard in French at C
  level in OpenAI's playground; the human picks one. A fail stops Phase 6. **Passed, 30 September 2026 (D174): `cedar`.**
  Two findings came with it, and are fixed: the examiner cut in on a pause (D175), and did not listen (D176).
- [x] **Slice 2 — The studio screen, on the key.** **Built 30 September 2026, merged (#57)** (`dougkeefe/next-slice-from-progress-v5`;
  D180–D189; session-log evidence). Its *done*: the copy's parity is met; exit criterion 1 is met on the deployed site
  (D190); the cost per minute was not measured, and the human chose to keep D167's figures in `pricing.json` (D191). The
  human's live session passed (D191). The work:
  - **the key copy's one exception, stated in both languages** (moved here from Slice 3 by D173): `key.offerStays`,
    `privacy.third`, `neverKey`, `KeyOffer` and `SECURITY.md`, plus architecture.md §6.3's settings note linking the
    route's source;
  - the mode choice on `/practice/oral`, with cost shown up front for both;
  - the studio screen of PRD §8.6: the voice form over both levels, the phase indicator, the timer, the end control, "could
    you repeat", no live transcript, and a reduced-motion fallback;
  - the whole-session local recording;
  - the pre-flight estimate and a running meter;
  - the report over the realtime transcript and its notes, with synced audio;
  - a hermetic journey over a memory transport, and every state axe-clean;
  - the key-leak test's fake-peer half (D171): the screen dials `/v1/realtime/calls` with the `ek_` secret, never the key.

  *Done:* exit criterion 1 measured live, the cost per minute measured and written into `pricing.json` (principle 8), and
  the copy's parity.
- [x] **Slice 3 — The exception, escapable.** **Built 2 October 2026, merged (#60)** (`dougkeefe/conductor/settings.local.toml-update`; D192–D194; session-log
  evidence). Its *done* is met on the branch: `studio-selfhost-production.spec.ts` runs the
  self-hosted path end to end on the production build, against the repository's own Worker on a local port. The log
  exclusion's deployment check is the human's, at Gate O (D193). The work (the copy moved to Slice 2, D173):
  - the self-hosted escape of ADR 3, through a popup to the user's own endpoint and `postMessage`, so `connect-src` stays
    `'self'` and OpenAI (D165);
  - the one-file Cloudflare Worker and the Vercel function in the repo;
  - the route's exclusion from Vercel logging verified, and written into `docs/deploy.md`;
  - the manual realtime checklist written out as `docs/realtime-checklist.md`.

  *Done:* the self-hosted path working end to end against a local endpoint.
- [x] **Gate O — studio mode's release reads (human).** **Passed 24 October 2026** (D253). The checklist on Chrome, Safari and Firefox, desktop and mobile (exit
  criterion 3), the route read line by line, and the French of the new copy. Then Gate M.

**Exit criteria** (the actual gate). Two are added by D165.

- [x] Session establishes in under 2.5 seconds from tap to first word. **Met on the deployed site** (D190): twelve dials,
  median about 2.12 s, one over (the first, on a cold function, 2.98 s). A local server measured a median of about 2.49 s
  (D189). The levers for the cold first dial are built (D190) and are measured once on `main`
- [x] Disconnection mid-session recovers or fails cleanly with the transcript preserved. **Met at the port level** (D170;
  run 18 October 2026, session log, `dougkeefe/docs-outstanding-implementations-review`): `container-studio.test.ts` reconnects once and fails cleanly on the
  second drop with every turn and note kept, through both graphs, and `oral-session.test.ts` keeps the transcript on a
  drop either way. A real browser's drop is the checklist's (`docs/realtime-checklist.md`), read at Gate O
- [x] Manual realtime checklist (`architecture.md` §14) passes on Chrome, Safari, Firefox, desktop and mobile. **Passed at
  Gate O** (D253)
- [x] The examiner's French voice is judged credible at C level by a human (Gate N) — `cedar`, D174
- [x] The key exception is stated wherever the copy promised otherwise, in both languages, and the self-hosted escape works.
  **Met on `dougkeefe/conductor/settings.local.toml-update`** (D186, D192): the escape runs end to end under the production CSP; ticked once merged and
  the French is read at Gate O. Merged (#60), and the French read at Gate O (D253)
