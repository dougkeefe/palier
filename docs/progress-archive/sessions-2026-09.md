# Palier: Progress archive, session log, September 2026

Newest first. Moved verbatim from `docs/progress.md` on 24 October 2026 (D255). Its index there points here. The rules are
`progress.md`'s: never edit a session entry, and mark a deviation resolved in place, updating its index line too.

### 30 September 2026 — `dougkeefe/testing-before-development` (the human's studio session; the dial under 2.5 s; D190–D191)

- **The human's live session** (D191): the examiner answered, followed up, and its pacing was good; a pause is noticed but
  accepted; the cost reads accurate, and D167's estimate stays (human). D189's unended turn was the synthetic microphone.
- **The deployed site, measured before any change** (D190): twelve dials, median about 2.12 s, the first at 2.98 s on a
  cold function. **Phase 6 exit criterion 1 is ticked.**
- **The three levers** (D190): the route woken with no key on the microphone check and the pre-flight, the first secret
  minted at the tap, and the offer made beside it. **Proved to bite:** with the offer awaited after the secret, "makes
  the peer's offer while the secret is minted" failed ("secret back" before "offer made"); with no early mint, "mints the
  first secret at the start" failed. Both passed again restored.

```
PALIER_LIVE=1 PALIER_LIVE_DIALS_ONLY=1 PALIER_LIVE_BASE_URL=https://palier-virid.vercel.app \
  playwright test --project=live (×4, 90 s apart)
                           → 2977, 1718, 2375 · 2193, 2073, 2097 · 2238, 1684, 2125 · 2114, 2266, 2078 ms; 4 passed
pnpm verify                → check-types, lint, boundaries pass; test: 247 files, 3804 passed, 8 todo; exit 0
CI=1 pnpm verify:medium    → integration: 7 files, 51 passed; Playwright: 99 passed (1.5m); exit 0
                             (after `pnpm --filter @palier/web build`: the first try found no production build)
node apps/web/scripts/check-bundle-size.mjs → shared first-load JS 166.1 KB of 180.0 KB, within budget
```

### 30 September 2026 — `dougkeefe/next-slice-from-progress-v5` (Oral practice in the main navigation, human request)

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

### 30 September 2026 — `dougkeefe/next-slice-from-progress-v5` (Phase 6 Slice 2: the studio screen, on the key; D180–D189)

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
