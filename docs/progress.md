# Palier: Progress

**Last updated:** 30 September 2026 (Phase 6 Slice 2, the studio screen, D180–D189)
**Current phase:** **Phase 7 (Polish and hardening, 1.0) is open** (28 September 2026). **Phase 6's decision gate is
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
(`dougkeefe/raleigh-v3`; D180–D189): the mode choice, the studio view, the whole-session recording, the meter, playback from
each answer, and the key copy's exception in both languages. Tap to first word was measured live and is **not yet under
2.5 s** (D189), and the live run found a turn that never ended, which the human's session must check first.

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
| 2 Practice MVP | Ship something publicly useful | 3–4 wk | **complete** (live 24 September 2026 at https://palier-virid.vercel.app; shared, confirmed by the human) |
| 3 Exams and item statistics | The number users actually came for | 2 wk | **in progress** (all four slices built, exit criteria 1–4 met; the product pilot is running, human, D97) |
| 4 BYOK, generation, writing workshop | Turn on the parts that cost money, safely | 2 wk | **complete** (four slices, D97, all merged, the last as #32; D98–D112; Gate G passed; all three exit criteria met) |
| 5 Oral, practice mode | Oral rehearsal at a cost anyone can afford | 2–3 wk | **complete, one criterion deferred** (Gate H resolved; three slices, D113; Slice 1 merged, #34, exit criterion 5 met; Slice 2 merged, #35, exit criterion 3 met; Slice 3 merged, #37, D122–D127; exit criterion 4 met, D128; Gate I passed, D129; criterion 2 deferred by the human, D130) |
| 6 Oral, studio mode | The feature people tell colleagues about | 2 wk | **in progress, in 1.0** (deferred 28 September 2026, D131; brought back into 1.0 29 September 2026, human, D165: three slices and Gates N and O, before Gate M); Slice 1 merged, #53, D166–D173; Gate N passed, D174, with its findings fixed, D175–D176 (#54), recorded on prompt v5 by `dougkeefe/next-dev-slice`; Slice 2 built, `dougkeefe/raleigh-v3`, D180–D189 |
| 7 Polish and hardening | 1.0 | 2–3 wk | **in progress** (opened 28 September 2026; four slices and three gates, D132; Slice 1 merged, #39; Slice 2 merged, #45; Gate K resolved, D145; Slice 3 merged, #47; the cleanup slice merged, #49, D154–D158; Slice 4 merged, #51, D159–D162; Gate L passed, D164; Gate M waits on Phase 6, D165) |
| 8 English mirror | Prove the architecture | 2 wk | not started |

Task states: `[ ]` not started · `[~]` in flight · `[x]` done and verified · `[!]` blocked or deferred, with a note.

### In flight

| Branch | Task | Session started |
| --- | --- | --- |
| `dougkeefe/raleigh-v3` | **Phase 6 Slice 2 — the studio screen, on the key** (D173's copy exception, the mode choice, the studio view, the whole-session recording, the meter, synced audio on the report, the hermetic journey and the key-leak test's fake-peer half, and the live measurements). | 30 September 2026 |

*(The prior rows — CI that can fail (#55), Gate N and its findings (#54), Phase 6 Slice 1 (#53), the language-toggle fix with Gate L and D165 (#52), Phase 7 Slice 4 (#51), the cleanup slice (#49), the relicense (#48), Phase 7 Slice 3 (#47), Slice 2 (#45), Slice 1 (#39), Phase 5 closed (#38), Phase 5 Slice 3 (#37), Slice 2 (#35), Slice 1 (#34), Phase 4 Slice 4 (#32), Slice 3 (#31), Slice 2 (#30), Slice 1 (#28), Phase 3 Slice 4 (#26), Slice 3 (#25), Slice 2 (#23), Slice 1 (#22), Phase 2 Slice 3 (#21), Slice 2 (#20), Slice 1 (#19), `adapters/bank` (#18), the `adapters/dexie` slice (#16) and the Phase-1 content
factory — merged and were removed; the In-flight table tracks current work, not history, and the
session log below is the permanent record.)*

---

## Phase 0: Foundations and contracts

Defined in `implementation-plan.md` §7. The first-week list in §12 is the suggested order.

### Scaffolding

- [x] Monorepo: pnpm workspaces, Turborepo, TypeScript project references, strict everywhere
- [x] Eight workspaces created (`apps/web`, `apps/factory`, six `packages/*`), each with an explicit `exports` map
- [x] `CLAUDE.md` per package, stating that package's invariants (§7, and §10 requires keeping them current) — all six written, plus the root router `CLAUDE.md`; D4 resolved, D15 recorded
- [~] Name decided and domain registered (§12.1) — **name decided: Palier** (D96). The domain will be `palier.dougkeefe.com`, not yet pointed at the deployment
- [x] `LICENSE` (PolyForm Noncommercial 1.0.0), `LICENSE-CONTENT` (CC BY-NC-SA 4.0), `README` non-affiliation statement [R5, R13] — relicensed by ADR 23 (D153); MIT and CC BY until then
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

Phase 7 (D132): **Slices 1–4 merged**, and **Gate L passed** (D164). **Studio mode is in 1.0** (D165, human), and Gate M waits
for Phase 6. **Phase 6 Slice 1 merged (#53)**, and **Gate N passed** (D174, human): the voice is `cedar`. Its two findings are
fixed (#54): semantic turn detection at `low` eagerness (D175), and an examiner that listens (D176). **CI can fail now, and
`main` is protected** (D177, #55): a red lane blocks the merge.

Phase 5's deferred cost check (D130), the product pilot (Gate E, D97) and Gate M's calls that need no build (the domain, the
trademark check, lining up an outside submitter) still run beside it, all the human's. Gate M's one build item, **the
full-volume bank run** (D54), touches no oral code. It can run in its own worktree once the human funds a key for it.

**Phase 6 Slice 2 is built** (`dougkeefe/raleigh-v3`; D180–D189). Merge it first: `main` deploys to production, and the
key copy's exception ships with the screen (D173).

**Next: the human's live studio session, then "the dial under 2.5 s", then Slice 3.**

1. **The human's live session (do not self-direct).** On the deployed site after the merge, on your key, on `cedar`, hold
   one Work discussion in studio mode of at least five minutes, and report four things:
   - **Does the examiner answer once you finish speaking?** The synthetic run never had a turn end (D189). If it does
     not, the agent's next slice is D175's *revisit when*, silence detection at about 1.5 s, as data, before anything
     below.
   - Does it wait through a mid-sentence pause (D175), and follow an answer that contradicts its question (D176)?
   - The report's "The conversation" line and the session's minutes. That dollar figure a minute replaces D167's
     provisional one in `pricing.json`: the agent converts it to the token mix, keeping D167's shares where no split was
     measured.
   - Whether the start felt slow.
2. **Agent slice, "the dial under 2.5 s"** (exit criterion 1, before Slice 3; D189's timeline says where the time goes):
   - **warm the route**: when the studio pre-flight card shows, `POST /api/realtime/secret` with no key, and the 401
     `missing-key` warms a cold function without the key leaving the browser. It needs a unit test that no header or body
     is sent, and the key-leak test's count holds;
   - **overlap the dial**: start the peer and its offer while the secret is minted, rather than after;
   - **measure on the deployed site**, with `studio-live.spec.ts` given the site's address as its base URL: twelve dials,
     the first included.

   *Done:* the median of twelve dials is under 2.5 s, with the figures in the session log, and the criterion ticked. **If
   it is still over**, the remaining lever is minting the secret at the pre-flight, before the tap. That sends the key
   before the candidate has pressed Start, so it is the human's call at Gate O, not the agent's.
3. **Then Slice 3, the exception escapable**, as planned in the Phase 6 section: the popup escape, the Worker and function,
   the log exclusion verified, and `docs/realtime-checklist.md`.

Budget note (D178): a change to a core package puts the fast lane near 92 s of its 120 s. Run `pnpm verify` and
`CI=1 pnpm verify:medium` before pushing.

**For the human, from Phase 6 Slice 2:**
- The session above.
- **Read the new copy** in both languages: the picker's studio callout, the pre-flight's line, the key settings' "one
  exception" card, the onboarding offer and `/privacy` (D186). It goes to Gate O's French read. The card's link to the
  route's source resolves once the repo is public.

**For the human, from Phase 6 Slice 1:**
- After merging, run the new smoke check: `curl -s -X POST https://palier-virid.vercel.app/api/realtime/secret` should answer
  `401 {"error":"missing-key"}` (`docs/deploy.md`).
- The route is live from this merge, but no screen sends it a key until Slice 2. Two things it does not have yet:
  - a rate limit (D169);
  - a verified exclusion from Vercel's logs, which Slice 3 checks.

  Say if either should come before Slice 2.
- The spend table on `/settings/key` now lists "Studio conversation" at a provisional US$0.055 a minute (D167). Say if it
  should stay hidden until Slice 2 ships the screen.

**For the human, from Slice 4:**
- **look at the milestone moment and Coco's cheering pose** (seed or reach a milestone; D159, D160) and the self-hosted type
  (D161), and say whether either needs another pass before 1.0;
- the share card's text names Palier as "free, unofficial" and the SLE: confirm that wording before the repo goes public.

**For the human, from Slice 3:**
- **delete `about.bankToday`** ("still small and partly synthetic") when the full-volume bank ships (Gate M);
- the contribution path is ready for Gate M's outside submission. An authored item's model review runs on the next funded
  bank build (D152).

**For the human, from Slice 2:**
- after merging, **`curl -s https://palier-virid.vercel.app/api/health`** should answer `{"build":"<7 hex>","bank":3,"database":"ok"}`
  (`docs/deploy.md`'s smoke checks);
- add the **`RETENTION_DATABASE_URL`** Actions secret, with the same value as Production's `DATABASE_URL` (D138), and the
  **`PLAN_STORAGE_MB`** variable (`512` on Neon's free tier);
- then **run the retention workflow by hand as a dry run** before its first scheduled run deletes (D138). The script has not
  yet run against a real Postgres.

**For the human, from Slice 1:**
- **read the red-team result** (D136) and say whether any path it did not try should be tried.
- *(Done: private vulnerability reporting is enabled, confirmed through the API on 29 September 2026; the first Dependabot
  pull requests were handled by the cleanup slice, D155.)*

**Gate J, still open (human):** confirm the pronunciation model and its price. OpenAI's pricing page listed, on 27 September
2026, audio-capable chat models priced per million audio tokens, such as `gpt-audio-mini` at US$10 in. Chat-completions audio
input takes WAV or MP3 only, and the recording is WebM/Opus. So Gate J's slice is: a `pronounce` role and a method on
`AiProvider`, the recording converted to WAV in the browser (Web Audio, no new dependency), the opt-in on the pre-flight, off by
default and asked each session, and the key-leak test's opt-in half, ticked and unticked (D113, D122). It does not block Phase 7.

**Also for the human:**
- **listen to the examiner's voice** (`tts-1`, "sage") in French, and say whether it will do or another voice should be data in
  `ai-models.json`;
- *(Done 29 September 2026: the `OPENAI_SMOKE_KEY` Actions secret is set, and the nightly ran by hand with it: the live smoke
  passed, 15 completions all accepted first time, about US$0.19. Session log, Slice 4.)*
- read the `generate`, `oral` and **`oralReport`** namespaces' French, with the rest of Phase 7's R8 review.

**Named, not scheduled:**
- reading-set generation (D110);
- **one `debiasKeyPosition`** in domain for the factory and the browser (finding 16);
- **the vocabulary queue** (PRD §8.6's "added to the vocabulary queue"): v1's `vocab` table behind a port and a vocabulary item
  type in the registry (ADR 17);
- **transcript sync with playback for practice mode** (PRD §8.6). A studio recording plays from each spoken answer (D187),
  but a practice recording is paused between answers, so its places are not the turns';
- **a drill filtered to one sub-skill**, so a fix's link lands on that sub-skill today rather than biasing the next plan (D124);
- **fillers the transcription drops**: asking the transcription to keep hesitations (its `prompt` parameter) (D123);
- **a 404 status for an unknown path**: it answers 200 with `noindex`, because Next serves `notFound()` under this root layout
  as an error shell that cannot run under the strict CSP (D141). Next's experimental `global-not-found.tsx` is the likely fix;
- **the first single-record delete**, which will write the tombstones the retention job already purges (D138);
- **the 60% aggregation** as code, written when the storage alert first fires (`docs/deploy.md`, D139);
- **`global-error.tsx` reached end to end**: only its view is checked, since the root layout works (D142);
- **the wipe guard across tabs**: a `BroadcastChannel` so a wipe in one tab forgets the requests out in every tab (D143);
- **an abandoned session's end at its last turn**, not when it was noticed, so its length reads true (D144; the pinned
  tests move with it);
- **the band trend over time** on `/progress` and its printout: §8.9 asks for it, and the page shows the current window
  (D148);
- **a rendered preview on a `content/` pull request** (architecture.md §17, D152);
- **home's exam half's statement end to end**: no hermetic spec builds an onboarded user who has sat an exam (D146);
- **a mounted review screen re-reading the queue when the day changes**: left open overnight, or clicked while already on it,
  `/review` still shows yesterday's queue. It is ordinary Next behaviour, and it was found while fixing journey 4's flake,
  which was the test's fault (session log, 29 September 2026, cleanup slice).

**Running now (human): the product pilot** (Gate E, D97).
1. The Slice 4 branch has merged (#26). Confirm the production deploy applied migration `0001` itself.
2. Add the `TELEMETRY_DATABASE_URL` Actions secret (a read-only role), and allow Actions to open pull
   requests (`docs/deploy.md`).
3. Run the smoke check (`POST /api/telemetry` with an empty batch → 400).
4. Recruit 20–30 people. Each takes at least one mock exam and answers the prompt either way.
5. Afterwards, run the item-statistics workflow by hand and read its pull request.

Record the pilot in a session-log entry: participants, opt-ins, events, what the first report says (its
statistics are indicative only), and the product defects found, each fixed or filed. That ticks Phase 3's
last exit criterion.

**Standing human gates (do not self-direct):**

- **The full-volume published bank (D54).** The real-model go-signal exists (session log, 24 September
  2026). The remaining step is the full run to 500–700 published items on a funded key, then shipping that
  bank as `content/bank/v{n}/`, carrying the previous version's items *and forms* forward (D82). A
  retirement in `content/factory/item-statistics.json` takes effect at that build (D94). **Timing settled
  (D56, reaffirmed at Gate E): sequenced to the end**, a 1.0 gate. After it, rerun the pilot's calibration
  half on real items (D97).
- Resolved: **Gate A** (product and UI direction), **Gate B** (the D43 `ScheduleEntry` merge, D69),
  **Gate C** (hosting and database; `docs/deploy.md`), all on 24 September 2026; **Gate D** (exam UI
  direction, D84), **Gate E** (the pilot runs on the baseline bank, D97) and **Gate F** (Phase 4 UI
  direction, D97) on 25 September 2026; **Gate G** (the billing check, session log) on 26 September 2026; **Gate H**
  (Phase 5 direction, D113) on 27 September 2026; **Gate I** (the oral report, D129) and **Phase 6's decision gate** (studio
  mode deferred past 1.0, D131) on 28 September 2026; **Gate K** (Phase 7's UI and content direction, D145) on 29 September
  2026.

Standing human items:
- pointing `palier.dougkeefe.com` at the deployment;
- §12.1's trademark and language-school check before launch (D96);
- **the key guide's screenshots** (`/settings/key/guide`, PRD §8.1 step 5), which need a real OpenAI
  dashboard (D100);
- **a human read of the six workshop prompts' French** (D107), with the rest of Phase 7's R8 review.

D12 is closed.

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

### Phase 3: Exams and item statistics — closed pilot

**Opened 24 September 2026** (`dougkeefe/minnetonka-v3`). The `implementation-plan.md` §7 work
breakdown, expanded on start. Nothing is ticked without session-log evidence.

**Work breakdown (§7)**

- [x] Exam runner driven by the profile variants: navigator, flagging, timer with amber/red thresholds, checkpoint and resume with the clock preserved, pilot items — the core in Slice 1 (`dougkeefe/minnetonka-v3`, D80); **the UI in Slice 3** (`dougkeefe/naypyidaw`, D85–D87): `/exam`, `/exam/run`, the navigator drawer, the submit dialog, extra time, and the clock frozen while closed with the pauses counted
- [x] Results screen: band, raw score against the cuts, per-sub-skill breakdown, near-miss from the actual cuts, confidence calibration, review walkthrough — Slice 3 (`/exam/results`, D87), with pilots never revealed (D84 ruling 9), and the readiness card's exam half
- [x] Form generation in the factory: fixed, immutable, versioned forms per variant — **built** (Slice 2, `dougkeefe/next-slice-from-progress`, D82): `pipeline/forms.ts`, one form per profile variant in `content/bank/v2`, held byte-identical to a fresh run by `committed-bank.test.ts`
- [x] Telemetry opt-in, the post-exam prompt, `/api/telemetry`, client batching — Slice 4 (`dougkeefe/next-progress-slice`, D92, D93): the device-local consent asked once on the results screen and shown in `/settings/data`, a Dexie v2 queue flushed on every sync trigger, and a strict, capped, rate-limited `POST /api/telemetry` storing identity-free rows
- [x] The item statistics job: proportion correct and point-biserial per item, minimum counts, a PR retiring items that trip the rules — Slice 4 (D94): `itemStatistics` and `retirementVerdicts` in the engine, `scripts/item-statistics.mjs`, the monthly `item-statistics.yml`, and the factory retiring at the next bank build
- [x] Minimum response counts before an item's statistics are trusted, and the readiness-card disclosure — Slice 4 (D94): the profile's `minResponsesDifficulty` and `minResponsesDiscrimination`, and "None of the items behind this trend has enough recorded answers yet…" on home

**Exit criteria** (the actual gate)

- [x] All four exam variants runnable and correctly scored, golden fixture per variant at every cut boundary [R3] — the goldens (Slice 1), the forms (Slice 2), and **runnable** (Slice 3): the production container starts, runs and scores every profile variant from `content/bank/v2` over real IndexedDB, each at the top of its scale with pilots uncounted (`container.test.ts`), and the runner UI drives them (session log, 25 September 2026, `dougkeefe/naypyidaw`)
- [x] A full 90-minute exam survives reload and network drop (E2E journey 3) — `e2e/exam-offline.spec.ts`: the 60-item, 90-minute supervised reading form, a reload mid-run with the answers, flags and clock restored, the network dropped, submitted offline, and the band equal to an independent `scoreExam` oracle (session log, 25 September 2026)
- [x] Statistics job flags and retires a seeded reversed-key item on synthetic data — `syntheticTelemetry` seeds 300 respondents over 22 items with a too-easy item (exactly 98% right) and a reversed key. The job retires exactly those two, for `too-easy` and `low-discrimination`, in the fast lane (`item-statistics-job.test.ts`) and end to end through the real route handler on PGlite (`telemetry.integration.test.ts`). Robust over five seeds. Proven to bite: with an ordinary key in place of the reversed one, both fail (session log, 25 September 2026, `dougkeefe/next-progress-slice`)
- [x] Scoring is idempotent — `rescoreExam` derives the result from the stored run, and no result is stored (ADR 16). A fast-check property holds submit, rescore and a second rescore deep-equal, with each attempt agreeing with the result. The simulator also rescores on every device after every heal and requires the same result (session log, `dougkeefe/minnetonka-v3`)
- [ ] Closed pilot run, 20–30 people — the plan's human decision gate. **Gate E resolved (D97): a product pilot on the baseline bank, now**, with its statistics indicative only; running, human

**Completion slices (D79).** Four slices, mirroring `implementation-plan.md` §7 Phase 3 "Completion
slices". **Keep the two in sync**: the plan holds the fuller scope and each slice's *done*.

- [x] **Slice 1 — The exam core, no UI.** **Built 24 September 2026** (`dougkeefe/minnetonka-v3`; D80, D81;
  session-log evidence). It includes:
  - per-variant golden fixtures;
  - the `ExamRunStore` port;
  - start/answer/flag/checkpoint/resume/submit/rescore;
  - exam runs synced, exported and wiped;
  - an exam phase in the simulator, which found that the plan's attempt-id rule could not converge
    (D80).
- [x] **Slice 2 — Forms and a bank that can fill them.** **Built 24 September 2026**
  (`dougkeefe/next-slice-from-progress`; D82; session-log evidence). Factory form generation, and a
  baseline bank regenerated with the scripted provider as `content/bank/v2`, carrying v1 forward, with a
  form per variant (D54, D56).
- [x] **Gate D — exam UI direction (human).** Adopt PRD §8.4–§8.5 as-is, as Gate A did, or revise it
  first. Gates Slice 3. **Resolved 25 September 2026 (human decision, D84):** adopted with twelve
  rulings, eleven as recommended. Ruling 9 goes the other way: pilots are never revealed to the user.
- [x] **Slice 3 — The runner and results UI, and E2E journey 3.** **Built 25 September 2026** (`dougkeefe/naypyidaw`;
  D85–D87; session-log evidence). Exit criteria 1 and 2.
- [x] **Slice 4 — Telemetry and the item-statistics job, whole** (D88, rejoining D83's 4a and 4b).
  **Built 25 September 2026** (`dougkeefe/next-progress-slice`; D92–D94; session-log evidence).
  - The statistics core, `/api/telemetry` and the retirement job.
  - The opt-in, the post-exam prompt, the persisted client queue and the readiness disclosure.

  Carries exit criterion 3. Then the closed pilot (the human gate), now *Next, decided*.

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

- [~] Device list and revocation UI, pairing polished. **The list, remove and pairing by code exist** (Phase 2 Slice 2, D72:
  `SyncSettings.tsx`, `removeDevice`, journey 8). **Slice 3, built on this branch** (D149): a confirmation before a device is removed, the pair
  code's countdown and lapse, and this device's switch following a removal elsewhere
- [~] Retention job for inactive accounts (180 days) and the 90-day tombstone purge, the storage alerts, the aggregation
  path (architecture.md §9.4; D78 moved both jobs here). **Slice 2, merged (#45)** (D138, D139): the job, its daily
  workflow and the alert at 60% and 80%. The aggregation path is the 60% response, written as a runbook step in
  `docs/deploy.md`, not built, until the alert first fires
- [~] PDF progress summary; JSON export and import round trip. **The round trip exists** (D61, D62; `data-rights.test.ts`,
  journey 6). **Slice 3, built on this branch** (D148): the one-page PDF (PRD §8.9) as `/progress` printed, both skills and the oral line,
  one page on Letter and A4. A trend *over time* is named, not scheduled
- [~] The motion and illustration pass: Coco, the milestone moments, the streak, the band meter fill, self-hosted fonts
  (D65). Slice 4: the streak (with its silent freeze) and the milestone moments are in 1.0; XP, levels and the countdown
  are after 1.0 (Gate K, D145). **Slice 4, built on this branch** (D159–D161): the streak and its one-time freeze note, the
  four milestone moments with Coco cheering and a text-only share, the band meter's entrance fill, one motion switch, and
  Inter, Figtree and Source Serif 4 self-hosted
- [x] Accessibility audit with VoiceOver and NVDA on the core flows, and a screen-reader user's pass if one can be arranged.
  Human (Gate L). **Passed at Gate L** (D164). **The agent's half is built on this branch, Slice 3**: PRD §11's shortcut
  sheet at `?` (D150) and the `lang` audit (D151)
- [x] Security review: CSP tightening, Trusted Types, dependency audit, `SECURITY.md`, a deliberate attempt to leak the key.
  **Slice 1, merged (#39)** (D133–D137). Gate L's red-team read passed (D164)
- [~] The library: MDX reference articles on the taxonomy's grammar and register points, linked from item explanations.
  Slice 4: one article per written-expression sub-skill, ten, in both languages; reading's after 1.0 (Gate K, D145). The
  articles' French is part of Gate L. **Slice 4, built on this branch** (D162): ten articles as structured JSON, not MDX, at
  `/library`, linked from every written-expression explanation
- [~] Observability: the client diagnostic bundle, the prefilled issue path, no error reporting service (ADR 15). **The
  item-report issue path exists** (Phase 2). **Slice 2, merged (#45)** (D140–D142): the diagnostic bundle, the error
  states with a prefilled issue, and `/api/health`. The realtime route's exclusion from Vercel logging moves with studio
  mode (D131)
- [~] Content: the about page, the non-affiliation statement in both languages, the privacy notice, the contribution guide
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
- [ ] **Gate M — public (human).** The repo made public, an outside item submission [R13], the domain, §12.1's trademark
  check, and the full-volume bank (D54), which stays sequenced to the end (D56). **It waits on Phase 6** (D165).

**Exit criteria** (the actual gate)

- [ ] Every gate green, no known accessibility defects, no known security defects. The accessibility and security halves
  passed at Gate L (D164); ticked when Gate M is green
- [x] Both languages reviewed by a human [R8]. Gate L (D164)
- [ ] Repo public, licences in place, contribution path tested by someone else submitting an item [R13]

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
- [~] **Slice 2 — The studio screen, on the key.** **Built 30 September 2026** (`dougkeefe/raleigh-v3`; D180–D189;
  session-log evidence), not merged. Its *done*: the copy's parity is met; exit criterion 1 is measured and not met (D189);
  the cost per minute is not measured, and `pricing.json` keeps D167's figures (D189). The work:
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
- [ ] **Slice 3 — The exception, escapable.** The work (the copy moved to Slice 2, D173):
  - the self-hosted escape of ADR 3, through a popup to the user's own endpoint and `postMessage`, so `connect-src` stays
    `'self'` and OpenAI (D165);
  - the one-file Cloudflare Worker and the Vercel function in the repo;
  - the route's exclusion from Vercel logging verified, and written into `docs/deploy.md`;
  - the manual realtime checklist written out as `docs/realtime-checklist.md`.

  *Done:* the self-hosted path working end to end against a local endpoint.
- [ ] **Gate O — studio mode's release reads (human).** The checklist on Chrome, Safari and Firefox, desktop and mobile (exit
  criterion 3), the route read line by line, and the French of the new copy. Then Gate M.

**Exit criteria** (the actual gate). Two are added by D165.

- [ ] Session establishes in under 2.5 seconds from tap to first word. **Measured, not met** (D189): twelve dials, median about
  2.49 s, the first on a fresh server 2.5–3.6 s
- [ ] Disconnection mid-session recovers or fails cleanly with the transcript preserved
- [ ] Manual realtime checklist (`architecture.md` §14) passes on Chrome, Safari, Firefox, desktop and mobile
- [x] The examiner's French voice is judged credible at C level by a human (Gate N) — `cedar`, D174
- [ ] The key exception is stated wherever the copy promised otherwise, in both languages, and the self-hosted escape works

### Phase 8: English mirror

- [ ] Factory re-run with the mirror configuration
- [ ] **Zero application code changes.** Any change required is a defect in phases 0–7 to be understood, not an expected cost

---

## Requirement coverage

From `implementation-plan.md` §8. Status is *satisfied and verified*, not *worked on*.

| # | Requirement | Phase | Status |
| --- | --- | --- | --- |
| R1 | Practises all three tested skills | 2, 5 (6 after 1.0) | reading and written expression practised end to end (24 September 2026); **oral in practice mode** since Phase 5 (28 September 2026, Gate I, D129). Studio mode is after 1.0 (D131) |
| R2 | Format and register match the real tests | 1 | not started |
| R3 | Mock exams mirror published structure and cuts | 3 | **satisfied for reading and written expression** (25 September 2026): goldens at every cut (Slice 1), a form per variant at its exact counts, time and cuts (Slice 2), and all four variants runnable and scored in the app (Slice 3). The bank's French stays synthetic until the full-volume run (D54) |
| R4 | Works with no key and offline after first load | 2 | practice and progress verified offline (journey 2 on the `offline` project, 24 September 2026); mock exams too: journey 3 finishes and submits a full exam with the network off and reads its results offline (25 September 2026) |
| R5 | Never presents as official | 0, 7 | not started |
| R6 | No real test items, no PSC reproduction | 1 | not started |
| R7 | Rationale per option, explanation per item | 1 | not started |
| R8 | Fully bilingual, equal prominence | 0, 1, 7 | not started |
| R9 | WCAG 2.2 AA | 0, all | not started |
| R10 | No estimate without evidence and uncertainty | 2 | satisfied and verified (24 September 2026): below `MIN_EVIDENCE` a band shows no bar, only how many more answers it needs; above it, the Wilson interval is drawn beside the estimate (journey 1, `trend-lines.test.ts`, `BandMeter` tests) |
| R11 | Export, import, delete, each in one action | 2, 7 | Phase 2 half verified (24 September 2026): `/settings/data` does each in one action; journey 6 round-trips export → delete → import and finds the same progress. Phase 7's server-side delete waits for sync |
| R12 | Key, audio, transcripts and submissions stay local | 4, 5 | **the key half is satisfied and verified** (26 September 2026). The tier-11 key-leak test asserts the sentinel reaches no origin but `api.openai.com`, no storage but the vault's ciphertext, no synced document, no export and no error (D100). **The writing half is satisfied and verified** (26 September 2026, Slice 3): the leak guard follows a submission's text and finds it only in requests to `api.openai.com` and in this device's own copy (the page, the field, `writingSubmissions`), never in a push, a pull, an export, Web Storage or the paired phone; proven to bite three ways (D106). **Runtime-generated items are held the same way** (27 September 2026, Slice 4, D110): a generated stem reaches only OpenAI, in review requests, and this device's `generated` table and page. It never appears in a push, an export, Web Storage or on the paired phone, and no attempt is ever written for it. Audio and transcripts are Phase 5: **the store that holds them is device-local by construction** (27 September 2026, Slice 1, D115). It is never synced and never exported, and a wipe and a delete-everywhere clear it, over both graphs. **The audio half is satisfied and verified** (27 September 2026, Slice 2, D120): each answer's clip reaches only OpenAI's transcription endpoint; the session recording reaches no request at all; and the transcript stays on this device, going back to OpenAI only in the examiner's next question and never to a push, an export, Web Storage or the paired phone. Proven to bite three ways |
| R13 | Free and source-available, non-commercial (amended by the human, 29 September 2026, D153) | 0, 7 | licences committed (PolyForm Noncommercial 1.0.0 and CC BY-NC-SA 4.0, ADR 23); the repo is still private, so the Phase 7 half waits for it going public |
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

### D100 — the calls PRD §8.1 step 5 and §8.10 leave open, and how tier 11 runs "the entire suite"
**Date:** 26 September 2026 · **Status:** accepted (Gate F adopted the PRD as written, so these are recorded as
made, as D87 did)

- **Where step 5 goes.** "Diagnostic before key, always" (§8.1), but the wizard hands the diagnostic path off
  to `/diagnostic` after step 4. So:
  - on the **diagnostic path**, step 5 is offered on the diagnostic's readout, and only while no key is
    held;
  - on the **skip path**, where no diagnostic follows, it is the wizard's own fifth step;
  - the count reads "of 5" on both paths.
  - Its actions are "Add a key now", which **writes the profile first**, then opens `/settings/key`, and
    "Start practising". Passing it over costs nothing.
  - **An existing test changed, deliberately:** `onboarding.test.ts`'s "runs direction, target, placement,
    goal, and nothing after the goal". It now holds for the diagnostic path, and a new case gives the skip
    path its fifth step. The behaviour it pinned is the one this slice changes. The E2E helper `onboard()`
    gains the extra click on the skip path, with no assertion changed.
- **The copy is honest about ADR 3 as it stands.** It says the key "stays in this browser and is sent only to
  OpenAI". That is true of everything through Phase 5. The realtime exception joins the copy when Phase 6
  builds `/api/realtime/secret`. The key screen also says what §6.2 says: the encryption does not protect
  against a compromise of this site itself, so give Palier a key of its own with a monthly limit.
- **The key flow is save, then check**, because a check must go through `withAiProvider`, and so through the
  vault.
  - The field is `type="password"` and is replaced by the saved state once the key is stored.
  - The saved state reads "the key ending in abcd": the last four characters of §6.2, read through
    `withApiKey`, in words rather than a mask a screen reader would spell out.
  - "Keep it for this tab only" is unchecked by default.
  - Each result is a sentence (§14): invalid key, out of credit or rate-limited (one 429, since OpenAI uses it
    for both), timeout, unreachable, malformed, and any other status with its number.
- **The key guide** is `/settings/key/guide`: five numbered steps (sign in, billing, create the key, set a
  monthly limit, paste it here), with links to OpenAI's own billing, API-keys and limits pages. It is static,
  so it works offline. **The screenshots §8.1 asks for are a standing human item**, because they need a real
  OpenAI dashboard.
- **How the key-leak test runs "the entire E2E suite with a sentinel key".** §6.2 tier 11 says it does. The
  hermetic vault lives for one page load, and most specs start with `page.goto`, so a sentinel set per spec
  would not survive. Tier 11 is therefore **two specs driving every journey's flow by in-app links** once the
  sentinel is saved through the UI, over a reusable guard (`e2e/leak-guard.ts`):
  - `key-leak.spec.ts` (hermetic) drives the diagnostic, a drill, review, a mock exam with telemetry
    shared through the real route, an export, and a pairing with a second device. So real sync pushes and
    pulls cross the wire.
  - `key-leak-production.spec.ts` (`offline` project) uses real Dexie and the service worker. It finds a
    remembered key at rest only as the vault's ciphertext row, through a reload; a tab-only key never
    written; and a reload forgetting it.
  - **The guard watches from outside the page**, through the browser context, so the app cannot route
    around it:
    - every request's URL, headers and body, the service worker's included;
    - every same-origin API response body, so a stored key would show in a pull;
    - WebSocket frames, console messages and uncaught errors.
  - Then it dumps both Web Storage areas, every IndexedDB row (bytes read as latin1, so plaintext stored as
    bytes shows), the Cache Storage URLs, the DOM and every field's live value.
  - **A positive control** asserts the sentinel did reach `api.openai.com`, as a bearer token, so the test
    cannot pass because the key was never used.
  - "The sync payload builder" §6.2 names is covered at the wire, where every push is seen, rather than by
    instrumenting code.

### D101 — the `CostLedger` port, and every spending call metered inside `withAiProvider`
**Date:** 26 September 2026 · **Status:** accepted; §3.3 amended in place, as D69 and D92 were

*Next, decided* left the ledger's shape to this slice. D45 is the model for that.

- **`CostLedger { append, since(from), clear }`**, a port §3.3 did not name.
  - `CostEntry` is `{ ts, feature, model, inputTokens, outputTokens, costUsd: number | null }`. `null` means
    the model is unpriced, so the meter can say its total is a floor, not a zero that reads as free.
  - `since` is at or after `from`, oldest first, and has no upper bound, because money spent is spent.
  - **There is no `all()`.** D61 added it for export, and the ledger is never exported.
- **It is device-local: never synced and never exported** (architecture.md §9.4), like `TelemetryStore`.
  - No sync collector takes it, and `exportData`'s deps do not include it.
  - `wipeData` and `deleteEverywhere` clear it.
  - Tests hold all four. In `@palier/app`, export carries no entry, and a wipe or delete-everywhere
    empties it. In the container, the production graph's pushes over the real sync routes carry no entry.
- **`AiFeature`** is `"writing-feedback" | "item-generation"`, as `AI_FEATURES` in `@palier/domain` beside
  the other AI DTOs (ADR 20). Phase 5 adds the oral features. A key check spends nothing, so it is not a
  feature.
- **The Dexie adapter is over v1's own `costLedger: "++id, ts, feature"` table**, so no migration.
  - `since` walks the `ts` index, which orders by the ISO string and then by the `++id` key.
  - A row that is not a whole entry reads as nothing. That includes the `{ ts, feature: "none" }` placeholder
    the migration harness seeds as a v1 row, and the harness now asserts it.
- **`withAiProvider(deps, feature, fn)` meters every spending call.**
  - It hands `fn` the provider wrapped. Once each method settles, resolved or thrown, its `lastUsage()` is
    appended under `feature` at `clock.now()`, when it is not null. A call that failed after it was billed
    is still recorded, because OpenAI still bills it.
  - The wrap is generic, over the provider's own methods: every method but `capabilities`, `verifyKey` and
    `lastUsage` is metered. So Slice 3's `assessWriting` is metered with no edit here, and a test proves it
    with a method the port does not have yet.
  - **The methods a callback makes must be sequential**, since `lastUsage` reads the last call. This is
    documented at the wrapper. Slices 3 and 4 make their calls one at a time.
  - `MeteredAiDeps` adds `ledger` and `clock` to D99's `AiDeps`.
- **`checkApiKey` is not metered at all.** It shares `withAiProvider`'s private path to the factory,
  `withProvider`, so the factory still has one caller module (D99), and it needs no ledger.
- **Existing tests touched:**
  - The `withAiProvider` cases in `api-key.test.ts` gain the feature argument, and their deps gain a ledger
    stub and a clock. No assertion moved.
  - The `data-rights` and `sync-account` device stubs gain a ledger.
  - The container wiring lists gain `costLedger`.
  - `@palier/testing/in-memory`'s exact key list gains `memoryCostLedger`.
  - `dexieStores` wires nine ports, not eight.

### D102 — `lastUsage()` covers the whole of the last method call
**Date:** 26 September 2026 · **Status:** accepted; §3.3 amended in place

The adapter overwrote `usage` on every completion. `callValidated` retries once on a malformed reply, so a
retried call reported only its second completion. A call that failed before any completion left the
*previous* call's usage behind, for a meter to count twice. Either would have missed Gate G.

- **Each method starts from `null`, and every completion in it adds to the total**, a retry included.
  - A method that fails before it is billed leaves `null`.
  - One that fails after it is billed (malformed twice) still reports what it spent.
  - A 2xx answer with no content is billed **before** the content check, because its tokens were spent. It
    is not retried: it throws outside the parse retry, as before.
- `verifyKey` resets usage too, so it can never carry an earlier call's usage forward. The fake, the
  scripted provider and the adapter all do this. `aiProviderContract` gains the case "a key check after a
  billed call reports none".
- **Side effect, deliberate:** the factory's `meterProvider` now counts retries, as OpenAI bills them. The
  committed factory reports were made with the scripted provider, which never retries, so **no committed
  figure or golden moves**.
- `priceOf` now takes the summed counts. Pricing is linear, so this equals the sum of the parts. It also
  removed two `?? 0` branches the change had made dead.

### D103 — pricing as data, and what "session", "week" and "month" mean
**Date:** 26 September 2026 · **Status:** accepted

- **`apps/web/src/lib/pricing.json`** holds `models` (USD per MTok, the adapter's `OpenAiPricing` shape)
  and `features`.
  - `features` gives a typical use of each feature as its calls, `{ role, inputTokens, outputTokens }`,
    with roles from `ai-models.json`. One entry may stand for several calls to one role, since pricing is
    linear.
  - `src/lib/pricing.ts` structure-checks it at the edge, as the profile is.
  - `openAiFor` passes `models` to the adapter, so every ledger row is priced.
- **`ai-models.json` gains `assess`**, the model writing feedback will use. It is priced now, for the table,
  and Slice 3 wires it.
- **Tests hold it honest:**
  - every feature's estimate is priced;
  - every model the app configures has a price;
  - the browser's rates equal `apps/factory/config/pricing.json`'s for every shared id.
- **The rates and the token counts are placeholders**, as the factory's are. Gate G checks the rates, and
  measured counts replace the typical ones as each feature lands. The maintainer CI job that refreshes the
  file (architecture.md §8.6) is **Phase 7**, listed in `docs/deploy.md`'s "not yet built".
- **The meter's windows:**
  - **This session** is since this tab's container was built, the lifetime D98 gives a tab-only key.
  - **This week** starts Monday 00:00 UTC, and **this month** the 1st at 00:00 UTC.
  - UTC so the meter buckets as OpenAI's usage page does, which is the Gate G comparison. The key screen
    says so in words.
- **The 80% warning is `CAP_WARNING_PERCENT` in the engine**, not profile data. It is PRD §8.10 product
  behaviour, not a §5 exam rule (ADR 9).
  - `capState` compares whole micro-dollars, so 80% and 100% are exact boundaries rather than wherever a
    float lands. The case is 0.24 of 0.30, where 0.3 × 0.8 is 0.24000000000000002.
- **The pre-flight** is `preflightSpend(feature)`. It returns the estimate and the cap state before and
  after, and the caller warns when `after` is near or over. It never blocks, because the cap is soft and
  OpenAI's limit is the real one. An unpriced feature has a `null` estimate and cannot move the state.
- **The billing check** is `src/lib/billing-check.ts` (no relative imports, so Node's type stripping runs
  it) and `scripts/billing-check.mjs`.
  - It makes three `reviewItem` calls and two `generateItems` calls through `withAiProvider`, with a memory
    vault and ledger.
  - It prints the meter's total and the UTC window, and never the key.
  - It stops at the first failure rather than report a partial total.
  - The Gate G runbook is in `docs/deploy.md`.

### D104 — the cap syncs; the ledger does not; and the calls §8.10 leaves open
**Date:** 26 September 2026 · **Status:** accepted (Gate F adopted §8.10 as written, so these are recorded as
made, as D87 and D100 were)

- **The cap is a setting, `spendCap`, and so it syncs and exports.** The ledger does neither.
  - The cap is a preference, like the daily goal. Setting it once should hold on every device.
  - It needs no migration.
  - Each device compares it with **its own** spending, and the screen says so: "Spending is counted on each
    device separately. OpenAI's own limit covers all of them, and it is the real protection."
  - The other choice was a device-local cap, which needs a Dexie v3 table. It buys nothing the sentence
    does not.
  - A stored value that is not a positive, finite number reads as no cap. `null` removes it.
- **The screen** (`components/key/SpendSettings.tsx`, decisions in `features/key/spend-view.ts`) sits below
  the key cards and shows **whether or not a key is held**, since what was spent stays spent.
  - **The meter** is a `<dl>` of three figures in US dollars, per locale: "US$1.25" and "1,25 $ US". A spend
    too small to round to a cent reads "under US$0.01", never a zero that reads as free. A note appears if
    this month has unpriced calls.
  - **The cap** is a decimal field. It takes a French comma, a dollar sign and spaces, and refuses blank,
    non-numbers and zero, each with its own sentence.
    - Near the cap the note is `info`; at or past it, `incorrect`. `@palier/ui` has no warning callout, and
      a new primitive was not worth it for one note.
    - The share of the cap is rounded down, so 79.9% never reads 80.
    - The link is to OpenAI's limits page. It is now `features/key/openai-links.ts`, shared with the guide.
  - **The per-feature table** has a caption, column headers and row headers. Estimates under a cent show
    four places. A line says honestly that **both features arrive in coming updates** (Slices 3 and 4), as
    onboarding's offer already names them.
- **How E2E reaches the spending states.**
  - No screen spends until Slice 3. So `spend-production.spec.ts` (the `offline` project, real Dexie) writes
    rows into `costLedger` the way the adapter does, reloads, and reads the figures, the near and over
    warnings (axe on each), an unpriced note, "under US$0.01" and a wipe.
  - `key-leak-production.spec.ts` seeds one row and asserts the ledger is in its at-rest dump.
  - That a real call writes such a row is proven below the browser: `container-spend.test.ts` runs the
    real adapter over MSW completions through both graphs. The first spending screen puts a real call in
    the leak spec (Slice 3).

### D105 — `assessWriting`: the model quotes its errors, and the offsets are computed in domain
**Date:** 26 September 2026 · **Status:** accepted; §3.3 amended in place, as D99 and D101 were

*Next, decided* asked for errors as `{ start, end }` offsets into the user's text, with an offset outside the text,
or two ranges that overlap, counted as a malformed answer.

- **The DTOs are in `@palier/domain`** (`ai.ts`, `schemas/ai.ts`), as ADR 20 has it:
  - `WritingRequest` is `{ task, wordTarget, text, targetBand, lang, feedbackLang }`. `feedbackLang` is the
    interface language, so the evidence and the rules read in the language the user reads the app in, while the
    corrections and the model answer stay in the language being practised.
  - `WritingAssessment` is `{ criteria, errors, modelAnswer }`. `criteria` is a `strictObject` of exactly the five
    `WRITING_CRITERIA`, each `{ band: Band, evidence }`. Any PSC level is allowed, X and E included, since a
    criterion can fall below A or reach the exemption level.
  - `AiCapabilities` gains `assessWriting`.
- **A model reports excerpts, never offsets.** Language models count characters badly. An answer with a miscounted
  offset would draw a correction over the wrong words, and it would still pass any range check.
  - So the wire shape is `WritingFeedbackDraft`: each error is `{ excerpt, correction, rule }`, with `excerpt`
    copied exactly from the text.
  - The pure `placeErrors` finds each excerpt, searching from where the last one ended. That way a repeated phrase
    lands on its next occurrence, and a list out of reading order still places.
  - `checkErrorOffsets` then holds every range inside the text, with none overlapping.
  - Both live in `domain/src/writing.ts`, so the adapter, the fake, the Dexie read path and the screen share one
    rule. An excerpt that is not in the text, or two on the same words, is the "out of range" and "overlapping"
    case *Next, decided* named. It fails the parse, is retried once with the reason, and then becomes
    `InvalidResponseError`.
  - This is the same draft-then-assemble split D52 made for `ItemDraft`, and the port still returns offsets.
- **`OpenAiModels.assess` is optional.** The factory never assesses writing and configures no such model.
  `capabilities().assessWriting` is false without it, and the call is refused before any request.
  - `PROMPT_VERSION` stays at 3. Adding a prompt changes none of the others, and nothing the factory generates is
    traced to the new one.
- **ADR 20's *revisit when* clause** names "a runtime browser-generation use case in Phase 4" as the evidence that
  would reunite the DTOs with the port in `@palier/app`. `requestWritingFeedback` is such a consumer. But the
  factory still consumes the generate and review DTOs, so moving only the writing ones would give the AI DTOs two
  homes. The clause's evidence has appeared in part. Slice 4, which adds the runtime generation use case the clause
  actually names, is where to weigh it properly.
- **The factory's providers:** the scripted provider declares `assessWriting: false` and rejects, billing nothing.
  The meter passes the call through and accounts for it. Each has a test.
- **Existing tests touched:**
  - `api-key.test.ts`'s "meters a capability the port gains later" used `assessWriting` as its stand-in for a
    future method. It now uses `assessOral`, a Phase 5 method, because `assessWriting` is on the port. Its
    assertions are unchanged.
  - The adapter's "reports every Phase-1 capability" now expects `assessWriting: true`, because its test models
    configure `assess`. A new case covers `false` without it.
  - Stub providers in `api-key.test.ts`, `metered.test.ts`, `cli.test.ts` and `draft.test.ts` gained the
    method. That is a shape change only.

### D106 — the `WritingStore` port, Dexie v3, and R12's writing half
**Date:** 26 September 2026 · **Status:** accepted; §3.3 amended in place

- **`WritingStore { put, get, all, clear }`** over `WritingSubmission = { id, promptId, text, writtenAt,
  assessment | null }`. It lives in `@palier/app`, not domain, as `ExamRun` does. `all` is newest first.
- **Every save is a new submission.** An assessment's offsets point into the exact text it assessed, so an
  assessed submission's text never changes.
  - `saveWriting` then `requestWritingFeedback` are two use cases, so a failed call keeps the text and "Try again"
    asks about the same submission.
  - A submission that already has feedback returns it and spends nothing, so a double tap never pays twice.
  - The screen reuses the last save while the text is unchanged, and saves anew once it changes.
- **Device-local: never synced, never exported** (architecture.md §9.4), like `CostLedger` (D101). No sync
  collector takes it, `exportData`'s deps do not include it, and `wipeData` and `deleteEverywhere` clear it.
  - Tests hold all four: in `@palier/app` (`data-rights`, `sync-account`), in `container-writing.test.ts` over
    both graphs, and in `container.test.ts`. There, the production graph's real sync pushes carry none of four
    marker strings from the text, the feedback and the prompt id.
- **Dexie v3** adds `writingSubmissions: "id, writtenAt"`. It is a new table, so the upgrade moves no data.
  - The read path checks structure at the edge (D55). A row without a whole id, prompt, text and instant reads
    as nothing.
  - A row whose assessment is broken, or whose offsets no longer fit its text, **keeps its text and reads as
    unassessed**. The writing is the user's, and the feedback can be asked for again.
  - The migration harness gains a v2 device (v1's rows plus telemetry, and a real ledger row), and a v2 → v3
    case with the same three checks as v1 → v2.
  - **An existing test changed, deliberately:** `migration.test.ts`'s "v1 → v2" suite asserted `verno` 2. It is
    now "v1 → current", asserting 3, since a v1 device now upgrades straight to v3. Its other assertions are
    unchanged.
  - `dexieStores` wires ten ports, not nine.
- **The key-leak test follows the submission** (tier 11, R12's writing half).
  - The guard (`e2e/leak-guard.ts`) gains:
    - a `SUBMISSION_SENTINEL` word;
    - `openAiBodies()`, the positive control;
    - `assertNoLeak(pages, { deviceOnly, nowhere })`.
  - A `deviceOnly` text may appear only in requests to OpenAI and in this device's own copy, which is the page,
    a field's value and the `writingSubmissions` store. A `nowhere` text may appear nowhere at all.
  - `key-leak.spec.ts` (hermetic) writes a submission from the drill page's link, against a stubbed completion,
    before the pairing. The laptop is held to `deviceOnly` and the paired phone to `nowhere`.
  - `key-leak-production.spec.ts` (real Dexie) does the same. **D104's seeded ledger row is gone**: the dump now
    walks a real metered row and a real submission row.
  - Both export checks also refuse the sentinel word.
  - Each `assertNoLeak` now checks its own at-rest dump plus the event stream, rather than accumulating every
    earlier dump. The earlier dumps were already checked when they were taken.
  - **Proven to bite three ways, each reverted:**
    - the text in a synced setting, caught by the export check;
    - the text in a console line, caught by the guard, hermetic;
    - the text in `localStorage`, caught by the guard on the production build.

### D107 — the prompt library is `@palier/content/writing/prompts.json`
**Date:** 26 September 2026 · **Status:** accepted

*Next, decided* asked the slice to decide the path and the authoring.

- **The path:** `content/writing/prompts.json`, published as `./writing/prompts.json` in `@palier/content`'s
  exports map, with `writing` added to `files`, as ADR 18 prescribes for a new artefact.
- **How the app loads it:** bundled and parsed once at the composition root by `parseWritingPromptsOrThrow`, the way
  the profile is. It is small and the workshop needs it at once. The bank's HTTP path is for shards.
- **The schema:** `WritingPrompt` (`id`, `lang`, `register`, a both-locale `title`, `task`, `wordTarget`,
  `suggestedMinutes`) is a content artefact, so it is in `CONTENT_SCHEMAS` as `writing-prompt`, with
  `docs/schemas/writing-prompt.schema.json` generated and drift-checked.
  - The library is an array with at least one prompt and no repeated id, since a submission names its prompt by
    id.
  - `WRITING_REGISTERS` are the three §8.7 names: briefing note, reply to a client, meeting summary.
  - A domain test reads the committed file and holds it valid, all three registers present, and French for now.
- **The authoring:** six prompts, two per register, hand-written for this slice in Canadian federal French. They
  are original scenarios, with no PSC material (R6).
  - The task is in the practised language, as a bank stem is. The title is in both, so the picker reads in the
    interface language.
  - Generating more in the factory belongs to the content run (D56). The English mirror adds English prompts
    in Phase 8.
  - The French has not been reviewed by a human. That is Phase 7's R8 review, with the rest of the content.

### D108 — the calls PRD §8.7 leaves open
**Date:** 26 September 2026 · **Status:** accepted (Gate F adopted §8.7 as written, so these are recorded as made,
as D87, D100 and D104 were)

- **The route** is `/practice/writing/workshop`, a static island like every other screen. The writing drill's page
  links to it in an aside, which is also how the hermetic leak spec reaches it by in-app links.
- **Marked as supplementary** by an `info` callout at the top of every state: "the real test of written expression
  is multiple choice".
- **The editor:**
  - a plain `<textarea>` with `lang` set to the prompt's language;
  - a live word count against the target, with a tone (below, near, over; "near" is within a tenth either way);
  - an elapsed-time display in `@palier/ui`'s `Timer`, counting up, **never enforced**.
  - A screen reader hears the count in tens, and exactly from the target on, not on each keystroke. It hears the
    time once a minute.
- **Nothing is saved until "Get feedback".** Without a key nothing is saved at all: the user can practise writing,
  and PRD §14's inline card takes the button's place. The card says what the feedback does, what it costs (from
  `featureCosts`) and links to the key. It is never a dialog.
- **The pre-flight** is a step between "Get feedback" and the call. It shows the estimate, or says there is none,
  and an `info` or `incorrect` callout when `after` is near or over the cap. It never blocks: "Send for feedback"
  is always there.
- **The target band** is the study profile's, or C when there is none.
- **The feedback:**
  - the five criteria in a `<dl>`, each with its level and evidence;
  - the user's text with each error in a numbered `<mark>`, a wavy underline as well as a colour (WCAG 1.4.1),
    and the numbered corrections below with their rules;
  - the model answer diffed word by word against the user's text, with `<ins>` and `<del>`, visually hidden
    "added:"/"removed:" words for screen readers, and an underline or strike as well as colour.
  - **Known limit:** the diff joins words with single spaces, so the model answer shows without its paragraph
    breaks. The user's own text keeps them.
- **Failures** are the key screen's error names (`checkFailure`) in workshop words, each saying the text is kept.
- **History:** "Your earlier writing" lists this device's submissions, newest first, with or without feedback. It
  says they are never synced or exported. Opening one with feedback shows it again for free. Opening one without
  puts it back in the editor, ready to ask again.
- **The per-feature table's line** now names only item generation as still to come.
- **The workshop route joins the Lighthouse list** at `/fr/practice/writing/workshop`. It measured 0.99 on
  performance and 1.0 on accessibility.

### D109 — the review gate moves to `@palier/domain`, and ADR 20 stands
**Date:** 27 September 2026 · **Status:** accepted

*Next, decided* asked the slice to move the gate, not copy it, and to weigh ADR 20's *revisit when* clause.

- **What moved.** `gateReasons`, `CONFIDENCE_THRESHOLD` and `reviewRequestFor` went from
  `apps/factory/src/pipeline/review.ts` to `packages/domain/src/review-gate.ts`, unchanged. All three are pure,
  and their one runtime import is `bandRank`. The factory imports them back. `reviewItems`, the loop, stays in the
  factory.
- **The reason strings moved byte for byte.** `apps/factory/src/pipeline/metrics.ts` classifies a discard by each
  string's opening words, so rewording one would silently move the batch report's discard counts.
- **A new guard.** `committed-eval.test.ts` holds `content/factory/eval-report.json` equal to a fresh
  `palier-factory eval`. Nothing checked that file before; only the batch report was drift-tested. The move left
  both reports as they were, and `committed-bank.test.ts` passed unchanged.
- **The threshold stays a content-quality bar, not profile data** (ADR 9). It is not a §5 exam rule.
- **ADR 20's *revisit when* clause** says: "A second consumer of these DTOs appears that is naturally an
  `@palier/app` concern (for example a runtime browser-generation use case in Phase 4) and would read more
  naturally with the types beside the port."
  - **That evidence has now appeared**: `generatePracticeSet` is exactly that use case.
  - **The ruling is that the DTOs stay in domain.** Reuniting them with the port would give the factory an
    `@palier/app` dependency, which the factory boundary's documented intent forbids.
  - The move itself points the other way. The gate had to live where both the factory and the browser can reach
    it, and that is domain.
  - No superseding ADR is needed, because the decision did not change.

### D110 — `generatePracticeSet`, the `GeneratedItemStore` port, and how a generated item stays out of the trend
**Date:** 27 September 2026 · **Status:** accepted; §3.3 amended in place, as D101 and D106 were

- **Written expression only, by human decision** (this session). Sets use the three sentence-level types the
  factory already cycles: cloze, error-id and best-completion. None needs a passage.
  - A reading set would need a generated passage, somewhere to keep it, and a runner that can show a passage that
    is not in the bank.
  - Reading-set generation is a named follow-up, not scheduled.
- **`generatePracticeSet({ subSkill, targetBand, lang })`** is in `packages/app/src/use-cases/generate.ts`.
  - It picks the item type and a `Topic` with `Random`, which is selection randomness and never an id (D39).
  - It makes one `generateItems` call of `GENERATED_SET_SIZE` (5), then one blind `reviewItem` per draft, one at a
    time (D101). All of it runs inside one `withAiProvider(…, "item-generation", …)`.
  - **A draft is discarded, never repaired**, on any of four grounds: the item schema, the type's own `validate`, a
    type, sub-skill or band other than what was asked, or `gateReasons`.
  - **A failed call rethrows and keeps nothing**: no key, 401, 429, timeout, or malformed twice. Whatever it
    billed is already metered.
  - Keeping the items that passed before a review failed was the other choice. It would hand over a set cut short
    by a network fault, with some drafts never reviewed at all.
  - A set in which nothing passed is a result, not an error.
- **Assembly.**
  - The id is `gen-` plus an `IdGenerator` ULID, so it can never collide with a bank id.
  - The key position is shuffled with `Random`, as the factory's is from a content hash.
  - Provenance is `{ origin: "generated", generator: { model, promptVersion, date } }`, with the model taken from
    `lastUsage()` and the prompt version handed in by the composition root.
  - There is no `stats` and no `reviewedBy`, so the item reads as uncalibrated and not reviewed by a person.
  - `GENERATED_SET_SIZE` is product behaviour, not a §5 rule, so it is a constant in app, as
    `CAP_WARNING_PERCENT` is.
- **`GeneratedItemStore { putSet, latestSet, item, clear }`** over `GeneratedSet = { id, skill, createdAt, items }`.
  - It lives in `@palier/app`, as `WritingSubmission` does.
  - `latestSet` is the newest set by `createdAt`, with ties broken by id. A set with no items is not kept.
  - **The Dexie adapter is over v1's own `generated: "id, skill, createdAt"` table**, so there is no schema bump
    and `verno` stays 3. It writes one row per item, adding `setId` and `position`.
  - A row whose item is not a whole `Item` of the row's own id and skill reads as nothing (D55).
  - The migration harness seeds a v1 `generated` row, which survives the upgrade and reads as no set.
  - **Device-local: never synced, never exported.** No sync collector takes it, `exportData`'s deps do not
    include it, and `wipeData` and `deleteEverywhere` clear it. Tests hold this in `data-rights`, in
    `sync-account`, in `container-generate.test.ts` over both graphs, and on the wire in `container.test.ts`,
    where the production graph's real sync pushes carry no generated marker and no `gen-` id.
- **How a generated item stays out of the practice trend: no `Attempt` is ever written for it.**
  `scoreGeneratedAnswer` scores the answer by the type's own `score` and writes nothing: no attempt, no schedule
  entry, no session.
  - So a generated item cannot reach `practiceTrend`'s input, and nothing about it can sync. That is the
    structural form of *Next, decided*'s "their ids are kept out".
  - A tag on `Attempt` was the other choice, and it was rejected. It would change the export format, the sync
    hash and import merging, and generated attempts would still sync.
  - Tests: in `@palier/app`, the use case is handed the whole device and neither `attempts.append` nor
    `schedule.put` is called, with `practiceTrend` equal before and after. In the container, a whole set answered
    leaves the hermetic trend unchanged and both graphs' attempts and schedule empty.
- **Existing tests touched, shape only, with no assertion moved:**
  - the `data-rights` and `sync-account` device stubs gained `generated`;
  - `@palier/testing/in-memory`'s exact key list gained `memoryGeneratedItemStore`;
  - `dexieStores` wires eleven ports, so `index.test.ts`'s case name changed and it writes one more row;
  - the container wiring lists gained `generated`.

### D111 — the calls the fresh-set screen leaves open
**Date:** 27 September 2026 · **Status:** accepted (the screen follows Gate F's adopted §8.7 and §8.10 patterns, so
these are recorded as made, as D87, D100, D104 and D108 were)

- **The route is `/practice/writing/generate`**, linked from the writing drill's page in an aside beside the
  workshop link.
  - *Next, decided* put the action "on the drill page". It became its own route because a drill listens for §8.3's
    keys on the whole window, so two runners on one page would both answer.
  - The hermetic leak spec reaches it by in-app links.
- **The screen, `components/generate/GenerateSet.tsx`, with its decisions in `features/generate/generate-view.ts`:**
  - An intro, and an `info` callout saying generated items are kept on this device only, never synced or
    exported, and never counted in progress.
  - A sub-skill select over the profile's written-expression taxonomy (ADR 9). It defaults to the first entry,
    and the set is written at the study profile's target band, or C.
  - The pre-flight exactly as the workshop's: the estimate, and an `info` or `incorrect` note near or past the cap.
    It never blocks.
  - A status toast while the set is drafting. Failures are `checkFailure`'s names, in generation words.
  - The result is "N of 5 drafts passed the automated check", or that none did, with what gets a draft discarded.
  - "Your last generated set" is read from the store, so a reload never loses a set that was paid for.
- **Practising** goes through `PracticeSession`'s new `mode: "generated"`. The set is handed in whole, and each
  answer goes to `scoreGeneratedAnswer`.
  - No session is started or completed, and no sync is notified.
  - The end says the set never counts, and goes back to the screen.
- **The provenance badge** (PRD §13.0) is a disclosure on a generated item's feedback, in place of `ReportItem`,
  since there is no bank item to report. It reads: "Generated just now on your key. Reviewed by one automated check,
  not by a person. Not calibrated against real answers."
- **One tap to contribute** is `contributeIssueUrl(item)` in `lib/report.ts`, beside `reportIssueUrl`.
  - It uses the same repository and pattern, with the label `item-contribution`.
  - The body carries the whole item as fenced JSON: the stem, options, key, rationales, explanation, sub-skill, band,
    topic and provenance.
  - It has no bank version and no `gen-` id, since neither means anything off this device.
- **`NoKeyCard` moved to `components/key/`** and takes a namespace, shared by the workshop and this screen.
  - **An existing message key was renamed:** `writing.noKeyStillWrite` became `noKeyStill`. No test named it.
- **The per-feature table's "arrive in a coming update" line is gone** (`key.featuresComing`).
- **The route joins the Lighthouse list** at `/fr/practice/writing/generate`.

### D112 — the Phase 4 CI gates: recorded fixtures, the eval's rate, the nightly smoke, and a prompt fix they found
**Date:** 27 September 2026 · **Status:** accepted

- **The fixtures are recorded from the live API, never hand-written.** The human provided a key this session, and
  ran the recorder from their own terminal so the key never entered the transcript.
  - The recorder is `apps/web/src/lib/live-smoke.ts`, run by `scripts/live-smoke.mjs`.
  - It makes a fixed set of calls through `withAiProvider`, with a tee on `fetch` that keeps each completion as it
    arrived: a key check, 3 `generateItems` (one per sentence-level type, at the set size), 5 `reviewItem` and 2
    `assessWriting`.
- **Where the fixtures live: `packages/testing/src/recorded/openai/`**, one file per method.
  - Each file is `{ note, recordedAt, promptVersion, completions }`. Each completion keeps the port request, the
    message content exactly as it arrived, its usage, its attempt number, and whether the adapter accepted it
    without a retry.
  - **The files carry no header, no response id and no key.** A test holds this.
  - `@palier/testing` loads and shape-checks them as `RECORDED_RUNS`. Its tsconfig lists the JSON, and there is no
    new `exports` entry because the root entry carries them.
  - The factory may not import `@palier/testing`, so it reads the same files by path
    (`RECORDED_COMPLETIONS_DIR`, `loadRecordedRuns`).
  - *Next, decided* sketched `<method>-<n>.json`. One file per method, stamped with the prompt version, keeps a
    before and after legible.
- **Conformance is measured on the first attempt.** `packages/adapters/src/openai/recorded-fixtures.test.ts` replays
  every recorded completion through the real adapter with `maxRetries: 0`. Each must get the verdict it got when
  recorded: accepted, or refused as `InvalidResponseError`. **Proven to bite both ways, each reverted:**
  - capping `confidence` at 0.5 in the domain schema failed every accepted review;
  - loosening `estimatedBand` to any string failed the three prompt-3 refusals.
- **The first recording found a defect: the review prompt never named the band scale.**
  - Three of five reviews answered `estimatedBand` as "B1" (twice) or as a sentence. The schema refused each, and
    the adapter paid for a retry.
  - That is the retry Gate G's figures hinted at (session log, 26 September 2026).
  - **`PROMPT_VERSION` is now 4.** The review prompt asks for exactly one of `"A"`, `"B"`, `"C"`, from domain's
    `TARGET_BANDS`, never a CEFR level or a sentence. A new adapter test pins the wording.
  - **The re-recording conforms 10 of 10.** A review's average fell from 515 input and 754 output tokens to 329 and
    345.
  - The prompt-3 reviews are kept as `reviewItem-prompt-v3.json`: real refusals, so the gate holds in both
    directions.
  - The committed bank is untouched, because it records `SCRIPTED_PROMPT_VERSION`.
- **The eval harness reports the rate.** `palier-factory eval` now writes `schemaConformance` beside the detection
  figures, through one `runEval` that the CLI and `committed-eval.test.ts` share.
  - The report gives the prompt version, the files it is measured on, the count per method, the overall rate, and
    the older runs as `earlier`.
  - On prompt 4 it is 1.0 over 10 completions. The prompt-3 file is 5 of 8 completions: the three refused first
    replies, their three retries, and two that passed first time.
  - The detection figures did not move. It reports; it does not gate.
- **The nightly live smoke** is a second job in `nightly.yml`.
  - It gates on `OPENAI_SMOKE_KEY` in the `item-statistics.yml` pattern: without the secret it posts a
    `::notice::` and skips. The script itself exits 0 without a key.
  - A failed call, or a model in `ai-models.json` that OpenAI no longer lists (architecture.md §8.1), exits 1, and
    the job's own step opens an issue.
  - It writes its measured tokens to the run's summary.
  - `LIVE_SMOKE_RECORD=1` records as `--record` does. The chat turned `--` into an em dash when the command was
    pasted, so the environment switch was added for that.
- **`pricing.json`'s token counts are now measured** (D103):
  - writing feedback is 517 input and 1,733 output tokens;
  - a generated set is one draft call of 392 and 3,915, plus five reviews totalling 1,645 and 1,725.
  - That is about US$0.015 a submission and US$0.049 a set at the confirmed rates.
- **Existing tests touched:**
  - `cli.test.ts`'s temporary root now copies the recorded fixtures, because they are an input of `eval`. That is
    a setup change only, and one assertion was added for the new log line.
  - `openAiHandlers`' completions may now be a function of the prompt, with the existing callers unchanged.
  - `stubOpenAi`'s answer callback also receives the request body, with the existing callers unchanged.
- **Amended before merge, after the pre-merge review** (session log, 27 September 2026). The first definition above
  counted retries.
  - **The rate is now over first replies only.** A retry's reply is still replayed by the gate, but it never counts
    toward the rate, and the factory keeps each completion's `attempt`.
  - The prompt-3 run therefore reads **2 of 5 (0.4)**, not 5 of 8. Prompt 4 stays at 1.0 over 10.
  - A rate is `null`, not 0, when nothing was recorded on the shipping prompt.
  - The factory's loader now checks each completion as `runOf` does. A test holds `RECORDED_RUNS` equal to the files
    on disk.
  - The smoke stops before any paid call when a configured model is missing, and names the adapter's error when
    OpenAI answers with an error page that is not JSON.
  - The smoke key's suggested limit is US$10, since a month of nightly runs is about US$4.50.

### D113 — Gate H: PRD §8.6's practice mode adopted with the recommendations, Phase 5 is three slices, and GPT-Live noted for studio mode
**Date:** 27 September 2026 · **Status:** accepted (human decisions); resolves Gate H

- **Gate H is resolved.** The human adopted PRD §8.6's practice mode and post-session report as written, with the
  recommendations:
  - **All five session types** are offered in practice mode. The full simulation's 22 minutes are stated beside its
    estimate.
  - **Pronunciation is offered in Phase 5.** It is off by default and asked each session, as architecture.md §8.5
    has it.
  - **How long audio is kept was never open.** architecture.md §9.1's storage budget already sets it: the last 10
    sessions' audio, transcripts kept, a warning at 200 MB, a one-tap cleanup, and the oldest audio evicted on
    `QuotaExceededError`.
- **A contradiction resolved rather than carried, as D17 did.**
  - R12 and architecture.md §8.5 let audio go to the configured AI provider, and practice mode must transcribe every
    answer.
  - implementation-plan.md §7's Phase 5 exit criterion 3 said audio never leaves the device unless the user opts
    into pronunciation.
  - **R12 and §8.5 stand. The criterion is about the stored session recording.** Each answer's clip goes only to
    OpenAI's transcription call. The saved recording is uploaded only on that session's pronunciation opt-in. The
    extended key-leak test asserts both.
  - The criterion is amended in place in both documents, with this entry named.
- **Phase 5 is planned as three slices**, mirrored in implementation-plan.md §7, the same scoped exception D79 and D97
  made. Keep the two in sync.
  1. **The session core, no UI.**
  2. **The turn loop on the key.**
  3. **`assessOral` and the report.**

  Exit criterion 1, "a report a user would act on", is a human judgement. It is **Gate I**, at the end of Slice 3.
  A funded key is needed when Slice 3 measures cost and stability, and `OPENAI_SMOKE_KEY`'s will do.
- **GPT-Live, noted by the human for consideration.** Its model page
  (developers.openai.com/api/docs/models/gpt-live-1) and the Live API guides, read on 27 September 2026, say:
  - it is **`gpt-live-1`**, a full-duplex voice model with audio and text in and out, and function calling;
  - it is served **only by the Live API** (`v1/live/sessions`), not by the Realtime API, Chat Completions or
    Responses;
  - a browser connects over **WebRTC**, with audio on media tracks and JSON events on a data channel;
  - **US$0.05 a minute, billed per second.** Delegating to a backend model or tools is billed separately;
  - transcripts arrive as `session.input_transcript.delta` and `session.output_transcript.delta`, each with `start_ms`
    and `end_ms`;
  - "Keep the API key on your backend": a server exchanges the browser's connection offer, and no short-lived browser
    credential is documented;
  - **not documented:** French recognition and voices (the voice table shows English and Portuguese variants), and
    the session duration limit.
- **What GPT-Live changes:**
  1. **Not Phase 5 as adopted.** Practice mode's other reasons still hold: it works on a weak connection, it gives a
     weaker candidate time to think, and it builds the report before the realtime complexity. Its cost advantage
     narrows. Slice 3 measures the real ratio (exit criterion 2) rather than assuming one (principle 8).
  2. **Slice 1's transport port is shaped so a full-duplex transport can sit beside the turn-based one.** Utterances
     carry their timings as GPT-Live's transcript deltas do, phase boundaries stay client-driven, and a session closes
     with a reason. This is what exit criterion 5 exists for.
  3. **It is the leading candidate for Phase 6's studio mode.** At the published price a 10-minute session is about
     US$0.50, and the 22-minute simulation about US$1.10. **The Phase 6 decision gate's premise, "measured realtime
     cost is high", probably no longer holds.** That is decided at that gate, on measured cost.
  4. **ADR 3 stands, and adopting GPT-Live would need a new ADR superseding its mechanism**, never an edit.
     - ADR 3's decision names the `/v1/realtime/client_secrets` mint.
     - The Live API's documented path has a server exchange the connection offer using the key. That is the same
       exception, one stateless call per session, through a different call.
     - ADR 3's *revisit when* is: "OpenAI documents a browser-direct realtime auth path, or the feature is dropped."
       **That evidence has not appeared**: the Live docs say to keep the key on the backend.
  5. **Before Phase 6 commits to it, verify:**
     - French recognition and a French voice at C-level quality;
     - the session length limit against the 22-minute simulation and §8.5's 25-minute cap;
     - whether a short-lived browser credential exists.

     The model id is data (`ai-models.json`). The Live protocol is adapter work.

### D114 — scenarios through the bank: the scenario stage, bank v3, and the carry-forward D82 left open
**Date:** 27 September 2026 · **Status:** accepted; §3.3 amended in place (`ItemRepository.scenarios`,
`AiProvider.generateScenario`), as D85 and D105 were

- **`AiProvider.generateScenario(req) → ScenarioDraft`**, a fourth §3.3 amendment.
  - `GenerateScenarioRequest = { sessionType, targetBand: "B" | "C", lang, topic, minutes }` and
    `ScenarioDraft = { phases }` live in domain (ADR 20). The draft is the phase plan only: the factory copies
    the type, band, language and topic it asked for, and mints the id, as it does for passages and items.
  - `AiCapabilities` gains `generateScenario`. `oralScenarioShape` is unchanged, so no published JSON Schema
    moved. A scenario has no minutes of its own: its length is the sum of its phases'.
  - Every implementation gained the method: the OpenAI adapter, the scripted provider, the factory's meter,
    the fake, and seven test stubs (shape only, as D105 recorded). The app's generic `metered` needed nothing.
- **The OpenAI adapter plans on an optional `models.scenario`**, as `assess` is optional. Without it, the
  capability is false and the call is refused before any request.
  - A plan whose minutes do not fill the session is refused **at the parse**, so it is retried once like any
    malformed answer, rather than paid for and then discarded by the factory.
  - The prompt names the session type's purpose from PRD §8.6. `PROMPT_VERSION` stays 4, because adding a
    prompt changes no other (D105's precedent).
  - The factory's `models.json` sets `scenario` to the drafter's model. The browser's `ai-models.json` has
    none: nothing in the browser plans a scenario.
  - **No recorded fixture yet.** D112's rule is recorded, never hand-written, and this session had no key. A
    scenario recording belongs to the full-volume run (D56); `RECORDED_METHODS` is unchanged.
- **The scenario stage** (`apps/factory/src/pipeline/scenarios.ts`).
  - `content/factory/oral-sessions.json` names each session type and its length (5, 10, 12, 8 and 22 minutes,
    PRD §8.6), and the bands, B and C. **These are factory configuration, not profile data** (ADR 9): PRD §5.3
    says the PSC publishes no phase breakdown, so a session's length is Palier's product, not an exam rule.
    It is loaded and shape-checked by `loadOralSessions`.
  - One call per session and band, on a topic fixed by hashing the pair, so a rebuild picks the same one.
  - **Discard, never repair**, on four grounds: the scenario schema; phases whose minutes do not fill the
    session; a phase with no harder follow-up or no simpler reframe, because the session's difficulty flag
    would have nowhere to go; a duplicate. A failed call is counted and skipped, as the other stages do.
  - It runs **after** the item stages. The batch report's `provider` is taken before it, so it stays the item
    stages' model.
  - The scripted provider fills it: 2 phases for the warm-up, 5 for the simulation and 3 otherwise, whole
    minutes spread evenly, and French questions from fixed pools seeded by the request.
- **The carry-forward now covers forms and scenarios.** This closes D82's residual, which named it "the
  full-volume content run's first task". It could not wait for that run: v3 without v2's forms would have
  dropped the forms that the pilot's mock exams rescore from (ADR 16).
  - `CarriedBank` gains optional `forms` and `scenarios`; `loadPublishedBank` reads both through the
    manifest.
  - **Carried forms sit beside the new version's own**, and `checkForms` checks both. The exam picker already
    offers the highest version per variant (`variantChoices`), so no UI moved.
  - Carried scenarios go ahead of new ones, so a regenerated duplicate is the one dropped.
- **A deviation found by building v3: a carried passage now keeps its published record.**
  - `runPipeline` used to write the batch's passages over the carried ones by id. A re-constructed passage has
    the same id, because the id is its body, but a new `source.retrievedAt`. So a published passage's
    provenance was being rewritten to a later retrieval date.
  - v2 did this to v1's passages. v2 is published and is left as it is.
  - Carried passages now win, as carried items do, and a test names it. v3's passage shard is byte-identical
    to v2's.
- **The manifest lists the scenarios file**: `scenarios: { path, hash }`, or `null` with none, plus
  `counts.scenarios`.
  - Before this, the file was written but not listed. The service worker never precached it, and the adapter
    found it by a 404 probe.
  - The bank adapter now reads the entry, and a bank with none fetches nothing. v1 and v2 predate the key and
    read as shipping none.
  - `bankFilesIn` precaches the file. MSW's `bankHandlers` lists it.
- **`ItemRepository.scenarios()`**, beside `scenario(id)`, for Slice 2's session picker, as D85 added `forms()`.
  It is on the memory repository, the HTTP adapter and `itemRepositoryContract`. One-line stubs went into the
  eight app test fakes D85 touched.
- **Bank v3 is committed**, built with `PALIER_NOW=2026-09-27T00:00:00.000Z`.
  - The item seeds do not depend on the batch id, so the re-drafted items are v2's own, and each is dropped as a
    duplicate of its carried self. v3 publishes **0 new items and carries all 242**. The item and passage shards
    are byte-identical to v2's.
  - v3 carries v2's four forms, byte-identical, beside four new `fr-*-v3` forms, and holds **10 scenarios**,
    one per session type at B and C.
  - `DEFAULT_BANK_VERSION` and `BANK_VERSION` are 3.
- **The committed reports moved, each explained.** `batch-report.json`:
  - `itemsPublished` fell from 232 to 0, and `itemsCarried` rose from 10 to 242, for the reason above;
  - `costPerAcceptedItemUsd` is `null`, because no item was published this batch (`metrics.ts`'s existing
    rule);
  - `totalCostUsd` rose from 16.72 to 16.97, which is the ten scripted scenario calls;
  - the new `scenarios: 10` and `scenariosCarried: 0`;
  - the batch id and `generatedAt` are the new date.

  `drafted.json` and `source-queue.json` differ only by date. `eval-report.json` did not move.
- **Existing tests touched, with no assertion weakened:**
  - `committed-bank.test.ts`: "one form per variant" became "one form of its own per variant", because v3
    also ships v2's. It gained "carries every form the previous version published" and "ships a scenario for
    every session type at B and C".
  - `cli.test.ts`: the temporary root copies `oral-sessions.json`, since it is an input now. The
    default-version tests read `DEFAULT_BANK_VERSION` instead of a literal `v2`. The retired-item check covers
    the forms v2 draws itself; v1's forms are carried as published, retired item and all, which is the point.
  - `bank-build.test.ts`: the manifest counts gained `scenarios`.
  - `bank-handlers.test.ts`: the contract bank holds two scenarios now, and the manifest lists them.
  - `http-bank-repository.test.ts`: the scenarios error test had passed vacuously. Its manifest 404'd before
    the scenarios file was ever fetched. It now serves a manifest that lists the file.

### D115 — the `OralStore` port, and architecture.md §9.1's retention in the use cases
**Date:** 27 September 2026 · **Status:** accepted; §3.3 amended in place (it named `OralStore` and gave no
signature), as D45 and D106 were

- **`OralStore { put, get, all, putAudio, audio, audioIndex, deleteAudio, clear }`** over `OralSession = { id:
  SessionId, scenarioId, startedAt, endedAt, endReason, turns }` and `OralAudioEntry = { sessionId, bytes,
  startedAt }`.
  - The session is an aggregate owned by its store, in app, as `WritingSubmission` is. Its parts, `OralTurn` and
    `OralEndReason`, are domain's (D116).
  - `endedAt` and `endReason` are both null or both set. `turns` only grows.
  - `all` is newest first, and `audioIndex` oldest first with each recording's size, so the policy never reads
    a blob to choose one.
  - `putAudio` rejects for an unknown session, replaces an earlier recording, and rejects with the port's own
    `StorageQuotaError` when the device is full, storing nothing.
  - **A recording is a `Blob`**, not bytes. §3.3's `transcribe(audio: Blob, …)` already takes one,
    `MediaRecorder` produces one, and IndexedDB stores it without a copy on the heap. It is a platform type,
    not a vendor's, and the base tsconfig has the DOM lib.
- **Device-local: never synced and never exported** [R12]. No sync collector takes it, `exportData`'s deps do not
  include it, and `wipeData` and `deleteEverywhere` clear it. Tests hold this in `data-rights`,
  `sync-account` and `container-oral.test.ts`, the last over both graphs.
- **The retention policy is in the use cases, not the store** (`packages/app/src/use-cases/oral.ts`).
  - `AUDIO_KEEP_SESSIONS` (10) and `AUDIO_WARNING_BYTES` (200 MB) are storage policy, not §5 rules, so they are
    app constants. *Next, decided* said "as `CAP_WARNING_PERCENT` is", but that constant lives in the engine;
    the right precedent is `GENERATED_SET_SIZE`.
  - **`saveOralAudio`** first deletes the oldest other recordings down to `KEEP − 1`, quietly, because that is
    the policy the user was told. On a quota error it evicts the oldest and tries again, and it **reports** what
    it evicted, because §9.1 says to tell the user. With nothing left to evict it rethrows. A failure that is
    not the quota evicts nothing.
  - **`oralStorageEstimate` counts Palier's own stored audio**, not `navigator.storage.estimate`. It is
    deterministic, it needs no new port, and audio is the one thing that grows (attempts are about 4 MB a year).
    The browser's figure covers the whole origin, the cached bank included, and some browsers pad it.
  - **`cleanUpAudio`** deletes every recording in one action. It **never deletes a transcript**: §9.1 keeps
    transcripts forever.
- **The Dexie adapter is over v1's own `oralSessions` and `oralAudio` tables**, so there is no version bump and
  `verno` stays 3.
  - A session reads only if it is whole: an end and a reason both set or both null, and every turn passing
    `oralTurnSchema`.
  - A recording row keeps `bytes` and its session's `startedAt` beside the blob.
  - `putAudio` checks the session and writes in one transaction.
  - **`QuotaExceededError`**, by name or as a Dexie wrapper's `inner`, becomes `StorageQuotaError`.
    fake-indexeddb cannot run out of room, so a test injects the failure.
  - The plan also named Safari's `UnknownError`, and it was dropped: it is not specific to quota, and taking
    it for quota would evict a user's recordings on an unrelated fault.
  - The migration harness seeds v1 placeholder oral rows, which read as none. A new case proves a working
    store in v1's own tables.
- **Existing tests touched, shape only:**
  - the `data-rights` and `sync-account` device stubs gained `oral`;
  - `@palier/testing/in-memory`'s exact key list gained `memoryOralStore`;
  - `dexieStores` wires twelve ports, so `index.test.ts`'s case name changed and it writes one more row;
  - the container wiring lists gained `oral`.

### D116 — the session machine, the `OralTransport` port, and the driver that joins them
**Date:** 27 September 2026 · **Status:** accepted; §3.3 amended in place (a port it did not name, as D69's
`SyncStateStore` was)

- **The vocabulary is in domain** (`oral-session.ts`): `OralTurn = { speaker, text, phase, startMs, endMs }`,
  `ORAL_END_REASONS`, `OralDirection` and `OralRegister`, and `oralTurnSchema` with a type-level test.
  - Domain is the one place the engine, the app and Slice 3's `assessOral` DTOs can all reach.
  - Times are milliseconds since the session opened, GPT-Live's `start_ms`/`end_ms` shape (D113).
  - **The end reasons are `completed`, `ended-by-user`, `transport-closed`, `transport-failed` and
    `interrupted`.** There is no time-cap reason: a session completes at its scenario's length (22 minutes at
    most), and §8.6's 25-minute disconnect is a studio-mode guard for Phase 6.
- **The machine is pure, in the engine** (`startOralSession`, `stepOralSession`), the engine's first state
  machine.
  - Time arrives as `atMs` on each event (D32). A phase boundary is the running total of minutes, rounded once,
    so fractional minutes never drift.
  - One event crossing several boundaries **enters each phase in turn**, and never jumps.
  - Difficulty emits `adapt` for the current phase, only when the register changes. A phase always starts at its
    baseline.
  - At or past the length the session closes `completed`, whatever the event, with every phase entered.
  - Every close carries a reason, exactly once, and an ended machine emits nothing. An earlier `atMs` counts as
    the later.
  - **Nine properties** hold this over any plan and any events, among them: never skip or repeat a phase, end by
    the length, one close with a reason, and tick density does not matter. They pass at nightly strength, and
    the file is at 100% coverage.
- **`OralTransport { open(req, sink), direct(directive), close() }` is push, one shape for both transports.**
  - Events are whole turns with their times, difficulty flags, and exactly one `closed { failed }`, last.
  - A full-duplex client must send phase boundaries on time while the candidate is silent, so a pull loop
    waiting on the next utterance could not drive it. The screen's timer ticks the session instead, as it
    checkpoints an exam.
  - The sink is handed over at `open`, so no event precedes a listener.
  - `direct` rejects before `open` and is a no-op after close. `close` is idempotent, and resolves once
    `closed` has been delivered.
  - Turn timings need only `0 ≤ startMs ≤ endMs`, with `startMs` never decreasing for one speaker: turns
    overlap in a full-duplex session, and transcription lags.
- **The driver is `startOralSessionRun`**, in app, and returns `{ scenario, tick, endByUser, ended }`.
  - The session id comes in the request (D39). **A second start under a stored id rejects**, so a double tap
    never opens two connections under one id. The plan said it would return the stored session; a session
    cannot resume, so there is nothing to return.
  - Earlier sessions left running are stamped `interrupted` first.
  - Time is wall-clock elapsed from the start. A session never resumes, so, unlike an exam run, no elapsed time
    needs carrying.
  - One queue carries the transport's events, the ticks and the end control.
  - Each turn is saved as it arrives, stamped with the machine's phase once it has caught up with the clock.
  - The end is written only when the transport says `closed`, so an answer still in flight is kept.
  - A transport that cannot open ends the session `transport-failed`, and the error is rethrown. A directive that
    fails rejects `ended`.
- **`@palier/testing`**: `memoryOralTransport(script, { deliverOnClose? })` is a scripted examiner, clock-free,
  with `advance`, `hangUp` and `directives`. `oralTransportContract` runs over a harness any transport can
  implement.
- **Exit criterion 5's test is `packages/testing/src/memory/oral-session.test.ts`**, not an app test, because an
  app test may not import `@palier/testing` (D37).
  - It runs the real driver over the fake transport with a `FakeClock` and the memory store, for every
    fixture-bank scenario, one per session type.
  - For each, it checks that every phase is directed once, in order, and that the session completes at the
    length with every turn stamped with its phase.
  - It also covers an early end, a drop both clean and failed, an answer delivered after close was asked, and
    an interrupted session.
- **The hermetic graph wires no transport and no oral use cases.** Slice 2 is the first consumer. Only the store
  is wired, so a wipe clears it.

### D117 — the turn loop's three capabilities, and pricing in the unit each model is billed by
**Date:** 27 September 2026 · **Status:** accepted; §3.3 amended in place (`transcribe` amended, `speak` and
`examinerTurn` added), as D105 and D114 were

- **The models are a human decision this session: `gpt-transcribe` and `tts-1`.** OpenAI's pricing page, read on 27
  September 2026, bills gpt-transcribe at US$0.0045 a minute and tts-1 at US$15 per million characters. The speech
  endpoint reports no usage, so a token-billed voice (`gpt-4o-mini-tts`) could only ever be estimated. Both chosen
  units are ones the device measures: a clip's length and the characters sent. That keeps Gate G's promise that the
  meter matches the bill (principle 8).
- **GPT-Live was weighed against practice mode first, at the human's request.** Practice mode comes to roughly
  US$0.01–0.02 a minute: transcription about US$0.003, speech about US$0.005, and the examiner's text calls about
  US$0.007, which grow with the transcript. GPT-Live is US$0.05 a minute. So practice mode is about **3–4× cheaper,
  not the 10×** the plan assumed. Gate H stands on its other reasons, and Slice 3 measures the real ratio (D113).
- **The DTOs are in domain** (ADR 20):
  - `TranscribeRequest { audio: Blob, lang, durationMs }` and `Transcript { text }`. §3.3's `transcribe(audio, lang)`
    becomes a request, because the recorder's measured `durationMs` is what prices the call when the response reports
    no usage. That is the amendment.
  - `SpeechRequest { text, lang }`, which returns a `Blob`, the platform type D115 already admits.
  - `ExaminerTurnRequest { sessionType, targetBand, lang, topic, phase, register, transcript }` and `ExaminerTurn {
    text, difficulty }`. The phase and the register come from the client, which drives the phases (architecture.md
    §8.5 step 5); the model writes one short question and flags the last answer. `examinerTurnSchema` re-validates the
    reply.
  - `AiCapabilities` gains all three, and `AI_FEATURES` gains `"oral-practice"`.
- **The adapter** (`openai-provider.ts`):
  - `FetchLike` widens: a body may be `FormData`, and a response may offer `headers` and `blob()`.
  - **`transcribe`** posts the clip once as multipart to `/audio/transcriptions`, with `language` and
    `response_format: json`. The file name carries the format, since OpenAI reads it from the extension. The seconds
    billed are the response's own when it reports `usage.type: "duration"`, and otherwise the recorder's `durationMs`.
    Reported tokens are kept either way. **It is never retried**: that would upload the clip twice.
  - **`speak`** posts JSON to `/audio/speech` with the model, the words, the voice and `mp3`, and reads the body as a
    `Blob`. It bills the characters sent. A 2xx answer that is not audio, or is empty, is `InvalidResponseError`, still
    billed.
  - **`examinerTurn`** goes through `callValidated`, with the new `buildPrompt.examiner`: architecture.md §8.5 step
    4's persona, the phase's intent and its three question lists, the register's instruction, the conversation so far,
    and the reply shape. `PROMPT_VERSION` stays 4, following D105's precedent.
  - Each call has its own optional role (`transcribe`, `speech`, `examiner`) and is refused before any request without
    it, as `assess` and `scenario` are. The voice is configuration (`voice`, default `alloy`).
- **Pricing is a union in the unit OpenAI bills by.**
  - `ModelPrice` is `TokenPrice | MinutePrice | CharacterPrice`, and `FeatureCall` is the matching union.
    `UsageRecord` gains optional `audioSeconds` and `characters`.
  - **One pricing rule, `costOf`, in domain**, serves both the adapter, which prices each call, and the engine's
    `estimateFeatureCost`. It is `null`, never zero, when the unit the model is priced in was not measured. The
    adapter may not import the engine, so domain is the place both can reach. No golden moved: the token arithmetic is
    unchanged.
  - `estimateFeatureCost` and `preflightSpend` take a quantity. **`oral-practice`'s typical use is one minute**, so a
    session's estimate is its minutes times that.
  - `pricing.json` prices `gpt-transcribe` per minute and `tts-1` per million characters. Its `oral-practice` entry
    is one minute: about 1.5 examiner turns, 180 characters voiced and 0.6 minutes transcribed. The examiner's
    tokens were a guess (1,500 in, 60 out) until the recording measured a turn; they are now 564 in and 134 out,
    about US$0.0076 a minute in all. **The rest are placeholders until Slice 3 measures a session** (exit
    criterion 2).
  - `ai-models.json` gains `transcribe`, `speech` and `examiner` (gpt-6-luna), and `voice` ("sage"), which
    `roleModels` leaves out because it is not a model.
- **The factory:**
  - `meterProvider` passes each new method through and accounts it.
  - The scripted provider declares all three false and rejects, billing nothing, as it does for `assessWriting`.
  - The eval's `CONFORMANCE_METHODS` gains `examinerTurn`. `RECORDED_METHODS` also has `transcribe` and `speak`,
    which are recorded for the adapter's replay gate but kept out of the rate, since no prompt writes them.
    `eval-report.json` gains `examinerTurn`, at 2 of 2 on the recording.
- **Recorded fixtures take audio without keeping it.** A `transcribe` completion keeps the response body and describes
  the clip by type and size. A `speak` completion keeps `{ contentType, bytes }`. The replay gate rebuilds a blob of
  that size. The live smoke voices a fixed French question, transcribes that same audio (so nobody's voice is
  recorded), and asks the examiner twice.
- **The recording, run by the human from their own terminal** (session log): all 14 completions were accepted on the
  first try, the three new methods included.
  - **gpt-transcribe reports its own usage**, `{"type":"duration","seconds":5}`, against the recorder's 5.3-second
    estimate, so the meter bills OpenAI's figure. That is the adapter's first choice.
  - The transcription gave the French question back word for word.
  - The examiner's second turn escalated on a capable answer, as asked.
  - The other two features' measured counts moved, so `pricing.json` takes them, as the runbook says. The examiner's
    measured turn (376 in, 89 out) replaces the guess in `oral-practice`'s minute. The rest of that minute stays a
    placeholder for Slice 3.
- **Existing tests touched, with no assertion weakened:**
  - `AI_FEATURES`' exact list and the per-feature lists in `spend.test.ts`, `container-spend.test.ts` and
    `pricing.test.ts` gained `oral-practice`, and their fixtures gained an entry for it;
  - the adapter's "reports every capability" gained the three, since its test models configure them;
  - `eval/conformance.test.ts`'s `byMethod` gained `examinerTurn`;
  - the live smoke's `byMethod` gained three empty entries, and `--record` now writes six files;
  - seven `AiProvider` stubs gained the methods, a shape change only;
  - two web tests narrowed a price to its token form before reading `inputPerMTok`.

### D118 — the `AnswerSource` port, and `turnBasedTransport` in `@palier/app`
**Date:** 27 September 2026 · **Status:** accepted; §3.3 amended in place (a port it did not name, as D116's
`OralTransport` was)

- **`AnswerSource { answer(question, signal) }`** is the candidate's side of a turn-based session.
  - The transport hands over each `ExaminerQuestion { text, audio: Blob | null, phase }` and waits for a
    `CandidateAnswer`: a clip with its measured `durationMs`, or typed words.
  - One port both shows the question and collects the reply, so the screen needs no side channel for the
    examiner's voice. *Next, decided* named a port that only collected answers. That would have left the question
    and its audio with no way to reach the screen.
  - `answer` rejects when `signal` aborts, which is how a session ended mid-question stops waiting.
  - The browser's adapter (a `MediaRecorder` recorder, or a text field) is Slice 2's web half. The memory one is
    `memoryAnswerSource`.
- **`turnBasedTransport(deps)` implements `OralTransport`** in `use-cases/oral-practice.ts`. It is orchestration over
  two ports and nothing vendor-specific, so it lives in app, not in an adapter.
  - **Each turn:**
    1. One `withAiProvider(…, "oral-practice", …)` writes the question with `examinerTurn` and voices it with
       `speak`, sequentially (D101). A provider with no voice gives text only.
    2. A difficulty flag is emitted, then the examiner's turn.
    3. The question goes to the `AnswerSource`.
    4. A clip is transcribed in its own metered call; typed words go straight through.
    5. The candidate's turn is emitted.
  - A provider made inside the vault's callback cannot outlive it (D99), so each step is a fresh call rather than
    one provider held for the session.
  - **`open` starts at phase 0's baseline**, which is where the machine's first directive puts it.
  - **`direct` returns at once.** The driver awaits it inside its own queue, so a directive that waited for the
    examiner would stall ticks and the end control. It only sets the phase and register of the next question, and
    a phase outside the scenario is clamped to it.
  - **`close` aborts the wait, delivers a turn already in flight, and then `closed`**, per the port. It waits only on
    the transport's own step, never on the driver's queue, so it cannot deadlock.
  - **Any failed call closes it failed**: the examiner, the voice, the transcription, a candidate's side that fails,
    or no key. `lastError()` keeps the error, so the screen names it with `checkFailure`. The transcript so far is
    already stored, turn by turn.
  - **Times:** an examiner's turn is the instant it is shown. A clip ends when it arrived and starts its measured
    length before, clamped to no earlier than 0 and no earlier than the previous answer's start. A typed answer spans
    the wait for it. Transcription latency is not speech, so it is never counted.
- **`startOralPracticeRun`** composes a fresh transport with `startOralSessionRun` and adds `failure()`.
  **`oralSessionChoices`** gives the picker one scenario per session type, in PRD §8.6's order, in the language
  practised. It picks the study band, or the other band when the bank has none at it, and a profile aiming at A
  practises at B. A type the bank lacks is left out rather than offered empty.
- **What the contract's `directives()` means for a turn-based transport.** `oralTransportContract` asks what "reached
  the examiner's side". A turn-based examiner speaks only after an answer, so its side is the transport's own state.
  The harness (`memory/turn-based-transport.test.ts`) records what the transport accepted while open, seen at the
  port. `hangUp(true)` is the candidate's side failing. How each directive shapes the next question is held by
  app's unit tests.
- **Tests:**
  - app, over local fakes (D37): 29 cases, 100% of branches;
  - testing: the contract run; `memory/oral-practice.test.ts`, a whole session per fixture session type, each asking in
    every phase in order and completing at its length; and `memoryAnswerSource`'s own cases.

### D119 — the calls PRD §8.6's practice mode and §14 leave open
**Date:** 27 September 2026 · **Status:** accepted (Gate H adopted §8.6's practice mode and §14's states as written, so
these are recorded as made, as D87, D108 and D111 were)

- **The route is `/practice/oral`**, a static island (`components/oral/OralPractice.tsx`). Its decisions are in
  `features/oral/`: the reducer, the failure words and the estimate in `practice-view.ts`, the microphone rules in
  `mic.ts`, and the `AnswerSource` bridge in `answer-bridge.ts`. Home's actions card links to it ("Practise
  speaking"), so the hermetic journeys arrive by links.
- **The steps: pick, check the microphone, confirm, run, end.** An action from another step is ignored, so a late
  question after the end cannot move the screen.
  - **The picker** lists the five session types in PRD §8.6's order, from `oralSessionChoices`. Each shows its purpose
    and "N minutes · about US$X", which is `oral-practice`'s per-minute estimate times its minutes. The full
    simulation's 22 minutes are stated there.
  - **Without a key**, `NoKeyCard` (namespace `oral`, at the per-minute estimate) sits above the list, and the list
    has no Choose buttons: the user can read what each session covers.
  - **The microphone step** is architecture.md §8.5 step 1's three-second level check, over an `AnalyserNode`
    (`lib/oral/level.ts`), with a live `<meter>`. The loudest reading is judged against `QUIET_LEVEL` (0.01 RMS), a
    product threshold. Nothing is recorded or sent.
    - **A refusal** (`NotAllowedError`, `SecurityError`) shows the recovery steps for the browser's own menus: Chrome,
      Edge, Firefox, Safari, or a generic two. It then offers to check again, or to answer by typing.
    - **No device**, a browser that cannot record, or another fault each get their own sentence and the typed
      offer.
    - **"Answer by typing instead" is offered at every point of the check**, not only after a refusal, so a user in
      an open-plan office can choose it.
  - **The pre-flight** is the workshop's pattern, at the session's minutes (`preflightSpend`'s quantity, D117). It
    says where each answer goes: a recorded one to OpenAI to be written down, with the recording staying on this
    device; a typed one to OpenAI. It never blocks.
  - **The session screen** shows the part ("Part 2 of 3", from the question's phase), the elapsed time in
    `@palier/ui`'s `Timer`, the examiner's question in words (`lang="fr"`) with its voice played as it arrives and
    "Play the question again", then Record, "Stop and send" or a text field, and "End the session". A status toast
    covers each wait.
  - **No running transcript during the session.** §8.6 says so for studio mode; practice mode shows the question as
    text, which it requires, and nothing else, because reading back what one said changes the exercise as much as it
    does in studio mode.
  - **The screen's timer ticks the session each second** (`run.tick()`), so a phase boundary is at most a second late,
    and its elapsed time is `performance.now()`'s, as the exam runner's is.
  - **The end** says why it ended, names a failure with the key screen's words and says the transcript is kept,
    reports any recordings evicted to make room (§9.1), says the recording is kept on this device only, and **shows
    the stored transcript**. It says the report arrives in a coming update (Slice 3) and links to the data settings.
- **The recordings** (`lib/oral/recorder.ts`, over a `MediaKit` a test fakes):
  - one `MediaRecorder` per answer, whose measured length goes with the clip;
  - **one session recorder, resumed while the candidate answers and paused otherwise**, so the recording
    `saveOralAudio` keeps holds their answers and nothing else. A typed session has no recording.
  - Formats are tried in order: Opus in WebM, WebM, MP4, which the transcription endpoint all reads.
- **`/settings/data` gains the recordings** (`components/data/OralStorageSettings.tsx`): their size in megabytes,
  §9.1's warning at 200 MB, and "Delete all recordings" in one action, which keeps every transcript.
- **The hermetic clock is frozen**, so on the hermetic lane a session never crosses a phase by time, and every turn is
  stamped at 0 ms. The hermetic journeys end by the end control. A phase crossed by time is proven on the production
  build with `page.clock` (D120), and below the browser by D118's tests.
- **The route joins the Lighthouse list** at `/fr/practice/oral`.

### D120 — the key-leak test follows audio and transcripts, and how E2E gets a microphone
**Date:** 27 September 2026 · **Status:** accepted; Phase 5 exit criterion 3's instrument

- **What is asserted** (tier 11, R12's audio half, exit criterion 3 as D113 amended it):
  - **Each answer's clip reaches only OpenAI's transcription endpoint.** In the hermetic journey, the two clips'
    bytes appear in exactly two OpenAI requests, both to `/v1/audio/transcriptions`, one clip each.
  - **The session recording reaches no request at all**, OpenAI's included. Its bytes are in no OpenAI body, and
    `deviceOnly` keeps them out of every other request, storage area and export.
  - **The transcript stays on this device**: the page, and the `oralSessions` store. It goes back to OpenAI only in
    the examiner's next request, which is a chat completion. It is never in a push, a pull, an export, Web Storage
    or on the paired phone (`nowhere`).
  - **On real IndexedDB** (`key-leak-production.spec.ts`), the transcript is at rest in `oralSessions`. The recording
    is at rest in `oralAudio`, as the session recorder's bytes (the positive control), and survives a reload. The
    five calls are in the ledger.
- **How the guard sees audio** (`e2e/leak-guard.ts`):
  - **`installFakeAudio`** stands in for the microphone and for `MediaRecorder`. Each recorder hands over one chunk
    when it stops, `[Ondulard9d3a#n]`, numbered in the order the page makes them. The screen makes the session
    recorder first, so #1 is the recording and #2, #3… are the clips.
  - **Request bodies are read as bytes** (`postDataBuffer`, latin1), OpenAI's and every other origin's, so a
    multipart upload's contents are visible. `openAiRequests()` gives each OpenAI request's path and body.
  - **A `Blob` in IndexedDB is dumped as its bytes.** Before this, `render` turned a `Blob` into `{}`, so a recording
    would have passed unseen: a gap in the guard, found by building this.
  - `oralSessions` and `oralAudio` join the device-only stores.
  - `stubOpenAi` answers the transcription with `TRANSCRIPT_SENTINEL` and the voice with audio bytes, and tells the
    examiner's completion from the others by its prompt.
- **Chromium's fake capture device never answers `getUserMedia` on macOS**, flags and permission granted or not; a
  probe on a bare page confirmed it, sandboxed and not. So the specs do not rely on it. The microphone is a Web
  Audio oscillator's stream, so the level check still reads a real signal through a real `AnalyserNode`, and the
  lane is the same on every OS. A refusal is an init script whose `getUserMedia` rejects with `NotAllowedError`.
- **What that leaves untested, said plainly:** the browser's real permission prompt, a real `MediaRecorder`'s
  encoding and chosen format, and real clip sizes. The recorder's logic is unit-tested over a fake (D119), and the
  real path is exercised only by the human, at Gate I. A Linux-only CI run with `--use-fake-device-for-media-stream`,
  where that flag works, is named, not scheduled.
- **Proven to bite three ways, each run and reverted, with `git diff` clean after:**
  - the session recording uploaded with a transcription: the hermetic journey found a third audio request;
  - the transcript in a synced setting: caught by the export check;
  - a clip in `localStorage`: caught by the guard, which named the place.
- **The specs:**
  - `oral.spec.ts` (hermetic): no key; a spoken session through every state with axe on each; a refused microphone
    to typed answers; a refused call named in words with the transcript kept; and a French pass.
  - `oral-production.spec.ts` (the production build): a phase crossed by time with `page.clock.setFixedTime`, the
    examiner asking in the new phase.
  - The titles test gains both locales' `/practice/oral`.

### D121 — the pre-merge review: 26 findings fixed, the screen's session moved into a tested controller
**Date:** 28 September 2026 · **Status:** accepted; amends D118's timing rule and D119's screen

A candid review of the branch (three parallel reviewers, constructive tone) found 26 issues, none critical. The human
chose to fix all of them.

- **The screen's session moved out of the `.tsx`** (`features/oral/practice-controller.ts`, 25 tests). It owns the
  microphone, the level check, the recorders, the run and its end, over deps a test fakes. Fixed there:
  - **leaving the page mid-session never ended it**, because the unmount cleanup held a stale copy of the session's
    state; from the second session on it did not let the microphone go either;
  - **the microphone stayed open** after Back, after a failed level check, and for a check still running when the
    user moved on, whose verdict could then land on the next session's check;
  - **End before the run existed** was lost, and left the user stuck for the whole scenario;
  - **a recorder that cannot be made** left a dead Start button or a leaked clip; the session now turns to typed
    answers (`recordFailed`);
  - **a driver that fails** (`ended` rejecting) left the transport open; it is now closed, and named as failed;
  - a second tap during a pre-flight or a start is ignored;
  - **`attach` pairs with `dispose`**, found when the hermetic lane failed on the first run of the rewrite: React's
    Strict Mode mounts, unmounts and remounts a screen in development, and a dispose that could not be undone left
    the memoized controller deaf. The production build has no Strict Mode, so only the hermetic specs caught it.
- **Accessibility:**
  - the question's voice **can be paused while it plays** (WCAG 1.4.2);
  - record and stop are **one stable button**;
  - after an answer is sent, focus rests on the question, which is a polite live region, so the next question is
    read out. When a question starts waiting, focus goes to it, or to the answer field when typing (`turnFocus`,
    WCAG 2.4.3);
  - "Answer by typing instead" is offered during the level check too, as D119 said.
- **The transport** (D118 amended):
  - a clip starts no earlier than **its own question was shown**, not the previous answer's start, so turns stay in
    order. That test's expected value moved with the rule: `[15 s, 30 s]` where it was `[0, 30 s]`;
  - a question is shown in **the phase it was written from**, though the phase moves while it is written. The stored
    turn keeps the machine's phase, as D116 stamps it;
  - **a question ended mid-writing is not voiced**, so no speech is bought for it;
  - each wait for an answer has **its own abort signal**, so a finished wait retains nothing.
- **Spend:**
  - an audio call passes `costOf` only what it measured, so a token-priced audio model that reported no tokens reads
    as **unpriced, not free** (D103);
  - a transcription accepted but answered with a body that is not JSON **is still billed**.
- **The leak guard:**
  - every needle is also looked for **in base64**, at all three alignments (`encodedForms`), because audio put into
    JSON is base64, and the raw-byte check could never have failed on it;
  - bodies are read as latin1 and as UTF-8, so an accented needle matches;
  - the production spec asserts the recording's marker is in no OpenAI body;
  - `oral-production.spec.ts` waits on the timer's observed tick, not a fixed sleep.
- **Smaller fixes:**
  - the recordings' size is shown in the same megabyte the 200 MB warning counts;
  - the cleanup names a failure, and the size is read again after "Delete everything";
  - both answer sources refuse a wait whose signal is already aborted;
  - the level check resumes its `AudioContext` for WebKit;
  - Chrome's and Safari's French say "Micro".
- **Docs:** D117's pricing figures and `pricing.json`'s note; the re-recording runbook, which would have deleted
  `oral-practice`; *Next, decided*, which now names the pronunciation model as Gate J; and D120's account of what the
  synthesised microphone leaves untested.
- **Proven to bite, a fourth way:** a clip written to `localStorage` in base64 fails the guard (session log).

### D122 — `assessOral`: the model names the turn and quotes it, the offsets are placed per turn, and each fix names a drillable sub-skill
**Date:** 28 September 2026 · **Status:** accepted (two human decisions this session); §3.3 amended in place, as D105 and D117 were

- **The human's two decisions, taken at planning:**
  - **Gate J is deferred.** The `pronounce` role ships unconfigured: the pronunciation opt-in is not offered, no call is made, and
    pronunciation reads "not assessed". Found while planning, for when Gate J is picked up: chat-completions audio input takes
    only WAV or MP3, and the saved recording is WebM/Opus, so the opt-in also needs the browser to convert it to WAV (Web Audio,
    no new dependency).
  - **A fix names the oral criterion it cost and a reading or writing sub-skill.** The bank has no oral items, so an oral
    sub-skill would reach no item and bias nothing (D124). The model picks from the profile's eighteen scored sub-skills, which
    the prompt lists; a fix on an oral one fails the parse.
- **The DTOs are in domain** (ADR 20; `ai.ts`, `schemas/ai.ts`):
  - `ORAL_CRITERIA` are PRD §8.6's five transcript criteria: comprehension, fluency, grammar, vocabulary, task. Pronunciation is
    not among them.
  - `OralRequest = { sessionType, targetBand, lang, feedbackLang, topic, phases: { name, intent }[], turns, descriptors }`. The
    use case takes the descriptors from the profile, in `feedbackLang`, so the adapter never reads content (ADR 9).
  - `OralAssessment = { criteria, fixes, missingWords, errors }`: exactly three `OralFix { criterion, subSkill: ScoredSubSkill,
    advice, evidence }` in rank order, exactly five `MissingWord { word, turn, excerpt, example }`, and `OralTurnError { turn,
    start, end, correction, rule }`.
  - `AiCapabilities.assessOral`, and `AI_FEATURES` gains `"oral-assessment"`, so a report is metered and shown apart from its session.
- **D105's rule, per turn** (`oral-assessment.ts`). The wire shape `OralAssessmentDraft` gives each error as `{ turn, excerpt, … }`.
  `assembleOralAssessment` groups them by turn and runs `placeErrors` over each turn's own text. A problem is an error or a
  missing word naming a turn that does not exist or is the examiner's, an excerpt not in its turn, or two errors on the same
  words. `checkOralAssessment` holds a stored report to the same rule.
- **`OralTurn` gains an optional `input: "voice" | "typed"`**, set by the turn-based transport on each candidate's turn. The pause
  metric needs it (D123), and it could not be recovered: a typed answer's `startMs` is when its question was shown. A turn stored
  before it has none and counts as untimed. The transport event carries it, and the driver stores it.
- **The adapter** puts `assessOral` on writing feedback's `assess` role and refuses it before any request without one. The prompt
  numbers the turns, marks a typed answer, quotes the three descriptors, lists the scored sub-skills, and asks for evidence,
  advice and rules in `feedbackLang` and words, examples and corrections in `lang`. `PROMPT_VERSION` stays 4 (D105's precedent).
- **Every provider gained the method:** the adapter; the fake, which marks the candidate's first spoken word and refuses a silent
  session billing nothing; `aiProviderContract`; the scripted provider (false, rejects, bills nothing); the factory's meter; and
  seven test stubs, a shape change only. `api-key.test.ts`'s "a capability the port gains later" moved off `assessOral` to
  `openVoiceSession`, its assertions unchanged, as D105 moved it off `assessWriting`.
- **Recorded fixtures, not yet recorded.** The nightly smoke now asks for one fixed session's report (`ORAL_SESSION`, its
  descriptors from the profile), and `--record` would write `assessOral.json`. `RECORDED_METHODS`, the replay switch and the
  eval's `CONFORMANCE_METHODS` take the method. This session had no key, and D112's rule is that a fixture is recorded, never
  hand-written, so the replay test's method set says so and waits for the human's first run.
- **Existing tests touched, with no assertion weakened:** `AI_FEATURES`' exact list and the per-feature fixtures in `spend.test.ts`,
  `pricing.test.ts` and `container-spend.test.ts` gained `oral-assessment`; the adapter's "reports every capability" gained
  `assessOral`; three transport tests' `toEqual` on a candidate's turn gained `input`; the eval's `byMethod` gained `assessOral`;
  the live smoke's `byMethod`, its completion count (+1) and its recorded file list (+1) gained the report.

### D123 — fluency metrics, over spoken answers only, with the filler list as content data
**Date:** 28 September 2026 · **Status:** accepted

- **`fluencyMetrics(turns, fillers)` is pure, in the engine** (`fluency.ts`), never asked of the model (architecture.md §8.5).
  - **Words a minute:** the words of every spoken answer over the time they were spoken. A word is letters or digits joined by
    an apostrophe or a hyphen, so "j'ai" and "sous-ministre" are one each.
  - **Fillers:** each word or phrase of the list, matched whole and without regard to case, so "ben" is not found in
    "bénéficie" and "tu sais" is two words in order.
  - **Mean pause:** from the end of the examiner's question to the start of the spoken answer after it, clamped at zero. A typed
    answer consumes its question and is not timed.
  - **Only `input: "voice"` answers count**, and each figure is `null`, never zero, when no spoken answer measures it.
  - Four properties: turn order does not change the counts or the rate; a typed answer changes nothing; one more filler said
    is counted once more; nothing is negative. 100% of branches.
- **`content/oral/fillers.json`**, `{ en, fr }`, published as `./oral/fillers.json` (ADR 18, D107's pattern). Fillers are language,
  not an exam rule, so not profile data. `oralFillersShape` is in `CONTENT_SCHEMAS` as `oral-fillers`, with
  `docs/schemas/oral-fillers.schema.json` generated; `parseOralFillers` refuses a filler listed twice in any case. The
  container parses it once.
- **Said plainly:** a transcription model may drop some hesitations, so the count is what the transcript kept. The report says so.
  Asking the transcription to keep them (its `prompt` parameter) is named, not scheduled.

### D124 — the loop into the scheduler, closing D35
**Date:** 28 September 2026 · **Status:** accepted; **resolves D35**

- `SelectionCriteria.boost` weights its sub-skills at `WEAKEST_WEIGHT`, as the weakest are, **in practice mode only**.
  `DayPlanInput.focusSubSkills` passes to new items only; maintenance is unchanged. A sub-skill of another skill reaches no
  item, because the skill filter is first: a writing fix biases the writing plan and not the reading one.
- `planDailySession`'s request gains `focusSubSkills`. **`StartSession` derives it**, as it derives `lastDayCompleted` (D36, D46):
  the newest assessed `OralSession`'s fixes, through `oral: Pick<OralStore, "all">`. The sync simulator's device holds none.
- **The goldens did not move** (`selector.golden.test.ts`; `git diff` on the fixture is empty). A property holds a plan with no
  findings equal to one with an empty list, and one with any findings to the budget and disjoint buckets.
- "Each linking to its drill" (PRD §8.6) links to the fix's skill's practice page, whose next plan already draws that
  sub-skill. A drill filtered to one sub-skill is named, not scheduled.

### D125 — a session's cost comes from its own ledger rows
**Date:** 28 September 2026 · **Status:** accepted; §3.3 amended in place

- **`CostEntry` gains an optional `sessionId`.** `withAiProvider(deps, feature, fn, { sessionId })` stamps it; the turn-based
  transport (through `startOralPracticeRun`) and `requestOralReport` pass the session's id. A time window would be a guess: two
  sessions a minute apart, or a report asked for a week later, would be priced wrong.
- The Dexie ledger keeps it when it is a non-empty string, unindexed, so there is no version bump and `verno` stays 3. A row
  written before it reads as belonging to no session.
- `oralReport` gives `{ practiceUsd, reportUsd, unpriced }` from the session's rows since it started; the screen says "at least"
  when a row was unpriced (D103).
- **Phase 5 exit criterion 2 is not ticked here.** The cost is measured and shown; "accurately" is the human's comparison of a
  real 10-minute session's figure with OpenAI's usage page (`docs/deploy.md`), which also replaces `pricing.json`'s
  `oral-practice` and `oral-assessment` placeholders with measured figures.

### D126 — the report's use cases, its screen, and the stability eval
**Date:** 28 September 2026 · **Status:** accepted (Gate H adopted PRD §8.6's report as written, so these calls are recorded as made, as D119's were)

- **`OralSession.assessment: OralAssessment | null`**, the `WritingSubmission` pattern. The driver writes `null`. The Dexie read path
  re-validates a stored report against its turns, and a broken one, or none on a pre-Slice-3 row, **keeps the transcript and
  reads as unassessed**.
- **`requestOralReport`** refuses an unknown or running session, one with no answer, or one whose scenario the bank no longer
  holds, before any request; returns an existing report spending nothing; and keeps a new one on the session. A failed call
  keeps it unassessed. **`oralReport`** gives the session, its scenario, the fluency and the cost; **`oralHistory`** lists ended
  sessions newest first.
- **The route is `/practice/oral/report?session=…`**, a static island (`components/oral/OralReport.tsx`, decisions in
  `features/oral/report-view.ts`), the exam results' query-string pattern, so the worker serves it offline with `ignoreSearch`.
  A session's end links to it, when the session was stored with an answer, and the picker lists "Your earlier sessions".
- **The screen:** the session, its date and how it ended; its cost, practice and report apart; the offer, on the key, with the
  workshop's pre-flight, or the no-key card (namespace `oralReport`); the five criteria in a `<dl>` with pronunciation "not
  assessed"; the three fixes, each with its evidence and a link to its skill's practice; the five words, each with the sentence
  said and said again; **the transcript with each error a button** (`aria-expanded`) that shows its correction and rule beside
  it, since PRD §8.6 says "on hover or tap", and a hover-only correction is out of reach of a keyboard or a screen reader; the
  fluency figures, or "you typed your answers"; and the recording, in an `<audio controls>`, deleted in one tap.
- **Named, not scheduled:** transcript sync with playback (the turns have times, but a clip is not cut from the recording); the
  vocabulary queue; a drill filtered to one sub-skill.
- **The stability eval** (`apps/factory/src/eval/oral-stability.ts`): the reports in `assessOral-stability.json`, replayed through
  the adapter, pass when there are at least five and every criterion's band moves **at most one level** with **agreement 0.8**
  (four in five on one band). Both are eval parameters, not profile data. `eval-report.json` gains `oralStability: null` and an
  empty `assessOral` entry, and nothing else moved. `pnpm --filter @palier/web oral-stability` (`scripts/oral-stability.mjs`)
  records the five, and writes nothing if a call fails. **Phase 5 exit criterion 4 is not ticked here**: it needs that recording,
  on a funded key.
- **The key-leak test follows the report.** The report request is one more chat completion on the key, carrying the transcript
  and no audio; the report's words (`REPORT_SENTINEL`, in the stub's correction) are on the page and at rest in `oralSessions`,
  through a reload, and never in an export, a push or on the paired phone. The recording's marker is still in no request, so
  exit criterion 3 stays green with no opt-in. **Proven to bite:** the recording's bytes added to the report request failed the
  hermetic journey (session log).

### D127 — the pre-merge review: 32 findings fixed, the pause measured by the screen, and D123–D126 amended
**Date:** 28 September 2026 · **Status:** accepted; amends D123, D124, D125 and D126; §3.3 and §7 amended in place

A candid review of the branch (three parallel reviewers, constructive tone) found 32 issues after one duplicate was
merged, none critical. The human chose to fix all of them.

- **The mean pause was wrong for every spoken session** (D123 amended). The examiner's turn is stamped when its words
  appear, before its voice plays, so the gap between the two turns counted the listening too, and the stored turns
  could not correct it afterwards.
  - The screen measures it instead. `practice-controller.ts` notes when a question appears and when its voice stops
    (ended, paused, or refused by autoplay), and `answerPause` gives the wait until Record, which is none when Record
    interrupts the voice.
  - The clip carries it as `CandidateAnswer.pauseMs`. The transport stores it on the turn as `OralTurn.pauseMs`, whole and
    never below zero, and the engine averages those.
  - A turn without one is not timed. §3.3 is amended in place.
- **Fluency, more carefully:**
  - words are domain's `spokenWords` (NFC, apostrophes straightened, lower case), shared by the engine and the filler
    parser, which now keys each filler as the metric reads it and refuses an entry with no word;
  - **the filler list keeps only clear hesitations** (euh, heu, hum, ben, bah; um, uh, er, erm, hmm). "Genre", "en fait",
    "du coup", "like" and "kind of" are ordinary words in the formal register the test rewards, and counting them
    penalised correct speech.
- **Matching a model's quotation** (`findExcerpt`, in `writing.ts`, so the writing workshop gains it too):
  - curly and straight apostrophes are one, and so is any run of whitespace, a non-breaking space before "?" included;
  - the offsets returned are the text's own.
  - Before, one straightened apostrophe failed the parse, and a report paid for twice was lost.
  - An excerpt must quote a letter or a digit, so a space or a comma is never marked.
- **A short session can have a report** (D122 amended): one to three fixes and one to five missing words, fewer "only when
  the answers are too short", and the missing word's excerpt is "the fewest words that show where it fits". **An existing
  test changed with the rule:** `oral-assessment.test.ts`'s "refuses anything but three fixes and five words", this
  branch's own, became "takes fewer … but at least one of each, and no more than three and five".
- **The prompt quotes each turn as a JSON string**, so a typed answer's line breaks, quotation marks or a pasted
  "[9] Examiner:" cannot fake a turn or close the fence. The adapter test's expected turn lines moved to the quoted form.
- **The plan's focus** (D124 amended):
  - only a report **in the language the plan practises** biases it (`oralFocusSubSkills(sessions, lang, langOf)`, with
    `StartSession` reading each scenario's language);
  - boosted sub-skills get **`FOCUS_WEIGHT` 2**, multiplied with `WEAKEST_WEIGHT` 3, rather than joining the weakest set,
    which with three fixes could weight six of eight sub-skills alike and level the targeting. A weakest sub-skill stays
    ahead of a boosted one, and one both is weighted 6. The goldens did not move.
  - D124's "maintenance is unchanged" meant its rule. Its items can differ, because the new items took others, and the
    test's name now says so.
- **The cost, line by line** (D125 amended). `OralSessionCost` is `{ practice, report }`, each `{ usd, calls, unpriced }`:
  - a report call OpenAI billed though the adapter refused it shows as spend, not "not asked for yet";
  - a line with an unpriced call reads "at least", and one under half a cent "under a cent", never both;
  - the card is read again after a failed call.
- **The report screen** (D126 amended):
  - `OralReport.blocked` names why a report cannot be asked for (running, no answer, scenario gone, already made);
  - a refusal before any call has its own sentence and no "Try again";
  - a storage failure says so, with a retry, rather than "no report here";
  - **a request still out is joined, never repeated** (`oralReportInFlight`, per session, in the container), so leaving
    mid-call and coming back cannot pay twice;
  - focus: one card throughout, whose heading takes focus at each step, with a status line always present, so the wait
    is announced; the report's heading when it arrives; the recording's heading after a delete (WCAG 2.4.3);
  - an answer is a block in the language spoken, and the interface's words in it (an error's number, a rule) carry the
    interface's language (WCAG 3.1.2);
  - figures are locale-formatted (`{seconds, number}`), so French reads "1,5 s";
  - object URLs are made, given to the `<audio>` and revoked by one effect, the question's player too;
  - the list of past sessions is read again whenever the picker is shown;
  - every decision the review found in the `.tsx` moved into `features/oral/report-view.ts`, tested: `costRows`,
    `blockMessage`, `canRetry`, `endReportLink`, `drillMessage`, `feedbackLangFor`.
- **The stability evidence** (D126 amended):
  - **a run is a call, not a reply.** An `attempt` 1 opens one, the call's report is its last accepted reply, and a call
    with none is a failed run that fails the eval;
  - a recording on another `PROMPT_VERSION` is reported as `current: false` and never passes;
  - the recorder keeps a report the adapter refused twice, and counts it, rather than exiting so that a re-run hides it;
  - the CLI's line is a tested `describeOralStability`;
  - both sides assert the file name and the five runs as literals.
  - **The stability session is its own** (`STABILITY_SESSION`): about five minutes, eight spoken answers of about 60 words
    each, with measured pauses and the errors and hesitations of a B or C candidate. The smoke keeps its short session.
    **Said plainly: it is still synthetic.** Criterion 4 ticks on it, and a real session scored the same way is the
    stronger evidence, named, not scheduled.
- **The smoke's report figure is no longer printed as "for pricing.json"**: it is on its own line, labelled a short fixed
  session, not a typical report.
- **Tests that asserted too little:** the production key-leak spec now reads `oralSessions` and finds the report's words
  there (the positive control), and no longer passes `REPORT_SENTINEL` at a step before any report exists. The hermetic
  spec presses "Practise again" and finds the session listed.
- **Docs:** §7's Slice 3 names Gate J's deferral, §3.3's `AiProvider` comment names the pronunciation method still to
  come, and the exit criterion says "at or above" 0.8, as the code does.
- **A second pass over the fixes** (one reviewer) found 7 more, and no regression in the 32. All 7 are fixed:
  - **An excerpt quoting no word is dropped, not refused.** The first pass had made the schema refuse one, which would
    have lost a paid report to a lone "?", the very failure D127 set out to remove. `assembleOralAssessment` now drops
    such an error or missing word and keeps the rest; only a report left with no missing word at all is refused. The
    prompt asks for at least one word in every excerpt.
    - **Existing tests changed with the rule:** this branch's "refuses an excerpt of only spaces or punctuation" became
      "accepts … for the assembly to drop"; and "keeps the … words" now compares the words by value, since the kept list
      is a new, filtered array.
  - **The in-flight map is at module scope in `container.ts`**, so a container built again when the language changes
    still finds a request the last one made. A test proves a failed request is forgotten, and that asking again makes a
    new call.
  - **The focus decision is a tested pure function** (`askFocusMoves`). Journeys assert focus on the report when it
    arrives, and a new hermetic journey leaves mid-call, comes back from the list, finds the wait, and sees exactly one
    report request.
  - A replay of the question that fails, or audio the browser cannot decode (`onError`), counts as heard, so the next
    pause is not recorded as zero.
  - A vacuous controller test was split in two: a stray voice event is forgotten when a question appears, and a typed
    answer carries no pause.
  - Two stale comments were fixed: the live smoke's header, and deploy.md's line on the printed block.
- **A third pass** found 3 more, and no regression. All are fixed:
  - a problem sent back on the retry names an item by its index in the draft as the model sent it, whatever was dropped
    before it;
  - the controller test that could not fail now proves the last question's heard time never carries into the next;
  - a container built again, as a change of language builds one, is proven to join a request still out.

### D128 — `assessOral` recorded live: the stability eval passes, and the smoke's re-measured counts go into pricing
**Date:** 28 September 2026 · **Status:** accepted; ticks Phase 5 exit criterion 4

- **The human ran both recordings from their own terminal**, in this worktree, on a funded key the agent never saw (deploy.md).
  - `pnpm --filter @palier/web oral-stability` gave 5 reports out of 5, 5 completions and US$0.127104.
  - `LIVE_SMOKE_RECORD=1 node apps/web/scripts/live-smoke.mjs` gave 15 completions, all 15 accepted on the first try.
- **The stability eval passes, with no variation at all.** `STABILITY_SESSION` was scored five times. Every report gave
  comprehension C, fluency C, grammar B, vocabulary C and task C, so every criterion has spread 0 and agreement 1.00. The
  bar is at most one level of spread and at least 0.8 agreement (D126).
  - The evidence the model quotes differs from report to report, but the bands do not.
  - **Said plainly, as D127 did:** the session is synthetic, and it was written to read as a B-or-C candidate. A real
    session scored the same way is the stronger evidence. That remains named, not scheduled.
- **Both files join the replay gate.** `assessOral.json` and `assessOral-stability.json` are in `RECORDED_RUNS`, and the
  replay test's expected method set gains `"assessOral"`. D122 and deploy.md named this step. The set grew because a
  method now has a recording, and no assertion was weakened.
  - The eval's conformance rate on prompt version 4 is 1.000, over eight files.
  - No recorded verdict flipped: nothing on version 4 is refused, and `reviewItem-prompt-v3.json` still holds the three
    refusals that keep the gate two-sided.
- **`pricing.json`'s two measured features were refreshed from the smoke**, as deploy.md says to do when the counts move:
  - `writing-feedback` output went from 1,620 to 1,813;
  - the draft's output went from 4,631 to 4,482;
  - the review went from 1,665 in and 2,400 out to 1,680 in and 3,775 out.

  `oral-practice` and `oral-assessment` stay placeholders until a real 10-minute session measures them (exit criterion 2).
  The smoke's own report line (1,151 in, 2,169 out) is a short fixed session and is not copied. The stability run's
  US$0.025 or so per report is synthetic too, and is not copied either.
- **Docs:** the `@palier/testing` CLAUDE.md, the eval's `CONFORMANCE_METHODS` comment and deploy.md's one-time import
  steps now say the recordings exist.
- **deploy.md gains a read-only console snippet for criterion 2.** The ledger keeps no audio call's characters or seconds, so
  the snippet reads the session's own ledger rows and turns, and the per-role figures are derived from cost. It is
  documentation, not shipped code, and has no test. It is the one route to those figures without adding a field to
  `CostEntry`, and one real session does not justify that field.

### D129 — Gate I passed: the report is one a user would act on
**Date:** 28 September 2026 · **Status:** accepted (human decision); resolves Gate I and ticks Phase 5 exit criterion 1

- **The human confirmed that Gate I passes**: the post-session report (D122–D127) is one a user would act on.
- **Phase 5 is not complete yet.** Exit criterion 2, the real 10-minute session's cost compared with OpenAI's usage page,
  is still to run (D125, *Next, decided*). It is a measurement, not a judgement, so it no longer holds up anything else.
- **What would reopen it** was not stated at the gate. The agent's suggestion, not the human's: the product pilot's users
  (Gate E, D97) ignoring a report's fixes, or a real session's report disagreeing with the candidate's own sense of their level.
- **Gate J stays open** and did not block this gate: pronunciation still reads "not assessed".

### D130 — Phase 5 exit criterion 2 deferred; Phase 5 closes on the other four, and Phase 6's decision gate opens
**Date:** 28 September 2026 · **Status:** accepted (human decision); amends D129's "Phase 5 is not complete yet"

- **The human deferred the 10-minute session's cost check.** They will run it later and recalibrate if needed. What it would
  have ticked:
  - "measured": each session's cost is already read from its own ledger rows (D125);
  - "displayed": the report already shows it, line by line (D127);
  - "accurately": this half is what waits, meaning the match with OpenAI's usage page. Gate G's rule applies when it runs:
    tokens exact, dollars within a few percent.
- **`pricing.json`'s `oral-practice` and `oral-assessment` stay placeholders**, and the note already says so. They drive only
  the pre-flight estimate. The meter and the report price each call from `models`, whose rates Gate G confirmed, so what a
  user is shown having spent does not depend on the placeholders.
- **Phase 5 is marked complete on criteria 1, 3, 4 and 5**, with criterion 2 marked `[!]`, deferred by the human's decision.
  The runbook is unchanged, in `docs/deploy.md` "A measured 10-minute session", with its console snippet.
- **Phase 6's decision gate opens on the estimate, labelled as one.** The placeholders price a practice minute at about
  **US$0.0076**:
  - examiner, 564 in and 134 out on gpt-6-luna: about US$0.0022;
  - voice, 180 characters on tts-1: US$0.0027;
  - transcription, 0.6 minutes on gpt-transcribe: US$0.0027.

  GPT-Live is published at US$0.05 a minute, so practice mode's estimate is about a seventh of it. The recalibration can
  move this figure, but no plausible error closes a gap of that size.

### D131 — Phase 6's decision gate: studio mode is deferred past 1.0, and Phase 7 follows Phase 5
**Date:** 28 September 2026 · **Status:** accepted (human decision); resolves Phase 6's decision gate; supersedes D113's
"What GPT-Live changes" items 3 and 5 as forward plans, and D130's "Phase 6's decision gate opens"

- **The human deferred studio mode past 1.0** and opened Phase 7 next. They also asked that every document be brought into line
  so later sessions follow this order. The agent recommended it on the evidence below.
- **D113's checks 2 and 3 were documentation reads, made by this session on 28 September 2026:**
  - **The session length.** The Live API has a limit. A session carries `expires_at` and can close with reason `expired`
    ("The session reached its duration limit"), but no value is published. So it would have been measured on a first
    session against the 22-minute simulation and the 25-minute cap. Sources: developers.openai.com/api/docs/guides/live-conversations
    and learn.microsoft.com/en-us/azure/foundry/openai/gpt-live-reference.
  - **A short-lived browser credential.** None exists. "Keep the key on the server": the server exchanges the browser's SDP
    offer at `POST /v1/live/sessions` with the project key. Source: developers.openai.com/api/docs/guides/live.
  - **Check 1, French, is the human's ear, but the documents already weigh on it.** The voice table lists English and
    Portuguese voices only. No French voice is documented for a French C-level rehearsal.
- **Why defer, when cost is not the reason.** Gate I passed (D129), so 1.0 has an oral feature. Practice mode's estimate is
  about a seventh of GPT-Live's price (D130), and the gate's premise, "measured realtime cost is high", did not hold. What decided
  it is that the leading candidate has no documented French voice and no browser credential, and that Phase 7 is what 1.0 is
  waiting on.
- **ADR 3 is unchanged and dormant.** Its *revisit when* is "OpenAI documents a browser-direct realtime auth path, or the
  feature is dropped". Neither has happened, since deferring studio mode is not dropping it. No ADR is written or superseded.
- **What this moves, and where it is noted:**
  - `implementation-plan.md` §7's Phase 6 note, the §8 R1 row, the §9 timeline and the §11 risk row (taken);
  - product-requirements.md §8.6, §16 and §17 question 4, and architecture.md §6.3, §10, §14 and §20 question 1, each noted in
    place;
  - D100's "the realtime exception joins the copy when Phase 6 builds `/api/realtime/secret`" and D116's 25-minute guard now
    mean after 1.0. Two code comments say so (`KeyOffer.tsx`, `oral-session.ts`);
  - Phase 7's observability item "the realtime route excluded from Vercel logging" moves with studio mode.
- **What reopens it:** a French voice documented and heard by the human at C-level quality, a documented browser-direct
  credential, or 1.0 shipped.

### D132 — Phase 7 is planned as four slices and three gates, mirrored in two documents
**Date:** 28 September 2026 · **Status:** accepted

- **The same scoped exception D79, D97 and D113 made:** `implementation-plan.md` §7 gains Phase 7 "Completion slices", and this
  file mirrors them. Keep the two in sync.
- **The survey first.** An agent session read the tree against §7's ten items on 28 September 2026. Five are partly built and
  are ticked `[~]` with pointers: the device list and pairing, the JSON round trip, the item-report issue path, the footer
  statement and the about page. Nothing exists for the rest.
- **The order is built work first, then the human's direction, then the human's reviews:**
  1. **Slice 1 — security hardening, no new UI.** First, because it changes no product surface and needs no direction, and
     because XSS is the real threat to a browser-held key (architecture.md §6.4).
  2. **Slice 2 — server lifecycle and observability.** Its only surfaces are error states.
  3. **Gate K — the UI and content direction (human).** It asks what Gate A, D and F asked: adopt the PRD as written or revise
     it. It covers the privacy notice and about page's wording, where the statement appears, PRD §9's streak, XP and
     milestones in 1.0 or not, the library's 1.0 scope, and the PDF's shape.
  4. **Slice 3 — content, the contribution path and data rights.**
  5. **Slice 4 — motion, engagement and the library**, as Gate K decides.
  6. **Gate L — the human reviews:** R8's French, VoiceOver and NVDA, and the red-team read.
  7. **Gate M — public:** the repo, an outside submission, the domain, the trademark check, and the full-volume bank (D54, D56).
- **Exit criterion 1's "no known security defects"** cannot be ticked by the agent that built the hardening. Slice 1 gives the
  evidence; Gate L's red-team read is the human's.

### D133 — the strict CSP is nonce-based, so every page renders per request (ADR 22)
**Date:** 28 September 2026 · **Status:** accepted (human decision on the spike's evidence); Phase 7 Slice 1

- **The spike came first, on the built output**, as the plan said. What it found:
  - Next 16 writes two inline `self.__next_f.push(…)` scripts into every page, so `script-src 'self'` stops hydration;
  - `experimental.sri` adds `integrity` to the external chunks and leaves the inline scripts alone;
  - hashing the inline scripts would need a second build to bake per-route headers, and a difference between the two
    builds would break hydration in production;
  - a nonce through `src/proxy.ts` gave zero violations on all 19 routes.
- **The human chose nonces with per-request rendering** over static pages with build-time hashes, and over
  `'unsafe-inline'`. **ADR 22** records it, because architecture.md said "the app shell is static". It is amended in
  place.
- **Built:**
  - `lib/csp.ts`: a pure policy builder and `withContentSecurityPolicy`, one test per directive and per dev branch;
  - `proxy.ts`: it composes that with next-intl, which forwards the request's headers to the render
    (`NextResponse.next({ request: { headers } })`), so Next sees the nonce;
  - the layout reads `x-nonce`, and `generateStaticParams` is gone.
- **Deliberate choices in the policy:**
  - **no `'strict-dynamic'`**, which would trust any origin a trusted script loads from;
  - **`style-src 'self'`**, since the built pages have no inline style;
  - **the bank is same-origin**, so `connect-src` is `'self' https://api.openai.com`;
  - `media-src blob:` is for the examiner's voice and the recording.
- **`next dev` is relaxed** (`'unsafe-eval'`, inline styles, `ws:`, no Trusted Types), so the hermetic lane runs a
  policy but not the strict one. The strict one is held on the build by `e2e/csp-production.spec.ts`: both locales,
  every page, every script nonced, zero violations, and a fresh nonce per response.
- **What it cost, measured:**
  - bundle 165.9 KB of 180 (was 165.7);
  - E2E 63 passed, the offline journeys among them, since the service worker caches each page with its own header;
  - Lighthouse: the session log has the figures.
- Pages answer `Cache-Control: private, no-store`, a function invocation per view. `docs/deploy.md` gains the post-deploy
  check.

### D134 — Trusted Types enforced: one default policy, passed through unchanged, and zod's code generation off
**Date:** 28 September 2026 · **Status:** accepted

- **`require-trusted-types-for 'script'` and `trusted-types default`** are enforced in production.
- **The spike's violations came from three places:**
  - Turbopack's chunk loader assigning `script.src`;
  - `serviceWorker.register`;
  - zod 4's `allowsEval` probe, `Function("")`.
- **The policy is `lib/trusted-types.ts`**, a self-contained installer serialised into one inline, nonced script in the
  layout's `<head>`. It is the app's only inline script:
  - a script URL passes only if it is this origin's `/_next/static/` or `/sw.js`;
  - there is no HTML or script factory, so `innerHTML`, `eval` and `Function` stay refused.
- **A defect the E2E suite found, recorded because it is not obvious.** The first policy returned the URL made absolute.
  Every page loaded with zero violations, but every production journey failed, because the container never became
  ready.
  - Turbopack finds a loaded chunk by its `src` attribute's text, so a lazily imported chunk waited forever.
  - The policy now returns its input unchanged, after checking it, and a unit test holds that.
  - The zero-violations spec cannot catch this class of fault. The production journeys can, and they did.
- **zod's `jitless` is set in `src/instrumentation-client.ts`**, Next's file that runs before any app code.
  - A `z.config` in `container.ts` came too late, because some module in the graph parses as it loads.
  - The file sets `globalThis.__zod_globalConfig` without importing zod. zod reads that object when it loads, so zod
    stays out of the shared first-load JS.
  - That global is zod's internal hook, not a documented API. If a zod upgrade stops reading it, the E2E gate fails on
    the first page that parses, which is where it should be caught.
  - The server's handlers keep the fast path.

### D135 — the supply chain: the audit gate, Dependabot, and `SECURITY.md` through GitHub's private reporting
**Date:** 28 September 2026 · **Status:** accepted

- **`pnpm audit --prod --audit-level=high`** is a step in the fast job, outside its timed window, since it calls the
  registry. It covers production dependencies only, because dev tooling never ships to a browser that holds a key.
- **Two false positives are ignored, with the reason in `pnpm-workspace.yaml`.**
  - `pnpm audit` names the private `@palier/content` workspace by its directory, `content`, at 0.0.0. It then matches
    that against the unrelated npm package `content` (GHSA-x6wp-rfwh-hcx7, GHSA-5854-jvxx-2cg9).
  - No package of that name is in the lockfile.
- **The whole tree, dev tooling included, has three high advisories**, all under `@lhci/cli`: `tmp` <0.2.6 and
  `extract-zip` ≤2.0.1 (twice), through `inquirer` and `@puppeteer/browsers`. They are dev-only and run only on CI's
  Lighthouse step, so they are recorded, not gated. Dependabot will propose the updates.
- **`.github/dependabot.yml`:** npm weekly, with minor and patch grouped and each major its own pull request;
  github-actions monthly.
- **`SECURITY.md`:**
  - the reporting route, the 90-day coordinated disclosure architecture.md §12 asks for, and the scope;
  - the key's protections stated honestly, including ADR 3's dormant exception and the one thing a CSP cannot stop,
    a running script navigating the page away.
- **One deviation from §12:** it asks for "a contact address", and the route is GitHub's private vulnerability reporting
  instead, so no personal address is published. **The human must enable it** in the repository's settings.

### D136 — the deliberate attempt to leak the key, written as tests the policy must stop
**Date:** 28 September 2026 · **Status:** accepted; Gate L's red-team read is the human's (D132)

- **Two red-team tests in `e2e/csp-production.spec.ts`**, on the production build.
- **The injected tag.** A script tag written through `page.addScriptTag`, inline or from another origin, does not run.
- **Code already running** in the page (`page.evaluate`) tries each way to run more script: a written inline script, a
  foreign script, a `data:` script, and HTML with an `onerror`. Each is refused by Trusted Types.
- **It also tries each way to send the sentinel key to another origin:** `fetch`, `sendBeacon`, an image, a websocket
  and a form post. Each is refused before it leaves.
  - The reports name `connect-src`, `img-src`, `form-action` and Trusted Types.
  - Nothing reaches the attacker's origin. That is recorded where a request would be answered, since Chromium also
    reports a request that the policy then blocks on the page's `request` event.
- **Not tried, and why:** DevTools evaluation is exempt from the policy's eval check, so `eval` and `Function` prove
  nothing there. The header test holds `'unsafe-eval'` out, and zod's refused probe (D134) was the page's own `Function`.
- **Proven to bite, twice, each reverted:**
  - with `script-src 'self' 'unsafe-inline'`, no Trusted Types and `connect-src *`, all five tests failed;
  - with only `connect-src *`, the red team failed on `fetch: "ran"`.
- **What a CSP cannot stop:** script that is already running navigating the top-level page to another origin, with the
  key in the URL. `navigate-to` never shipped in any browser. The defence is that no script the app did not ship can run,
  and `SECURITY.md` says so.

### D137 — a missing `RATE_LIMIT_SALT` fails the production deploy, never a request
**Date:** 28 September 2026 · **Status:** accepted; closes D78's deferred item

- D78 left "a missing salt fails loudly" to Phase 7. It gave its reason: failing the running sync service over it would
  trade a weaker limit for an outage.
- **`migrateDatabase` now throws before any migration** on a production deploy (`VERCEL_ENV=production`) that has a
  `DATABASE_URL` and no salt, or an empty one. It is the step the build command already runs.
  - A preview, a person migrating by hand, and a deploy with no database are not held to it.
  - `db.ts` keeps its runtime fallback.
- **If Production's `RATE_LIMIT_SALT` was never set, the next production deploy fails.** That is the intent. The
  runbook's environment table says so.

### D138 — the retention job: activity is any authenticated request, the tombstone purge deletes nothing yet, and a scheduled run deletes
**Date:** 28 September 2026 · **Status:** accepted (the delete-on-schedule call is the human's); Phase 7 Slice 2

- **"No activity for 180 days" reads two columns.** `accounts.last_active_at` moves only on a push, but a device that only
  pulls is still in use. So an account goes when its `last_active_at` is past the cutoff **and** it has no unrevoked device
  whose `last_seen_at` is since then. `authenticate()` stamps `last_seen_at` on every request. No schema change, no migration.
  A revoked device's last request does not keep its account.
- **Boundaries are strict.** A row older than its cutoff goes, and a row exactly at it stays. The PGlite test holds every
  boundary a millisecond either side, and five mutations of the SQL (`<` → `<=` on each rule, `>=` → `>` on the device, the
  revoked filter dropped) each fail it.
- **Nothing writes a tombstone yet** (D69, `schema.ts`). The purge is `deleted and updated_at < cutoff`, since `updated_at`
  is stamped on every accepted write, and it removes nothing in production today. It is built and tested now, so the first
  feature that deletes a single record inherits it.
- **A precondition for that first single-record delete** (pre-merge review): a device offline for 90 to 179 days would
  pull past a purged tombstone, keep its copy and push it back. So before any tombstone is written, pull must refuse a
  watermark older than the purge horizon (a device last seen over `TOMBSTONE_DAYS` ago), and the client must replace its
  set in full rather than merge.
- **The job is self-contained raw SQL** (`src/server/retention-job.ts`), like the item-statistics job: no relative import,
  `postgres` imported dynamically, and one statement per rule that counts in a dry run and deletes otherwise. The script
  on postgres.js and the integration test on PGlite run the same text.
- **A scheduled run deletes; a run by hand is a dry run unless unticked** (human decision). `.github/workflows/retention.yml`
  runs daily at 05:00 UTC, and skips with a notice without `RETENTION_DATABASE_URL`. The runbook says to dry-run it by
  hand before the first scheduled run.
- **`RETENTION_DATABASE_URL` is the app's own connection** (human decision, 29 September 2026): the same pooled string as
  Production's `DATABASE_URL`, whose role owns the tables. No separate deleting role is made. The secret keeps its own
  name, since Actions cannot read Vercel's environment and the workflow should say what the string is for. If the
  connection string is rotated, this secret must be updated with it.
- **The script itself did not run against a real Postgres here.** This machine has only the libpq client and Docker was
  down. Its SQL ran on PGlite, and its guards ran by hand: no `DATABASE_URL` exits 1, and a bad `PLAN_STORAGE_MB` throws
  before connecting. The first run by hand is the human's (Next, decided).

### D139 — the storage alert and two housekeeping purges on the same run
**Date:** 28 September 2026 · **Status:** accepted

- **The plan's storage is a workflow input**, never a number in code. It is `inputs.plan_storage_mb` on a run by hand, or
  the `PLAN_STORAGE_MB` repository variable, in MiB. Neon's free tier is 512. Without it the run still deletes, and says
  it checked no alert. A value that is not a positive number fails the run, so a typo cannot silently turn the alert off.
- **At 60% and at 80% the run fails**, and a failed scheduled run is what notifies. The log names the threshold.
  architecture.md §9.4's 60% response, the aggregation, is **a runbook step, not built**, until the alert first fires
  (`docs/deploy.md`, "The retention job").
- **Two purges the plan did not name**: expired pair codes, and rate-limit rows from windows over a day old. Every window
  is an hour or shorter. Neither row means anything once past, and without the purge the storage alert would one day fire
  on rows that mean nothing.
- `docs/deploy.md`'s environment table had a blank line that ended it early, so its last two rows did not render as part
  of it. It is joined up, and the two new rows added.

### D140 — `GET /api/health` on Node; the build version from the commit, and the bank version out of the browser-only root
**Date:** 28 September 2026 · **Status:** accepted; architecture.md §10 amended in place

- **The route runs on Node**, not Edge as §10 said, because ADR 21 put every route on Node.
- **What it answers:** `{ build, bank, database }` with `Cache-Control: no-store`, and no identifier of any kind.
  - `database` is `ok`, `not-configured` (no `DATABASE_URL`, a working deployment under ADR 21) or `unreachable`;
  - only `unreachable` answers 503. `db.ts`'s `databaseAnswers` runs `select 1` against a two-second limit and never throws.
- **The build version** is `VERCEL_GIT_COMMIT_SHA`'s first seven characters, or `local`. `next.config.ts` inlines it as
  `PALIER_BUILD_VERSION`, so the server and the client name the same build. It is `dev` where the config never ran.
- **`BANK_VERSION` and `BANK_BASE_PATH` moved to `src/lib/bank-version.ts`.** `container.ts` is browser-only (D59), and the
  health route and the diagnostic bundle need the version. `container.ts` re-exports both. The three readers of the line by
  pattern (`prepare-public.mjs`, `item-statistics.mjs`, `e2e/helpers.ts`) read the new file.

### D141 — the error states: a bundle with no free text, a generated copy for `global-error`, and a 404 that is not `notFound()`
**Date:** 28 September 2026 · **Status:** accepted

- **The diagnostic bundle carries no message at all**, which is stronger than redacting one. An error's message can quote
  anything: a Zod error the value it refused, a fetch the URL it called. What is kept is chosen by shape:
  - the name, if it looks like a class name;
  - Next's digest, if it is digits;
  - the `/_next/static/…:line:col` locations on real frame lines. A message line that imitates a frame is dropped.
  Around them go the build, the bank, the browser's family and system (`deviceLabel`), the path without query or fragment,
  and the time. The unit test poisons message, stack and digest with the key-leak sentinel and a user's sentence. Keeping
  the message fails it.
- **The user reads the bundle before anything leaves.** It sits in a `<details>`, with Copy (a status line says whether it
  worked) and a prefilled GitHub issue, `errorIssueUrl`, beside `reportIssueUrl`. Nothing sends it (ADR 15).
- **`global-error.tsx` has no next-intl provider**, and it loads with every page. Importing both message files would add
  about 32 KB gzipped to every page, so `prepare-public.mjs` writes the `errors` namespace alone to
  `components/errors/global-error-copy.json`. That file is committed and held equal to the messages by a drift test.
- **An unknown path answers 200 with `noindex`, not 404.** The production CSP spec found this.
  - Next serves any `notFound()` under this app's dynamic root layout as its error shell (`<html id="__next_error__">`), in
    development too. The layout arrives only in the RSC payload, so its Trusted Types script never runs, and every chunk
    load is refused. The 404 rendered blank.
  - So `[locale]/[...rest]` renders the localised 404 itself, inside the layout. `[locale]/not-found.tsx` stays as the
    boundary for a future page's `notFound()`. Nothing reaches it today: the layout's own invalid-locale `notFound()` is
    outside its segment's boundary, and the proxy redirects an unknown locale first. *(Corrected at the pre-merge review.)*
  - **Every path under a locale goes through the proxy**, a dot in it or not (`/(en|fr)/:path*`, pre-merge review).
    The first matcher skips any path with a dot, and the CSP is set only there, so `/en/x.php` reached the catch-all and
    rendered the whole app with no CSP. `csp-production.spec.ts` holds `/no-such.page` to the policy.
  - Next's own answer, `global-not-found.tsx`, is experimental, and would grow the default-export exemption list. It is
    named, not scheduled.
- **The not-found page offers no bundle.** It is not an error the app made.
- **A route error retitles the document while it shows, and gives the title back on recovery.** Next streams a page's
  metadata into the head after the page has mounted, so a rendered `<title>` loses. The screen holds the title against
  later writes.

### D142 — the error states' E2E hook, and `global-error` checked through its view
**Date:** 28 September 2026 · **Status:** accepted

- **`[locale]/hermetic/[view]`** throws in the browser (`route`) or shows the global screen's view (`global`). It does this
  in the hermetic lane only, and is the 404 anywhere else.
- **It is a dynamic segment on purpose.** `routesFrom` skips those, so the service worker never precaches a page that is
  a 404 in production.
- **The thrown error carries `?leak=` everywhere**: its message, a line that imitates a frame, and a frame on another
  origin. `errors.spec.ts` passes the key-leak sentinel and proves it is in neither what the screen shows, the clipboard,
  nor the issue link. The hook throws until the URL's fragment is `#recover`, so Try again is seen to recover.
- **`global-error.tsx` itself is not reached**, since the root layout works. Axe runs on its view inside a page, and its
  document (`lang`, title, its own CSS) is held by review. This is a gap, recorded rather than covered.

### D143 — a spending call outlives its screen: joined, never repeated, and a wipe drops what it would write (finding 13, whole)
**Date:** 28 September 2026 · **Status:** accepted (the wipe half is in by human decision); closes finding 13

- **Finding 13's first wording had two halves.** #37 dropped the second when it fixed the report:
  - leaving mid-call keeps spending out of sight, so coming back could pay again;
  - a wipe made meanwhile is refilled when the call settles.
- **The join is D127's, generalised** (`lib/in-flight.ts`), at module scope in `container.ts`, so a rebuilt container finds
  it:
  - a report per session;
  - feedback per submission;
  - **one fresh set at a time on this device.** A generation request has no id, so a second request while one is out
    joins it, whatever it asked for. The held request names its sub-skill, so the screen shows the right one.
- **Each screen reads the held request when it loads** and shows it as still being made:
  - the workshop, on mount and when a submission is reopened;
  - the fresh-set screen, starting in `sending`.
  While its feedback is being made the workshop's text is read-only, and the reducer ignores an edit, which would bring
  Get feedback back mid-call.
- **A wipe or delete-everywhere bumps a counter and forgets every held request.** Each call's content stores
  (`writing.put`, `generated.putSet`, `oral.put`) drop their writes once the counter has moved since the call began. The
  wrapper is in the composition root, and no port changed.
  - **The cost ledger is not guarded**, because the call was billed and the meter should say so.
  - A call already past its write is not affected: IndexedDB orders it before the wipe's clear.
- **Proven to bite:** without the guard, each wipe test fails; with a join keyed apart, the join test fails; and with the
  workshop's resume removed, the leave-and-return E2E fails.
- **Added at the pre-merge review:**
  - a result lands only on the draft it was asked for. `assessed` must match the draft's saved submission, and `failed`
    carries its submission id. Before, sending A and then opening B showed A's feedback under B's prompt, and a failure's
    Try again paid for B. A late fresh set is taken only while one is being made;
  - delete-everywhere forgets the requests only as its local wipe begins (`beforeClear`), so a server delete that fails,
    and so wipes nothing, keeps what they bring.
- **Limits, recorded:**
  - the counter is this tab's. A call still out in another tab when this one wipes can still write back. A
    `BroadcastChannel` to every tab is the fix, named, not scheduled;
  - feedback is joined by submission alone, so feedback asked in one language and rejoined after a language change
    arrives in the first.

### D144 — a spoken session after a hard close: an `OralLiveness` port over Web Locks, and `closeAbandonedSessions`
**Date:** 28 September 2026 · **Status:** accepted; `implementation-plan.md` §3.3 amended in place; closes D116's named defect

- **The defect:** a hard close runs no code, so the session kept `endedAt: null` until the next session started. Until then
  it was missing from the list of past sessions, and its report was blocked as running. Worse, `startOralSessionRun`
  stamped **every** open session, including one another tab was running, and that tab then wrote it back as running.
- **A new port, `OralLiveness { hold(id) → release, live() }`**, in `@palier/app`. The practice controller holds its
  session from before it is stored until it ends.
  - **The browser's implementation is a Web Lock per session** (`lib/oral/liveness.ts`, in both graphs). The browser
    releases it itself when the tab goes, however it goes.
  - Without Web Locks nothing is live, which is the old behaviour.
  - The memory implementation is `memoryOralLiveness()`, with `abandon` for a tab closed hard.
  - No new dependency.
- **`closeAbandonedSessions`** stamps `interrupted` on every open session no page holds, and answers which it closed.
  - It stamps at the clock's now, as before, which the existing tests pin.
  - `startOralSessionRun` calls it, and so do the oral picker and the report as they load. So a closed tab's session is
    listed and reportable at once, and another tab's never.
- **Hardened at the pre-merge review:**
  - each session is read again before it is stamped, since its page may have ended it and let go after the list was read;
  - a lock still waiting to be granted counts as live;
  - a browser that refuses `locks.query()`, as a sandboxed origin does, finds nothing live, so a session can still start.
- **E2E on the production build:** a second tab does not list a session the first is running; once the first is closed,
  it does, and its report is offered. Proven to bite: with the controller holding nothing, the second tab closes the
  running session and the spec fails.


### D145 — Gate K: the PRD adopted as recommended, and the authored-item intake built in Slice 3
**Date:** 29 September 2026 · **Status:** accepted (human decision)

The human took the agent's recommendation on each of Gate K's five questions:
1. **The privacy notice and the about page:** the agent drafts both in Slice 3, from architecture.md §12 and PRD §7 and §13.0.
   The human reads both in Gate L's French review.
2. **The non-affiliation statement:** in onboarding and beside every band estimate, as well as the footer, as PRD §2 says.
3. **PRD §9's mechanics:** the streak, with its silent freeze, and the milestone moments are in 1.0, in Slice 4. XP and levels,
   whose names need the French review, and the countdown come after 1.0.
4. **The library's 1.0 scope:** one short reference article per written-expression sub-skill, ten, in both languages, linked
   from item explanations. Reading's articles come after 1.0.
5. **The PDF summary:** a print stylesheet over `/progress`, with no new dependency. It carries the trend per skill with its
   interval, accuracy by sub-skill, time invested, oral sessions and minutes, the honest panel and the statement.

**A sixth question, asked while planning Slice 3:** the factory had no intake for hand-authored items. content-factory.md §5
describes one ("enter at stage 4… carry `provenance.origin: 'authored'` and a contributor attribution"), but nothing built it, so
Gate M's outside submission had no route. **The human chose to build it in Slice 3**, rather than an issue-only path or its own
slice. Its model review runs on the next funded bank build (D54); the fast lane checks everything deterministic.

### D146 — the non-affiliation statement is one component, beside every band and at the head of onboarding
**Date:** 29 September 2026 · **Status:** accepted; Phase 7 Slice 3 (Gate K ruling 2, D145)

- **`components/NonAffiliation.tsx`** renders `footer.nonAffiliation` everywhere, so the wording cannot drift between
  surfaces. The footer is refactored onto it and keeps its `app-footer__disclaimer` class, which the smoke and offline specs
  find it by.
- **Where it now appears, beyond the footer:**
  - `/start`, above the wizard, so every step shows it;
  - the exam result's card and home's exam half;
  - the diagnostic readout;
  - the oral report, under the criteria;
  - workshop feedback, under the criteria;
  - `/progress`, which is also the printed summary.
- **Not added:** the trend meters, which show accuracy per band tag and never a band (§8.2), and a generated item's
  feedback, which shows no band.
- **The E2E reaches all but one:** home's exam half needs an onboarded user who has sat an exam, which no hermetic spec
  builds. It is covered by the component alone.

### D147 — the about page and the privacy notice, as drafted
**Date:** 29 September 2026 · **Status:** accepted, pending Gate L's French read (Gate K ruling 1, D145)

- **The about page** (PRD §7, §13.0) has seven sections: what it is; what it is not (§1.3's non-goals); where the questions
  come from; who makes it; the licence; the statement; and links to the privacy notice, `CONTRIBUTING.md` and the source.
  - **"A second, different AI model", not "a second model family".** `apps/factory/config/models.json` reviews on another
    OpenAI model, so cross-family (content-factory.md §4.4) is not what runs today.
  - **The unattended pipeline is stated plainly**, as architecture.md §20 Q3 asks: "No person reads every item before it
    is published."
  - **`about.bankToday` says the bank is still small and partly synthetic** (D54, D56), matching `/progress`'s honest
    panel. **Delete that key when the full-volume bank ships** (Gate M).
  - "Who makes it" names Doug Keefe, the maintainer, as the repository and the planned domain already do.
- **The privacy notice at `/privacy`** is architecture.md §12, in the voice of §10.1. It covers:
  - what the server holds when sync is on;
  - what is never held. The never-synced list reads the sync settings' own keys, so it is §9.4's list "verbatim";
  - the 180-day deletion (D138) and the 90-day tombstones;
  - the two third parties;
  - no analytics, no banner cookies, and item statistics only after a yes;
  - the user's controls.
  - It does not mention the Privacy Act. §12's note on it is a design constraint, not a promise to the user.
- **The footer links both**, so each is one step from every page (WCAG 3.2.6).

### D148 — the one-page PDF is `/progress` printed, with an oral line, and the second skill mounted only for print
**Date:** 29 September 2026 · **Status:** accepted; Phase 7 Slice 3 (Gate K ruling 5, D145)

- **A print stylesheet**, at the end of `apps/web/src/app/globals.css`:
  - it drops the header, the footer, the skill switch and the export card;
  - it lays each skill's two cards side by side;
  - it fits one page. `content.spec.ts` renders `page.pdf()` on Letter and A4 and counts one page on each.
  - No new dependency.
- **Printed, it carries both skills.** The skill the switch does not show is **mounted only while printing**, via
  `beforeprint`/`afterprint` and the print media query, flushed at once. The first build kept it in the document,
  hidden, and journeys 7 and 8 failed: their `getByText(/items answered/)` found two. The test was right, since a hidden
  duplicate is still in the document for anything reading it, so the page changed, not the test.
  - **Either signal is enough.** Chromium's PDF export fires `afterprint` while the page is still laid out for print,
    and a screenshot after the export had lost the second skill. The media query is read with `useSyncExternalStore`
    and outlasts the event. The print spec asserts both skills after the export.
- **Oral sessions and minutes spoken are new** (§8.9 asks for them):
  - `oralTotals` in `@palier/app` counts ended sessions from the device-local `OralStore`;
  - it sums `speakingMs`, a new engine function, which is the time spoken answers took. `fluencyMetrics` now uses it too,
    with no change in behaviour;
  - the card says "on this device only", since transcripts never sync.
- **Paper is always light.** `@palier/ui`'s generator emits `@media print` with the light tokens on `:root` and on any
  `[data-theme]`. It is placed before the exam blocks, because an existing test finds the exam's dark block as the last
  `@media` in the file.
- **What §8.9 asks for that this does not have:** "band trend *over time*". The page shows the current per-band accuracy
  with its interval, as the screen always has; there is no chart over time. **Named, not scheduled.**

### D149 — removing a device asks first, the code counts down from its arrival, and a removed device's switch follows
**Date:** 29 September 2026 · **Status:** accepted; Phase 7 Slice 3

- **Remove asks, in place**, with focus moved to its question, as delete-everywhere and the sync switch already do.
  - The copy differs for this device and for another device.
  - Cancel returns focus to the Remove button, once that button is back on the page (a ref callback, since it was
    unmounted while the question showed).
- **The pair code counts down its ten minutes, and is taken away when they end**, with "Show a new code".
  - **The countdown starts when the code arrives on this device** (`codeLapsesAt`, `PAIR_CODE_TTL_MS`), not from the
    server's `expiresAt`. A device clock a few minutes out would otherwise count the wrong ten minutes; counting from
    arrival errs only by the request's own time, and in the safe direction. The hermetic clock is fixed, so the E2E
    sees "10 more minutes" and the lapse is unit-tested.
  - One live region holds the code and its lapse, so both are announced; the minutes left sit outside it, so they are
    not read out every tick.
  - `sync.codeExpires` is replaced by `codeLeft`.
- **"This device noticing it was removed elsewhere"** (the Phase 7 survey, D132) was half built. The status line said
  so, but **the switch still read on** until the page was reloaded, because the page re-read its settings only after its
  own actions. It now re-reads whenever the runner's `paired` or `reason` changes. The new sync spec found this.

### D150 — the shortcut sheet: a registry, one key guard, and the existing `Dialog`
**Date:** 29 September 2026 · **Status:** accepted; Phase 7 Slice 3

- **`?` opens the sheet** from anywhere but a text field, and not over another open dialog. A footer button opens it
  too. It is `@palier/ui`'s **existing** `Dialog`: the plan named a new primitive, but one exists (the exam's navigator
  and submit confirmation use it), so none was written.
- **Its content is a registry** (`features/shortcuts/shortcuts.ts`): a row per key per scope, with key names whose labels
  are messages, so French reads "Entrée". A test checks that every scope, key and action has its message. Nothing
  switches on a screen.
- **One key guard**, `lib/keyboard.ts`'s `isPageKey`, taken out of the exam runner and the drill.
  - **The drill gains the exam's chord guard**, which it lacked. Cmd+1 switching a browser tab, or a held key, no
    longer also answers the drill. That is a behaviour change, and a fix.
  - The existing handlers' tests are unchanged.
- **The footer's links are a `<div>`**, not a `<p>`, since the dialog's headings are inside it. The `<p>` was invalid
  nesting, and React reported a hydration mismatch on every page.
- `aria-keyshortcuts` is on the opener (`?`) and the exam's Flag button (`F`).

### D151 — the `lang` audit: two gaps, both in workshop feedback
**Date:** 29 September 2026 · **Status:** accepted; Phase 7 Slice 3

The audit searched every render of item, passage, scenario, transcript and model text.
- **What already held:**
  - item stems and options;
  - passages;
  - exam and drill feedback, through `inItemLang`;
  - oral questions, answers and transcripts;
  - workshop prompts and the text being written;
  - the oral report's corrections, which D127 fixed.
  - Scenarios render no free text.
- **The two gaps:** in `WritingFeedback`, the visually hidden "error N" label and the "added" and "removed" labels sit
  inside the writing's `lang` paragraph without the interface's own `lang`. So a screen reader read English words in a
  French voice. Both now carry `lang={locale}`, as the oral report's do. The workshop spec asserts it.

### D152 — the authored-item intake: `content/authored/`, a contributor handle, and stage 4
**Date:** 29 September 2026 · **Status:** accepted (human decision at planning, D145); `docs/architecture.md` §5.1–§5.2
amended in place

- **One JSON file per contribution** in `content/authored/`, holding `{ items, passages? }` in the published schemas.
  `content/` still holds no code (ADR 18): the directory has a `.gitkeep`, and the factory reads it from disk.
- **`ItemProvenance.contributor`**, and `PassageSource.contributor`, are a **public handle**, shaped as a GitHub username
  is, so an attribution can hold no name or email.
  - The field is optional in the schema, so every earlier bank stays valid.
  - The domain's `validate()` flags an `origin: "authored"` item without one (`authored-without-contributor`), so the
    factory's validation drops it even after review passed it.
  - A passage has no `origin`, so the intake test requires the contributor of every passage under `content/authored/`.
- **The factory takes authored items at stage 4** (content-factory.md §5):
  - they are reviewed apart from the drafts, so stage-4 yield still measures the drafter;
  - they are then joined to the drafts for validation and the bank build;
  - the batch report gains an `authored` block only when there is one, so with the directory empty the committed bank,
    the batch report and the eval report are byte-identical.
- **The eval set's fixtures are `origin: "authored"`**, so each now credits `palier-eval`. Otherwise every defect would
  be "detected" for the missing credit instead of its real defect. **One test fixture changed:** `validate.test.ts`'s
  base item gained a contributor, since the new rule makes it invalid by design. No assertion changed.
- **`authored.test.ts` runs in the fast lane.** It holds every committed contribution to:
  - the schemas and the factory's per-item rules;
  - a contributor on every item and passage;
  - no id colliding with the bank;
  - an existing passage for every comprehension item.
  It also checks `CONTRIBUTING.md`'s example, so the guide cannot go stale.
- **`CONTRIBUTING.md` opens with the originality rule** (R6, PRD §2). The PR template carries the attestation as three
  checkboxes. The README links both.
- **Named, not scheduled:** architecture.md §17's rendered preview posted on a `content/` pull request. The model review
  of an outside item runs on the next funded bank build (D54), so Gate M's outside submission is ready to take one.

### D153 — Relicensed non-commercial: PolyForm Noncommercial for code, CC BY-NC-SA 4.0 for content
**Date:** 29 September 2026 · **Status:** accepted (human decision); ADR 23 supersedes ADR 12; R13 amended in
`product-requirements.md` §0.1

- **Why:** the owner does not want Palier used commercially. MIT and CC BY both allow that. ADR 12's *revisit when* (a
  source licence incompatible with CC BY) has not happened. The owner's new requirement is the reason, and ADR 23 says so.
- **What changed:** `LICENSE` is the verbatim PolyForm Noncommercial License 1.0.0 with a `Required Notice:` line, and
  `LICENSE-CONTENT` is the verbatim CC BY-NC-SA 4.0 legal code. Each file keeps a short preamble on its scope. The root
  `package.json` carries `"license": "PolyForm-Noncommercial-1.0.0"`.
- **R13 changed wording:** "free to use and open source" now reads "free to use, and its source publicly available under a
  non-commercial licence". A non-commercial licence is not OSI open source, so "open-source" becomes "source-available"
  in the README, `CLAUDE.md`, the docs and the app's `en`/`fr` copy (`site.description`, the non-affiliation statement,
  the about page's `what` and `licence`). PRD §2's quoted statement is amended to match the component.
- **Contributions are inbound = outbound** (human choice): no CLA and no grant letting the maintainer relicense.
  `CONTRIBUTING.md` and the PR template's third checkbox name the new licences.
- **Clean to do now:** the repo is private and every commit has one author, so no earlier MIT grant has reached anyone.
  The ten `canada.ca-non-commercial` passages now sit under a content licence that is compatible with their source.
- **Not changed:** older session-log entries that say MIT (append-only). The factory's licence gate (`harvest.ts`) is
  unchanged, since every permitted source licence is compatible with CC BY-NC-SA. Making the repo public stays with the
  human.

### D154 — TypeScript 6, and every build states its ambient `types`
**Date:** 29 September 2026 · **Status:** accepted (cleanup slice, human chose to take the major)

- **What broke.** TypeScript 6.0 no longer loads every `@types/*` package it can find. Dependabot's PR (#44) failed at
  `packages/testing/src/simulator/network.ts`: it could not find `setImmediate`.
- **The fix.**
  - `tsconfig.base.json` now sets `"types": []`, TS 6's own recommended default. A package that really runs on Node opts
    in with `"types": ["node"]`.
  - Two builds opt in: `packages/testing` and `apps/factory`.
  - All five other packages' `tsconfig.vitest.json` opt in too, because their tests read fixtures and goldens from disk.
    Their `tsconfig.json` builds do not.
  - `apps/web` needed no change, because Next's own types bring Node's in.
  - The #44 branch was closed, and this branch carries the bump in every `package.json`.
- **What it buys.** "No `node:*`" in `@palier/domain` and "zero Node core" in `@palier/engine` were lint and
  dependency-cruiser rules. Now the compiler enforces them as well.
  - **Proven to bite:** `process.env` appended to `engine/src/index.ts`, and a `node:fs` import appended to
    `domain/src/index.ts`, each failed `tsc -b` with TS2591. Both were reverted.
  - Both packages' `CLAUDE.md` say so.
- **`@types/node` stays a root devDependency.** It resolves from the root's `node_modules` for every package, as it did
  before. A `types` entry is not an import, so the strict-isolation rule is unchanged.
- **Nothing else in TS 6 fired.** `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are unchanged.
  The tooling's peer ranges already accept 6.0: typescript-eslint `<6.1.0` and dependency-cruiser `>=3.6`.

### D155 — the dev-only advisories are overridden, not waited on; Dependabot ignores two majors
**Date:** 29 September 2026 · **Status:** accepted. Supersedes D135's "Dependabot will propose the updates"

- **Why D135's expectation failed.** Seven alerts were open, all dev-only and transitive:
  - `tmp` twice, `uuid` and `extract-zip` twice under `@lhci/cli` 0.15.1;
  - `qs` under Stryker's `typed-rest-client`;
  - `esbuild` 0.18 under `drizzle-kit`'s deprecated `@esbuild-kit` loader.

  Every parent is on its latest release and pins the vulnerable version, so Dependabot had nothing to propose.
- **The fix is scoped `overrides` in `pnpm-workspace.yaml`**, each commented with its GHSA:
  - `@lhci/cli>tmp` and `external-editor>tmp` go to `^0.2.6`;
  - `@lhci/cli>uuid` goes to `^11.1.1`;
  - `typed-rest-client>qs` goes to `^6.15.2`;
  - `@esbuild-kit/core-utils>esbuild` goes to `^0.25.0`.

  No package is added. Each was checked against the API its parent calls: lhci uses only `uuid.v4()` and
  `tmp.fileSync`, and external-editor uses `tmp.tmpNameSync`.

  Smoke checks: `lhci --version` answers; `drizzle-kit generate --dialect=postgresql` wrote both tables into a temporary
  directory; the Lighthouse step runs in the medium lane.
- **`extract-zip` ≤ 2.0.1 has no patched release** (GHSA-7pqw-9j4j-h8q3, GHSA-jmr9-qjv8-65gv). Both alerts are dismissed
  on GitHub as tolerable risk. It unpacks only the Chrome download on CI's Lighthouse step, and never touches user input.
  **Revisit when** `@puppeteer/browsers` drops it or a fix ships.
- **`pnpm audit` over the whole tree**, dev included, went from those seven to the two `extract-zip` entries only. The
  fast lane's `--prod` gate is unchanged.
- **The Dependabot queue.**
  - #41 (the minor-and-patch group) and #40 (`github-script` v9) merged green. v9's breaking change is
    `require('@actions/github')`, which our scripts never call.
  - #43 (`jsdom` 30) asks for Node `^22.22.2`, so `.nvmrc` moved from 22.19.0 to 22.23.3, the latest 22.
  - #42 (`@types/node` 26) was closed, because the types track the runtime's major.
  - `.github/dependabot.yml` now ignores semver-majors of `@types/node` (it moves with the runtime) and of
    `eslint`/`@eslint/js` (D8).

### D156 — the nightly lane: a lane-wide timeout, and one issue per failing job
**Date:** 29 September 2026 · **Status:** accepted

- **Why it was red.** The nightly lane failed every night from 25 to 29 September and opened five identical issues (#24,
  #29, #33, #36, #46).
  - On four of those nights, two tie-order properties timed out at Vitest's 5-second default under 10,000 runs, at 5.4 to
    7.6 s: `calculateTrend` and `weakestSubSkills`, "…in any order, even when their times tie". Integration and E2E never
    ran after them.
  - On the fifth night they happened to pass, and Integration found three sync-simulator seeds (D157).
- **The fix is `testTimeout: 300_000` in `vitest.config.mts`, only when `CI_LANE=nightly`.** It keys off the same variable
  as `vitest.setup.mts`'s `numRuns`. The lane is "unbounded in time" (§6.5), so the default was measuring the runner's
  speed. Fast and medium keep 5 s, where a slow test is a bug. It is one root setting rather than a timeout per test, so a
  new property does not have to remember it.
  - **Proven to reach the projects:** with the value set to 1 ms, the nightly run of the trend file failed "Test timed out
    in 1ms".
- **Both failure steps in `nightly.yml`** now look for an open `nightly` issue with the same title prefix. If one exists,
  they comment the run on it; otherwise they open one. A red week is one thread. The scripts were syntax-checked from the
  parsed YAML. A real failing run will be the first to exercise the comment path.

### D157 — a registration answer never overwrites an identity the device gained while it was in flight
**Date:** 29 September 2026 · **Status:** accepted. **Found by the sync simulator** (seeds 54693 and 72951, 3 devices; 91998, 2
devices; nightly lane, 100,000 seeds)

- **The defect.** `requestPairCode` read `identity === null`, awaited `registerDevice`, and wrote the answer without looking
  again. If the device's account changed during that round trip, the stale answer overwrote it.
- **All three seeds follow the same sequence:**
  1. Another device asks the victim for a code before the victim's first registration is answered.
  2. The victim registers by syncing and pushes its work.
  3. It redeems a code, and the response is lost after the server applied it. The server has moved the device and dropped
     the old account, which is now orphaned, along with everything the device pushed there. D74's flag is set.
  4. The held registration lands and writes the new account's identity, but keeps the old ledger.
  5. The next sync asks the server, gets that same account back, and sees no change, so the ledger stays. Every record
     pushed to the dropped account stays "clean" and never reaches the new one.

  **The result is permanent, silent loss of a device's early history.**
- **Why the attempt ids repeat across seeds.** Each device's counter starts at `(i+1)·2^20` whatever the seed, so these are
  the victim's first session, not a collision.
- **It is reachable in the app, rarely.** "Add a device" and "Join" sit on one screen (`SyncSettings.tsx`), and neither is
  serialised against the other or against the background runner.
- **The fix.** `requestPairCode` re-reads the state when the answer arrives.
  - It writes the identity only if the device still has none.
  - An answer naming another account is trusted neither way: it sets `accountUnconfirmed`, and the next sync settles it by
    D74's rule.
  - The same account changes nothing.
- **Alternatives rejected:**
  - *Reset the ledger in `requestPairCode`.* It cannot know whether the other writer already handled the ledger. D74's flag
    is the one path that asks the server and resets only on a real move.
  - *Serialise sync-state writes in `apps/web`.* That would leave the use case, and the simulator, with the race.
  - *Compare-and-set on `SyncStateStore`.* That is a port change for one call site, and the re-read has the same
    one-store-read window D75 accepted.
- **Residual, recorded rather than closed.** `syncNow`'s first-registration branch has the same shape. A pairing that
  succeeds while a first sync's `registerDevice` is in flight could leave a wrong local account id. It loses no data, since
  pairing resets the ledger, and the simulator cannot reach it: a device waits for its own sync before pairing. **Revisit
  when** a store port gains transactions, or the device list is seen showing the wrong account.
- **Tests** (`sync-account.test.ts`):
  - "does not overwrite an account the device joined while its registration was in flight, so its history still reaches
    the account (D157)", which failed first;
  - "marks its account unconfirmed when a late registration answer names another account, and its next sync settles
    which", which failed first;
  - "leaves alone the identity a sync gave the device while its registration was in flight, when both name one account",
    which guards the third branch.

  The three seeds are in `REGRESSION_SEEDS`, and `packages/app/CLAUDE.md` gains the rule.
- **Proven to bite.** With the fix reverted, the three regression seeds (3 failed in `run.test.ts`) and the first two new
  tests fail. With it in place, 2,000 seeds on the integration project pass.

### D158 — the adapters' errors name themselves with literals: a fix that never merged, recovered
**Date:** 29 September 2026 · **Status:** accepted. **Found by the branch cleanup**, and first written on 26 September as
"D101" on `dougkeefe/next-progress-slice-v1`

- **The defect, live on `main`.** `OpenAiError` and `BankLoadError` set `this.name = new.target.name`. A production build
  minifies class names, so the name read as a mangled letter.
  - `features/key/key-view.ts` tells key-check results apart by `error.name` (`"InvalidApiKeyError"`, `"RateLimitError"`),
    because the error crosses the lazily loaded container's chunk.
  - So on the deployed site, a rejected key or a rate limit read as the generic failure, and never as "OpenAI did not
    accept this key".
- **How it was lost.** A live key found it on 26 September. The fix was committed to Phase 4 Slice 1's branch *after* that
  branch's PR (#28) had merged, so it never reached `main`. The number D101 then went to the cost ledger. Before deleting
  the merged branches, the cleanup checked each branch's tip against its PR's merged head. This one branch had one commit
  more.
- **Recovered as it was written.**
  - Every class in `adapters/openai/errors.ts` and `adapters/bank/errors.ts` gets `override name = "…"`.
  - A unit test pins each name.
  - `key-states-production.spec.ts` drives each key-check result on the minified build.
  - A note goes in both `CLAUDE.md`s.

  Only the number changed. A scan of every `extends …Error` class in `packages/*/src` and `apps/*/src` finds none left
  without a literal name.
- **Proven to bite:** with `main`'s `openai/errors.ts` built, the spec fails: the status "OpenAI did not accept this key."
  never appears. With the fix, it passes.

### D159 — the streak counts every kind of session, on the device's day, and "said once" is a synced setting
**Date:** 29 September 2026 · **Status:** accepted; Phase 7 Slice 4 (Gate K ruling 3, D145)

- **What makes a day.** PRD §9 says "days with any completed session", but only a drill writes to `SessionStore`, so the
  Next section's "`SessionStore`'s completed sessions" would have missed review, diagnostic, exam and oral days.
  `streakReport` (`@palier/app`) counts:
  - a completed drill (`Session.completedAt`);
  - a submitted exam (`ExamRun.submittedAt`);
  - an ended spoken session (`endedAt`), on this device only, since the `OralStore` never syncs;
  - a review or diagnostic answer, since neither writes a session record.
  A drill's bare answer (a drill left unfinished) and an exam attempt do not count on their own.
- **The day is the device's.** The engine's `localDay(at, timeZone)` reads `Intl` by part; the use case takes the time zone
  in the request and the clock as a dep. No `todayIn` helper was needed in `lib/time-zone.ts`, as the plan had guessed.
- **The freeze** (`streak`, `@palier/engine`): walk back from today, where today still to do breaks nothing. A missed day is
  frozen while fewer than the allowance are frozen **in that day's own calendar month**; otherwise the streak ends. A frozen
  day keeps the streak but adds nothing to its length, and a freeze is kept only when an active day precedes it. Six
  properties hold it: order and duplicates change nothing, the length never exceeds the active days, no month spends more
  than its allowance, and one more active day or one more freeze never shortens it. **Proven to bite:** `>` for `>=` failed
  the allowance property.
- **The rules are product constants** (`features/engagement/rules.ts`: two freezes a month, 1,000 items), handed in as request
  fields, not profile data: ADR 9 covers exam rules.
- **"Said once" is a synced setting**, so a paired phone does not say it again:
  - `streakFreezeNoticed` is the newest frozen day announced. It never moves back, since another device may have announced a
    later one;
  - `milestonesShown` is a `MilestoneId[]`.
  Settings merge as "the local value wins" (D69), so two devices showing different milestones at the same moment can each
  show one milestone once more. Accepted: it is a repeat celebration, never lost data. `/privacy` now says the server holds
  them.
- **The milestones** (`milestonesReached`, a threshold check over facts the app gathers):
  - **"First mock exam at C" reads the exam, and counts C or above**, so an E counts. Drills never give a band (§8.2, D64).
    Every submitted run is rescored, and a run the bank can no longer score is passed over, as `latestExamResult` does (D89);
  - "1,000 items" counts every answer, exam attempts included;
  - "first spoken session" is per device, as the oral store is.
- **Shown on home only**, full screen through `Dialog`'s new `full` placement, so never in exam mode or on a results screen
  (§10.1). The first unseen one is shown per visit; closing it, by its button or Escape, marks it.
- **The share is text and the app's address**: the Web Share API where `canShare` allows it, else the clipboard with a status,
  else no button. The text names the milestone, "free, unofficial" and the SLE, and nothing about the person. No image, so
  no new dependency.
- **One journey changed, and why.** The key-leak journey (`key-leak.spec.ts`) returns home after its spoken session, and
  home now opens the first-oral moment, a modal, a beat after the page renders. Its next click was covered, and the medium
  lane failed there. The moment was doing what §9 asks, so the journey now expects it and closes it as a user would. No
  assertion about the key changed.

### D160 — motion: three duration tokens, one switch for reduced motion and exam mode, and transform only
**Date:** 29 September 2026 · **Status:** accepted; Phase 7 Slice 4

- **The tokens are custom properties in `components.css`** (`--pl-motion-state` 120ms, `--pl-motion-panel` 200ms,
  `--pl-motion-celebrate` 400ms, `--pl-ease`), not `tokens.ts`, whose type, drift guard and contrast test are about colours.
  A fourth curve, `--pl-ease-spring`, is §10.5's "small spring", on the 400ms moments only.
- **One switch replaces the class lists.** `*, ::before, ::after` get `animation: none !important; transition: none
  !important` under `prefers-reduced-motion` and inside `[data-mode="exam"]`, so a new animation cannot be left out of
  either. Reduced motion was a 0.01ms transition before; it is now none. Nothing listens for `transitionend`.
  - `motion.test.ts` fails a literal duration or a keyframe that touches opacity, visibility or colour in either stylesheet.
    **Proven to bite** with a `300ms` transition and an opacity keyframe.
  - `motion.spec.ts` reads the computed styles in a real browser, both ways.
- **What moves:** the band meter fills from empty when it appears (`scaleX`, transform only, since a fade is low-contrast text,
  D65); a cheering Coco and the streak flame settle in with the spring.
- **New in `@palier/ui`:** `Mascot`'s `cheer` pose, `StreakFlame` (decorative, outlined when today is still to do, never a
  warning), and `Dialog`'s `full` placement, laid out only while open so a closed dialog stays `display: none`.

### D161 — the fonts are committed woff2 files, and the service worker follows stylesheets to them
**Date:** 29 September 2026 · **Status:** accepted; Phase 7 Slice 4. Resolves D65's deferral of self-hosted fonts

- **The files are the Latin subsets of Inter, Figtree and Source Serif 4's variable fonts**, as Google Fonts serves them, fetched
  once and committed under `apps/web/src/fonts/`, about 117 KiB together. Each has its OFL text beside it, and `SOURCES.md` gives its
  URL and SHA-256, which `fonts.test.ts` checks. They are assets, not a dependency: nothing present supplied them, and no
  font CDN is used at build or at run time (architecture.md §6.4).
  - The subset covers every French letter, `œ`, `« »`, the curly apostrophe and the dashes. Only capital `Ÿ` falls outside
    it, and renders in the fallback. The `unicode-range` is declared, so the browser knows.
- **`next/font/local`** puts them on `<html>` as `--font-sans`, `--font-display` and `--font-serif`. **Its arguments must be
  literals**: the loader refused a shared range constant at build, so the range is written out in each call.
  - Inter and Figtree preload (§10.3's "the two above the fold"). Source Serif 4 does not, and falls back on Times New Roman's
    metrics.
  - Headings now use Figtree, which no rule named before.
  - `.pl-passage` reads `var(--font-serif)`: D65's literal "Source Serif 4" would not have matched next/font's hashed family.
- **Offline.** The worker's precache read URLs from the HTML only, so a face nobody preloads was never cached.
  `staticAssetsInCss` follows each precached stylesheet's `url()`s, resolved against the stylesheet (`../media/…`).
  **Proven to bite:** without it, the offline spec found no Source Serif file in the cache.
- **The CSP is unchanged** (`font-src 'self'`). `csp-production.spec.ts` asserts all three faces load, from this origin only,
  with zero violations, and that body text and headings compute to them.

### D162 — the library is structured JSON, not MDX, with cited French marked for its `lang`
**Date:** 29 September 2026 · **Status:** accepted; Phase 7 Slice 4 (Gate K ruling 4, D145). `docs/architecture.md` §4's
table and §5's tree amended in place

- **Not MDX** (§7 Phase 7 and architecture.md said MDX): `content/library/<subSkill>.json`, one per written-expression
  sub-skill, under a Zod schema in `@palier/domain` (`library-article` in `CONTENT_SCHEMAS`). It is the same pipeline as the
  bank and the prompts, and adds no MDX toolchain as a dependency.
  - **`parseLibrary` refuses a library missing any sub-skill's article, or with two**, since every written-expression
    explanation links to its sub-skill's page.
  - **Proven to bite:** with one file removed, the content tests failed.
- **Cited French inside the prose is marked `_like this_`** and renders as `<i lang="fr">`, so a screen reader reads a French
  phrase in French inside an English paragraph (WCAG 3.1.2, the rule D151 applied). The parser refuses an unpaired marker, by
  path. The examples carry the article's `lang` whole.
  - **Residual:** an English phrase quoted inside the French prose (« take place ») is not marked `lang="en"`. It is short,
    in quotation marks, and a second marker would be a markup language.
- **The pages are server components** over `lib/library.ts`, so no article reaches the client's JavaScript. A link needs only
  `features/library/links.ts`.
- **The link from an explanation** is on every written-expression item: the drill's feedback (generated sets included) and
  the exam review. **From a drill it opens a new tab**, with a hidden "opens in a new tab", so the session in progress is
  never left. The exam review opens it in place.
- **Offline:** `prepare-public.mjs` skipped every dynamic route. It now expands `library/[subSkill]` from the content's file
  names, and stamps the articles into the worker's build hash. The offline spec opens an article nobody visited.
- **The route lists** gained the library: Lighthouse (19 URLs), `csp-production.spec.ts`'s pages, and the titles journey.
- **The articles are the agent's drafts**, French included, and are Gate L's to read. Reading's articles come after 1.0.

### D163 — a change of locale is a document load, never a soft navigation
**Date:** 29 September 2026 · **Status:** accepted; a defect the human found in production. Amends D134's reach, not its policy

- **The defect.** On the production build, every click on "Français" or "English" rendered `global-error`: "Palier stopped
  working". A reload showed the right page. `LanguageToggle` was next-intl's `Link` with `locale`, a client-side navigation.
  - The locale is the root layout's segment. Next keeps it a soft navigation, since `/en` and `/fr` are the same
    `[locale]/layout.tsx`, but the segment's key changes, so React **remounts the whole root layout**.
  - React builds any `<script>` it renders on the client by writing `innerHTML` (`<script></script>`) on a wrapper. The
    remounted layout's Trusted Types `<script>` therefore hit the HTML sink. D134's `default` policy has no `createHTML`,
    so it threw: `Failed to set the 'innerHTML' property on 'Element': This document requires 'TrustedHTML' assignment`.
  - **Unseen until now** because the toggle's only test (`smoke.spec.ts`) runs on `next dev`, where Trusted Types is off,
    and `csp-production.spec.ts` only ever loaded pages with `goto`.
- **The fix: `onNavigate` cancels the router's navigation and `location.assign` loads the page.** A locale is a new
  document anyway (its `lang`, its head, a fresh nonce). The href, right-click, middle-click and no-JavaScript behaviour
  are unchanged.
  - **The policy is not loosened.** A `createHTML` that let React's wrapper through would reopen the sink D134 closed, for
    one component's convenience.
  - **It stays next-intl's `Link`, not a plain `<a>`,** because its click handler writes the locale cookie. The proxy
    cannot: once the service worker controls the page, a navigation reaches it as the worker's `fetch`, not as a document
    request, and next-intl's `syncCookie` leaves the cookie alone for those. **Proven to bite:** with a plain `<a>`, the
    cookie assertion failed (`Received: undefined`).
- **The test** is in `csp-production.spec.ts`, with the worker in control. It clicks EN→FR→EN on `/about` and checks, both
  ways, the URL, `lang`, the page's heading, no global-error copy, the cookie, and zero violations. **Red before the fix**:
  the global-error title was on the page.
- **The rule** is in `apps/web/CLAUDE.md`: any link that changes the locale is a document load.

### D164 — Gate L passed: the French, the screen-reader pass and the red-team read found nothing
**Date:** 29 September 2026 · **Status:** accepted (human decision); resolves Gate L, and ticks Phase 7 exit criterion 2 and
the accessibility audit and French review items

- **The human reviewed Gate L against its three criteria as written and found no issue**: R8's French review, the
  VoiceOver and NVDA pass on the core flows [R9], and the red-team read of D136. The scope of each is the one *Next,
  decided* gave it, which is superseded now but visible in git history.
- **No correction came out of it**, so no message, content or code changed. The one defect the human reported at the same
  time, the language toggle (D163), was a production crash, not a review finding, and is fixed separately.
- **Not reported:** whether a screen-reader user's pass was arranged. The work item asked for it "if one can be arranged",
  so it does not hold the tick.
- **Exit criterion 1 stays open.** Its accessibility and security halves are met. "Every gate green" waits on Gate M.
- **What would reopen it** was not stated at the gate. The agent's suggestion, not the human's: an outside contributor or a
  pilot user reporting a French error or a screen-reader blocker, or a new sink or origin in the CSP.

### D165 — studio mode is back in 1.0, on the Realtime API that ADR 3 was written for
**Date:** 29 September 2026 · **Status:** accepted (human decision); supersedes D131. Amends D116 and implementation-plan.md
§3.3; ADR 3 is unchanged and live again

- **The human wants the realtime conversation built, and in 1.0.** Asked where it sits, they chose "in 1.0": Gate M waits
  for it. The agent recommended this because studio mode changes the privacy and key copy, and that is better said before the
  repo goes public than walked back after. The human builds it in a separate worktree. This session changed documents only.
- **Why D131's evidence no longer decides it.** Its blockers belonged to GPT-Live and the Live API, not to the Realtime API
  ADR 3 names. OpenAI's documents, read by this session on 29 September 2026:
  - **The browser credential exists.** `POST /v1/realtime/client_secrets` mints an `ek_` secret: 10 s to 2 h, 10 min by
    default. The browser then posts its SDP offer to `/v1/realtime/calls`. That is exactly ADR 3's one server call.
    Sources: developers.openai.com/api/docs/guides/realtime-webrtc, and the client-secrets reference.
  - **French.** Ten voices: alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin and cedar, with `marin` and `cedar`
    recommended. Voices are not chosen by language. Every voice speaks every supported language, and French is among the
    strongest. The accent can lean neutral or US, so **Gate N is the human's ear.**
  - **The length.** "The maximum duration of a Realtime session is 60 minutes." That clears the 22-minute simulation and
    the 25-minute cap.
  - **The model.** `gpt-realtime-2.1`, as architecture.md §8.1 already names. Published estimates are about US$0.05 a
    conversation minute, and about US$0.016 on the mini model. Those are third parties' figures. Slice 2 measures the real
    one (principle 8).
- **ADR 3 stands as written**, so no ADR is written or superseded. Its *revisit when* ("a browser-direct realtime auth path,
  or the feature is dropped") is still unmet: the client secret is still minted with a standard key on a server.
  - **Two readings of it, recorded here.**
    - "Edge function" is read as the route's shape: stateless, holding nothing, no logging. It is not read as a runtime,
      because ADR 21 put every route on Node and Next 16 deprecates Edge.
    - "A self-hosted endpoint option ships" is kept, and its mechanism is decided below.
  - If the human reads either one differently, that is a new ADR superseding ADR 3.
- **The self-hosted escape cannot be a plain `fetch`.** The strict CSP's `connect-src` is this origin and OpenAI, the same
  for every user (D133). A user's own endpoint lives in their browser, so the server cannot add it without widening the
  policy for everyone, or trusting a cookie an injected script could set. **Decided: a popup.**
  - Palier opens the user's endpoint in a popup and hands it the key by `postMessage`, to that origin only.
  - The page there, served by the shipped Worker or function, mints the secret on its own origin and posts it back.
  - The page checks `event.origin` both ways. `postMessage` is not a fetch, so the policy is unchanged.
  - If Slice 3 finds this unworkable, it records why before choosing again.
- **Where the new numbers live.**
  - The 25-minute cap is a spend guard, not an exam rule (ADR 9 covers exam rules), so it goes in `pricing.json` as
    `studioMaxMinutes` beside the realtime price.
  - The model and voice go in `ai-models.json`.
- **The ports.**
  - `AiProvider.openVoiceSession` is dropped from §3.3. A provider is made per call inside `withApiKey`, and a voice session
    outlives the call and never uses the key after minting. Studio mode is instead a new `OralTransport`, which Phase 5
    Slice 1 shaped for this, fed by a new `RealtimeSecretSource`.
  - `OralTransportEvent` gains `note`, and `OralRequest` gains optional `notes`. The session machine gains a `time-cap` end
    reason, which D116 had left to Phase 6.
- **The plan.** Three slices and two gates, as in the Phase 6 section, with two exit criteria added: the French voice
  (Gate N), and the exception stated and escapable. Gate M waits on Gate O.
- **Moved in place**, each noted with this entry:
  - `implementation-plan.md` §7 Phase 6 and Phase 7, §3.3, the §8 R1 row, the §9 timeline and the §11 risk row;
  - product-requirements.md §8.6, §16 and §17 question 4;
  - architecture.md §6.3, §10, §14 and §20 question 1.
- **Not changed here:** the two code comments that say "after 1.0 (D131)", `KeyOffer.tsx:12` and
  `packages/domain/src/oral-session.ts:16`. They are Slice 1's, so this session stayed in documents.

### D166 — studio mode's cap: the machine ends at it, and the transport closes itself at it too
**Date:** 29 September 2026 · **Status:** accepted (agent, Phase 6 Slice 1). Amends D116

- **The rule.** `startOralSession(phases, { capMs })` ends a session `time-cap` at or past `capMs`.
  - The cap is checked **before** the scenario's length, so a cap shorter than a scenario wins.
  - Otherwise a session still completes at its length, and it always does today, since no scenario runs past 22 minutes and
    the cap is 25.
  - Practice mode passes no cap and is unchanged.
- **The belt and the braces.** `realtimeTransport` also arms its own timer at `maxMs` from `open` and closes cleanly. So the
  cap holds even when the screen's ticks stall, a background tab for example. The driver steps that close at
  `atMs ≥ capMs`, so it is stored `time-cap`, never `transport-closed`. Both numbers come from `pricing.json`'s
  `studioMaxMinutes`, through `STUDIO_MAX_MINUTES` in `apps/web/src/lib/pricing.ts`, parsed and checked there.
- **Why the cap is not profile data.** It is a spend guard, not an exam rule (ADR 9 covers exam rules). D165 decided that,
  and so it lives beside the price it guards.

### D167 — a realtime price is a fourth `ModelPrice` kind, and studio mode's estimate is provisional
**Date:** 29 September 2026 · **Status:** accepted (agent, Phase 6 Slice 1)

- **The prices.** OpenAI's pricing page, read 29 September 2026, lists these for gpt-realtime-2.1, in US$ per million
  tokens: text 4 in and 24 out, audio 32 in and 64 out, and cached input 0.40 for text and audio alike.
  - A token pair cannot price that, so domain gains `RealtimePrice`: five rates, one of them the cached input, since OpenAI
    lists one figure for both.
  - It also gains `RealtimeTokens`, whose input counts are the **uncached** part, and `costOf` prices it. It is `null` when
    any unit is unmeasured, as D103 and D117 require.
- **The usage.** The transport reads each `response.done`'s `input_token_details` and its `cached_tokens_details`, and
  subtracts the cached part itself. A response with no token details is left unpriced, never free.
- **The estimate is derived, not measured**: `oral-studio` is one minute, like `oral-practice`.
  - Audio: OpenAI counts input audio at one token per 100 ms and output audio at one per 50 ms. The candidate speaking 60%
    of a minute is 360 in, and the examiner 40% is 480 out.
  - Text: about 300 in and 60 out.
  - Cached: 30,000 a minute, about three responses each re-reading a context that averages 10,000 tokens over 22 minutes.
  - Transcription: 0.6 minutes of the candidate's speech, by `transcribe`.
  - That is about US$0.055 a minute, beside the published US$0.05 (D165). The plan said "600 in and 1,200 out"; the
    speaking shares above were used instead because a conversation is two people.
  - **Slice 2 replaces it with a measured session** (principle 8).
- **Input transcription** is billed by the transcription model, at `gpt-transcribe`'s rate per minute. The event's own
  `usage.seconds` is used when it reports duration, and the speech it heard otherwise, as the practice transcriber does
  (D117).
- **The feature table shows it now.** `SpendSettings` lists every `AI_FEATURES` entry, so "Studio conversation" appears
  before a screen can spend on it. It is labelled as what it is, and the French goes to Gate O's read.

### D168 — a studio examiner's note: five criteria, three severities, and the phase stamped by the client
**Date:** 29 September 2026 · **Status:** accepted (agent, Phase 6 Slice 1)

- **The shape.** `OralNote = { criterion, evidence, severity, phase }`, checked by `oralNoteSchema`.
  - The criterion is one of `ORAL_CRITERIA`. Pronunciation is not one, because it is not assessed (Gate J).
  - The severity is `minor`, `moderate` or `major`. The docs named the argument and never its values.
  - The evidence must say something.
- **Who stamps what.**
  - The transport's event carries no phase. The driver stamps it, as it does a turn's.
  - `OralSession.notes` is optional, so every stored practice session stays valid.
  - The Dexie store drops a broken note and keeps the rest and the session. A note is the examiner's aside, and the
    transcript is the user's words.
- **The report.** `OralRequest.notes` is passed only when there are some. The prompt quotes them after the transcript, each
  evidence as a JSON string, as observations the transcript decides.
- **The contract.** `oralTransportContract` holds every transport's notes to a known criterion and severity. A transport
  whose examiner takes none passes with nothing to check.

### D169 — the realtime secret: one port, two sources, one route, one contract
**Date:** 29 September 2026 · **Status:** accepted (agent, Phase 6 Slice 1). ADR 3 unchanged

- **The port.** `RealtimeSecretSource { mint(apiKey) → { value, expiresAt } }` lives in `@palier/app`, because `ISO` lives
  there (D18). The app calls it only inside `withApiKey`, through `startOralStudioRun`'s `secret` hook, and `NoApiKeyError`
  comes first when no key is held.
- **Two sources, both in `packages/adapters/src/openai/`**, under the existing `./openai` subpath. A new adapter directory
  would be a new `exports` entry and a new boundaries element for two files.
  - `openAiRealtimeSecrets` is the server's. It makes one `POST /v1/realtime/client_secrets` with
    `expires_after: { anchor: "created_at", seconds: 60 }` and the configured model and voice. It never reads a refusal's
    body.
  - `routeRealtimeSecrets` is the browser's. It posts the key in `Authorization`, with no body, and maps the route's codes
    back to the adapter's named errors.
- **The route.** `POST /api/realtime/secret` runs on Node with no `runtime` export (ADR 21). The handler is
  `apps/web/src/server/realtime-handlers.ts`.
  - It reads a `Bearer` token of printable characters, at most 512 long, from `Authorization`, and never reads the body.
  - It answers `{ value, expiresAt }` with `cache-control: no-store`.
  - A refusal is a code, never upstream text: `missing-key` 401, `invalid-key` 401, `rate-limited` 429, `upstream` 502.
  - The model and voice are `ai-models.json`'s, never the request's.
  - It holds no key past its request. The API object is memoised on `globalThis` as `db.ts`'s are, so the hermetic
    source's secrets stay distinct.
- **Hermetic**, the route mints from `memoryRealtimeSecretSource`, which calls nobody. That is what lets the key-leak test
  post the real sentinel to the real route.
- **One contract.** `realtimeSecretSourceContract`, with `CONTRACT_REALTIME_KEYS`, runs against four things:
  - the memory source;
  - `openAiRealtimeSecrets` over a canned OpenAI;
  - `routeRealtimeSecrets` through the real route file and handler (`app/api/realtime-secrets.test.ts`);
  - and, by the route's binding test, the route itself.
- **Not built here** (Slice 3, or never): a rate limit on the route; the Vercel log exclusion, which Slice 3 verifies;
  the self-hosted escape.

### D170 — `realtimeTransport`: a peer seam, hooks for the key and the ledger, one reconnect
**Date:** 29 September 2026 · **Status:** accepted (agent, Phase 6 Slice 1)

- **The seam.** `RealtimePeer { offer, answer, send, onMessage, onState("open" | "dropped"), close }`, so no
  `RTCPeerConnection` type crosses it.
  - `browserRealtimePeer({ microphone, remoteAudio })` is native WebRTC, no SDK. D165 decided that: the session machine an
    SDK would save already exists.
  - Its unit test stubs the `RTCPeerConnection` constructor, so its wiring is tested. Whether real WebRTC carries it is the
    manual checklist's (Slice 3, Gate O).
- **Hooks, not ports, for the key and the ledger.** The transport is an adapter, so it can reach neither the vault nor the
  ledger. `startOralStudioRun` hands it two hooks:
  - `secret`, which mints inside the vault;
  - `usage`, which appends each billed usage as `oral-studio` under the session.

  The run's `ended` waits for those appends. A failed append is not the session's failure: the conversation happened.
- **Directives** (the plan's decision 7).
  - A new phase is `session.update` then `response.create`. A register change is `session.update` alone. `direct` returns
    at once (D118).
  - A directive sent while the line is down is applied by the reconnect's `session.update`.
  - The directive is kept as sent, and `studioInstructions` holds the phase to the scenario's own.
- **Events.** Server events are handled through a table by type, and anything else is ignored.
  - The candidate's turn is timed from `speech_started` to `speech_stopped` by the client's clock since `open`. That
    clock does not restart on a reconnect, as OpenAI's `audio_start_ms` would.
  - The examiner's turn runs from its first transcript delta to `.done`.
  - Starts are clamped so they never run backwards for one speaker.
  - Blank transcripts make no turn, and are still billed.
- **Tools** (decision 8). Every call is answered with a `function_call_output`, and a malformed one is not passed on. A
  response whose output is only function calls gets a follow-up `response.create`, so the examiner never falls silent
  after a note.
- **One reconnect.** A drop once connected delivers the examiner's words in flight. It then redials with a fresh secret and
  a new peer, sending `session.update`, then each delivered turn as a `conversation.item.create` (candidate as
  `user`/`input_text`, examiner as `assistant`/`output_text`), then `response.create`.
  - A second drop, or any failure in the redial, is `closed { failed }`, last, with `lastError` kept.
  - A close while dialling abandons the dial, so `open` never hangs.
- **Shared code.** `openai/http.ts` now holds the timed `fetch` exchange and `FetchLike`, moved out of `openai-provider.ts`
  unchanged, and the provider's tests pass over it unchanged.
- **From the pre-PR review, on this branch:**
  - **One response at a time.** A cue asked for while the examiner is mid-response, from `response.created` to
    `response.done`, waits for its end, because the API refuses a second `response.create`.
  - **Tool-only follow-ups are capped.** A run of tool-only responses gets one follow-up, never a chain that spends the
    key with nobody speaking.
  - **A response with no usage writes no ledger row**, where it had written an unpriced one.
  - **A server `error` is kept for `lastError`**, and never closes the session.
  - **The studio instructions open with a spoken register line**, not the written prompts' "You write…".

### D171 — the key-leak test learns the one route; its fake-peer half waits for the screen
**Date:** 29 September 2026 · **Status:** accepted (agent, Phase 6 Slice 1)

- **The guard's allowance is narrow.** A `POST` to this origin's `/api/realtime/secret` may carry the sentinel in its
  `authorization` header, and nowhere else.
  - That header is recorded apart, as `realtimeSecretAuthorizations()`.
  - The request's URL, its other headers and its body are still searched, and so is the route's answer, which every
    `/api/*` answer already is.
- **The spec's new step (3e)** posts the sentinel to the real route from the page and asserts:
  - a 200 whose body is exactly `{ value, expiresAt }`, with an `ek_memory_` value;
  - the one recorded authorization;
  - OpenAI's count unchanged.

  `assertNoLeak` then reads the answer.
- **What moved to Slice 2.** D165 asked for "`/v1/realtime/calls` gets the `ek_` secret" in the hermetic e2e test, with a
  fake peer. No screen exists yet to dial it, and a test-only hook in the shipped bundle is worse than waiting. So that
  half is proven in Node instead, by `container-studio.test.ts` through the real route file. It joins `key-leak.spec.ts`
  with Slice 2's screen, over an `RTCPeerConnection` stubbed by an init script, as `installFakeAudio` stubs the
  microphone.

### D172 — studio instructions are data beside the practice examiner's prompt, versioned apart
**Date:** 29 September 2026 · **Status:** accepted (agent, Phase 6 Slice 1)

- **`studioInstructions(scenario, directive)` and `STUDIO_TOOLS`** are in `packages/adapters/src/openai/prompts.ts`. They
  give §8.5 step 4's persona, spoken:
  - the target language only, no coaching, short turns;
  - repeat once when asked;
  - the phase's purpose and question lists, and the register's ask;
  - a greeting in the first phase, and a natural transition in later ones;
  - both tools named, and never mentioned to the candidate.
- **The tools' enums are domain's**, never typed there.
- **`STUDIO_PROMPT_VERSION` is "1"**, apart from `PROMPT_VERSION`, which stays at 4. The report prompt is byte-identical
  when a session has no notes, and a test holds it to that.
- Gate N may bring persona changes. Each is a version bump.

### D173 — the key copy's exception ships with the first screen that sends the key to the route
**Date:** 29 September 2026 · **Status:** accepted (agent, Phase 6 Slice 1). Moves one item of D165's Slice 3 into Slice 2

- **The problem with the order D165 planned.** Slice 2 builds the studio screen and Slice 3 amends the copy, so a Slice 2
  merged and deployed on its own would send the key to `/api/realtime/secret`. It would do so under `key.offerStays`,
  `privacy.third`, `neverKey`, `KeyOffer` and `SECURITY.md` still saying the key goes only to OpenAI. main deploys to
  production.
- **Decided.** The copy amendment, Slice 3's first bullet, moves into Slice 2.
  - It covers every absolute claim, in both languages, plus architecture.md §6.3's settings note linking the route's
    source, plus `SECURITY.md`.
  - Slice 3 keeps the self-hosted escape, the Worker and function, the log exclusion and the checklist.
- **This slice changes no copy**: no screen calls the route yet, so every claim is still true. `KeyOffer.tsx`'s comment
  says so.
- `implementation-plan.md` §7 Phase 6 is moved with this entry.

### D174 — Gate N passed: `cedar` is a credible French examiner at C level
**Date:** 30 September 2026 · **Status:** accepted (human decision); resolves Gate N, and ticks Phase 6's "examiner's French
voice" exit criterion

- **The human ran the gate as written.** In OpenAI's Realtime playground, on `gpt-realtime-2.1`, they heard `marin` and
  `cedar` hold a French C-level work interview. The instructions pasted were `studioInstructions` for phase 1 ("Mise en
  train") of the bank's work scenario `704IHNU22VKHO1H7PCJU` (procurement, band C), without the two tool lines.
- **They chose `cedar`.** `ai-models.json`'s `realtimeVoice` moves from `marin`. The server route reads it from there, so
  the minted secret names `cedar` with no code change.
- **The voice was not the problem.** The human reported two faults in how the examiner *behaved*, each its own entry: it
  cut in on a pause (D175), and it did not listen (D176). Neither is a fail of the gate, which asks whether the voice is
  credible.
- **What would reopen it:** a pilot user or an outside French reader finding the examiner's French not credible, or
  OpenAI retiring `cedar`. The agent's suggestion, not the human's.

### D175 — the examiner waits for a speaker who pauses: semantic turn detection at `low`, as data
**Date:** 30 September 2026 · **Status:** accepted (human decision, Gate N's first finding)

- **The finding.** In the playground the examiner cut in whenever the human paused mid-sentence or between sentences. A
  candidate at C level pauses to find a word, and the SLE's examiner waits.
- **What the app sent.** Slice 1's `session.update` asked for `turn_detection: { type: "semantic_vad" }` with no
  eagerness, which is the API's `auto`. The playground's default is most likely plain silence detection. Either is too
  eager for this candidate.
- **Decided: semantic VAD at `eagerness: "low"`.** The model judges whether the utterance sounds finished, and waits
  longest on silence alone.
  - The value is a tunable parameter, so it is data (principle 8): `realtimeEagerness` in `ai-models.json`, beside the
    voice, not a model, so `roleModels` leaves it out.
  - `apps/web`'s `parseRealtimeEagerness` checks it at load: one of `low`, `medium`, `high` and `auto`, or the build fails.
  - `realtimeTransport` takes an optional `turnEagerness`, and the reconnect's `session.update` carries it too. Without it
    the payload is Slice 1's.
- **Rejected:**
  - silence detection with a long timeout (about 1.5 s), which is predictable, but a long hesitation still ends the turn;
  - push-to-talk or an "I'm done" control, which never interrupts, but is less like the exam and a larger Slice 2 change.
- **Revisit when** Slice 2's live session still cuts in on a pause, or `low` makes the examiner feel sluggish. Try silence
  detection at about 1.5 s first, then an explicit end-of-turn control.

### D176 — the examiner listens: every question follows from the last answer
**Date:** 30 September 2026 · **Status:** accepted (human decision, Gate N's second finding). `PROMPT_VERSION` 4 → 5,
`STUDIO_PROMPT_VERSION` 1 → 2

- **The finding.** The examiner worked through the phase's questions whatever the candidate said. The human's example:
  asked about a project they had managed, a candidate who answers "I have never managed a project" is still asked what
  the project's biggest risk was.
- **Three causes, all in `packages/adapters/src/openai/prompts.ts`:**
  1. `REGISTER_ASK` offered the lists as a menu. Baseline was "Ask from the phase's seed questions, **or** follow on
     naturally", and escalate and deescalate asked "from the phase's harder follow-ups" and "simpler reframes".
  2. Nothing told the examiner to build on the last answer, or to drop a question whose premise the candidate had
     contradicted.
  3. The factory's scenario prompt let a follow-up presuppose an answer, as the bank's "Quels compromis *cette décision*
     impose-t-elle à votre ministère ?" does.
- **Practice mode had the same fault.** Its text examiner shares `REGISTER_ASK`, so both examiners are fixed.
- **Decided:**
  - a shared `LISTEN` instruction in both examiners: every question follows from what the candidate has just said; the
    lists show the phase's ground and level, never a script; never a question on a contradicted premise, with the
    human's example as the model's;
  - `REGISTER_ASK` rewritten so each register asks about the last answer, pitched like its list;
  - the scenario prompt asks for follow-ups and reframes that stand on their own.
- **Both versions are bumped**, since both prompts changed materially. `PROMPT_VERSION` covers every written prompt, so its
  bump makes every recorded fixture a v4 run. The human re-records before this merges (`docs/deploy.md`), and until then
  three factory tests fail on "no recorded run on prompt v5", which is the gate working.
- **A measured case (principle 8).** The live smoke gains a third examiner turn: escalate, after "Je n'ai jamais géré de
  projet". The recorded reply is the evidence a human reads, since a unit test can only check that the instruction was sent.
- **Two tests changed with the wording they pinned:**
  - the studio `it.each` baseline case, which asserted "seed questions, or follow on";
  - the practice examiner's opening test, which asserted "Ask from the phase's seed questions".

  Both asserted the defect itself. Three more changed with what the live smoke does, not bent to fit: `live-smoke.test.ts`'s
  examiner calls (2 → 3), its oral-practice calls (4 → 5) and its register list, since the smoke now makes a third,
  contradicted-premise examiner call. The review prompt's test no longer pins `PROMPT_VERSION` to 4, and a test of its own
  pins it to 5, as another pins `STUDIO_PROMPT_VERSION` to 2, so a later bump fails a test named for the version.
- **Not changed here:**
  - The committed bank's scenarios keep their presupposing follow-ups until Gate M's full-volume run regenerates them. Until
    then `LISTEN` is what stops the examiner reading one out when it does not fit.
  - `apps/factory/src/eval/oral-stability.test.ts` builds its runs on version `"4"`, and every test but seven named `"4"` as
    the shipping version too. The seven fell back to the shipping `PROMPT_VERSION`: two failed at version 5, and five that
    expect a failed report still passed, now partly for the wrong reason. With the human's yes (a candid review), all
    seven name `"4"`, as the rest of the file does, so none depends on the shipping version and what each asserts is
    unchanged. A first try, defaulting the fixture to `PROMPT_VERSION`, broke the three tests that name `"4"`, and was
    reverted.

### D177 — no CI lane could fail from Phase 0 until now, and `main` is protected
**Date:** 30 September 2026 · **Status:** accepted; the human chose to have the protection set through `gh` (this session)

- **The defect.** Both lanes of `verify.yml` ran `if ! timeout … pnpm run verify; then code=$?; …; exit "$code"; fi`.
  Inside that branch `$?` is the status of the negation, which is always 0. So a failing gate and a blown budget both
  exited 0, and the job passed. It had been that way since the workflow was written (#2, 19 September).
- **What it hid.** Found from the Actions logs of every `main` run, not assumed:
  - **the fast lane was killed at its 90 s budget** on every `main` run from Phase 3 Slice 2 (25 September) but one, and
    passed each time. The tests stopped wherever the kill landed;
  - **#54 merged with three failing tests**: the v4 recordings under `PROMPT_VERSION` 5 (D176). So `main` was red. It is
    green again here by the re-recording (session log);
  - **the medium lane's Playwright run was usually killed at 300 s**. On #54, 64 of 94 tests had run. On #49, one
    failed, and the lane passed;
  - D90's red medium lane on PR #25 was Lighthouse failing *after* the swallowed kill, not the kill itself.

  Every earlier session also ran `pnpm verify` locally and pasted the result, which is why this is not worse. The Phase 0
  exit criterion "a deliberate violation fails CI" was proved on 20 September against dependency-cruiser's exit code,
  which is not wrapped in the step, and was never rerun against a test failure.
- **The fix.** One script, `.github/scripts/within-budget.sh`, runs every lane:
  - `timeout … || code=$?`, then exits with the lane's own status;
  - the same `::error::` line when the budget kills the lane;
  - each `> palier@…` phase's offset written to the step summary, so a lane over budget says which phase took the time.

  `nightly.yml` and `retention.yml` were checked for the same shape, and both capture their status correctly.
- **Proved to bite, on three scratch branches,** deleted afterwards (session log for the runs):
  - a failing unit test fails the fast lane with exit 1;
  - a test sleeping 95 s fails it with exit 124 and the budget message;
  - a failing E2E assertion fails its shard, with the other shard green.
- **`main` was already protected**, contrary to D91's note: the two old lanes, "Fast lane (budget 90s)" and "Medium lane
  (budget 5m)", were required checks, with `strict` off and admins not enforced. Protection was never what was missing. The
  checks reported success whatever happened, so it held nothing back. The required checks are now the four lanes by their
  new names (`docs/deploy.md`), and the other settings are unchanged. From now on a red lane blocks the merge.
- **Revisit when** a lane's job is renamed or re-sharded. The protection names checks, so the PR that renames one also
  updates it.

### D178 — the medium lane is three parallel jobs, and the fast lane keeps its caches
**Date:** 30 September 2026 · **Status:** accepted (human decisions: shard the medium lane; make the fast lane faster;
then, with the numbers below, **raise the fast lane's budget from 90 s to 120 s**). `implementation-plan.md` §6.5 amended
in place

- **The medium lane** runs in three jobs, in parallel, after the fast lane. Each has its own 5-minute wall clock:
  - integration, then bundle size and Lighthouse outside the timed window as before;
  - Playwright `--shard=1/2` and `--shard=2/2`, each with its own build, browser and servers, which also retires D90's
    orphaned-server hazard.

  The `warmup` setup project runs in both shards. `pnpm verify:medium` locally is unchanged.
- **The first honest measurements** (this branch, 30 September):
  - E2E shard 1: 48 passed in 3.1 min; shard 2: 47 passed in 3.4 min, about 200 s each of the 300;
  - integration: about 50 s, as before.

  Unsharded, the E2E alone is about 3.5–4.2 minutes on a runner, which is why it was being killed.
- **The fast lane, measured by phase on the runner:**

  | Phase | Cold | Warm |
  | --- | --- | --- |
  | check-types | 13–30 s (turbo cache partly hit) | 0.4 s (14 of 14 cached) |
  | lint | 12–17 s | 2.5 s |
  | boundaries | 3–4 s | 3–4 s |
  | test | 46–56 s | 46–56 s |

  Warm, the lane is about 63 s. A change to a core package costs about 20 s of check-types, which puts the lane near 85 s.
- **What made it faster, removing no gate:**
  - **ESLint's cache is kept between runs.** `pnpm lint` already passed `--cache`, but the cache never survived a checkout,
    and the default mtime strategy misses on a fresh checkout anyway. The script now uses `--cache-strategy content`, and
    CI restores `.eslintcache`. No rule is type-aware (`eslint.config.mjs`), so a file's result depends only on its own
    text and the config, and ESLint empties the cache when either the config or its version changes. Locally: 17 s cold,
    2.8 s warm.
  - **Both caches are saved even when the lane fails**, with `actions/cache/restore` and `/save` under `if: always()`.
    `actions/cache` alone saves only after a green job, so a lane over budget could never warm the cache that would bring
    it back under.
- **Rejected:**
  - Vitest's `threads` pool: about 7% faster locally, and it changes how tests are isolated;
  - `isolate: false`, for the same reason.
- **Why 90 s could not hold.** Proof (a) of D177, a failing test in `@palier/engine` on a warm runner, took 29 s of
  check-types, because changing a core package rebuilds its dependents, and 54 s of tests, before the kill at 90 s. Most
  feature slices touch a core package. Lint was the only cut found that removes no gate.
- **The human raised the fast lane to 120 s**, as D91 did for the medium lane. That leaves about 25 s over a core-package
  change. The job is renamed "Fast lane (budget 120s)", and the required check with it.
  - **Rejected:** two parallel fast jobs, static and unit, at 90 s each. The unit job pays its own build, so it would sit
    at about 75–85 s. It would also add a required check.
- **Revisit when** a core-package change passes 105 s on the fast lane. The unit suite is 46–56 s of that, and it grows
  with every slice. The next step is then the split above, with a merged coverage report, not another raise.

### D179 — the exam runner's keys are live before its first item is painted
**Date:** 30 September 2026 · **Status:** accepted

- **Found by the first full medium run on this branch**: journey 9 (`telemetry-offline.spec.ts`) failed once under the
  whole suite at 4 workers. "1" and Enter, pressed as soon as "Item 1 of 25" showed, were both lost. It passed 10 of 10
  when run alone.
- **The cause is in the product, not the test.** `Runner` mounts with its first item already rendered, and its `keydown`
  listener on `window` was added in a passive `useEffect`, which React may run after the paint. A native listener gets
  none of the flush React gives its own events, so a key pressed in that gap does nothing. A candidate who types fast
  would lose it the same way.
- **The fix:** the listener moves to `useLayoutEffect`, which runs before the paint. The drill (`PracticeSession`) is left
  as it is: it adds its listener while still loading, long before an item exists.
- **Evidence:** the whole E2E suite three times at 4 workers, 280 passed. There is no component test in `apps/web` to
  extend; the journeys that answer by keyboard are the test.

### D180 — "could you repeat" is studio mode's alone: a user message and a cue, never a turn
**Date:** 30 September 2026 · **Status:** accepted (agent, Phase 6 Slice 2)

- **Where it lives.** `repeat()` is on the adapter's `RealtimeTransport`, on `StudioTransport` and on `OralStudioRun`. It is
  **not** on the `OralTransport` port. A turn-based examiner's question is on the screen to be played again, so the memory
  transport, the practice transport and every contract implementer are left alone.
- **What it sends.** A `conversation.item.create` user message in the session's language, then the examiner's cue through
  the one-response queue (D170). So a repeat asked mid-response waits for that response to end. The wording is
  `studioRepeatRequest(lang)` in `prompts.ts`.
- **What it is not.** The candidate did not say it, so it is not a turn:
  - it enters neither the transcript nor a reconnect's seed;
  - while the line is down it does nothing, since a request made during a reconnect has nothing to follow;
  - once closed it does nothing.
- **`STUDIO_PROMPT_VERSION` stays at 2.** The plan said to bump it. The instructions already told the examiner to repeat or
  rephrase once, without comment, and they did not change. The version covers the instructions, so a bump would say they
  had.
- **The screen** makes the control single-flight, and disables it until the call is open and once the end is asked for.

### D181 — a session carries the mode it was held in, and a run says its phase
**Date:** 30 September 2026 · **Status:** accepted (agent, Phase 6 Slice 2). Amends D116's `OralSessionRun`

- **`OralSession.mode?: "practice" | "studio"`**, from domain's `ORAL_MODES`.
  - `startOralStudioRun` stamps `studio` through the driver's request.
  - Absent is practice, which covers every row stored before it.
  - It matters after the session because a studio recording runs on the session's clock and a practice one does not
    (D187).
- **Where it lives.** The plan put the field in a domain schema. There is none: `OralSession` is `@palier/app`'s persisted
  aggregate, checked by hand at the Dexie edge (D115). So the vocabulary is in domain, the field is on the port's type, and
  the Dexie reader keeps a known mode and reads anything else as none. The field is not indexed, so there is no version
  bump.
- **`OralSessionRun.phase()`** reads the machine's current phase. Studio mode's indicator has no question to read one
  from. Practice does not use it.
- **The plan's other names.** `held` on the screen's steps follows the same rule as `mode` on the session: it is said only
  for studio, so every existing step keeps its shape.

### D182 — a studio conversation's cost is its own line, and the meter reads it every tick
**Date:** 30 September 2026 · **Status:** accepted (agent, Phase 6 Slice 2). Amends D125

- **The gap.** `oralReport` counted `oral-practice` and `oral-assessment` rows only. A studio session's report would have
  shown its conversation as free.
- **The fix.** `OralSessionCost` gains `studio` beside `practice` and `report`, all from the session's own rows. The
  report's first line is the conversation for a studio session and the session for a practice one.
- **`oralSessionCost({ sessionId })`** is the same reading on its own, for the running meter. The studio controller reads
  it at each one-second tick. Ledger rows arrive as each `response.done` and transcription is priced, through Slice 1's
  `usage` hook.
- **The meter's words** say "about" when every call was priced and "at least" when one was not (D103), and "nothing counted
  yet" before the first row.

### D183 — the studio recording is the microphone, whole, from the tap
**Date:** 30 September 2026 · **Status:** accepted (human decision: the microphone only; the rest, agent)

- **The microphone only** (architecture.md §8.5 step 8). The human chose it over mixing in the examiner's voice. It keeps
  the recording fit for Gate J's opt-in, which must upload only the candidate's voice.
- **Whole and never paused** (`recordWhole`), so a turn's `startMs` is a place in it (D187).
- **When it starts.** At the tap, before the dial. The transport's clock starts when it opens, a moment after, so the
  recording leads the session's clock by the time the scenario lookup and the first store write take. That is tens of
  milliseconds, inside D187's lead. Starting it once connected would have lagged the clock by the whole dial, which is
  seconds (D189).
- **A start that fails keeps no recording**, since there was no conversation to replay. A recorder that cannot start leaves
  the conversation running with no recording, as practice does.

### D184 — the voice form is a `@palier/ui` primitive that the reduced-motion switch cannot reach, so it is told
**Date:** 30 September 2026 · **Status:** accepted (agent, Phase 6 Slice 2)

- **`VoiceForm`** has two decorative, `aria-hidden` layers, the outer the examiner's and the inner the candidate's.
  - The levels are the practice check's own analyser (`browserLevelKit`), on the microphone and on the remote stream once
    it arrives, reopened if a reconnect brings a new stream.
  - They are written to two custom properties from a `requestAnimationFrame` loop, eased, `transform` only (D160). They
    never go through React state, so the screen does not re-render at the frame rate.
- **Why `still` is a prop.** D160's one switch turns off CSS animations and transitions. A frame loop is neither, so the
  switch cannot reach it. The screen reads `prefers-reduced-motion` and passes `still`, and a still form runs no loop at
  all.
- **Status in words.** The form carries no meaning a reader could miss: a status line says whether the call is dialling,
  open or ending.

### D185 — the studio screen's calls: one island, two controllers, one end card
**Date:** 30 September 2026 · **Status:** accepted (agent, Phase 6 Slice 2)

- **The mode choice** is a radio pair above the sessions. Practice is the default, each mode shows its cost a minute, and
  each session card is priced in the chosen mode. The picker's callout says what each mode sends where.
- **Studio needs the microphone.**
  - A refused, missing or failing microphone shows why, and offers "Practise by typing instead".
  - That choice is priced and run as practice, never as studio.
- **Two controllers, one island.**
  - The practice controller keeps the check and the pre-flight. At the tap it **hands the microphone over** (`handOver`)
    to `studio-controller.ts`, which owns it from then on and stops it at the end.
  - The studio controller dispatches its own small reducer (`studio-view.ts`), and hands the ended session to the practice
    reducer's `ended`. So the end card, the transcript, the report link and "Practise again" are one code path.
  - `time-cap` gains its own sentence there, as D166 promised.
- **The peer comes from the container** (`realtimePeer`). Importing `browserRealtimePeer` into the island would pull
  `@palier/adapters/openai` into the island's chunk, and the container is loaded lazily so the adapters are not (D59).
- **The examiner's voice** plays in an `Audio` element made by the controller, outside the layout, with `autoplay`; the tap
  is the gesture.
- **A failure is named only when the connection failed** (`transport-failed`). The transport keeps a server `error`
  without ending (D170), so a session the candidate ended is never reported as failed because of one.
- **The large end control** is `app-studio-end`: the ordinary button, taller and wider, as PRD §8.6 asks.
- **From the pre-PR review (candid-review, on this branch):**
  - **End, or leaving the page, while the call is still dialling cancels the dial.** `startOralStudioRun` takes an
    `AbortSignal` that closes the transport, and the transport already abandons a pending dial cleanly. Before this, nothing
    could reach the transport until it opened, up to about 25 s: the microphone went on recording, and a first response
    could be billed with no ledger row. An end the candidate asked for is never named as a failure.
  - **Neither control is disabled under the focus that pressed it**, which dropped a keyboard user's focus to the page.
    Repeat is single-flight in the controller. End says it is under way with `aria-disabled` and ignores a second press.
  - **The end card's recording sentence has a studio version** (`recordingKeptStudio`): a studio recording is the
    microphone for the whole conversation, not "your answers". `key.whereNever` no longer quotes "only OpenAI", which the
    amended `whereStored` stopped saying.

### D186 — the key copy's exception, as shipped
**Date:** 30 September 2026 · **Status:** accepted (agent, Phase 6 Slice 2). Carries out D173

- **Changed, in both languages.**
  - `key.offerStays`: onboarding's offer.
  - `key.whereStored` and `key.whereNever`: the key settings' own statement, which said "sent only to OpenAI" and "never
    sent to Palier's server". Neither was on D173's list; both were absolute.
  - `privacy.third`.
  - `oral.studioMode` and `oral.sendsToStudio`: the picker's callout and the pre-flight say it where the key is about to
    go.
- **Added.** A card on `/settings/key`, "The one exception: studio mode" (architecture.md §6.3's "prominent note"). It says
  why the route exists and what it does and does not do, and links the route's source.
  - The link is `lib/report.ts`'s `REALTIME_ROUTE_SOURCE_URL`, on `main`, and a test holds its path to a file that exists.
  - **It resolves once the repository is public (Gate M).** Until then it is a 404 for anyone but the owner.
- **Unchanged, and why.**
  - `sync.neverKey` ("Your OpenAI API key"), in the never-synced list and in `/privacy`'s "what Palier never holds". Both
    stay true: the key is never synced or kept.
  - Each feature's own `sendsTo`. Each is about its own feature, and none of them sends the key to our route.
- **Also changed:** `KeyOffer`'s comment, `SECURITY.md` ("one exception, and only one", what the route does and never does),
  and architecture.md §6.3's note.
- **One test changed with the claim it pinned.** `e2e/key.spec.ts`'s step 5 asserted the offer read "sent only to OpenAI",
  which is the absolute claim D173 required this pull request to remove. It now asserts the offer names the exception. Found
  by the medium lane, not bent to fit: what it checks, that the offer states where the key goes, is unchanged.

### D187 — synced playback: each spoken answer from where it starts, in the recording's card
**Date:** 30 September 2026 · **Status:** accepted (agent, Phase 6 Slice 2)

- **Where.** In the report's recording card, beside the player: each of the candidate's spoken answers, with "Play from
  here". The transcript with its errors is shown only once a report exists, and the recording should play before one is
  asked for, so the card holds both the player and its places.
- **The places.** `playbackMarks(session)` seeks to each spoken answer's `startMs` less 300 ms (`PLAY_LEAD_MS`), so the
  first syllable is not cut and D183's small lead is covered.
  - The examiner's turns have none, since the recording is the microphone only.
  - Typed answers have none.
- **Practice sessions have none.** Their recording is paused between answers, so its places are not the turns'. Synced
  playback for practice mode is *named, not scheduled*.

### D188 — the hermetic studio journey dials over a stubbed `RTCPeerConnection`, and the guard sorts the dial apart
**Date:** 30 September 2026 · **Status:** accepted (agent, Phase 6 Slice 2). Amends implementation-plan.md §7's "a
hermetic journey over a memory transport"

- **The fake**, as *Next, decided* specified: `installFakeRealtime` is an init script beside `installFakeAudio`.
  - Its `RTCPeerConnection` opens a data channel once the answer is set, and gives an oscillator's stream as the
    examiner's voice.
  - Each `response.create` gets a whole response with usage, so the ledger and the meter are real.
  - A user message before it makes that response the repeat.
  - The candidate answers once, heard with `TRANSCRIPT_SENTINEL`.
  - Everything the page sends is kept on `window.__palierRealtimeSent`.

  The hermetic graph keeps the real transport, the real secret route and the real dial, with no test code in the bundle.
  A memory transport would have skipped exactly the part the key-leak test must see.
- **`stubOpenAi`** answers `/v1/realtime/calls` with SDP.
- **The guard** files the calls endpoint's `authorization` as `realtimeCallAuthorizations()`, apart from
  `openAiAuthorizations()`, which remain the key's own uses. Every earlier count holds.
- **Key-leak step 3f.** A studio session from the screen:
  - the route's authorization is the key once more;
  - the one dial carries an `ek_memory_` secret;
  - no other call spends the key;
  - the conversation's recording, the page's fourth recorder, reaches no request.
- **Proved to bite:** with `repeat` disabled in the controller, the studio journey fails at the repeat (session log).

### D189 — the live measurement: tap to first word is measured and not yet met, and the conversation's cost is the human's
**Date:** 30 September 2026 · **Status:** accepted (human decision: the agent measures by script on the smoke key, the human
then holds one real session); the figures are the agent's

- **The instrument.** `e2e/studio-live.spec.ts`, the `live` Playwright project, exists only with `PALIER_LIVE=1` and runs
  in no lane.
  - It runs the production build on the capped `OPENAI_SMOKE_KEY`, loaded from `.env.local` in a subshell.
  - It times the tap on "Start the session" to the first moment the examiner's voice crosses a level on the remote track,
    through an analyser, and each step of the dial between.
  - It then holds a two-minute conversation whose microphone plays French answers synthesised by `tts-1`, summing every
    `response.done` usage off the data channel.
- **Tap to first word (exit criterion 1): measured, not met.** Twelve dials over four runs, headless Chromium on a local
  production server over a home connection, in ms:

  | Run | Dial 1 (first on a fresh server) | Dial 2 | Dial 3 |
  | --- | --- | --- | --- |
  | 1 | 3,518 | 2,765 | 3,582 |
  | 2 | 3,169 | 2,022 | 2,005 |
  | 3 | 2,503 | 2,467 | 2,009 |
  | 4 | 2,673 | 2,032 | 1,635 |

  - The median is about 2.49 s, so about half the dials are over 2.5 s.
  - The steps, from a warm run: the secret back at about 340 ms, the SDP answer at about 640 ms, the channel open at about
    1.05 s, `response.created` at about 1.23 s, the first transcript delta at about 1.70 s, and the voice at about 1.9 s.
  - The first dial on a fresh server spent about 470–930 ms on the secret against about 330–380 ms warm. A cold Vercel
    function would add more, so the deployed figure may be worse.
  - The criterion is not ticked. Making it pass is in *Next, decided*.
- **The conversation's cost: not measured.** In every run the server heard the synthetic answer begin
  (`input_audio_buffer.speech_started`) and never heard it end: no `speech_stopped` and no transcription in two minutes, so
  the examiner never replied. The diagnostics ruled out the page's own instruments: the answer played once, the examiner's
  channel went quiet, and no error was raised.
  - **What caused it is not known.** It is either the synthetic microphone (a Web Audio destination) or semantic turn
    detection at D175's `low` eagerness never closing a turn.
  - **The second would be a product defect**, and the worst kind for this feature: a candidate who finishes speaking and
    is never answered.
  - So the human's live session must check it first. D175's *revisit when* names the fallback already, silence detection
    at about 1.5 s.
  - The spec reports that half as an annotation rather than failing on it.
- **`pricing.json` keeps D167's provisional figures.** Principle 8 wants a measured session, and none was measured. The one
  usable reading is from run 4's greeting: 832 of the response's 952 text input tokens were already cached on the second
  dial, which supports D167's heavy cached-input share.
- **Spend.** Four runs, each three short dials, one two-minute session and five `tts-1` answers: about US$0.50 on the smoke
  key.

---

## Session log

Newest first. One entry per session that changed something. Never edit an older entry.

### 30 September 2026 — `dougkeefe/raleigh-v3` (Oral practice in the main navigation, human request)

- **The header gains "Oral practice" / "Pratique orale"**, between Review and Progress, linking `/practice/oral`, at the
  human's request. Until now spoken practice was reached from home's actions card only.
- **The header now wraps** (`flex-wrap` on the header and its nav) rather than overflowing: five links, the sync status and
  the language toggle no longer fit one line on a phone. Checked at 320 px in French, the longest labels: no horizontal
  overflow, and the link lands on the spoken-practice page (screenshots in the session, not committed).
- The label is the human's words. The page's own title stays "Spoken practice".

```
pnpm verify                → 247 files, 3786 passed, 8 todo; exit 0
CI=1 pnpm verify:medium    → integration 51 passed; Playwright 99 passed (1.6m); exit 0
node apps/web/scripts/check-bundle-size.mjs → 166.1 KB of 180.0 KB
```

### 30 September 2026 — `dougkeefe/raleigh-v3` (Phase 6 Slice 2: the studio screen, on the key; D180–D189)

Opened to *Next, decided*'s Phase 6 Slice 2, after #55 merged. The plan was approved with two human decisions: the studio
recording holds **the microphone only** (D183), and the live checks are **shared**, the agent by script on the smoke key and
then the human on the real screen (D189).
- **The core** (D180–D182):
  - `repeat()` on the realtime transport and the studio run, studio only;
  - `OralSessionRun.phase()`;
  - `OralSession.mode`, stamped `studio`;
  - `oralSessionCost` with a studio line, closing a gap where a studio session's report would have read its conversation as
    free.
- **The screen** (D183–D185): the mode choice with each mode's cost a minute, studio's pre-flight, and `studio-controller.ts`
  (the microphone handed over, recorded whole from the tap, the Web Lock, the phase and the meter each tick). Then
  `OralStudio` with `@palier/ui`'s new `VoiceForm`, still under reduced motion, and the practice end card with `time-cap`'s
  own sentence.
- **The copy's exception** (D186), in both languages:
  - the onboarding offer, the key settings' statement, a new "one exception" card linking the route's source, and
    `/privacy`;
  - `SECURITY.md` and architecture.md §6.3.
  - One test pinned the old claim and changed with it (D186).
- **Synced playback** (D187): the report's recording card plays a studio recording from each spoken answer.
- **Tests** (D188):
  - `installFakeRealtime` stubs `RTCPeerConnection` with a scripted examiner, and five new journeys in `oral.spec.ts`
    cover every studio state axe-clean, reduced motion, no microphone, a refused dial, and French.
  - Key-leak step 3f: the dial carries only an `ek_memory_` secret, and the conversation's recording reaches no request.
  - **Proved to bite:** with the controller's `repeat` disabled, the studio journey failed at the repeat poll ("expected 1,
    received 0"), and passed again restored.
- **Live, on the smoke key** (D189), four runs, about US$0.50:
  - tap to first word: 3518, 2765, 3582 · 3169, 2022, 2005 · 2503, 2467, 2009 · 2673, 2032, 1635 ms, median about 2.49 s.
    **Not ticked.**
  - The synthetic candidate's turn was heard to begin and never to end, so the conversation's cost was not measured, and
    `pricing.json` is unchanged.

*Next, decided* is rewritten: the human's live session comes first, then the dial under 2.5 s, then Slice 3. **Evidence:**

```
pnpm verify                → check-types, lint, boundaries (no dependency violations) pass;
                             test: 247 files, 3786 passed, 8 todo; exit 0
CI=1 pnpm verify:medium    → integration: 7 files, 51 passed; Playwright: 98 passed, 1 failed (key.spec step 5,
                             the pinned "sent only to OpenAI", D186)
CI=1 pnpm verify:medium (after the fix) → integration: 7 files, 51 passed; Playwright: 99 passed (1.8m); exit 0
node apps/web/scripts/check-bundle-size.mjs → shared first-load JS 166.1 KB of 180.0 KB, within budget
PALIER_LIVE=1 playwright test --project=live (×4) → connects as above; conversation: speech_started 1, speech_stopped 0
```

### 30 September 2026 — `dougkeefe/next-dev-slice` (CI that can fail, and `main` green again; D177–D179)

The session opened to *Next, decided*'s "re-record, then Phase 6 Slice 2". #54 had already merged without the
re-recording, and its checks were green while its log showed three failing tests. That led to D177.
- **`main` is green again.** The fixtures are re-recorded on `PROMPT_VERSION` 5, on the capped smoke key, loaded from
  `.env.local` in a subshell, so no key entered a transcript or a file (`grep sk-` over the fixtures: 0).
  - The live smoke recorded 16 completions, all accepted first time.
  - The stability recording scored five reports out of five, for US$0.12.
  - Conformance on v5 is **1.000**, and oral stability **passed** (task spread 1, agreement 0.80; every other criterion
    spread 0).
  - **D176 heard in text:** after "Je n'ai jamais géré de projet ; je travaille surtout sur des dossiers de politique",
    the examiner asked "Dans un dossier de politique, comment réorganiseriez-vous le travail si l'échéance était réduite de
    moitié?". It builds on the answer and does not ask about a project.
  - `pricing.json`'s `writing-feedback` (out 1813 → 1695) and `item-generation` (draft out 4482 → 3413; review 1680/3775 →
    1640/2045) take the measured counts.
- **CI can fail** (D177). `.github/scripts/within-budget.sh` runs every lane with `|| code=$?`. The proofs, each red for the
  stated reason:
  - (a) a failing unit test: [run 36720073858](https://github.com/dougkeefe/palier/actions/runs/36720073858), "Test Files 1
    failed | 245 passed", exit 1;
  - (b) a 95 s test: [run 36714317602](https://github.com/dougkeefe/palier/actions/runs/36714317602), the budget message,
    exit 124;
  - (c) a failing E2E assertion: [run 36714320153](https://github.com/dougkeefe/palier/actions/runs/36714320153), shard 1/2
    red on `ci-bites.spec.ts`, shard 2/2 green.

  (a) was pushed to this branch and reverted, so it ran with warm caches; (b) and (c) ran on scratch branches, now deleted.
  An earlier try at (a), at the 90 s budget, found the failing test and was still killed by the budget first. That
  measurement is what took the budget to the human.
- **The medium lane is three jobs** (D178): integration 36 s, E2E shard 1 48 passed in 3.1 min, shard 2 47 passed in 3.4
  min ([run 36715672260](https://github.com/dougkeefe/palier/actions/runs/36715672260)).
- **The fast lane**, with the ESLint cache kept and both caches saved on failure, is about 63 s warm. **The human raised its
  budget to 120 s** (D178), because a core-package change measured about 92 s.
- **A flake found and fixed in the product** (D179). Journey 9 lost the first keys pressed as the exam's first item appeared.
  The runner's listener now goes on in a layout effect.
- **Branch protection on `main`** already required the two old lanes, which passed whatever happened. It now requires the
  four lanes by name (`docs/deploy.md`), set once this branch's lanes were green, so this is the first PR it truly gates.

*Next, decided* is **Phase 6 Slice 2**, with its scope unchanged. **Evidence:**

```
pnpm verify                → check-types, lint, boundaries (no dependency violations) pass;
                             test: 245 files, 3706 passed, 8 todo; exit 0
CI=1 pnpm verify:medium    → integration: 7 files, 51 passed; Playwright: 93 passed, 1 failed (journey 9, before D179)
CI=1 pnpm run test:e2e --repeat-each=3 --workers=4 (after D179) → 280 passed (3.6m)
CI=1 pnpm verify:medium (final tree) → integration: 7 files, 51 passed; Playwright: 94 passed (1.5m)
node apps/factory/dist/index.js eval → schema conformance on prompt v5: 1.000; oral stability over 5 call(s): passed
```

### 30 September 2026 — `dougkeefe/confirm-gate-n` (Gate N passed, and its two findings fixed; D174–D176)

**Gate N passed on `cedar`** (D174, human), and the human reported two faults in the examiner's behaviour, both fixed here.
- **The voice.** `realtimeVoice` is `cedar`.
- **It waits** (D175). `realtimeEagerness: "low"` in `ai-models.json`, checked at load by `parseRealtimeEagerness`, is
  handed to `realtimeTransport` as `turnEagerness`. Every `session.update` asks for it, the reconnect's included.
- **It listens** (D176). Both examiners get a shared `LISTEN` instruction, `REGISTER_ASK` asks about the last answer rather
  than down a list, and the scenario prompt asks for follow-ups that presuppose nothing. `PROMPT_VERSION` is 5 and
  `STUDIO_PROMPT_VERSION` is 2. The live smoke gains a contradicted-premise examiner turn, whose recorded reply is the
  evidence.
- **Five test expectations changed**, each named in D176: two pinned the defect, three counted the smoke's calls. Every new
  branch has its own named test. A candid review then moved the version pins into tests of their own, put the eagerness
  values in one place in the adapter, and made every `oral-stability.test.ts` case name its shipping version (human's yes).
- `implementation-plan.md` §7 Phase 6 is noted, and `packages/adapters/CLAUDE.md` and `apps/web/CLAUDE.md` are updated.

**Not mergeable yet.** `PROMPT_VERSION` 5 needs the human's re-recording (*Next, decided*). Until then three factory tests
fail, each on the version alone, because they read the committed recordings ("no recorded run on prompt v5"):
`committed-eval`, `loadRecordedRuns`, and `cli.test`'s eval run.

*Next, decided* is the re-recording, then **Phase 6 Slice 2**. **Evidence:**

```
pnpm verify                → check-types, lint, boundaries (484 + 312 modules, no dependency violations) pass;
                             test: 245 files, 3702 passed, 3 failed, 8 todo; exit 1, the three above only
                             (after the candid review's fixes)
pnpm run build             → exit 0
CI=1 pnpm verify:medium    → integration: 7 files, 51 passed; Playwright: 94 passed (1.6m)
```

### 29 September 2026 — `dougkeefe/next-slice-from-progress-v4` (Phase 6 Slice 1, the realtime session core; D166–D173)

**Phase 6 Slice 1 is built**: everything below studio mode's screen.
- **Data.** `oral-studio` in `AI_FEATURES`. `realtime` (`gpt-realtime-2.1`) and `realtimeVoice` (`marin`) in
  `ai-models.json`. Realtime prices from OpenAI's pricing page, read today, with a provisional per-minute estimate and
  `studioMaxMinutes: 25`, in `pricing.json`. The nightly smoke now checks the realtime id is listed.
- **Ports.** A `note` transport event, kept on the session and quoted by `assessOral`. The engine's `time-cap` end
  reason. `RealtimeSecretSource`, and `startOralStudioRun`.
- **The route.** `POST /api/realtime/secret`, the one route that sees the key, with a test per branch. It is served
  from memory in the hermetic lane.
- **The transport.** `realtimeTransport` over a peer seam, with `browserRealtimePeer` on native WebRTC. Client-driven
  phases, both tools, usage priced, one reconnect with the transcript seeded, then `closed{failed}`, and its own cap timer.
- **Wiring.** `startOralStudio` in the composition root. No screen calls it yet.
- **Exit criterion 2 at the port level** is met by `container-studio.test.ts`, in both graphs, through the real route file:
  - the key reaches this origin only in `Authorization`;
  - `/v1/realtime/calls` sees only `ek_` secrets;
  - one drop reconnects with the transcript seeded;
  - a second drop stores the session `transport-failed`, with all three turns and the note kept.

  The criterion itself stays unticked until a real disconnection is tried (Gate O's checklist).
- **The key-leak guard allows the sentinel only in the route's `authorization` header** (D171). Proven to bite, on scratch
  edits reverted before commit: the sentinel in `Authorization` to `/api/telemetry` failed the guard (`request headers
  …/api/telemetry`), and the sentinel in the realtime route's *body* failed it (`request body …/api/realtime/secret`).
- **Decided along the way:**
  - D166, the cap;
  - D167, the realtime price kind;
  - D168, the note shape;
  - D169, the secret's port and route;
  - D170, the transport;
  - D171, the fake-peer half of the key-leak test moves to Slice 2;
  - D172, the studio instructions as data;
  - **D173, the key copy's exception moves into Slice 2**, so no deploy sends the key to the route under copy that says
    it never leaves for anywhere but OpenAI.
- **A pre-PR review found five transport and prompt gaps, all fixed with tests** (D170's last bullet): the tool-only loop,
  a phase cue lost during an active response, unpriced rows for usage-less responses, server errors dropped, and a
  "You write" register for a spoken examiner.
- The stale "after 1.0 (D131)" comments are corrected. `implementation-plan.md` §3.3 and §7 Phase 6 are amended. The six
  package `CLAUDE.md` files and `docs/deploy.md`'s smoke checks are updated.

*Next, decided* is **Gate N** (human), then **Phase 6 Slice 2**. Slice 1 is `[~]` until it merges. **Evidence:**

```
pnpm verify                → check-types, lint, boundaries (484 + 312 modules, no dependency violations),
                             test: 245 files, 3690 passed, 8 todo; coverage thresholds met; exit 0 (after the review fixes)
pnpm run build             → @palier/web rebuilt after the review fixes
CI=1 pnpm verify:medium    → integration: 7 files, 51 passed; Playwright: 94 passed (1.4m); exit 0 (before and after the fixes)
pnpm --filter @palier/web bundle-size → shared first-load JS 166.1 KB of 180.0 KB, within budget
pnpm --filter @palier/web lighthouse  → assertions checked against 19 URLs, 95 runs; exit 0
```

### 29 September 2026 — `dougkeefe/fix-language-toggle-crash` (studio mode into 1.0, D165; documents only)

**The human brought studio mode back into 1.0** (D165), and asked for the documents to be ready for a separate worktree to
build it.
- **What decided it:** OpenAI's Realtime API documents, read today. D131's blockers were the Live API's.
- **What changed:** Phase 6 is planned as three slices and Gates N and O, with two exit criteria added. `implementation-plan.md`
  §7 mirrors it. Every in-place note D131 left is reversed, each naming D165.
- **What's next:** *Next, decided* is **Phase 6 Slice 1**, with Gate N beside it.

No code changed and nothing is ticked. **Evidence:**

```
pnpm verify                → check-types, lint, boundaries (467 + 304 modules, no violations),
                             test: 234 files, 3485 passed, 8 todo; coverage thresholds met; exit 0
```

### 29 September 2026 — `dougkeefe/fix-language-toggle-crash` (Gate L passed, D164)

**Gate L passed** (human): all three reads found no issue. Recorded as D164.
- **Ticked:** Gate L, the accessibility audit, the French review, Phase 7 exit criterion 2, and Slices 3 and 4, which merged
  (#47, #51).
- Exit criterion 1 stays open until Gate M.
- The Slice 3 "for the human" item to read `/about` and `/privacy` is removed, because Gate L's French review covered it.

*Next, decided* is **Gate M**, the human's. The evidence is the human's word in this session. No command was run for it.

### 29 September 2026 — `dougkeefe/fix-language-toggle-crash` (a defect: the language toggle, D163)

**The defect**, reported by the human: every click on "Français" / "English" rendered the global error page, and a reload
recovered. It was reproduced on `next start` and traced to a Trusted Types refusal when the root layout remounts
(D163). **Fixed** in `LanguageToggle`: `onNavigate` cancels the router's navigation, and `location.assign` loads the
page. It is still next-intl's `Link`, so the locale cookie is still written. The policy is unchanged.

- A new production-lane test in `csp-production.spec.ts`: red before the fix (the global-error title on the page), green
  after, 3/3 with `--repeat-each 3`. Its cookie assertion failed against a plain-`<a>` variant, with the worker in control.
- The rule is in `apps/web/CLAUDE.md`. The merged Slice 4 row (#51) is retired from *In flight*.

*Next, decided* is still **Gate L**, and this merges ahead of it.

**Evidence:**

```
pnpm verify                → check-types, lint, boundaries (467 + 304 modules, no violations),
                             test: 234 files, 3485 passed, 8 todo; coverage thresholds met; exit 0
CI=1 pnpm verify:medium    → integration 7 files, 51 passed; Playwright 94 passed (1.7m); exit 0
```

### 29 September 2026 — `dougkeefe/smoke-key-next-slice` (Phase 7 Slice 4, D159–D162; the smoke key's first run)

**The smoke key.** The human set `OPENAI_SMOKE_KEY` (`gh secret list`: set 2026-09-29T21:00Z). The nightly was dispatched on
`main` by hand (run 36631552668), and **the live smoke ran on a real key for the first time and passed**:
15 completions, all accepted on the first try; writing feedback US$0.029, item generation US$0.140, oral practice US$0.004,
oral assessment US$0.021, about US$0.19 in all. Every configured model id is still listed. The item is struck under *Also
for the human*.

**Built** (Gate K's Slice 4, D145):
- **The streak with its silent freeze** (D159):
  - `localDay`, `streak` and `milestonesReached` in the engine;
  - `streakReport`, `noteStreakFreeze`, `milestones` and `markMilestoneShown` in the app;
  - the streak on today's plan, with "We kept your streak" said once, through a synced setting.
- **The four milestone moments** (D159): full screen on home only, with Coco cheering, and a text-only share (Web Share, else
  the clipboard).
- **Motion** (D160): three duration tokens, the band meter's entrance fill, one switch for reduced motion and exam mode,
  `StreakFlame`, `Mascot`'s `cheer` pose and `Dialog`'s `full` placement.
- **Self-hosted fonts** (D161): Inter, Figtree and Source Serif 4, committed with their hashes and licences, and the service
  worker follows stylesheets to them.
- **The library** (D162): ten written-expression articles as structured JSON, not MDX, at `/library` and
  `/library/[subSkill]`, with cited French marked for its `lang`, linked from every writing explanation, precached by name.
- `/privacy` now says the server holds which milestones and streak notes were shown.
- One journey changed (`key-leak.spec.ts`): it now closes the first-oral moment its spoken session earns (D159).

Nothing is ticked `[x]`: Slice 4 is `[~]` until this merges. *Next, decided* is **Gate L**, the human's three reviews.

**Evidence:**

```
pnpm verify                → check-types, lint, boundaries (467 + 304 modules, no violations),
                             test: 234 files, 3485 passed, 8 todo; coverage thresholds met; exit 0
CI=1 pnpm verify:medium    → integration 7 files, 51 passed; Playwright 93 passed (1.4m); exit 0
  (first run: 1 failed, key-leak.spec.ts, the milestone moment covering the next click; the journey now closes it)
pnpm --filter @palier/web bundle-size  → shared first-load JS 166.1 KB of 180.0 KB
pnpm --filter @palier/web lighthouse   → 19 URLs, 95 runs, assertions pass; lowest medians perf 0.99, a11y 1.0;
                                         /en/library and /fr/library/agreement 1.0 and 1.0
gh workflow run nightly.yml --ref main (run 36631552668) → live smoke: success, 15 completions, 15 accepted first try
engine engagement.ts                   → 100% statements, branches, functions and lines
app use-cases/engagement.ts            → 100% branches; domain library*.ts → 100% branches
proven to bite:
  streak `spent > freezesPerMonth`     → "never freezes more than the allowance…" failed after 5 runs
  a 300ms transition and an opacity keyframe in components.css → motion.test.ts: 2 failed
  worker without staticAssetsInCss     → offline spec: no Source Serif woff2 in the cache (1 failed)
  content/library/pronouns.json removed → library-content.test.ts: 4 failed
```

### 29 September 2026 — `dougkeefe/dependabot-cleanup-slice` (cleanup slice, D154–D158)

**Asked for by the human** before Phase 7 Slice 4: clear what was lingering.

**Changed:**
- **The Dependabot queue is empty** (D155):
  - #41 (the minor-and-patch group) and #40 (`github-script` v9) merged;
  - #42 (`@types/node` 26) closed;
  - #44 (TypeScript 6) closed and superseded here (D154);
  - #43 (`jsdom` 30) merged green, and `.nvmrc` moved to 22.23.3 for it. `pnpm verify` passed again after merging it in:
    220 files, 3369 passed.
- **Dependabot alerts:** five fixed by scoped `pnpm` overrides, and the two `extract-zip` alerts dismissed as tolerable risk.
  They close on GitHub when this merges.
- **The nightly lane's two causes are fixed:**
  - the lane-wide timeout (D156);
  - a real sync data-loss bug in `requestPairCode`, which three simulator seeds found (D157, now regression seeds).

  Its five duplicate issues (#24, #29, #33, #36, #46) close with this PR, and a later failure comments instead of opening
  another.
- **Journey 4's flake was the test.** A client-side `Link` click resolves when the click is sent, not when the navigation
  commits. Under parallel load, the "Review" click overtook the pending navigation to "Today", which made it a navigation to
  the page already on screen. The review screen never remounted and kept the "Nothing due" it read two days earlier.

  An instrumented copy showed it in every failure: no `pushState` to `/en/home`, the original heading node still mounted,
  and IndexedDB holding six rows due 25 September under a page clock of 26 September. The data and the clock were right
  every time. The test now waits for Today's "Review queue" heading.

  That a mounted review screen doesn't re-read the queue when the day changes is named, not built.
- **Bookkeeping:**
  - the header and status row say Slice 3 (#47) and the relicense (#48) merged;
  - the scaffolding checklist names ADR 23's licences;
  - the done human items are struck: private vulnerability reporting enabled (confirmed through the API), and Dependabot
    watched.
  - This entry's first draft also struck the smoke key as set, because the 28 and 29 September live-smoke jobs read
    "success". They had skipped: a skip reports success. The key is not set, and the item is back under *Also for the
    human*.
- **Branches (human: "clean up merged branches, yes").**
  - 35 merged `dougkeefe/*` branches were deleted from origin. Each one's tip was first checked to equal its PR's merged
    head.
  - "Automatically delete head branches" is now on.
  - `dougkeefe/next-progress-slice-v1` failed the check: its tip was one commit past #28's head. That commit is a
    production fix that never merged, now recovered as D158. The branch is kept until this PR merges.

*Next, decided* is unchanged: Phase 7 Slice 4.

**Evidence:**

```
pnpm verify                → check-types, lint, boundaries (456 + 274 modules, no violations),
                             test: 220 files, 3369 passed, 8 todo; coverage thresholds met; exit 0
CI=1 pnpm verify:medium    → integration 7 files, 51 passed; Playwright 84 passed (1.4m); exit 0
pnpm --filter @palier/web bundle-size  → shared first-load JS 166.1 KB of 180.0 KB
pnpm --filter @palier/web lighthouse   → 17 URLs, 85 runs, assertions pass; exit 0
pnpm audit (whole tree)    → 4 high (2 ignored: the `content` false positives, D135) = extract-zip ×2 only
PALIER_INTEGRATION=1 PALIER_SIM_SEEDS=5000 vitest run --project integration-testing → 1 passed (138 s)
CI_LANE=nightly vitest run trend-calculator.property + weakest-sub-skills.property   → 4 passed
  … with testTimeout set to 1 ms                     → "Test timed out in 1ms" (the setting reaches the projects)
journey 4, --repeat-each=10 before                   → 6 failed, 4 passed
journey 4, --repeat-each=20; --repeat-each=30 --workers=8 after → 20 passed; 30 passed
D157 fix reverted → regression seeds 54693, 72951, 91998 fail (run.test.ts: 3 failed, 39 passed)
pnpm verify (with D158)    → 221 files, 3377 passed, 8 todo; exit 0
key-states-production.spec.ts --project=offline → 1 passed; with main's openai/errors.ts built → 1 failed
  ("OpenAI did not accept this key." never shown)
gh workflow run nightly.yml --ref dougkeefe/dependabot-cleanup-slice (run 36614291646, before D158)
  → success: full property runs, Integration (100,000 simulator seeds), E2E every browser; the live smoke skipped
    (no OPENAI_SMOKE_KEY)
```

### 29 September 2026 — `dougkeefe/noncommercial-license` (relicensed non-commercial, D153)

**Changed:** `LICENSE` is now the verbatim PolyForm Noncommercial License 1.0.0 and `LICENSE-CONTENT` the verbatim CC BY-NC-SA
4.0 legal code, each fetched from its publisher and diffed against it. ADR 23 supersedes ADR 12 (only ADR 12's status line
changed). R13 and the "open-source" wording become "source-available" across the README, `CLAUDE.md`, the docs and the `en`/`fr`
messages. `CONTRIBUTING.md` and the PR template now name the new licences (inbound = outbound). No test pinned the old copy, so
no test changed. *Next, decided* is unchanged: Phase 7 Slice 4.

**Evidence:**

```
tail -n +14 LICENSE | diff - <PolyForm-Noncommercial-1.0.0.md>     → identical
tail -n +16 LICENSE-CONTENT | diff - <by-nc-sa/4.0/legalcode.txt>  → identical
pnpm verify  → check-types, lint, boundaries (456 + 274 modules, no violations),
               test: 220 files, 3363 passed, 8 todo; coverage thresholds met; exit 0
```

### 29 September 2026 — `dougkeefe/next-slice-from-progress-v2` (Phase 7 Slice 3: content, the contribution path and data rights)

**The branch name.** Conductor renamed this workspace's branch in the background to `dougkeefe/next-slice-from-progress-v2`.
That name had already carried Phase 5 Slice 2 (#35, merged and deleted), so the entries of 27 and 28 September under the same
name are that slice's, not this one's. The claim below was written as `dougkeefe/melbourne-v1` and corrected before it merged.

**Built** (D146–D152):
- the non-affiliation statement as one component, in onboarding and beside every band estimate;
- the about page rewritten and a privacy notice at `/privacy`, both linked from the footer;
- `/progress` as the one-page PDF, with oral sessions and minutes (`oralTotals`, the engine's `speakingMs`), and the token set
  printing light;
- device removal confirmed in place, the pair code counting down from its arrival, and a removed device's switch
  following;
- the shortcut sheet at `?`, over a registry and one shared key guard; the drill gains the exam's chord guard;
- the `lang` audit, with its two fixes in workshop feedback;
- the authored-item intake (`content/authored/`, `contributor`, stage 4), `CONTRIBUTING.md`, the PR template and the README's
  Contributing section.

The intake was built by a parallel agent in the same worktree, on disjoint files, and reviewed here.

**Existing tests touched:**
- **additive assertions** in journey 1 (the statement by the diagnostic readout), the exam spec (by the band), the oral
  spec (in the report) and the workshop spec (the statement, and the `lang` of the interface's words inside the French);
- the titles table and the CSP spec's `PAGES` gain `/privacy` (and `/fr/about`'s title);
- **one fixture:** `validate.test.ts`'s base item gained a contributor (D152). No assertion changed.

**Defects the new tests found, fixed:**
- journeys 7 and 8 failed on a hidden print-only copy of the second skill (D148);
- the removed device's switch still read on (D149);
- the footer's `<p>` held the sheet's dialog, a hydration mismatch on every page (D150);
- Chromium's PDF export cleared the print flag early (D148).

**Evidence** (final run, on a fresh production build):

```
pnpm verify           → check-types, lint, boundaries (456 + 274 modules, no violations),
                        test: 220 files, 3363 passed, 8 todo; coverage thresholds met
pnpm test:integration → 7 files, 51 passed
CI=1 pnpm test:e2e     → 83 passed, 1 failed: journey 4 (production.spec.ts), a flake that predates this slice (below)
pnpm --filter @palier/web bundle-size → shared first-load JS 166.0 KB of 180.0 KB
```

The run before the last `ProgressScreen` fix passed all 84.

**Proven to bite:**
- with the statement removed from `ExamResults`, the exam spec fails;
- with the print cards given a `min-height` of 300pt, the one-page spec counts two pages;
- the screenshot after an export showed the second skill gone, and the assertion added for it holds now.

**Journey 4 is flaky on `main` too.** It failed intermittently here, so it was run six times against a clean worktree of
`origin/main` (`3c36790`): **3 failed, 3 passed**. Each time, the review screen reads "Nothing due" after the clock is moved
two days on. Its cause is not found. **Named, not scheduled**, since it predates this slice.

### 29 September 2026 — `dougkeefe/next-slice-from-progress-v2` (Gate K resolved; Phase 7 Slice 3 claimed)

**Phase 7 Slice 2 had merged as #45**, so its In-flight row was replaced by this branch's, and Slice 2 was ticked.

**Human decisions this session:** Gate K, all five questions as recommended, and the authored-item intake built in Slice 3
(D145). `implementation-plan.md` §7's Phase 7 completion slices are updated to match.

### 29 September 2026 — `dougkeefe/next-slice-from-progress-v3` (pre-merge review of Phase 7 Slice 2)

**A candid review of the whole branch** (three parallel reviewers, constructive tone) found no critical issue, four major
and thirteen smaller. The human chose to apply all of them. The human also decided that the retention job uses the app's
own connection (D138).

**Major:**
- **An unknown path with a dot rendered the whole app with no CSP.** The proxy's matcher skips dotted paths, and the
  policy is set only there. Every locale path now runs the proxy, and the CSP spec holds `/no-such.page` (D141).
- **Workshop feedback could land on the wrong draft**, and its failure's Try again could pay for another submission. A
  result is now tied to its submission (D143).
- **The runbook's aggregation step** now reclaims the space with `VACUUM FULL` before checking the size (D139).
- **The tombstone purge's precondition** for the first single-record delete is recorded (D138).

**Smaller:**
- **Oral liveness:**
  - a session is read again before it is stamped;
  - a pending lock counts as live;
  - a refused `locks.query()` no longer stops a session starting (D144).
- **Delete-everywhere** forgets requests only as its local wipe begins, and the per-tab limit is recorded (D143).
- **The diagnostic bundle** cuts V8's `name: message` header before reading frames, so a multi-line message shaped like
  frames is dropped (D141).
- **Error screens:**
  - the error's title is given back only while it is still the error's;
  - a failed Copy opens the text it asks the user to select;
  - a repeated result is re-announced;
  - the summary keeps its disclosure marker.
- **The hook's production 404** has its title and `noindex`, and a production spec proves it inert.
- **The retention workflow:**
  - it has a timeout and a concurrency group;
  - its report is fenced in the step summary;
  - a two-minute statement timeout;
  - `process.exitCode` in place of `process.exit`;
  - a tested `alertOf`.
- **Health:** a failed connection is retried rather than cached, and the runbook warns against an interval monitor on
  Neon's free tier.
- **Corrections:**
  - D141's claim about `not-found.tsx` is corrected;
  - a comment's test path is fixed;
  - the runbook no longer hard-codes the bank version;
  - a late fresh set is ignored outside generating;
  - three French phrasings are improved in `errors`.

**One existing test's setup changed**, and its assertions did not: the reducer test "revises from the feedback…" reached
feedback without the `saved` step the screen always dispatches first. That shortcut is exactly the state the fix now
refuses, so the step was added.

**Not taken, and why:**
- scheduled retention runs kept dry until a variable is set: the human chose delete-on-schedule (D138);
- an abandoned session's end at its last turn: it moves pinned tests, so it is named, not scheduled (D144).

**Evidence** (after the fixes, on a fresh production build):

```
pnpm verify           → check-types, lint, boundaries (454 + 267 modules, no violations),
                        test: 217 files, 3284 passed, 8 todo; coverage thresholds met
pnpm test:integration → 7 files, 51 passed
CI=1 pnpm test:e2e     → 75 passed (1.3m), with csp-production's /no-such.page and the hook's production 404
pnpm --filter @palier/web bundle-size → shared first-load JS 165.9 KB of 180.0 KB
```

Proven to bite: with the failed connection cached again, the retry test fails. The new reducer, liveness and diagnostic
tests each fail on the code before their fix, by construction.

### 28 September 2026 — `dougkeefe/next-slice-from-progress-v3` (Phase 7 Slice 2: server lifecycle and observability)

**Phase 7 Slice 1 had merged as #39**, so its In-flight row was replaced by this branch's in the first commit, and Slice 1 and
the security item were ticked.

**Human decisions this session:**
- **a scheduled retention run deletes**, and a run by hand is a dry run unless unticked (D138);
- **finding 13's wipe half is in** the slice (D143).
- **the retention job uses the app's own connection**: `RETENTION_DATABASE_URL` holds Production's `DATABASE_URL` (D138).

**Built** (D138–D144):
- the retention job and its daily workflow, with the storage alert and two housekeeping purges (`retention-job.ts`,
  `scripts/retention.mjs`, `retention.yml`);
- `GET /api/health`, with the build version inlined from the commit and the bank version moved out of the browser-only
  root (`lib/build-info.ts`, `lib/bank-version.ts`);
- the error states in both locales: `[locale]/error.tsx`, the localised 404 through `[locale]/[...rest]`, and
  `global-error.tsx`, each with the diagnostic bundle (`lib/diagnostic.ts`) and a prefilled issue (`errorIssueUrl`);
- the in-flight joins for the workshop and fresh sets, and the wipe guard over all three spending screens
  (`lib/in-flight.ts`);
- the `OralLiveness` port over Web Locks, and `closeAbandonedSessions`;
- the runbook's retention section and smoke check, `implementation-plan.md` §3.3 and architecture.md §10 amended in place,
  and the three packages' `CLAUDE.md`.

No new dependency.

**Found by the suite and fixed** (D141): on the production build the 404 rendered blank. Next serves any `notFound()` under
this dynamic root layout as its error shell, which has neither the layout nor its Trusted Types policy, so every chunk load
was refused. `csp-production.spec.ts`'s new 404 page caught it, with one violation, `require-trusted-types-for …
HTMLScriptElement src`. The catch-all now renders the 404 inside the layout, 200 with `noindex`.

**Evidence** (after the last code change, on a fresh production build):

```
pnpm verify           → check-types, lint, boundaries (454 + 266 modules, no violations),
                        test: 217 files, 3276 passed, 8 todo; coverage thresholds met
pnpm test:integration → 7 files, 50 passed (retention.integration.test.ts among them)
CI=1 pnpm test:e2e     → 74 passed (1.2m): errors.spec.ts's 7, the workshop's and generate's leave-and-return,
                        oral-production's closed tab, health, and csp-production's 404 page
pnpm --filter @palier/web bundle-size → shared first-load JS 165.9 KB of 180.0 KB (unchanged)
pnpm --filter @palier/web lighthouse  → 17 URLs × 5 runs, every assertion passed; lowest median performance 0.99,
                        accessibility 1.00 on all, max CLS 0
git diff packages/engine/src/__fixtures__ → empty
```

**Proven to bite** (each reverted):
- retention, on PGlite: `<` → `<=` on inactive accounts, pair codes and rate limits, `>=` → `>` on the device, and the revoked
  filter dropped. Each fails the boundary test;
- the bundle keeping the error's message → the sentinel test and two others fail;
- the workshop, generate and report writes unguarded → each wipe test fails. A join keyed apart → the join test fails;
- the workshop's resume dropped → the leave-and-return E2E fails;
- the practice controller holding no lock, on a production build → the closed-tab E2E fails, since the second tab closes the
  running session.

**Not run:** the retention script against a real Postgres. Only the libpq client is installed here, and Docker was down.
Its guards were run by hand: exit 1 with no `DATABASE_URL`, and a thrown error for `PLAN_STORAGE_MB=abc`. The first dry
run by hand is the human's (*Next, decided*).

**Ticked:** none. Slice 2 and its two breakdown items are `[~]` until the branch merges. *Next, decided* names Gate K.

### 28 September 2026 — `dougkeefe/next-progress-slice-v7` (Phase 6's gate resolved; Phase 7 planned; Phase 7 Slice 1, security hardening)

**Phase 5 closed had merged as #38**, so its In-flight row was replaced by this branch's in the first commit.

**Human decisions this session:**
- **Phase 6's decision gate: studio mode is deferred past 1.0**, and Phase 7 is next (D131). This session first made
  D113's documentation checks 2 and 3. The Live API has a duration limit it does not publish, and no short-lived browser
  credential. Its voice table lists no French voice. The human also asked that every document be aligned, and it is: this
  file, `implementation-plan.md` §7–§11, the PRD §8.6, §16 and §17, architecture.md §6.3, §10, §14 and §20, and two code
  comments.
- **The CSP mechanism: nonces with per-request pages** (D133, ADR 22), chosen on the spike's evidence over static pages
  with build-time hashes and over `'unsafe-inline'`.

**Planned:** Phase 7 as four slices and three gates (D132), mirrored in `implementation-plan.md` §7. The §7 breakdown is
expanded above, with what already existed ticked `[~]`.

**Built, Slice 1** (D133–D137):
- the strict CSP (`lib/csp.ts`, `proxy.ts`, the layout's nonce);
- Trusted Types with one default policy (`lib/trusted-types.ts`);
- zod jitless in `instrumentation-client.ts`;
- `e2e/csp-production.spec.ts`: every page in both locales and the red team;
- the audit step and Dependabot;
- `SECURITY.md`;
- `RATE_LIMIT_SALT` failing a production deploy;
- ADR 22, and `apps/web/CLAUDE.md`'s invariants.

No new dependency.

**Evidence** (after the last code change, on a fresh production build):

```
pnpm verify          → check-types, lint, boundaries (451 + 237 modules, no violations),
                       test: 210 files, 3178 passed, 8 todo; coverage thresholds met
CI=1 pnpm test:e2e    → 63 passed (1.1m) — the 58 before, and csp-production.spec.ts's 5
pnpm --filter @palier/web bundle-size → shared first-load JS 165.9 KB of 180.0 KB (was 165.7)
pnpm --filter @palier/web lighthouse  → 17 URLs × 5 runs, every assertion passed;
                       lowest median performance 0.99, accessibility 1.00 on all, max CLS 0
pnpm audit --prod --audit-level=high  → 2 high, both ignored (the `content` false positive, D135); exit 0
git diff packages/engine/src/__fixtures__ → empty
```

**Proven to bite** (each reverted, then rebuilt):
- `script-src 'self' 'unsafe-inline'`, no Trusted Types and `connect-src *` → all 5 CSP tests failed;
- only `connect-src *` → the red team failed on `fetch: "ran"`.

**Found by the suite and fixed** (D134): a Trusted Types policy returning absolute URLs left every lazily imported chunk
waiting. Nine production journeys failed on a disabled "Continue", with zero violations reported.

**Ticked:** none. Slice 1 is `[~]` until it merges, and exit criterion 1's security half waits on Gate L's red-team read
(D132). *Next, decided* names Slice 2.

### 28 September 2026 — `dougkeefe/next-progress-slice-v6` (Phase 5 closed: the stability recording, Gate I, criterion 2 deferred)

**Phase 5 Slice 3 had merged as #37**, so its In-flight row was replaced by this branch's. **The human chose the funded runs
first** over an agent slice. They ran both recordings from their own terminal, and this session did the follow-up (D128). They
then passed Gate I (D129) and deferred criterion 2 (D130).

**The human's runs** (key never in this session):

```
pnpm --filter @palier/web oral-stability
  → recorded 5 report(s) of 5, 5 completion(s), US$0.127104
LIVE_SMOKE_RECORD=1 node apps/web/scripts/live-smoke.mjs
  → completions: 15, 15 accepted on the first try; recorded 15 completion(s)
  → measured features for pricing.json: writing-feedback assess 517/1813; item-generation draft 392/4482, review 1680/3775
```

**Evidence** (run on this branch, after the last code and data change):

```
node apps/factory/dist/index.js eval
  → eval: overall 1.000, min class 1.000
  → schema conformance on prompt v4: 1.000 over assessOral-stability.json, assessOral.json, assessWriting.json,
    examinerTurn.json, generateItems.json, reviewItem.json, speak.json, transcribe.json
  → oral stability over 5 call(s): passed (comprehension spread 0, agreement 1.00; fluency spread 0, agreement 1.00;
    grammar spread 0, agreement 1.00; vocabulary spread 0, agreement 1.00; task spread 0, agreement 1.00)
pnpm verify          → check-types, lint, boundaries (451 + 229 modules, no violations),
                       test: 207 files, 3143 passed, 8 todo; coverage thresholds met
CI=1 pnpm test:e2e    → 58 passed (1.1m), on a fresh production build
git diff packages/engine/src/__fixtures__ → empty
```

**Human decisions this session:**
- **Gate I passed** (D129): the report is one a user would act on. That ticks exit criterion 1.
- **Exit criterion 2 is deferred** (D130): the real 10-minute session's cost check runs later, and the oral placeholders in
  `pricing.json` are recalibrated then if needed.

**Ticked:** exit criteria 1 and 4. **Deferred (`[!]`):** criterion 2. Phase 5 is marked complete on four of its five criteria,
and *Next, decided* names Phase 6's decision gate.

**A candid review of the branch** (constructive tone) found 6 issues, none critical, and the human chose to fix all 6:
- this log's entries sat above its preamble, and there were three of them for one session, so they are now this one;
- D129 had recorded a decision the human did not make;
- D130 cited Phase 3 as a finished phase;
- deploy.md's console snippet threw with no reported session on the device, and left its connection open;
- `implementation-plan.md` §7 did not record the deferral;
- one line in deploy.md was over-long.

### 28 September 2026 — `dougkeefe/check-last-branch-commit` (pre-merge review: 32 fixes)

**A candid review of the whole branch** (three parallel reviewers, constructive tone) found 32 issues, none critical, and
the human chose to fix all 32. D127 records each.

**The ones that mattered most:**
- the mean pause counted the time spent listening to each question. The screen now measures the pause itself;
- one straightened apostrophe in a model's quotation lost a report that had been paid for twice;
- a French report's figures on the other language's plan, and a boost that could level the weakest sub-skills;
- leaving the report screen mid-call and coming back could pay for a second report.

**Evidence** (after the fixes):

```
pnpm verify          → check-types, lint, boundaries (449 + 229 modules, no violations),
                       test: 207 files, 3130 passed, 8 todo; coverage thresholds met
CI=1 pnpm test:e2e    → 57 passed (1.1m), on a fresh production build
```

**The second pass's 7** (D127), after their fixes:

```
pnpm test             → 207 files, 3136 passed, 8 todo; coverage thresholds met
CI=1 pnpm test:e2e    → 58 passed (1.1m), on a fresh production build (the in-flight journey is new)
```

**The third pass's 3**, after their fixes: `pnpm verify` green (207 files, 3137 passed, 8 todo); `CI=1 pnpm test:e2e` 58 passed.

### 28 September 2026 — `dougkeefe/check-last-branch-commit` (Phase 5 Slice 3: `assessOral` and the report)

**Built.** The decisions are recorded in D122–D126. Slice 2 had merged as #35, so its In-flight row was replaced in this
branch's first commit.

**Human decisions this session:**
- **Gate J is deferred.** The `pronounce` role ships unconfigured, so pronunciation reads "not assessed" (D122);
- **a fix names the oral criterion it cost and a reading or writing sub-skill**, because the bank has no oral items (D122, D124).

**What was built:**
- **Domain:** `OralRequest`, `OralAssessment`, `OralAssessmentDraft`, their schemas and a type-level test;
  `assembleOralAssessment` and `checkOralAssessment`, D105's rule per turn; `OralTurn.input`; `AI_FEATURES` gains
  `oral-assessment`; the filler list as the `oral-fillers` content artefact, with its JSON Schema.
- **Content:** `content/oral/fillers.json`, published as `./oral/fillers.json`.
- **Engine:** `fluencyMetrics`, with four properties; the selector's `boost` and the planner's `focusSubSkills` (D35 closed).
- **App:** `AiProvider.assessOral`; `requestOralReport`, `oralReport`, `oralHistory`, `oralFocusSubSkills`;
  `OralSession.assessment`; `CostEntry.sessionId` and `withAiProvider`'s tag; the transport's `input` and session tag;
  `StartSession`'s focus; §3.3 amended in place.
- **Adapters:** the OpenAI adapter's `assessOral` and its prompt; the Dexie oral store re-validating a report; the Dexie ledger
  keeping `sessionId`.
- **Testing:** the fake's `assessOral`; the contract's report case; the oral store and ledger contracts' new round trips;
  `assessOral` in the recorded completions' types.
- **Factory:** the meter and the scripted provider; `assessOral` in the conformance methods; `oralStability`, beside the
  conformance rate in `eval-report.json`.
- **Web:** `/practice/oral/report`, its view model and screen; the end screen's link; the picker's past sessions; the
  `oralReport` namespace in both languages; the container's report use cases and fillers; `container-oral.test.ts` asking for a
  report through both graphs; `pricing.json`'s `oral-assessment` placeholder; the live smoke's report and `scripts/oral-stability.mjs`.
- **E2E:** `oral.spec.ts` through the report's states, a refused report and a French pass; both key-leak specs following the
  report; the report route in the Lighthouse list and the titles test.

**Found while building, and fixed:**
- **The level descriptors were first typed into the live smoke's fixed session**, which is the ADR 9 mistake. They now come from
  the profile, through the script.
- **A stored turn could not say it was typed.** Its `startMs` is when its question was shown, so the pause metric needed
  `OralTurn.input` (D122).
- **A session's cost from a time window would misprice** two sessions a minute apart, or a report asked for later. The ledger
  row names its session instead (D125).

**Evidence** (run on this branch, after the last code change):

```
pnpm verify          → check-types, lint, boundaries (449 + 229 modules, no violations),
                       test: 207 files, 3075 passed, 8 todo; coverage thresholds met
                       (fluency.ts, oral-assessment.ts, oral-fillers.ts, oral-report.ts, report-view.ts,
                        oral-stability.ts, selector.ts, planner.ts: 100% of branches)
pnpm test:integration → 6 files, 45 passed
CI=1 pnpm test:e2e    → 57 passed (59.9s), on a fresh production build
pnpm --filter @palier/web bundle-size → shared first-load JS 165.7 KB of 180.0 KB
pnpm --filter @palier/web lighthouse  → 17 URLs × 5, every assertion met; lowest median 0.99;
                                        /fr/practice/oral/report 0.99 / 1.0
node apps/factory/dist/index.js eval  → overall 1.000, conformance 1.000 on prompt v4;
                                        "oral stability: not recorded yet"
git diff packages/engine/src/__fixtures__ → empty: the Planner's goldens did not move
```

**Proven to bite, each run and reverted, with `git diff` clean after:**
- `focusSubSkills` ignored in `planDay`: three tests failed, the planner's and `StartSession`'s;
- a miscopied excerpt placed anyway in `assembleOralAssessment`: four failed, among them the adapter's retry;
- the session recording's bytes added to the report request: the hermetic key-leak journey failed with
  `expect(...).not.toContain("Ondulard9d3a")` on the report's own request body.

**Not done here, and why:**
- **Exit criterion 4** needs the stability recording, and **exit criterion 2** a real 10-minute session compared with OpenAI's
  usage page. Both need a funded key, which this session did not have. Neither is ticked (rule 6).
- **Gate J** is deferred by the human.
- *Next, decided* is rewritten to the two runs, then Gate I.

### 28 September 2026 — `dougkeefe/next-slice-from-progress-v2` (pre-merge review: 26 fixes)

**A candid review of the whole branch** (three parallel reviewers, constructive tone) found 26 issues, none critical, and
the human chose to fix all 26. D121 records each.

**The two that mattered most:**
- leaving `/practice/oral` mid-session neither ended the session nor, from the second session on, let the
  microphone go;
- the leak guard could not have failed on audio in base64, which is how audio gets into JSON.

**Found while fixing:** the rewritten screen passed on the production build and failed all four hermetic oral specs.
React's Strict Mode remounts a screen in development, and the controller's dispose could not be undone. `attach` now
pairs with it (D121).

**Evidence** (after the fixes):

```
pnpm verify          → check-types, lint, boundaries (435 + 223 modules, no violations),
                       test: 198 files, 2939 passed, 8 todo; coverage thresholds met
pnpm test:integration → 45 passed
CI=1 pnpm test:e2e    → 57 passed (1.0m), on a fresh production build
pnpm --filter @palier/web bundle-size → shared first-load JS 165.7 KB of 180.0 KB
pnpm --filter @palier/web lighthouse  → 16 URLs × 5, every assertion met; lowest median 0.99; /fr/practice/oral 0.99 / 1.0
```

**Proven to bite, a fourth way, reverted and checked byte for byte after:** a clip written to `localStorage` as base64
failed the hermetic journey: `"Ondulard9d3a" reached somewhere other than OpenAI and its own copy on this device`.

### 27 September 2026 — `dougkeefe/next-slice-from-progress-v2` (Phase 5 Slice 2: the turn loop on the key)

**Built.** The decisions are recorded in D117–D120. Slice 1 had merged as #34, so its In-flight row was replaced in
this branch's first commit.

**Human decisions this session:**
- the models are `gpt-transcribe` (US$0.0045 a minute) and `tts-1` (US$15 per million characters), both metered on
  units the device measures;
- after a comparison with GPT-Live, Gate H stands. Practice mode is about 3–4× cheaper, not 10×, and Slice 3
  measures the real ratio (D117);
- the human ran the fixture recorder from their own terminal.

**What was built:**
- **Domain:**
  - `TranscribeRequest`, `Transcript`, `SpeechRequest`, `ExaminerTurnRequest`, `ExaminerTurn` and
    `examinerTurnSchema`;
  - `AI_FEATURES` gains `"oral-practice"`;
  - pricing as a union of token, minute and character prices, with one `costOf`.
- **Engine:** `estimateFeatureCost` prices each call in its unit and takes a quantity.
- **App:**
  - `AiProvider.transcribe`, `speak` and `examinerTurn`;
  - the `AnswerSource` port;
  - `turnBasedTransport`, `startOralPracticeRun` and `oralSessionChoices`;
  - `preflightSpend`'s quantity;
  - §3.3 amended in place.
- **Adapters:** the OpenAI adapter's multipart transcription, binary speech and examiner prompt, each on an optional
  role.
- **Testing:**
  - the three methods on the fake provider and in `aiProviderContract`;
  - MSW's audio endpoints;
  - `memoryAnswerSource`;
  - `turnBasedTransport` held to `oralTransportContract`;
  - a whole practice session per fixture session type;
  - the recorded runs for the three new methods.
- **Factory:** the meter and the scripted provider gain the methods, and the eval rates the examiner.
- **Web:**
  - `/practice/oral`, with the level check, per-browser recovery, typed answers, the pre-flight, the session, and the
    end with the transcript;
  - the recorder and the level check;
  - the recordings in `/settings/data`;
  - the home link;
  - the `oral` namespace in both languages;
  - the container's oral use cases;
  - `container-oral.test.ts` running a real session through both graphs.
- **E2E:**
  - `oral.spec.ts` and `oral-production.spec.ts`;
  - the key-leak guard and both key-leak specs following audio and transcripts.

**The recording** (`LIVE_SMOKE_RECORD=1 node apps/web/scripts/live-smoke.mjs`, run by the human):

```
examinerTurn: 2 call(s), average in 376  out 89
transcribe: 1 call(s), average in 0  out 0
speak: 1 call(s), average in 0  out 0
oral-practice: 4 call(s), in 752  out 177  US$0.004495
completions: 14, 14 accepted on the first try
recorded 14 completion(s) to packages/testing/src/recorded/openai/
```

gpt-transcribe answered `{"text":"Bonjour, pouvez-vous me décrire votre poste et vos principales responsabilités ?",
…,"usage":{"type":"duration","seconds":5}}` for tts-1's 71,040-byte MP3 of that question. `palier-factory eval` now
reports conformance 1.0 on prompt 4 over the six files, the examiner at 2 of 2.

**Found while building, and fixed:**
- **The leak guard could not see a recording.** It rendered a `Blob` in IndexedDB as `{}`, and read request bodies as
  text. It now reads both as bytes (D120).
- **Chromium's fake capture device never answers `getUserMedia` on macOS.** A probe on a bare page confirmed it,
  sandboxed and not. The specs synthesise the microphone with Web Audio instead (D120).
- **`AnswerSource` shows the question as well as collecting the answer.** A port that only collected answers would
  have left the examiner's voice no way to reach the screen (D118).

**Evidence** (run on this branch; `verify` and the E2E suite again after the recording and its `pricing.json` counts,
the rest on the same code before them):

```
pnpm verify          → check-types, lint, boundaries (435 + 221 modules, no violations),
                       test: 197 files, 2903 passed, 8 todo; coverage thresholds met
pnpm test:integration → 6 files, 45 passed
CI=1 pnpm test:e2e    → 57 passed (1.1m)
pnpm --filter @palier/web bundle-size → shared first-load JS 165.7 KB of 180.0 KB
pnpm --filter @palier/web lighthouse  → 16 URLs × 5, every assertion met; /fr/practice/oral median 0.99 / 1.0
coverage: app oral-practice.ts 100% branches; testing answer-source.ts 100%
```

**Proven to bite, each reverted, with `git diff` clean after** (D120):
- the session recording uploaded with a transcription failed the hermetic journey: a third audio request;
- the transcript in a synced setting failed the export check (`not.toContain("Grelottard3b8e")`);
- a clip in `localStorage` failed the guard: `"Ondulard9d3a" reached somewhere other than OpenAI and its own copy on
  this device`.

**Not done here:**
- `assessOral`, the report, the fluency metrics, the pronunciation opt-in and the stability eval, which are Slice 3;
- a measured session's cost, which is Slice 3's (exit criterion 2);
- **Next, decided** is rewritten to Slice 3.

### 27 September 2026 — `dougkeefe/next-progress-slice-v5` (Phase 5 Slice 1: the session core, no UI)

**Built.** The decisions are recorded in D114–D116. Phase 4 Slice 4 had merged as #32, so its In-flight row was
replaced in this branch's first commit. The contracts landed in their own commit before any implementation.

**What was built:**
- **Domain:**
  - the oral session vocabulary (`OralTurn`, `ORAL_END_REASONS`, `OralDirection`, `OralRegister`) and
    `oralTurnSchema`, with a type-level test;
  - `GenerateScenarioRequest`, `ScenarioDraft` and `scenarioDraftSchema`;
  - `AiCapabilities.generateScenario`.
- **Engine:** `startOralSession` and `stepOralSession`, the session machine, with nine properties.
- **App:**
  - the `OralStore` and `OralTransport` ports, `StorageQuotaError`, `ItemRepository.scenarios()` and
    `AiProvider.generateScenario`;
  - `startOralSessionRun`, `saveOralAudio`, `oralStorageEstimate` and `cleanUpAudio`, with `AUDIO_KEEP_SESSIONS`
    and `AUDIO_WARNING_BYTES`;
  - `wipeData` and `deleteEverywhere` clear the oral store;
  - §3.3 amended in place.
- **Testing:**
  - `memoryOralStore`, `memoryOralTransport`, `oralStoreContract` and `oralTransportContract`;
  - the `generateScenario` contract case and the `scenarios()` contract cases;
  - a fixture scenario per session type;
  - `memory/oral-session.test.ts`, exit criterion 5.
- **Adapters:**
  - `dexieOralStore` over v1's own tables, with no version bump;
  - the bank adapter reads the manifest's scenarios entry and serves `scenarios()`;
  - the OpenAI adapter's `generateScenario` on an optional `models.scenario`, with its prompt.
- **Factory:**
  - the scenario stage and `content/factory/oral-sessions.json`;
  - the scripted provider's plans and the meter's pass-through;
  - forms and scenarios carried forward, and a carried passage keeping its published record;
  - the manifest's `scenarios` entry, and `DEFAULT_BANK_VERSION` 3.
- **Content:** bank v3, and the batch report, `drafted.json` and `source-queue.json` regenerated (D114 explains
  each change).
- **Web:**
  - `BANK_VERSION` 3;
  - the service worker precaches the scenarios file;
  - the container wires the oral store in both graphs, and `container-oral.test.ts` holds it device-local;
  - two offline E2E specs now take the form the picker offers.

**The bank v3 run** (`PALIER_NOW=2026-09-27T00:00:00.000Z node apps/factory/dist/index.js run --provider scripted
--bank-version 3`):

```
run: 0 published / 368 drafted, yield 0.630, cost/item null USD
bank v3: 242 items, forms fr-reading-supervised-v2, …-v2 (4), fr-reading-supervised-v3, …-v3 (4)
scenarios: 10 new, 0 carried, 0 discarded, 0 failed calls
exit 0; v2's item, passage and form files are byte-identical in v3 (cmp); a --force rebuild leaves content/ clean
```

**Found while building, and fixed:**
- **A carried passage's provenance was being rewritten.** The first v3 build's passage shard differed from v2's
  only in `source.retrievedAt`. Carried passages now win, as carried items do (D114).
- **Two offline E2E journeys failed on v3** (exam-offline, telemetry-offline). Each took the manifest's first form
  by name, now `-v2`, while the picker offers the highest version, `-v3`, as D85 designed. The specs now take the
  form the picker takes. The app did not change.
- **A second E2E run failed four sync and key-leak journeys**, in 4.8 minutes. The proven-to-bite checks had
  rebuilt `@palier/app`'s `dist` under the running `next dev` server. Run alone on a clean build, all 51 passed.

**Evidence** (run on this branch before the docs commit):

```
pnpm verify          → check-types, lint, boundaries (423 + 208 modules, no violations),
                       test: 187 files, 2726 passed, 8 todo; coverage thresholds met
pnpm test:integration → 6 files, 45 passed
pnpm test:e2e (CI=1)  → 51 passed (1.1m)
pnpm --filter @palier/web bundle-size → shared first-load JS 165.7 KB of 180.0 KB
CI_LANE=nightly vitest run packages/engine/src/oral-session.property → 8 passed
coverage: engine oral-session.ts, app oral.ts, dexie oral-store.ts, domain oral-session.ts: 100% branches
```

**Proven to bite, each reverted, with the diff checked clean after:**
- the machine jumping straight to the phase that holds the time, rather than entering each, failed five tests,
  among them "enters phases 0, 1, 2… in order, never skipping or repeating one";
- `wipeData` no longer clearing the oral store failed the wipe and the delete-everywhere tests (D115);
- `loadPublishedBank` carrying no forms failed `committed-bank.test.ts` twice ("byte-identical", "carries every
  form the previous version published") and the CLI's carry test;
- the driver stamping every turn phase 0 failed exit criterion 5's test for all five session types.

**Not done here:**
- a recorded fixture for `generateScenario`, which waits for the full-volume run's key (D112, D56);
- any UI, the turn-based transport and the audio leak test, which are Slice 2;
- the real-model scenarios, which come with the full-volume content run (D56).
- **Next, decided** is rewritten to Slice 2.

### 27 September 2026 — `dougkeefe/next-progress-slice-v4` (pre-merge review: 20 fixes)

**A candid review of the whole branch** (three parallel reviewers, constructive tone) found 23 issues, none critical.
The human chose to fix 20. Findings 13 and 16 are named follow-ups in *Next, decided*, and 23, the factory reading
another package's fixtures by path, is accepted as documented in D112 and the factory's `CLAUDE.md`.
- **Money:**
  - a draft call returning more than `GENERATED_SET_SIZE` drafts no longer buys more reviews;
  - a pre-flight that lands late, or a cancel, is ignored while a set is generating, so Send cannot come back
    mid-request.
- **Accessibility:** focus follows every move on the fresh-set screen: Not now, Send, a failure, Generate another set
  and Back to fresh items. The spec asserts `toBeFocused()` for each.
- **Correctness:**
  - putting a `GeneratedItemStore` set again replaces it in both stores, and the port states its unique-id and
    canonical-UTC assumptions;
  - whether an item is generated now comes from the runner's mode, not a copied `gen-` prefix;
  - generated mode's failure says the item is gone and offers the way back;
  - dates in the workshop history and the last set are formatted in the device's own time zone. next-intl handed the
    static pages the build machine's zone.
- **CI and the eval:**
  - the conformance rate counts first replies only, and nothing measured is `null` (D112, amended);
  - the loaders are validated and tested;
  - the smoke stops before paying when a model is missing, and names the adapter's error on a page that is not JSON;
  - the nightly summary's fence always closes, and the issue says whether the smoke or the build failed.
- **Copy:** the French grammar in `lastBody` and `doneBody`, and plural-aware result lines in both locales.
- **Docs:** the runbook builds the factory, the smoke key's limit is US$10, the factory's `CLAUDE.md` names the eval's
  new input, and three small inconsistencies are gone.

**A second review pass over the fixes** found four more, all applied:
- `drafted` counts only the drafts that were reviewed, so "N of M passed the check" never counts unchecked extras as
  failures;
- focus while generating rests on the status line, and `aria-busy` is gone because it could silence that live region;
- a no-key failure mid-run focuses the no-key card's heading. The new `generate-production.spec.ts` stages it on the
  production build, where a second tab removes the key from the shared IndexedDB vault while the first is at the
  pre-flight;
- the French cost sentence now names its referent, and the English matches it.

**Evidence** (after the fixes):

```
pnpm verify          → boundaries (398 + 207 modules, no violations), test: 175 files, 2521 passed, 8 todo
pnpm verify:medium   → integration: 6 files, 45 passed; E2E (CI=1): 51 passed (53.4s), with generate-production.spec.ts
node apps/factory/dist/index.js eval → schema conformance on prompt v4: 1.000; prompt-3 run 2 of 5 (0.4)
generate-production.spec.ts, with NoKeyCard's headingRef dropped → fails at toBeFocused; reverted, rebuilt clean
```

### 27 September 2026 — `dougkeefe/next-progress-slice-v4` (Gate H resolved; Phase 5 planned)

**Docs only** (D113). The human adopted Gate H with the recommendations: PRD §8.6's practice mode and report as
written, all five session types, and pronunciation as a per-session opt-in.
- Audio retention was never open; architecture.md §9.1 sets it.
- Phase 5's exit criterion 3 contradicted R12 and §8.5. It is amended in place in both documents, and now covers the
  stored recording. Each answer's clip goes only to OpenAI's transcription call.
- Phase 5 is three slices, mirrored in implementation-plan.md §7. Exit criterion 1 is Gate I.
- **GPT-Live** (`gpt-live-1`), raised by the human, was read from OpenAI's docs:
  - It leaves Phase 5 as adopted. It shapes Slice 1's transport port.
  - It is the leading candidate for Phase 6's studio mode, and probably removes that gate's cost premise.
  - Adopting it needs an ADR superseding ADR 3's mechanism, because ADR 3's *revisit when* evidence has not appeared.
- **Next, decided** is rewritten to Phase 5 Slice 1.

### 27 September 2026 — `dougkeefe/next-progress-slice-v4` (Phase 4 Slice 4: runtime item generation and the CI gates)

**Built.** The decisions are recorded in D109–D112. Slice 3 had merged as #31, so its In-flight row was replaced in
this branch's first commit. Two human decisions were taken at the start: **written expression only** for generated
sets, and **real recorded fixtures on the human's own key**, recorded this session.

**What was built:**
- **Domain:** `review-gate.ts`, holding `gateReasons`, `CONFIDENCE_THRESHOLD` and `reviewRequestFor`, moved from the
  factory unchanged (D109).
- **App:**
  - the `GeneratedItemStore` port;
  - `generatePracticeSet`, `latestGeneratedSet` and `scoreGeneratedAnswer`, which writes nothing;
  - `wipeData` and `deleteEverywhere` clear generated sets;
  - §3.3 amended in place (D110).
- **Testing:**
  - `memoryGeneratedItemStore` and `generatedItemStoreContract`;
  - MSW completions that answer the prompt, used by `generationCompletions`, `draftsFor` and `verdictFor`;
  - the recorded fixtures and `RECORDED_RUNS`.
- **Adapters:**
  - `dexieGeneratedItemStore` over v1's `generated` table, with no schema bump;
  - `PROMPT_VERSION` 4, whose review prompt names the band scale;
  - `recorded-fixtures.test.ts`.
- **Factory:**
  - the gate imported back from domain;
  - `committed-eval.test.ts`;
  - `eval/conformance.ts` and `eval/report.ts`, so `palier-factory eval` writes `schemaConformance`.
- **Web:**
  - the container wires the store and the three use cases in both graphs;
  - `/practice/writing/generate` (`GenerateSet`, `features/generate/`), linked from the writing drill;
  - `PracticeSession`'s generated mode, with `GeneratedProvenance` and `contributeIssueUrl`;
  - `NoKeyCard` shared under `components/key/`;
  - the `generate` namespace in both locales, and the per-feature table's coming-soon line removed;
  - `live-smoke.ts` and `scripts/live-smoke.mjs`;
  - `pricing.json`'s token counts, now measured.
- **E2E:**
  - `generate.spec.ts`: every state axe-clean, and French at parity;
  - both key-leak specs generate and practise a set, following `GENERATED_SENTINEL`;
  - a French page title check.
- **CI:** the `live-smoke` job in `nightly.yml`, gated on `OPENAI_SMOKE_KEY`.
- **Docs:** `docs/deploy.md` gained the secret and the re-recording runbook.

**The recording, on the human's key** (run from their own terminal, so no key entered this transcript):

```
# prompt version 3 (first run)
generateItems: 3 call(s), average in 392  out 4354
reviewItem: 5 call(s), average in 515  out 754
assessWriting: 2 call(s), average in 517  out 1546
writing-feedback: 2 call(s), in 1034  out 3092  US$0.026804
item-generation: 8 call(s), in 3750  out 16834  US$0.142172
completions: 13, 10 accepted on the first try

# prompt version 4 (after the fix, committed)
generateItems: 3 call(s), average in 392  out 3915
reviewItem: 5 call(s), average in 329  out 345
assessWriting: 2 call(s), average in 517  out 1733
writing-feedback: 2 call(s), in 1034  out 3466  US$0.029796
item-generation: 8 call(s), in 2821  out 13471  US$0.113410
completions: 10, 10 accepted on the first try
```

The three refused first replies on prompt 3 all answered `estimatedBand` with "B1" or a sentence. That is the defect
D112 records, and the retries Gate G's figures hinted at. **Phase 4's exit criterion 2 is ticked, and with it Phase 4.**

**Evidence** (run on this branch before the docs commit):

```
pnpm verify          → check-types, lint, boundaries (397 + 205 modules, no violations),
                       test: 173 files, 2499 passed, 8 todo; coverage thresholds met
pnpm verify:medium   → integration: 6 files, 45 passed; E2E (CI=1): 50 passed (1.0m)
pnpm --filter @palier/web bundle-size → shared first-load JS 165.7 KB of 180.0 KB
lhci autorun (3 runs) → /fr/practice/writing/generate: performance 0.99, accessibility 1;
                        /en/practice/writing: 1, 1
node apps/factory/dist/index.js eval → overall 1.000, min class 1.000; schema conformance on
                       prompt v4: 1.000 over assessWriting.json, generateItems.json, reviewItem.json
                       (detection figures byte-identical to the committed report before the slice)
```

**Proven to bite, each reverted, with the diff checked clean after:**
- the generated stem in a synced setting failed `key-leak.spec.ts` at the export check;
- a `console.info` of the stem failed it at the guard (`"console"`);
- the stem in `localStorage`, on a rebuilt production server, failed `key-leak-production.spec.ts` at the guard
  (`"localStorage[biteStem]"`). The server was rebuilt clean afterwards;
- `scoreGeneratedAnswer` appending an attempt failed "writes no attempt and no schedule entry, so the practice trend
  is unchanged";
- capping `confidence` at 0.5 in the domain schema failed every accepted review replay;
- loosening `estimatedBand` to any string failed the three prompt-3 refusals.

**Not done here:**
- reading-set generation, which is named and unscheduled (D110);
- the `generate` namespace's French, which goes with Phase 7's R8 review;
- the `OPENAI_SMOKE_KEY` secret, which is the human's step. Until it is set, the nightly job skips and says so.
- **Next, decided** is rewritten to Gate H.

### 26 September 2026 — `dougkeefe/next-progress-slice-v3` (Phase 4 Slice 3: the writing workshop)

**Built.** The decisions are recorded in D105–D108. Slice 2 had merged as #30, so its In-flight row was replaced
in this branch's first commit.

**What was built:**
- **Domain:**
  - the writing DTOs and `writingFeedbackDraftSchema`/`writingAssessmentSchema`;
  - `checkErrorOffsets`, `placeErrors` and `assembleAssessment`;
  - the `WritingPrompt` content schema in `CONTENT_SCHEMAS`, with `docs/schemas/writing-prompt.schema.json`
    generated, and `parseWritingPrompts`.
- **App:**
  - `AiProvider.assessWriting` and the `WritingStore` port;
  - `writingPrompts`, `saveWriting`, `requestWritingFeedback` (through `withAiProvider`, metered as
    `writing-feedback`) and `writingHistory`;
  - `wipeData` and `deleteEverywhere` clear submissions.
  - §3.3 is amended in place.
- **Testing:** the fake's `assessWriting`, the contract case, `memoryWritingStore` and `writingStoreContract`.
- **Adapters:**
  - openai `assessWriting` on the `assess` model, with excerpts placed and retried once;
  - Dexie v3 `writingSubmissions`, `dexieWritingStore`, and a v2 → v3 migration case.
- **Factory:** the scripted provider declines and the meter passes the call through.
- **Content:** six French prompts at `content/writing/prompts.json`, exported by package name.
- **Web:**
  - the container parses the library and wires the store in both graphs and `assess` into the adapter;
  - `features/writing/` holds the word diff, the inline segments and the workshop reducer;
  - `/practice/writing/workshop`, with the no-key card, the pre-flight, the feedback and the history;
  - a link from the writing drill;
  - the `writing` namespace in both locales.
- **E2E:**
  - `workshop.spec.ts`: every state axe-clean, and French at parity;
  - both key-leak specs follow the submission's text (D106), proven to bite three ways;
  - a French page title check.

**Evidence** (run on this branch before the docs commit):

```
pnpm verify          → check-types, lint, boundaries (375 + 196 modules, no violations),
                       test: 163 files, 2350 passed, 8 todo; coverage thresholds met
pnpm verify:medium   → integration: 6 files, 45 passed; E2E (CI=1): 46 passed (51.8s)
pnpm --filter @palier/web bundle-size → shared first-load JS 165.7 KB of 180.0 KB
lhci autorun (the two writing routes, 3 runs) → /fr/practice/writing/workshop: performance 0.99,
                       accessibility 1; /en/practice/writing: 1, 1
```

The three bites, each reverted, with the diff checked clean after:

- a synced setting holding the text failed `key-leak.spec.ts` at the export check;
- a `console.info` of the text failed it at the guard (`"console"`);
- `localStorage` holding the text, on a rebuilt production server, failed `key-leak-production.spec.ts` at the
  guard (`"localStorage[draft]"`).

**One unexplained E2E failure, recorded rather than retried away** (§6.5's zero-flake policy):
- `key-leak-production.spec.ts` failed once, on a rerun of four specs after the docs edits. Its error was not
  captured.
- It has not recurred in seven runs since: once alone, three times with those four specs, and three times in the
  full suite (46/46 each).
- If it recurs, capture the trace and open an issue the same day. The new workshop step (the lazily loaded
  container, then the editor's focus) is the first suspect.

**Not done here:**
- the French prompts' human review, which is Phase 7's R8 review;
- measured token counts for `writing-feedback` in `pricing.json`, which are still typical figures (D103). A real
  call on a funded key would measure them, and Slice 4's nightly live smoke is the natural place.
- **Next, decided** is rewritten to Slice 4.

### 26 September 2026 — `dougkeefe/next-progress-slice-v2` (Gate G: the billing check passed)

**The human ran Gate G** (D97, D103; `docs/deploy.md`, "Gate G") on a funded test key in a project of its own.
The billing check printed:

```
2026-09-26T22:36:19.371Z  gpt-6-sol  in 667  out 723  US$0.007118
2026-09-26T22:36:28.486Z  gpt-6-sol  in 293  out 598  US$0.005370
2026-09-26T22:36:48.529Z  gpt-6-sol  in 667  out 799  US$0.007726
2026-09-26T22:36:54.497Z  gpt-6-luna  in 383  out 732  US$0.006622
2026-09-26T22:37:04.893Z  gpt-6-luna  in 383  out 1262  US$0.010862
calls: 5  input tokens: 2393  output tokens: 4114
the meter says: US$0.037698 this month, from these calls alone
window (UTC): 2026-09-26T22:36:05.209Z to 2026-09-26T22:37:04.894Z
```

- **Result:** OpenAI's usage data, once it caught up, **matched 100%**, as the human reported.
- **Per model:**
  - `gpt-6-sol`: 1,627 in, 2,120 out, US$0.020214;
  - `gpt-6-luna`: 766 in, 1,994 out, US$0.017484.
- **Phase 4 exit criterion 3 is ticked.** Gate G is resolved.
- **The rates are confirmed.** `pricing.json`'s rates of $2 in and $8 out per million tokens, for both models,
  are now confirmed rather than placeholders. The notes in `apps/web/src/lib/pricing.json` and
  `apps/factory/config/pricing.json` say so. The per-feature token counts are still typical figures, not
  measured ones (D103).
- **The usage page was empty for the first eight minutes or more**, with every key filtered in. It then caught up.
  The runbook already says to wait. The Usage and Costs APIs, with an admin key, are the exact alternative.
- **Worth carrying into Slice 4: two of the three reviews were probably retried once.**
  - Reviews 1 and 3 billed 667 input tokens and review 2 only 293, though the prompts differ by one number. That
    fits a first reply that failed validation, then a retry carrying the error: 293 + about 374.
  - Their output tokens, about twice review 2's, fit the same reading.
  - The meter counted both attempts, which is what D102 is for, and the match confirms it.
  - Two retries in three reviews is a signal about the review prompt on `gpt-6-sol`. Runtime generation (Slice
    4) should measure its schema-conformance rate there, which its eval harness gate does.
- Documentation and data notes only; no code changed, so no gates were rerun.

### 26 September 2026 — `dougkeefe/next-progress-slice-v2` (Phase 4 Slice 2: spend)

**Built.** The decisions are recorded in D101–D104. Slice 1 had merged as #28, so its In-flight row was
replaced in this branch's first commit.

**What was built:**
- **Domain:** `AI_FEATURES`/`AiFeature`, `ModelPrice` and `FeatureCall`.
- **Engine:** `spend.ts`, with `spendTotals` (session, UTC week, UTC month), `capState` in whole micro-dollars
  against `CAP_WARNING_PERCENT`, `estimateFeatureCost` and `preflight`. It has unit and fast-check tests.
- **App:**
  - the `CostLedger` port;
  - `withAiProvider(deps, feature, fn)`, which meters every spending method generically, with `checkApiKey`
    left unmetered;
  - `spendSummary`, `spendCap`/`setSpendCap`, `featureCosts` and `preflightSpend`;
  - `wipeData` and `deleteEverywhere` clear the ledger.
  - §3.3 is amended in place.
- **Adapters:**
  - `dexieCostLedger` over v1's `costLedger` table, so no migration, and it reads v1's placeholder row as
    nothing;
  - `openAiProvider`'s `lastUsage()` is now the whole of the last call, retries included (D102).
- **Testing:** `memoryCostLedger`, `costLedgerContract`, completions with `usage` in `openAiHandlers`, and
  the D102 case in `aiProviderContract`.
- **Factory:** the scripted provider's `verifyKey` leaves no earlier usage behind (D102). No committed
  figure moved.
- **Web:**
  - `pricing.json` and `pricing.ts`, with the drift test against the factory's rates;
  - `openAiFor` priced;
  - `costLedger` in both graphs;
  - `SpendSettings` on `/settings/key` (the meter, the soft cap, the per-feature table), with `en`/`fr` at
    parity;
  - `container-spend.test.ts`, and a container test that the sync pushes carry no ledger entry;
  - `billing-check.ts` and `scripts/billing-check.mjs`, with the Gate G runbook in `docs/deploy.md`.
- **E2E:**
  - `key.spec.ts` gains the spend section (refusals, set, remove, the table, axe on each state) and its
    French parity;
  - new `spend-production.spec.ts` (real Dexie): the figures, near and over with axe, the unpriced note,
    "under US$0.01", and a wipe;
  - `key-leak-production.spec.ts` asserts a ledger row is in its at-rest dump.

**Proven to bite, each reverted afterwards:**
1. `deps.ledger.clear()` removed from `wipeData` → "empties the cost ledger, which only this device ever
   held (D101)", "empties the cost ledger with the rest of this device's data", and the container's
   "empties the ledger on a wipe and on delete-everywhere" (7 failed).
2. `pricing` dropped from `openAiFor` → every priced assertion in `container-spend.test.ts` failed (8
   failed), starting with "records a call priced from pricing.json".
3. `verifyKey` taken out of `UNMETERED` → "never meters the key check, capabilities or lastUsage, which
   spend nothing".
4. The adapter overwriting usage per completion again (the pre-D102 behaviour) → "sums a retried call's two
   completions", "reports the tokens of a call that failed after it was billed", "bills a retried call
   twice" in both graphs, and both billing-check cases (6 failed).

**Existing tests touched, and why:** see D101 and D102. Each is a shape change, and no assertion was
weakened.
- `api-key.test.ts`'s `withAiProvider` cases gain the feature argument, a ledger stub and a clock.
- The `data-rights` and `sync-account` device stubs gain a ledger.
- The wiring lists in `container.test.ts` gain `costLedger`.
- The `@palier/testing/in-memory` key list gains `memoryCostLedger`.
- `dexieStores` "wires all nine ports".

**Gates:**
```
pnpm verify        → exit 0: "no dependency violations found" ×2 (361 and 184 modules); Test Files 154 passed,
                     Tests 2196 passed | 8 todo. Branches: engine spend.ts 24/24, app spend.ts 9/9, api-key.ts
                     12/12, dexie cost-ledger.ts 11/11, pricing.ts 25/25, spend-view.ts 18/18,
                     openai-handlers.ts 16/16; openai-provider.ts's 3 uncovered branches predate the slice
pnpm verify:medium → exit 0: integration Tests 45 passed; Playwright 43 passed (40 before, plus the spend section
                     and its French parity in key.spec.ts, and spend-production.spec.ts)
pnpm --filter @palier/web bundle-size → shared first-load JS 165.7 KB of 180.0 KB, within budget
pnpm --filter @palier/web lighthouse  → exit 0, 13 URLs × 5 runs, no assertion failures; median 1.0 / 1.0 on
                     every URL except /en/review, /en/settings/key and /fr/progress at 0.99 performance
pnpm --filter @palier/web billing-check (no OPENAI_API_KEY) → exit 1, "OPENAI_API_KEY is not set. Gate G needs a
                     funded test key; see docs/deploy.md."
```

**Not done here, by design:**
- **Gate G**, the billing check on a funded key. It is the human's, and it ticks exit criterion 3;
- a screen that spends (Slice 3 is *Next, decided*), so the leak spec's ledger row is seeded for now (D104);
- the maintainer CI job that refreshes `pricing.json` (Phase 7, D103).

### 26 September 2026 — `dougkeefe/next-progress-slice-v1` (Phase 4 Slice 1: the key, safely)

**Built.** The decisions are recorded in D98–D100.

**Order.** The first commit was the tier-11 key-leak test and its guard (`d34da6a`), which failed until
`/settings/key` existed. The key code came after it.

**What was built:**
- **App:** `KeyVault` gains do-not-remember mode and `apiKeyStorage` (D98). `AiProvider` gains `verifyKey`,
  plus `AiProviderFactory` (D99); §3.3 is amended in place. The use cases `saveApiKey`, `removeApiKey`,
  `apiKeyStatus`, `withAiProvider` and `checkApiKey`.
- **Adapters:**
  - `openAiProvider`: `verifyKey` (`GET /models`, structure-checked), a raced time limit on every call
    (`ProviderTimeoutError`, never retried), a non-JSON 2xx read as `InvalidResponseError`, and the key
    redacted from an echoed error body.
  - The Dexie vault holds a tab-only key in its closure.
- **Testing:** the memory doubles follow; `openAiHandlers` covers the models endpoint in six modes; the
  `KeyVault` contract gains four cases and `aiProviderContract` one.
- **Factory:** the scripted and metered providers implement `verifyKey`.
- **Web:**
  - `openAiFor` is wired in both graphs, with model ids as data;
  - `/settings/key` and `/settings/key/guide`;
  - onboarding step 5 (the wizard's last step on the skip path, the readout's offer on the diagnostic
    path);
  - the footer link, the `key` namespace at `en`/`fr` parity, and `/en/settings/key` in Lighthouse.
- **E2E:**
  - journey 5 and step 5 (`key.spec.ts`, four tests, with axe on every state);
  - `key-leak.spec.ts` (hermetic: diagnostic, drill, review, exam with telemetry, export, and a pairing, so
    real sync crosses the wire);
  - `key-leak-production.spec.ts` (real Dexie: ciphertext at rest through a reload, a tab-only key never
    written and forgotten on a reload).

**Two defects the leak specs found in themselves, fixed:**
- The guard awaited `request.allHeaders()`, which never settles for a request a reload aborts. That stalled
  the production spec for two minutes before timing out. Headers are now read as sent, and bodies on
  `requestfinished`.
- The exam steps pressed keys before the runner was ready, so no answer was recorded and nothing was
  queued to send. They now wait on each item's counter, as journey 9 does.

**Proven to bite, each reverted afterwards** (the leak specs, with the named assertion):
1. `console.log(key)` in `saveApiKey` → "the sentinel key reached somewhere other than OpenAI":
   `"console"`, and the dev server's HMR WebSocket, which forwards browser logs.
2. The key written to the synced settings store → the export check,
   `expect(exported).not.toContain(SENTINEL)`. With that check switched off for the run, the guard itself
   named `request body …/api/sync` and `response body …/api/sync?watermark=0`.
3. `localStorage.setItem` with the key → `"localStorage[palier.key]"`.
4. The Dexie vault also writing the key as plaintext into `settings` → the production spec named
   `"IndexedDB palier.settings"`.

**Existing tests touched, and why:** see D98–D100. No assertion was weakened.
- Two app vault stubs gained `apiKeyStorage`.
- Three factory doubles and the adapter's `cannedFetch` gained `verifyKey` or a `/models` answer.
- `onboarding.test.ts`'s "nothing after the goal" now holds for the diagnostic path, with a new case for
  the skip path's step 5. This is the behaviour the slice changes.
- `onboard()` gains the skip path's extra click.

**Gates:**
```
pnpm verify        → exit 0: "no dependency violations found" ×2 (349 and 173 modules); Test Files 145 passed,
                     Tests 2049 passed | 8 todo. New files: api-key.ts 6/6 branches, key-view.ts 41/41,
                     onboarding.ts 14/14, memory key-vault.ts 9/9, openai-handlers.ts 7/7, metered.ts 6/6;
                     the only uncovered branches in openai-provider.ts and dexie/key-vault.ts predate the slice
pnpm verify:medium → exit 0 in 65 s locally: integration Tests 45 passed; Playwright 40 passed (34 before, plus
                     journey 5 and step 5 ×4 and the two leak specs, 4.4 s and 4.1 s)
pnpm --filter @palier/web bundle-size → shared first-load JS 165.7 KB of 180.0 KB, within budget
pnpm --filter @palier/web lighthouse  → exit 0, 13 URLs × 5 runs, no assertion failures; median 1.0 / 1.0 on
                     every URL except /en/review, /fr/progress and /en/settings/key at 0.99 performance; max CLS 0
```

**Not done here, by design:**
- the spend meter, the cap and the cost table (Slice 2, *Next, decided*);
- the realtime exception in the copy (Phase 6, D100);
- the key guide's screenshots (a human item);
- schema conformance against recorded fixtures (Slice 4).

### 25 September 2026 — `dougkeefe/next-progress-slice` (Gate E resolved, Phase 4 planned)

- **Gate E resolved by the human** (D97): a product pilot runs now on `content/bank/v2`, its statistics
  indicative only; the paid content run stays at 1.0 (D56). D95 is marked resolved.
- **Gate F resolved**: PRD §8.1 step 5, §8.7 and §8.10 are adopted as written. **Gate G** is named: the human
  will provide a funded test key for Slice 2's billing check.
- **Phase 4 planned as four slices** (D97), mirrored in `implementation-plan.md` §7. *Next, decided* is
  rewritten to **Phase 4 Slice 1, "the key, safely"**, with the pilot's human steps beside it.
- Documentation only; no code changed, so no gates were rerun.

### 25 September 2026 — `dougkeefe/next-progress-slice` (three standing items settled)

- **The human confirmed D89** and chose the name **Palier**, with the domain **`palier.dougkeefe.com`**
  (D96).
- **D12 is verified and closed.** All four cut tables in `psc-sle.json` were compared with the PSC's
  published pages, and each matches. The unsupervised writing page gives "X … a score of 0 to 10" (D96,
  with the URLs and their modified dates).
- Documentation only; no code changed, so no gates were rerun.

### 25 September 2026 — `dougkeefe/next-progress-slice` (Phase 3 Slice 4: telemetry and the item-statistics job)

**Built.** The decisions are recorded in D92–D94, and Gate E is opened as D95.
- **Domain:** the profile's `itemStatistics` rules; the `TelemetryEvent` DTO (strict: an identity is
  refused); the `ItemStatisticsReport` DTO; `ItemStats.pointBiserial` made nullable. The JSON Schemas are
  regenerated.
- **Engine:** `itemStatistics`, `retirementVerdicts`, `restBucket`/`restBuckets` and `trendEvidence`, all
  at 100% branch. No golden value moved.
- **App:** the `TelemetrySink` and `TelemetryStore` ports (§3.3 amended). The use cases
  `recordExamTelemetry`, `flushTelemetry`, `telemetryConsent`, `setTelemetryConsent` and
  `practiceTrendEvidence`. `submitExam` queues at the first stamp; `wipeData` and `deleteEverywhere`
  clear the store.
- **Testing:** memory ports, two contracts, `telemetryHandlers`, and `syntheticTelemetry`.
- **Adapters:** Dexie schema v2 with a real migration harness; `httpTelemetrySink` on `./telemetry`.
- **Server:** `telemetry_events` (migration `0001`), `POST /api/telemetry`, the job and
  `scripts/item-statistics.mjs`, and the monthly `item-statistics.yml`.
- **Factory:** the report is applied at the next bank build, and forms skip retired items.
- **Web:** both graphs wired; every sync trigger flushes; the exam runner notifies after a submit; the
  post-exam prompt; the `/settings/data` card; the readiness disclosure; `en` and `fr` at parity.
- **Journey 9** (`e2e/telemetry-offline.spec.ts`, the `offline` project):
  1. It submits the unsupervised reading exam offline.
  2. It opts in on the results screen, still offline, with axe on the prompt.
  3. It sees nothing sent, then exactly one batch once the network returns: five events of exactly
     five fields, with no `Authorization` header and no cookie.
  4. It sees nothing sent again after a reload, and the prompt gone.
  5. It finds sharing on in `/settings/data`.

**Proven to bite, each reverted afterwards:**
- The synthetic set with an ordinary key in place of the reversed one → exit criterion 3 failed in
  `item-statistics-job.test.ts` (2 cases) and in `telemetry.integration.test.ts`.
- `telemetryEventShape` as `z.object` rather than `z.strictObject` → "rejects an event that carries an
  identity" (domain) and "refuses an event that carries an identity, so it is never stored" (route) failed.
- `version(2)` removed from `PalierDb` → all three `migration.test.ts` cases failed.
- The flush taken out of `SyncRunner.notify` → journey 9 failed at "the batch arrives, once"
  (`expect.poll(() => batches.length).toBe(1)`).

**Mutation check** on the changed engine files (`pnpm mutation --mutate …`, in place, D77): 224 mutants,
95.1% on the first run.
- **Three real gaps**, closed: the two `RangeError` messages in `restBucket` were not asserted, and the
  `trendEvidence` trusted-count test was symmetric, so `>=` → `<` kept the count at 1. The rerun of those
  lines is at 100%.
- **Eight equivalents**: the id tie-breaks in the sort comparators, four in `itemStatistics` and four in
  `trendWindow`. V8's sort only ever tests `< 0`, and item ids are unique, so they sort identically.

**Existing tests touched, and why:** see D92 and D94. No assertion was weakened.
- Device fixtures gained a telemetry store.
- "seven ports" became eight.
- A route mock gained `telemetryApi`.
- `committed-bank.test.ts` states v2 was built with no report.

**Gates:**
```
pnpm verify        → exit 0: "no dependency violations found" ×2; Test Files 141 passed, Tests 1955 passed | 8 todo
                     New files at 100% branch: engine item-statistics.ts, rest-bucket.ts; app telemetry.ts,
                     exam-telemetry-events.ts; adapters telemetry-store.ts, http-telemetry-sink.ts;
                     web telemetry-handlers.ts, telemetry/route.ts, single-flight.ts, features/telemetry
PALIER_INTEGRATION=1 … telemetry.integration.test.ts → 6 passed (contract on PGlite; 6,600 events through the handler)
pnpm verify:medium → exit 0 in 63 s locally: integration Tests 45 passed; Playwright 34 passed (journey 9: 5.9 s)
pnpm --filter @palier/web bundle-size → shared first-load JS 165.7 KB of 180.0 KB, within budget
pnpm --filter @palier/web lighthouse  → exit 0, 12 URLs × 5 runs, no assertion failures; median 1.0 / 1.0
                     on every URL except /en/review and /fr/progress at 0.99 performance; max CLS 0
node scripts/item-statistics.mjs (no DATABASE_URL) → exits 1 with its message, after every import resolved
                     under type stripping
```

**Not done here, by design:**
- the closed pilot (Gate E, D95);
- the first real run of `readEventsWithPostgres`, which is the first scheduled job;
- the "three reports retire" rule (D94).

### 25 September 2026 — `dougkeefe/next-slice-from-progress-v1` (the medium-lane budget, 4 → 5 minutes)

- **The human chose to raise the medium lane's budget to 5 minutes** (D91). §6.5 is amended and
  `.github/workflows/verify.yml` follows (`timeout 300s`, "Medium lane (budget 5m)").

### 25 September 2026 — `dougkeefe/next-slice-from-progress-v1` (PR #25's medium-lane failure)

- **Diagnosed** (D90). The medium lane was killed at its 240 s budget. The Lighthouse `NO_FCP` that followed
  came from the orphaned hermetic dev server on port 3000.
- **Fixed:** Lighthouse moved to port 3200, and journey 3's wait shortened (20.4 s → 12.6 s locally).
  ```
  playwright test e2e/exam-offline.spec.ts --project offline → 1 passed (12.6s)
  pnpm --filter @palier/web lighthouse → exit 0, 12 URLs on localhost:3200 × 5 runs; every median 1.0 / 1.0
  ```
- **Flagged:** the lane's headroom against the §6.5 budget (D90).

### 25 September 2026 — `dougkeefe/next-slice-from-progress-v1` (pre-merge review of Slice 3)

Conductor renamed the branch from `dougkeefe/naypyidaw`; the entries below keep the old name.
- **A candid review found eight real defects, all fixed** (D89). The serious one: "Add to review queue" keyed
  to the queue gave wrong pilots away. It now starts the same on every item, which refines D84 ruling 10 in
  service of ruling 9. **Flagged for the human.**
- **Gates:**
  ```
  pnpm verify       → exit 0: Test Files 125 passed, Tests 1769 passed | 8 todo; "no dependency violations" ×2
  pnpm --filter @palier/web build → exit 0
  pnpm verify:medium → exit 0: integration Tests 39 passed; Playwright 33 passed
  ```

### 25 September 2026 — `dougkeefe/naypyidaw` (Slice 4 rejoined)

- **The human asked for Slice 4 to be next as a whole** (D88). D83's 4a/4b split existed only because Gate D
  was open, and Gate D and Slice 3 are now done, so no gate stands in the way. D83 is not edited.
- *Next, decided* is rewritten to the whole of Slice 4: the statistics, the route and the job, then the
  sink, the persisted queue, the device-local opt-in, the post-exam prompt and the readiness disclosure.
- The Phase 3 breakdown, the slice list and `implementation-plan.md` §7 are mirrored.
- Documentation only; no code changed, so no gates were rerun.

### 25 September 2026 — `dougkeefe/naypyidaw` (Phase 3 Slice 3: the exam runner and results UI, and journey 3)

**Built.** The decisions are recorded in D85–D87.
- **Core** (D85):
  - `ExamRun.timeAllowance?` and `resumes?`, parsed through `parseExamRun`, so sync and import keep them.
  - `resumeExam` counts a pause once exam time has run, and `examInProgress` looks without writing.
  - `ItemRepository.forms()`, amended into §3.3.
  - `examReport`, `latestExamResult`, `examForms` and `queueForReview`.
  - The engine's `examSubSkillBreakdown`, over scored items only.
- **`@palier/ui`** (D86): an exam token set under `[data-mode="exam"]`, a gated `warning` token, no motion in
  exam mode, and `Timer` and `Dialog` (native `<dialog>`).
- **Web** (D87):
  - the exam use cases wired in both graphs;
  - `/exam`, `/exam/run` and `/exam/results`, all static;
  - `features/exam/{rules,runner,results,readiness}.ts`;
  - the readiness card's exam half and the mock-exam link on home;
  - the import toast's mock-exam count;
  - `en` and `fr` copy at parity.
- **Journey 3** (`e2e/exam-offline.spec.ts`), on the `offline` project, over the 60-item, 90-minute
  supervised reading form:
  1. It answers half by keyboard and flags two.
  2. It waits past a checkpoint and reloads.
  3. It asserts the answers, the flags and the clock came back.
  4. It drops the network, finishes and submits offline.
  5. It asserts the band and raw score on results equal an independent `scoreExam` over the committed
     files, and "Paused once".

  Axe runs on the picker, a runner item, the navigator, the submit dialog and results. A hermetic
  `e2e/exam.spec.ts` runs a fixture exam from the picker to the review queue.
- **Found by journey 3, and fixed at the source** (D87):
  - Enter on an option's `<button role="radio">` also clicked it, answering the next item.
  - `Dialog` gave focus back a task late.

**Proven to bite, each reverted afterwards:**
- `AMBER_MS` at 9 minutes → `rules.test.ts` "puts the thresholds at ten and two minutes" failed.
- `parseExamRun` dropping `resumes` → 2 failed, in `records.test.ts` and `data-rights.test.ts`.
- A `pilot` field on the review rows → `results.test.ts` "…pilots included and indistinguishable" failed.
- The exam `primary` lightened to `#AAB3BD` → the contrast gate failed three pairs, among them "exam light:
  --primary on --bg clears 3:1 (is 1.91:1)".

**Existing tests changed, and why:**
- `exam-run.test.ts` "resumes the latest unsubmitted run…" now expects `resumes: 1` and the new checkpoint,
  which is ruling 1's behaviour (D85).
- `tokens.test.ts`'s pinned names gained `warning`.
- `offline.spec.ts`'s helper moved to `helpers.ts`, with no assertion changed.
- The `journeys.spec.ts` titles test gained two routes.
- Every local `ItemRepository` stub gained `forms`.

**Gates:**
```
pnpm verify                     → exit 0: check-types, lint, boundaries ("no dependency violations" ×2),
                                  Test Files 125 passed, Tests 1765 passed | 8 todo
pnpm --filter @palier/web build → prepare-public: … v2 precached; sw.js …, 14 route(s) × 2 locale(s)
pnpm verify:medium              → exit 0: integration Tests 39 passed; Playwright 33 passed
pnpm --filter @palier/web bundle-size → shared first-load JS 165.7 KB of 180.0 KB, within budget
pnpm --filter @palier/web lighthouse  → exit 0, 12 URLs × 5 runs; median performance 1.0 and accessibility 1.0
                                  on every URL except /en/review at 0.99 performance; /en/exam, /fr/exam/run
                                  and /en/exam/results 1.0 / 1.0; max CLS 0
```
- **Branch coverage of the new code:** `features/exam/*.ts`, `exam-report.ts`, `exam-run.ts`,
  `export-document.ts`, `sub-skill-breakdown.ts`, ui `logic.ts`, `tokens.ts` and `css.ts` are at 100%.
  `http-bank-repository.ts` is at 94.4% (unchanged apart from `forms()`, which is covered).

**Not done here, by design:**
- §14's "discard" of a run in progress (D87);
- the telemetry opt-in and the post-exam prompt (Slice 4b);
- Slice 4a, now *Next, decided*.

### 25 September 2026 — `dougkeefe/next-slice-from-progress` (Gate D resolved)

- **Gate D resolved by the human** (D84). PRD §8.4–§8.5 are adopted with twelve rulings: 1–8 and 10–12
  as recommended, and 9 reversed, so pilot items are never revealed to the user.
- Ruling 9 amends architecture.md §7.5 in place, with a dated note, and the `ExamForm.pilotItemIds`
  comment. It also fixes how ruling 10's "add to review queue" is keyed, so that it cannot expose pilots.
- The PRD §8.4 and §8.5 amendment notes point at D84.
- *Next, decided* is rewritten: **Phase 3 Slice 3**, the runner and results UI and journey 3, then
  Slice 4a.
- `implementation-plan.md` §7 is mirrored.
- Documentation only; no code changed, so no gates were rerun.

### 24 September 2026 — `dougkeefe/next-slice-from-progress` (Phase 3 Slice 2: forms and a bank that can fill them)

**Built.** The decisions are recorded in D82 and D83.
- **`pipeline/forms.ts`**: one form per profile variant. The draw is stratified over sub-skills and
  bands, pilots are evenly spaced, the cuts and minutes are copied from the variant, and a shortfall is
  loud.
- **`checkForms` hardened**: it now checks the variant, the pilot count, the minutes, the cuts, each
  item's skill and language, and the schema. The CLI writes no bank with a form issue.
- **The scripted provider rebuilt**: SHA-256 word picks, and band and type in the seed.
- **The run**: it is sized from the profile (`--per-source`, default 2), carries `v{n−1}` forward,
  refuses to overwrite a published version without `--force`, and defaults to v2.
- **`content/bank/v2`**, written by `PALIER_NOW=2026-09-24T00:00:00.000Z node apps/factory/dist/index.js run`:
  ```
  run: 232 published / 368 drafted, yield 0.630, cost/item 0.072069 USD
  discard reasons: {"defensible-distractor":66,"key-mismatch":30,"register":70}
  bank v2: 242 items, forms fr-reading-supervised-v2, fr-reading-unsupervised-v2, fr-writing-supervised-v2, fr-writing-unsupervised-v2
  ```
  - Shards: reading 91, writing 100 + 51. There are 24 passages, and all 10 of v1's item ids are
    present. `git diff --stat content/bank/v1` is empty.
  - Gzipped: about 30 KB for the whole version.
- **`committed-bank.test.ts`** holds v2 byte-identical, file by file, to a fresh run through the CLI's
  own `runInputFor`, and holds the batch report equal to the committed one.
- **Web**:
  - `BANK_VERSION` 2;
  - the worker precaches the current version only, and the build fails without its bank;
  - the e2e specs take the manifest from `BANK_VERSION`;
  - the offline test also reads every form;
  - the adapter test over the committed v2 checks every form resolving and v1's ids carried.
- **Journey 8's race** (D82): a demand made mid-run is re-run instead of dropped. The status line
  carries `aria-busy`, and the helper waits for its own pull, then for the status to stop being busy.

**Proven to bite, each reverted afterwards:**
- One byte of a v2 reading shard changed (`distracteur 1` → `distracteur 7`) → `committed-bank.test.ts`:
  "is byte-identical to a fresh run of the pipeline, file for file" failed, naming
  `bank/v2/fr/reading/0927dad4c659c26e.json`.
- A pilot dropped in `forms.ts` (`.slice(1)` on `pilotItemIds`) → 11 `forms.test.ts` cases and the
  committed-bank test failed. The domain schema's "cut table tops out at…" rule throws inside the stage.

**Existing tests changed, and why:**
- `run.test.ts`'s byte-identical rebuild passed `forms: []`, which hard-coded the old behaviour. It now
  passes the run's own forms.
- `cli.test.ts`'s two "`content/bank/v1/manifest.json` exists" checks now look for v2, because the
  default version changed on purpose. Without that change the default would overwrite the published v1.

**Gates:**
```
pnpm verify                     → exit 0: check-types, lint, boundaries ("no dependency violations" ×2),
                                  Test Files 120 passed, Tests 1609 passed | 8 todo
pnpm --filter @palier/web build → prepare-public: bank → public/content/bank (2 version(s), v2 precached)
pnpm verify:medium              → exit 0: integration Tests 39 passed; Playwright 31 passed
playwright sync.spec.ts -g "journey 8" --repeat-each=3 → 4 passed; a second full `pnpm test:e2e` → 31 passed
pnpm --filter @palier/web bundle-size → shared first-load JS 165.7 KB of 180.0 KB, within budget
pnpm --filter @palier/web lighthouse  → exit 0, 9 URLs × 5 runs; median performance 1.0 and accessibility 1.0 on every URL
```
- **Branch coverage of the new code:**

  | File | Branch |
  | --- | --- |
  | `forms.ts` | 94.7% |
  | `run.ts` | 91.7% |
  | `validate.ts` | 100% |
  | `cli.ts` | 90.7% |
  | `io.ts` | 100% |
  | `metrics.ts` | 100% |
  | `scripted-ai-provider.ts` | 96.7% |
  | `sync-triggers.ts` | 100% |

**Not done here, by design:**
- carrying *forms* forward into a later bank. That is the D82 residual, and the full-volume run's first
  task;
- the exam UI (Slice 3, behind Gate D);
- Slice 4a, now *Next, decided* while Gate D is open (D83).

### 24 September 2026 — `dougkeefe/minnetonka-v3` (Phase 3 Slice 1: the exam core)

**Built.** The work, with the decisions recorded in D80 and D81:
- **Per-variant golden fixtures.** Four `exam-band-boundaries.<variant>.golden.json` files, written by
  hand from PRD §5. `scorer.variants.golden.test.ts` drives them over
  `Object.entries(profile.variants)`, with 44 tests. The older reading-unsupervised golden is kept as
  it was.
- **The `ExamRunStore` port**, with its memory and Dexie implementations, the contract and the
  `anExamRun` builder.
- **The use cases:** `startExam`, `answerExamItem`, `flagExamItem`, `checkpointExam`, `resumeExam`,
  `submitExam` and `rescoreExam`. `answerItem`'s score-and-append half is split out as
  `recordAttempt`.
- **Exam runs as a fifth sync document type** (`"examRun"`), plus the export at version 2, import and
  wipe. A submitted exam also ends deferred registration.
- **The composition root** wires the store in, but not the exam use cases: the Slice 3 UI does that.
- **The simulator's `examAcrossPartition` phase** and the oracle checks `unrecordedExamAnswers`,
  `unsubmittedRuns` and `differingExamResults`.

**Found by the simulator: the planned exam attempt id could not converge** (D80). Over 40
three-device seeds, 53 submissions, in 17 seeds concurrent across a partition:
```
plan's rule  ${runId}:${itemId}, ts = submission   → { lost-attempt: 36, diverged: 16, merge-oracle: 15, no-quiescence: 12 }
built rule   ${runId}:${itemId}:${hash}, ts = answeredAt → { submits: 53, seedsWithConcurrentSubmits: 17, violations: 0 }
```

**Proven to bite, each reverted afterwards:**
- A cut moved in `psc-sle.json` (C 38→39, B max 37→38) → `scorer.variants.golden.test.ts`: 6 failed.
- The scorer made to count pilots → 20 failed.
- `compareExamRun` weakened so the larger `elapsedMs` beats a submission:
  - `merge.test.ts`: "keeps the submitted copy over an in-progress one…" failed;
  - the simulator, over 40 seeds: `{ unsubmitted-run: 45 }`.

  The partition oracle alone reported nothing, because it folds by `mergeRecord` itself. That is why
  `unsubmittedRuns` exists.

**Existing tests changed, and why:**
- Three data-rights tests pinned the export's field list and the per-store import counts. Each gained
  the `examRuns` field or count, because the shape changed deliberately (D81).
- `@palier/testing/in-memory`'s export-list test gained `memoryExamRunStore`.
- The `answerItem` tests are unchanged.

**Gates:**
```
pnpm verify                     → exit 0: check-types, lint, boundaries ("no dependency violations" ×2),
                                  Test Files 117 passed, Tests 1554 passed | 8 todo
pnpm test:integration           → exit 0: Tests 39 passed, incl. "holds every convergence property on 400 seeds"
                                  (memory server) and "… on 100 seeds" (route handlers on Drizzle/PGlite)
pnpm test:e2e                   → run 1: 30 passed, 1 failed (journey 8, laptop showed 13 of 19 answered);
                                  runs 2 and 3: 31 passed; journey 8 alone ×3: passed
```
- **Coverage of the new code:** `exam-run.ts`, `submit-exam.ts`, `merge.ts`, `records.ts`,
  `export-document.ts`, `sync-now.ts`, the dexie and memory `exam-run-store.ts` and `oracle.ts` are
  all at 100% branch.
- **The journey 8 failure is a race in the test's `syncNow` helper**, not in this slice. The laptop's
  settings page still shows "Last synced …" from its earlier sync, so waiting for that text can return
  before the new sync's pull lands. It is recorded in *Next, decided*, and the test is not changed here.

**Not done here, by design:**
- the exam UI, and wiring the exam use cases into `buildUseCases` (Slice 3, behind Gate D);
- the import toast's mock-exam count (Slice 3);
- the forms and the bigger bank (Slice 2, now *Next, decided*).

### 24 September 2026 — `dougkeefe/minnetonka-v3` (Phase 2 closed; Phase 3 opened)

- **Phase 2 complete.** The human confirmed three things: the live URL works, two real browsers were
  paired on it, and the link was shared with a handful of people. That was the last exit criterion,
  and it is now ticked. PR #21 had merged (`a346d19`), so its In-flight row is gone.
- **Phase 3 opened.** The §7 breakdown is expanded, and the four slices are mirrored in
  `implementation-plan.md` §7 (D79). Slice 1, the exam core, is claimed on this branch.

### 24 September 2026 — `dougkeefe/yamoussoukro` → `dougkeefe/phase-2-final-slice` (Gate C: the public deploy)

Conductor renamed the branch to `dougkeefe/phase-2-final-slice` when it was pushed as PR #21; the entries
below keep the old name. CI on PR #21 passed: both fast and both medium lanes.

- **Provisioned with the human, each step confirmed before it ran:**
  - the Vercel project `palier` in dougkeefes-projects: root directory `apps/web`, Next.js, Node 22.x, and
    connected to GitHub, so merging to `main` deploys production;
  - Neon `palier-db` through the Marketplace, free plan, **Production only**;
  - `RATE_LIMIT_SALT` generated and piped straight into Production, never printed.
- **The first deployment went to production, not preview**, because Vercel assigns a project's first
  deployment to production. It runs PR #21's green-CI code, and the build applied the migrations:
  "Applying migrations from /vercel/path0/apps/web/drizzle. / Migrations applied." That was the first real
  run of `applyWithPostgres`.
- **Smoke checks on https://palier-virid.vercel.app, all passing:**
  - `/en` → 200 with HSTS, `nosniff`, `no-referrer` and the Permissions-Policy;
  - `/api/sync` with no bearer → **401**, so the database is wired;
  - `/sw.js` → 200, `no-cache, no-store, must-revalidate`;
  - the bank manifest → 200;
  - a scripted two-device round trip through `httpSyncTransport` against the live database:
    ```
    paired into one account: true
    A pushed: 1 accepted, 0 conflicts
    B pulled: setting:smoke@1
    devices: 2
    after delete, B gets: SyncUnauthorizedError
    ```
    The test account deleted itself.
  - Lighthouse on the live URL (desktop, 3 runs each): `/en` and `/fr/practice/reading` median
    performance **1.0** and accessibility **1.0**.
- **CLI side effects, caught and undone:**
  - `vercel link` appended a short-lived `VERCEL_OIDC_TOKEN` to `.env.local`, which is a symlink to the
    main checkout's file. The two appended lines were removed, and the existing contents were untouched.
  - `vercel integration add neon` installed vendor agent skills into the working tree. They were deleted
    and never committed.
  - `docs/deploy.md` records both, plus the first-deploy-is-production rule.
- **Changed:** `apps/web` `engines.node` from `>=22.18` to `22.x`. The range made Vercel choose Node 24 and
  warn that it would auto-upgrade majors.
- **Left for the human:** pair two real browsers on the live URL, then share it with a handful of people.
  That ticks the last Phase 2 exit criterion.

### 24 September 2026 — `dougkeefe/yamoussoukro` (Slice 3: fixes from the pre-merge review)

An independent review of the branch found one serious defect, in this branch's own D74 fix, and four
lesser points. All are fixed:
- **D74 revised:** a failed redeem now sets `accountUnconfirmed`, and the next sync confirms through
  idempotent registration. The first version rolled back other devices' work after an ordinary offline
  redeem, which the reviewer reproduced. Two new tests fail against the first version.
- **D73:** ids compare by code unit, not `localeCompare`, with a contract case added.
- **D75:** one sessions read per page, not per document.
- `apps/web` pins `engines.node >=22.18`, for the type-stripped migration entry.
- **D76:** the heal phase settles unconfirmed pairings before comparing accounts (seeds 195 and 339).
- **Evidence:**
  - `pnpm verify` → green, 1413 tests (8 todo).
  - `PALIER_SIM_SEEDS=3000` → clean.
  - The simulator's fast tests → 83 passed.
  - With the flag removed, regression seed 74 fails.

### 24 September 2026 — `dougkeefe/yamoussoukro` (Slice 3, parts 4 and 5a: the gates confirmed, the deploy tooling)

- **Built** (D78):
  - `src/server/migrate.ts` + `scripts/db-migrate.mjs` + `vercel.json`: migrations at a production
    build only;
  - baseline security headers on every response, asserted on the production server;
  - the runbook `docs/deploy.md`, linked from `docs/README.md` and the root `CLAUDE.md`.
- **Gates rerun, all green:**
  - `pnpm build` → exit 0.
  - `pnpm verify:medium` → **50 s** of its 240 s budget: integration "39 passed" (both simulator
    variants among them), Playwright "31 passed" (the two new header tests among them).
  - `pnpm --filter @palier/web bundle-size` → "165.7 KB of 180.0 KB … within budget", unchanged.
  - `pnpm --filter @palier/web lighthouse` → 9 URLs × 5 runs, median performance **1.0** and accessibility
    **1.0** on every route, max CLS 0.
  - `pnpm verify` → green, 1405 tests (8 todo), boundaries clean (297 and 130 modules).
- **Every Phase 2 CI gate §7 names is now live:**
  - engine golden regression and the port contract suites, in the fast lane;
  - the sync simulator and PGlite integration, in the medium lane (`test:integration`);
  - E2E journeys 1, 2, 6, 7 and 8, in the medium lane's Playwright run;
  - the mutation check, run once (D77).

### 24 September 2026 — `dougkeefe/yamoussoukro` (Slice 3, part 3: the one-off mutation check)

- **Ran** Stryker on `@palier/engine` (D77): first 95.09%, then 98.54% after closing 14 gaps, then one
  more closed by hand. **404 of 410 mutants are detected; the 5 survivors are equivalent**, and each is
  named in D77. The exit criterion "engine unit tests exhaustive at every boundary, golden fixtures
  locked" is ticked.
- **Also fixed:** `weakestSubSkills`' tie-break (D73's gap, in the planner's targeting). Its permutation
  property failed first.
- **Evidence:**
  - `pnpm mutation` → "All files 95.09" (5 min 24 s); after the tests → "All files 98.54" (4 min 57 s);
    `git status` clean on `packages/engine/src` after each in-place run.
  - `pnpm verify` → green, 1396 tests (8 todo), boundaries clean (297 and 127 modules).

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
