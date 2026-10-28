# Palier: Progress archive, deviations D200 to D299

Moved verbatim from `docs/progress.md` on 24 October 2026 (D255). Its index there points here. The rules are
`progress.md`'s: never edit a session entry, and mark a deviation resolved in place, updating its index line too.

### D200 — the realtime route's rate limit as built: counted in the sync database, connected on the first hit, and waited on for a second at most
**Date:** 3 October 2026 · **Status:** accepted (agent, Phase 7 Slice 5). Builds D195's decision; adds the wait limit

- **As D195 decided:** `RATE_LIMITS.realtime` is 60 posts an hour per IP hash, every post counted, a warm-up with no key too.
  The handler counts **before** it reads `Authorization`, through `rateLimitKey` and the `rate_limits` table, and refuses
  over the limit as `429 {"error":"throttled"}`. The browser maps `throttled` to the openai adapter's new
  `RouteThrottledError`, and the studio screen says `failThrottled`, which points at the user's own endpoint as the way
  round it. `warmRealtimeRoute` already ignored every refusal.
- **Where the store comes from.** `db.ts`'s `realtimeRateLimitStore` is `null` in the hermetic lane and with no
  `DATABASE_URL`. Otherwise it is the sync repository's `hit`, over the database the sync and telemetry APIs share, with
  `RATE_LIMIT_SALT`. **It connects on the first hit, not when the route is built**, so the route's composition stays
  synchronous and the route still answers with no database.
- **A failing store lets the post through**, as D195 decided. **So does a silent one** (new here): the count is raced
  against `RATE_LIMIT_WAIT_MS`, one second. Tap to first word is held under 2.5 s (D190). A database that never answers
  would otherwise hold the mint until the driver's own connect timeout, and fail-open would not be open in practice.
  **Proved to bite:** without the race, the silent-store test hung to its 5 s timeout; restored, it passes.
- **What it costs a person:** one write per post, on the same database the dial's warm-up already wakes (D190). A studio
  session posts at most four times.
- `/privacy` is unchanged. The count is kept under a day's HMAC of the address, which its "beyond using it for a moment to
  limit abuse" already describes.

### D201 — the landing page as designed: its own chrome, its own palette, its photographs served from this origin
**Date:** 3 October 2026 · **Status:** accepted (human's request and two rulings; agent's build). Outside the planned slices; deviates from PRD §10.1–§10.3 for `/` only

The human designed the landing page in Claude Design. It sits in `docs/Palier landing page/`, and **v4 is the one built**.
`/en` and `/fr` were a three-button hero in the app's shell. They are now v4's sections: hero, strip, three features, the
three tests with a live sample question, the oral banner, how it works, the FAQ and the closing call.

- **Two human rulings, asked before building.**
  1. **The design's visual language, faithfully.** A teal ink on a warm paper, with Source Serif 4 for headings and body.
     This departs from PRD §10.2's plum and amber and §10.3's Figtree and Inter, **for the landing page only**. The
     palette is `--landing-*` custom properties on `.landing` in `components/landing/landing.css`. Every rule there is
     scoped under a `landing` class, because Next keeps a page's stylesheet after a soft navigation away.
     `landing-contrast.test.ts` reads the hex values from the file and holds 18 text pairs to 4.5:1 and 4 UI pairs to
     3:1 with `@palier/ui`'s `contrastRatio`. Every value is the design's own; none needed retuning.
  2. **The design's own header and footer**, not the app's. The layout's chrome is now `components/Shell.tsx`, a client
     component that reads next-intl's pathname (`features/landing/landing.ts`'s `showsAppChrome`). On `/` it renders the
     page alone, and the page brings its own header, `main#main` and footer. It is a pathname switch, not route groups,
     which would have moved every route directory and every relative import. It is not a check in the layout either: the
     layout persists across soft navigations, so its decision would go stale on the way from `/` into the app.
- **What the export could not ship, and what replaced it.**
  - Six `images.unsplash.com` hotlinks are blocked by `img-src 'self'` and ADR 15. They were downloaded once, as WebP
    (23–118 KB each, 0.5 MB together), into `components/landing/images/`. `landing.css` uses them as backgrounds, so they
    are bundled under `/_next/static/media/` with immutable caching, and **the worker precaches them by following the
    stylesheet** (`staticAssetsInCss`). The landing page is whole offline. The CSP is unchanged. The hero is preloaded by
    a `<link rel="preload" as="image">` that React hoists into the head. `react-dom`'s `preload()` emitted only an RSC
    hint, too late for the first paint.
  - **Fonts.** Google Fonts became the self-hosted `--font-serif` (D161).
  - **Styles.** About 200 inline `style=""` attributes, blocked by `style-src 'self'`, became classes.
  - **Scripts.** The `DCLogic` runtime and `{{ }}` templating became server components. The sample question is the one
    island. The FAQ is native `<details>`, first answer open, with no script: the design's single-open accordion was
    state that `<details>` does not need.
  - **Copy.** The hardcoded EN/FR `COPY` object became the `landing` namespace in both message files. It replaces
    `home`, which only the old landing page read. Each leaf is a string, since `messages.test.ts` refuses arrays.
  - **Language switch.** The EN/FR pill buttons, a client-side copy swap, are now `LanguageToggle` with a `className`.
    It reads "Français" / "English" (PRD §12) and loads the document (D163).
  - **Links.** Absolute links to `palier-virid.vercel.app` became next-intl `Link`s.
- **What the landing footer keeps from the app's** (R5, R11, R12, R14, WCAG 3.2.6):
  - `NonAffiliation variant="footer"`. Its wording is v4's `disc` word for word, so the design's bold "Not an official
    tool." leads it;
  - the data, sync and key links, in a column the design did not have ("Your device");
  - library, about and privacy;
  - the shortcut sheet, so `?` works on `/` as on every page.

  The decorative "PALIER" wordmark is drawn from a `data-` attribute by `::before`. As text at a tenth of white, axe
  failed it for contrast, and it is no text anyone reads.
- **The landing serif is preloaded, on the landing page only** (after CI's first run). CI's Lighthouse gave `/fr` 0.88
  for performance on all five runs, and `/en` passed. The serif was not preloaded (D161), so it arrived after the first
  paint, and the hero, set in it, rewrapped as it swapped in. `next/font` sizes the fallback from `local("Times New
  Roman")`, which the Linux runner lacks, and the long French lede moved the vertically centred hero most.
  - `src/fonts/landing-font.ts` declares the same file again with `preload: true`. `next/font` preloads a face on the
    routes that import it, so only `/en` and `/fr` send its `Link` header; `/en/about` does not. A landing page loads the
    file once.
  - `landing.css` adds a fallback face over `local("Times New Roman")`, `local("Liberation Serif")` and `local("Tinos")`
    (the metric twins), with `next/font`'s overrides, for any load where the face is still late.
  - Measured with Playwright at Lighthouse's desktop size, with no Times-sized fallback and no Georgia as on the runner:
    `/fr`'s layout shift was 0.0053 before and is 0 after.
- **The sample question** marks the right answer ✓ and a wrong pick ✗ beside the colour (PRD §11). Its decisions are
  `sampleFeedback` and `sampleOptionState` in `features/landing/landing.ts`.
- **Tests changed, named here as the working agreement asks.** `smoke.spec.ts`'s "header focus order" ran on `/en`, which
  no longer has the app's header. It now runs on `/en/about`, so the app header's order stays covered. A twin holds the
  landing header to the same order: skip link, brand, its nav. Two new tests:
  - `/en` stays axe-clean with two answers open and the sample answered, wrong then right;
  - "Start free" leads to `/en/home` with the app's header and footer.

  `motion.test.ts` now reads `landing.css` too.
- **Proved to bite:**
  - with `showsAppChrome` returning `true` everywhere, `landing.test.ts` fails;
  - with `--landing-neutral-600` lightened to `#8a8582`, the contrast test fails;
  - before the wordmark moved to `::before`, the smoke spec's axe checks failed on `/en` and `/fr`.
- **For the human, not settled here:**
  - The hero photograph is the Canadian flag before the Peace Tower. PRD §10.1 asks to "deliberately avoid … maple
    leaves … and anything in red and white", and R5 asks that nothing look official. It is the design's choice, kept as
    designed, and the non-affiliation statement is in the footer. **Gate O's read of the page should rule on it.**
  - v4's English feature heading is "Built for exam conditions." and its French adds ", pas pour un cours". Both are kept
    as written, for Gate O's French read.
  - v4's English credit named Vitaly Gariev twice. Both credits now read as the French did, four names once each. The
    names were not checked against Unsplash.
  - The whole export, v1–v4 with its runtime files (`support.js`, `image-slot.js`, `_ds/`), **is committed as the
    reference**, at the human's request. It is not source: `eslint.config.mjs` ignores `docs/Palier landing page/**`, since
    its bundled scripts fail every rule.

### D202 — the app as designed: the landing page's teal and serif on every page, light only, flat panels
**Date:** 3 October 2026 · **Status:** accepted (human's request and two rulings; agent's build). Outside the planned slices;
deviates from PRD §10.2, §10.3 and §10.4 for the whole app

The human designed the app's look in Claude Design: `docs/Palier landing page/Palier App.dc.html`, beside v4 of the
landing page (D201). It draws the chrome, Today empty and as a dashboard, and setup's first two steps. For every other
screen it says one thing: it "keeps its current functionality and takes the same header, ground, buttons and panels".
So the work is in the tokens, the primitives and the chrome, with bespoke layout only where it is drawn.

- **Two human rulings, asked before building.**
  1. **Light only.** The design has no dark theme, and neither has the landing page. `@palier/ui`'s tokens lose their
     `dark` values, `ThemeName`, the `prefers-color-scheme` and `[data-theme]` blocks (nothing ever set `data-theme`), and
     the print block, which one light theme makes moot. `:root` says `color-scheme: light`. This departs from §10.2's
     "in both themes".
  2. **Exam mode keeps its own set**: the same paper, ink and serif, with charcoal (`#33373B`) and warm greys in place of
     the teal. Motion stays off (D86, D160).
- **The tokens.** The ten role names stay, so the 1,900 lines of CSS that read them follow: `bg` is the paper `#F3F2F2`,
  `ink` `#201E1D`, `primary` the deep teal `#00384A`, `info` `#00607D`. Nine are new: `surface-tint`, `surface-quiet`,
  `surface-deep`, `ink-soft`, `on-deep`, `on-deep-muted`, `primary-hover`, `link` and `rule`.
  - **`accent` is now gated.** It was the decorative amber; it is the design's bright teal `#0088B0`, the focus ring and
    the sync dot, held to 3:1.
  - **`correct` darkened**, `#1F7A5C` → `#1A6B50`: on the tinted and quiet panels it was 4.48:1 and 4.22:1.
  - **`rule`, `#6B6663`, is not in the design.** Its inputs are a fill alone, about 1.1:1 against the paper, short of WCAG
    1.4.11's 3:1 for a component's boundary. Inputs keep the design's quiet fill and gain a 1px `rule` border. ADR 13 is a
    floor.
  - The contrast gate grew from 60 checks to 102: every text token, `primary` among them, on the paper, a card, a tinted
    panel and a quiet one; the light text on a deep panel and on a primary button; and `primary`, `accent` and `rule` at
    3:1, `accent` on the tinted and quiet panels too, as the focus ring lands there, in both sets.
- **The type.** Source Serif 4 for everything, as the landing page had it. Inter and Figtree, their licences and their
  `SOURCES.md` rows are removed; the serif is **preloaded on every page**, and `landing-font.ts`, D201's landing-only
  preload of the same file, is folded into `fonts.ts`. D201's metric-matched "Serif Fallback" face moved from `landing.css`
  to `globals.css`, so every page has it. This departs from §10.3's Figtree and Inter. Passages keep 19px and 1.65.
- **The primitives.** Buttons are pills of regular weight; `Button`'s new `arrow` (`next` →, `go` ↗) draws the design's
  34px disc by `::after`, with empty alternative text, so the label alone names it and no glyph is a JSX literal. A new
  `light` variant is the white pill a deep panel carries. `Card`'s new `tone` is `surface`, `tint`, `quiet` or `deep`.
  **Panels are flat**: a fill, a 12px radius, no border and no shadow, departing from §10.4's "two soft shadows plus a 1px
  border". An answer option is white with the design's radio ring, tinted and ringed in primary when chosen; once
  answered, the glyph takes the ring's place. A callout is a flat fill with a 4px rule at its start in its tone. The empty
  state is the design's tinted banner.
- **The chrome.** The header is the wordmark, the destinations on a quiet pill track, then sync and the language as a white
  pill. The page you are on is the white pill **and** semibold, so the fill is not its only mark; `HeaderNav` is a client
  component over `features/nav/nav.ts`'s `isCurrent`, and sets `aria-current="page"`. The footer is deep teal, with the
  statement, the links and the giant "PALIER" drawn by `::before` from a `data-` attribute, as D201's is.
- **Today and setup, as drawn.** Today takes the design's 1160px column (`.app-wide`), and the others keep 760px. Where you
  stand is white, with the trend's invitation in a tinted inset. Today's plan is the deep panel with a light arrow pill.
  The review queue is a quiet panel of ruled links with their arrows. Setup puts the non-affiliation statement in a quiet
  box, adds a five-segment bar beside "Step N of 5" (`aria-hidden`, from `stepperSegments`), and draws its radios as the
  design's rings on native inputs, so the keyboard and the names are the platform's.
- **Tests changed, named here as the working agreement asks.**
  - `tokens.test.ts` and `css.test.ts` pinned the plum values and the dark, toggle and print blocks; they now pin the
    design's values, one light block and the exam block.
  - `contrast.test.ts`'s pairs are the new ones above.
  - `fonts.test.ts` expects the one file and its licence. `csp-production.spec.ts` held the body to `--font-sans` and the
    `h1` to `--font-display`; it now holds both to `--font-serif`. `offline.spec.ts` expects the serif precached, not three
    faces.
  - New: `features/nav/nav.test.ts`, `stepperSegments`, `buttonClass`'s arrow and `light`, `cardClass`, and `Button` and
    `Card` rendering them.
- **What the browser suites caught, and fixed:**
  - Axe failed the landing page's estimate card: the app's new base rule set `h3`'s colour, which beat the white the
    landing page's deep panels pass down. The base heading and link rules are now `:where(…):not(:where(.landing *))`:
    zero specificity, and nothing on the landing page.
  - Ten specs could not click a footer link. The giant wordmark's glyph box reaches up over the links and took the click,
    as it would a person's. It is `pointer-events: none`.
- **What the review found, and fixed** (candid-review, before the pull request):
  - **Forced colours.** The drawn radios (a gradient dot, and a transparent border that turns primary) cannot show a
    selection under Windows High Contrast, which repaints every border, the transparent ones too, and keeps the dot's
    dark colour. There the app's radios are the platform's again (`appearance: auto`), and a selected answer option is
    drawn in the system's `Highlight`.
  - **The deep panel redefines `--ink-muted` and `--accent`** to its light inks: the unlit streak flame, an outline in
    `ink-muted`, measured 1.23:1 on today's plan.
  - **The dialog's backdrop names its token's value as a fallback**: before Safari 17.4 and Chrome 122, `::backdrop`
    inherits no custom property, and the dimming would have vanished.
  - The gate's new pairs above: `primary` as text, and the focus ring on the panels.
- **What CI's medium lane found, and fixed** (the PR's first run, on the Linux runner):
  - **`/progress` printed on two pages.** It fit Letter at 100% and overflowed at 105% on macOS, and the Linux runner's
    rendering tipped it over. Two print rules:
    - the inline statement keeps its panel, but at the page's 8pt with 3pt by 6pt of padding;
    - the empty trend's note spans the row. It had sat in the chart's narrow first column and wrapped to 97px, twice.
      This was D198's layout, and the serif made it worse.

    It now fits up to 115% on both sizes.
  - **The key-leak journey counted 14 calls on the key, not 16. The cause was a product bug, not the test.** After "Stop
    and send", the practice reducer set `turn: "sending"` but left `waiting: true` until the bridge spoke again. While
    the recorder stopped, "Record your answer" came back for the question just answered. Two things followed:
    - the helper's wait for that button passed at once, so it ended the session before the third question was asked;
    - a user could record a second answer to the same question.

    `sent` now ends the wait (`waiting: false`). A clip's `stop` only resolves, so nobody is stranded. The new reducer
    test fails without the fix.
- **Proved to bite:** with `correct` back at `#1F7A5C`, the contrast gate fails four pairs; with `rule` lightened to
  `#B9B5B2`, it fails four more.
- **For the human, not settled here:**
  - The mascot and the streak flame are drawn in `accent`, so Coco is teal now. The design shows neither.
  - The landing page's `--landing-*` palette now has the same values as the app's tokens. Folding it onto them is a natural
    follow-up, left out of this slice so `landing.css` and its contrast test were not changed beyond the font.
  - PRD §10.1 asks for "playful", and the design is quieter. The design is followed.

---

### D203 — the full content run, authored by Claude through the intake: bank v4, and D54 resolved another way
**Date:** 4 October 2026 · **Status:** accepted (human's decision; agent's build). Resolves D54; ADR 24 supersedes ADR 19

The human asked for the full content run "if it hasn't been done yet". It had not: `content/bank/v3`'s 242 items were the
scripted provider's placeholder French (D54). Asked how to provide a key, **the human chose: "don't use OpenAI API to create
the content. Just create the content yourself."** So Claude wrote the bank, through the door the repo already had for content
the pipeline did not draft: the authored intake (content-factory.md §5).

- **What was written** (`content/authored/claude-*.json`; briefs in `docs/content-runs/v4/`):
  - Reading: 12 topics × 5 original passages × 5 comprehension items, all eight sub-skills on every topic.
  - Writing: 10 sub-skills × 33 items, mixing cloze, best-completion and error-id.
  - Oral: 20 scenarios, 5 session types × B and C × 2 topics.
  - Totals: 630 items (300 reading, 330 writing), 60 passages, 20 scenarios.
  - Each author instance took one assignment and ran `check-authored` until it was clean.
- **Credit.** `provenance: { origin: "authored", contributor: "claude-opus-5-5", generator: { model: "claude-opus-5-5",
  promptVersion: "authoring-brief-v4", date } }`. The generator says plainly that a model wrote the item. `provenanceLine`
  (`apps/web/src/lib/report.ts`) therefore shows it as "Machine-generated…", not "Written by hand".
- **The factory, extended rather than bypassed** (part A, tested branch by branch):
  - `run --authored-only` drafts nothing. Sources, the writing plan and scenario generation are skipped, the oral plan still
    gives authored scenarios their lengths, and the yield gate does not apply to a batch that drafted nothing.
  - The intake takes `scenarios`, with ids minted from content as the scenario stage mints them, held to `checkScenario`.
  - `authoredIssues` moved to `pipeline/authored.ts`, so the CLI can use it. It now also holds authored passages to
    `checkPassage`, requires each passage's numbers to equal those computed from its body, and flags stem near-duplicates.
  - `check-authored [files] [--write-readability]` runs those checks for a contributor, and CONTRIBUTING.md names it.
- **The run.** `PALIER_NOW=2026-10-04T00:00:00.000Z palier-factory run --authored-only --provider recorded --bank-version 4`
  published **626 of 630** (three register flags and one defensible distractor, discarded and not repaired). v3's content is
  carried and retired (D205), 20 scenarios are new, and four forms are v4's own beside v2's and v3's.
- **Copy.** `about.bankToday` ("still small and partly synthetic") is deleted, as the Slice 3 note asked.
  `about.bankMachine`, `landing.faq.source.a` and `progress.honestDoesNot` now say that Claude writes the items, that other
  instances of the same model review them blind, and that no person reads every item. They go to Gate O's French read.
- **What this is not.** It is not the cross-family paid run D54 described, so A1–A3 are judged by one model family (ADR 24).

### D204 — the blind review by separate Claude instances, replayed from committed verdicts
**Date:** 4 October 2026 · **Status:** accepted (human chose the reviewer; agent built the replay). ADR 24

The human was offered three reviewers: OpenAI reviewing only (cross-family, about US$10–15); separate Claude instances; or no
model review. They chose separate Claude instances.

- **How the review ran.**
  - `palier-factory review-requests` writes each authored item's blind request, exactly what stage 4 sends (`reviewRequestFor`:
    no key, no rationale, no explanation), with its hash, to gitignored `.palier/`.
  - Fresh instances, never an item's author, took chunks of 30–45. They worked under `docs/content-runs/v4/review-brief.md`,
    were barred from the item files, and returned `ReviewVerdict`s, about 18 reviewer instances in all.
- **The replay.** The verdicts are committed as `content/factory/reviews/wave-*.json` (`{ reviewer, verdicts: [{ requestHash,
  itemId, verdict }] }`, parsed with the domain's verdict schema). `providers/recorded-review-provider.ts` answers
  `reviewItem` from them.
  - A verdict is keyed by the hash of the request it answers, so editing an item invalidates its verdict. The review then
    **throws, naming the item**, rather than judge it on a stale verdict.
  - Every other method rejects.
  - Its usage names the reviewer and carries no cost, so the report's `provider` is `claude-opus-5-5` and its cost is `null`,
    not a misleading 0.
  - `committed-bank.test.ts` rebuilds v4 byte for byte with no key, as v3's scripted bank was.
- **The gate is unchanged.** `gateReasons`, with confidence 0.7, no defensible distractor, no register flag, and a band within
  one level.
- **Measured on real French.** The factory's eval set is placeholder French with the key's option marked, so it cannot measure a
  real reviewer. A separate instance, which reviewed nothing, wrote 60 real-French items, ten in each of five defect classes and
  ten clean controls. Two fresh reviewers judged them blind (`docs/content-runs/v4/eval/`).

  | Class | Caught |
  | --- | --- |
  | wrong key | 10/10 |
  | two defensible keys | 10/10 |
  | mis-tagged band | 10/10 |
  | ambiguous | 9/10 |
  | register | 9/10 |
  | **All defects** | **48/50** |
  | Clean controls passed | 10/10 |

  **Said plainly:** a Claude instance wrote the defects, so this is what Claude catches in Claude's mistakes.
- **Five stems were reworded before their verdicts counted.** All five were generic frames repeated across files (« Quel est
  l'objet principal de ce bulletin ? »), which stage 5 would have dropped as near-duplicates. They had passed review and failed
  nothing, so this was not a repair. The reworded items went back through blind review in wave 6, and their stale verdicts were
  pruned.

### D205 — retirement as data: v3's synthetic items and scenarios stay in v4, retired
**Date:** 4 October 2026 · **Status:** accepted (human chose to retire them; agent built it)

- **What retires them.** `content/factory/retirements.json` names `itemGeneratorModels: ["scripted"]` and v3's ten scenario ids.
  `applyRetirements` (`pipeline/carry.ts`, pure) sets `status: "retired"` on the carried items and scenarios it names, and
  `runInputFor` applies it after `applyStatistics`. Retirement is one-way, as D94's is.
- **What stays.** All 242 items and 10 scenarios stay in the bank, because attempts, schedule entries, the v2 and v3 forms, and
  past oral sessions name them. The selector serves only published items, and the form stage skips retired ones, so v4's forms
  hold only authored items.
- **Scenarios gained an optional `status`** (`OralScenario`, `oralScenarioShape`; absent means published, so v1–v3 still parse).
  `oralSessionChoices` never offers a retired one.
- **Not built, named:** `reviewQueue` resolves due entries through `byIds` with no status filter. A user who holds a synthetic
  item in their Leitner boxes keeps reviewing it until it graduates. Filtering it changes engine behaviour, so it is left for
  the human to schedule.

### D206 — what the run did differently from content-factory.md §2, and what it found
**Date:** 4 October 2026 · **Status:** accepted (agent), two findings for the human

- **60 passages, not §2's 150–250.** Five questions per passage, across five sub-skills, is closer to the real reading test than
  two questions per passage, and it gives 300 reading items, inside §2's 250–350.
- **Writing: 330 items, inside §2's 250–350. Scenarios: 20, inside 15–25.** Published: 298 reading and 328 writing.
- **Error-identification items ask for the correction** (« remplacer « X » par « Y » »), not for the faulty segment. Stage 5's
  answer-leak rule rejects any item whose key text appears in its stem, and a quoted segment always does.
- **Finding: the bank outgrew §13's first-fetch budget.** v4 is about 515 KB gzipped, against v3's 34 KB. Each 100-item shard is
  40–50 KB, inside architecture.md's 40–80 KB, but `worker.ts` precaches every shard the manifest lists, and §13 says the first
  bank fetch is under 400 KB. No test enforces the budget. The options are for the human: lazy shard fetch, precaching only the
  study profile's skill, or an amended budget.
- **Finding: the review queue serves retired items** (D205).

### D207 — two tests whose premise the run changed, said here rather than edited quietly
**Date:** 4 October 2026 · **Status:** accepted (agent); flagged in the pull request

- **`authored.test.ts`: "takes no id the bank holds"** assumed a contribution is pending until it ships. The run's
  contributions stay in `content/authored/`, because they are the source `committed-bank.test.ts` rebuilds v4 from. The rule is
  now: **an id the bank holds must be this same contribution**, compared without the `status` and `stats` a bank may add (D94,
  D205). A different record under the id is still flagged, and the existing test for that passes unchanged. **The fixture
  passage changed too**: it had two sentences and 20 words, and the new passage rules (D203) would reject it. It now has three
  sentences and 51 words, with its numbers computed from the body.
- **`committed-bank.test.ts`: "exactly one scenario per type and band"** became **"a published scenario for every type and
  band"**, plus **"every scenario the previous version published is carried"**, plus **"retirements take effect and v4's own
  forms hold no retired item"**. v4 carries ten retired scenarios beside twenty new ones, so the old count could not hold. Its
  rebuild recipe moved from the scripted provider to the recorded reviewer and `--authored-only`.
  `container.test.ts`'s scenario check moved the same way.
- **`oral-production.spec.ts`** had v3's C warm-up written into it: "three minutes, then two", phases « Mise en train » and
  « Description ». The picker now offers an authored warm-up, so the spec reads the offered scenario from the committed bank,
  the first published warm-up at C in id order, as `oralSessionChoices` takes it. It then crosses that scenario's first phase.
  The behaviour under test, a timer tick moving the session into its next phase, is unchanged.
  `progress-history-production.spec.ts` now seeds history on published items only.
- **Shapes that grew a field:** `io.test.ts`'s `loadAuthored` expectations gained `scenarios: []`. `cli.test.ts`'s
  `buildProvider` calls take the provider's name rather than a boolean.

---

### D208 — the diagnostic could never show a figure, and now always gives a result
**Date:** 6 October 2026 · **Status:** accepted (agent, on the human's request; ADR 25)

The human took the written diagnostic and got three "N more are needed" rows. That was the design working as built:
- The selector drew a run uniformly from a bank of B and C items only, about 13 and 17.
- `MIN_EVIDENCE` is 30 per band, so §6.2's "sized to clear the minimum evidence threshold in one sitting" was never true.
- The A row always read "0 answered", because v4 has no A items.

The fix has three parts:
- **The run is even.** `selectItems` takes a `bandQuota` (the profile's 15 B and 15 C). A band short of its quota is filled
  from the rest.
- **The result is the run's own counts**, not the trend: `latestCompleteRun` and `summariseDiagnostic`. A band the run
  did not hold is absent, not "0 answered".
- **One run still does not clear the trend**, and the result no longer waits on it. The trend's meters stay on Today, once
  any band has an estimate.

`DIAGNOSTIC_SIZE` left `lib/study.ts` for the profile's `diagnostic.size` (ADR 9). `diagnosticReadout` is deleted, along
with its test, because nothing reads it now. The container test that drove it drives `diagnosticResult` and `studyFocus`
instead.

### D209 — the placement is derived and never stored; the interpretation is stored, on this device only
**Date:** 6 October 2026 · **Status:** accepted (agent)

**Derived.** The starting band, the focus and the score are recomputed from the attempt log on every read (ADR 16), so a
paired device places the same way.

**Stored.** The written interpretation cannot be derived again and cost money, so it is kept:
- in a new port, `DiagnosticReportStore { put, get, clear }`, keyed by the run's session;
- in Dexie as **schema v4**, `diagnosticReports`, and in memory;
- never synced and never exported, and cleared by wipe and delete-everywhere.

ADR 16's *revisit when* is not met, and does not need to be: this is not derived state. It is the oral report's pattern
(D122). Another device shows the same score and asks for its own interpretation.

**The rules are profile data.** A run counts once it has at least `size` **distinct** items. The starting band is the
highest at or below the target answered at `secureAccuracy` (0.7). The plan then draws `startShare` (0.7) of its new
items there, first. Without a placement, or with one at the target, the planner is unchanged, and no golden moved.

**What biases the day.** `studyFocus` merges an oral report's fixes with the run's focus, oral first. `startSession` and
Today's preview both read it, so the preview no longer differs from the session. Before this, the preview ignored the oral
report's fixes.

### D210 — the diagnostic is gated on the key, and the key screen leads back
**Date:** 6 October 2026 · **Status:** accepted (human's decision, ADR 25)

§8.1's "diagnostic before key, always" is overridden, and the PRD now cites ADR 25.
- With no key, `/diagnostic` shows `NoKeyCard` (namespace `diagnostic`), whose link carries `?next=diagnostic`. The key
  screen's `returnAfterKey` is an allow-list, so the query can never point the link elsewhere.
- With a key, the launcher states the interpretation's estimate and the soft cap's notice before the first question.
- The result asks for the interpretation **only at the run's own end**, joined while in flight
  (`diagnosticInterpretationInFlight`). Opened from Today, or for a run synced from another device, or kept in the other
  language, it is offered with its cost and never spent on opening. A run drawn short of `size` is not started: it says
  so, since it could never place.
- The new store joins the "Never leaves this device" list on `/privacy` and the sync settings, and the key offer names
  the diagnostic among what a key turns on.
- The onboarding wizard is unchanged in shape. On the diagnostic path, the diagnostic's own gate is step 5.
- The readout's `KeyOffer` is gone, and **the "Only a full mock exam can give a band" line is deleted** in both
  languages (`diagnostic.resultNote`).
- The result names no band, and shows no question. The missed questions come back in the review queue, as before.

### D211 — the interpretation's fixture is not recorded, and its price is a placeholder
**Date:** 6 October 2026 · **Status:** open (agent); the recording is named in *Next, decided*

This session had no `OPENAI_SMOKE_KEY`. Fixtures are recorded, never written by hand (D112). So:
- The live smoke now makes the call: `DIAGNOSTIC_RUN`, a whole writing run with twelve misses. It also measures the
  feature, and `--record` writes `interpretDiagnostic.json`.
- The recorded loader, the replay switch and the recorder all know the method.
- The coverage set, `RECORDED_RUNS` and the factory's `CONFORMANCE_METHODS` wait for the file.
- `pricing.json`'s `diagnostic-interpretation` row (4,000 in, 900 out on `assess`) is a placeholder, and its note says so.
- The adapter's wording, retry and refusals are unit-tested over canned responses, and the contract runs against both
  providers.

### D212 — the tests whose premise the human's decision changed, said here rather than edited quietly
**Date:** 6 October 2026 · **Status:** accepted (agent); flagged in the pull request

**Rewritten, because the behaviour they pinned is what the human asked to change:**
- **Journey 1** asserted the "A-level / B-level / C-level items" meters and "more are needed". It is now onboarding, the
  key at the gate, the diagnostic, the plain score, the placement, the interpretation, no question and no mock-exam
  caveat, then Today's card and the plan's line.
- **`key.spec.ts`'s "step 5 comes after the diagnostic, never before it (§8.1)"** asserted the old rule. It now asserts the
  gate and the way back.
- **`key-leak.spec.ts`** adds the key before the diagnostic. The interpretation is one more call on the key, so every
  later `openAiAuthorizations` count is one higher: 3, 9, 17, 18. The leak guard stubs the interpretation by its prompt
  (`completionKind`'s `diagnostic`).

**Grown by one entry or one version:**
- `AI_FEATURES` in `ai.test.ts`, `featureCosts` in `spend.test.ts` and `container-spend.test.ts`, and `pricing.test.ts`'s
  feature table.
- The live smoke's completion count and its recorded file list.
- `db.verno` (3 → 4) in `migration.test.ts`, where "v2 → v3" is now "v2 → current" and "v3 → v4" is added, and in
  `generated-item-store.test.ts`.
- The JSON Schema snapshot of the profile.

**Renamed only:** `onboarding.test.ts`'s parenthetical. The assertion is unchanged.

### D213 — the saved result is the diagnostic page's own, not a route, to keep E2E shard 2 inside its budget
**Date:** 6 October 2026 · **Status:** accepted (agent)

The first CI run of #67 had one E2E shard 2/2 killed at its 300-second budget. The same shard passed on the other run of the
same commit in 4.9 minutes. On `main` that shard takes 3.8 to 4.5 minutes (55 tests, 4.5m on 4 October).

Both branches split the 109 tests identically, and shard 2 holds none of the specs this slice rewrote. Its growth came
from the new `/diagnostic/result` route:
- the warmup compiles one more route, serially;
- `csp-production.spec.ts` polices two more pages, one per language;
- the precache and sitemap checks carry one more entry.

So the result opened from Today is now `/diagnostic?result=<skill>`. The launcher reads it with `useSearchParams` and shows
`DiagnosticResult` in place of the skill choice. The route, its island, its `routes.json` line, its CSP entry and the
`diagnostic.pageTitle` message are gone. The budget is unchanged, as implementation-plan.md 6.5 asks. Shard 2 still has
about 30 seconds of headroom on `main`, which the next slice to add a page will want to know.

### D214 — Today leads with one next step: the diagnostic, then the plan, then a mock exam once practice at the target is measurable
**Date:** 6 October 2026 · **Status:** accepted (human's request and decision; agent's build). Outside the planned slices;
amends PRD §8.2

The human found Today unclear: the mock exam was the first thing on the page (the readiness card's exam half led, with its
invitation always shown), and nothing said how it differs from the diagnostic. The order they expect is the diagnostic, then the
plan, then the mock exam "after a certain point".

- **`features/home/next-step.ts`, `nextStep`**, pure and tested per branch, picks the step at the skill being looked at:
  1. `diagnostic` while no complete run has placed the plan;
  2. `retake-diagnostic` once the profile's `retakeDays` have passed, ahead of the exam, so the exam follows a current placement;
  3. `mock-exam` when practice at the target is measurable, which means the trend has an estimate at the target band
     (`MIN_EVIDENCE` answers there), or when the planner advises one (`DayPlan.mockExamAdvised`, the taper, computed since Phase 2
     and never rendered until now). **Once per diagnostic:** a mock exam at this skill submitted since the run means it was taken;
  4. `plan` otherwise, with no banner.

  No number is typed in: the threshold is the trend's, the taper the planner's, the retake the profile's. **The human chose
  "measurable at the target"** over "measurable and at 70%" and over "right after the diagnostic".
- **The step is a banner at the plan's head**, inside the deep panel. The diagnostic's says it runs on the key, and that the plan
  below works meanwhile, since everything but the diagnostic works without one (ADR 25).
- **`latestExamResult` takes an optional `skill`** (`LatestExamRequest`), so Today can ask whether *this* skill has had its exam.
  Where you stand still shows the newest exam at either skill, as before.
- **The difference is said where each appears**: one line under each half of Where you stand ("Finds your starting level and
  shapes your plan" / "The full timed test, scored like the real one"), the mock exam's hint in the plan's list, and a sentence
  added to `exam.intro` and to the head of `diagnostic.intro`.
- PRD §6.2's "re-offered after any mock exam" is still not built: the retake follows `retakeDays` only. Re-offering a paid run
  after every exam would cost the user money for little, and the human was not asked.

### D215 — the plan takes two-thirds of Today, and the review card folds into it
**Date:** 6 October 2026 · **Status:** accepted (human's decision on the card; the layout was left to the agent). Amends D202's
Today and PRD §8.2

- **Layout.** From 900px, `.app-home` is `minmax(0, 2fr) minmax(0, 1fr)`: the plan on the left, and `.app-home__side` on the
  right, holding the quick pointer (D216) above Where you stand. On mobile the order is the plan, the pointer, then where you
  stand. The side column is its own grid, as the design draws it, so a tall plan never stretches the pointer's row.
- **The review card is gone (human).** The plan's first row, "Review", already draws on the same due items, and Review is in
  the header. Its links became the plan's **"More ways to practise"**: the review queue with its due count, speaking, the mock
  exam with what it is for (not repeated when it is the banner), **the library**, which §8.2 zone C asked for and was missing,
  and the diagnostic again, **now only once there is one** (it showed to people who had never taken it).
- **Where you stand** reorders to the diagnostic, the trend, then the exam, and shows the exam half only once an exam exists
  (`examNone` is deleted). With no diagnostic it says the result appears there once taken. The first-run inset moved to the
  banner (`firstRun*` deleted), and the retake line moved to the banner too.
- The countdown moved into the plan, where the taper acts on it.
- Keys deleted: `today.firstRunTitle`, `firstRunBody`, `firstRunAction`, `reviewTitle`, `reviewDue`, `reviewAction`,
  `examNone`. The link names "Take a mock exam" and "Practise speaking" are unchanged, because `key-leak.spec.ts` clicks them.
- `.app-home__inset` and `.app-home__actions` are gone from `globals.css`. `.app-home__plan` keeps its name, which
  `engagement-production.spec.ts` selects.

### D216 — the quick pointer: a new content artefact, three per scored sub-skill
**Date:** 6 October 2026 · **Status:** accepted (human's decision: "new short pointers per sub-skill"; the agent wrote them);
**superseded in part by D218**, which keeps the artefact and its picker but makes every pointer a French grammar point

- **The artefact.** `content/pointers/pointers.json`, published as `@palier/content/pointers/pointers.json`. Each `Pointer` is
  `{ id, subSkill, lang, text: Localised }`. The sub-skill is a reading or written-expression one, never oral, since no drill
  practises those. Cited practised-language text is marked `_like this_`, the library's `CITED_MARK`, and renders through
  `Cited` with its `lang`.
  - `pointerSchema` is in `CONTENT_SCHEMAS`, with `docs/schemas/pointer.schema.json` generated.
  - `parsePointers` refuses a duplicate id, an unpaired marker, and **a set missing any scored sub-skill**.
- **The content.** 54 pointers, three for each of the 18 sub-skills, in English and French, written by the agent at PRD §13's
  register. Federal administrative French, with Canadian typography: a space before the colon, none before the semicolon. The
  French goes to Gate O's read with the rest. **No dependency added.**
- **The choice.** `features/home/pointer.ts`'s `pickPointer` is pure. It draws from the focus `studyFocus` gives the plan,
  filtered to the skill being looked at, and from all of that skill's sub-skills when there is no focus. It turns over with the
  device's local day (`localDay`), so the pointer is the same all day.
  - A written-expression pointer links its library article.
  - The container parses the file once, like the prompts, and exposes `container.pointers`. It loads with the lazily imported
    container module, so the first load is unchanged.

### D217 — the tests whose premise the human's request changed, said here rather than edited quietly
**Date:** 6 October 2026 · **Status:** accepted (agent); flagged in the pull request

- **Rewritten:** four assertions used the heading **"Review queue"** to mean "Today has loaded":
  - `journeys.spec.ts` (after the review set);
  - `production.spec.ts` (journey 4, twice);
  - `offline.spec.ts` (journey 2 offline).

  The card is removed at the human's request, so they assert **"More ways to practise"**, the list that replaced it.
- **Grown by one entry:** `json-schema.test.ts`'s list of published artefacts gains `pointer`.
- **Added:**
  - journey 2 asserts that a new user's Today leads with "Start here: take the diagnostic", shows no mock-exam banner, still
    offers "Take a mock exam" as a way on, and shows the quick pointer, axe-clean;
  - `next-step.test.ts`, `pointer.test.ts`, `pointers.test.ts` and the committed-content test, `pointer.test-d.ts`, the
    container's pointer coverage, and `latestExamResult`'s skill filter in both the use case's tests and the container's.

### D218 — the pointer is a grammar point, in the language practised (supersedes part of D216)
**Date:** 7 October 2026 · **Status:** accepted (human's correction, on the D214–D217 pull request)

The human read D216's pointers and asked for two changes: show them **in the language being practised, not the interface's**,
and make them **quick grammar pointers**. D216's reading-strategy advice is not grammar, and its English text taught nothing
in French.
- **The artefact.** `Pointer.text` is one string in `lang`, French for now, no longer `Localised`. `subSkill` is a
  written-expression one only: the taxonomy's grammar and usage points. `parsePointers` now requires every
  written-expression sub-skill, and refuses a reading or an oral one.
- **The content.** 50 pointers, five for each of the ten written-expression sub-skills, all in French. Each holds a rule
  and an example marked `_like this_`, and a content test holds every pointer to having one. D216's 54 are replaced. The
  French goes to Gate O's read.
- **The card.** Its heading is "Grammar pointer" / "Point de grammaire". The paragraph carries `lang="fr"` whatever the
  screen's language, and its examples are italic. It always links its sub-skill's library article, since every
  written-expression sub-skill has one.
- **The choice.** `pickPointer` no longer takes the skill being shown. It favours the **writing** plan's focus
  (`studyFocus` at writing), read even on the reading tab, so the day's pointer is the same on both tabs. With no
  grammar point in focus, it draws from all 50.
- **Tests changed with the premise:**
  - `pointers.test.ts`, `pointers-content.test.ts` (five per sub-skill, an example in each), `pointer.test.ts`;
  - the container's coverage test (written-expression sub-skills);
  - journey 2's heading, now "Grammar pointer", which also asserts the text's `lang="fr"`.

### D219 — Today takes the dashboard layout: the week and three skills in a deep hero, statistics, a practice calendar
**Date:** 7 October 2026 · **Status:** accepted (human's request and answers; agent's build). Amends D215's layout and PRD §8.2

The human attached a dashboard design (a learning app's "My progress": a dark hero with three coloured course cards, then
statistics, a month calendar and "Quick Pointers") and asked for Today to take its layout in Palier's palette and serif. The
agent mapped each piece to what Palier already has and asked four questions. The human answered: the hero shows **the three
kinds of study**; **all three cards link to their practice** and the Reading/Writing switch stays; each card's bar is **how
much of today's plan is done**; and **Where you stand stays on Today**, under the plan.

- **The hero** is the deep panel. On the left: the test countdown as its eyebrow (moved here from the plan, so it is said
  once), else "Last seven days", over those days' answers. The window is rolling, so the copy says "the last seven days",
  never "this week", which it is not. On the right: Reading, Written expression and Oral expression, numbered,
  each a link to `/practice/{skill}`, with a glyph, "6 of 13 done today" and a `ProgressRail`. Oral has no plan, so its line
  is the sessions today with the minutes actually spoken, none for a session answered by typing, and its rail, named "Oral
  practice today", is full once one has ended.
- **The left column** holds three things:
  - the statistics: the streak (the freeze notice beneath it), the reviews due (a link to `/review`), and the last seven
    days' minutes of practice with a sparkline. The streak's tile is drawn empty until the streak loads, so its arrival never
    shifts the tiles beside it;
  - the plan, now a white card with the switch at its head, and D214's banner and D215's "More ways to practise" unchanged
    in behaviour;
  - Where you stand.
- **The right column** holds the practice calendar and the grammar pointer:
  - the calendar marks the streak's days, the days its freeze kept, the test date and today, with a legend in words;
  - the pointer has an "All articles" link to `/library`.

  On mobile the order is the hero, the plan, the pointer, the statistics, Where you stand, then the calendar.
- **The data.** The engine's `weekActivity` is pure and property-tested, a function of the record set. It counts today's
  answers per skill, the week's answers, and each local day's measured time: `msToConfirm` plus spoken time, the measures
  `/progress` sums. The app's `practiceActivity` use case feeds it drill and review answers (`PLAN_MODES`; a diagnostic is not
  the plan) and the ended oral sessions. `StreakReport` gains `activeDays`, so the calendar marks exactly the days the streak
  counted.
- **The overview and the skill view load separately.** The hero, the statistics, the calendar and the pointer do not change
  with the switch, which now reloads only the plan and Where you stand.
- **The colours are the brand's.** Reading takes `surface-tint`. Writing and oral take two new tokens from
  `colors.css`: `surface-mint` (#BFE6C8, its ok background) and `surface-rose` (#F4C6D9, its no background), with Card tones
  `mint` and `rose`.
  - Rose fails 4.5:1 for `incorrect` (3.9) and `warning` (4.2), so the two fills join a pair list of their own in the
    contrast gate: the three inks and primary only, which are all a skill card carries.
- **`@palier/ui` gains:**
  - `Sparkline` (`aria-hidden`; the figure is in text beside it);
  - `MonthCalendar` (a table, Sunday first, `aria-current="date"`, each mark read in words and repeated in a legend, the
    neighbouring months' days hidden from a screen reader);
  - `monthGrid` and `sparklineGeometry` in `logic.ts`.

  `Glyph`'s `switch` became the `GLYPH_PATHS` record (principle 6), registering `book`, `pen`, `mic` and the two chevrons.
- **Keys.**
  - Added: `today.hero*`, `skillsLabel`, `oralName`, `skillToday`, `skillRail`, `oralToday`, `oralNotYet`, `stat*`,
    `calendar*` and `pointerViewAll`.
  - Deleted: `engagement.streak`, now the tile's `today.statStreak`.

  `.app-countdown` and `.app-streak` are gone from `globals.css`. `.app-home__plan` keeps its name.
- **Tests whose premise changed, said here rather than edited quietly:**
  - `tokens.test.ts`'s exact token list grows by the two fills;
  - `engagement-production.spec.ts` looked for "2-day streak" inside `.app-home__plan`, and the streak is now the statistics'
    tile, so it asserts "days in a row" inside `.app-home__stats`, and the freeze notice there too.

  Added:
  - journey 2's checks: the hero's three links and their routes, "0 of n done today", the empty-week line, the statistics,
    today in the calendar, and after the set, the week's count, the reading card and today marked practised, then stepping
    a month back;
  - the engine's `activity` unit and property tests and the app's `practice-activity` tests;
  - `activeDays` in `engagement.test.ts`, and the container's wiring of both through each graph;
  - the UI's `monthGrid`, `sparklineGeometry`, Glyph registry, `Sparkline` and `MonthCalendar` tests;
  - `today-view.test.ts`.

### D220 — Onboarding's step 5 says why a key, what it costs and how to get one, with the owner's video, and takes the key in place
**Date:** 9 October 2026 · **Status:** accepted (human's request and answers; agent's build). Amends PRD §8.1 step 5 and
D100's "where step 5 goes"

The human: the AI features are where Palier's value is, and an API key is new to most non-technical people. So step 5 should
explain **why** a key (it keeps Palier free, and it is safer), **what it costs** (charged by OpenAI, with estimates), then
**how** to get one, with the video they recorded (`docs/openai-explainer.mp4`). The agent asked four questions, and the human
took the recommendation on each: **one step with three sections**, so the count stays "of 5"; **shown on both paths unless a
key is already held**; **skippable, but framed as recommended**; and **the key pasted in the step itself**.

- **The flow** (`features/onboarding/onboarding.ts`):
  - `stepsFor(hasKey)` replaces `stepsFor(placement)`, so the key step is on both paths;
  - the stepper counts the steps shown: 5, or 4 when a key is held, where the diagnostic path used to read "of 5" over four;
  - "Skip for now" lands on the key step (`skipTarget`), since the preferences are what it skips;
  - `destinationFor` loses `addKey`: onboarding never leaves for the key screen;
  - **a diagnostic chosen with the key passed over lands on Today**, not on the diagnostic's gate. The user has just
    declined a key, so being asked for one on the next screen read as being ignored. Today leads with the diagnostic as
    its next step (D214), and the gate still asks when they take it (D210). Found by the branch's own review;
  - the wizard reads `apiKeyStatus` once, on mount.
- **The step** is `components/onboarding/KeyStep.tsx`, **outside the wizard's `<form>`**: the key's own form sits in it,
  and a nested form is invalid HTML, and Enter in the field would have submitted the wizard.
  - **Why:** "It keeps Palier free…", "It is also safer…" (no Palier account with a name, email or card; writing goes from the
    browser to OpenAI), then `key.offerStays` unchanged. That is the one sentence carrying studio mode's exception (D186), so
    the step cannot drift from the key screen's statement.
  - **What it costs:** OpenAI bills the user's own card, and Palier takes no cut. Then five estimates, a diagnostic result,
    writing feedback, a fresh set, and a minute of spoken practice and of studio, from `featureCosts` over `pricing.json`
    (`keyStepCosts`; an unpriced feature is left out, never shown as free). No figure is typed in code. Then the monthly
    limit, and that drills, review and mock exams cost nothing.
  - **How:** the video, then "Read the steps instead" (`<details>`), then a link to the guide in a new tab.
  - **The key's form** is `components/key/KeyEntry.tsx`, extracted from `KeySettings` (`useKeyEntry` holds the state, so the
    key screen keeps its loading gate, unchanged in behaviour). On the step it **checks the key as soon as it is saved**
    (`afterSaveAction`), so a missing billing step shows there, as "has reached its usage limit or has no credit left". The
    key screen still waits for its own Check.
  - **Its way on** (`keyStepFinish`): with no key, a quiet "Not now, continue without a key", or on the diagnostic path
    "Not now: take the diagnostic later, from Today"; with one, "Start practising", or "Continue to the diagnostic" on that
    path.
- **The video** moved to `apps/web/public/media/openai-explainer.mp4` (74 s, 600×338 H.264, silent, English captions burned
  in, `moov` first; 3.9 MB), committed once, not also under `docs/`.
  - `components/key/ExplainerVideo.tsx` renders it `controls`, `preload="none"` and never autoplaying, with a 5.8 KB WebP
    poster cut from its title frame and bundled, so the CSP's `media-src 'self'` and `img-src 'self'` need nothing new.
  - Its caption says it is silent. In French it says the captions are English and the same steps are written in French below.
  - Its accessible name avoids "OpenAI API key", which a screen reader would have confused with the key field's label (found
    by the E2E's `getByLabel`).
- **The service worker leaves `/media/` to the network and never caches it.** A player fetches video in ranges. Network-first
  put the 206 in the cache, `Cache.put` throws on a partial response, and the request failed. **Proven to bite:** with
  `/media/` taken out of `PASSTHROUGH_PREFIXES`, the production spec's ranged fetch failed with "Failed to fetch".
  - The spec tests the range, not playback, because CI's Linux Chromium may have no H.264 decoder.
  - Offline the video does not play, and the written steps still work.
- **The guide** (`/settings/key/guide`) shows the same video and `KeyGuideSteps`, shared with the step. The steps are
  rewritten to follow the video's six captions, plus a seventh, the monthly limit, which the video does not show.
  OpenAI's pages open in a new tab, said to a screen reader. **This resolves D100's standing item, "the key guide's
  screenshots".**
- **Keys.**
  - Added:
    - `start.key*`;
    - `key.videoLabel`, `videoNote`, `videoFallback`, `newTab`, `guidePlatform`, `guideStep6`, `guideStep6Below` and `guideStep7`.
  - Rewritten: `key.guideIntro` and `guideStep1`–`guideStep5`.
  - Deleted, with `KeyOffer.tsx`, their only user: `key.offerHeading`, `offerUnlocks`, `offerCosts` and `offerAdd`.

  The French is the agent's, and goes to Gate O's French read.
- **Not an ADR.** ADR 2 (the user's own key) and ADR 3 are unchanged. This is the product's onboarding copy and flow, so it
  is recorded here and in the PRD, as ADR 25's change to §8.1 was.

### D221 — the tests whose premise the human's request changed, said here rather than edited quietly
**Date:** 9 October 2026 · **Status:** accepted (agent). Follows D220

- `onboarding.test.ts`:
  - "on the diagnostic path runs … nothing after the goal" and "on the skip path ends with the key step" pinned D100's
    placement-keyed step list. They are now "shows the key step whichever the placement" and "leaves the key step out when
    this browser already holds a key";
  - "lands on the key screen when step 5's 'Add a key now' is chosen" is deleted with `addKey`;
  - "lands on the diagnostic when chosen" now says "with a key held", beside a new case for the key passed over.
- `e2e/helpers.ts`'s `onboard()` passes the key step on both paths: with `{ key }` it pastes it and waits for "This key
  works.", otherwise it presses "Not now". **It now waits for the landing URL**, so a caller that navigates next cannot cut
  off the profile's write.
- **Journey 1 and `key.spec.ts`'s gate test** pass the key over on the diagnostic path, so they now land on Today and
  reach the gate by its "Take the diagnostic" link. What each checks of the gate is unchanged.
- **`{ addKey: true }` is gone.** Its callers (`key-leak-production`, `oral-production`, `studio-selfhost-production`,
  `studio-live`) pass the step over and open `/en/settings/key` by `page.goto`. All are on real IndexedDB, so nothing is
  lost, and each still saves the key on the key screen, as it did.
- **`key.spec.ts`:**
  - Journey 5 now starts with the key saved and checked in step 5, then reaches the key screen by the footer's link. Its
    checks, refusals, remove, blank save, masked save, tab-only key and wipe are unchanged, reordered to begin from a held
    key. It also asserts that the key screen's save does not check by itself.
  - "step 5 is the skip path's last step: three lines…" became the step's own test (the three sections in order, five priced
    costs, the video's `src` answering as `video/mp4`, the written steps, axe).
  - New: a refusal shown at once, the diagnostic path's step leading to the launcher, "Step 4 of 4" with a key held, and the
    guide's video and seven steps.
- **`key-leak.spec.ts`** saves the sentinel through onboarding's step, so that new flow is under tier 11. Its count of
  bearer tokens to OpenAI therefore starts at one, the step's check, and every later count is one higher (2, 3, 4, 10, 18,
  19), with nothing else changed. `addKeyAtDiagnosticGate` is still run by journey 1 and `key.spec.ts`.
- `offline.spec.ts` gains the ranged fetch through the worker (D220).

### D222 — step 5's why and cost open on demand, and the video is in view when the step opens
**Date:** 9 October 2026 · **Status:** accepted (human's request; agent's build). Amends D220's presentation, not its order
or content

The human: on step 5, hide *Why your own key* and *What it costs* by default, expandable for anyone who wants more, and
make sure the video is above the fold.

- **Why and what it costs are `<details>` disclosures, closed by default**, in D220's order, above *How to get one*. Their
  summaries are the old headings' keys (`start.keyWhyHeading`, `keyCostHeading`), as plain text, not an `h3`: a heading
  inside a `summary` is not exposed as one. Nothing they hold changed, so there are no new strings. All three disclosures on
  the step share `.app-key-step__more` (it was `__steps`).
- **Closing them was not enough for "above the fold".** Below the hero title, the non-affiliation statement, the stepper,
  the heading and the intro, the video still started at 758 px of a 1440×900 window. It fit at 1280×720 only because the
  previous step had left the page scrolled. So **`KeyStep` scrolls the video into view as it mounts**, with
  `block: "nearest"`: the least scroll that shows all of it, none when it already shows. This runs before the wizard focuses
  the heading, which then stays in view, so the focus moves nothing.
- **Tests** (the request changed the premise of one, so it is said here, as D221 did):
  - `key.spec.ts`'s "step 5 says why a key…" no longer reads three level-3 headings. It checks that the two summaries come
    first and are closed, the video is wholly in the viewport, and "How to get one" is the first level-3 heading. Then it
    opens each disclosure and makes the same checks as before: the free and studio-exception sentences, and five priced
    costs (scoped to the cost disclosure, which is no longer a named region).
  - New: "step 5 opens with the whole video and its heading in view", at 1440×900 and 390×844.

### D223 — E2E shard 2 back inside its budget: the production specs move to shard 1, and the warmup visits each route once
**Date:** 9 October 2026 · **Status:** accepted (agent)

CI's E2E shard 2/2 was killed at its 300-second budget three times on 9 October: on `main` after #70 (57 tests), and on both
runs of this branch (58 tests, 52 done at the kill). Nothing failed: the traces show the tests still running at the kill
(`sync.spec.ts`'s, each time) making steady progress. On the same day the shard passed in 3.7 minutes, so it was within a slow
runner of its budget. D213's 30 seconds of headroom had gone. Shard 1 had been taking 3.3–4.1 minutes.

Measured locally from cold, two workers per shard as on CI:
- **The shards were uneven.** `--shard` splits the tests by count, in project order. `offline` was listed last, so all 36
  production specs fell in shard 2, beside the last 21 hermetic tests. That was 272 s of work against shard 1's 195 s.
  Those 21 tests also cost shard 2 the whole warmup.
- **The warmup visited every route twice**, once per locale, though `[locale]` is a segment of one route, so the French pass
  compiled nothing new. It was 44–54 s of a serial step that both shards run.

The fixes, without raising the budget (implementation-plan.md 6.5):
- **`offline` is listed before `chromium`** in `playwright.config.ts`. Shard 1 is now the production specs and the first 22
  hermetic tests, and its warmup runs beside the production specs. Shard 2 is hermetic only.
- **The warmup visits each route in English, and `/fr` once** for French messages: 29–32 s, cold.

| Cold, local | Shard 1 | Shard 2 | Work, both |
| --- | --- | --- | --- |
| Before | 128 s (59 tests) | 148 s (58) | 467 s |
| After | 132 s (59) | 116 s (58) | 430 s |

The slowest shard is 11% shorter locally. CI runs about twice the local time, so shard 2's ~290 s should come back to about
260 s. **Revisit when** a shard is killed at its budget again. The next lever is a third shard, which renames the required
checks (D178, `docs/deploy.md`), so that is the human's call.

### D224 — onboarding asks for the key before the placement, ends on the placement, says R5 on its first step, and Today no longer stops a new user at a card
**Date:** 10 October 2026 · **Status:** accepted (human's request and answer; agent's build). Amends PRD §8.1's order, D146's
"`/start`, above the wizard, so every step shows it", and D220's "a key passed over on the diagnostic path lands on Today"

The human, landing on `/en/home` for the first time: the card "Set up your practice first / Two quick questions and you're
ready" promised two questions and led to five, and its only action was "Set up", so it was a click with nothing to decide.
The non-affiliation statement sat above every step, though the footer already carries it on every page. And the order should
be the daily goal, then the key, then "Where are you now?" last, where "Take the diagnostic" goes straight into it and
skipping goes to Today.

- **The order** (`features/onboarding/onboarding.ts`): direction, target, goal, key, placement. Five steps, or four when a key
  is already held, as before. `stepBefore` now walks the steps shown (`stepsFor(hasKey)`), so with a key held Back from the
  placement reaches the goal, never a hidden key step.
- **"Skip for now" as a button is gone**, with `canSkipFrom` and `skipTarget`. In the new order it could only skip from the
  goal to the key step, the same as Continue. Every step after the target still has its own way past it: the goal has a
  default, the key step has "Not now", and the placement has "Skip for now" as a choice. PRD §8.1's "skippable after step 2"
  holds.
- **Where it lands** is the placement's choice alone (`destinationFor(choices)`): the diagnostic when chosen, key or not,
  otherwise Today. The agent asked; the human chose "straight into the diagnostic" over Today or a disabled option. D220
  sent a declined key to Today because the gate would have followed the key step at once; now the placement stands between
  them, and the user has chosen the diagnostic after declining. The diagnostic's own gate asks for the key and comes back
  (ADR 25, `returnAfterKey`). The last step's button says where it goes (`finishLabel`): "Start the diagnostic" when the
  diagnostic is chosen, "Start practising" otherwise (`start.finishDiagnostic`, new; found by the branch's own review).
- **The key step's way on** (`keyStepFinish(held)`) leads to the placement either way: "Continue" with a key, "Not now,
  continue without a key" without. `start.keyFinishDiagnostic` and `start.keySkipDiagnostic` are deleted with their only use.
  A key saved there survives Back from the placement, since `useKeyEntry` reads the held key as it mounts.
- **The statement** is rendered by the wizard at the head of the first step only (`components/NonAffiliation.tsx`, still the
  one component), and no longer by `/start`'s page. R5 is unchanged: it is in every footer and at the head of onboarding.
- **Today, and a drill, send a user with no study profile to `/start`** (`HomeDashboard` and `PracticeSession`'s
  `NeedsSetup`, `router.replace`, so Back from the first step does not bounce back), showing "Loading…" meanwhile. The
  set-up card is gone from both, and with it `today.setUpTitle`, `setUpBody` ("Two quick questions and you're ready", which
  promised two questions before five) and `setUpAction`. The drill's card was first left in place, and the human said it
  had to go too.
- The landing page's "Try a free mock exam" is unchanged (the human: its mention was in error).
- **Not an ADR.** Product copy and flow, recorded here and in the PRD as D220 was.

### D225 — the tests whose premise D224 changed, said here rather than edited quietly
**Date:** 10 October 2026 · **Status:** accepted (agent). Follows D224, as D221 followed D220

- `onboarding.test.ts`: the order, the key step before the placement, Back with a key held, and `destinationFor` without
  `hasKey`, and the new `finishLabel`. The skip cases (`canSkipFrom`, `skipTarget`) are deleted with the functions, and "lands on today … when the
  diagnostic was chosen and the key passed over" is replaced by D224's rule.
- `key-step.test.ts`: `keyStepFinish` has two outcomes, not four.
- `e2e/helpers.ts`'s `onboard()` takes the new order and **lands on `/diagnostic` whenever the diagnostic is chosen**.
- `journeys.spec.ts`:
  - "today asks a first-time user to set up" became "today sends a first-time user straight to onboarding", with Back
    leaving onboarding rather than returning to Today;
  - journey 6's check after "Delete everything" is the redirect;
  - journey 1 no longer clicks Today's "Take the diagnostic": onboarding lands on the gate itself;
  - new: a drill opened before onboarding lands on `/start`.
- `generate.spec.ts`'s "the writing drill links to fresh items…" opened `/en/practice/writing` on a fresh browser, a user
  with no profile, which the drill now sends to onboarding. It raced the redirect and failed on CI's E2E 1/2. It now onboards
  first and reaches the writing drill by Today's Start, then follows the same link and checks the same no-key card.
- `content.spec.ts`'s "onboarding carries the statement on every step, not only the first (R5)" pinned D146's placement. It now
  checks the statement on step 1, its absence from `main` on step 2, and the footer's statement there.
- `key.spec.ts`: the key step is "Step 4 of 5", passing it over reaches the placement, a saved key survives Back, the
  four-step case reaches the wizard by Today's redirect and goes back from the placement to the goal, and the diagnostic path
  with no key lands on the gate directly. D222's viewport checks are unchanged.

### D226 — the landing page's sample question is in the language being practised, not the page's
**Date:** 11 October 2026 · **Status:** accepted (human request)

- The sample question showed the page's language: an English passage on `/en`, French on `/fr`. A visitor practises the
  other language, so the sample now shows it: **French on `/en`, English on `/fr`**. The tag, the hint and the verdict stay
  in the page's language.
- **No new machinery.** `landing.sample`'s `passage`, `question` and `options` swapped between `en.json` and `fr.json`, so
  each string still lives once. `sampleLanguage(locale)` in `features/landing/landing.ts` names the other language.
  `SampleQuestion` puts `lang` on the passage, the question and each option (R9), and the verdict's quoted word ("car",
  « because ») is a `<w>` span carrying it, the pattern `OralReport` uses.
- **The test whose premise changed:** `e2e/smoke.spec.ts`'s "the landing page stays clean … sample question answered"
  clicked English options on `/en` and expected "because". It now clicks the French options and expects "car", and also
  checks the passage's `lang="fr"`. The axe checks are unchanged.
- **Not an ADR.** Product copy, recorded here.

### D227 — the nightly lane was red for a week on a refused smoke key, and the smoke now names that fault
**Date:** 11 October 2026 · **Status:** accepted (human request)

- **What failed.** `nightly.yml` failed every night from 4 to 10 October. The property and E2E job passed each time;
  `live-smoke` failed with `InvalidApiKeyError`, a 401 on its first call, `GET /models`. The last green run was 3 October
  on `d481ad8`.
- **Not the code.** The commits between that run and the first red one (`c7dd1a2`, `487ca8a`, `0a83818`) touch only the
  realtime route's `RouteThrottledError`, nothing on the key's path. `OPENAI_SMOKE_KEY` was last set on 29 September and
  worked for three nights, so OpenAI had stopped accepting the key itself. A scan of the public repository's history found
  no real key, only the tests' `sk-palier-…` sentinels, so it was not a leak that OpenAI's scanner revoked.
- **The fix is the secret's**, which only the human can replace (docs/deploy.md, live smoke step 2).
- **What changed in code.** For a week, issue #65 said only "a live OpenAI call failed, or a configured model is no
  longer listed". `scripts/live-smoke.mjs` now adds one line for the two faults that belong to the key, matched by the
  error's name (D158):
  - `InvalidApiKeyError`: replace the secret;
  - `RateLimitError`: check the key's monthly limit, deploy.md's misleading-429 case.

  Any other failure prints only what it printed before. The issue's text now points at the run summary, where that line
  appears. `oral-stability.mjs` is run by hand, never by a lane, so it is unchanged.
- **Not an ADR.** Operations, recorded here.

### D228 — the hermetic PGlite reads its migrations before it starts, so a failed build leaves no instance booting
**Date:** 11 October 2026 · **Status:** accepted

- **What failed.** PR #75's medium integration lane timed out once in
  `databaseAnswers, hermetic (D140) > answers false when the database cannot be built` (5,224 ms, against Vitest's 5 s
  default). The other run of the same commit passed at 3,071 ms. It is the only such failure in the last 40 verify runs,
  so the test was running close to its limit, and #75 did not cause it.
- **Why it was slow.** `pgliteDatabase` constructed `PGlite` and then called `migrate`. PGlite's WASM boot starts in its
  constructor, and drizzle finds a missing `meta/_journal.json` only inside `migrate`. So the failing build left an
  orphaned instance booting, never closed, beside the retry's real build, on a runner already busy with the simulator.
- **The fix is in `db.ts`, not the test's timeout.** `vitest.config.mts` keeps the 5 s default outside nightly because a
  slow test there is a bug (D156). `pgliteDatabase` now calls drizzle's public `readMigrationFiles` first, so a missing
  folder rejects before anything boots. The files are read twice, which costs nothing next to a WASM boot.
- **Test.** `db.test.ts` stubs `@electric-sql/pglite` and holds that a missing folder rejects with no PGlite constructed.
  It fails without the fix. Locally the integration test went from 0.8–1.6 s to 0.7 s.

### D229 — the spoken-practice picker is laid out as two steps, with the key card first and the sessions as a grid
**Date:** 11 October 2026 · **Status:** accepted (human request)

- **What was wrong.** `/practice/oral`'s picker opened on a three-sentence intro that repeated the two mode hints. Then
  came an unstyled "Choose a mode", an info `Callout` as loud as a warning between the two choices, and the no-key card
  in the middle of the page, though it is what stops a user without a key. Last came five full-width session cards in
  one column, indented and bulleted because `.app-prompts` never reset `.app-list`'s list style.
- **What it is now** (top to bottom):
  - a one-sentence intro, with `NoKeyCard` directly under it, still inline (PRD §14, D108);
  - "Choose a mode" as a step heading, with the two modes side by side from about 640px so their costs compare at a
    glance. Where the chosen mode sends what stays visible (R12, D186), as a quiet line under the choice rather than a
    `Callout`;
  - "Choose a session" as a grid of cards, two across at the app's 760px column and one on a phone. Each card's length,
    estimate and Choose share its foot, so the buttons line up. An odd last card, the full simulation, spans the row.
    That is CSS (`:last-child:nth-child(odd)`), not a count in code (ADR 9);
  - the earlier sessions, unchanged.
- **Maintainability.** The picker is `components/oral/OralPicker.tsx`, handed what it needs as `OralStudio` is, with
  `History` moved there from `OralPractice.tsx`, which loses about 110 lines. There is no new decision logic: it reuses
  `sessionEstimate`, `studioModeNote`, `estimateText` and `historyTag`, all tested already.
- **`.app-prompts` now resets its list style**, which also takes the same stray bullets off the writing workshop's
  prompt list.
- **Copy.** `oral.intro` is shorter in both languages, and fr `oral.chooseTitle` reads "Choisissez une séance", parallel
  to "Choisissez un mode". Both join the French read at Gate O.
- **Tests.** No test changed: every role, name and string the e2e specs pin is kept. Those are the radios' names, each
  session's `h3` inside its `listitem` with its Choose button, "Choose a session", the exact meta line, the no-key card's
  heading and the studio note's text.
- **Not an ADR.** Layout and copy, recorded here.

### D230 — the landing page shows the owner's explainer video, below the fold, before "Built for exam conditions."
**Date:** 11 October 2026 · **Status:** accepted (human's request and answers; agent's build)

The human recorded an explainer of Palier in each language (`docs/explainer.mp4`, then `docs/eplainer-fr.mp4`) and asked
for it on the landing page, below the fold, just before "Built for exam conditions.".

- **Where.** A section of its own, `Explainer` in `components/landing/LandingSections.tsx`, between the strip and the
  features: the hero fills the first screen, so it is below the fold. An eyebrow ("Watch") and a heading ("Palier in a
  minute."), then the video. The section has no bottom padding, since the features bring their own.
- **In the page's language.** `/en` plays `public/media/palier-explainer-en.mp4` (61 s) and `/fr` plays
  `palier-explainer-fr.mp4` (76 s), both 1280×720 H.264 with AAC sound, 14.6 and 17.6 MB. Which one is
  `features/landing/landing.ts`'s `explainerLanguage`, tested, beside `sampleLanguage`, which goes the other way: the
  sample question is in the language being practised, but the video explains Palier, so it is in the language being read.
- **The files** were remuxed losslessly with `moov` first, so playback starts before the whole file arrives (the human
  chose this over a smaller re-encode). As with D220, each is committed once, and not also under `docs/`. `/media/` is
  already left to the network by the service worker, and the CSP's `media-src 'self'` already allows it, so neither
  changed.
- **The player** is D220's: `controls`, `preload="none"`, `playsInline`, never autoplaying, explicit width and height so
  nothing moves when the poster loads. Each poster is its video's closing title card (logo and tagline), a WebP of 24 and
  29 KB, bundled as an import. **The French card has a flaw in the recording itself**: a decorative circle covers the end
  of « votre » for as long as that line is on screen, so no frame of it is clean. The poster shows it too, and is the
  human's to replace with the recording.
- **No note under it.** With a recording in each language there is nothing to warn of; the human confirmed each video is
  final as it is, sound and all.
- **Not `ExplainerVideo`.** That component is the key video's, bound to the `key` messages and the OpenAI file. Two callers
  did not earn a prop-driven version, so the landing section repeats its few attributes.
- **Keys.** Added: `landing.video.eyebrow`, `title`, `label` and `fallback`. The French is the agent's, and goes to Gate
  O's French read.
- **Tests.** `landing.test.ts` gains `explainerLanguage`'s two cases. `smoke.spec.ts` gains one: the section is between
  the strip and "Built for exam conditions.", the video loads nothing until asked and does not autoplay, each page serves
  its own language's file, and the French page is axe-clean.
- **Not an ADR.** Landing-page content, recorded here.

### D231 — the landing page's headline reads "Practice for your SLE."
**Date:** 11 October 2026 · **Status:** accepted (human's decision)

`landing.hero.title` was "Practise for your SLE.". The agent pointed out that the Language Portal's Writing Tips Plus gives
*practise* as the Canadian verb, which the headline uses. The human chose "Practice" all the same. **Do not change it
back**: it is the human's call, made knowing the guide. The rest of the English copy keeps the guide's split, and the
design files under `docs/Palier landing page/` keep their original text.

### D232 — on a narrow screen, the landing page's header folds behind a menu button at the top right
**Date:** 12 October 2026 · **Status:** accepted (human's request; agent's build). Amends D201's header below 1000px

On a phone the landing header wrapped to three rows: the brand, the section pills ("Questions" alone on a second line),
then the language and "Start free". It took a third of the hero. The human asked for a hamburger menu at the top right.

- **Below 1000px the header is one row: the brand, and a menu button at the top right.** The button opens a panel on the
  closing call's deep ink (`--landing-accent-900`, so its white text is the pair the contrast test already holds) with the
  four sections stacked, then the language and "Start free" side by side. At 1000px and up the button is hidden and the
  panel is `display: contents`, so the header is D201's exactly. 1000px, not lower: the French header wraps to two rows up
  to about 960px, and below the breakpoint it can no longer wrap, so the hero's top padding is one value (120px) at every
  width.
- **"Start free" goes into the panel, not beside the button.** The header's focus order is brand, then the sections (D201's
  smoke test). Beside the button, "Start free" would come after the sections in the document but before the button on
  screen. The hero's own "Try a free mock exam" is directly below, so the way in is never hidden.
- **A disclosure, not an ARIA menu.** `LandingMenu.tsx` is a client island around the server-rendered nav and actions: a
  button with `aria-expanded` and `aria-controls`, labelled `landing.menu`. Escape closes it and returns focus to the
  button; following a link inside closes it, since the sections are in-page anchors; and focus or a tap landing outside it
  closes it, so Tab past its last link never leaves it over the page. What it decides is `menuOpenAfter`
  in `features/landing/landing.ts`. One `nav` landmark at every width, no duplicated links.
- **Tests.** `landing.test.ts` gains `menuOpenAfter`'s four cases. `smoke.spec.ts` gains one at 390×844: closed, the
  sections and "Start free" are hidden; open, all of them show and the page is axe-clean; Escape closes it onto the button;
  Tab out of it, or a tap on the hero below it, closes it; following "How it works" lands on `#how` with the menu closed. D201's desktop focus-order test is unchanged and passes.
- **Not an ADR.** Landing-page layout, recorded here. The French read at Gate O gains `landing.menu` ("Menu").

### D233 — a page's preloads are in its `<head>`, never a `Link` header
**Date:** 12 October 2026 · **Status:** accepted (human's request; agent's diagnosis and build)

The human reported two console warnings on the deployed landing page: the serif (D161) and the hero photograph (D201) were
"preloaded using link preload but not used within a few seconds from the window's load event".

- **The cause is React's `Link` header and the service worker together.** By default Next has React send a page's
  preloads as an HTTP `Link` header. The serif is preloaded *only* there; the hero is in the header and in the HTML. On a
  page the worker controls, Chrome does not match a `Link`-header preload the worker answers. It fetches the font a
  second time when the stylesheet asks for it, and warns. Measured on the deployed site and a local production build: with
  the worker blocked, no warning on any load; with it in control, the warning on almost every load, and two font requests
  for one page where the trace showed them. The hero's warning did not reproduce in either browser tested. It is the same
  mechanism, and the same fix covers it.
- **`reactMaxHeadersLength: 1`** in `next.config.ts` turns the header off, so React writes the same preloads into the
  `<head>` instead. One, not zero: no preload fits in one character, and zero makes React log an error on every render,
  which CI's server log showed on every request. On the local production build each file is then requested once, by the
  parser, on every load, controlled or not, and no warning appears. Lighthouse on `/en` and `/fr` (desktop, three runs
  each, measured with `0`, whose document is the same) scored 100 for performance and accessibility, with an LCP near
  0.79 s and a CLS of 0. The header could only help where the browser acted on it before the `<head>` arrived; whether
  Vercel turns it into 103 Early Hints was not checked.
- **Not the alternatives.** Dropping the font's preload would bring back the `/fr` rewrap that cost its Lighthouse budget
  (D201). Leaving fonts and images to the network would undo the offline serif (D161).
- **Tests.** `offline.spec.ts` gains one in the production lane, about 0.15 s: the page's response has no `rel=preload`
  in a `Link` header, and its `<head>` has the font's preload. It checks the cause, not the warning. A version that waited
  for the worker and read Chrome's log over CDP took 6.8 s, and pushed E2E shard 1, already at 4.6 of its 5 minutes on
  `main`, over its budget. The warning half was measured by hand instead: without the setting, three runs in three warned;
  with it, none over four controlled loads. The setting is read when `next start` starts, so trying it needs no rebuild.
- **Not an ADR.** A build setting with its reason, recorded here.

### D234 — spoken practice is spoken only: no typed answers, in either mode
**Date:** 13 October 2026 · **Status:** accepted (human's decision; it overrides part of D119, D121 and D185, and amends
PRD §14 and `implementation-plan.md` Phase 5 in place)

The human found it strange that spoken practice offered typing: typing is for written expression. Asked how far to go,
they chose to remove it entirely, including the fallback PRD §14 asked for when the microphone is refused.

- **The microphone step offers no typing at any point.** D119's "Answer by typing instead" at every step, and D185's
  "Practise by typing instead" for studio mode, are gone. The way on appears only once the check has opened the
  microphone: "Continue", or "Continue anyway" after a quiet check. `continueWith` and `start` do nothing without an open
  stream.
- **The check also proves the browser can record** (`canRecord` in `lib/oral/recorder.ts`). It makes a recorder in a
  clip's format and never starts it. A browser that opens the microphone but has no `MediaRecorder` used to fall back to
  typing. With no typing, it would have passed the check, paid for a first question, then failed at every Record. It now
  stops at the check as `unsupported`. The fake recorder in the E2E specs numbers recorders in the order they are made,
  so the key-leak specs' recorder numbers move up by one for this unstarted recorder: the check's is #1 and the
  session's #2.
- **Without a microphone** (refused, missing, unsupported or failing), the screen keeps its recovery steps, and one callout
  for both modes links the writing workshop and reading practice. These are PRD §11's "full-value alternatives" for an
  audio task. The copy no longer says "or answer by typing".
- **A recorder that fails mid-session** no longer turns the session to typing (D121). An answer's recorder that cannot
  start says so (`oral.recordFailed`), and Record tries again. The candidate can also end the session. A session whose
  whole-session recorder cannot be made still runs: each answer is its own clip, and only the local recording is lost.
- **What stays.** `OralTurn.input: "typed"` (domain), `CandidateAnswer`'s `typed` kind (the `AnswerSource` port), fluency's
  voice-only count (engine), and the report prompt's "(typed)" marker (adapters) all stay. So do the report's `typed` and
  `fluencyTyped` keys. Sessions already on devices hold typed turns, and their reports must still read them. Removing the
  kind would be a domain change for no user benefit.
- **Tests.** The reducer, controller and recorder tests name the new behaviour. The E2E journeys that typed now answer on
  `installFakeAudio`'s microphone: the refused call, the report still being made, the French pass and both
  production-build specs. The two refused-microphone tests, practice and studio, assert the links and that no typing
  button exists.

### D235 — the landing page's headline reads "Your C is closer than you think.", and cost is said one way
**Date:** 16 October 2026 · **Status:** accepted (human's request; agent's build and French). Supersedes D231's headline

The landing page called Palier "a free study tool", "totally free" and "free to use", while three of its features cost
money. The human asked for a new headline, for the hero's second link to go, and for one pricing message used everywhere.

- **The headline** is "Your C is closer than you think." and in French « Votre C est plus proche que vous ne le pensez. ».
  This replaces D231's "Practice for your SLE.", by the same person's decision.
- **The hero has one way in.** "Try a sample question" (`landing.hero.trySample`) and its `.landing-hero__secondary` rules
  are gone. The sample question keeps its `id="try"`, further down the page.
- **The title is 14ch wide, not D201's 11ch.** At 11ch the English took three lines and the French four, which pushed the
  hero's button below the fold on a desktop. At 14ch the English takes two lines and the French three. Both take three or
  four on a phone, as before. In French at 1440×900 the button still sits about 20px below the fold; the header's
  « Commencer » is visible above it. 14ch puts the French "plus" over the photograph's flag, which the hero's scrim already
  makes readable.
- **The message:** "Free to practise. The AI features cost a few cents each, billed by OpenAI to you, with no subscription
  to us." In French: « Gratuit pour vous exercer. Les fonctions IA coûtent quelques cents chacune, que vous facture
  directement OpenAI, sans abonnement chez nous. »
  - **It is used in these landing keys:** `hero.lede`, `features.ai.body`, `how.body`, `faq.cost`, `close.body` and
    `footer.tagline`.
  - **And in two keys off the landing page that made the same claim:** `metadata.description` and `about.what`.
  - **The FAQ question** is now "What does it cost?", since the cost is the AI features', not the key's.
- **Spoken practice is billed by the minute** (about US$0.05 a minute in `pricing.json`), so a whole session costs more than
  "a few cents". The FAQ says "a few cents a minute" for it, so the short line stays honest.
- **Left as they were, since each is already accurate:**
  - "Start free";
  - the onboarding key step's cost copy (`start.keyWhyFree`, `keyCost*`), which already says no subscription;
  - the milestone share texts ("a free, unofficial practice app").
- **Tests.** `smoke.spec.ts` gains one test. On `/en` and `/fr`, it checks three things:
  - the `h1` is the new headline;
  - the hero's only link is the call to action;
  - the FAQ's cost answer says "a few cents each".
  No existing test pinned the changed copy.
- **Not an ADR.** Landing-page copy and layout, recorded here. The French is the agent's, and goes to Gate O's French read.

### D236 — four more dev-only advisories are overridden, D155's way; `sprintf-js` is removed rather than dismissed
**Date:** 16 October 2026 · **Status:** accepted. Extends D155

- **Four Dependabot alerts were open**, all transitive and dev-only. Each parent is on its latest release and pins or caps
  the vulnerable version, so there was nothing for Dependabot to propose.

  | Alert | Package | Advisory | Path | Parent's constraint |
  | --- | --- | --- | --- | --- |
  | #14, #15 | `handlebars` 4.7.9 | GHSA-8r5x-fm3f-whwj (critical), GHSA-xw65-4hp5-5hc7 | `eslint-plugin-boundaries` 7.2.0 and its `@boundaries/elements` 3.1.1 | both pin exactly `4.7.9` |
  | #10 | `basic-ftp` 5.3.1 | GHSA-c475-qrg2-pj4r (high) | `@lhci/cli` → … → `pac-proxy-agent` → `get-uri` 6.0.5 | `get-uri`, even its latest 8.0.1, asks for `^5.3.1` |
  | #12 | `sprintf-js` 1.0.3 | GHSA-hp3w-g68c-fv3c | `@lhci/utils` → `js-yaml` 3.15.2 → `argparse` 1.0.10 | no patched release exists |

- **Four scoped `overrides` in `pnpm-workspace.yaml`**, commented with their GHSAs:
  - `eslint-plugin-boundaries>handlebars` and `@boundaries/elements>handlebars` go to `4.7.10`, a patch release.
  - `get-uri>basic-ftp` goes to `^6.2.3`. 6.0.0's one breaking change turns off separate transfer hosts by default (an
    FTP-bounce guard). `get-uri` calls only `new Client()`, `access`, `lastMod`, `list`, `downloadTo` and `close`, so it is
    not affected.
  - `js-yaml@3>argparse` goes to `^2.0.1`. argparse 2 has no dependencies, so `sprintf-js` leaves the tree. js-yaml 3
    requires argparse only in `bin/js-yaml.js`, its command line, which nothing runs. `@lhci/utils` calls the library's
    `safeLoad`, which does not need argparse.
- **Why not dismiss `sprintf-js` as D155 did with `extract-zip`?** Here an override can remove the package altogether,
  without touching any code that runs. `extract-zip` had no such way out.
- **No package is added.** The lockfile loses `argparse` 1.0.10 and `sprintf-js` 1.0.3. `handlebars` and `basic-ftp`
  change versions. Nothing else moves.
- **Smoke checks:**
  - `lhci --version` answers 0.15.1.
  - From `@lhci/utils`'s directory, `require('js-yaml').safeLoad` parses a `ci.collect` block.
  - From `get-uri`'s directory, `basic-ftp` 6.2.3 loads, and its `Client` has every method `get-uri` calls.
  - `pnpm lint` runs `eslint-plugin-boundaries` over every file.
- **`pnpm audit` over the whole tree now shows three entries, none of them these four:**
  - the two `extract-zip` entries D155 dismissed;
  - `braces` 3.0.3, GHSA-vfj7-8cjw-p6xm, under `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` →
    `micromatch`. It has no patched release, and GitHub auto-dismissed its Dependabot alert (#11) as a dev-only,
    low-impact path. **Revisit when** a fix ships.

  CI's `--prod --audit-level=high` gate is unchanged: it shows only D135's two ignored `content` entries.

### D237 — one press spends: the estimate stands beside the button, and a slow wait shows it is alive
**Date:** 17 October 2026 · **Status:** accepted (human's request; agent's build and French). Amends D108's pre-flight
and every screen that copied it (D111, D126, D185)

The human asked for two things on the writing workshop, then on every screen that spends:
- the estimate should be worked out on its own and shown beside "Get feedback", so pressing it is the agreement, with no
  second "Before you send" step;
- the wait ("This can take up to a minute") gave no sign it was still going, so a user could leave thinking it was broken.

- **No ADR records the two-step pre-flight**; D108 made it, so this entry amends D108 and its copies.
- **One press spends.** Each screen works out its `preflightSpend` as it opens, and again once each request settles,
  since a call moves the month's spend against the cap. `components/key/SpendOffer.tsx` shows it beside the button: the
  estimate, or that there is none, the near or over reminder from `preflightNotice` (never a block), and where the words
  go. The button names that block in `aria-describedby`, so a screen reader hears the cost on the button, and stays
  disabled until the figure is on screen, so nobody spends without having seen it.
  - **The writing workshop:** "Get feedback" and "Try again" send. A second press before the button disables is
    ignored, since a second press would save a second submission, and only one submission's request is joined.
  - **Fresh sets:** "Generate a fresh set" generates. The in-flight join, keyed `"set"`, already stops a double press
    paying twice.
  - **The oral report:** "Get the report" asks. Its offer read `featureCosts` and had no cap reminder; it now has the
    same block.
  - **The diagnostic's written result** had no second step. Its offer gains the cap reminder the same way. The launcher
    already showed its estimate and reminder inline, so it is unchanged.
  - **Spoken practice and studio mode** start from the microphone card: Choose, "Check my microphone", then "Start the
    session" ("Start anyway" when the microphone was quiet). That is two taps fewer. The session is priced as soon as the
    microphone is open (the controller's `continueWith` became `price`), never before, since every answer is spoken
    (D234). **The start's handler stays synchronous**, so a user's own endpoint still opens its popup inside the tap
    (D192): the pricing is done before the tap, never in it. `studio-controller.test.ts` and `container-studio.test.ts`
    still pin that, unchanged. The route is still woken on the microphone step (`studioWarmup` now returns `"mic"`
    only).
  - The reducers lose their `confirming` state and their `preflighted`/`cancel` actions. The tests of those steps were
    rewritten to the one-press flow, the behaviour having been removed at the human's request. Their guards against a
    second request mid-call stay.
- **A slow wait you can see.** `@palier/ui` gains `Working`: the message, three dots that bounce, and, when given, the
  time waited (`m:ss`, shown and never announced) with a once-a-minute polite announcement, as `Timer` does (§11).
  - The dots move by `transform` only, on §10.5's three tokens (400ms, delayed 120ms and 200ms), so `motion.test.ts`
    holds. Under reduced motion and in exam mode the global switch stills them, and the ticking time still says the
    wait is alive (§10.5: "no loss of information").
  - `components/key/Waiting.tsx` wraps it for a call on the key, with `features/key/waiting.ts`'s `waitView`: the time
    waited, and past a minute "Still working. OpenAI can be slow at busy times.", since the screens promise "up to a
    minute".
  - **The clock starts when the wait is shown**, not when the request began. A request picked up again after leaving
    the screen (D143) counts from the return. This is simpler than carrying a start time through four reducers, and
    the request's own start is not stored anywhere today.
  - It is on the workshop, fresh sets, the oral report and the diagnostic's written result. Spoken practice's waits
    (the examiner preparing a question, an answer being written down, the end) and studio mode's dialling show the
    dots without a time, because the session's own timer already ticks on that screen.
  - Where a screen keeps its status line mounted throughout, so the wait is heard as it starts (the oral report, D127;
    the diagnostic's live region; studio mode's status), `Working` takes `live={false}` and only shows the message.
- **Copy.** Removed in both languages: `writing.preflightTitle`, `send` and `keepEditing`; `generate.preflightTitle`,
  `send` and `cancel`; `oralReport.preflightTitle`, `send`, `cancel`, `offerCost` and `offerUnpriced`; `oral.preflightTitle`,
  `micContinue` and `micContinueAnyway`. Added: `oral.startAnyway` ("Start anyway", « Commencer quand même ») and
  `common.waitingElapsed`, `waitingMinutes` and `waitingSlow`. The French is the agent's, and goes to Gate O's French
  read.
- **Not moved:** `preflightNotice` and `elapsedText` stay in `features/writing/workshop-view.ts`, where four screens
  already import them. Moving them would only churn imports.
- **Hardened after review**, in the same branch:
  - **One loader.** The four screens load the estimate through `components/key/use-preflight.ts`'s `usePreflight`, not
    four copies of the same effect.
  - **A failed read never disables a button.** Before this change the read ran on a press, which could be repeated.
    Now it runs on mount, so a failed ledger read would have left the button disabled with no word why. It falls back
    to the cost table's estimate with no cap reminder (`features/key/spend-view.ts`'s `fallbackPreflight`), here and in
    the oral controller's `price`.
  - **It is read again when the page is shown**, since another tab may have spent or moved the cap meanwhile.
  - **The workshop's double-press guard** is `lib/latch.ts`, tested. `singleFlight` would not do: it gives a call made
    mid-run one more run, which here means paying twice.
  - **An oral price carries the session and mode it priced**, and the reducer drops one meant for another. Otherwise a
    slow read could put a 5-minute practice price beside a 22-minute studio session chosen after Back.

### D238 — the official domain is palier.study, and its origin is `https://www.palier.study`
**Date:** 18 October 2026 · **Status:** accepted (human). Replaces D96's `palier.dougkeefe.com`

The human said `palier.study` is now the project's official domain.

- **The origin is `www`.** Checked live the same day: `https://palier.study` answers 308 to `https://www.palier.study`,
  and `/api/health` there answers `{"build":"0571cf1","bank":4,"database":"ok"}`. Wherever an exact origin is needed,
  the repository writes the `www` form: `selfhost/`'s `ALLOWED_ORIGIN`, which the endpoint compares exactly, and
  `PALIER_SITE_URL`. Prose says `palier.study`. If the human later makes the apex primary, those strings flip with it.
- **No code changed.** D199's `siteUrlFrom` already reads the origin from the environment, and D96 held: nothing in
  the app names its own origin. `build-info.test.ts`'s `PALIER_SITE_URL` example now reads the real origin. It is the
  same assertion with a different value.
- **The live site still advertises the old domain.** On `www.palier.study` and on `palier-virid.vercel.app`, the
  canonical and `hreflang` links, `robots.txt`'s `Sitemap:` and therefore the sitemap all name
  `https://palier.dougkeefe.com`. So the Production `PALIER_SITE_URL` (or the project's production domain) still points
  there. It is a Vercel setting, not the repository's: set `PALIER_SITE_URL=https://www.palier.study` and redeploy, since
  `robots.txt` and the sitemap are built once (`docs/deploy.md`). Standing human item.
- **The old addresses still answer 200**, without redirecting. Whether they should redirect is the human's call. A
  redirect cannot move what a browser holds: the bank cache, progress, the key and the sync id all live in the old
  origin's storage. A user who moves can carry their progress by pairing the new browser from the old one (sync is
  one backend, so a pair code made on either origin works on the other) or by export and import (R11). The key is
  pasted again.
- **Updated:** the README, `docs/deploy.md`'s smoke checks and `PALIER_SITE_URL` row, `docs/realtime-checklist.md`,
  `selfhost/` (README and both files' header comments, which sit outside the shared-code markers),
  `product-requirements.md` §10.1 (an amendment beside D96's), and this file's status row, Phase 0 checkbox and *Next,
  decided*. **Not updated, as history:** the session log, earlier deviations, `implementation-plan.md`'s Gate C and
  Slice 5 records, and the landing-page design prototypes in `docs/Palier landing page/`.

### D239 — the service worker fetches each URL once per install, which brings E2E shard 1 back inside its budget
**Date:** 18 October 2026 · **Status:** accepted (agent; the human asked for the failing CI to be fixed)

CI's E2E shard 1/2 was killed at its 300-second budget on `main` after #85, and on a re-run of #86. Nothing failed.
Shard 1 passed in 284 s on #86's other run. D223's revisit names a third shard as the next lever, which is the human's
call because it renames the required checks. This entry found a lever before that, inside the product.

- **The install fetched the same files over and over.** `precache` walked the 64 pages (32 routes × 2 locales) one at a
  time and stored every `/_next/static/` asset each page named. Nothing was de-duplicated across pages, so each shared
  chunk was fetched about 64 times, in series. #86's trace shows the same four chunks requested every 200 ms for 20 s.
  `waitForOfflineReady` took 13 s there.
  - Every production spec opens a fresh context, so every one of them paid for this install. Even a spec that never
    waits for the worker had the install running behind it.
  - A real user's first visit paid for it too, though the browser's HTTP cache answered most of the repeats.
- **The fix, in `src/sw/worker.ts`:**
  - an install claims each URL once (`storeOnce` over a `Set`), so a page, a chunk, a stylesheet and a font are each
    fetched once;
  - the pages, a page's assets, a stylesheet's fonts and a manifest's files run `PRECACHE_CONCURRENCY` (6) at a time
    through `inParallel`.

  What is cached is unchanged: `offline.spec.ts` still opens every shard and an unvisited route with the network off.
- **Measured.** One install, cold, on the production build: 1,303 requests in 3.0–3.3 s became 196 in 0.67–0.88 s. Shard 1
  locally at CI's two workers, the same build, with only `public/sw.js` swapped: 141 s became 109 s, 61 passed both
  times. CI has run at about twice local time, so shard 1 should be about 220 s of its 300.
- **Tests:** `inParallel` holds to its limit and runs every item once, and an install fetches a shared asset, a
  stylesheet and a font several stylesheets load once each. That test fails on the old worker: 4 fetches, not 1.
- **Not changed:** the budget, the shard count and the required checks.
- **Shard 2 is not helped.** It is hermetic, on `next dev`, where no worker registers, and it was at 263 s of 300 on the
  same run.
- **Revisit when** either shard is killed at its budget again. The next lever is still D223's third shard, the human's
  call.
- **#86's first failure was a different one, and is still unexplained.** On `/en/exam`, four chunks, Turbopack's runtime
  among them, were `net::ERR_ABORTED` mid-load. The page never hydrated, and `key-leak-production.spec.ts` timed out on
  "Loading…". It happened while this install's traffic was running, which may be related. It is not shown to be. It
  has not been seen in the 40 runs before it. If it recurs, the trace is the first thing to read.

### D240 — the landing footer's statement and photographs' credit share one row, above the wordmark
**Date:** 18 October 2026 · **Status:** accepted (human's request; agent's layout). Amends D201's footer

The human found the footer's small print misplaced and liked the wordmark as it was. The statement ran the full 1360px
as one line of about two hundred characters, alone above the wordmark, and the credit sat under the wordmark, against
the letters' feet, because the wordmark was moved down 8% and the credit painted over the move.

- **One row, under a hairline** (`.landing-footer__legal`): the statement on the left at most 72ch wide, the credit on
  the right at most 44ch. It is a wrapping flex row, so on a narrow screen the credit falls under the statement with no
  media query. The hairline is the header's mobile panel's, `rgb(255 255 255 / 0.16)`.
- **The wordmark closes the footer** at the same size, weight, spacing and colour. The 8% shift is gone and the footer
  has a small bottom padding instead, so the letters stand whole on its floor, as they looked before.
- Nothing else moves: the same copy, `NonAffiliation` and its class, and no new colour, so the contrast test is as it was.

### D241 — due items are only those the bank still serves, read past the dead entries, and nothing is written
**Date:** 18 October 2026 · **Status:** accepted (the human scheduled D205's named gap; agent's design). Closes D205's "Not built, named" and D206's second finding

`reviewQueue` and `planDailySession` resolved due entries through `byIds` with no status filter, so a user holding v3's
retired synthetic items kept reviewing them (D205).

- **Filtering alone would have been worse.** `ScheduleStore.due(now, limit)` returns the soonest-due entries first. A
  retired item that is never served is never answered, so its entry stays due, at the head of the schedule, for good. One
  read filtered afterwards would let `limit` of them hide every live item behind them: an empty review queue and plan,
  forever, for anyone who held enough of v3. A missing item (one that left the bank) had the same flaw, rarer.
- **`dueLiveItems`** (`packages/app/src/use-cases/due-items.ts`) reads `due`, resolves, keeps what is not `retired` (the
  predicate `oralSessionChoices` uses, D205), and while fewer than `limit` are live and the schedule had more, reads again
  further down by the slots the dead entries took. Each round grows the read, and it stops when a read comes back short,
  so it ends within the schedule's size. Both use cases go through it, and Today's due tile now counts `reviewQueue`, so it
  counts what `/review` shows.
- **Read-only, no port change.** Writing `due: null` over a retired item's entry was the alternative. It would make a read a
  write, sync the retirement to every device as an edit, and lose the box if an item were ever brought back. Left
  scheduled, an entry returns with its item, as "left the bank" already did.
- **What it does not do.** A retired item's entry is still in `ScheduleStore.all()`, so it still syncs and exports, since
  those carry the record, not what can be served.

### D242 — "for this tab only" sits closed behind "Using a shared computer?", and its hint names the cost
**Date:** 19 October 2026 · **Status:** accepted (human's request; agent's copy and layout). Amends D100's key form

The human found the choice too large on onboarding's key step. It was a full `.app-choice` card under the key field, so it
read as a recommended peer of saving the key. Palier's value is in coming back, and a key held for the tab must be pasted
again on every visit.

- **Kept, but folded.** `KeyEntry` wraps the same checkbox in a `<details>` (`.app-key-entry__more`), closed by default,
  whose summary is "Using a shared computer?" (`key.tabOnlyMore`): the case it is for. The summary is quieter than the key
  step's disclosures (soft ink, normal weight, smaller), with the same 44px target. The form is shared, so `/settings/key`
  folds it too; removing a key remounts the form, so the disclosure is closed again.
- **The hint says the consequence.** "…so closing or reloading the tab forgets it, and you will have to paste it again
  each time you come back." Unchecked by default, as before; nothing about storage changes.
- **Two specs gain a step, deliberately.** `key.spec.ts` now asserts the checkbox is hidden until the summary is opened,
  and that the hint names the repeat paste; `key-leak-production.spec.ts` opens the summary before ticking it. No assertion
  was loosened.
- **The saved card's body is a stack**, as `TelemetrySettings`' is, so a check's result no longer sits flush under the
  buttons (the human's screenshot). The heading stays outside it.

### D243 — the landing hero says Palier is unofficial and not affiliated with the Commission
**Date:** 19 October 2026 · **Status:** accepted (human's request; agent's wording). Amends the landing hero's lede (D201)

The hero's first sentence called Palier "a study tool for the Public Service Commission's Second Language Evaluation",
which a first-time reader could take for the Commission's own. It now reads "an unofficial study tool for … , and is not
affiliated with the Commission" ("un outil d'étude non officiel … , et n'est pas affilié à la Commission"). The footer's
full R5 statement (`NonAffiliation`) is unchanged; this is the short form where the eye lands first.

### D244 — the landing page's way-in test asserts the link and where a new visitor lands, not a page they pass through
**Date:** 20 October 2026 · **Status:** accepted (human approved the test change). Corrects a test D224 made racy

`smoke.spec.ts`'s "the landing page's way in leads to the app…" (D201) clicked "Start free" and waited for `/en/home`.
Since D224, Today sends a visitor with no study profile on to `/start` with `router.replace`, and a fresh browser never
has one, so the test passed only when Playwright's poll caught `/en/home` before the redirect. On PR #89 one run of the
same commit (`f08c2bc`) failed on it and the other passed; the log shows `/en`, then `/en/start`, never `/en/home`.

- **The test was wrong, not the app.** It now asserts the link's `href` is `/en/home` (what the landing page promises),
  then that the click lands on `/en/start` (where a new visitor really ends up), with the app's header and footer as
  before. Nothing is loosened: both halves are now deterministic.

### D245 — `/progress` is a dashboard: the three domains at a glance, then the chosen skill in detail
**Date:** 22 October 2026 · **Status:** accepted (human's request; agent's layout and copy). Amends D145's and D198's screen layout, not their print

The human found the page hard to read: a single 760px column of equal white cards, with nothing showing all three domains
together and speaking reduced to one line below the fold. It now uses Today's language (D219).

- **At a glance** is a deep hero (`components/progress/ProgressGlance.tsx`). It holds all the time practised, then one
  card per domain in its fill and glyph. `SKILL_LOOK` moved to `features/skills/skill-look.ts` so Today and Progress cannot
  drift.
  - A scored skill's card leads with its accuracy at the target band, with the interval in words and as a `BandMeter`.
    Short of `MIN_EVIDENCE`, it shows its answers toward the first figure as a `ProgressRail`, never a figure (R10).
  - Speaking's card shows sessions and minutes spoken, on this device only.
  - The decisions are `features/progress/progress-view.ts` (`glanceCards`, `practiceTime`, `tallyScale`), and they
    restate the reports the page already reads. There is no new use case or engine function.
- **The hero says "answers", never "items answered".** `journeys.spec.ts` and `sync.spec.ts` find "N items answered" as
  the single element on the page, so the detail's line stays the only one.
- **In detail** is a heading with the Reading/Writing switch beside it. Below it, from 900px, the trend card sits beside
  the sub-skill card.
- **Each sub-skill keeps its count ("6 of 14 correct") and gains a `TallyBar`.** This is a new `@palier/ui` primitive,
  `aria-hidden`.
  - Its length is the answers given, against the most-practised sub-skill. Its solid part is the right answers and its
    outlined part the rest.
  - Why this is still R10: D66 kept percentages off sub-skills because a handful of answers is not a rate. A bar of the
    share alone would draw 2 of 3 as boldly as 30 of 45. Drawn to the shared scale, a sub-skill met three times is
    visibly short, so the bar shows how much evidence there is as well as how it splits.
  - The colours are `primary` and `rule`, both already held at 3:1 on a card. There is no red or green.
- **The honest panel** is a quiet card beside the export card, with its wording unchanged (D203). The statement follows
  them.
- **Print is unchanged.**
  - The hero is mounted only when not printing, so paper still shows the oral card and nothing is duplicated in the
    document (D148's lesson).
  - The new wrappers are `display: contents` on paper, so D145's two-column grid sees the same cards.
  - The bars are hidden, which keeps the one page.
  - `progress-history-production.spec.ts` gained assertions on the hero, the bars and print. No assertion was loosened.
- The page takes `.app-wide` (1160px), as Today does. Every screen rule sits under `@media screen`.

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
