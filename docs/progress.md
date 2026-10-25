# Palier: Progress

**Last updated:** 24 October 2026 (this file split into a live file and `progress-archive/`, D255; next, D206's bank budget)
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
| `dougkeefe/progress.md-archive` | **This file split into a live file and `progress-archive/`** (D255): the deviations and session entries moved verbatim, an index of every deviation, and a fast-lane test that holds the split. | 24 October 2026 |

*(Merged rows are removed: this table tracks current work, and the session log is the permanent record. The rows
removed up to 24 October 2026, the last of them the reading articles (#100), are listed in
[`progress-archive/history.md`](progress-archive/history.md).)*

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

**For the human, from D254:** read the eight reading articles' French and English (`/fr/library` and `/en/library`,
the reading section), as Gate L read writing's. In particular, say whether each excerpt reads as federal administrative
French and whether each "what to notice" is the only defensible reading.

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

### D246 — `vite` is a pinned root devDependency, not an auto-installed peer; Dependabot's group is rebuilt locally
**Date:** 22 October 2026 · **Status:** accepted. Extends D155 and D236

- **Three Dependabot alerts were open on `vite` 8.3.0**: #16, #17 (high) and #18, all on its bundled `launch-editor`,
  fixed in 8.3.3. `vite` was in no `package.json`. pnpm auto-installed it as the peer of `vitest` and `@vitest/mocker`,
  both of which accept `^8.0.0`.
- **D155's scoped override does not work here.** An `overrides` entry for `vite` reached the lockfile and changed
  nothing: pnpm resolves an auto-installed peer from the versions already in the graph, not through overrides.
  `pnpm update vite -r` left it alone for the same reason.
- **So the root names it: `"vite": "8.3.5"`**, beside `vitest` and pinned exactly like the other devDependencies. It
  adds no package to the tree, since it was already there, and `vitest` and `@vitest/mocker` now resolve their peer
  to it. Dependabot can now see it and will propose its updates in the minor-and-patch group, where before it could
  only raise alerts.
- **Dependabot's PR #90 (the 18-update group) was rebuilt rather than merged.** Its lockfile resolved
  `packages/testing`'s `msw` and `vitest` against an optional `@types/node` peer at **26.6.5**. That left three
  `@types/node` versions in the tree, one of them the major D155 holds back with the runtime.
  - The `dependabot.yml` ignore rule cannot catch this, because it only governs the versions Dependabot proposes.
  - The same `package.json` specifiers, installed with the repo's pnpm 10.13.1, resolve every peer to 22.20.5. That
    includes `apps/web`'s `^22`, which had been left at 22.18.11.
  - Read a Dependabot lockfile for a stray major before merging it, as well as for the bumps it lists.

### D247 — `/progress`'s detail is three equal tabs, speaking included; never a radio switch
**Date:** 22 October 2026 · **Status:** accepted (human's request; agent's design and copy). Amends D245's "In detail" bullet, not its print

The human asked why the detail offered only Reading and Writing, and asked for all three domains to be equal there, with a
better control than radio buttons.

- **Why tabs, not radios.** A radio group reads as a question to answer, and its dots made the switch look like one. This
  control shows another view of the same place, which is what a tab means, and a screen reader now says "tab, 3 of 3,
  selected".
  - The control is `@palier/ui`'s new `Tabs` and `TabPanel`: WAI-ARIA's pattern, controlled, and selection follows focus
    (←/→ wrap, Home/End). Only the selected tab is in the tab order, and the keyboard rule is `tabsKeydown` in `logic.ts`.
  - Each tab is its domain's glyph on its fill from `SKILL_LOOK`, then its name. The shown tab has a 3px `primary`
    underline, and `Highlight` under forced colours. The faint rule under the list is an inset shadow, not a border, so
    no tab hangs past the list: a 1px overhang gave the scrolling list a vertical scrollbar wherever scrollbars show.
  - Below 600px the three share the width, mark over name, and a long French name hyphenates, so all three stay in view
    (no overflow at 375px in either language).
  - `SKILL_LOOK`'s tone is now typed `TabTone`, a subset of `CardTone`.
- **Speaking was missing because the detail was built from `ProgressReport`**, which only the scored skills have. It now
  has a panel of the same shape, two cards from 900px (`components/progress/OralCards.tsx`):
  - **Your spoken sessions**: the totals, then the newest five ended sessions (`ORAL_RECENT_SESSIONS`, a display rule in
    `progress-view.ts`, not the exam's). Each row has its type, date, minutes spoken and words a minute, and opens its
    report. Pace is the engine's `fluencyMetrics`, measured and never judged (principle 8).
  - **From your latest report**: the newest assessed session's fixes, each the criterion it cost and a link into the
    drill for its sub-skill. Then a link to the full report.
  - **No criterion level appears here.** On the report each level stands beside its quoted evidence; repeating "Level B"
    without it is the bare estimate R10 forbids. The panel says where the levels are.
  - **Nothing on `/progress` spends.** With no report yet, the panel links the newest session a report can still be
    asked of: one with a spoken answer, whose scenario the bank still holds. There the report is asked for with its cost
    shown (D237). With no such session, or no session at all, it links `/practice/oral`.
  - The data is `@palier/app`'s new `oralProgress(limit, { oral, items })`, beside `oralHistory`. It reads no filler list,
    since pace needs none. The view states (`empty`, `unreported`, `reported`) are `progress-view.ts`'s `oralDetail`.
- **The hero points into the tabs.** Each glance card ends in "{skill} in detail", which selects and focuses that tab
  and brings the detail's heading to the top. Inside the deep panel it is drawn in `primary` with a `primary` focus ring:
  the deep panel's white `--accent` would vanish on a light fill.
- **Print is unchanged.** The tabs sit in the screen-only head; paper renders the plain detail with both scored skills
  and D145's oral card, whichever tab was chosen. `progress-history-production.spec.ts` now prints with speaking's tab
  chosen and asserts that the tab list is hidden on paper.
- **Not changed:** Today's plan switch and the exam picker keep their radios. The picker's is a real form choice. Today's
  plan switch is a view switch like this one and could take `Tabs` next, if the human wants it.

### D248 — Today's plan is three equal tabs, speaking included; its plan is one suggested session
**Date:** 22 October 2026 · **Status:** accepted (human's request; agent's design and copy). Amends D219's plan switch, and
closes D247's "Not changed" note on Today

The human pointed out that Today's plan offered only Reading and Writing, and that its radio buttons were the wrong
control, as they had been on `/progress` (D247).

- **Tabs, not radios**, for D247's reason: the switch shows another view of the same card. The plan card uses
  `@palier/ui`'s `Tabs` and `TabPanel` unchanged (`idPrefix` `today-plan`), each tab in its `SKILL_LOOK` glyph and fill.
  `features/skills/skill-look.ts`'s new `SKILL_KINDS` is the one order, and `/progress`'s `DETAIL_TABS` is it.
  - The card is half the page, so here the three tabs **share its width at every size** and a long name wraps beside
    its mark: "Compréhension de l'écrit" scrolled the list by 107px at 1280px before that. Below 600px the primitive's
    own layout applies (mark over a centred name).
  - `.app-segmented`'s home-only rules are gone; the class stays for `ExamPicker`'s real form choice.
- **Speaking's plan is one session.** No planner holds oral practice, and the hero's oral rail already counts one ended
  session as the day's goal (D219), so the plan matches it (`features/home/oral-plan.ts`, pure and tested):
  - **The suggestion is the kind practised least lately** on this device (`oralHistory`, newest first). A kind never
    practised comes first and a tie keeps the picker's order, so a new device is offered the warm-up. A session whose
    scenario has left the bank names no kind and is passed over.
  - The row is the kind with the picker's own `sessionMeta` (its minutes and **practice mode's** estimate, the picker's
    default and the cheaper mode), then the kind's purpose and "Start speaking, {minutes} min".
  - **The start links to `/practice/oral`, not to the session.** Choosing a session there opens the microphone check, which
    must never happen on a page load, and the mode is chosen there, where the session is priced before it starts (D237).
  - Once a session has ended today the plan says "Done for today" with today's sessions and minutes, and "Practise again".
  - With no key it says spoken practice runs on the key and links the key screen. `NoKeyCard` is a card with its own
    `h2`, which would have nested a card and a heading inside the plan.
  - "More ways to practise" drops its speaking link on this tab. There is no next-step banner: speaking has no
    diagnostic and no mock exam.
- **Speaking's "Where you stand"** is `/progress`'s "From your latest report" through the same `oralDetail`: the
  newest report's fixes, each a way into its drill (`OralCards.tsx`'s `OralFixes`, now exported), or the way to a
  session a report can still be asked of. **No criterion level is shown off the report** (R10).
- **Nothing on Today spends or writes.** `loadOral` reads the key's status, `oralSessionChoices`, `oralHistory`,
  `oralProgress` and `featureCosts`. It leaves `closeAbandonedSessions`, which writes, to the oral screen.

### D249 — the E2E warmup reads `routes.json`, articles included, and compiles the pages it cannot name
**Date:** 23 October 2026 · **Status:** accepted (agent's diagnosis of a CI failure the human reported). Amends D67's
warmup and D223's route list

PR #95's first medium lane failed one test it does not touch: `content.spec.ts`'s library test clicked "Agreement" and
the URL never left `/en/library`. It had failed the same way once locally, on the first parallel run.
- **The cause is a cold route compiled by its own click.** The CI trace shows the click's RSC request
  (`/en/library/agreement?_rsc=…`) never answered, while the page logged "[Fast Refresh] rebuilding", one rebuild taking
  4.4 s. The warmup derived its list with `routesFrom(pageDirs)`, which drops dynamic segments, and never passed the
  article expansion, so **`library/[subSkill]` was never warmed**. A probe on a fresh `next dev` showed a route's first
  compile makes every open page rebuild, cold `/en/progress` included. Once the warmup covered the articles,
  `/en/library/agreement` answered in 99 ms against about 450 ms cold, and nothing else rebuilt.
- **The warmup now reads `src/lib/routes.json`**, the app's one route list (D199), which the discoverability spec
  reads too and a test holds equal to the page files. That adds the ten articles: the warmup took 42 s locally, against
  34–36 s before.
- **It also visits the pages that list cannot name**, which `errors.spec.ts` visits (`UNLISTED`): an unknown path's 404
  and the hermetic hook's `route` and `global` views, each waiting for its `h1`, since the thrown route reaches its error
  screen after the network is idle. The 404's first visit had made every open page rebuild; after this it does not.
- **One residual is not fixed.** The thrown route (`/en/hermetic/route`) still recompiles once, for about 300 ms, on its
  first visit from a new browser after the warmup, even when the warmup visited it twice. The cause was not found. That
  rebuild is short, and it comes from a test that only reloads and reads; it can still drop another test's click in the
  same window.
- **Not changed:** no test's assertions. The failing test was right; its route was cold.

### D250 — The translator: one call, two jobs, and study links that are data, never a model's
**Date:** 23 October 2026 · **Status:** accepted (human's request; agent's design and copy)

The human asked for a translator like Google Translate: the left text area in English or French, the right one always
French. English gets the best translation for the Canadian federal government. French is the user's own attempt, so the
right side is its corrected version, and below it an explanation of what was strong, where each error was and why it was
corrected, with links to study each error.

- **One `AiProvider` method, `translate`, a sixth amendment to §3.3.** It takes `{ text, source, target, feedbackLang }`;
  `source: null` lets the model say which language the text is in. **A text in the target language is a correction**:
  `output` is the text with only its errors fixed, `strengths` up to four, and `corrections` placed over the user's words.
  **Any other text is a translation**: `output` and up to six `notes` on its choices (a federal term, an official name, a
  false friend avoided). `checkTranslation` holds the shape (no notes on a correction; no strengths or corrections on a
  translation), and `assembleTranslation` places each correction by its excerpt, D105's rule, so a model never sends
  offsets. A source the user named that the model disagrees with is a malformed answer, retried once.
- **Each correction names a written-expression sub-skill, and the links come from data.** A model-written URL could be
  dead or wrong, so the model names the sub-skill and the screen links (1) Palier's own library article for it and (2) the
  sub-skill's entries in **`content/resources/resources.json`**, a new content artefact (`study-resource` in
  `CONTENT_SCHEMAS`). `parseStudyResources` refuses a duplicate id or address, an address that is not `https`, that carries
  credentials, or that is not on its source's own host (`STUDY_RESOURCE_HOSTS`: the Language Portal of Canada at
  `nos-langues.canada.ca`, the OQLF's Banque de dépannage linguistique, and TERMIUM Plus), and a list missing any
  written-expression sub-skill. The draft schema is strict, so an answer carrying a link of its own is refused.
  - The 21 addresses were checked by hand on 23 October 2026 against the sources' own index pages. The Language Portal's
    *Clés de la rédaction* has no thematic index (only an alphabetical one), so its federal tools stand where they fit
    (ConjugArt, Le Rouleau des prépositions, the Dictionnaire des cooccurrences, the Lexique analogique, the correspondence
    section, TERMIUM Plus), and the OQLF's theme pages cover the rest.
- **The `assess` model and one feature, `translation`.** `pricing.json`'s figure is a PLACEHOLDER (about 1,500 tokens in
  and 1,500 out) until the live smoke records it: the smoke now translates two fixed texts, `TRANSLATIONS`, and records
  `translate.json` with `--record`, as it does `interpretDiagnostic` (D211). `PROMPT_VERSION` stays at 5: a new prompt does
  not change the others.
- **Nothing is stored.** The text goes to OpenAI with the user's key and nowhere else [R12]; the answer lives on the
  screen. So there is no store, no sync, no export and nothing for a wipe beyond the in-flight request, which
  `forgetInFlight` drops. One request at a time is joined from module scope (`translationInFlight`, D143), so leaving and
  coming back follows it rather than paying twice. `/privacy` needed no change: its "paid features call OpenAI" covers it.
- **Limits are product rules, not exam rules.** `MAX_TRANSLATION_CHARS` (4,000, about a page) is in the use case, which
  refuses an empty or over-long text before any request. The screen shows the characters left and holds the button.
- **The screen** (`components/translate/Translator.tsx`, decisions in `features/translate/translate-view.ts`): a
  Detect / English / French choice and "Always in French", the two panes side by side from 640px, the estimate beside the
  button (D237), "Copy the French", and an answer that stays through an edit and says it is for an earlier text. Below: for
  a correction, the strengths, the user's text with each correction marked and numbered, each correction as
  "“original” becomes “correction”" with its sub-skill and reason, then "What to study next", grouped by sub-skill, most
  corrections first, with the guide and the references, each in a new tab with `rel="noopener noreferrer"` and
  `hreflang`. For a translation, its notes. An AI caution is shown with every answer. No band is shown, so no
  `NonAffiliation` is needed.
- **Not built:** a history of past translations (nothing is kept, by design), and an English target, which waits for the
  English mirror (Phase 8). The request already takes `target`.

### D251 — The translator translates on a pause, Google Translate's way, on a page wide enough for two panes
**Date:** 24 October 2026 · **Status:** accepted (human's request; agent's pause length, cap rule and layout). Amends
D237 for the translator only, D250's screen, and D202's header

The human looked at D250's screen on the deployed site and asked for it to work like Google Translate:
- the panes were cramped in the 760px column, and the French box sat about 56px below the editor;
- "Always in French", the intro paragraph and "Start again" were noise;
- it should translate after a pause in typing, with no button. No estimate before each call was needed, but a running
  total while in use was welcome;
- copying should be a standard icon at the French's top right;
- the header's About should become Translate, with About kept in the footer.

- **No ADR records "one press spends"**: D237 made it, amending D108. This entry amends D237 for this screen only. Every
  other spending screen keeps its button and its estimate beside it.
- **Wide, not stacked.** The page carries `.app-wide` (1160px, as Today does). The panes sit side by side from 900px and
  stack below that. Each pane is a CSS subgrid over three shared rows (its label, its box, what goes under it).
  - **Why they misaligned:** each pane was its own grid stretched to the taller pane's height. The French pane has one
    row fewer under its box, so its spare height went into its rows and pushed the box down.
  - With the subgrid the boxes start on one line and are one height, and the French grows when the editor is resized.
  - The explanation below keeps a 760px reading measure.
- **The pause is 1.5 s** (`TRANSLATE_PAUSE_MS`, a product rule beside `MAX_TRANSLATION_CHARS`, not an exam rule). The
  human suggested about 2 s and left it to the agent.
  - It is roughly the end of a burst of typing and short of a mid-sentence think.
  - Each send is a paid call on the `assess` model, whose own latency dwarfs the pause, so a shorter one would mostly buy
    calls for half-written sentences.
  - `shouldTranslate` sends only a text with words in it, within the limit, with nothing out or failed, whose French is
    not already on screen. Space typed at the end is no change (`isStale` compares `trimEnd`), so the space before the
    next word buys nothing.
- **Typing never stops.** The reducer takes edits and a language change while a request is out, which D250 held.
  - The answer lands with the request it answered, so its marks point into the text that was sent.
  - It then reads as stale (drawn muted), and the next pause sends the newest text. Only one request is out at a time,
    as `translationInFlight` already joins.
  - Emptying the text empties the French, which replaced "Start again" and its `clear` action.
- **A failure is never retried on its own.** It waits for the text to change, or for "Try again", which stays a press
  with its estimate beside it (D237).
- **Past the cap a pause no longer sends** (`autoTranslates`, from the pre-flight's `after`). The cap is soft and never
  blocks (D104, D237), but a call on every pause must not quietly run past it.
  - There the screen says translating as you type is paused, and offers one "Translate" press with its estimate:
    D237's way.
  - Near the cap it keeps translating and shows the reminder.
- **The running total** is the visit's: `@palier/app`'s new `featureSpendSince({ feature, from })` over the ledger,
  from the container's clock when the screen opened. It reads "This visit so far: US$0.04 on your OpenAI key, for 2
  texts", re-read as each request settles, and it says "at least" when a call could not be priced.
  - The estimate before a call is gone, as the human allowed.
  - The no-key card still states the per-text cost.
  - "Your text goes only to OpenAI" stays.
- **Focus never moves.** D250 moved focus to the status line and then to the answer's heading; on every pause that would
  pull the cursor out of the editor. A polite live region now says "The French is ready." as each answer lands. The
  editor is never read-only, and the wait (`Waiting`, `live={false}`) sits under the French.
- **The copy icon** is `@palier/ui`'s new `IconButton`, a glyph alone at the 44px target. Its `label` is required, as
  its accessible name and its tooltip. `copy` joins `GLYPH_PATHS`, a new entry, never a case. "Copied." is still said in
  a status line, and the glyph shows a tick for 2 s.
- **The header's fifth destination is Translate** (`NAV_ITEMS`, `nav.translate`), in About's place. About stays in the
  footer, where it always was, so D145's "about" link is unchanged. The specs that clicked the first "About" now reach
  the footer's, and still land on `/about`.

### D252 — The translator's explanation sits in the card, under the panes; the running total and the privacy line below it
**Date:** 24 October 2026 · **Status:** accepted (human's request). Amends D251's layout only

The human looked at D251's screen and asked to swap two things. The card held the panes, then the visit's running total
and "Your text goes only to OpenAI…", and the explanation (a translation's "Choices worth knowing", or a correction's
strengths, corrections and "What to study next") came after the card, furthest from the text it explains. The
explanation is what the user values most, so it should sit closest to the text areas.

- **In the card, in order:** the language choice, the two panes, then what bears on the next send (a failure, the cap's
  pause, the over-cap press with its estimate, the cap reminder; absent in the usual case, when a pause translates), then
  the explanation. The press stays next to the text it sends, rather than under a long explanation.
- **Below the card:** the visit's total and "Your text goes only to OpenAI", still shown only with a key held, where the
  no-key card is shown without one.
- The explanation keeps its 760px reading measure inside the 1160px card. No message, decision or style changed.

### D253 — Gates O and M passed and bank v4 read: 1.0
**Date:** 24 October 2026 · **Status:** accepted (human decision); resolves Gate O and Gate M, completes Phases 6 and 7, and
answers ADR 24's first *revisit when*

- **The human reported all three done**, asked which in turn: the read of bank v4, Gate O and Gate M. Their scope is the one
  *Next, decided* gave them, which is superseded now but visible in git history.
  - **v4:** "I've read the bank and we're good to go." No disagreement was reported, so ADR 24's first *revisit when*
    (disagreement on more than two items) is not met, and **ADR 24 stands**. No cross-family re-review is owed before v5.
  - **Gate O:** `docs/realtime-checklist.md` on its six browser and platform pairs, the realtime route read line by line with
    its rate limit, the self-hosted endpoint deployed and read, `docs/deploy.md`'s log check, the screens built since Gate L
    on the deployed site, and the French of the copy added since Gate L.
  - **Gate M:** an outside item submission [R13] and §12.1's trademark check. The repo was public (D195), the domain done
    (D238) and the full-volume bank shipped (D203) before.
- **No finding came with it, so no message, content or code changed.** Gate O asked open questions: whether
  `key.offerStays`'s "which keeps nothing" still reads true, whether D193's reading is what ADR 3 meant, the landing
  headline's three lines, "Start free" in the menu, the circle on the French video's closing card, and a French key video.
  No change was asked for, so each stands as built. They are not recorded as separate answers.
- **Not reported:** which submission was the outside one, and the trademark check's detail. The gate holds the tick, as
  D164's unreported screen-reader user's pass did not.
- **Ticked:** Phase 6's Gate O and exit criteria 3 and 5; Phase 7's Gate M and exit criteria 1 and 3; R1's real-browser pass,
  R2's human read of a sample, R8's copy since Gate L, and R13.
- **What stays open, outside both gates:** the product pilot (Gate E, Phase 3's last criterion), Gate J, Phase 5's deferred
  criterion (D130), the standing human items in *Next, decided* (`PALIER_SITE_URL`, the retention dry run, the examiner's
  `tts-1` voice), and D206's bank-size finding.
- **After 1.0**, Gate K's deferrals open (D145): reading's library articles, XP and levels, and the countdown. Reading's
  articles come first (D254).

### D254 — reading's library articles: eight, with excerpts in place of sentences to write
**Date:** 24 October 2026 · **Status:** accepted (agent), Gate K's "after 1.0" (D145) now that 1.0 is reached (D253); the
human asked about the library's "Articles on reading comprehension come after 1.0." Amends D162's "one article per
written-expression sub-skill"; `architecture.md` §5's tree and PRD §8's `/library` row amended in place

- **One article per reading sub-skill, eight**, at `content/library/<subSkill>.json`, beside writing's ten. Each has a
  bilingual title and summary, two sections of two paragraphs on what to look for and the traps in the options, and three
  **original** excerpts in federal administrative French, each with what to notice. They are the agent's drafts, French
  included, written from how bank v4's reading items test each sub-skill; they are the human's to read (*Next, decided*).
- **The article's shape follows its sub-skill.** `LibraryArticle` is now a union: `WritingLibraryArticle` keeps
  `{ avoid?, write, why }` examples, and `ReadingLibraryArticle` takes `LibraryExcerpt`, `{ excerpt, why }`. "Instead
  of / Write" means nothing for a reading point, and a reading article cannot pass with sentences to write, nor relate to
  a writing article. The schema is a `z.discriminatedUnion` on `subSkill`, so a mismatch is reported at its own path
  (`3.examples.0…`), not as one "invalid input".
- **`parseLibrary` requires one article per `LIBRARY_SUB_SKILLS`** (reading's eight, then writing's ten), and an oral
  sub-skill is refused. `articleHref` answers for reading too, so **a reading item's explanation now links its article**,
  in the drill (a new tab) and the exam review, through the existing `ArticleLink`, with no change to either screen.
- **The web:** `/library` lists reading first, then writing, each under its heading, and `library.readingLater` is gone.
  A reading article's excerpts are tagged "Read" / « Lisez » with the article's `lang`, and its button leads to
  `/practice/reading`. `skillHeading` became `writingHeading` beside `readingHeading`; `intro` names both skills. The eight
  routes joined `routes.json` (so the warmup visits them) and the precache, by file name, with no script change.
- **A content bar for reading:** at least three excerpts per article, beside writing's four sentences to write.
  Excerpts are longer, and three cover each sub-skill's traps.
- **Tests whose premise changed, said here as D207 did:**
  - `links.test.ts`'s "links a reading sub-skill nowhere, since reading's articles come after 1.0" now holds that every
    reading sub-skill links to an article, and that an oral one links nowhere.
  - `lib/library.test.ts` counted ten articles; `library-content.test.ts` counted `WRITING_SUB_SKILLS` files and required
    four `avoid` examples of every article; `library.test.ts` built writing articles only. Each now covers both skills.
  - `content.spec.ts`'s library test counted ten entries and probed `/en/library/main-idea` as a 404. It counts eighteen,
    and probes an oral sub-skill, `/en/library/fluency-and-hesitation`. A reading drill's journey into its article is new.
- **Lighthouse's list is unchanged** (19 URLs): a reading article is the same server template as `/fr/library/agreement`,
  which it already measures, and a 20th URL adds five runs to the medium lane. `csp-production.spec.ts` gained
  `/library/inference`, which costs one page load.
- **The bank grows by nothing**; the precache gains eight article pages in each locale.

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

## Session log

Newest first. One entry per session that changed something. Never edit an older entry.


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

### 24 October 2026 — `dougkeefe/translate-page-output-order` (the translator's explanation in the card; D252)

Not *Next, decided*, which is unchanged (Gate O): a human-requested detour. The human asked for the explanation to sit
closest to the text areas, and the visit's total and "Your text goes only to OpenAI" to sit below the white card.
- **The screen** (`Translator.tsx`): `Explanation` moves inside the `Card`, after the panes and the send controls; the
  running total and the privacy line move below the card, still shown only with a key held. No message, decision or
  style changed, and no branch was added.
- **`apps/web/CLAUDE.md`**: the translator's bullet says where each sits.

**Verified:**
- `pnpm verify`: check-types, lint and boundaries were clean, and `pnpm test` passed 283 files, 4,570 tests (8 todo).
- The chromium project, with the warmup, passed 6 of 6 for `translate.spec.ts` and 14 of 14 for `key-leak` and
  `journeys`. Both runs used port 3010 through a temporary, uncommitted config, since another project's dev server held 3000.
- A temporary, uncommitted spec checked at 1440px and 375px that "Choices worth knowing" is inside the card holding the
  editor, and that the total is outside the card and below its bottom edge. It also took the screenshots.
- Not run: the `offline` project, `csp-production` and the live smoke.

### 24 October 2026 — `dougkeefe/translate-page-access` (the translator reworked, translating on a pause; D251)

Not *Next, decided*, which is unchanged (Gate O): a human-requested detour. The human asked for the translator to work
like Google Translate, on a page wide enough for its two panes, after looking at D250's screen on the deployed site.
- **The decisions** (`translate-view.ts`):
  - the reducer takes typing while a call is out;
  - an emptied text empties the French;
  - `clear` is removed;
  - `isStale` ignores space at the end;
  - `shouldTranslate`, `autoTranslates` and `TRANSLATE_PAUSE_MS` (1.5 s) are new.
- **The screen** (`Translator.tsx`): the pause effect, the over-cap press, the running total, the polite announcement in
  place of the focus moves, the copy icon in the French's corner, and the wait under the French. The page takes
  `.app-wide`, and the panes share a subgrid.
- **`@palier/app`**: `featureSpendSince` and `FeatureSpend`, wired in the container. **`@palier/ui`**: `IconButton` and
  the `copy` glyph, with `packages/ui/CLAUDE.md` updated.
- **The header**: `NAV_ITEMS`' fifth item is Translate, in About's place.
- **Messages** in both languages:
  - removed: `intro`, `targetLabel`, `stale`, `clear` and the three `button_*`;
  - added: `ready`, `translateNow`, `capPaused`, `visitTotal`, `visitTotalUnpriced` and `nav.translate`;
  - changed: `editorHint` and `sending`.
- **Tests**:
  - `translate.spec.ts` is rewritten as 5 tests:
    - the header's way in, and the drill's, with no key and no call;
    - a correction on a pause with no button, the copy icon and the running total;
    - space at the end buying nothing, then a new sentence sent;
    - an emptied text;
    - a call held while the user types on, which then sends the newest text;
    - past the cap, no call until the press;
    - a failure never retried.
  - Key-leak step 3g sends on the pause.
  - Unit tests cover each new branch.

**Verified:**
- `pnpm verify`: check-types, lint and boundaries were clean, and `pnpm test` passed 283 files, 4,570 tests (8 todo).
- After `pnpm build`, the chromium project passed 6 of 6 for `translate.spec.ts` with the warmup. The same project then
  passed 48 of 48 for `key-leak`, `smoke`, `content`, `generate`, `workshop` and `journeys`. Both runs were on port 3010
  through a temporary, uncommitted config, since another project's dev server held 3000.
- In Chrome at 1440px the editor and the French measured one top (392px) and one height (286px). At 375px they stack.
- Not run: the `offline` project, `csp-production` and the live smoke.

### 23 October 2026 — `dougkeefe/translate-to-french` (the translator reviewed against the standards; D250)

Not *Next, decided*, which is unchanged (Gate O). The human asked whether PR #96 met the project's standards, its
documentation especially. The code and its tests did; the documents outside this file did not, and the prompt
contradicted itself.
- **The documents brought in line with D250.** `implementation-plan.md` §3.3 gains `translate`, and `interpretDiagnostic`,
  which ADR 25 added without amending it; `architecture.md` §4's tree gains `content/resources/`; `product-requirements.md`
  §8.7 gains an "As built" paragraph for the translator; `apps/web/CLAUDE.md`'s island list names it.
- **The prompt no longer asks for every value.** Its example shows both jobs' fields, and its closing line, shared with
  the other prompts, said "filling every value", which asks for the mixed shape `checkTranslation` refuses, a retry billed
  twice. It now says which arrays each job leaves empty, and names no source in the example when the model is to decide.
  `PROMPT_VERSION` stays at 5: nothing for this prompt is recorded.
- **The screen's locale decisions moved into `translate-view.ts`** with tests (`translatorFeedbackLang` over the oral
  report's `feedbackLangFor`, `resourceTitle`, `resourceInOtherLanguage`), so `Translator.tsx` holds rendering only.
- **A correction to the entry below**: `translate.spec.ts` has 3 tests, not 4; the run's fourth was the warmup.
- **The translator is D250, not D248.** Main's #95 merged D248 (Today's tabs) and D249 (the warmup) while this branch
  was open, so every D248 this branch wrote, in code, tests and documents, now reads D250 (D16's lesson: a number is
  taken at merge).
- **Two specs followed D248's tabs.** After the merge, `translate.spec.ts`'s first test and `key-leak.spec.ts`'s step 3g
  still chose Today's writing plan by its old radio, so the first timed out and pushed E2E 2/2 past its budget. Both now
  click the tab, as main's own specs do; locally both specs passed, 5 of 5 with the warmup, on two workers.

**Verified:**
- `pnpm verify` was green: 282 files, 4,545 tests passed (8 todo), with no dependency violations.
- After `pnpm --filter @palier/web build`, the chromium project's `translate.spec.ts` (3 tests) and `key-leak.spec.ts`
  passed with the warmup, 5 of 5, run with `--workers=1` on port 3050, since another project held 3000 here. In parallel,
  `key-leak` and the first translator test failed in onboarding before reaching the translator; serially both passed.
- Not run: `csp-production` and the live smoke.

### 23 October 2026 — `dougkeefe/translate-to-french` (the translator; D250)

Not *Next, decided*, which is unchanged (Gate O), except that the live smoke's next funded `--record` now also writes
`translate.json`. The human asked for a translator: English or French on the left, always French on the right, the
user's own French corrected and explained, with links to study each error.
- **`AiProvider.translate`**, its DTOs, schemas and `assembleTranslation`/`checkTranslation` in `@palier/domain`; the
  `translateText` use case, metered as `translation`; the OpenAI adapter's prompt and method on the `assess` model; every
  provider and fake given the method, the factory's included; the contract suite holds both jobs.
- **`content/resources/resources.json`**, 21 checked government references, parsed by `parseStudyResources`.
- **`/practice/writing/translate`**, linked from the writing drill, in both languages; in the route list, the CSP page
  list, the page-title journey and the key-leak journey (step 3g, `TRANSLATION_SENTINEL`).

**Verified:**
- `pnpm verify` was green: 282 files, 4,541 tests passed (8 todo), with no dependency violations.
- After `pnpm --filter @palier/web build`, the chromium project's new `translate.spec.ts` (4 tests, axe on every state,
  English and French) and `key-leak.spec.ts` passed, and the offline project's `csp-production` passed (7 tests).
- `scripts/check-bundle-size.mjs`: 167.2 KB of 180 KB shared first-load JS.
- Not run: the live smoke (it needs `OPENAI_SMOKE_KEY`), so no recorded translator completion exists yet.

### 23 October 2026 — `dougkeefe/today-s-plan-oral-ux` (the medium lane's library failure: the warmup's cold article route; D249)

The human reported #95's red medium lane: `content.spec.ts`'s library test, which this branch does not touch.
- **Diagnosed from the CI trace and a probe**: the article route was never warmed, so the test's click compiled it, and
  the dev server's rebuild dropped the click's own request.
- **The warmup reads `routes.json`**, the articles included, and visits the 404 and the hermetic error views (D249).

**Verified:**
- On a fresh hermetic `next dev` after the new warmup: first visits to an article, the 404 and the hermetic `global` view
  rebuilt no other open page. The thrown `route` view still rebuilt once, about 300 ms (D249's residual).
- `pnpm verify` exit 0: 277 files, 4,473 tests passed (8 todo), no dependency violations.
- The whole hermetic `chromium` project from a cold dev server (port 3400, a throwaway config, since another app held
  3000): 85 passed in 3.6 min, the warmup and the library test included.

### 22 October 2026 — `dougkeefe/today-s-plan-oral-ux` (Today's plan as three equal tabs, speaking included; D248)

Not *Next, decided*, which is unchanged (Gate O). The human asked why Today's plan offered only Reading and Writing, and
for a better control than its radio buttons, as D247 had done for `/progress`.
- **The plan's switch is `@palier/ui`'s `Tabs`**, one per domain in its glyph and fill, sharing the card's width.
- **Speaking has a plan**: one suggested session, the kind practised least lately, with its length and practice mode's
  estimate, leading to `/practice/oral`; "Done for today" once a session has ended; a line and a link with no key.
- **Speaking's "Where you stand"** is the newest report's fixes, never a criterion level (R10). Nothing on Today spends.

**Verified:**
- A review pass then fixed five small findings: the plan card's tab padding no longer overrides the primitive's on a
  phone, a dead class, an unwrapped line, and two copies (`reportHref`, now exported from `OralCards.tsx`, and the minute
  rounding, now `today-view.ts`'s `minutesOf`).
- `pnpm verify` exit 0 after those fixes: 277 files, 4,473 tests passed (8 todo), no dependency violations.
  `oral-plan.test.ts` names each branch of the suggestion and the plan.
- The chromium project's `journeys`, `content`, `generate` and `key-leak` on port 3400 through a throwaway config, since
  another app held port 3000: 28 passed, including the new D248 journey (three tabs, no radio, the arrow keys, the
  warm-up suggested, axe-clean, Start lands on `/practice/oral`). The library test failed once on the parallel dev
  server's first compile, then passed alone; this change does not touch it.
- After `pnpm --filter @palier/web build`, the offline project's `csp-production`: 7 passed.
- Screenshots at 1280px and 375px in both languages through a throwaway production spec, which measured the tab list's
  overflow: 107px in French at 1280px before the equal-width rule, 0 in all four after. The no-key state was checked
  the same way.

### 22 October 2026 — `dougkeefe/oral-progress-radio-buttons-ux` (`/progress`'s detail as three equal tabs, speaking included; D247)

Not *Next, decided*, which is unchanged (Gate O). The human asked why `/progress`'s detail offered only Reading and
Writing, and for a better control than radio buttons.
- **The detail is three WAI-ARIA tabs** (`@palier/ui`'s new `Tabs`/`TabPanel`), one per domain, in its glyph and fill.
- **Speaking has its own panel**: the newest five sessions, each with its measured pace, beside what the newest report
  says to work on (`@palier/app`'s new `oralProgress`). No criterion level is shown off the report (R10), and nothing on
  the page spends.
- **Each hero card links into its tab.** Print is unchanged (D247).

**Verified:**
- A review pass then fixed three findings: the tab list's 1px overhang, which gave it a vertical scrollbar wherever
  scrollbars show (measured 48 against 47, now 48 against 48); the no-report link, which now skips a session no report
  can be asked of; and a prop type.
- `pnpm verify` was green after those fixes: 276 files, 4,464 tests passed (8 todo), with no dependency violations.
- After `pnpm --filter @palier/web build`, the offline project's `progress-history-production` (both tests, the new one
  seeding three spoken sessions into real IndexedDB) and `csp-production` passed: 9 tests.
- The chromium project's `journeys`, `sync` and `content` passed (26 tests), on port 3400 through a throwaway config,
  since another app held port 3000.
- Screenshots at 1280px and 375px in both languages; at 375px the tab list does not overflow in either.

Older entries, newest first: [October 2026](progress-archive/sessions-2026-10.md) ·
[September 2026](progress-archive/sessions-2026-09.md).
