# Palier: Progress archive, session log, October 2026

Newest first. Moved verbatim from `docs/progress.md` on 24 October 2026 (D255). Its index there points here. The rules are
`progress.md`'s: never edit a session entry, and mark a deviation resolved in place, updating its index line too.

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

### 22 October 2026 — `dougkeefe/dependabot-status-resolve` (Dependabot: the 18-update group and the `vite` alerts; D246)

Not *Next, decided*, which is unchanged. The human asked for Dependabot's status to be reviewed and its issues resolved.
- **The minor-and-patch group from PR #90 landed with a clean lockfile.** It brings `next` 16.4.2, React 19.3.1,
  `vitest` 5.0.5, Playwright 1.64.1, `zod` 4.6.7 and 13 more.
- **`vite` went to 8.3.5 as a named root devDependency**, which closes alerts #16–#18 (D246).
- **PR #90 is closed in favour of this one**, because its lockfile pulled in `@types/node` 26.
- **`apps/web/AGENTS.md`** takes the heading level that `next dev` 16.4.2 now writes.

**Verified:**
- The lockfile has one `vite` (8.3.5) and one `@types/node` (22.20.5).
- `pnpm audit` is down to the two dismissed `extract-zip` entries and the auto-dismissed `braces` one.
  `pnpm audit --prod --audit-level=high` shows only the two ignored `content` entries.
- `pnpm verify` was green: 276 files, 4,439 tests passed (8 todo), with no dependency violations.
- After `pnpm --filter @palier/web build`:
  - the offline project passed 37 tests;
  - `smoke.spec.ts` passed 16, run on port 3400 through a throwaway config because another app held port 3000.

### 22 October 2026 — `dougkeefe/klt79` (`/progress` as a dashboard, D245)

Not *Next, decided*, which is unchanged (Gate O). The human asked for the progress page to be easier to read, with all three
domains visible together and pictures as well as words. `/progress` now opens on a deep hero with reading, written
expression and speaking side by side. Below it come the chosen skill's trend and its sub-skills, each with a `TallyBar`,
then the honest panel and the export (D245). Print is unchanged. Checked with `pnpm verify`; `progress-history-production`
and `csp-production` (offline project); and `content`, `journeys` and `sync` (chromium). The hermetic specs ran on port
3400 through a throwaway config, because port 3000 was taken by another app on the machine.

### 19 October 2026 — `dougkeefe/keep-for-this-tab-less-prominent` ("for this tab only" folded behind a quiet disclosure, D242)

Not *Next, decided*, which is unchanged (Gate O). The human found the tab-only choice too prominent on onboarding's key
step, since it costs a paste on every visit. It now sits closed behind "Using a shared computer?" in the shared key form,
and its hint names that cost, in both languages (D242). The saved key card's result message also sat flush under its
buttons; its body is now an `app-stack`.

The human then asked for the landing hero to say Palier is an unofficial, unaffiliated study tool: its lede's first
sentence now does, in both languages (D243).

CI then failed shard 2/2 on `smoke.spec.ts`'s landing way-in test, racing D224's redirect; the other run of the same
commit passed. With the human's approval the test now asserts the link's target and the visitor's real landing (D244).

### 18 October 2026 — `dougkeefe/docs-outstanding-implementations-review` (the review queue never serves a retired item, D241; this file reconciled with what merged)

The human asked for an audit of `docs/` for outstanding work, then scheduled D205's named gap with a reconciliation of this
file. **Code:** `dueLiveItems` in `@palier/app`, which `reviewQueue` and `planDailySession` now read through, and Today's due
tile counts `reviewQueue` (D241). **This file:** ticks for what `main` already held: Phase 0 complete in the status table,
Phase 6 Slice 3 merged (#60), Phase 7 Slice 5 merged (#61), and Phase 6's disconnection criterion met at the port level.
The In-flight table cleared of eight merged rows, and *Next, decided* rewritten to open on Gate O, with the onboarding and
content-run merge steps that had already happened (#73, #64) removed and every check still owed kept under Gate O. D206's
bank-size finding is the one item left for the human to schedule.

**Disconnection criterion, run:** `pnpm exec vitest run apps/web/src/lib/container-studio.test.ts
packages/testing/src/memory/oral-session.test.ts -t 'drop|reconnect'` → "Tests 4 passed | 24 skipped (28)": "dials with a
secret, never the key, reconnects once, and fails cleanly on the second drop with every turn and note kept" through the
hermetic and production graphs, and "ends when the connection drops (failed: true / false) … keeping the transcript".

**Proven to bite:** with `dueLiveItems` cut to one read, filtered, 3 tests fail ("reads past retired entries at the head of
the schedule…", "reads past an item that has left the bank…", and `reviewQueue`'s "…fills the set from the live items behind
it"); with the filter removed, 6 fail, `planDailySession`'s "never plans a retired item as a review" among them. Each restored.

**Verified:** `pnpm verify` exits 0: check-types and lint clean, dependency-cruiser "no dependency violations found" (521 and 372
modules), and Vitest "Test Files 275 passed (275)", "Tests 4421 passed | 8 todo (4429)", in 53 s. `pnpm verify:medium`: the
integration lane "Tests 51 passed (51)", and the `offline` project and warmup "41 passed". Its `chromium` project failed all 80
on the first run, every page a 404: another workspace's Next server held port 3000, and `reuseExistingServer` tested that
app. Rerun on port 3010 by a local, uncommitted edit to `playwright.config.ts`: "84 passed (2.5m)".

### 18 October 2026 — `dougkeefe/palier-footer-layout-improve` (the landing footer's small print; D240)

Not *Next, decided*, which is unchanged. The human found the landing footer's statement and photographs' credit
misplaced. They now share one row under a hairline, above the wordmark, which keeps its size (D240). Checked by eye at
1440px and 390px wide, in English and French, on the hermetic dev server.

**Verified:** `pnpm verify` exits 0: check-types and lint clean, dependency-cruiser "no dependency violations found" (519 and 372
modules), and Vitest "Test Files 274 passed (274)", "Tests 4410 passed | 8 todo (4418)". Again after merging `main` (D238–D239), the footer renumbered D240: exit 0,
"Tests 4413 passed | 8 todo (4421)".

### 18 October 2026 — `dougkeefe/cdkd5` (the README rewritten for readers outside the project; the domain is palier.study, D238; the service worker's install de-duplicated, D239)

*Next, decided* changes only for the domain: its Gate M line, its URLs and its standing item. The human asked for a README that helps people understand the project. The
README still described Phase 0. It said `adapters` and `apps/factory` were empty, and it listed `pnpm check-types` as
`apps/web`'s command. It also left out `pnpm verify`, the test lanes, `selfhost/` and `SECURITY.md`. It now opens with
what Palier is and links the live site, with the non-affiliation statement directly below. Then it covers:
- what you can do, and which features need a key;
- the cost and where your data goes (ADRs 1–4, 15);
- where the questions come from (ADR 24; the counts from `content/bank/v4/manifest.json`);
- the status;
- running it locally with no environment variables;
- the architecture and an updated layout table;
- a corrected command table and a documentation map.

The Contributing and Licence sections keep their substance. A script checked that every relative link in the README
resolves and that every command it lists is in `package.json`.

Then the human said `palier.study` is the official domain (D238). The current documents now name
`https://www.palier.study`, where the apex redirects; the history keeps its old addresses. Checked live, with curl, on
18 October 2026: `palier.study` → 308 → `www.palier.study`, whose `/api/health` answered
`{"build":"0571cf1","bank":4,"database":"ok"}`; `robots.txt`'s `Sitemap:` and `/en`'s canonical link still name
`https://palier.dougkeefe.com`. That is the Vercel setting D238 leaves to the human. The GitHub repository's website
field now reads `https://www.palier.study`. No code changed; `build-info.test.ts`'s example value did.

Then #86's E2E shard 1 was killed at its budget, as `main`'s had been after #85, and the human asked for CI to be
fixed (D239). The service worker's install fetched each shared chunk once per page, in series. It now fetches each URL
once, six at a time. Measured locally on the production build: 1,303 requests in about 3.3 s became 196 in about 0.7 s.
`pnpm --filter @palier/web exec playwright test --shard=1/2 --workers=2`: 141 s and 61 passed before, 109 s and 61
passed after.

### 17 October 2026 — `dougkeefe/get-feedback-ui-issues` (one press spends, and a wait you can see; D237)

Not *Next, decided*, which is unchanged. The human asked for the writing workshop's estimate to stand beside "Get
feedback", so one press is the agreement, and for the wait to show it is still working. On being asked, they extended
both to every spending screen. Done on:
- the workshop, fresh sets and the oral report: one press spends, and the "Before …" step is gone;
- the diagnostic's written result: its offer gains the cap reminder;
- spoken practice and studio mode: the session starts from the microphone card, with the start's handler still
  synchronous for D192's popup;
- every one-shot call on the key: it is waited for in `@palier/ui`'s new `Working`, with the time waited (D237).

**Verified:**
- `pnpm verify` was green: 274 files, 4,410 tests passed (8 todo), with no dependency violations, after the review fixes.
- After `pnpm --filter @palier/web build`, `playwright test --project=chromium` passed 45 tests (`workshop`, `generate`,
  `oral`, `key-leak`, `key` and `journeys` specs), and `--project=offline` passed 14 (`oral-production`,
  `generate-production`, `key-leak-production`, `studio-selfhost-production`, `spend-production` and `csp-production`).
- Looked at on the hermetic server: the workshop's estimate beside "Get feedback", the wait with its dots and
  "Waiting: 0:03", and the microphone card with the session's estimate beside "Start the session".

### 16 October 2026 — `dougkeefe/2lbs2` (four Dependabot alerts closed by scoped overrides; D236)

Not *Next, decided*, which is unchanged. The human asked for the four open Dependabot alerts to be resolved:
- `handlebars`, twice, under `eslint-plugin-boundaries`;
- `basic-ftp` under `@lhci/cli`'s `get-uri`;
- `sprintf-js` under `@lhci/utils`'s `js-yaml` 3.

Each is closed by a scoped override in `pnpm-workspace.yaml`, as in D155. `sprintf-js`, which has no patched release,
leaves the tree because js-yaml 3 gets argparse 2 (D236).

**Verified:**
- `pnpm why`: `handlebars` 4.7.10, `basic-ftp` 6.2.3, and `sprintf-js` and `argparse` 1 are gone.
- Smoke checks: `lhci --version` answers 0.15.1; `@lhci/utils`'s `js-yaml` still `safeLoad`s; `get-uri` loads
  `basic-ftp` 6.2.3.
- `pnpm audit` is down to the two dismissed `extract-zip` entries and the auto-dismissed `braces` one.
  `pnpm audit --prod --audit-level=high` shows only the two ignored `content` entries.
- `pnpm verify` was green, lint included: 272 files, 4,398 tests passed (8 todo), with no dependency violations.

### 16 October 2026 — `dougkeefe/landing-page-pricing-french` (the landing page's headline and one pricing message; D235)

Not *Next, decided*: the human asked for three things on the landing page, in both languages:
- the headline "Your C is closer than you think.";
- no "Try a sample question" in the hero;
- one pricing message wherever cost comes up.

The message: free to practise, the AI features a few cents each, billed by OpenAI, with no subscription to us. It also
went into the site's description and the About page. The hero's title is 14ch wide so the French takes three lines
(D235).

**Verified:**
- `pnpm verify` was green: 272 files, 4,398 tests passed (8 todo), with no dependency violations.
- After `pnpm --filter @palier/web build`:
  - `playwright test e2e/smoke.spec.ts`: 16 passed, the new D235 test included;
  - `content.spec.ts`, `key.spec.ts` and `discoverability-production.spec.ts`: 27 passed.
- On the dev server, the hero was measured and looked at in both languages at 1440×900, 1280×800, 1000×800 and 390×844, at
  11, 13, 14 and 15ch:
  - at 14ch the English title takes two lines on a desktop and three on a phone, and the French three and four;
  - the French hero's button sits 22px below the fold at 1440×900, and the English one 134px above it.

### 13 October 2026 — `dougkeefe/spoken-practice-typing-remove` (D234 reviewed: the check proves the browser can record)

A review of D234's change found one gap the typed fallback had been covering. A browser that opens the microphone but has
no `MediaRecorder` would pass the check, pay for a first question, and then fail at every Record. The check now makes an
unstarted recorder (`canRecord`) and stops such a browser as `unsupported`. D234 is amended to record this, and to say
"Continue anyway" correctly. The key-leak specs' recorder numbers move up by one for the check's unstarted recorder. The
spoken-only rule moved into `apps/web/CLAUDE.md`'s spoken-practice bullet, and `oral.micAlternativeReading` in French now
uses the app's term, « La compréhension de l’écrit ».

**Verified:**
- `pnpm verify` was green: 272 files, 4,398 tests passed (8 todo), with no dependency violations.
- After `pnpm --filter @palier/web build`, `playwright test` on the oral, oral-production, both key-leak and
  studio-selfhost specs: 18 passed.

### 13 October 2026 — `dougkeefe/spoken-practice-typing-remove` (spoken practice is spoken only; D234)

Not *Next, decided*: the human found the typing option in spoken practice strange, since typing belongs to written expression,
and chose to remove it entirely (D234). Neither mode offers typing any more. Without a microphone, the screen gives the
recovery steps and links the writing workshop and reading practice. A failed answer recorder now says so and lets Record try
again. PRD §14, `implementation-plan.md` Phase 5, `docs/realtime-checklist.md` §1 and `apps/web/CLAUDE.md` are amended. The
domain, the port, the engine and the report still read typed turns, which sessions already stored still hold.

**Verified:**
- `pnpm verify` was green: 272 files, 4,395 tests passed (8 todo), with no dependency violations.
- `pnpm --filter @palier/web build`, then `playwright test` on `e2e/oral.spec.ts`, `oral-production.spec.ts`,
  `key-leak.spec.ts`, `key-leak-production.spec.ts` and `studio-selfhost-production.spec.ts`: 18 passed. That includes
  the two rewritten refused-microphone tests and the production ledger, now five rows with the answer's transcription.
- On the production build, the refused microphone was looked at in both modes: the recovery steps, "Check again", and
  the callout with its two links. No typing button appears.

### 13 October 2026 — `dougkeefe/mobile-menu-fix` (E2E shard 1 back under budget; D233 amended)

PR #79's E2E shard 1 ran out of its 300 s budget with about 60 of its 62 tests through. No test failed; the one in flight
when the job was killed recorded "Target page, context or browser has been closed". Shard 1 already took 4.6 minutes on
`main`'s last three runs, and this branch's D233 test added 6.8 s of waiting for the worker and Chrome's warning timer to
it. That test now checks only the cause, in about 0.15 s. The CI log also showed React logging an error on every render
for `reactMaxHeadersLength: 0`, so the setting is now `1`, which keeps every preload out of the header without the error
(D233, amended). This corrects the entry below, which named `0`.

**Verified:**
- `pnpm verify` was green.
- On a local production build: `e2e/offline.spec.ts` and `e2e/production.spec.ts` passed, 13 tests, the D233 test in 150 ms.
  With `1`, `/en`, `/fr`, `/en/about` and `/en/home` sent no preload in a `Link` header and had the font's preload in the
  `<head>`; the server logged no `maxHeadersLength` error; and four loads under the worker raised no unused-preload warning.
- **Shard 1 still has little room.** Back to `main`'s 4.6 minutes, it passes, but a slow runner or another production test
  could tip it over again. Shard 2 took 3.3 minutes on the same run. Balancing them is not this branch's work, but it
  needs doing.

### 12 October 2026 — `dougkeefe/mobile-menu-fix` (preloads in the document; D233)

Also not *Next, decided*: the human asked for the console's two "preloaded but not used" warnings to go. The cause was
React's `Link` header with the service worker in control. `reactMaxHeadersLength: 0` puts the preloads in the `<head>`
(D233).

**Verified:**
- `pnpm verify` was green: 272 files, 4,399 tests passed (8 todo), with no dependency violations.
- On a local production build (`next start` on port 3457), `e2e/offline.spec.ts`, `e2e/production.spec.ts` and
  `e2e/csp-production.spec.ts` passed: 20 tests, the new one included. Without the setting, the new test failed on the
  header, and on the warnings alone (three runs in three) with the header assertions removed. A review then cut it from
  two pages and 8 s of waiting to one and 3.5 s (6.8 s in all), since shard 1 has about 20 s of its budget left.
- Lighthouse (desktop) on `/en` and `/fr`, three runs each: performance 100, accessibility 100, LCP 788–797 ms, CLS 0.

### 12 October 2026 — `dougkeefe/mobile-menu-fix` (the landing page's menu on a phone; D232)

This was not *Next, decided*. The human sent a screenshot of the landing header wrapping to three rows on a phone and
asked for a hamburger menu at the top right. Below 1000px the header is now the brand and a menu button, whose panel holds
the four sections, the language and "Start free" (D232). Desktop is unchanged. No existing test changed.

**Verified:**
- `pnpm verify` was green: 272 files, 4,398 tests passed (8 todo), with no dependency violations.
- `e2e/smoke.spec.ts` and `e2e/motion.spec.ts` passed against a hermetic `next dev` on port 3456 (port 3000 belonged to
  another workspace): 16 tests, the new one and D201's focus-order test included. After the review added closing on
  focus or a tap outside, the new test passed five runs in five. "The landing page's way in leads to the app" failed
  once on a cold server and passed three runs in three after: the race the D230 entry describes.
- Screenshots at 390, 999, 1000 and 1280px wide, in both languages, open and closed, were checked by eye: one header row
  at every width, the button only below 1000px.

### 11 October 2026 — `dougkeefe/palier-explainer-video-use` (the landing page's explainer video; D230)

This was not *Next, decided*. The human added an explainer of Palier in English, then one in French, and asked for it on the
landing page, below the fold, before "Built for exam conditions.". It is there, each page playing its own language's
recording, as the key video is played (D230).

The headline now reads "Practice for your SLE.", at the human's request (D231).

**Verified:**
- `pnpm verify` was green: 272 files, 4,395 tests passed (8 todo), with no dependency violations.
- `pnpm test:e2e e2e/smoke.spec.ts e2e/offline.spec.ts --project=warmup --project=chromium --project=offline` passed on a
  fresh production build: 21 tests, the new one included. An earlier run, before the French video, failed once on "the
  landing page's way in leads to the app" (D201), which expects `/en/home` and saw `/en/start`, and passed on two reruns.
  That is a race this branch did not make: since D224, Today sends a user with no study profile to `/start`, so the test
  passes only when its URL check lands before the redirect. Left as it is, for the next session to settle.
- On the production build at 1440×900 and 390×844, in both languages, the section sat below the first screen, each page
  named its own language's file, and the only request for it before play was the poster. Screenshots were checked by eye.

### 11 October 2026 — `dougkeefe/oral-page-layout-update` (the spoken-practice picker laid out again; D229)

This was not *Next, decided*. The human asked for a UX pass on `/practice/oral`'s layout, intuitive and maintainable.
The picker now has the key card first and two steps of equal weight, the modes side by side and the sessions as a grid.
It is its own component, `OralPicker.tsx` (D229). No test changed.

**Verified:**
- `pnpm verify` was green: 272 files, 4,393 tests passed (8 todo), with no dependency violations.
- `pnpm test:e2e e2e/oral.spec.ts e2e/oral-production.spec.ts --project=warmup --project=chromium --project=offline` passed
  on a fresh production build: 14 tests, the picker's axe checks and both French passes included.
- Screenshots of the picker on the production build were checked by eye, with and without a key, at 1280px and 390px, in
  both languages, and the writing workshop's prompt list without its bullets.

### 11 October 2026 — `dougkeefe/p3an3` (the integration lane's PGlite timeout; D228)

The same branch, a second entry. PR #75's medium integration lane failed once on a test timeout. The test was not at
fault: a failed hermetic build started PGlite before it found the migrations missing (D228).

**Verified:**
- `pnpm verify` was green: 272 files, 4,393 tests passed (8 todo), with no dependency violations.
- `pnpm run test:integration` was green: 7 files, 51 tests passed.
- The new `db.test.ts` case fails with `db.ts` reverted and passes with the fix.

### 11 October 2026 — `dougkeefe/p3an3` (the nightly lane red on a refused smoke key; D227)

This was not *Next, decided*, which is unchanged. The human asked for the failing nightly to be resolved. Its `live-smoke`
job had failed every night since 4 October with `InvalidApiKeyError`, because OpenAI refused `OPENAI_SMOKE_KEY`. The cause
was not in the code, and the remedy is a new secret (D227). The smoke now says so when it happens, and says which limit to
check on a 429. Issues #65 and #56 close once a dispatched nightly is green.

**Verified:**
- `pnpm verify` was green: 272 files, 4,392 tests passed (8 todo), with no dependency violations.
- The three new tests are in `src/lib/live-smoke.test.ts`: the replace-the-secret hint on a 401, the monthly-limit hint on a
  429, and no hint on any other failure.

### 11 October 2026 — `dougkeefe/sample-question-language-update` (the landing page's sample question in the language being practised; D226)

This was not *Next, decided*. The human asked for the landing page's sample question to be in the other language from the
page, since that is the one the visitor practises: French on `/en`, English on `/fr` (D226). The test whose premise changed
is listed there.

**Verified:**
- `pnpm verify` was green: 272 files, 4,389 tests passed (8 todo), with no dependency violations.
- `pnpm test:e2e e2e/smoke.spec.ts --project=chromium` passed on a fresh production build: 13 tests, the axe checks included.
- Screenshots of the answered sample on `/en` and `/fr` were checked by eye.

### 10 October 2026 — `dougkeefe/palier-onboarding-adjustments` (onboarding reordered, R5 on step 1, Today straight to onboarding; D224, D225)

This was not *Next, decided*. The human asked for four changes to first run (D224):
- Today no longer stops a new user at a card whose only action is "Set up";
- the non-affiliation statement appears on onboarding's first step only;
- the key step comes before "Where are you now?" (and a drill opened before setup goes to onboarding too, with the
  "Two quick questions" card deleted);
- "Where are you now?" is the last step, and "Take the diagnostic" goes straight into it.

The agent asked one question, and the human chose "straight into the diagnostic" even with the key passed over. The tests
whose premise changed are listed in D225.

**Verified:**
- `pnpm verify` was green: 272 files, 4,386 tests passed (8 todo), with no dependency violations.
- The whole Playwright suite passed locally on a fresh production build: 116 tests, warmup, offline and chromium.
- The flow was driven in a browser on the hermetic dev server. `/en/home` went to `/en/start` at "Step 1 of 5" with the
  statement shown, and step 2 did not show it. "Not now" on step 4 led to the placement at "Step 5 of 5", and
  "Take the diagnostic" landed on `/en/diagnostic`.

### 9 October 2026 — `dougkeefe/onboarding-why/what-hidden` (step 5's why and cost collapsed, the video in view; D222)

This was not *Next, decided*. The human asked for step 5's *Why* and *What it costs* to be hidden by default and
expandable, with the video above the fold (D222). Both are now closed disclosures, and the step scrolls the video into view
as it opens.

**Verified:**
- `pnpm verify` was green: 272 files, 4,391 tests passed (8 todo).
- `key.spec.ts` passed in full on chromium: 13 tests, with the warmup, including the two new viewport cases.
- Screenshots of step 5 were checked by eye: 1280×720 and 1440×900 in English, 390×844, French at 1280×720, and both
  disclosures opened.

**CI's E2E shard 2/2 then ran out of its 300 s budget** on both runs of the PR, as it had on `main` after #70, with no test
failing (D223). The production specs now sort into shard 1, and the warmup visits each route once. Locally, from cold, the
slowest shard went from 148 s to 132 s, and both shards passed in full (117 tests).

### 9 October 2026 — `dougkeefe/openai-api-key-onboarding` (onboarding's key step: why, what it costs, how, with the owner's video; D220, D221)

This was not *Next, decided*. The human asked for a first-run step that explains why Palier needs an OpenAI key (it keeps
Palier free, and it is safer), what it costs (charged by OpenAI, with estimates) and how to get one, with the video they
recorded. They answered four questions (D220). The slice built:
- the key step on both paths, in three sections, with the key pasted and checked in place;
- `KeyEntry`, shared with the key screen;
- the video on the step and the guide, with the guide's steps rewritten to follow it;
- the service worker leaving `/media/` to the network;
- the PRD's §8.1 step 5 amended.

**Verified:**
- `pnpm verify` was green: 272 files, 4,389 tests passed (8 todo).
- After `pnpm --filter @palier/web build`, the whole Playwright suite passed: `pnpm exec playwright test`, 114 passed (3.7 min),
  warmup, chromium and offline.
- The bundle-size gate passed at 166.3 KB of 180 KB, unchanged.
- The worker fix bites: with `/media/` out of `PASSTHROUGH_PREFIXES`, `offline.spec.ts`'s ranged fetch failed with "Failed to
  fetch". Restored, it passes.
- Screenshots of step 5 in English at 1280 and 390 px, in French, and of the guide were checked by eye.
- `pnpm --filter @palier/web lighthouse` passed every assertion: 19 URLs, 95 runs, `/en/start` and `/en/settings/key` among them.

A candid review of the branch then found seven things, all fixed:
- passing the key over on the diagnostic path landed on the diagnostic's gate, which asked for the key just declined. It
  now lands on Today, which leads with the diagnostic (D220);
- the guide's step 6 named the key screen, the wrong place for a user who opened it from onboarding;
- the video's constant sat among OpenAI's dashboard links;
- `keyStepFinish` copied the `Placement` union;
- the stylesheet repeated the video's ratio;
- `KeyEntry`'s doc comment sat on its type;
- one French label was clumsy.

After the fixes, the rebuilt app passed 51 Playwright tests on both projects (`key`, `journeys`, `key-leak`, `content`,
`offline`, `key-leak-production`, `oral-production`, `studio-selfhost-production`, `csp-production`).

**CI's audit then failed** on GHSA-cjq9-62q9-8jv4 (high: Next.js image optimization SSRF, `next` from 16.0.0 to below 16.3.8),
published after the branch was cut, not caused by it. `next` and `eslint-config-next` went from 16.3.6 to 16.3.8. Only the
Next family moved in the lockfile. Afterwards:
- `pnpm audit --prod --audit-level=high` reports only D135's two ignored advisories;
- `pnpm verify` is green;
- the bundle is 166.4 KB of 180 KB;
- the whole Playwright suite passed on the rebuilt app (114 passed).

**Not run:** the integration lane, which this change does not touch; a real key, so "This key works." is seen only against
the stub; and playback in Safari, which the human's look on the deployed site covers (*Next, decided*).

### 7 October 2026 — `dougkeefe/today-page-update` (Today on the dashboard layout; D219)

This was not *Next, decided*. The human attached a dashboard design and asked for Today to take its layout in Palier's
palette and type, with the agent deciding which Palier pieces fit where. They answered four questions (D219), and the slice
built it:
- the hero with the week and the three skills;
- the statistics;
- the practice calendar;
- the pointer as the design's quick pointers;
- `weekActivity` in the engine, `practiceActivity` in the app, and `activeDays` on the streak;
- two brand fills, `Sparkline` and `MonthCalendar` in `@palier/ui`.

**Verified:**
- `pnpm verify` was green: 271 files and 4,376 tests passed.
- After `pnpm --filter @palier/web build`, Playwright reported 40 passed on chromium (`journeys`, `key`, `key-leak`, `smoke`,
  `content`) and 21 on offline (`offline`, `production`, `engagement-production`, `csp-production`, `key-leak-production`).
- The bundle-size gate passed at 166.3 KB of 180 KB.
- Screenshots of a new user (desktop and mobile) and of a user after one set were checked by eye against the design.
  The first caught the mobile order applying to the desktop columns, which is now reset from 900px.

A candid review of the branch then found six things, all fixed before the pull request:
- the oral card claimed a minute for a session answered by typing;
- the streak's tile shifted its neighbours when it arrived;
- the oral rail was named after a plan that holds no oral practice;
- `PLAN_MODES` was typed as strings;
- the engine and the app both exported `practiceActivity` (the engine's is now `weekActivity`);
- "this week" was a rolling seven days.

**Not run:** the whole medium lane, Lighthouse, and a screenshot two days from the test. CI runs the first two.

### 7 October 2026 — `dougkeefe/today-page-feedback` (the pointer as a grammar point in French; D218)

The human's correction on the open pull request: quick pointers are **grammar**, in **the language practised**. D218 replaces
D216's 54 pointers with 50 French grammar pointers, five per written-expression sub-skill, and the card reads them in French
whatever the interface's language.

**Verified:**
- `pnpm verify` was green: 267 files and 4,318 tests passed.
- Playwright `journeys.spec.ts` on chromium: 12 passed.
- With the interface in English, a screenshot showed the pointer in French with its example in italics.

### 6 October 2026 — `dougkeefe/today-page-feedback` (Today rebuilt around the next step; D214–D217)

This was not *Next, decided*. The human reviewed Today and asked for four changes:
- make the mock exam's difference from the diagnostic clear;
- lead with the diagnostic, then the plan, and the mock exam later;
- give the plan much more of the page;
- question the review card's value, and add a "quick pointer".

They decided three things: the review card goes, the mock exam is recommended once practice at the target is measurable, and the
pointers are new authored content per sub-skill. The layout was left to the agent.

The slice:
- `nextStep` and its banner (D214);
- the two-thirds plan with the review card folded in (D215);
- 54 pointers as a new content artefact, with their schema, parser and picker (D216);
- `latestExamResult`'s skill filter.

**Verified:**
- `pnpm verify` was green: 267 files and 4,317 tests passed, plus lint, boundaries and both cruises.
- After `pnpm --filter @palier/web build`, Playwright on `journeys`, `key`, `key-leak`, `production`, `offline`, `exam-offline`,
  `engagement-production`, `csp-production` and `smoke` reported 51 passed.
- Screenshots of a new user (desktop and mobile), and of a placed user two days from the test (the mock-exam banner), were
  checked by eye. The first one caught a stretched side column, fixed by D215's `.app-home__side`.

**Not run:** the whole medium lane, Lighthouse and the bundle-size gate locally. CI runs them.

### 6 October 2026 — `dougkeefe/written-diagnostic-results-improve` (the diagnostic that gives a result; D208–D212, ADR 25)

Not *Next, decided*: the human took the written diagnostic and found the result "a waste of time". They decided:
- the key is required first, and AI interprets the result;
- the result says "Your plan starts at B";
- the score is shown plainly without revealing the questions;
- the mock-exam caveat goes.

The slice:
- **Engine:** an even run (`bandQuota`); `latestCompleteRun` and `summariseDiagnostic` (counts, focus, strengths,
  starting band); the planner's `placement`.
- **Domain:** the profile's `diagnostic` block; the interpretation's DTOs, strict schema and
  `checkDiagnosticInterpretation`; `diagnostic-interpretation` in `AI_FEATURES`.
- **App:** `diagnosticResult`, `requestDiagnosticInterpretation` and `studyFocus`; `DiagnosticReportStore`.
  `startSession` reads `studyFocus`.
- **Adapters:** `interpretDiagnostic` on `assess`; Dexie v4.
- **Testing:** the fake, the contract and the memory store.
- **Web:**
  - the key gate and the way back;
  - the result screen, and `/diagnostic?result=` for it again from Today (D213);
  - Today's diagnostic half and the plan's line;
  - copy in both languages.
- **Records:** ADR 25, and the PRD's §6.2 and §8.1 notes.

```
pnpm verify (after the review fixes) → check-types, lint, boundaries (0 violations), test: 4291 passed, 8 todo; exit 0
pnpm --filter @palier/web build       → exit 0
playwright journeys, key, key-leak, content, csp-production (chromium + offline) → 35 passed (1.5m)
```

CI's fast lane then failed on `pnpm audit --prod --audit-level=high`. A new advisory, GHSA-68fv-2mgg-jv7q, hit
`source-map-js` 1.2.1 under `next > postcss`, on `main` too. Every parent (`postcss`, `css-tree`, `magicast`) declares
`^1.2.1`, so the lockfile alone moves to the patched 1.2.2: six lines and the integrity. That needs no override, unlike
D155's pinned parents. `pnpm up -r` would also have re-resolved rolldown and postcss, so it was not used.

A harsh `candid-review` of the slice then found eight issues, all fixed in the same branch:
- the result page spent on every open;
- the privacy list missed the new store;
- the key offer's copy;
- Today waited serially on `studyFocus`;
- duplicate React keys;
- a live region mounted with its content;
- an interpretation stuck in its first language;
- a short run that could never place.

Screenshots of the gate, the launcher, the result and Today were taken on the hermetic lane with OpenAI stubbed. They are in
the pull request. The interpretation was not run on a real key in this session (D211).

### 4 October 2026 — `dougkeefe/content-generation-run` (the full content run, authored by Claude; D203–D207, ADR 24)

Not *Next, decided*: the human asked for the full content run "if it hasn't been done yet". It had not. They then decided:
Claude writes the content, not the OpenAI API; separate Claude instances review it blind; v3's synthetic content is retired;
and about 20 oral scenarios are written too. *Next, decided* now leads with merging this, then the human's read of v4, then
Gate O.

- **Part A, the factory** (D203–D205):
  - `run --authored-only` and the recorded reviewer (`--provider recorded`, verdicts keyed by the blind request's hash).
  - `review-requests` and `check-authored`.
  - Authored scenarios; authored passages held to stage 2's rules; near-duplicate stems flagged at intake.
  - `retirements.json` and `applyRetirements`; `OralScenario.status`; the picker skips retired scenarios.
- **Part B, the content:**
  - 23 author instances: one pilot pair, then 21 more, one assignment each.
  - 18 blind reviewer instances, in six waves.
  - Results: 630 items, 60 passages, 20 scenarios; 626 items published; 4 discarded (3 register flags, 1 defensible
    distractor).
  - The reviewer, measured on 60 real-French items written by an instance that reviewed nothing: 48 of 50 defects caught,
    10 of 10 clean controls passed (D204).
- **Part C, serving it:**
  - `BANK_VERSION = 4`.
  - The about page, the landing FAQ and `/progress` say who writes and who reviews.
  - An authored item that names its generator reads as machine-generated.
  - ADR 24 supersedes ADR 19.
- **Found:**
  - The bank is about 515 KB gzipped, against §13's 400 KB first fetch (D206).
  - The review queue still serves retired items (D205).
  - One spec had v3's warm-up written in (D207).

```
PALIER_NOW=2026-10-04T00:00:00.000Z palier-factory run --authored-only --provider recorded --bank-version 4
  → authored: 626 published / 630 submitted, 626 passed review; discard reasons {"register":3,"defensible-distractor":1}
  → bank v4: 868 items (626 published, 242 retired), 84 passages, 30 scenarios (20 new, 10 retired), 12 forms; exit 0
palier-factory check-authored                      → 630 item(s), 60 passage(s), 20 scenario(s), 0 issue(s)
palier-factory review-requests                     → 0 blind request(s) (every item has a verdict)
eval, 60 real-French items, 2 blind reviewers      → wrong-key 10/10, two-keys 10/10, band 10/10, ambiguous 9/10, register 9/10; clean 10/10 passed
pnpm verify                                        → check-types, lint, boundaries pass; test: 259 files, 4168 passed, 8 todo; exit 0
pnpm verify:medium (first run)                     → integration 51 passed; e2e 108 passed, 1 failed (oral-production: v3's warm-up written in); fixed
playwright e2e/oral-production.spec.ts --project=offline → 2 passed
gzip -9 of every file under content/bank/v{3,4}   → v3 34 223 bytes; v4 526 629 bytes
```

### 3 October 2026 — `dougkeefe/palier-app-update-plan` (the app as designed; D202)

Not *Next, decided*: the human asked for `docs/Palier landing page/Palier App.dc.html` to become the app's look. They
ruled on two questions first: light only, and an exam set of greys on the same paper. *Next, decided* is unchanged:
Gate O, then Gate M.

- **`@palier/ui`'s tokens are the design's** (D202): one light theme, nine new roles, `accent` gated, `correct` darkened,
  and `rule` for inputs' borders (WCAG 1.4.11). The contrast gate checks 102 pairs.
- **Source Serif 4 for everything**, preloaded; Inter and Figtree removed.
- **Flat primitives**: pills with the arrow disc, `Card` tones, radio rings on answer options, the tinted empty banner.
- **The chrome as drawn**: the pill-track nav with the current page marked (`HeaderNav`), the deep-teal footer with its
  wordmark. **Today and setup as drawn**; every other screen takes the header, ground, buttons and panels.
- **Found by the suites**: a base `h3` colour that reached the landing page, and a wordmark that took footer clicks (D202).
- **Found by the review**: radios under forced colours, the flame on the deep panel, the backdrop in older Safari (D202).
- **For the human:** Coco is teal now, and the landing page's palette could fold onto the tokens (D202).

```
pnpm verify                                        → check-types, lint, boundaries pass; test: 258 files, 4098 passed, 8 todo; exit 0 (Node 24.21.0)
vitest contrast.test.ts, correct → #1F7A5C         → 4 failed (correct on tint and quiet, both sets); restored → 100 passed
vitest contrast.test.ts, rule → #B9B5B2            → 4 failed (rule on bg and surface, both sets); restored
playwright --project=chromium (first run)          → 60 passed, 14 failed (axe on the landing's h3; footer links behind the wordmark); fixed
playwright --project=chromium                      → 74 passed
playwright --project=offline (production build)    → 35 passed (csp-production: zero violations, the serif from this origin)
pnpm --filter @palier/web lighthouse (19 URLs × 5) → all assertions pass; medians: performance ≥ 0.99, accessibility 1.00, CLS 0
check-bundle-size                                  → 166.3 KB of 180.0 KB
after the review's four fixes:
pnpm verify                                        → 258 files, 4108 passed, 8 todo; exit 0
playwright --project=chromium                      → 74 passed
playwright --project=offline (production build)    → 35 passed
forced-colors emulated, /en/start step 2           → the radios are the platform's (appearance: auto); Level C shows chosen
CI medium lane (PR #63, first run)                 → E2E 1/2: 2 failed (progress printed on 2 pages; key-leak 14 calls of 16); fixed
print probe, Letter and A4 at scale 1–1.2          → before: 1 page to 1.0, 2 pages at 1.05; after: 1 page to 1.15
vitest practice-view.test.ts, the fix reverted     → 1 failed (the new sent test); restored → 44 passed
playwright --project=chromium                      → 74 passed; key-leak and the print test, --repeat-each=3 → 6 passed
playwright --project=offline (production build)    → 35 passed
```

### 3 October 2026 — `dougkeefe/palier-landing-page-update` (the landing page as designed; D201)

Not *Next, decided*: the human asked for `docs/Palier landing page` to become the site's landing page. They ruled on two
questions first: the design's own palette and type, and the design's own header and footer. *Next, decided* is unchanged:
Gate O, then Gate M.

- **`/en` and `/fr` are v4** (D201): server components in `components/landing/`, the sample question as the one island, the
  FAQ as `<details>`, and copy in the `landing` namespace of both message files.
- **`components/Shell.tsx`** leaves `/` to its own header, `main` and footer. Every other page keeps the app's, after a
  soft navigation too.
- **The photographs are served from this origin**, bundled through the stylesheet and precached by the worker. The CSP is
  unchanged, with zero violations on both locales.
- **For Gate O:** the hero's flag against PRD §10.1 and R5, and the French feature heading (D201).

```
pnpm verify (design export moved out of the tree) → check-types, lint, boundaries pass; test: 257 files, 4058 passed, 8 todo; exit 0 (Node 24.21.0)
pnpm verify (export committed, ESLint ignoring it)  → check-types, lint, boundaries pass; test: 257 files, 4058 passed, 8 todo; exit 0
CI, medium lane: lhci /fr performance 0.88 on all five runs (≥ 0.95 asserted); /en passed → the landing serif preloaded
pnpm verify                                         → 257 files, 4058 passed, 8 todo; exit 0
pnpm --filter @palier/web lighthouse (19 URLs × 5) → all assertions pass; /en and /fr performance 1.00, CLS 0
playwright test offline csp-production --project=offline → 13 passed; smoke --project=chromium → 13 passed
playwright test smoke content motion --project=chromium → 21 passed, 4 failed (axe: the wordmark's contrast); fixed, then
playwright test smoke journeys --project=chromium → 23 passed
pnpm build; playwright test offline csp-production production discoverability-production --project=offline → 22 passed
lhci autorun (/en, /fr, 3 runs each, desktop) → performance 0.97–1.00, accessibility 1.00
pnpm --filter @palier/web bundle-size → shared first-load JS 166.3 KB of 180.0 KB, within budget
```

### 3 October 2026 — `dougkeefe/docs-content-development` (Phase 7 Slice 5, launch readiness; D198–D200)

Opened to *Next, decided*: #60 had merged, so Slice 5 was next. Its step 3, the dial on `main`, was **not run**: this machine
has no `.env.local` and no smoke key, as on 2 October.

- **The realtime route's rate limit** (D195, D200): 60 posts an hour per IP hash, counted before the key is read, refused
  as `429 throttled` → `RouteThrottledError` → `failThrottled`. No limit in the hermetic lane or with no database. A failing
  store, **or one silent for a second**, lets the mint through. **Proved to bite:** with the over-limit check disabled, the
  over-limit and before-the-key tests failed; without the wait's race, the silent-store test hung to its timeout.
- **The band trend over time** (D198): engine `trendHistory` and `weekEnds` on local days, app `practiceTrendHistory`,
  `@palier/ui`'s `TrendChart`, and twelve weeks on `/progress` at the target band, the figures a table. The printout stays
  one page with twelve weeks of history in both skills, on Letter and A4, in English and French
  (`progress-history-production.spec.ts`). That took a paper-only layout: before it, the page ran 1,198 px of 965.
- **Found by search engines** (D199): `src/lib/routes.json` from `prepare-public.mjs` under a drift test; `robots.txt`;
  a sitemap with `hreflang`; and each page's canonical, alternates and Open Graph title. The origin comes from
  `PALIER_SITE_URL` or Vercel's production domain.
- **An unknown path answers 404** (D199): a rewrite in the proxy, which Next 16 carries. The layout titles the 404, since
  on a 404 Next takes the head from it. **A test changed, named:** `errors.spec.ts`'s `status()` assertion moves from
  D141's 200 to 404. **Proved to bite:** with the rewrite removed, `csp-production.spec.ts` failed on `/no-such-page`
  (expected 404, received 200).
- `docs/deploy.md` gains `PALIER_SITE_URL` and two smoke checks. architecture.md §10 and §11, the web, engine, ui and
  adapters `CLAUDE.md`s, and `implementation-plan.md`'s Slice 5 status follow.
- **The review** was the agent's own read of the diff, not a separate review skill. It found the silent-store gap D200
  closes.

```
pnpm verify                → check-types, lint, boundaries pass; test: 255 files, 4025 passed, 8 todo; exit 0 (37 s, Node 22.23.3)
CI=1 pnpm verify:medium    → integration: 7 files, 51 passed; Playwright: 106 passed (3.2m); exit 0
                             (run before D200's wait limit, which no hermetic or database-less lane reaches)
playwright test key-leak key-leak-production oral (CI=1, after D200, rebuilt) → 16 passed
node apps/web/scripts/check-bundle-size.mjs → shared first-load JS 166.3 KB of 180.0 KB, within budget
curl on next start :3100   → /en/no-such-page 404, /fr/no-such.page 404, /en/library/nope 404, /en/progress 200,
                             /robots.txt 200, /sitemap.xml 200 (64 URLs, each with en, fr and x-default)
```

### 3 October 2026 — `dougkeefe/conductor/settings.local.toml-update` (CI's two red shards on `a7a8a99`; D197)

- Read from the uploaded traces (D196): the examiner's heading checked after focus had moved on, and journey 3 out of its
  30 s default. `practiseSpeaking` checks where focus lands (proved to bite); journeys 3 and 9 get 90 s each.

```
playwright test oral, key-leak, key-leak-production, exam-offline, telemetry-offline --repeat-each=3 → 46 passed
CI=1 pnpm run test:e2e     → 101 passed (3.0m)
pnpm verify                → 251 files, 3963 passed, 8 todo; exit 0
```

### 3 October 2026 — `dougkeefe/conductor/settings.local.toml-update` (the drill's first keys; E2E traces kept; D196)

- **CI's one red shard on PR #60** was the drill losing "1" and Enter pressed as its first item appeared (D196). The
  drill's `keydown` listener moves to a layout effect, as the exam runner's did in D179.
- **A failed E2E test now leaves evidence**: traces are kept on failure, and a failed shard uploads them.

### 2 October 2026 — `dougkeefe/conductor/settings.local.toml-update` (the repo public; Phase 7 Slice 5 planned; D195)

- **The repo is public** (human; `gh repo view` answers `PUBLIC`). Gate M's first item and R13's licence half are done.
- **Phase 7 Slice 5, launch readiness, planned** (D195) in `implementation-plan.md` §7 Phase 7 and *Next, decided*: the
  realtime route's rate limit, the band trend over time, robots and a sitemap with `hreflang`, and a true 404, before Gate O.
- **The records brought up to date**: Phase 7's merged work items and Phase 0's port lines ticked; the requirement coverage
  table's stale rows rewritten; the human's lists cleared of what the public repo and Slice 5 settle. Documents only; PR #60's
  lanes were green before this change.

### 2 October 2026 — `dougkeefe/conductor/settings.local.toml-update` (Phase 6 Slice 3: the exception, escapable; D192–D194)

Opened to *Next, decided*. Its first step, re-measuring the dial on `main` after #58, was **not run**: this machine has no
`.env.local` and no smoke key (D194). The slice does not touch the default dial, so it went ahead, and the measurement
stays first in *Next, decided*.

- **The self-hosted escape** (D192): `selfHostedRealtimeSecrets`, the third `RealtimeSecretSource`, over a popup seam; the
  popup opened inside the tap by the container; the key posted by `postMessage` only after the page's `ready`, only to
  its origin; `SelfHostedEndpointError`; the address kept in the vault (`KeyVault` gains two methods, §3.3 amended),
  never synced or exported, forgotten by `clear`; the form on `/settings/key`; the picker's, the pre-flight's and
  `/privacy`'s copy in both languages; `failEndpoint`.
- **`selfhost/`**: the one-file Cloudflare Worker and Vercel function, identical between their markers by test, and their
  README. A web test runs both through each platform's entry point and the page's script in a sandbox.
- **End to end on the production build** (`studio-selfhost-production.spec.ts`, the `offline` project): the repository's
  Worker under Node on port 3300 (`e2e/selfhost-server.mjs`, a third Playwright server), minting against a stand-in for
  OpenAI. The route saw no key and no warm-up; the endpoint saw the key once, in `authorization`; the dial carried
  `ek_selfhosted_1`; the served `connect-src` is unchanged and the session raised no CSP violation; axe-clean on the
  form's states; a blocked popup ends with the endpoint's sentence. **Proved to bite:** with the container ignoring the
  endpoint, the spec failed (the session never came up); restored, it passed.
- **The route's log exclusion** (D193): Vercel has no per-route switch, so what holds is that nothing it records can carry
  the key. `realtime-handlers.test.ts` now holds that the route writes nothing to the console on any answer. The
  deployment check is written into `docs/deploy.md` and is the human's: the Vercel CLI here was logged out.
- **`docs/realtime-checklist.md`** (D194), for Gate O; the docs index, the root `CLAUDE.md`, `SECURITY.md`, architecture.md
  §6.3, §14 and §16, and the three package `CLAUDE.md`s follow.

```
pnpm verify                → check-types, lint, boundaries pass; test: 251 files, 3963 passed, 8 todo; exit 0 (Node 22.23.3)
CI=1 pnpm verify:medium    → integration: 7 files, 51 passed; Playwright: 101 passed (1.9m); exit 0
                             (after `pnpm --filter @palier/web build`, and `playwright install chromium`: this machine had none)
playwright test --project=offline studio-selfhost-production → 2 passed; with the endpoint ignored → 1 failed
node apps/web/scripts/check-bundle-size.mjs → shared first-load JS 166.3 KB of 180.0 KB, within budget
```

After the pre-PR review (candid-review, harsh; eight findings, all applied, D192):

```
pnpm verify                → 251 files, 3963 passed, 8 todo; exit 0
CI=1 pnpm verify:medium    → integration 51 passed; Playwright 101 passed (2.0m); exit 0
```
