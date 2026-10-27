# Palier: Progress

**Last updated:** 27 October 2026 (one settings area behind a gear in the header, D264; next, D206's bank budget)
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

### D255 — `progress.md` holds current state, and `progress-archive/` holds the record
**Date:** 24 October 2026 · **Status:** accepted (human request); amends the working agreement's rules 1, 4 and 7 and adds rule 8

- **Why:** the file was 12,537 lines and 970 KB, about 604 KB of deviations and 283 KB of session log, so no read could
  hold it, and rule 1's "both are short" had stopped being true. It grew by about 10 KB a slice and nothing bounded it.
- **What moved, verbatim:** D1 to D245 into `docs/progress-archive/deviations-D000-D099.md`, `-D100-D199.md` and
  `-D200-D299.md`, a file per hundred; 118 session entries into `sessions-2026-09.md` and `sessions-2026-10.md`, a file per
  month; and into `history.md`, the long *Current phase* narrative, the merged rows *In flight* had listed, and the
  checklists of Phases 0, 1, 2, 4, 5, 6 and 7. Each was cut at its heading by a script and written unchanged, and a
  check compared every block before and after (session log).
- **What stays:** the status table, *In flight*, *Next, decided*, the checklists of the two phases still open (3 and 8),
  the requirement table, the newest ten deviations and the newest ten session entries in full, and **an index line for
  every archived deviation**. About 1,070 references in code and documents say `progress.md D###`, and each still
  resolves through its index line, so none was rewritten.
- ***Next, decided* was tidied, not redirected:** its slice (D206) is unchanged. The human items left by Phase 7's
  slices are one list, and the ones marked done, the closed gates and §12.1's trademark check (done at Gate M, D253) are
  gone from it. Their record is in the deviations and the session log.
- **Held by a test, not a habit:** `apps/web/src/docs/progress.test.ts`, in the fast lane, fails when the live file holds
  more than ten deviations or ten session entries, or passes 1,200 lines outside the index; when a deviation is missing,
  duplicated, misfiled or unindexed, or its index line's title, status or file disagrees with the entry; and when a
  session entry is in the wrong month's file or out of order. `docs/` is no workspace, so it lives in `apps/web`, which
  already tests `selfhost/` by file URL. Rule 8 and `progress-archive/README.md` give the rotation.
- **Not done:** no entry was edited, and none was summarised in place of its text. An archived deviation's status is
  still marked in place when it is resolved, as before, with its index line changed to match.

### D256 — the library as a browsable index and readable articles, with three photographs served from this origin
**Date:** 24 October 2026 · **Status:** accepted (human request; the agent's design and choice of photographs, for the human's look). Amends D162's and D254's page shape

The human asked for an easier, more visually appealing library, with royalty-free photographs credited, without losing
the information hierarchy, accessibility or ease of navigation, and chose: both the index and the articles, the agent
picks the photographs and shows screenshots, and a linked credit at the foot of the page. The index was one column of
eighteen bold links, the article titles were not headings, and an article was a run of prose ending in a bulleted list.

- **The index, on `.app-wide`:**
  - The title, a line, and a way to each skill, beside the library's photograph. Each way is a pill with the skill's
    glyph, name and count, linking to `#library-reading` or `#library-writing`.
  - Each skill's section has its `SKILL_LOOK` mark, its name, its count and a line on what its articles hold (the old
    intro's second sentence, split), with its photograph beside them from 600px. Its articles follow as cards in the
    skill's fill, numbered in the taxonomy's order.
  - The headings run h1, then h2 per skill, then **h3 per article**, so a screen reader can move from article to article.
  - A card's link covers the card by `::after`, so the whole card answers a click while the link's name stays the
    title alone.
- **An article:**
  - A breadcrumb (Library › its skill › its title, `aria-current="page"`) replaces "All articles". The skill's link
    goes to its section on the index.
  - The head sits beside the skill's photograph from 900px.
  - **"On this page"** lists the sections, Examples and Read next. From 1000px it is sticky beside the prose; below
    that it is a quiet panel above it. The DOM order is the same at every width.
  - **The examples are white panels.**
    - A writing example sets the sentence to write against the one it replaces. ✓ and ✗ in `correct` and `incorrect`
      mark them, and the labels stay, so colour is never the only signal.
    - A reading example is an excerpt in passage type (19px at 1.65) with a rule at its start.
  - Read next uses the index's cards.
  - The practise button sits in a deep panel and is still the page's only one.
  - **Previous and next stay within the skill** (`adjacentArticles`). Neither wraps, and reading's last article never
    runs on into writing.
- **The photographs, the way D201 did it:**
  - Three photos under the Unsplash License: Fang-Wei Lin's open book, Praise Judah's reader of a document and Marcos
    Paulo Prado's hand writing in a notebook.
  - Each was downloaded at 2400px and cut to WebP: 33, 22 and 17 KB, in `components/library/images/`.
  - They are CSS backgrounds in `library.css`, so `img-src 'self'` is unchanged and the worker precaches them by
    following the stylesheet. An article is whole offline, photograph included.
  - They are decorative: `aria-hidden`, with no text over them. The index preloads its own, which is its largest paint.
  - Each page credits the ones it shows, each name linked to its photo (`features/library/photos.ts`, `PhotoCredit`).
    Unsplash asks for that, though its licence does not require it.
  - `images/SOURCES.md` records each photo, and `photos.test.ts` holds the file, the row and the credit together.
  - None repeats a landing photographer, and none shows anything official, any maple leaf or any red and white
    (PRD §10.1).
- **Contrast, by the gate's own pairs.** On a skill's fill only the inks and `primary` are held (D219), so a card's title
  is `ink`, never `link`. A card's focus ring is drawn outside it, on the paper, where `accent` clears 3:1. No new token
  and no new pair were needed.
- **`components/library/library.css`:** the library's rules left `globals.css` for a sheet only its two pages import.
  Every rule is scoped under `.app-library`, as `landing.css` is under `.landing`, since Next keeps a page's stylesheet
  after a soft navigation. `motion.test.ts` reads it, and the hover lift applies only under
  `prefers-reduced-motion: no-preference`.
- **Messages:**
  - `intro` is shorter, and `back` is gone.
  - New in both languages: `jumpLabel`, `articleCount`, `readingLede`, `writingLede`, `breadcrumb`, `onThisPage`,
    `siblings`, `previous`, `next`, `practiseTitle`, `photosBy` and `onUnsplash`.
  - The French is the agent's.
- **Tests added, none loosened:**
  - `content.spec.ts`'s library test now also asserts eighteen h3s, three `aria-hidden` photographs and three credit
    links to Unsplash on the index. On an article it asserts the breadcrumb's links, the one credit, next and back
    again, and the breadcrumb's way to the skill's section. Its axe checks are the same four pages.
  - `lib/library.test.ts` covers `skillOf`, and `adjacentArticles` at a skill's two ends and in its middle.
  - `features/library/photos.test.ts` and `contents.test.ts` are new. The second covers "Read next", which the
    contents list only when an article has related articles.
- **For the human:** look at the photographs and the pages (the pull request has screenshots), and read the new French.

### D257 — the library's index is one grid of cards under pills that filter by skill or topic, each article with its own photograph
**Date:** 25 October 2026 · **Status:** accepted (human request and choices; the agent's design, topics and photographs, for the human's look). Amends D256's index, its photographs and its "no text over a photograph"

The human asked for the library's index to keep its look but take the layout of a course catalogue they showed: tag pills
at the top that filter the articles, one grid of cards each with its own royalty-free photograph, and no separate
sections, since the tags do that. Asked, they chose: pills for both the skills and topics, each article's own photograph
on its page too, and the index's photograph kept beside its title.
- **The index:**
  - The title and its line keep the library's photograph beside them. D256's pills to each skill's section, and the two
    sections with their marks, counts, lines and photographs, are gone.
  - Under them, a centred row of pills: All, Reading, Writing, then, after a rule, Comprehension, Vocabulary, Grammar,
    Structure, Tone and register, each with its count. From 1,100px or so they sit on one row. One is pressed at a time.
  - Then **one grid of all eighteen cards**, reading's eight first, each skill's in the taxonomy's order. The headings run
    h1, then **h2 per article**, since no section heading is left between them.
- **A card** keeps its skill's fill, the link covering it and the ring outside it, and gains:
  - its article's photograph on top, 16:9, inset in the card;
  - **its skill on a badge over the photograph's corner**. This is the one place text sits on a photograph, which D256
    ruled out: the badge is a solid `surface` pill with `ink` words and the skill's glyph, so its contrast is its own
    fill's and never the photograph's;
  - after the summary, its topic and an estimated reading time as chips (`features/library/reading-time.ts`: the
    interface language's prose and the examples at 200 words a minute, never under one), and a decorative "Read →";
  - no number: across a filter the taxonomy's numbering says nothing.
- **The filter** (`components/library/LibraryFilter.tsx`, the library's only client component):
  - The server renders every card, with `data-tags` of its skill and topic, and hands them in as `children`. So no
    article reaches the client's JavaScript, as `apps/web/CLAUDE.md` requires. The filter sets `hidden` on the cards
    the pressed pill does not match. A polite status says how many are shown.
  - **The pressed pill is the URL's hash** (`#grammar`), not a query: the worker precaches `/en/library` by its exact
    URL, and a hash never reaches it, so a filtered link opens offline and the page stays static. An empty or unknown
    hash is All. The article breadcrumb's skill link is now `/library#reading` or `#writing`, which opens the index on
    that skill, where D256's opened its section.
  - Without JavaScript, or before hydration, every card shows, which is what All shows.
  - The logic is `features/library/filter.ts`: the pills' order, `matches`, the hash both ways and each pill's count.
- **Topics are content** (ADR 9's spirit, ADR 18): `LIBRARY_TOPICS` and a required `topic` on every `LibraryArticle` in
  `@palier/domain`, one line in each article's JSON, and `docs/schemas/library-article.schema.json` regenerated. The
  labels are messages. Each article has exactly one:
  - comprehension: main idea, specific detail, inference, numerical and tabular detail;
  - vocabulary: vocabulary in context, word choice, false friends and anglicisms;
  - grammar: verb tense and mood, agreement, prepositions, pronouns, punctuation, sentence structure;
  - structure: cohesion and reference, text structure, connectors;
  - register: tone and intent, register and formality.
- **The photographs, D256's way:** eighteen new Unsplash photographs, one per article, chosen to suggest each point without a word on them (a compass for the main idea, a magnifying glass for a detail, footprints for inference, an hourglass for tense, two matching eggs for agreement, a bridge for connectors, wax-sealed envelopes for register), quiet in detail so each fits 25 KB. Each was downloaded
  once, cut to 900×600 WebP and committed, so `img-src 'self'` is unchanged, and each is a CSS background in
  `library.css`, so the worker precaches it through the stylesheet and every card and article is whole offline. D256's
  `reading.webp` and `writing.webp` are retired; `library.webp` stays.
  - **Their weight:** 322 KB in all, against D256's 72 KB, all precached on install. `photos.test.ts` fails any
    article's photograph over 25 KB. It is not the bank (D206), and it is the price of a photograph per card offline.
  - An article's page shows its own photograph in its head, and its Read next cards show theirs, so its credit names
    its own photographer, then its related articles' (`photosFor`). The index credits all nineteen.
- **Messages:** `jumpLabel`, `articleCount`, `readingLede` and `writingLede` are gone. New in both languages:
  `filterLabel`, `all`, `skillReading`, `skillWriting`, `topics.*`, `shown`, `minutes` and `readArticle`. The French is
  the agent's.
- **Tests added, none loosened:** `filter.test.ts` and `reading-time.test.ts` are new; `photos.test.ts` holds nineteen
  files and rows, the new `photosFor` and the size cap; the domain's `library.test.ts` refuses an article with no topic
  or an unknown one. `content.spec.ts`'s library test now asserts eighteen h2s, nineteen photographs and credits, the
  Grammar pill pressing, the hash, six cards shown and the status, All restoring eighteen, `#reading` opening on eight,
  and the breadcrumb opening the index on writing's ten, with an axe check on the filtered index too.

### D258 — The translator's no-key card sits above the editor, and its French language labels are capitalised
**Date:** 25 October 2026 · **Status:** accepted (human's request). Amends D252's layout only

The human found two things on the translator.
- **Without a key, the warning came too late.** D252 put PRD §14's no-key card below the translator's card, so a user
  could type into the editor, see nothing happen, and find the reason only by scrolling past the panes. The card now
  sits first, above the language choice and the panes. It is the same `NoKeyCard`, same copy, still inline and never a
  modal or a blocked page (D108); the editor below it still works. With a key nothing moved.
- **"anglais" and "français" read as a mistake on the radio control.** Lower case is right in running French, but as
  labels on a segmented control beside "Détecter" they looked wrong. `translate.source_en` and `translate.source_fr`
  are now "Anglais" and "Français". Only the radios read these two keys.
- **Tests:** `translate.spec.ts`'s no-key test asserts the card's heading sits above the editor; its French test
  asserts the two radios by their capitalised names.

### D259 — the SLE results a user holds are declared in onboarding and at `/settings/study`, and shape the plan: E leaves it, a result at the target keeps it sharp
**Date:** 25 October 2026 · **Status:** accepted (human's request and three answers; agent's design). Builds PRD §8.1
step 3's "self-declare a current profile", which D224 left unbuilt; amends D224's five steps and D248's three tabs

The human: nothing let a user say what they already hold, so someone with an E in reading still got a reading plan every
day. Asked, the human chose a target per skill, with one answer still asked first; a skill held at its target, below E,
kept sharp rather than dropped; and a staircase with a stamp as the mastery indicator.
- **What is stored.** The `studyProfile` setting gains `targets` and `current`, a target and a declared result (`Band`
  or null) per skill. It still writes `targetBand`, the highest target, so a tab or worker on the old code still reads
  the synced setting and does not send its user to `/start`. `parseStudyProfile` reads the old shape as its one target
  everywhere with nothing declared, and a result that is not a band as none. It syncs, exports and wipes as before;
  `/privacy`'s list of what the server holds now names the results.
- **E is data.** The profile gains `exemptBand: "E"`, refined to be one of its `bands` (ADR 9). The engine's
  `skillStanding` reads it: `unknown`, `exempt`, `held` (at or above the target) or `working`.
- **The plan.** An exempt skill leaves Today's tabs, and its hero card is stamped "Exempt: nothing to practise". With all
  three exempt, a cheering Coco replaces the plan. A held scored skill plans with the planner's new `maintaining`: half
  the budget (`MAINTAIN_FACTOR`, a study heuristic like `SHORTEN_FACTOR`), reviews and maintenance, no new items, and no
  diagnostic or mock-exam step (`nextStep`'s `held`). A working skill with no diagnostic is placed at its declared result
  through `studyFocus`'s `declared` and the engine's `declaredStart` (X starts at A); a diagnostic run, measured, wins
  over a declaration. Speaking's plan is still one session, worded as keeping sharp when held. `dayRequestFor` gives
  Today's preview and the drill the same request, so the plan shown is the plan opened. Every goldens test passed unmoved.
- **Onboarding has six steps**: direction, target, *now* (one row of pill radios per skill, "Not yet" to E, each with its
  staircase; skippable), goal, the key, the placement. The target step's B or C sets all three; "My position needs a
  different level in each skill" is folded under it. With reading and writing each held or exempt, the placement offers
  only to start practising (`placementsFor`, `settle`).
- **`/settings/study`, "Your levels and goals"**, is the first screen to edit the study profile after onboarding: the
  results, the targets, the daily goal and the test date, saved whole. It carries `NonAffiliation`, since it shows bands.
  The footer links it as "Your levels", and Today's "Where you stand" links it under the declared result.
- **The staircase** is `@palier/ui`'s `LevelStair`: a step per band, solid up to the result, Coco on it, a flag on the
  target, and at the exempt band a stamp pressed on with the celebration spring (still under reduced motion and in exam
  mode). With a label it is one image named by the sentence ("Reading: you hold C. Your target is C."); without one,
  inside a hero card, it is hidden whole. Every sentence says "you hold", and Where you stand adds "The result you told
  us, not a measure of your practice" (R10, ADR 7).
- **`/progress`** reads each skill's history at that skill's target; its overview reads both at the higher of the two.
- **Tests whose premise changed**, said here as D225 did: `onboarding.test.ts`'s step list, `profileFrom` and defaults;
  `study.test.ts`'s fixture, from one `targetBand` to `targets` and `current`, and its refusal list (an old-shape profile
  with a bad target is still refused); the stepper's six segments; `key.spec.ts`'s and `journeys.spec.ts`'s step counts
  ("Step 1 of 6", the key at 5 of 6) and `toKeyStep`'s four clicks; `helpers.ts`'s `onboard`, which passes the new step and
  takes optional `results`. No assertion about behaviour that this change did not alter was touched.
- **Not an ADR.** Product scope and flow on an existing requirement, recorded here and in the PRD, as D220 and D224 were.

### D260 — the E2E warmup visits one page per route file, and the levels journey onboards once: shard 2 back inside its budget
**Date:** 26 October 2026 · **Status:** accepted (agent's diagnosis of a CI failure the human reported). Amends D249's
warmup list

The human reported #105's medium lane: E2E shard 2 ran past its 300 s budget. It was not this branch's alone: `main` had
failed the same shard at 300 s on #104's merge, and had taken 231 s, then 282 s, on the two merges before it.
- **Where the time goes.** `--shard` splits by count in project order (D223), so shard 2 is all hermetic `chromium` tests,
  and all of them wait for the warmup, which runs alone. Locally, with CI's two workers, shard 2 took 151 s, the warmup
  44 s of it; CI ran about 1.8 times slower, 270 s of tests after 11 s of server start.
- **The warmup visits one page per route file** (`warmup.setup.ts`'s `warmupRoutes`): an entry of `routes.json` with no
  `page.tsx` of its own is an expansion of a dynamic route, and only the first expansion under each parent is visited.
  The eighteen library articles are one route, `library/[subSkill]`, so one article compiles it, which is what D249
  needed; the other seventeen only rendered and waited for the network. 42 visits became 25, and the warmup went from
  43–44 s to 30.6 s locally, in both shards.
- **D259's levels journey onboards once.** Its first two tests each onboarded from a fresh page load; they are one journey
  now, with the same assertions, and the French test is unchanged.
- **Measured locally** (`--workers=2`, a hermetic `next dev` at port 3010, since another app held 3000): shard 2 137 s, twice,
  against 151 s; shard 1 118 s; no test failed or was retried.
- **Not changed:** the budget, and the warmup's serial order (D67). Shard 2 remains the tighter of the two, since nothing
  runs beside its warmup; splitting the hermetic project would be the next lever, if the creep continues.

### D261 — three dev-only advisories close with a lockfile refresh, not an override; Lighthouse's `zod` 3 is dismissed as unreachable
**Date:** 26 October 2026 · **Status:** accepted (human's request; agent's fix and dismissal). Extends D155, D236 and D246

The human asked for the open high and moderate Dependabot alerts to be resolved. Seven were open, all transitive and
dev-only.

| Alert | Package | Severity | Path | Parent's range | Now |
| --- | --- | --- | --- | --- | --- |
| #21 | `body-parser` 1.20.8 | high | `@lhci/cli` → `express` 4.22.3 | `~1.20.5` | 1.20.9 |
| #22–#25 | `fast-uri` 3.1.8 | two moderate, two low | `@stryker-mutator/core` → `ajv` 8.20.0 | `^3.0.1` | 3.1.9 |
| #19 | `ip-address` 10.7.2 | moderate | `@lhci/cli` → … → `proxy-agent` → `socks` 2.8.10 | `^10.1.1` | 10.7.5 |
| #20 | `zod` 3.25.76 | high | `@lhci/cli` → `lighthouse` 12.6.1 → `puppeteer-core` 24.43.1 → `chromium-bidi` 14.0.0 | `^3.24.1` | dismissed |

- **Unlike D155 and D236, the first three needed no override.** Each patched version fits inside the range its parent
  already asks for, so `pnpm update -r --depth Infinity body-parser fast-uri ip-address` moved them. `pnpm-workspace.yaml`
  is unchanged. Dependabot's security updates are enabled, but none had been opened for these three.
- **The lockfile also takes `legacy-javascript` 0.0.3 → 0.0.4.** Lighthouse's `@paulirish/trace_engine` asks for it as
  `latest`, so any re-resolve picks up the newest. That is the whole of Dependabot's PR #98, which was titled "Bump zod
  from 3.25.76 to 4.6.7" but changed no `zod`. It passed CI, and is closed in favour of this one. Nothing else moves, and
  no package is added.
- **`zod` 3 is dismissed on GitHub as `not_used`, not overridden.** No 3.x release is patched (GHSA fixed in 4.6.6).
  - An override to zod 4 would break `chromium-bidi` 14. Its parser reads `parseResult.error.errors`, which zod 4
    removed.
  - Every `chromium-bidi` up to 17.0.2 asks for zod 3. `@lhci/cli` 0.15.1 is its latest release and pins `lighthouse`
    12.6.1, which holds `puppeteer-core` at 24.
  - The vulnerable code never runs. `puppeteer-core` requires `chromium-bidi` lazily, only in `createBiDiBrowser` and
    `createBiDiOverCdpBrowser` (`BrowserLauncher.js`), which serve the `webDriverBiDi` protocol. Lighthouse drives Chrome
    over CDP. Even on that path, the only input zod would validate is puppeteer's own protocol messages, on CI's
    Lighthouse step.
  - **Revisit when** `@lhci/cli` moves to a `lighthouse` whose `puppeteer-core` ships a `chromium-bidi` on zod 4
    (157.x asks for `^4.6.5`).
- **Smoke checks:** `lhci --version` answers 0.15.1. From `express`'s directory, `body-parser` 1.20.9 loads with `json` and
  `urlencoded`. From `ajv`'s directory, a `$ref` across two `$id`s resolves through `fast-uri` 3.1.9 and validates both
  ways. From `socks`'s directory, `ip-address` 10.7.5's `Address6` and `Address4` answer.
- **`pnpm audit` over the whole tree** now shows the two `extract-zip` entries D155 dismissed and the `zod` entry. D236's
  `braces` entry no longer appears. CI's `--prod --audit-level=high` gate is unchanged and exits 0, showing only D135's
  two ignored `content` entries.

### D262 — the E2E lane runs three shards: the hermetic specs' heaviest files sort last, so two left shard 2 at its budget
**Date:** 26 October 2026 · **Status:** accepted (agent's diagnosis of the CI failure the human reported). Extends D178 and D223; amends D260's "the next lever"

The human reported this branch's E2E 2/2 failing. It ran 300 s and was stopped by the budget with 65 of its 66 tests
passed, on a change that touched no app code. The same commit's other run passed shard 2 in 226 s.
- **Shard 2 sat at its budget after D260 too.** Its test step ran 190–300 s in every run since 24 October, and it had already
  failed at 300 s on `main` (#104's merge) and on `current-levels-input`. Shard 1 ran 166–272 s.
- **Why shard 2.** `--shard` splits by count in project order (D223), and inside `chromium` the files sort by name.
  `oral`, `translate`, `key-leak` and `sync`, the four heaviest, all sort late. Locally, at two workers:
  - shard 1 held 27 hermetic tests worth 49 s, beside the 38 production specs;
  - shard 2 held 65 hermetic tests worth 201 s, after a 36 s warmup that runs alone.
- **Tried first, and reverted: three workers on CI.** Locally the suite used about 1.3 of 8 cores at two workers, and
  three took it from 158 s to 127 s. On CI's four vCPUs it did not help: shard 2 took 260 s, then 289 s with the per-page
  title test past its 30 s timeout. There the dev server is the bottleneck, so a third worker only adds contention.
  Shard 1 dropped to about 200 s.
- **So three shards.** Playwright 1.64 has no weighted sharding, and reordering files or splitting the `chromium` project
  to move weight would tie the split to file names. Three shards by count give, locally:
  - shard 1: the 38 production specs and 6 hermetic tests (9 s);
  - shard 2: 43 hermetic tests (111 s);
  - shard 3: 43 hermetic tests (141 s).

  At two workers that puts the slowest shard at about 101 s, against 137 s before. The cost is a fourth medium-lane job
  and one more warmup, on a public repository's free runners.
- **Measured on CI, both runs of `bc7ac21`, all green:** shard 1 took 191 s and 191 s, shard 2 148 s and 223 s, and shard 3
  214 s and 209 s, against 226–300 s for the old shard 2. The gain is smaller than the local split promised, because each
  shard still pays CI's server start and a warmup of about a minute, and the runners vary by about 70 s. That leaves
  about 75 s of headroom, not 150. If the suite keeps growing, the next lever is the warmup, which every hermetic shard
  repeats.
- **The required checks change with it** (`docs/deploy.md`): `Medium lane: E2E 1/2` and `2/2` become `1/3`, `2/3` and
  `3/3`, in `deploy.md`'s table and, with the human's approval once CI was green, in `main`'s branch protection. `verify.yml`'s comment now counts four jobs.
- **Not changed:** the 300 s budget, two workers, `retries: 0`, and the warmup.

### D263 — the staircase is the result picker: a skill's result is picked by tapping its step, and the pill row is gone
**Date:** 26 October 2026 · **Status:** accepted (human's request and choice; agent's design). Amends D259's "one row of
pill radios per skill, each with its staircase"

The human: on a standard monitor the six pills wrapped, leaving E alone on a second line, and the staircase beside them
should be the control, "a much more whimsical user experience". Asked, the human chose the stair only, with no pills.
- **`@palier/ui`'s `LevelStairPicker`**, a new primitive beside `LevelStair`, which stays read-only for Today. A
  fieldset named by the skill holds the stair, and over each step's whole column a label holds a real radio, named by
  the band and transparent, covering the column. The ground before the first step is "Not yet", written under it. So a
  pointer lands on the control itself, the arrow keys walk Coco along the stair, and the E2E helpers' `group` and `radio`
  queries are unchanged. A visually hidden radio was tried first and refused: Playwright found it covered by its label,
  as any pointer would.
- **The geometry is shared.** `levelStairGeometry` takes an optional `ground` (the picker's is `LEVEL_STAIR_PICK_GROUND`,
  wide enough for "Pas encore") and returns each step's hit box, and the ground's, in percent of the drawing, so the
  labels line up with the SVG at any width. No existing geometry value moved.
- **The motion.** Coco is drawn about its feet and placed by `transform`, so a new result slides it over on the
  celebration spring, and the picker keys a short hop by the result, so each choice replays it; the steps' fill eases.
  Transform only, on the motion tokens, and off under the global switch (D160). Hover outlines the step, and the
  keyboard's focus rings it in `accent`. Under forced colours the chosen step is ringed in `Highlight`.
- **The caption** under the stair is D259's sentence, now visible, with no live region, since the checked radio is
  already announced.
- **The layout is one stair to a row.** Three across the 760px column shrank the steps' letters to about 8px.
  `features/study/levels.ts`'s `resultChoices` and `resultValue` went with the pills, and their tests with them.
- **The copy** says to pick the step (`start.nowHint`, now above the stairs, and `studySettings.resultsHint`), in both
  languages.
- **A test whose premise changed**, said here as D259 did: `e2e/levels.spec.ts` found the settings' reading stair as an
  image named by its sentence. The stair is now a radio group, so it checks the group's E and finds the sentence as the
  caption. Today's read-only stair is still found as an image, unchanged.

### D264 — one settings area: the header's gear and the footer's one link lead to `/settings`, whose screens share a menu
**Date:** 27 October 2026 · **Status:** accepted (human's request and choices; agent's design). Amends D201's landing
footer ("the data, sync and key links") and the app footer's link to each settings screen; PRD §7's tree amended in place

The human: the API key, the current levels, Your data and Sync are all settings, and should be one menu area, reached by
a gear at the top right and a link in the footer. Asked, the human chose a settings page over a drop-down, and one footer
link in place of the four.
- **`/settings` is the overview**, a static page with no island: a card for each screen, saying what it holds. Every
  screen keeps its address, so `NoKeyCard`'s `?next=diagnostic`, the privacy notice's links and every spec's `page.goto`
  are unchanged.
- **Every screen under it carries one menu** (`app/[locale]/settings/layout.tsx`, `components/settings/SettingsNav.tsx`)
  on the header's pill track, the screen you are on `aria-current="page"`; the key's guide marks the key. The overview
  leaves it out: its cards are the menu, and two links of each name would make every name ambiguous. The list is
  `features/settings/settings-nav.ts`'s `SETTINGS_ITEMS`, so a new settings screen is an entry there.
- **The header's gear** is the rightmost tool, after sync and the language: `@palier/ui`'s new `gear` glyph in a link
  with `pl-icon-btn`'s 44px target, named and titled "Settings" / « Paramètres », and the white pill inside the area.
  A link, not `IconButton`, which is a `<button>`. The focus order the smoke test holds (skip link, brand, nav) is
  unchanged.
- **The footer's four links are one, "Settings"**, and so is the landing footer's "Your device" column. Export, delete,
  the sync switch and the key were one step from any page; they are now two. R11 asks for export, import and delete
  "each in one action", which still holds on `/settings/data`, and WCAG 3.2.6 holds, since the gear and the link sit in
  the same place on every page. The header's sync status still links straight to `/settings/sync` (PRD §8.11).
- **Tests whose premise changed**, said here as D263 did: the specs that clicked "Your data", "Your API key", "Sync" or
  "Your levels" in the footer (`journeys`, `key`, `key-leak`, `sync`, `content`, `levels`) now go through `helpers.ts`'s
  `openSettings`: the footer's "Settings", then the card. `key.spec.ts` moves between the key and data screens by the
  menu. `footer.levels`, `footer.yourData`, `footer.sync` and `footer.key` are gone, read by nothing.
- **New:** `settings-nav.test.ts`; `gear` in the glyph registry's test; `e2e/settings.spec.ts` (the gear and the footer
  to the overview, each card to its screen with the menu marking it, axe on both, in both languages); `/settings` in
  `routes.json`, `csp-production.spec.ts`'s `PAGES` and the titles test. Lighthouse's list is unchanged: the overview is
  a static page lighter than `/en/settings/key`, which it measures.

## Session log

Newest first. One entry per session that changed something. Never edit an older entry.

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

### 25 October 2026 — `dougkeefe/screenshot-layout-update` (the library's index as one filterable grid, a photograph per article; D257)

Not *Next, decided*, which is unchanged (D206). The human asked for the library to keep its look but take a course
catalogue's layout: tag pills that filter, a photograph per article, and no sections.
- **Domain:** `LIBRARY_TOPICS` and a required `topic` on `LibraryArticle` and its schema; `docs/schemas/library-article.schema.json`
  regenerated; `packages/domain/CLAUDE.md`.
- **Content:** a `topic` line in each of the eighteen articles.
- **Web:** `/library` rebuilt as a hero over one grid under pills. `components/library/` gains `LibraryFilter`; `LibraryCard`
  gains its photograph, skill badge, chips and heading level; the article page shows its own photograph, its topic and
  its reading time. `features/library/filter.ts` and `reading-time.ts` are new; `photos.ts` names nineteen photographs.
  Eighteen WebP files added, `reading.webp` and `writing.webp` removed, `SOURCES.md` rewritten. Messages in both languages.
- **Tests:** `filter.test.ts` and `reading-time.test.ts` are new; `photos.test.ts`, the domain's `library.test.ts` and
  `content.spec.ts`'s library test as D257 lists. `schemas.test.ts`'s article fixture gains the now-required `topic`; no
  assertion changed.
- **Docs:** D257; D247 and the 22 October entry for Today's tabs are archived (rule 8); `apps/web/CLAUDE.md`'s library
  invariant; *In flight*; *Next, decided*'s human item.

**Verified:**
- `pnpm verify`: check-types, lint and boundaries clean; `pnpm test` passed 288 files, 4,615 tests (8 todo).
- After `pnpm --filter @palier/web build`: `content.spec.ts`'s three library tests on the `chromium` project, with the
  warmup, 4 of 4, axe clean on the index, the index filtered to Grammar, two articles in English and one in French; the
  `offline` project's `csp-production.spec.ts` and `offline.spec.ts`, 15 of 15.
- Screenshots at 1280px and 390px, English and French, and the pills measured on one row at 1280px in both languages.
- Not run: the rest of the medium lane, and Lighthouse. CI runs the lane on the pull request.


### 24 October 2026 — `dougkeefe/palier-library-redesign` (the library redesigned, with three photographs; D256)

Not *Next, decided*, which is unchanged (D206). The human asked for the library to be easier to use and better looking,
with royalty-free photographs credited, keeping its hierarchy, accessibility and navigation.
- **Web:** `/library` and `/library/[subSkill]` rebuilt. `components/library/` gains `LibraryCard`, `LibraryPhoto`,
  `PhotoCredit`, `library.css` (the library's rules, moved out of `globals.css`), and `images/` with three WebP files and
  `SOURCES.md`.
  - `features/library/photos.ts` and `features/library/contents.ts` are new. The article's contents and the headings
    they link to take their ids from `contents.ts`. `lib/library.ts` gains `skillOf` and `adjacentArticles`.
  - Twelve message keys in both languages; `back` removed and `intro` shortened.
- **Tests:** `photos.test.ts` and `contents.test.ts` are new. `library.test.ts` gains `skillOf` and `adjacentArticles`. `motion.test.ts` now
  reads `library.css`. `content.spec.ts`'s library test gains the assertions D256 lists.
- **Docs:** D256; D246 and the 22 October entry for `/progress`'s tabs are archived (rule 8); `apps/web/CLAUDE.md`'s
  library invariant; *In flight*; *Next, decided*'s human item.

**Verified:**
- `pnpm verify`: check-types, lint and boundaries clean; `pnpm test` passed 286 files, 4,602 tests (8 todo).
- `content.spec.ts`'s three library tests on the `chromium` project, with the warmup: 4 of 4, axe clean on `/en/library`,
  `/en/library/agreement`, `/fr/library/agreement` and `/en/library/inference`.
- After `pnpm --filter @palier/web build`, the `offline` project's `csp-production.spec.ts` and `offline.spec.ts`: 15 of
  15, so every page in both locales has zero violations with the photographs.
- **Lighthouse** with `lighthouserc.json`'s desktop preset, three runs each:
  - `/en/library`: performance 0.98, 1 and 1;
  - `/fr/library/agreement` and `/en/library/inference`: 1 on every run;
  - accessibility 1 and CLS 0 on all nine runs, and LCP 670–1,096 ms.
- **On the production build** (`next start`), the worker's caches held all three library photographs after one load of
  `/en/home`. With the network off, `/fr/library/pronouns` drew its photograph from the cache (200).
- Screenshots at 1280px and 390px, English and French, with a keyboard pass to a card's focus ring.
- Not run: the rest of the medium lane. CI runs it on the pull request.

### 24 October 2026 — `dougkeefe/progress.md-archive` (this file split into a live file and `progress-archive/`; D255)

Not *Next, decided*, which is unchanged (D206): the human asked for `progress.md` to be cut down to its basics with an
archive, keeping everything it records.
- **Docs:** `docs/progress-archive/` (its README, `history.md`, three deviation files, two session files); this file's
  header, working agreement (rules 1, 4 and 7 amended, rule 8 added), *In flight*, *Next, decided*, the deviation index
  and D255; root `CLAUDE.md`, `docs/README.md` and `apps/web/CLAUDE.md` in place.
- **Test:** `apps/web/src/docs/progress.test.ts`.

**Verified:**
- **Nothing lost or changed:** a script split the original at every `### D…` and session heading, then did the same
  over the live file and the archive together. All 381 blocks (254 deviations, 127 session entries) are present once and
  byte-identical, and only D255 and this entry are new. Every other line of the original is still somewhere, except the
  deliberate edits to the header, the working agreement, *In flight* and *Next, decided*.
- **Size:** `progress.md` went from 12,537 lines and 970 KB to about 1,100 lines and 150 KB, 245 of the lines being the
  index.
- `pnpm verify`: check-types, lint and boundaries clean; `pnpm test` passed 284 files, 4,589 tests (8 todo), in 48.7 s.
- **Proven to bite**, each restored and the files compared identical afterwards:
  - D150 deleted from its archive file: "expected { missing: [ 'D150' ], repeated: [] }", and the index test failed too.
  - an eleventh live session entry: "expected 11 to be less than or equal to 10".
  - D50 moved into `deviations-D100-D199.md`: "expected [ 'D50 in deviations-D100-D199.md' ] to deeply equal []", with
    the order and index tests.
  - D3's status changed in the archive and not in the index: the index test failed.
- Not run: the medium lane, since nothing it covers changed.

### 24 October 2026 — `dougkeefe/palier-reading-comprehension-add` (reading's library articles; D254)

*Next, decided*'s slice, which the first commit on this branch set (D253).
- **Domain:** `LibraryArticle` a union over reading and writing (`LibraryExcerpt`, `LIBRARY_SUB_SKILLS`), the schema a
  discriminated union on `subSkill`, `parseLibrary` over all eighteen; `docs/schemas/library-article.schema.json`
  regenerated (`pnpm run test -u`).
- **Content:** eight reading articles in `content/library/`.
- **Web:** `/library` in two sections; the article page's excerpts and reading button; `articleHref` for reading;
  `readingHeading`, `writingHeading`, `excerpt` and `practiseReading` in both languages, `readingLater` removed;
  `routes.json` regenerated by `prepare-public.mjs`.
- **Docs:** D254; `packages/domain/CLAUDE.md` and `apps/web/CLAUDE.md`; architecture.md §5 and PRD §8 in place;
  *Next, decided* now D206.

**Verified:**
- `pnpm verify`: check-types, lint and boundaries clean; `pnpm test` passed 283 files, 4,578 tests (8 todo).
- **Proven to bite:** with `content/library/inference.json` moved away, `library-content.test.ts` failed all five tests,
  naming `(root): "inference" has no article`; restored, it passed.
- `content.spec.ts` on the `chromium` project, with the warmup: 12 of 12, the new reading-drill journey and the
  eighteen-article library test included. Run through a temporary, uncommitted config on port 3010, since another
  project's dev server held 3000.
- After `pnpm --filter @palier/web build`, the `offline` project's `csp-production.spec.ts` (every page in both locales,
  `/library/inference` included, zero violations), `offline.spec.ts`, `exam-offline.spec.ts` and
  `telemetry-offline.spec.ts`: 17 of 17.
- Not run: Lighthouse, the rest of the medium lane and the live smoke. CI runs the medium lane on the pull request.

### 24 October 2026 — `dougkeefe/palier-reading-comprehension-add` (1.0 recorded: Gates O and M passed, bank v4 read; D253)

The human asked about the library's "Articles on reading comprehension come after 1.0", and then reported the read of bank v4,
Gate O and Gate M done. This commit changes documents only.
- **D253:** the three recorded as passed with no finding; ADR 24 stands.
- **Ticked:** Phase 6's Gate O and exit criteria 3 and 5, Phase 7's Gate M and exit criteria 1 and 3, and R1, R2, R8 and
  R13 in the requirement table. The status table reads Phase 6 complete and Phase 7 complete, 1.0.
- **In flight:** the rows merged as #88–#99 removed; this branch's row added.
- **Next, decided:** reading's library articles (D254), claimed by this branch.

**Verified:** documents only, so no command proves this commit; the next commit on the branch runs `pnpm verify`.

Older entries, newest first: [October 2026](progress-archive/sessions-2026-10.md) ·
[September 2026](progress-archive/sessions-2026-09.md).
