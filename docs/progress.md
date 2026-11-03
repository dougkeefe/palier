# Palier: Progress

**Last updated:** 2 November 2026 (the fast lane back under its budget, D275; `msw` 3, rebuilt from Dependabot's #109, D273; the monthly item-statistics PR that never gets CI, D274; next, D206's bank budget)
**Current phase:** **1.0 is reached** (24 October 2026, D253): the human passed Gate O and Gate M and read bank v4 with no
disagreement, so Phases 6 and 7 are complete. After 1.0, reading's library articles are built (D254), and D206's bank
budget is next. Phase 3's product pilot still runs (Gate E, D97), and Phase 8, the English mirror, is the plan's next
phase. How the build got here, phase by phase, is in [`progress-archive/history.md`](progress-archive/history.md).

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

**This file holds current state; [`progress-archive/`](progress-archive/README.md) holds the record** (D255). Every
deviation keeps a line in the [deviation index](#deviation-index), so a reference such as `progress.md D192` still
finds D192: its line gives the title, the status and the archive file with the full text. The newest ten deviations
and the newest ten session entries stay here in full, and older ones move to the archive verbatim (rule 8).

---

## Working agreement for agent sessions

Read this section before doing anything else in this repository.

1. **Read the status table, *Next, decided* and the deviations log first.** The deviations
   log is the part you cannot reconstruct from the code. Most of it is in the archive: scan
   the [index](#deviation-index), then open the entries that touch your work.
2. **Claim before you build.** Add a row to *In flight* in your first commit on the
   branch. This is a courtesy signal, not a lock — see the honesty note below.
3. **Update in the same commit as the work.** A tick that lands in a separate commit is
   a tick that gets forgotten. If the work is not merged, the box is not ticked.
4. **Append to the session log; do not rewrite it.** New entries go at the top of the
   log, with the date, the branch and one line on what changed. Never edit an older
   entry — correct it with a newer one, the way `adr/` works. Moving an entry to the archive
   (rule 8) is not an edit: it moves byte for byte.
5. **Record a deviation the moment you make one.** Anything you did differently from
   `implementation-plan.md`, or any constraint you hit that the plan did not anticipate,
   goes in *Deviations* with its reason. A future session will otherwise re-litigate it
   or, worse, silently undo it.
6. **Do not tick an exit criterion you have not run.** Paste the command and its result
   into the session log entry. "Should pass" is not a pass.
7. **Leave the next step decided, not a menu.** Before you finish, rewrite the *Next,
   decided* section (below the in-flight table) so the session after you opens to a
   *single* unambiguous next slice: its scope, the ports and engine functions it uses, and
   what "done" looks like. The test is simple — the next session should be able to start
   building without re-deriving which direction to go. This section is **current state, so
   you rewrite it every slice** (like the status table), which is the opposite of rule 4's
   append-only session log — keep it terse *because* it is superseded, not accumulated. When
   the honest next step is a fork only a human can settle — a product or UI choice, the
   Phase 1 content go/no-go, two designs with a real trade-off — say so *in place* and name
   the gate. **A named gate is decided; a list of options is not.** If you leave a menu, you
   have handed the next session the same decision you were meant to close.
8. **Keep this file small: rotate into the archive.** At most ten deviations and ten
   session entries stay here in full, and the file outside the deviation index stays under
   1,200 lines. When an entry would break either, move the oldest entries, verbatim, to
   `progress-archive/`, in the same commit. A deviation goes to the file its number names
   (`deviations-D200-D299.md` holds D200 to D299) and leaves a line in the index. A session
   entry goes to the file of its heading's month (`sessions-2026-10.md`), newest first.
   [`progress-archive/README.md`](progress-archive/README.md) gives the steps, and
   `apps/web/src/docs/progress.test.ts` fails the fast lane until the move is made. When you
   mark an archived deviation resolved, change its index line to match.

**Honesty note on claims.** Parallel sessions work in separate worktrees branched from
`main`, so a claim is only visible to others once it merges. This file is as accurate as
the last merge and nothing more. It prevents the common case — two sessions picking the
same obvious next task — and will not prevent a genuine race. Coordinate through the
human for anything expensive.

---

## Status

| Phase | Goal | Size | State |
| --- | --- | --- | --- |
| 0 Foundations | An empty application that already enforces every rule | 2–3 wk | **complete** (every box and exit criterion is ticked, in `progress-archive/history.md`; the domain, its last box, D238) |
| 1 Content factory | Find out whether a generated bank is good enough | 3–4 wk | **built; the full-volume bank shipped** as `content/bank/v4`, written by Claude and reviewed blind by Claude, not a paid OpenAI run (human, 4 October 2026; D203, ADR 24) |
| 2 Practice MVP | Ship something publicly useful | 3–4 wk | **complete** (live 24 September 2026 at https://palier-virid.vercel.app; shared, confirmed by the human; at https://www.palier.study from 18 October 2026, D238) |
| 3 Exams and item statistics | The number users actually came for | 2 wk | **in progress** (all four slices built, exit criteria 1–4 met; the product pilot is running, human, D97) |
| 4 BYOK, generation, writing workshop | Turn on the parts that cost money, safely | 2 wk | **complete** (four slices, D97, all merged, the last as #32; D98–D112; Gate G passed; all three exit criteria met) |
| 5 Oral, practice mode | Oral rehearsal at a cost anyone can afford | 2–3 wk | **complete, one criterion deferred** (Gate H resolved; three slices, D113; Slice 1 merged, #34, exit criterion 5 met; Slice 2 merged, #35, exit criterion 3 met; Slice 3 merged, #37, D122–D127; exit criterion 4 met, D128; Gate I passed, D129; criterion 2 deferred by the human, D130) |
| 6 Oral, studio mode | The feature people tell colleagues about | 2 wk | **complete** (in 1.0, D165; three slices merged, #53, #57, #60; Gates N and O passed, D174, D253) |
| 7 Polish and hardening | 1.0 | 2–3 wk | **complete: 1.0** (five slices merged, #39, #45, #47, #51, #61; Gates K, L and M passed, D145, D164, D253; the repo is public, D195) |
| 8 English mirror | Prove the architecture | 2 wk | not started |

The checklists of every complete phase (0, 1, 2, 4, 5, 6 and 7) are in
[`progress-archive/history.md`](progress-archive/history.md). Phase 3's and Phase 8's are [below](#phases-still-open).

Task states: `[ ]` not started · `[~]` in flight · `[x]` done and verified · `[!]` blocked or deferred, with a note.

### In flight

| Branch | Task | Session started |
| --- | --- | --- |
| `dougkeefe/dependabot-alerts-resolve-v2` | **The open Dependabot alerts**: three dev-only transitive packages refreshed within their parents' ranges, and Lighthouse's `zod` 3 dismissed as unreachable (D261). **E2E in three shards** (D262). | 26 October 2026 |
| `dougkeefe/image-clickable-bars` | **The staircase is the result picker**: a skill's result is picked by tapping its step, Coco hops there, and the pill row is gone (D263). | 26 October 2026 |
| `dougkeefe/settings-shared-menu` | **One settings area**: `/settings` lists levels, the key, your data and sync, each screen carries one menu, and a gear at the header's top right and one footer link lead there (D264). | 27 October 2026 |
| `dougkeefe/settings-subsections-navigation` | **Each settings screen opens with "On this page"**: a pill row of links to its sections, each landing on its card (D266). **The app header folds into a menu below 1100px** (D267). **Every component has a unit test, or a line on a list that only shrinks** (D268). | 28 October 2026 |
| `dougkeefe/liny0` | **Onboarding redrawn**: a focus frame with no navigation, sync status or settings, Coco on every card, a welcome and a "you're set" card in place of the direction and placement questions, Skip from the results on, and no assessment first (D269). **Every app page waits for onboarding**, but for the translator, about, privacy and the library, and the welcome offers, in small type, to bring progress from a file or another device; every card fits a desktop screen without scrolling (D270, D271); the welcome cut to one line, and the review's smaller fixes (D272). | 31 October 2026 |
| `dougkeefe/pull-requests-next-steps` | **`msw` 3**, rebuilt here in place of Dependabot's #109: `onUnhandledRequest` is `onUnhandledFrame` (D273). **The monthly item-statistics PR never gets CI**, recorded and not yet fixed (D274). **The fast lane back under its budget**: `tsc`'s check cache kept between runs, one Vitest worker per core on CI (D275). | 1 November 2026 |

*(Merged rows are removed: this table tracks current work, and the session log is the permanent record. The rows
removed up to 24 October 2026, the last of them the reading articles (#100), are listed in
[`progress-archive/history.md`](progress-archive/history.md); the library's redesign (#102) was removed with D257's claim, and the library's grid (#103) with D258's, and the translator's no-key card (#104) with D259's, and the SLE results a user holds (#105) with D261's.)*

---

## Next, decided

**1.0 is reached** (D253, the human, 24 October 2026). Gate O and Gate M passed, and the human read bank v4 with no
disagreement, so ADR 24 stands and Phases 6 and 7 are complete. **Reading's library articles are built** (D254,
`dougkeefe/palier-reading-comprehension-add`), the first of Gate K's after-1.0 items (D145). XP, levels and the countdown are still named, not
scheduled, and Phase 8, the English mirror, is the plan's next phase.

**Next: D206, the bank's first fetch back under architecture.md §13's 400 KB.** Bank v4 is about 515 KB gzipped, because
`apps/web/src/sw/worker.ts` precaches every shard the manifest lists. It is the one known budget breach on the live site,
and it costs a first visit on a phone the most.
- **The choice is the human's** (D206 left it for them): lazy shard fetch, precaching only the study profile's skill, or
  an amended budget. **The agent recommends the second, with the first behind it**: precache the manifest, the forms and
  the shards of the skill the user studies, and fetch any other shard on first use, then cache it. An amended budget
  would hide the cost rather than remove it.
- **Then the slice:** the worker learns which shards to precache, from a list the page hands it, since the worker has no
  runtime imports and cannot read the study profile; the bank adapter's shard fetch goes through the worker's runtime
  cache, so a shard missed online is fetched once; and a test enforces the budget, which until now nothing did (D206).
- **R4 must hold:** `offline.spec.ts`'s "every shard and form of the served bank is readable offline" becomes "every
  shard of the studied skill", and a shard of the other skill, once opened online, stays readable offline. That is a
  change to R4's reach, so it needs the human's yes with the choice.

*Done:* a first visit's bank bytes under 400 KB gzipped, enforced by a test that fails on a deliberate breach, the
offline journeys green, and R4's reach stated in the deviation.

**For the human, from D267:** on a phone, open the menu beside the gear on any page in both languages, follow a
destination, and say whether sync and the language belong in the panel or beside the gear.

**For the human, from D266:** open each settings screen (`/en/settings/key`, `/data`, `/sync`, and `/study` once
onboarded), on a phone too, and try each link in "On this page". Read the new French (`settings.sectionsLabel` and
`settings.sections`), and say whether any label should simply repeat its card's title.

**For the human, from D264:** open the gear at the header's top right, then each card on `/en/settings` and
`/fr/settings`, on a phone too. Read the new French (`nav.settings`, `footer.settings` and the `settings` namespace, the
cards' descriptions especially), and say whether two steps to export, delete and the key is acceptable, or whether any
of the four deserves its direct footer link back.

**For the human, from D259:** go through onboarding declaring a result in each skill (`/en/start`, then `/fr/start`), then
open Today and `/settings/study`, on a phone too. Read the new French (`start.targetPerSkill` to `start.placementNothing`,
the `levels` and `studySettings` namespaces, `today.skillExempt` to `today.allExemptWriting`, `privacy.held`), the stamp's
"Exemption" especially, and say whether the staircase and the stamp read as fun or as noise. Two choices are the agent's
and are easy to change: a skill held at its target keeps half a session, and the targets offered are B and C only.

**For the human, from D254:** read the eight reading articles' French and English (`/fr/library` and `/en/library`,
the reading section), as Gate L read writing's. In particular, say whether each excerpt reads as federal administrative
French and whether each "what to notice" is the only defensible reading.

**For the human, from D257:** look at the library's grid, its pills and its nineteen photographs (`/en/library`, the
pills, an article in each skill, and on a phone), and read the new French strings (`library.filterLabel` to
`library.readArticle` in `fr.json`), the short skill names *Lecture* and *Rédaction* especially. Say whether any photograph
should be swapped, or any article sits under the wrong topic; `components/library/images/SOURCES.md` says how to swap a
photograph, and an article's `topic` is one line in its JSON.

**Beside it, whenever a smoke key is to hand (agent):**
- **The translator's completions, recorded** (D250, two calls on the `assess` model, a few cents): the same
  `live-smoke --record` run writes `packages/testing/src/recorded/openai/translate.json`. Add its line to `RECORDED_RUNS`,
  `"translate"` to the replay test's coverage set and the method to the factory's `CONFORMANCE_METHODS`, and copy the
  printed `translation` figures into `pricing.json` over the placeholder.
- **The diagnostic's interpretation, recorded** (D211, about US$0.12): `pnpm --filter @palier/web live-smoke --record` writes
  `packages/testing/src/recorded/openai/interpretDiagnostic.json`. Add its line to `RECORDED_RUNS`, `"interpretDiagnostic"`
  to the replay test's coverage set and the method to the factory's `CONFORMANCE_METHODS`, and copy the printed
  `diagnostic-interpretation` figures into `pricing.json` over the placeholder.
- **The dial measured on `main`** (D190, D194, about US$0.10). Run the dials-only spec on the deployed site four times, 90 s
  apart:
  ```
  cd apps/web && (set -a; . ../../.env.local; set +a; PALIER_LIVE=1 PALIER_LIVE_DIALS_ONLY=1 \
    PALIER_LIVE_BASE_URL=https://www.palier.study pnpm exec playwright test --project=live)
  ```
  *Done:* the twelve figures in the session log beside D190's. Over 2.5 s median, find the step that moved first. It needs
  `OPENAI_SMOKE_KEY` in `.env.local` at the repository root.

Budget note (D178): a change to a core package puts the fast lane near 92 s of its 120 s. On this machine `pnpm verify` took
48 s for Slice 5. A fresh worktree needs `pnpm --filter @palier/web build` first, or the medium lane's production server
cannot start, and `pnpm exec playwright install chromium` if Playwright's browser is missing.

**Open for the human** (items left by earlier slices, gathered here by D255; the done ones are in the session log):
- **look at the milestone moment and Coco's cheering pose** (seed or reach a milestone; D159, D160) and the self-hosted type
  (D161), and say whether either needs another pass;
- the share card's text names Palier as "free, unofficial" and the SLE: confirm that wording (the repo is public already,
  D195);
- an authored item's model review runs on the next funded bank build (D152);
- **`curl -s https://www.palier.study/api/health`** should answer `{"build":"<7 hex>","bank":4,"database":"ok"}`
  (`docs/deploy.md`'s smoke checks);
- add the **`RETENTION_DATABASE_URL`** Actions secret, with the same value as Production's `DATABASE_URL` (D138), and the
  **`PLAN_STORAGE_MB`** variable (`512` on Neon's free tier);
- then **run the retention workflow by hand as a dry run** before its first scheduled run deletes (D138). The script has not
  yet run against a real Postgres;
- **read the red-team result** (D136) and say whether any path it did not try should be tried;
- **listen to the examiner's voice** (`tts-1`, "sage") in French, and say whether it will do or another voice should be data in
  `ai-models.json`;
- read the `generate`, `oral` and **`oralReport`** namespaces' French, with the rest of Phase 7's R8 review;
- **a human read of the six workshop prompts' French** (D107), with the rest of Phase 7's R8 review;
- **set `PALIER_SITE_URL` to `https://www.palier.study`** in Vercel's Production environment and redeploy. On 18 October
  2026 the deployed `0571cf1` still named `https://palier.dougkeefe.com` in every canonical and `hreflang` link, in
  `robots.txt` and in the sitemap (D238). Then say whether `palier-virid.vercel.app` and `palier.dougkeefe.com` should
  redirect to the new domain. That choice is D238's; a redirect leaves a user's local data behind on the old origin;
- the pilot's calibration half rerun on real items (D97, D203).

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
- **a measured studio minute in `pricing.json`**: the human kept D167's estimate (D191), so it is replaced only if a measured
  session says otherwise;
- reading-set generation (D110);
- **one `debiasKeyPosition`** in domain for the factory and the browser (finding 16);
- **the vocabulary queue** (PRD §8.6's "added to the vocabulary queue"): v1's `vocab` table behind a port and a vocabulary item
  type in the registry (ADR 17);
- **transcript sync with playback for practice mode** (PRD §8.6). A studio recording plays from each spoken answer (D187),
  but a practice recording is paused between answers, so its places are not the turns';
- **a drill filtered to one sub-skill**, so a fix's link lands on that sub-skill today rather than biasing the next plan (D124);
- **fillers the transcription drops**: asking the transcription to keep hesitations (its `prompt` parameter) (D123);
- **the first single-record delete**, which will write the tombstones the retention job already purges (D138);
- **the 60% aggregation** as code, written when the storage alert first fires (`docs/deploy.md`, D139);
- **`global-error.tsx` reached end to end**: only its view is checked, since the root layout works (D142);
- **the wipe guard across tabs**: a `BroadcastChannel` so a wipe in one tab forgets the requests out in every tab (D143);
- **an abandoned session's end at its last turn**, not when it was noticed, so its length reads true (D144; the pinned
  tests move with it);
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

**Standing human gates (do not self-direct):** Gate J, above, is the one still open. Gates A to I and K to O are
resolved, each recorded in its deviation (the index names them), and so is Phase 6's decision gate (D131, then D165).

---

## Phases still open

Each phase's work breakdown lives in `implementation-plan.md` §7 and is expanded into
tasks here **when the phase starts**, not before. Only the exit criteria are tracked
in advance, because they are the actual gate.

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

### Phase 8: English mirror

- [ ] Factory re-run with the mirror configuration
- [ ] **Zero application code changes.** Any change required is a defect in phases 0–7 to be understood, not an expected cost

---

## Requirement coverage

From `implementation-plan.md` §8. Status is *satisfied and verified*, not *worked on*.

| # | Requirement | Phase | Status |
| --- | --- | --- | --- |
| R1 | Practises all three tested skills | 2, 5, 6 | reading and written expression practised end to end (24 September 2026); **oral in practice mode** since Phase 5 (28 September 2026, Gate I, D129); **studio mode is in 1.0** (D165): Slices 1–3 built (D166–D194), and its real-browser pass made at Gate O (D253) |
| R2 | Format and register match the real tests | 1 | **built, verified at the full-volume bank**: the factory's register and format gates run on every batch (Phase 1, D51–D54) and passed on the baseline bank; Gate L read the bank's register (D164). **The full-volume bank, v4, is 626 items written to §13.1's register and reviewed blind for it** (D203, ADR 24); the human read a sample and disagreed with none (D253) |
| R3 | Mock exams mirror published structure and cuts | 3 | **satisfied for reading and written expression** (25 September 2026): goldens at every cut (Slice 1), a form per variant at its exact counts, time and cuts (Slice 2), and all four variants runnable and scored in the app (Slice 3). Since v4 the forms are drawn from real French, authored by Claude (D203) |
| R4 | Works with no key and offline after first load | 2 | practice and progress verified offline (journey 2 on the `offline` project, 24 September 2026); mock exams too: journey 3 finishes and submits a full exam with the network off and reads its results offline (25 September 2026) |
| R5 | Never presents as official | 0, 7 | **satisfied and verified**: the statement in every footer since Phase 0, beside every band estimate and at the head of onboarding (Gate K, D145; Slice 3, D146), through one component, `NonAffiliation.tsx`; read in both languages at Gate L (D164) |
| R6 | No real test items, no PSC reproduction | 1 | **built, verified at the full-volume bank**: the factory generates every item and its review gate refuses a reproduction (Phase 1, D51–D54); authored items attest originality (`CONTRIBUTING.md`, D152). **v4's 626 items are original by brief, fictional and checked for stage 5's rules** (D203) |
| R7 | Rationale per option, explanation per item | 1 | **built, verified at the full-volume bank**: the item schema requires both and the factory's deterministic checks refuse a draft without them (Phase 1); every committed item carries them, **v4's 626 included, in both languages** (D203) |
| R8 | Fully bilingual, equal prominence | 0, 1, 7 | **satisfied and verified**: key parity is a fast-lane gate since Phase 0, the toggle has equal prominence, and every string was read by a human at Gate L (D164). Copy added since (studio mode, the self-hosted endpoint, Slice 5, and the screens since Gate L) was read at Gate O (D253) |
| R9 | WCAG 2.2 AA | 0, all | **satisfied and verified**: axe on every route and session state and the contrast test on the token set are build gates since Phase 0 (ADR 13); the VoiceOver and NVDA pass at Gate L found nothing (D164) |
| R10 | No estimate without evidence and uncertainty | 2 | satisfied and verified (24 September 2026): below `MIN_EVIDENCE` a band shows no bar, only how many more answers it needs; above it, the Wilson interval is drawn beside the estimate (journey 1, `trend-lines.test.ts`, `BandMeter` tests) |
| R11 | Export, import, delete, each in one action | 2, 7 | **satisfied and verified**: `/settings/data` exports, imports and deletes in one action each (journey 6), and delete-everywhere removes the server copy too, with sync (Phase 2 Slice 2) |
| R12 | Key, audio, transcripts and submissions stay local | 4, 5 | **the key half is satisfied and verified** (26 September 2026). The tier-11 key-leak test asserts the sentinel reaches no origin but `api.openai.com`, no storage but the vault's ciphertext, no synced document, no export and no error (D100). **The writing half is satisfied and verified** (26 September 2026, Slice 3): the leak guard follows a submission's text and finds it only in requests to `api.openai.com` and in this device's own copy (the page, the field, `writingSubmissions`), never in a push, a pull, an export, Web Storage or the paired phone; proven to bite three ways (D106). **Runtime-generated items are held the same way** (27 September 2026, Slice 4, D110): a generated stem reaches only OpenAI, in review requests, and this device's `generated` table and page. It never appears in a push, an export, Web Storage or on the paired phone, and no attempt is ever written for it. Audio and transcripts are Phase 5: **the store that holds them is device-local by construction** (27 September 2026, Slice 1, D115). It is never synced and never exported, and a wipe and a delete-everywhere clear it, over both graphs. **The audio half is satisfied and verified** (27 September 2026, Slice 2, D120): each answer's clip reaches only OpenAI's transcription endpoint; the session recording reaches no request at all; and the transcript stays on this device, going back to OpenAI only in the examiner's next question and never to a push, an export, Web Storage or the paired phone. Proven to bite three ways |
| R13 | Free and source-available, non-commercial (amended by the human, 29 September 2026, D153) | 0, 7 | licences committed (PolyForm Noncommercial 1.0.0 and CC BY-NC-SA 4.0, ADR 23); **the repository is public** (human, confirmed 2 October 2026, D195); **an outside item submission was made at Gate M** (D253). **Satisfied** |
| R14 | Progress across devices, with an off switch | 2 | satisfied and verified on the hermetic lane (24 September 2026): journey 8 pairs two devices by code and both show the same progress; the switch is tested off, with server deletion offered, in `sync.spec.ts`. A public deployment with a real database is Slice 3 |

Eleven of fourteen are covered by the end of phase 3. That is the evidence behind
"stopping after phase 3 leaves a complete product".

---

## Deviations

Things done differently from `implementation-plan.md`, or constraints the plan did not
anticipate. Add to this list; do not remove entries. When a deviation is resolved, mark
it and say what resolved it.

### Deviation index

One line for every deviation whose full text is in [`progress-archive/`](progress-archive/README.md): its number,
its title, its status and the file that holds it, which its number names (D255). The newest ten follow the index in
full.

- **D1** — Default-export ban is enforced in `apps/web` only · RESOLVED 19 September 2026 → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d1--default-export-ban-is-enforced-in-appsweb-only)
- **D2** — `apps/web` is excluded from the root `tsc -b` solution · accepted, permanent → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d2--appsweb-is-excluded-from-the-root-tsc--b-solution)
- **D3** — `@palier/adapters` subpath exports deferred · partially resolved → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d3--palieradapters-subpath-exports-deferred)
- **D4** — Per-package `CLAUDE.md` files not yet written · RESOLVED 19 September 2026 → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d4--per-package-claudemd-files-not-yet-written)
- **D5** — One root ESLint config; `apps/web/eslint.config.mjs` deleted · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d5--one-root-eslint-config-appswebeslintconfigmjs-deleted)
- **D6** — dependency-cruiser cruises `src` and resolves through `dist` · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d6--dependency-cruiser-cruises-src-and-resolves-through-dist)
- **D7** — Vitest installed with the gates, not with the test infrastructure · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d7--vitest-installed-with-the-gates-not-with-the-test-infrastructure)
- **D8** — ESLint held at 9.39.5 although 10 is current · open, revisit when the peer range widens → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d8--eslint-held-at-9395-although-10-is-current)
- **D9** — One root Vitest process, and why the integration lane is gated by an env var · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d9--one-root-vitest-process-and-why-the-integration-lane-is-gated-by-an-env-var)
- **D10** — Test files may import `@palier/testing`; nothing else is relaxed · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d10--test-files-may-import-paliertesting-nothing-else-is-relaxed)
- **D11** — `playwright.config.ts` joins the default-export exemption list · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d11--playwrightconfigts-joins-the-default-export-exemption-list)
- **D12** — `writing-unsupervised` carries an inferred `X 0-10` band · resolved 25 September 2026 by D96 → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d12--writing-unsupervised-carries-an-inferred-x-0-10-band)
- **D13** — The item type registry is deferred, and wants ADR 16 · RESOLVED 19 September 2026 by ADR 17 → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d13--the-item-type-registry-is-deferred-and-wants-adr-16)
- **D14** — zod's NodeNext declaration risk was checked and did not materialise · closed → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d14--zods-nodenext-declaration-risk-was-checked-and-did-not-materialise)
- **D15** — `CLAUDE.md` is the canonical root document; `AGENTS.md` points at it · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d15--claudemd-is-the-canonical-root-document-agentsmd-points-at-it)
- **D16** — ADR numbers are assigned on acceptance, not reserved in advance · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d16--adr-numbers-are-assigned-on-acceptance-not-reserved-in-advance)
- **D17** — Ten contradictions between documents, resolved rather than carried · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d17--ten-contradictions-between-documents-resolved-rather-than-carried)
- **D18** — `ISO`, `Clock` and `Random` live in `@palier/app`, not `@palier/domain` · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d18--iso-clock-and-random-live-in-palierapp-not-palierdomain)
- **D19** — `ScheduleEntry` is minimal until the scheduler lands · RESOLVED 20 September 2026 by D38 → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d19--scheduleentry-is-minimal-until-the-scheduler-lands)
- **D20** — `ItemCriteria` and the in-memory query semantics decided ahead of the `Selector` · open until the engine `Selector` lands → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d20--itemcriteria-and-the-in-memory-query-semantics-decided-ahead-of-the-selector)
- **D21** — `@palier/ui` gains React (peer) and a jsdom test lane · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d21--palierui-gains-react-peer-and-a-jsdom-test-lane)
- **D22** — `@palier/ui` token CSS: TS source of truth, generated CSS under a drift guard · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d22--palierui-token-css-ts-source-of-truth-generated-css-under-a-drift-guard)
- **D23** — The composition root lives at `apps/web/src/lib/container.ts`, not `apps/web/lib/` · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d23--the-composition-root-lives-at-appswebsrclibcontainerts-not-appsweblib)
- **D24** — Locale negotiation uses `proxy.ts` (Next.js 16 renamed Middleware to Proxy) · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d24--locale-negotiation-uses-proxyts-nextjs-16-renamed-middleware-to-proxy)
- **D25** — Tailwind removed from `apps/web`; the design system is `@palier/ui` · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d25--tailwind-removed-from-appsweb-the-design-system-is-palierui)
- **D26** — Lighthouse and bundle-size gate tooling · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d26--lighthouse-and-bundle-size-gate-tooling)
- **D27** — The French non-affiliation string was a Canadian-French draft, now confirmed · RESOLVED 19 September 2026 → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d27--the-french-non-affiliation-string-was-a-canadian-french-draft-now-confirmed)
- **D28** — `ItemResponse` is an alias for `OptionId` until a non-MCQ type lands · open, closes when a non-multiple-choice type is added → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d28--itemresponse-is-an-alias-for-optionid-until-a-non-mcq-type-lands)
- **D29** — `PromptSpec` is minimal until the content factory lands · open, closes with `apps/factory` → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d29--promptspec-is-minimal-until-the-content-factory-lands)
- **D30** — Lighthouse runs the median of five, not a single run · accepted, corrects D26 → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d30--lighthouse-runs-the-median-of-five-not-a-single-run)
- **D31** — The canonical fixture bank seeds forms and a scenario, not only items · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d31--the-canonical-fixture-bank-seeds-forms-and-a-scenario-not-only-items)
- **D32** — The engine receives time and randomness as primitives, not the ports · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d32--the-engine-receives-time-and-randomness-as-primitives-not-the-ports)
- **D33** — Selector: Efraimidis–Spirakis sampling, and diagnostic mode is uniform · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d33--selector-efraimidisspirakis-sampling-and-diagnostic-mode-is-uniform)
- **D34** — The Planner budgets in item counts, not minutes · RESOLVED 24 September 2026 by D63 → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d34--the-planner-budgets-in-item-counts-not-minutes)
- **D35** — Oral-session-findings injection is deferred to Phase 5 · resolved 28 September 2026 by D124 → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d35--oral-session-findings-injection-is-deferred-to-phase-5)
- **D36** — The first `@palier/app` use case: `planDailySession`, and its input boundary · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d36--the-first-palierapp-use-case-plandailysession-and-its-input-boundary)
- **D37** — `@palier/app` unit tests use local port stubs, not `@palier/testing` · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d37--palierapp-unit-tests-use-local-port-stubs-not-paliertesting)
- **D38** — `ScheduleEntry` completed and `ScheduleStore.get` added; §3.3 amended in place · accepted, closes D19 → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d38--scheduleentry-completed-and-schedulestoreget-added-33-amended-in-place)
- **D39** — The `attemptId` is caller-supplied; nothing in the app mints one · open, closes with an `IdGenerator` port → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d39--the-attemptid-is-caller-supplied-nothing-in-the-app-mints-one)
- **D40** — The "slow" judgement stays with the caller; no threshold is invented · open, revisit when there is timing data → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d40--the-slow-judgement-stays-with-the-caller-no-threshold-is-invented)
- **D41** — Not every answer enters the review queue · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d41--not-every-answer-enters-the-review-queue)
- **D42** — The `ExamProfile` reaches a use case as a dep; `content/` became a workspace · accepted, recorded as ADR 18 → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d42--the-examprofile-reaches-a-use-case-as-a-dep-content-became-a-workspace)
- **D43** — A synced `ScheduleEntry` has no `updatedAt`, and last-write-wins can regress a box · resolved 24 September 2026 by D69 → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d43--a-synced-scheduleentry-has-no-updatedat-and-last-write-wins-can-regress-a-box)
- **D44** — `AttemptStore.append` returns whether the id was new, so a retried answer is fully idempotent · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d44--attemptstoreappend-returns-whether-the-id-was-new-so-a-retried-answer-is-fully-idempotent)
- **D45** — `SessionStore` shape decided; §3.3 amended in place · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d45--sessionstore-shape-decided-33-amended-in-place)
- **D46** — `StartSession` and `CompleteSession`, and closing D36's `lastDayCompleted` · accepted, closes D36 → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d46--startsession-and-completesession-and-closing-d36s-lastdaycompleted)
- **D47** — `RunDiagnostic` is two use cases, and the diagnostic carries a `targetBand` it does not select on · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d47--rundiagnostic-is-two-use-cases-and-the-diagnostic-carries-a-targetband-it-does-not-select-on)
- **D48** — The `IdGenerator` port and the first `@palier/adapters` directory (`/ids`) · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d48--the-idgenerator-port-and-the-first-palieradapters-directory-ids)
- **D49** — `adapters/dexie` built as the first Phase-2 slice, ahead of the "human gate", with human sign-off · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d49--adaptersdexie-built-as-the-first-phase-2-slice-ahead-of-the-human-gate-with-human-sign-off)
- **D50** — the encrypted `KeyVault` built in Phase 2, not deferred to Phase 4 · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d50--the-encrypted-keyvault-built-in-phase-2-not-deferred-to-phase-4)
- **D51** — Phase 1 is redirected to a fully automated content factory (ADR 19) · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d51--phase-1-is-redirected-to-a-fully-automated-content-factory-adr-19)
- **D52** — `AiProvider` landed as a Phase-1 subset; §3.3 amended in place · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d52--aiprovider-landed-as-a-phase-1-subset-33-amended-in-place)
- **D53** — the openai adapter is written over `fetch`, not the `openai` SDK · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d53--the-openai-adapter-is-written-over-fetch-not-the-openai-sdk)
- **D54** — Phase 1 ran against a deterministic scripted provider; the paid run is deferred · open until the paid run → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d54--phase-1-ran-against-a-deterministic-scripted-provider-the-paid-run-is-deferred)
- **D55** — the bank adapter structure-checks the edge; it does not re-run the domain Zod schemas · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d55--the-bank-adapter-structure-checks-the-edge-it-does-not-re-run-the-domain-zod-schemas)
- **D56** — feature phases build against the baseline bank; the content run is a 1.0 gate · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d56--feature-phases-build-against-the-baseline-bank-the-content-run-is-a-10-gate)
- **D57** — Phase 2's remainder is planned as three bigger slices, mirrored in two documents · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d57--phase-2s-remainder-is-planned-as-three-bigger-slices-mirrored-in-two-documents)
- **D58** — the production clock lives beside the composition root; the selection seed is per day · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d58--the-production-clock-lives-beside-the-composition-root-the-selection-seed-is-per-day)
- **D59** — the production container is browser-only; `@palier/testing/in-memory` is its bundleable half · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d59--the-production-container-is-browser-only-paliertestingin-memory-is-its-bundleable-half)
- **D60** — the bank ships as a generated `public/` copy; the service worker is compiled from TypeScript · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d60--the-bank-ships-as-a-generated-public-copy-the-service-worker-is-compiled-from-typescript)
- **D61** — every store port gains `all()` and `clear()`; §3.3 amended in place · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d61--every-store-port-gains-all-and-clear-33-amended-in-place)
- **D62** — `importData` validates the whole file first and never overwrites a local record · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d62--importdata-validates-the-whole-file-first-and-never-overwrites-a-local-record)
- **D63** — the daily goal becomes a session size at the caller: about 1.5 minutes an item · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d63--the-daily-goal-becomes-a-session-size-at-the-caller-about-15-minutes-an-item)
- **D64** — `practiceTrend`, a sibling of `diagnosticReadout` for the readiness card · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d64--practicetrend-a-sibling-of-diagnosticreadout-for-the-readiness-card)
- **D65** — the Slice 1 UI's calls where the PRD and the requirements pull apart · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d65--the-slice-1-uis-calls-where-the-prd-and-the-requirements-pull-apart)
- **D66** — `reviewQueue`, `progressReport`, and an engine `subSkillBreakdown` for the last three screens · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d66--reviewqueue-progressreport-and-an-engine-subskillbreakdown-for-the-last-three-screens)
- **D67** — what the E2E journeys found, and the fixes (none of them test-only) · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d67--what-the-e2e-journeys-found-and-the-fixes-none-of-them-test-only)
- **D68** — app screens keep the footer below the fold, so content arriving after hydration never moves it · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d68--app-screens-keep-the-footer-below-the-fold-so-content-arriving-after-hydration-never-moves-it)
- **D69** — Gate B: the lower box wins a *concurrent* edit, detected by revision; the ledger is a new port · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d69--gate-b-the-lower-box-wins-a-concurrent-edit-detected-by-revision-the-ledger-is-a-new-port)
- **D70** — the sync backend: `apps/web/src/server`, Drizzle on Node, SHA-256 secrets, rate limits in a table (ADR 21) · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d70--the-sync-backend-appswebsrcserver-drizzle-on-node-sha-256-secrets-rate-limits-in-a-table-adr-21)
- **D71** — no `adapters/vault`; the sync adapter takes its credential from the root; a hermetic page load is its own device · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d71--no-adaptersvault-the-sync-adapter-takes-its-credential-from-the-root-a-hermetic-page-load-is-its-own-device)
- **D72** — the sync UI's calls: an "on" state, a delayed "Syncing…", local delete stays local, journey 7's sync half is hermetic · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d72--the-sync-uis-calls-an-on-state-a-delayed-syncing-local-delete-stays-local-journey-7s-sync-half-is-hermetic)
- **D73** — the trend is a function of the attempt *set*: ties break by id, and `recent` orders by id everywhere · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d73--the-trend-is-a-function-of-the-attempt-set-ties-break-by-id-and-recent-orders-by-id-everywhere)
- **D74** — a pair redeem that fails in transit forgets the device's identity and ledger · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d74--a-pair-redeem-that-fails-in-transit-forgets-the-devices-identity-and-ledger)
- **D75** — sync settles against the live record, not the snapshot it read before the network call · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d75--sync-settles-against-the-live-record-not-the-snapshot-it-read-before-the-network-call)
- **D76** — the sync simulator: where it lives, what it asserts, and what it cannot see · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d76--the-sync-simulator-where-it-lives-what-it-asserts-and-what-it-cannot-see)
- **D77** — the one-off mutation check: Stryker on the command runner, run in place; 14 gaps closed, 5 equivalents · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d77--the-one-off-mutation-check-stryker-on-the-command-runner-run-in-place-14-gaps-closed-5-equivalents)
- **D78** — deploy tooling: migrations at a production build only, baseline headers now, the retention jobs in Phase 7 · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d78--deploy-tooling-migrations-at-a-production-build-only-baseline-headers-now-the-retention-jobs-in-phase-7)
- **D79** — Phase 3 is planned as four slices, mirrored in two documents · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d79--phase-3-is-planned-as-four-slices-mirrored-in-two-documents)
- **D80** — an exam run lives in the session id space, and an exam attempt is a pure function of its answer · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d80--an-exam-run-lives-in-the-session-id-space-and-an-exam-attempt-is-a-pure-function-of-its-answer)
- **D81** — the export format is version 2, and version 1 files still import · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d81--the-export-format-is-version-2-and-version-1-files-still-import)
- **D82** — forms are assembled per variant; bank v2 carries v1 forward; the scripted provider was rebuilt to fill it · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d82--forms-are-assembled-per-variant-bank-v2-carries-v1-forward-the-scripted-provider-was-rebuilt-to-fill-it)
- **D83** — Slice 4 is split, so work continues while Gate D is open · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d83--slice-4-is-split-so-work-continues-while-gate-d-is-open)
- **D84** — Gate D: PRD §8.4–§8.5 adopted with twelve rulings, and pilots are never revealed · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d84--gate-d-prd-8485-adopted-with-twelve-rulings-and-pilots-are-never-revealed)
- **D85** — the exam core's additions for the UI: two optional run fields, `forms()`, and what counts as a pause · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d85--the-exam-cores-additions-for-the-ui-two-optional-run-fields-forms-and-what-counts-as-a-pause)
- **D86** — the exam token set, a tenth `warning` token, and `Dialog` and `Timer` in `@palier/ui` · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d86--the-exam-token-set-a-tenth-warning-token-and-dialog-and-timer-in-palierui)
- **D87** — the exam UI's calls, and three defects journey 3 found · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d87--the-exam-uis-calls-and-three-defects-journey-3-found)
- **D88** — Slice 4 is one slice again · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d88--slice-4-is-one-slice-again)
- **D89** — the pre-merge review: ruling 10's button keying gave pilots away, and seven more fixes · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d89--the-pre-merge-review-ruling-10s-button-keying-gave-pilots-away-and-seven-more-fixes)
- **D90** — the medium lane ran out of budget on PR #25, and Lighthouse now has its own port · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d90--the-medium-lane-ran-out-of-budget-on-pr-25-and-lighthouse-now-has-its-own-port)
- **D91** — the medium lane's budget is 5 minutes · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d91--the-medium-lanes-budget-is-5-minutes)
- **D92** — telemetry is two ports, the consent is device-local, and saying yes on the prompt shares that exam · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d92--telemetry-is-two-ports-the-consent-is-device-local-and-saying-yes-on-the-prompt-shares-that-exam)
- **D93** — the telemetry route: Node, its own repository, a date and no identity · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d93--the-telemetry-route-node-its-own-repository-a-date-and-no-identity)
- **D94** — the retirement rules are profile data, one report file, and a retirement takes effect at the next bank build · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d94--the-retirement-rules-are-profile-data-one-report-file-and-a-retirement-takes-effect-at-the-next-bank-build)
- **D95** — Gate E: what the closed pilot runs on · resolved 25 September 2026 by D97 → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d95--gate-e-what-the-closed-pilot-runs-on)
- **D96** — three standing items settled: D89 confirmed, D12 verified, the name is Palier · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d96--three-standing-items-settled-d89-confirmed-d12-verified-the-name-is-palier)
- **D97** — Gate E: a product pilot now; Phase 4 is four slices, its screens adopted as written, and a funded key when needed · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d97--gate-e-a-product-pilot-now-phase-4-is-four-slices-its-screens-adopted-as-written-and-a-funded-key-when-needed)
- **D98** — do-not-remember mode is a `KeyVault` option, held in the adapter's closure · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d98--do-not-remember-mode-is-a-keyvault-option-held-in-the-adapters-closure)
- **D99** — `AiProvider.verifyKey`, a factory made inside `withApiKey`, and a time limit on every call · accepted → [deviations-D000-D099.md](progress-archive/deviations-D000-D099.md#d99--aiproviderverifykey-a-factory-made-inside-withapikey-and-a-time-limit-on-every-call)
- **D100** — the calls PRD §8.1 step 5 and §8.10 leave open, and how tier 11 runs "the entire suite" · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d100--the-calls-prd-81-step-5-and-810-leave-open-and-how-tier-11-runs-the-entire-suite)
- **D101** — the `CostLedger` port, and every spending call metered inside `withAiProvider` · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d101--the-costledger-port-and-every-spending-call-metered-inside-withaiprovider)
- **D102** — `lastUsage()` covers the whole of the last method call · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d102--lastusage-covers-the-whole-of-the-last-method-call)
- **D103** — pricing as data, and what "session", "week" and "month" mean · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d103--pricing-as-data-and-what-session-week-and-month-mean)
- **D104** — the cap syncs; the ledger does not; and the calls §8.10 leaves open · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d104--the-cap-syncs-the-ledger-does-not-and-the-calls-810-leaves-open)
- **D105** — `assessWriting`: the model quotes its errors, and the offsets are computed in domain · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d105--assesswriting-the-model-quotes-its-errors-and-the-offsets-are-computed-in-domain)
- **D106** — the `WritingStore` port, Dexie v3, and R12's writing half · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d106--the-writingstore-port-dexie-v3-and-r12s-writing-half)
- **D107** — the prompt library is `@palier/content/writing/prompts.json` · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d107--the-prompt-library-is-paliercontentwritingpromptsjson)
- **D108** — the calls PRD §8.7 leaves open · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d108--the-calls-prd-87-leaves-open)
- **D109** — the review gate moves to `@palier/domain`, and ADR 20 stands · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d109--the-review-gate-moves-to-palierdomain-and-adr-20-stands)
- **D110** — `generatePracticeSet`, the `GeneratedItemStore` port, and how a generated item stays out of the trend · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d110--generatepracticeset-the-generateditemstore-port-and-how-a-generated-item-stays-out-of-the-trend)
- **D111** — the calls the fresh-set screen leaves open · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d111--the-calls-the-fresh-set-screen-leaves-open)
- **D112** — the Phase 4 CI gates: recorded fixtures, the eval's rate, the nightly smoke, and a prompt fix they found · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d112--the-phase-4-ci-gates-recorded-fixtures-the-evals-rate-the-nightly-smoke-and-a-prompt-fix-they-found)
- **D113** — Gate H: PRD §8.6's practice mode adopted with the recommendations, Phase 5 is three slices, and GPT-Live noted for studio mode · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d113--gate-h-prd-86s-practice-mode-adopted-with-the-recommendations-phase-5-is-three-slices-and-gpt-live-noted-for-studio-mode)
- **D114** — scenarios through the bank: the scenario stage, bank v3, and the carry-forward D82 left open · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d114--scenarios-through-the-bank-the-scenario-stage-bank-v3-and-the-carry-forward-d82-left-open)
- **D115** — the `OralStore` port, and architecture.md §9.1's retention in the use cases · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d115--the-oralstore-port-and-architecturemd-91s-retention-in-the-use-cases)
- **D116** — the session machine, the `OralTransport` port, and the driver that joins them · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d116--the-session-machine-the-oraltransport-port-and-the-driver-that-joins-them)
- **D117** — the turn loop's three capabilities, and pricing in the unit each model is billed by · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d117--the-turn-loops-three-capabilities-and-pricing-in-the-unit-each-model-is-billed-by)
- **D118** — the `AnswerSource` port, and `turnBasedTransport` in `@palier/app` · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d118--the-answersource-port-and-turnbasedtransport-in-palierapp)
- **D119** — the calls PRD §8.6's practice mode and §14 leave open · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d119--the-calls-prd-86s-practice-mode-and-14-leave-open)
- **D120** — the key-leak test follows audio and transcripts, and how E2E gets a microphone · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d120--the-key-leak-test-follows-audio-and-transcripts-and-how-e2e-gets-a-microphone)
- **D121** — the pre-merge review: 26 findings fixed, the screen's session moved into a tested controller · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d121--the-pre-merge-review-26-findings-fixed-the-screens-session-moved-into-a-tested-controller)
- **D122** — `assessOral`: the model names the turn and quotes it, the offsets are placed per turn, and each fix names a drillable sub-skill · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d122--assessoral-the-model-names-the-turn-and-quotes-it-the-offsets-are-placed-per-turn-and-each-fix-names-a-drillable-sub-skill)
- **D123** — fluency metrics, over spoken answers only, with the filler list as content data · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d123--fluency-metrics-over-spoken-answers-only-with-the-filler-list-as-content-data)
- **D124** — the loop into the scheduler, closing D35 · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d124--the-loop-into-the-scheduler-closing-d35)
- **D125** — a session's cost comes from its own ledger rows · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d125--a-sessions-cost-comes-from-its-own-ledger-rows)
- **D126** — the report's use cases, its screen, and the stability eval · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d126--the-reports-use-cases-its-screen-and-the-stability-eval)
- **D127** — the pre-merge review: 32 findings fixed, the pause measured by the screen, and D123–D126 amended · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d127--the-pre-merge-review-32-findings-fixed-the-pause-measured-by-the-screen-and-d123d126-amended)
- **D128** — `assessOral` recorded live: the stability eval passes, and the smoke's re-measured counts go into pricing · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d128--assessoral-recorded-live-the-stability-eval-passes-and-the-smokes-re-measured-counts-go-into-pricing)
- **D129** — Gate I passed: the report is one a user would act on · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d129--gate-i-passed-the-report-is-one-a-user-would-act-on)
- **D130** — Phase 5 exit criterion 2 deferred; Phase 5 closes on the other four, and Phase 6's decision gate opens · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d130--phase-5-exit-criterion-2-deferred-phase-5-closes-on-the-other-four-and-phase-6s-decision-gate-opens)
- **D131** — Phase 6's decision gate: studio mode is deferred past 1.0, and Phase 7 follows Phase 5 · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d131--phase-6s-decision-gate-studio-mode-is-deferred-past-10-and-phase-7-follows-phase-5)
- **D132** — Phase 7 is planned as four slices and three gates, mirrored in two documents · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d132--phase-7-is-planned-as-four-slices-and-three-gates-mirrored-in-two-documents)
- **D133** — the strict CSP is nonce-based, so every page renders per request (ADR 22) · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d133--the-strict-csp-is-nonce-based-so-every-page-renders-per-request-adr-22)
- **D134** — Trusted Types enforced: one default policy, passed through unchanged, and zod's code generation off · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d134--trusted-types-enforced-one-default-policy-passed-through-unchanged-and-zods-code-generation-off)
- **D135** — the supply chain: the audit gate, Dependabot, and `SECURITY.md` through GitHub's private reporting · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d135--the-supply-chain-the-audit-gate-dependabot-and-securitymd-through-githubs-private-reporting)
- **D136** — the deliberate attempt to leak the key, written as tests the policy must stop · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d136--the-deliberate-attempt-to-leak-the-key-written-as-tests-the-policy-must-stop)
- **D137** — a missing `RATE_LIMIT_SALT` fails the production deploy, never a request · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d137--a-missing-rate_limit_salt-fails-the-production-deploy-never-a-request)
- **D138** — the retention job: activity is any authenticated request, the tombstone purge deletes nothing yet, and a scheduled run deletes · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d138--the-retention-job-activity-is-any-authenticated-request-the-tombstone-purge-deletes-nothing-yet-and-a-scheduled-run-deletes)
- **D139** — the storage alert and two housekeeping purges on the same run · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d139--the-storage-alert-and-two-housekeeping-purges-on-the-same-run)
- **D140** — `GET /api/health` on Node; the build version from the commit, and the bank version out of the browser-only root · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d140--get-apihealth-on-node-the-build-version-from-the-commit-and-the-bank-version-out-of-the-browser-only-root)
- **D141** — the error states: a bundle with no free text, a generated copy for `global-error`, and a 404 that is not `notFound()` · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d141--the-error-states-a-bundle-with-no-free-text-a-generated-copy-for-global-error-and-a-404-that-is-not-notfound)
- **D142** — the error states' E2E hook, and `global-error` checked through its view · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d142--the-error-states-e2e-hook-and-global-error-checked-through-its-view)
- **D143** — a spending call outlives its screen: joined, never repeated, and a wipe drops what it would write (finding 13, whole) · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d143--a-spending-call-outlives-its-screen-joined-never-repeated-and-a-wipe-drops-what-it-would-write-finding-13-whole)
- **D144** — a spoken session after a hard close: an `OralLiveness` port over Web Locks, and `closeAbandonedSessions` · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d144--a-spoken-session-after-a-hard-close-an-oralliveness-port-over-web-locks-and-closeabandonedsessions)
- **D145** — Gate K: the PRD adopted as recommended, and the authored-item intake built in Slice 3 · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d145--gate-k-the-prd-adopted-as-recommended-and-the-authored-item-intake-built-in-slice-3)
- **D146** — the non-affiliation statement is one component, beside every band and at the head of onboarding · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d146--the-non-affiliation-statement-is-one-component-beside-every-band-and-at-the-head-of-onboarding)
- **D147** — the about page and the privacy notice, as drafted · accepted, pending Gate L's French read → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d147--the-about-page-and-the-privacy-notice-as-drafted)
- **D148** — the one-page PDF is `/progress` printed, with an oral line, and the second skill mounted only for print · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d148--the-one-page-pdf-is-progress-printed-with-an-oral-line-and-the-second-skill-mounted-only-for-print)
- **D149** — removing a device asks first, the code counts down from its arrival, and a removed device's switch follows · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d149--removing-a-device-asks-first-the-code-counts-down-from-its-arrival-and-a-removed-devices-switch-follows)
- **D150** — the shortcut sheet: a registry, one key guard, and the existing `Dialog` · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d150--the-shortcut-sheet-a-registry-one-key-guard-and-the-existing-dialog)
- **D151** — the `lang` audit: two gaps, both in workshop feedback · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d151--the-lang-audit-two-gaps-both-in-workshop-feedback)
- **D152** — the authored-item intake: `content/authored/`, a contributor handle, and stage 4 · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d152--the-authored-item-intake-contentauthored-a-contributor-handle-and-stage-4)
- **D153** — Relicensed non-commercial: PolyForm Noncommercial for code, CC BY-NC-SA 4.0 for content · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d153--relicensed-non-commercial-polyform-noncommercial-for-code-cc-by-nc-sa-40-for-content)
- **D154** — TypeScript 6, and every build states its ambient `types` · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d154--typescript-6-and-every-build-states-its-ambient-types)
- **D155** — the dev-only advisories are overridden, not waited on; Dependabot ignores two majors · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d155--the-dev-only-advisories-are-overridden-not-waited-on-dependabot-ignores-two-majors)
- **D156** — the nightly lane: a lane-wide timeout, and one issue per failing job · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d156--the-nightly-lane-a-lane-wide-timeout-and-one-issue-per-failing-job)
- **D157** — a registration answer never overwrites an identity the device gained while it was in flight · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d157--a-registration-answer-never-overwrites-an-identity-the-device-gained-while-it-was-in-flight)
- **D158** — the adapters' errors name themselves with literals: a fix that never merged, recovered · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d158--the-adapters-errors-name-themselves-with-literals-a-fix-that-never-merged-recovered)
- **D159** — the streak counts every kind of session, on the device's day, and "said once" is a synced setting · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d159--the-streak-counts-every-kind-of-session-on-the-devices-day-and-said-once-is-a-synced-setting)
- **D160** — motion: three duration tokens, one switch for reduced motion and exam mode, and transform only · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d160--motion-three-duration-tokens-one-switch-for-reduced-motion-and-exam-mode-and-transform-only)
- **D161** — the fonts are committed woff2 files, and the service worker follows stylesheets to them · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d161--the-fonts-are-committed-woff2-files-and-the-service-worker-follows-stylesheets-to-them)
- **D162** — the library is structured JSON, not MDX, with cited French marked for its `lang` · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d162--the-library-is-structured-json-not-mdx-with-cited-french-marked-for-its-lang)
- **D163** — a change of locale is a document load, never a soft navigation · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d163--a-change-of-locale-is-a-document-load-never-a-soft-navigation)
- **D164** — Gate L passed: the French, the screen-reader pass and the red-team read found nothing · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d164--gate-l-passed-the-french-the-screen-reader-pass-and-the-red-team-read-found-nothing)
- **D165** — studio mode is back in 1.0, on the Realtime API that ADR 3 was written for · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d165--studio-mode-is-back-in-10-on-the-realtime-api-that-adr-3-was-written-for)
- **D166** — studio mode's cap: the machine ends at it, and the transport closes itself at it too · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d166--studio-modes-cap-the-machine-ends-at-it-and-the-transport-closes-itself-at-it-too)
- **D167** — a realtime price is a fourth `ModelPrice` kind, and studio mode's estimate is provisional · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d167--a-realtime-price-is-a-fourth-modelprice-kind-and-studio-modes-estimate-is-provisional)
- **D168** — a studio examiner's note: five criteria, three severities, and the phase stamped by the client · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d168--a-studio-examiners-note-five-criteria-three-severities-and-the-phase-stamped-by-the-client)
- **D169** — the realtime secret: one port, two sources, one route, one contract · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d169--the-realtime-secret-one-port-two-sources-one-route-one-contract)
- **D170** — `realtimeTransport`: a peer seam, hooks for the key and the ledger, one reconnect · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d170--realtimetransport-a-peer-seam-hooks-for-the-key-and-the-ledger-one-reconnect)
- **D171** — the key-leak test learns the one route; its fake-peer half waits for the screen · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d171--the-key-leak-test-learns-the-one-route-its-fake-peer-half-waits-for-the-screen)
- **D172** — studio instructions are data beside the practice examiner's prompt, versioned apart · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d172--studio-instructions-are-data-beside-the-practice-examiners-prompt-versioned-apart)
- **D173** — the key copy's exception ships with the first screen that sends the key to the route · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d173--the-key-copys-exception-ships-with-the-first-screen-that-sends-the-key-to-the-route)
- **D174** — Gate N passed: `cedar` is a credible French examiner at C level · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d174--gate-n-passed-cedar-is-a-credible-french-examiner-at-c-level)
- **D175** — the examiner waits for a speaker who pauses: semantic turn detection at `low`, as data · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d175--the-examiner-waits-for-a-speaker-who-pauses-semantic-turn-detection-at-low-as-data)
- **D176** — the examiner listens: every question follows from the last answer · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d176--the-examiner-listens-every-question-follows-from-the-last-answer)
- **D177** — no CI lane could fail from Phase 0 until now, and `main` is protected · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d177--no-ci-lane-could-fail-from-phase-0-until-now-and-main-is-protected)
- **D178** — the medium lane is three parallel jobs, and the fast lane keeps its caches · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d178--the-medium-lane-is-three-parallel-jobs-and-the-fast-lane-keeps-its-caches)
- **D179** — the exam runner's keys are live before its first item is painted · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d179--the-exam-runners-keys-are-live-before-its-first-item-is-painted)
- **D180** — "could you repeat" is studio mode's alone: a user message and a cue, never a turn · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d180--could-you-repeat-is-studio-modes-alone-a-user-message-and-a-cue-never-a-turn)
- **D181** — a session carries the mode it was held in, and a run says its phase · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d181--a-session-carries-the-mode-it-was-held-in-and-a-run-says-its-phase)
- **D182** — a studio conversation's cost is its own line, and the meter reads it every tick · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d182--a-studio-conversations-cost-is-its-own-line-and-the-meter-reads-it-every-tick)
- **D183** — the studio recording is the microphone, whole, from the tap · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d183--the-studio-recording-is-the-microphone-whole-from-the-tap)
- **D184** — the voice form is a `@palier/ui` primitive that the reduced-motion switch cannot reach, so it is told · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d184--the-voice-form-is-a-palierui-primitive-that-the-reduced-motion-switch-cannot-reach-so-it-is-told)
- **D185** — the studio screen's calls: one island, two controllers, one end card · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d185--the-studio-screens-calls-one-island-two-controllers-one-end-card)
- **D186** — the key copy's exception, as shipped · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d186--the-key-copys-exception-as-shipped)
- **D187** — synced playback: each spoken answer from where it starts, in the recording's card · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d187--synced-playback-each-spoken-answer-from-where-it-starts-in-the-recordings-card)
- **D188** — the hermetic studio journey dials over a stubbed `RTCPeerConnection`, and the guard sorts the dial apart · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d188--the-hermetic-studio-journey-dials-over-a-stubbed-rtcpeerconnection-and-the-guard-sorts-the-dial-apart)
- **D189** — the live measurement: tap to first word is measured and not yet met, and the conversation's cost is the human's · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d189--the-live-measurement-tap-to-first-word-is-measured-and-not-yet-met-and-the-conversations-cost-is-the-humans)
- **D190** — the dial: the route woken before the tap, the secret asked for at the tap, the offer made beside it · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d190--the-dial-the-route-woken-before-the-tap-the-secret-asked-for-at-the-tap-the-offer-made-beside-it)
- **D191** — the human's live studio session: the examiner answers, and D167's estimate stays · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d191--the-humans-live-studio-session-the-examiner-answers-and-d167s-estimate-stays)
- **D192** — the self-hosted escape: a popup opened inside the tap, the key posted only to the ready page's origin, the address in the vault · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d192--the-self-hosted-escape-a-popup-opened-inside-the-tap-the-key-posted-only-to-the-ready-pages-origin-the-address-in-the-vault)
- **D193** — the route's log exclusion: no per-route switch exists, so nothing Vercel records may carry the key · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d193--the-routes-log-exclusion-no-per-route-switch-exists-so-nothing-vercel-records-may-carry-the-key)
- **D194** — the manual realtime checklist is written, and the dial was not re-measured on `main` · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d194--the-manual-realtime-checklist-is-written-and-the-dial-was-not-re-measured-on-main)
- **D195** — the repo is public, and Phase 7 gains a fifth slice, launch readiness, before Gate O · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d195--the-repo-is-public-and-phase-7-gains-a-fifth-slice-launch-readiness-before-gate-o)
- **D196** — the drill's keys are live before its first item is painted, and a failed E2E test now leaves a trace · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d196--the-drills-keys-are-live-before-its-first-item-is-painted-and-a-failed-e2e-test-now-leaves-a-trace)
- **D197** — CI's two red shards on `a7a8a99`: the examiner's heading checked too late, and journey 3 out of time · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d197--cis-two-red-shards-on-a7a8a99-the-examiners-heading-checked-too-late-and-journey-3-out-of-time)
- **D198** — the trend over time: `calculateTrend` at each week's end, on local days, and on paper a row across the page · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d198--the-trend-over-time-calculatetrend-at-each-weeks-end-on-local-days-and-on-paper-a-row-across-the-page)
- **D199** — one route list; robots, a sitemap and `hreflang` from it; and a 404 that answers 404 · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#d199--one-route-list-robots-a-sitemap-and-hreflang-from-it-and-a-404-that-answers-404)
- **D200** — the realtime route's rate limit as built: counted in the sync database, connected on the first hit, and waited on for a second at most · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d200--the-realtime-routes-rate-limit-as-built-counted-in-the-sync-database-connected-on-the-first-hit-and-waited-on-for-a-second-at-most)
- **D201** — the landing page as designed: its own chrome, its own palette, its photographs served from this origin · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d201--the-landing-page-as-designed-its-own-chrome-its-own-palette-its-photographs-served-from-this-origin)
- **D202** — the app as designed: the landing page's teal and serif on every page, light only, flat panels · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d202--the-app-as-designed-the-landing-pages-teal-and-serif-on-every-page-light-only-flat-panels)
- **D203** — the full content run, authored by Claude through the intake: bank v4, and D54 resolved another way · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d203--the-full-content-run-authored-by-claude-through-the-intake-bank-v4-and-d54-resolved-another-way)
- **D204** — the blind review by separate Claude instances, replayed from committed verdicts · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d204--the-blind-review-by-separate-claude-instances-replayed-from-committed-verdicts)
- **D205** — retirement as data: v3's synthetic items and scenarios stay in v4, retired · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d205--retirement-as-data-v3s-synthetic-items-and-scenarios-stay-in-v4-retired)
- **D206** — what the run did differently from content-factory.md §2, and what it found · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d206--what-the-run-did-differently-from-content-factorymd-2-and-what-it-found)
- **D207** — two tests whose premise the run changed, said here rather than edited quietly · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d207--two-tests-whose-premise-the-run-changed-said-here-rather-than-edited-quietly)
- **D208** — the diagnostic could never show a figure, and now always gives a result · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d208--the-diagnostic-could-never-show-a-figure-and-now-always-gives-a-result)
- **D209** — the placement is derived and never stored; the interpretation is stored, on this device only · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d209--the-placement-is-derived-and-never-stored-the-interpretation-is-stored-on-this-device-only)
- **D210** — the diagnostic is gated on the key, and the key screen leads back · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d210--the-diagnostic-is-gated-on-the-key-and-the-key-screen-leads-back)
- **D211** — the interpretation's fixture is not recorded, and its price is a placeholder · open → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d211--the-interpretations-fixture-is-not-recorded-and-its-price-is-a-placeholder)
- **D212** — the tests whose premise the human's decision changed, said here rather than edited quietly · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d212--the-tests-whose-premise-the-humans-decision-changed-said-here-rather-than-edited-quietly)
- **D213** — the saved result is the diagnostic page's own, not a route, to keep E2E shard 2 inside its budget · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d213--the-saved-result-is-the-diagnostic-pages-own-not-a-route-to-keep-e2e-shard-2-inside-its-budget)
- **D214** — Today leads with one next step: the diagnostic, then the plan, then a mock exam once practice at the target is measurable · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d214--today-leads-with-one-next-step-the-diagnostic-then-the-plan-then-a-mock-exam-once-practice-at-the-target-is-measurable)
- **D215** — the plan takes two-thirds of Today, and the review card folds into it · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d215--the-plan-takes-two-thirds-of-today-and-the-review-card-folds-into-it)
- **D216** — the quick pointer: a new content artefact, three per scored sub-skill · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d216--the-quick-pointer-a-new-content-artefact-three-per-scored-sub-skill)
- **D217** — the tests whose premise the human's request changed, said here rather than edited quietly · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d217--the-tests-whose-premise-the-humans-request-changed-said-here-rather-than-edited-quietly)
- **D218** — the pointer is a grammar point, in the language practised (supersedes part of D216) · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d218--the-pointer-is-a-grammar-point-in-the-language-practised-supersedes-part-of-d216)
- **D219** — Today takes the dashboard layout: the week and three skills in a deep hero, statistics, a practice calendar · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d219--today-takes-the-dashboard-layout-the-week-and-three-skills-in-a-deep-hero-statistics-a-practice-calendar)
- **D220** — Onboarding's step 5 says why a key, what it costs and how to get one, with the owner's video, and takes the key in place · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d220--onboardings-step-5-says-why-a-key-what-it-costs-and-how-to-get-one-with-the-owners-video-and-takes-the-key-in-place)
- **D221** — the tests whose premise the human's request changed, said here rather than edited quietly · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d221--the-tests-whose-premise-the-humans-request-changed-said-here-rather-than-edited-quietly)
- **D222** — step 5's why and cost open on demand, and the video is in view when the step opens · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d222--step-5s-why-and-cost-open-on-demand-and-the-video-is-in-view-when-the-step-opens)
- **D223** — E2E shard 2 back inside its budget: the production specs move to shard 1, and the warmup visits each route once · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d223--e2e-shard-2-back-inside-its-budget-the-production-specs-move-to-shard-1-and-the-warmup-visits-each-route-once)
- **D224** — onboarding asks for the key before the placement, ends on the placement, says R5 on its first step, and Today no longer stops a new user at a card · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d224--onboarding-asks-for-the-key-before-the-placement-ends-on-the-placement-says-r5-on-its-first-step-and-today-no-longer-stops-a-new-user-at-a-card)
- **D225** — the tests whose premise D224 changed, said here rather than edited quietly · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d225--the-tests-whose-premise-d224-changed-said-here-rather-than-edited-quietly)
- **D226** — the landing page's sample question is in the language being practised, not the page's · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d226--the-landing-pages-sample-question-is-in-the-language-being-practised-not-the-pages)
- **D227** — the nightly lane was red for a week on a refused smoke key, and the smoke now names that fault · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d227--the-nightly-lane-was-red-for-a-week-on-a-refused-smoke-key-and-the-smoke-now-names-that-fault)
- **D228** — the hermetic PGlite reads its migrations before it starts, so a failed build leaves no instance booting · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d228--the-hermetic-pglite-reads-its-migrations-before-it-starts-so-a-failed-build-leaves-no-instance-booting)
- **D229** — the spoken-practice picker is laid out as two steps, with the key card first and the sessions as a grid · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d229--the-spoken-practice-picker-is-laid-out-as-two-steps-with-the-key-card-first-and-the-sessions-as-a-grid)
- **D230** — the landing page shows the owner's explainer video, below the fold, before "Built for exam conditions." · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d230--the-landing-page-shows-the-owners-explainer-video-below-the-fold-before-built-for-exam-conditions)
- **D231** — the landing page's headline reads "Practice for your SLE." · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d231--the-landing-pages-headline-reads-practice-for-your-sle)
- **D232** — on a narrow screen, the landing page's header folds behind a menu button at the top right · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d232--on-a-narrow-screen-the-landing-pages-header-folds-behind-a-menu-button-at-the-top-right)
- **D233** — a page's preloads are in its `<head>`, never a `Link` header · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d233--a-pages-preloads-are-in-its-head-never-a-link-header)
- **D234** — spoken practice is spoken only: no typed answers, in either mode · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d234--spoken-practice-is-spoken-only-no-typed-answers-in-either-mode)
- **D235** — the landing page's headline reads "Your C is closer than you think.", and cost is said one way · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d235--the-landing-pages-headline-reads-your-c-is-closer-than-you-think-and-cost-is-said-one-way)
- **D236** — four more dev-only advisories are overridden, D155's way; `sprintf-js` is removed rather than dismissed · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d236--four-more-dev-only-advisories-are-overridden-d155s-way-sprintf-js-is-removed-rather-than-dismissed)
- **D237** — one press spends: the estimate stands beside the button, and a slow wait shows it is alive · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d237--one-press-spends-the-estimate-stands-beside-the-button-and-a-slow-wait-shows-it-is-alive)
- **D238** — the official domain is palier.study, and its origin is `https://www.palier.study` · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d238--the-official-domain-is-palierstudy-and-its-origin-is-httpswwwpalierstudy)
- **D239** — the service worker fetches each URL once per install, which brings E2E shard 1 back inside its budget · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d239--the-service-worker-fetches-each-url-once-per-install-which-brings-e2e-shard-1-back-inside-its-budget)
- **D240** — the landing footer's statement and photographs' credit share one row, above the wordmark · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d240--the-landing-footers-statement-and-photographs-credit-share-one-row-above-the-wordmark)
- **D241** — due items are only those the bank still serves, read past the dead entries, and nothing is written · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d241--due-items-are-only-those-the-bank-still-serves-read-past-the-dead-entries-and-nothing-is-written)
- **D242** — "for this tab only" sits closed behind "Using a shared computer?", and its hint names the cost · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d242--for-this-tab-only-sits-closed-behind-using-a-shared-computer-and-its-hint-names-the-cost)
- **D243** — the landing hero says Palier is unofficial and not affiliated with the Commission · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d243--the-landing-hero-says-palier-is-unofficial-and-not-affiliated-with-the-commission)
- **D244** — the landing page's way-in test asserts the link and where a new visitor lands, not a page they pass through · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d244--the-landing-pages-way-in-test-asserts-the-link-and-where-a-new-visitor-lands-not-a-page-they-pass-through)
- **D245** — `/progress` is a dashboard: the three domains at a glance, then the chosen skill in detail · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d245--progress-is-a-dashboard-the-three-domains-at-a-glance-then-the-chosen-skill-in-detail)
- **D246** — `vite` is a pinned root devDependency, not an auto-installed peer; Dependabot's group is rebuilt locally · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d246--vite-is-a-pinned-root-devdependency-not-an-auto-installed-peer-dependabots-group-is-rebuilt-locally)
- **D247** — `/progress`'s detail is three equal tabs, speaking included; never a radio switch · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d247--progresss-detail-is-three-equal-tabs-speaking-included-never-a-radio-switch)
- **D248** — Today's plan is three equal tabs, speaking included; its plan is one suggested session · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d248--todays-plan-is-three-equal-tabs-speaking-included-its-plan-is-one-suggested-session)
- **D249** — the E2E warmup reads `routes.json`, articles included, and compiles the pages it cannot name · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d249--the-e2e-warmup-reads-routesjson-articles-included-and-compiles-the-pages-it-cannot-name)
- **D250** — The translator: one call, two jobs, and study links that are data, never a model's · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d250--the-translator-one-call-two-jobs-and-study-links-that-are-data-never-a-models)
- **D251** — The translator translates on a pause, Google Translate's way, on a page wide enough for two panes · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d251--the-translator-translates-on-a-pause-google-translates-way-on-a-page-wide-enough-for-two-panes)
- **D252** — The translator's explanation sits in the card, under the panes; the running total and the privacy line below it · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d252--the-translators-explanation-sits-in-the-card-under-the-panes-the-running-total-and-the-privacy-line-below-it)
- **D253** — Gates O and M passed and bank v4 read: 1.0 · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d253--gates-o-and-m-passed-and-bank-v4-read-10)
- **D254** — reading's library articles: eight, with excerpts in place of sentences to write · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d254--readings-library-articles-eight-with-excerpts-in-place-of-sentences-to-write)
- **D255** — `progress.md` holds current state, and `progress-archive/` holds the record · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d255--progressmd-holds-current-state-and-progress-archive-holds-the-record)
- **D256** — the library as a browsable index and readable articles, with three photographs served from this origin · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d256--the-library-as-a-browsable-index-and-readable-articles-with-three-photographs-served-from-this-origin)
- **D257** — the library's index is one grid of cards under pills that filter by skill or topic, each article with its own photograph · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d257--the-librarys-index-is-one-grid-of-cards-under-pills-that-filter-by-skill-or-topic-each-article-with-its-own-photograph)
- **D258** — The translator's no-key card sits above the editor, and its French language labels are capitalised · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d258--the-translators-no-key-card-sits-above-the-editor-and-its-french-language-labels-are-capitalised)
- **D259** — the SLE results a user holds are declared in onboarding and at `/settings/study`, and shape the plan: E leaves it, a result at the target keeps it sharp · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d259--the-sle-results-a-user-holds-are-declared-in-onboarding-and-at-settingsstudy-and-shape-the-plan-e-leaves-it-a-result-at-the-target-keeps-it-sharp)
- **D260** — the E2E warmup visits one page per route file, and the levels journey onboards once: shard 2 back inside its budget · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d260--the-e2e-warmup-visits-one-page-per-route-file-and-the-levels-journey-onboards-once-shard-2-back-inside-its-budget)
- **D261** — three dev-only advisories close with a lockfile refresh, not an override; Lighthouse's `zod` 3 is dismissed as unreachable · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d261--three-dev-only-advisories-close-with-a-lockfile-refresh-not-an-override-lighthouses-zod-3-is-dismissed-as-unreachable)
- **D262** — the E2E lane runs three shards: the hermetic specs' heaviest files sort last, so two left shard 2 at its budget · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d262--the-e2e-lane-runs-three-shards-the-hermetic-specs-heaviest-files-sort-last-so-two-left-shard-2-at-its-budget)
- **D263** — the staircase is the result picker: a skill's result is picked by tapping its step, and the pill row is gone · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d263--the-staircase-is-the-result-picker-a-skills-result-is-picked-by-tapping-its-step-and-the-pill-row-is-gone)
- **D264** — one settings area: the header's gear and the footer's one link lead to `/settings`, whose screens share a menu · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d264--one-settings-area-the-headers-gear-and-the-footers-one-link-lead-to-settings-whose-screens-share-a-menu)
- **D265** — the chrome and the settings area have unit tests in node, rendered to HTML, beside their E2E · accepted → [deviations-D200-D299.md](progress-archive/deviations-D200-D299.md#d265--the-chrome-and-the-settings-area-have-unit-tests-in-node-rendered-to-html-beside-their-e2e)

### D266 — each settings screen opens with "On this page": a pill row of links to its sections, each landing on its card
**Date:** 28 October 2026 · **Status:** accepted (human's request and choices; agent's design). Extends D264's settings area

The human: each settings screen has subsections that should be reachable from the top of the screen. Asked, the human
chose links at the top of each screen over links on the overview's cards, styled as a pill row like the settings menu.
- **The list is data**, `features/settings/settings-sections.ts`'s `SETTINGS_SECTIONS`, keyed by `SETTINGS_ITEMS`' keys so
  the two cannot drift, with `sectionId(screen, section)` the id both the link and its card read. Stable ids, never
  `useId`'s, so a spec finds them too. A new card on a settings screen is an entry there and an id on the card.
- **The row**, `components/settings/SettingsSections.tsx`, is a second `nav` landmark, named "On this page" / « Sur cette
  page », apart from the menu's "Settings". Its links are plain fragments, so no `aria-current` and no router: each is a
  place on this page. Smaller pills on the menu's track; wrapped on a phone, a rounded panel.
- **It is rendered inside each island, first once loaded**, not by the server page: the cards exist only once the island
  has loaded, and `/settings/study` without a profile shows one "set up" card, so a row drawn by the page would link to
  nothing while loading and in that state. The cost is that the row arrives with the island, which `.app-island` already
  makes room for.
- **The sections:** levels (results, targets, goal), the key (the key's form, where it is kept, studio mode, spending, the
  cap, the cost table), data (export, import, shared answers, recordings, delete) and sync (the switch, status, what syncs,
  devices, add, join, the danger zone). Sync's unheaded card, the export reminder beside the danger zone, is not a section
  of its own. `KeyEntry` is onboarding's too, so the key screen puts its id on a wrapper rather than a prop on the form.
- **New:** `settings-sections.test.ts`, `SettingsSections.test.tsx` (D265's render helper), a journey in
  `e2e/settings.spec.ts` (each screen's links, every target present once, the last link bringing its card into view, axe
  clean), and two lines in `levels.spec.ts` (the study screen's links once onboarded; none before there is a profile).

### D267 — below 1100px the app header is one row: the wordmark, a menu button and the gear, the destinations, sync and the language in its panel
**Date:** 28 October 2026 · **Status:** accepted (human's request; agent's design). Amends D202's header on a narrow screen

The human: on a phone the top-level menu should be a menu button, not the pill track of Today, Review and the rest, which
wrapped the header to three rows (the wordmark; the five destinations on two lines; sync, the language and the gear).
- **The landing header's disclosure, shared** (D232): `LandingMenu`'s body is now `components/HeaderMenu.tsx`, taking its
  label, panel id and classes, and `LandingMenu` is a wrapper. `menuOpenAfter` moves from `features/landing/landing.ts`
  to `features/nav/menu.ts`, its four tests with it, unchanged. A followed link closes the menu, which now matters for a
  second reason: the app header outlives a soft navigation. For the same reason a navigation the menu did not start, the
  browser's Back for one, closes it too: `HeaderMenu` reads next-intl's pathname and closes on a change (a fifth event,
  `navigate`), adjusted while rendering so the new page never paints under the panel. Found by candid-review.
- **What folds:** the destinations, the sync status and the language. The gear stays in the row, rightmost (D264), with
  the button beside it, so the order on screen is the focus order: wordmark, button, the open panel, gear. Sync and the
  language would not fit beside them in French at 390px (about 425px), and showing sync as its dot alone would say its
  state by colour only (WCAG 1.4.1). Each is rendered once: from 1100px the panel is `display: contents`, so the row is
  D202's, with the nav's auto margins doing what `space-between` did.
- **1100px, not the landing header's 1000px:** measured, the French row wraps below 1,030px with sync on, and "Synchro
  désactivée" is wider still.
- **The button is `@palier/ui`'s `pl-icon-btn`**, as the gear is, white while open as the gear is inside settings. The
  panel's colours are tokens; its shadow mixes `--ink`.
- **New:** `menu.test.ts` (moved), a `Header.test.tsx` case (the button collapsed and controlling `app-menu`, the panel
  holding the five destinations, sync and the language, the gear outside it), and two `smoke.spec.ts` journeys: at 390px
  the row, the panel with the current page marked, axe, Escape back onto the button, and a followed destination closing
  it, then Back with it open closing it (without the fix, it stayed open); at 1280px no button and the five destinations
  in the row.

### D268 — every component has a unit test beside it, held by a ratchet; `apps/web`'s component tests may run in jsdom
**Date:** 28 October 2026 · **Status:** accepted (human's choices). Amends D265 ("the rule for the rest of `apps/web` is
unchanged") and `implementation-plan.md` §6.3's "rendering is covered by E2E" for `apps/web`'s components

candid-ship's test map found nine changed components with no unit test: `HeaderMenu`, `LandingMenu` and the settings
islands (`StudySettings`, `KeySettings`, `SpendSettings`, `DataSettings`, `TelemetrySettings`, `OralStorageSettings`,
`SyncSettings`). E2E drove each, and no gate asked for more: §6.3 leaves rendering to Playwright, the coverage thresholds
are glob-keyed with no entry for `apps/web/src/components`, and `CLAUDE.md`'s "every new branch gets a unit test" is met by
a change that only adds ids. The human asked for the tests, and for a check that keeps it from happening again. Asked,
they chose jsdom with Testing Library over D265's node rendering, and a ratchet over a coverage threshold or a CI map of
changed files.
- **jsdom, per file:** the `web` project stays in node; a component test opts in with `// @vitest-environment jsdom`.
  `jsdom` 30.1.3 and `@testing-library/react` 16.3.3 join `apps/web`'s devDependencies at `@palier/ui`'s pinned versions,
  so the lockfile gains six lines and no package. D265's node rendering could not run an effect or a click: `SpendSettings`
  draws its cards only once the ledger is read, `StudySettings` its form only once the profile is, and `HeaderMenu`'s
  behaviour is Escape, taps, focus and Back.
- **`src/__tests__/dom.tsx`'s `renderIsland`** renders through the real messages and the real `ContainerProvider` over the
  hermetic graph, so a test sees the island as it loads. `StudySettings`' test builds the hermetic container itself, to
  store a profile first.
- **The nine tests** assert behaviour: each screen's "On this page" links match its cards' ids in order, and each card
  holds its heading; the study screen shows no links before there is a profile; sharing answers turns on; a cap is set
  and removed; the menu's open, Escape back onto the button, a followed link, a tap inside, a tap or focus outside, and a
  page change. **Proven to bite:** a spend card without its id failed two; the menu ignoring a page change failed one.
- **The ratchet**, `components/components-tested.test.ts`: every `.tsx` under `src/components/` has a `.test.tsx` beside
  it, or a line in `components/untested-components.json`, the 61 of 76 untested when it began. A new component without a
  test fails it, and so does an entry that has gained a test or is gone, so the list only shrinks. **Proven to bite:** a
  new untested component, `HeaderMenu`'s test removed, and a listed component given a test each failed it.
- **Not held, and said so:** a test's quality (the gate counts a file, not what it asserts); `src/app/**`'s pages and
  `src/features/**` and `src/lib/**`, which have no coverage threshold either. The thresholds stay glob-keyed (D9), since one
  on components would fail until all 61 were backfilled.

### D269 — onboarding is a focused, illustrated card flow: Coco on every card, a welcome and a ready card in place of the direction and placement questions, and no assessment first
**Date:** 31 October 2026 · **Status:** accepted (human's request and four answers; agent's design). Amends PRD §8.1
(D224's order and D259's six steps), D224's "no Skip for now button", D201's one exception to the app's chrome, and
`docs/Palier landing page/readme.md`'s "no illustration", which was written for the landing page

The human asked for onboarding to have the whimsy of a reference they attached: three phone cards, each a line-art
figure on a tinted disc above a short centred heading, with a back arrow, "Skip" at the top right, progress dots and an
arrow button, and "Get started" on the last. They also asked for a first-time user not to see the app's navigation,
sync status or settings; for everything onboarding collects to stay; for any improvement to the flow; and that **no
user has to take an assessment first**. Asked, they chose Coco drawn inline over a licensed set or their own artwork, a
"you're set" card in place of the placement question, a welcome in place of the direction question, and Skip from the
results on.
- **The focus frame.** `features/chrome/chrome.ts`'s `chromeFor` replaces `showsAppChrome`: `own` for `/`, `focus` for
  `/start`, `app` otherwise, a record and not a branch per page. `Shell` takes two more slots. `FocusHeader` is the
  wordmark and the language; the language stays because the interface is bilingual at equal prominence (§12), and a
  francophone who lands on `/en` must switch before answering anything. `FocusFooter` is a quiet line on the paper with
  the statement in the footer's own class (R5), about, privacy and the shortcut sheet (WCAG 3.2.6), and no settings
  link. `main#main` stays, so the skip link works. With the gear gone, **the welcome links a user who already has
  Palier on another device to `/settings/sync`**, the pairing screen.
- **Coco's scenes.** `@palier/ui`'s `Scene`: five drawings in a `SCENES` record (`hello`, `summit`, `time`, `key`,
  `celebrate`), Coco in a pose from a `COCO_WINGS` record, props in ink line art, each on a disc of an existing light
  token, so no new colour meets the contrast gate. Presentation attributes only, no text, `aria-hidden`. Coco hops in,
  the wing waves, the confetti pops: `transform` only, on the motion tokens, so the one switch stills them under reduced
  motion. The wizard keys the scene by the step, so the hop replays on each card. **`Mascot` is unchanged**: the plan
  had it share Coco's body with the scenes, but its poses fill the larger, rounder bird of the empty states and the
  milestone, and sharing would have changed both for no gain here.
- **The flow.** `ONBOARDING_STEPS` is welcome, target, now, goal, key, ready: six, five with a key held, as before. The
  placement and everything it needed are gone (`placementsFor`, `offersDiagnostic`, `settle`, `destinationFor`,
  `finishLabel`), and the wizard always lands on `/home`. Today's next-step banner still offers the diagnostic as
  "Start here", with "Until then, today's plan below works without it", unchanged here and raised with the human. The
  welcome says what Palier is, that no test comes first, that French is practised and English comes later, the sync
  line and the statement. The ready card reads back the targets, the results declared, the minutes, the test date and
  whether a key is held (`readySummary`), then "Start practising" saves and opens today's plan.
- **Skip** (`skippable`) shows on the results, the goal and the key: once the target is given, as §8.1's "skippable
  after step 2" always said. It saves what is chosen, with the defaults for the rest, and lands on today's plan. D224
  had removed the button because every step had its own way past; they still do, and Skip is the quicker one.
- **`/start` starts from a saved profile** (`choicesFrom`). Before, a returning user who opened it got the defaults,
  and finishing overwrote their profile (WCAG 3.3.7).
- **Kept from the reference, and not.** The dots are drawn, the current one long, beside the words "Step 2 of 6", which
  carry the step. The way on stays D202's labelled pill with its arrow disc rather than an unlabelled round arrow: a
  visible label is clearer, and the reference's own last card uses one. The key step's scene is smaller, so D222's
  video is still in view as the step opens, on a phone too.
- **Tests whose premise changed** (D225's kind): `e2e/helpers.ts`'s `onboard` ends on the ready card, and its
  `"diagnostic"` mode now takes the diagnostic from Today's banner; `smoke.spec.ts` asserted the app header on
  `/start` and now asserts the focus frame and the chrome's absence; journey 6 reached the data screen by the footer's
  settings link on `/start` and now goes by the welcome's link to sync, then the settings menu; `key.spec.ts`'s
  placement steps became the ready card; `onboarding.test.ts`'s placement and stepper cases went with the code.
- **New tests:** `chrome.test.ts`; `Scene` in `primitives.test.tsx`; unit tests for `Shell`, `FocusHeader`,
  `FocusFooter`, `OnboardingWizard` (jsdom: no assessment on the way, Back and Skip, Skip's saved defaults, the ready
  card's read-back and save, a held key's five steps, the prefill) and each step's component, so `Shell.tsx` and
  `OnboardingWizard.tsx` leave `untested-components.json`; and a journey that runs axe on each card in both languages
  under reduced motion, then skips from the results to Today.

### D270 — every app page waits until onboarding is done, but for the reference pages and the translator; and onboarding asks early whether the user brings progress from a file or another device
**Date:** 31 October 2026 · **Status:** accepted (human's request and design). Amends D224, where only Today and a drill
sent a user with no study profile to onboarding, and D269's welcome link to `/settings/sync`

The human asked whether Today could be reached without onboarding. It could not: Today and a drill redirected (D224).
Every other app page opened, though, for a visitor arriving by a link. The human ruled that **every page inside the
site sends a visitor who has not been through onboarding there, except the translator, about, privacy and the
library**, and settings too. Because settings was where an export is imported and a device is paired, they asked for
onboarding to ask about both **early, as a lower-priority question**.
- **The gate.** `features/chrome/chrome.ts`'s `needsOnboarding` is true for a page `routes.json` knows and that is not
  open before onboarding: `/`, `/start`, `/about`, `/privacy`, `/practice/writing/translate`, the library and its
  articles, and **`/settings/key/guide`**. The guide is the agent's addition: onboarding's key step opens it in a new
  tab, and gating it would send that tab to a second onboarding. An unknown path is never gated, so the 404 stays.
  `components/OnboardingGate.tsx`, in `Shell` on the app's pages, reads the study profile on every page change and,
  with none, `router.replace("/start")`. The page renders meanwhile, as Today's own redirect did (D224), so a visitor
  with no profile may glimpse it for the moment the container takes. Today's and the drill's own redirects stay, since
  they also spare an empty plan.
- **The translator's "Add a key" now leads into onboarding** for a visitor with no profile. The key screen is gated,
  and onboarding has its own key step, but it lands on Today afterwards, not back on the translator. Raised with the
  human.
- **Onboarding's second step, "New to Palier, or bringing your progress?"** (`restore`; seven steps, six with a key
  held). "I'm new to Palier" is chosen already, so it costs one tap. "I have a file I exported" opens the import, and
  "I use Palier on another device" opens the pairing, with where to find the code. Both are the settings screens' own
  forms, extracted into `components/data/ImportForm.tsx` and `components/sync/JoinForm.tsx` and used by both screens.
  Once a study profile has come over, the step says so and offers **"Go to today"** beside Continue, and the questions
  after it start from what came over. Progress that came over without a profile is said so, and the questions set
  one up. The new scene is `devices`: Coco on a laptop, a dotted line to a phone and a folder. The welcome's link to
  `/settings/sync` is gone.
- **Hermetic specs start onboarded when they need to** (`@palier/testing`'s `HERMETIC_SETTINGS_GLOBAL` and
  `hermeticSettingsSeed`; `e2e/helpers.ts`'s `asOnboarded`). A hermetic page's stores last one load, so a spec about
  another screen could no longer open it directly. An init script sets the global, and **only the hermetic graph reads
  it**, seeding the in-memory settings with a study profile. Onboarding all over again in each spec would have cost every
  shard minutes it does not have (D260, D262). The production specs onboard instead, since IndexedDB keeps the profile.
- **Tests whose premise changed:** `key.spec.ts`'s "with a key already held, onboarding counts its steps" saved a key on
  the key screen before onboarding, which is no longer reachable. A key held before onboarding now means a returning
  user reopening `/start`, so the count is `OnboardingWizard.test.tsx`'s, and the e2e test became the key guide's
  exemption. `levels.spec.ts` checked the study settings' "Set up" link with no profile; it now checks the redirect.
  Journey 6 imports on onboarding's second step and goes straight to today. `csp-production.spec.ts` onboards before
  walking every page, so a gated page renders as itself, not as `/start`. `generate-production`, `key-states-production`
  and `spend-production` (after its wipe) onboard before the key screen.
- **New tests:** `needsOnboarding` for every route and every exemption; `OnboardingGate`; `ImportForm`, `JoinForm`
  and `RestoreStep`; the wizard's import that brings a profile and offers today; `hermeticSettingsSeed`; and a journey
  that six app pages redirect, replacing rather than pushing, while the translator, library, about and privacy stay.

### D271 — no "bringing your progress" step: the welcome carries the import and the pairing as two small links; every onboarding card fits a desktop screen without scrolling
**Date:** 1 November 2026 · **Status:** accepted (human's request and design; agent's layout). Amends D270's second step
and D269's single-column card

The human asked for every onboarding card to show **without scrolling on a standard desktop screen**. They also found
D270's second step, "New to Palier, or bringing your progress?", unnecessary: **continuing from the welcome means a new
user**, and "I have a file I exported" and "I use Palier on another device" belong at the foot of the welcome **in small
type**, since the users they serve pick themselves out.
- **Six steps again**, five with a key held. `onboarding.ts`'s `restore` step and `RESTORE_CHOICES` are gone, and
  `BRING_WAYS` is the two links. `components/onboarding/BringProgress.tsx` draws them under the welcome's way on, after
  "Already use Palier?". Each opens `@palier/ui`'s `Dialog` holding D270's `ImportForm` or `JoinForm`, with the `devices`
  scene, so the welcome never grows. Once a study profile has come over, the dialog offers "Go to today" or "Continue
  setting up", which starts the questions from it. `RestoreStep` is deleted. The welcome now renders outside the
  wizard's `<form>`, as the key step does, since the dialog's forms sit in it.
- **The desktop layout, from 960px.** The picture moves to a column of its own beside the card. The heading and lead
  read from the left. The page's title shares the card's top row with Back and Skip, so it costs no height of its own
  (at every width). The focus header is slimmer, and the welcome's notes and statement are set a size smaller. With no
  picture, the results card takes the whole width and its three staircases stand side by side. D263's "one stair per
  row" was for a 760px column, where three across shrank the letters; at 232px each they keep their size here. **The key
  step stands in three columns**: why (the heading, intro and disclosures), how (the video, the written steps, the
  guide) and the key (its form and the way on), in reading order. Two columns stretched the shorter one's rows to the
  video's height, and putting the form beside the intro would have read it before "How to get one". The step's scene is
  hidden there, since the video is its picture.
- **Measured** at 1920 × 960, 1440 × 800, 1280 × 720 and 1366 × 660, a 1366 × 768 laptop less the browser's chrome,
  in both languages. The tallest card, the French target, ends at 644px. Phones are unchanged: one column.
- **Tests whose premise changed:** D270's (`onboard`, the step counts in `key.spec.ts`, `levels.spec.ts`, journeys)
  return to six steps, and journey 6 imports from the welcome's link. **New:** `BringProgress.test.tsx`; the wizard's
  import from the welcome, with today offered; and a journey that, at 1366 × 660 in both languages, holds every card's
  heading and way on in view with nothing scrolled.

### D272 — the welcome is one line and the statement; the results' two paragraphs are one; the key's tab-only choice and the import's file chooser read as the design
**Date:** 1 November 2026 · **Status:** accepted (human's review of D271's screens). Amends PRD §8.1's "Sync in
onboarding", whose quiet line on step 1 is gone, and D259's results step

The human reviewed the cards and asked for each of these.
- **The welcome:** "Free" is gone from the lead, which now begins "Practice for…" ("De la pratique pour…"). Also gone:
  "A few quick questions… no test to take first", and the language and sync notes (`start.welcomeSteps`,
  `welcomeLanguage`, `localNote`). Left are the heading, the one-line lead, the non-affiliation statement, the way on
  and D271's quiet links. **§8.1's sync line is no longer on step 1**: sync still starts on first run, as ADR 4 has it,
  and `/settings/sync` and `/privacy` say what syncs.
- **The page's title, "Let's set up your practice", is visually hidden.** In D271's top row it did not line up with the
  welcome's heading. It stays the page's `h1`, for a screen reader and the document outline, and the tab's title is
  unchanged.
- **The results step:** one paragraph, `start.nowIntro`, with `nowHint`'s sentences after its first, and without "A skill
  where you hold E leaves your plan, and a skill already at your target only keeps sharp."
- **The daily goal:** more space under the question. A `legend` sits outside its fieldset's grid, so the gap never
  reached it; it has its own margin now, and a lead right under a question is drawn up to it.
- **"Keep it for this tab only"** is a plain checkbox row at the key form's own size, not a question's card with a
  1.25rem label. It is `KeyEntry`'s, so `/settings/key` changes with it.
- **The import's file chooser** is the design's pill, through `::file-selector-button`, not the platform's grey
  button, in the dialog and on `/settings/data`.
- **The key step no longer links "Open the guide on a page of its own"** (`start.keyHowGuide` removed): the video and
  the written steps are on the step already. With nothing in onboarding leading there, **`/settings/key/guide` waits
  until onboarding is done**, as the rest of settings does, and D270's exemption for it is gone. Its e2e test went with
  it, and the guide's own specs onboard first: `asOnboarded` in `key.spec.ts`, `onboard` in `offline.spec.ts`.
- **Tests:** `WelcomeStep.test.tsx` asserts the one-line welcome and no list; its earlier assertions on the removed
  sentences went with them.

### D273 — `msw` 3 is rebuilt locally rather than merged from Dependabot: `onUnhandledRequest` is `onUnhandledFrame`
**Date:** 1 November 2026 · **Status:** accepted. Extends D246's "Dependabot's group is rebuilt locally" to a major

- **Dependabot's #109 (`msw` 2.15.0 → 3.0.3) failed the fast lane at `check-types`**, with TS2353 in all four of
  `packages/testing`'s handler tests. msw 3 renamed `listen()`'s and `start()`'s `onUnhandledRequest` to
  `onUnhandledFrame` (`SharedOptions`), because a handler now matches a network frame, which may be a WebSocket, not
  only a request. `dependabot.yml` reads a major rather than merging it on green, so #109 was closed and the bump redone
  here.
- **The change is the rename, in all 14 `mswServer.listen({ onUnhandledFrame: "error" })` calls**: four in
  `packages/testing/src/msw/`, three in `packages/adapters`' HTTP adapters' tests, and seven in `apps/web/src/lib/`,
  plus the comment in `container-key.test.ts` that names it. `"error"` still fails any request no handler matches.
- **Nothing else in msw 3's breaking list reaches this repo**:
  - it is ESM-only, and every consumer is ESM;
  - it needs Node 22 (`.nvmrc` is 22.23.3) and TypeScript 5.9 (6.0.3);
  - `msw/native` is gone, and nothing used it;
  - `worker.stop()` returns a Promise, and `mswWorker` is exported but never stopped;
  - `server.events`' `request:start` event still carries `request`, which `http-bank-repository.test.ts` reads;
  - `http`, `HttpResponse` and `delay` are still exported from `msw`.
- **The lockfile was rebuilt with the repo's pnpm 10.13.1** (`npx pnpm@10.13.1`). It holds one `@types/node`, 22.20.5,
  so D246's stray major did not come back. `pnpm add` would have moved `msw` to `devDependencies`. It stays a
  dependency of `@palier/testing`, because its `./msw/node` and `./msw/browser` exports import it.

### D274 — the monthly item-statistics PR gets no CI: a PR opened with `GITHUB_TOKEN` starts no workflow
**Date:** 1 November 2026 · **Status:** open. Found while clearing the open PRs; D94 did not anticipate it

- **#59 (October) and #112 (November) were both blocked.** Neither had ever run `verify`, which `main` requires.
  `item-statistics.yml` opens its PR with `github.token`. GitHub does not start a workflow from an event that token
  causes, so the `pull_request` run for #112 ended with no jobs.
- **Each month also opens a new PR rather than updating one.** The branch is named for the month, and `generatedAt`
  changes every run, so the report always differs, even when the job finds no events and no verdicts, as both months
  did.
- **What was done by hand:** #59 was closed as superseded by #112, since both add the same file. #112 was closed and
  reopened by the human's account, which starts `verify`.
- **Resolve when** the workflow opens its PR with a GitHub App's or a fine-grained token's identity, and skips the PR
  when `bankVersion` and `verdicts` are unchanged. Until then, reopen each month's PR by hand before merging it.
- **`events: 0` in November**, a week after 1.0, may mean nothing reaches the telemetry database. It is not checked
  here.

### D275 — the fast lane back under its budget: `tsc`'s check cache is kept between runs, and CI runs one Vitest worker per core
**Date:** 2 November 2026 · **Status:** accepted. Extends D178's "the fast lane keeps its caches"

- **`main` and #114 went over the fast lane's 120 s**, exit 124. #113's push run on `main` and both #114 runs were cut
  off mid-test. The test phase had grown from D178's 46–56 s to 70–84 s on the runner: 299 files on 27 October, 329
  now, most of the new ones D268's component tests. Check-types took 27–39 s whenever Turborepo missed. It misses all
  14 tasks on any lockfile change, so every dependency update paid a cold check of every package.
- **Each package's `check-types` is incremental**, into its own `tsconfig.vitest.tsbuildinfo` beside
  `tsconfig.vitest.json`. CI restores and saves those files and `apps/web/tsconfig.tsbuildinfo`, which `apps/web`'s
  `tsc --noEmit` already wrote, under `if: always()`, as D178 does for ESLint's cache.
  - A build-info file records each source file's hash, so it holds across a checkout. A stale one costs only a
    recheck.
  - Locally, cold against warm: `apps/web` 7.7 s against 2.2 s, and each package about half.
  - `packages/*/tsconfig.tsbuildinfo` is **not** cached. It is `tsc -b`'s, and restored without its `dist`, it would
    call a missing build up to date.
- **On CI, Vitest runs one worker per core** (`maxWorkers: "100%"` when `CI` is set). The default is one fewer, which
  left a quarter of the four-vCPU runner to a main process that mostly waits. Locally, at 3 against 4 workers: 53 s
  against 47 s.
  - **Not locally.** On an M1, with four efficiency cores, the eighth worker took `committed-bank.test.ts` past its
    5 s timeout on every run. Its pipeline run takes 1.5 s alone. On CI at four workers, it took 4.3–4.4 s.
- **Tried and dropped:**
  - Keeping Vitest's results cache, which orders files by their last duration: no change.
  - Keeping its module cache (`node_modules/.vitest-cache`): 3% locally, and it is experimental.
  - D178's two rejections, the threads pool and `isolate: false`, still stand.
- **Revisit when** the test phase passes about 85 s on a warm runner: that leaves a cold check-types no room.
  `committed-bank.test.ts` runs its pipeline inside its first test, so the run counts against that test's 5 s. If it
  times out on CI, moving the run to a `beforeAll` is the fix; this deviation does not make it.

## Session log

Newest first. One entry per session that changed something. Never edit an older entry.

### 2 November 2026 — `dougkeefe/pull-requests-next-steps` (the fast lane back under its budget; D275)

Not *Next, decided*, which is unchanged (D206). The human asked for the failing CI to be fixed. #114's fast lane, like
`main`'s after #113, went over its 120 s budget.
- **Config:** each `tsconfig.vitest.json` is incremental, into `tsconfig.vitest.tsbuildinfo`. `vitest.config.mts` sets
  `maxWorkers: "100%"` when `CI` is set.
- **CI:** `verify.yml`'s fast lane restores and saves the TypeScript check cache.
- **Docs:** D275. The rotation moved D265 to `deviations-D200-D299.md`, and the oldest session entry to
  `sessions-2026-10.md`.

**Verified:**
- `pnpm verify` was green locally: 329 files, 4,849 tests passed (8 todo), with no dependency violations.
- Locally, before the CI-only condition, with `maxWorkers: "100%"` on this M1: `committed-bank.test.ts` timed out
  at 5 s on three runs of three, at 5.2–5.3 s. That is why the setting is CI's alone.
- On CI, cold (every package's tsconfig changed, so Turborepo missed all 14 tasks, and no `tsc-` cache existed yet):
  check-types took 37–38 s, and both runs were still cut off at 120 s, about 73 s into the tests.
  `committed-bank.test.ts` took 4.3–4.4 s at four workers. Both runs saved their caches.
- On CI, the next push, docs only, so Turborepo hit all 14 tasks: the whole lane took 72 s and 75 s of 120, and both
  runs passed. The test phase was 62–64 s at four workers, against 70–84 s at three before. `committed-bank.test.ts`
  took 3.2–3.3 s.
- Not yet seen on CI: a Turborepo miss with the `tsc-` cache warm, the case it is for. Locally, `turbo run check-types
  --force` took 17.9 s cold and 8–9 s warm.

### 1 November 2026 — `dougkeefe/pull-requests-next-steps` (the four open PRs cleared; `msw` 3 rebuilt; D273, D274)

Not *Next, decided*, which is unchanged (D206). The human asked what to do with the four open PRs, and approved this plan:
- **#59** (October's item statistics) was closed, superseded by #112. Both add `content/factory/item-statistics.json`,
  which is not yet on `main`.
- **#112** (November's) had never run `verify` (D274). It was closed and reopened to start it. It retires nothing: 0
  events, 0 verdicts.
- **#108** (the minor-and-patch group) failed only on its `push` run, over the fast lane's 120 s budget. Its
  `pull_request` run on the same commit passed every lane. Its lockfile holds one `@types/node`, 22.20.5 (D246).
  `@dependabot rebase` was asked for, to rerun it against today's `main`.
- **#109** (`msw` 3) was closed and rebuilt here (D273).
- The rotation moved D263 and D264 to `deviations-D200-D299.md`, and the oldest session entry to `sessions-2026-10.md`.

**Verified:**
- Run with the repo's pnpm 10.13.1, through `npx pnpm@10.13.1`.
- `grep -rn onUnhandledRequest` over `packages/*/src` and `apps/*/src` finds nothing.
- `pnpm verify` was green: 329 files, 4,849 tests passed (8 todo), with no dependency violations. A first run had
  `committed-bank.test.ts` time out at 5 s, under load, before the rotation was made; it passed on the rerun, untouched.
- Not run: the medium lane locally; CI runs it on the pull request.

### 31 October 2026 — `dougkeefe/liny0` (onboarding redrawn: a focus frame, Coco on every card, and no assessment first; every app page waits for it; each card fits a desktop screen; D269–D272)

Not *Next, decided*, which is unchanged (D206). The human attached a reference of three illustrated onboarding cards and
asked for its whimsy and visuals, for no navigation, sync status or settings during a first onboarding, for everything
collected to stay, and for no assessment first; then chose Coco drawn inline, a ready card, a welcome and Skip.
- **UI:** `Scene` (`primitives/Scene.tsx`, `SCENES`, `COCO_WINGS`), `CocoPose` and `SceneName` in `logic.ts`, `.pl-scene*` and
  three keyframes in `components.css`, the export; its tests in `primitives.test.tsx`.
- **Web, the frame:** `features/chrome/chrome.ts` in place of `landing.ts`'s `showsAppChrome`; `Shell`'s two slots;
  `FocusHeader`, `FocusFooter`; the layout; the focus chrome in `globals.css`.
- **Web, the flow:** `features/onboarding/onboarding.ts` (the six steps, `skippable`, `sceneFor`, `stepDots`,
  `choicesFrom`, `readySummary`, `testDateInstant`; the placement gone); `OnboardingWizard` as the card frame;
  `WelcomeStep`, `TargetStep`, `NowStep`, `GoalStep`, `ReadyStep`, `StepProgress`; `KeyStep`'s row; the page's title;
  the onboarding section of `globals.css` in place of the stepper; `start.*` in both languages (the `direction*` and
  `placement*` keys removed).
- **Tests:** unit tests beside every new component, `Shell.tsx` and `OnboardingWizard.tsx` off `untested-components.json`;
  `onboarding.test.ts` and `chrome.test.ts`; the e2e premises in D269 (`helpers.ts`, `smoke`, `journeys`, `key`) and a
  new journey over every card.
- **Then the gate (D270)**, on the human's question whether Today opened without onboarding (it did not; most other
  pages did): `needsOnboarding` in `features/chrome/chrome.ts`, `OnboardingGate` in `Shell`; onboarding's `restore`
  step (`RestoreStep`, the `devices` scene), over `ImportForm` and `JoinForm`, extracted from the data and sync screens;
  `HERMETIC_SETTINGS_GLOBAL` and `hermeticSettingsSeed` in `@palier/testing`, read by `container.ts`'s hermetic graph,
  and `asOnboarded` in `e2e/helpers.ts`; `start.restore*` in both languages, `start.linkDevice` removed; the specs in D270.
- **Then the desktop layout (D271)**, on the human's asking for no scrolling on a desktop screen and for the second
  step to go: `BringProgress` (two small links under the welcome, each a dialog over `ImportForm` or `JoinForm`) in place
  of `RestoreStep`; the welcome outside the wizard's form; the key step's three columns (`app-key-step__intro`, `__how`,
  `__entry`); the desktop rules in `globals.css`; `start.bring*` in both languages and D270's step keys removed.
- **Then the human's review (D272):** the welcome's lead without "Free" and without the three lines under it, the
  page's title visually hidden, the results' one paragraph, the goal's space under its question, the key form's
  tab-only row, the file chooser's pill, and the key step's guide link removed, with the guide gated again;
  `WelcomeStep.test.tsx`, `chrome.test.ts`, `key.spec.ts`, `offline.spec.ts`.
- **Then a candid-loop review**, nine fixes: the goal tiles' layout and the key form's ticked tab-only row, each lost
  to a later or weightier `.app-choice` rule; `JoinForm` tells its caller whether the link synced, so an unavailable
  one no longer reads as "Your progress came over"; `ImportForm` and `JoinForm` run the caller's follow-up outside
  their own `try`, so its failure never turns a success into "failed"; the welcome's way on waits for the container,
  as every other step's does, so `onboard()`'s first wait is real; a key held from the start reads as held on the ready
  card at once; the axe journey walks all six cards in both languages; the gate journey waits for the network to
  settle, not a second; and a comment's step count. Tests for each new branch beside them.
- **Then CI's fast lane** blew its 120s budget on the pull request's run, while the push run of the same commit passed
  in 78s. The common files ran 36% slower on that runner, and the packages this change touches missed Turborepo's
  cache (check-types 27s against main's 10s); the new tests were 4.5s of it. Within the rule (make it faster, never
  raise the number): `TargetStep` and `GoalStep` render in node now, their choosing left to the wizard's jsdom test,
  so two jsdom start-ups go; and the gate's, the import's and the pairing's tests wait one tick, not 20 to 50ms.
- **Then CI's Lighthouse budget** failed `/en/review` at 0.93, all five runs: Lighthouse opens a gated page with no
  profile, so it measured the gate's move to onboarding. Two causes, each fixed at its root. `Shell`'s `main` is keyed
  by its chrome, so the move mounts a new one instead of shifting the page's up into the slimmer frame (a layout shift
  of 0.089). And `ReviewScreen` and `ProgressScreen` read the study profile first and, with none, load nothing and stay
  on their loading line, as Today does, so the queue's and the reports' half a megabyte of bank no longer holds
  onboarding's first paint back (1.5s). Both pages now 0.99, and every other URL in `lighthouserc.json` 0.98 or more,
  measured once each on the production build; each screen has its first unit test, so both leave
  `untested-components.json`.
- **Docs:** D269–D272; D259 to D262 archived (rule 8); the 24 October `progress.md-archive` entry archived; PRD
  §8.1's dated amendments; `apps/web/CLAUDE.md`, `packages/ui/CLAUDE.md` and `packages/testing/CLAUDE.md`; a line in
  `docs/Palier landing page/readme.md`.

**Verified:**
- `pnpm verify` exit 0: check-types, lint and boundaries clean; `pnpm test` passed 327 files, 4,841 tests (8 todo), after D272 and the candid-loop fixes.
- The hermetic `warmup` and `chromium` projects in full, through a temporary, uncommitted config on port 3400 (another
  project's dev server held 3000): 102 of 102.
- After `pnpm --filter @palier/web build`, the whole `offline` project against `next start` on 3100 and the self-hosted
  endpoint on 3300, started by hand: 38 of 38, `csp-production.spec.ts` onboarded first so every page renders as itself.
- In the hermetic dev server in Chrome, at 390px and 1280px in English and at 390px in French, under reduced motion:
  each card, screenshotted for the human. For D271, every card measured at 1920 × 960, 1440 × 800, 1280 × 720 and
  1366 × 660 in both languages, the tallest ending at 644px, and the import dialog and the phone's welcome screenshotted.
- Not run: Lighthouse and the live smoke. CI runs the medium lane on the pull request.

### 30 October 2026 — `dougkeefe/liny0` (`docs/README.md` rewritten for outside readers)

Not *Next, decided*, which is unchanged (D206). The human asked for the docs directory's README to be cleaned up for a
source-available project. This commit changes documents only.
- **`docs/README.md`:** the working-name, owner and last-revised lines, the "three things most likely to sink this"
  section and the 0.1–0.3 revision history are gone; git and this file's archive hold that record. The "current shape"
  summary is gone too, since the root README describes the product. Added: a "where to start" table by reader, and rows
  for every directory and file in `docs/` (`progress-archive/`, `schemas/`, `content-runs/`, `prompts.md`, the landing
  page design). Kept, reworded: the authority table and its "the table decides" rule, and the four kinds of statement.
- **Docs:** the 24 October D254 entry archived (rule 8).

**Verified:** documents only. Every link in `docs/README.md` resolves in the tree. The D254 entry's move is byte for byte
(a `diff` of it against `HEAD` is empty), and `apps/web/src/docs/progress.test.ts`, run alone, passed 11 of 11. Not run:
the full `pnpm verify`, which CI runs on the pull request.

### 28 October 2026 — `dougkeefe/settings-subsections-navigation` (links to each settings screen's sections, the app header's menu on a phone, and a test for every component; D266–D268)

Not *Next, decided*, which is unchanged (D206). The human asked for each settings screen's subsections to be reachable from
the top of the screen, and chose a pill row on each screen; then for the header's destinations to fold behind a menu
button on a phone.
- **Web:** `features/settings/settings-sections.ts`, `components/settings/SettingsSections.tsx`, an id on every settings
  card and the row first in each of the four islands, `.app-settings-sections` in `globals.css`, `settings.sectionsLabel`
  and `settings.sections` in both languages.
- **Tests:** `settings-sections.test.ts`, `SettingsSections.test.tsx`, a journey in `e2e/settings.spec.ts`, two checks in
  `levels.spec.ts`.
- **Then the header (D267):** `HeaderMenu.tsx` from `LandingMenu`'s body, `features/nav/menu.ts` from `landing.ts`, the
  header's panel and gear, `nav.menu` in both languages, the narrow-screen header in `globals.css`; a `Header.test.tsx`
  case and two `smoke.spec.ts` journeys.
- **Then the tests (D268), from candid-ship's test map:** `jsdom` and `@testing-library/react` in `apps/web`'s
  devDependencies, `src/__tests__/dom.tsx`, unit tests for the nine components, and the ratchet,
  `components/components-tested.test.ts` over `components/untested-components.json`; the `vitest.config.mts` note.
- **Docs:** D266, D267, D268; D256, D257, D258 and the 24 October entry recording 1.0 are archived (rule 8);
  `apps/web/CLAUDE.md`.

**Verified:**
- `pnpm verify` exit 0: check-types, lint and boundaries clean; `pnpm test` passed 301 files, 4,735 tests (8 todo).
- The hermetic chromium project, through a temporary, uncommitted config on port 3400 (another project's dev server held
  3000): `settings` and `levels`, 6 of 6; then `content`, `journeys`, `oral`, `key`, `sync` and `key-leak`, which drive the
  settings screens, 50 of 51. The one failure, the titles test, timed out on cold compiles because `--no-deps` skipped
  the warmup; with the warmup it passed.
- In the hermetic dev server in Chrome, at 1280px and 390px: the row under each screen's title, "Monthly cap" landing on
  its card, and the French sync row wrapping as a panel.
- For D267, through the same temporary config with the warmup: `smoke`, `settings`, `translate`, `key`, `levels` and
  `content`, 52 of 52. In the hermetic dev server: the header one row from 320px to 1280px in both languages, with no
  horizontal overflow at 320px; the panel open at 390px in both; 1280px unchanged from D202's.
- After D267, `pnpm verify` exit 0 again: 302 files, 4,736 tests (8 todo).
- candid-loop (auto): one finding, the menu left open by a navigation it did not start, fixed. `smoke` and `settings`,
  22 of 22; the new Back step failed with the fix removed and passed with it. `pnpm verify` exit 0: 302 files, 4,737 tests (8 todo).
- For D268: `pnpm verify` exit 0, 312 files, 4,765 tests (8 todo), then `pnpm test` again, the same. The nine new tests and
  the ratchet each failed on a deliberate break (above, in D268) and passed restored. Under the full suite's load three
  island tests first timed out at Testing Library's one-second wait; `dom.tsx` sets ten.
- Not run: the `offline` project, Lighthouse and the live smoke.

### 27 October 2026 — `dougkeefe/settings-shared-menu` (one settings area, a gear in the header; D264)

Not *Next, decided*, which is unchanged (D206). The human asked for the settings-like screens to be one area, reached by
a gear at the top right and a link in the footer.
- **UI:** the `gear` glyph.
- **Web:** `/settings` and its layout, `SettingsNav`, `SettingsLink` in the header's tools, one settings link in the
  footer and the landing footer, the `settings` namespace and `nav.settings` in both languages, the four footer keys
  removed; `routes.json` regenerated by `prepare-public.mjs`.
- **Tests:** `settings-nav.test.ts`, the glyph registry, `e2e/settings.spec.ts`, `openSettings` in the e2e helpers and the
  six specs that used the footer's links, `/settings` in the CSP pages and the titles test.
- **Docs:** D264; D254 and the 24 October entry for the translator's explanation are archived (rule 8); PRD §7;
  `apps/web/CLAUDE.md`.
- **Then, for candid-ship's HIGH confidence (D265):** unit tests for the chrome and the settings area over
  `src/__tests__/render.tsx`, the `vitest.config.mts` note and `apps/web/CLAUDE.md`'s gates; D255 archived (rule 8).

**Verified:**
- `pnpm verify` exit 0: check-types, lint and boundaries clean; `pnpm test` passed 292 files, 4,701 tests (8 todo).
- The hermetic chromium project, with the warmup, through a temporary, uncommitted config on port 3456 (another
  project's dev server held 3000): `settings`, `key`, `journeys`, `key-leak`, `sync`, `content`, `levels` and `smoke`,
  60 of 60.
- After `pnpm --filter @palier/web build`, the `offline` project's `csp-production.spec.ts`, `/settings` in both
  locales included: 7 of 7, zero violations.
- On the production build in Chrome at 1280px and 390px: the gear rightmost and a white pill inside the area, the
  overview's cards, the menu on `/fr/settings/key`, and the footer's one link. **Found, not caused here:** at 390px
  `/fr/settings/key` and `/fr/settings/data` are 10–14px wider than the screen. Their French content widens the section,
  and the overflow is the same with the menu removed from the page. Left for its own fix.
- For D265: `pnpm verify` exit 0, 299 files and 4,728 tests (8 todo), the 27 new tests among them. **Proven to bite:**
  with the gear removed from `Header` and the footer's link pointed at `/settings/data`, four of the six header and
  footer tests failed; restored, they passed. The landing footer's journey (`settings.spec.ts`) and `smoke.spec.ts`
  passed, 19 of 19, through the same temporary config.
- Not run: the rest of the `offline` project, Lighthouse and the live smoke.

### 26 October 2026 — `dougkeefe/image-clickable-bars` (the staircase is the result picker; D263)

Not *Next, decided*, which is unchanged (D206). The human reported the results step's pills wrapping E onto its own line
and asked for the staircase's steps to be the control.
- **UI:** `LevelStairPicker`, `levelStairGeometry`'s `ground` and hit boxes, `LevelStair`'s drawing shared and Coco
  placed by `transform`, the picker's styles and Coco's hop.
- **Web:** `ResultPicker` renders the picker; `.app-levels` one stair to a row, and `.app-level`'s rules removed; the
  results hint above the stairs; `resultChoices` and `resultValue` removed.
- **Tests:** the geometry's ground and hit boxes; the picker's group, radios, checked state, both kinds of press, caption,
  hit boxes, hop and stamp; the read-only stair's Coco.
- **Docs:** D263; D253 and the 24 October entry for the translator's pause are archived (rule 8); `packages/ui/CLAUDE.md`
  and `apps/web/CLAUDE.md`.

**Verified:**
- `pnpm verify` exit 0: check-types, lint and boundaries clean; `pnpm test` passed 291 files, 4,696 tests (8 todo).
- The hermetic chromium project, through a temporary, uncommitted config on port 3456 (another project's dev server held
  3000), on two workers: 92 of 93 passed, `levels.spec.ts` after its premise change (D263). The one failure,
  `content.spec.ts`'s library test, was axe's colour contrast on a library page this branch does not touch, and it passed
  alone on a rerun.
- In Chrome at 1280px and 390px, in English and French: each step picks by click, the arrow keys move Coco, E presses the
  stamp, the focus ring and hover outline show, and nothing wraps.
- Not run: the `offline` project, `csp-production` and Lighthouse.

### 26 October 2026 — `dougkeefe/dependabot-alerts-resolve-v2` (the open Dependabot alerts, and E2E in three shards; D261, D262)

Not *Next, decided*, which is unchanged (D206). The human asked for the open high and moderate Dependabot alerts to be
resolved.
- **`body-parser`, `fast-uri` and `ip-address` were refreshed in the lockfile** to 1.20.9, 3.1.9 and 10.7.5, each within
  its parent's range, with no override. That closes alerts #19 and #21–#25, the two low `fast-uri` ones included.
  `legacy-javascript` came along to 0.0.4, the whole of Dependabot's no-op PR #98, which is closed in favour of this one.
- **Alert #20, `zod` 3.25.76 under Lighthouse's `chromium-bidi`, is dismissed as `not_used`.** zod 4 would break
  `chromium-bidi`'s parser, and the BiDi code never loads on Lighthouse's CDP path (D261).
- The rotation moved D251 to `deviations-D200-D299.md` and the oldest session entry to `sessions-2026-10.md`.
- **The human then reported E2E 2/2 over its budget** on this branch. A third Playwright worker on CI was tried and
  reverted, and the lane now runs three shards, with the required checks renamed to match (D262). D252 was rotated with
  it.

**Verified:**
- Run with the repo's pnpm 10.13.1, through `npx pnpm@10.13.1`, since this machine's global `pnpm` is another front end.
- `pnpm audit` shows the two `extract-zip` entries and the `zod` one. `pnpm audit --prod --audit-level=high` exited 0,
  showing only the two ignored `content` entries.
- The smoke checks in D261 passed.
- `pnpm verify` was green: 291 files, 4,686 tests passed (8 todo), with no dependency violations.
- Not run: the medium lane's Lighthouse step locally; CI runs it.
- For D262: the hermetic projects at two, three and four workers locally (158 s, 127 s, 117 s; 93 passed each time,
  through a throwaway config on port 3010, since another app held 3000), and `playwright test --list --shard=n/3` for
  the split. Three workers on CI: E2E 2/2 260 s, then 289 s with one timeout. Three shards on CI: green on both runs, the
  slowest at 223 s (D262). `main`'s required checks were then swapped to the three shards through `gh api`, and #106
  read as mergeable.

### 25 October 2026 — `dougkeefe/current-levels-input` (the SLE results a user holds shape the plan, with a staircase for each skill; D259)

Not *Next, decided*, which is unchanged (D206). The human asked for current levels in onboarding and at any time after,
an E taking its skill out of the plan, and a fun indicator of mastery.
- **Domain:** `ExamProfile.exemptBand`, its schema and refinement; `content/profiles/psc-sle.json`; the regenerated
  `docs/schemas/exam-profile.schema.json`.
- **Engine:** `standing.ts` (`skillStanding`, `declaredStart`); the planner's `maintaining` and `MAINTAIN_FACTOR`.
- **App:** `studyFocus`'s `declared`; `planDailySession`'s `maintaining`; `startSession`'s `declared`.
- **UI:** `LevelStair` and `levelStairGeometry`, with its stylesheet.
- **Web:** `lib/study.ts`'s new profile shape and helpers; onboarding's *now* step and per-skill targets
  (`components/study/LevelPickers.tsx`, `features/study/levels.ts`); `/settings/study`; Today's tabs, cards, plan lines,
  Where you stand and the all-exempt card; each skill's own target in the drill, the diagnostic result, oral practice,
  the workshop, fresh sets and `/progress`; the footer link; messages in both languages, `privacy.held` included.
- **Tests:** `standing.test.ts`, the planner's, `studyFocus`'s, `startSession`'s and `planDailySession`'s new cases,
  `LevelStair`'s, `study.test.ts`, `onboarding.test.ts`, `today-view.test.ts`, `next-step.test.ts`, `levels.test.ts`,
  `study-view.test.ts`, the schema's two refusals, and `e2e/levels.spec.ts`; the changed premises as D259 lists.
- **Docs:** D259; D249 and the 23 October entry for the translator are archived (rule 8); the PRD's §8.1, §8.2 and §7;
  `apps/web/CLAUDE.md`, and the engine's, app's, ui's and domain's.

**Verified:**
- `pnpm verify` exit 0: check-types, lint and boundaries clean; `pnpm test` passed 291 files, 4,683 tests (8 todo).
  The engine's goldens are unmoved.
- After `pnpm --filter @palier/web build`, the whole hermetic `chromium` project with the warmup: 94 of 94, the new
  `levels.spec.ts` (4 tests, axe clean on the results step, Today with an exempt and a held skill, the study settings,
  the all-exempt card and French) and every onboarding journey with its new step counts included. It ran on a hermetic
  `next dev` at port 3010 from a throwaway config, since another app held 3000. The `offline` project's
  `csp-production.spec.ts` and `offline.spec.ts`: 17 of 17, `/settings/study` in both locales included.
- Screenshots on the production build: the results step at 1280px, and in French at 390px; Today with reading exempt,
  writing held and oral working; the study settings; and Today with all three exempt.
- **26 October 2026, CI:** shard 2 of the medium lane ran past its 300 s budget, as it had on `main`; the warmup visits
  one page per route file and the levels journey onboards once (D260). Shard 2 measured 137 s locally against 151 s.
- A candid review loop of the branch found two issues, both fixed: the target step's per-skill disclosure closed under
  the user when their targets agreed again (now `perSkillTargetsOpen`, tested), and `heldSkills` restated
  `SCORED_SKILLS`. A second pass found none; `pnpm verify` then passed 291 files, 4,686 tests (8 todo).
- Not run: the rest of the `offline` project, and Lighthouse. CI runs the lane on the pull request.

### 25 October 2026 — `dougkeefe/french-capitalization-api-warning` (the translator's no-key card above the editor, its French language labels capitalised; D258)

Not *Next, decided*, which is unchanged (D206). The human asked for a clearer warning before the text areas when no
key is held, and for the French language radios to be capitalised.
- **Web:** `Translator.tsx` renders `NoKeyCard` first, above the translator's card; `fr.json`'s `translate.source_en`
  and `translate.source_fr` are "Anglais" and "Français".
- **Tests:** `translate.spec.ts` as D258 lists.
- **Docs:** D258; D248 and the 23 October entry for the warmup's cold article route are archived (rule 8);
  `apps/web/CLAUDE.md`'s translator invariant; *In flight*.

**Verified:**
- `pnpm verify`: check-types, lint and boundaries clean; `pnpm test` passed 288 files, 4,615 tests (8 todo).
- `translate.spec.ts` on the `chromium` project with the warmup, on a hermetic `next dev` at port 3400 (a throwaway
  config, since another app held 3000): 6 of 6, axe clean on every state, the new placement and French assertions
  included.
- A screenshot of `/fr/practice/writing/translate` with no key at 1280px: the card above the radios, which read
  "Détecter", "Anglais", "Français".
- Not run: the rest of the medium lane, and Lighthouse. CI runs the lane on the pull request.

Older entries, newest first: [October 2026](progress-archive/sessions-2026-10.md) ·
[September 2026](progress-archive/sessions-2026-09.md).
