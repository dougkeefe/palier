# Palier: Progress archive, deviations D100 to D199

Moved verbatim from `docs/progress.md` on 24 October 2026 (D255). Its index there points here. The rules are
`progress.md`'s: never edit a session entry, and mark a deviation resolved in place, updating its index line too.

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

### D190 — the dial: the route woken before the tap, the secret asked for at the tap, the offer made beside it
**Date:** 30 September 2026 · **Status:** accepted (agent, Phase 6, "the dial under 2.5 s"). Carries out *Next, decided*'s
item 2

- **Measured first, on the deployed site.** `studio-live.spec.ts` takes `PALIER_LIVE_BASE_URL` (no local server is
  started then) and `PALIER_LIVE_DIALS_ONLY=1` (three dials, no conversation). On `main` as deployed (`5b47616`), before
  any lever, twelve dials over four runs, 90 s apart, headless Chromium over a home connection, in ms:

  | Run | Dial 1 | Dial 2 | Dial 3 |
  | --- | --- | --- | --- |
  | 1 | 2,977 | 1,718 | 2,375 |
  | 2 | 2,193 | 2,073 | 2,097 |
  | 3 | 2,238 | 1,684 | 2,125 |
  | 4 | 2,114 | 2,266 | 2,078 |

  - **The median is about 2.12 s, so exit criterion 1 is met on the deployed site** and is ticked. Only one dial was
    over: the first, whose secret took 692 ms against about 280–490 ms after it. That is a cold function.
  - D189's local figures were worse because the local server was further from OpenAI than Vercel's region is: its SDP
    answer and its first word each came later.
- **The three levers, built anyway**, because the cold first dial is the one a candidate meets:
  - **The route is woken before the tap.** `warmRealtimeRoute` in the openai adapter posts to the route **with no key,
    no header and no body**, and never rejects. The route answers `401 missing-key` before it reaches OpenAI. The
    container's `warmRealtime` binds it, and the screen calls it on each step before the tap of a session held in
    studio mode (`studioWarmup`): the microphone check, which lasts at least `LEVEL_CHECK_MS`, and the pre-flight. That
    is earlier than *Next, decided* asked (the pre-flight alone), because a candidate can tap Start a moment after the
    pre-flight shows. Practice mode, and a studio choice that fell back to typing, never call the route.
  - **The first secret is asked for at the tap.** `startOralStudioRun` mints it at once, beside the session's setup on
    this device, and the transport's first `secret()` takes it. A reconnect mints a fresh one, as before. A dial aborted
    before it began mints nothing. A session that cannot start leaves the early secret to expire unused, and fails with
    its own error, not the secret's. The key still goes after the tap, never before it, so this needs no Gate O call.
  - **The offer is made beside the secret.** The transport makes the peer and its offer while the secret is minted,
    rather than after. A peer whose secret never comes is hung up, and nothing is dialled.
- **One test changed with the order it pinned.** `realtime-transport.test.ts`'s "fails to open, keeping why, when no
  secret can be minted" asserted that no peer was made. Making the peer before the secret is back is exactly what this
  lever is, so it now asserts that the peer was made and hung up, and that `/realtime/calls` saw nothing. What it
  protects, a failed mint leaving nothing connected, is unchanged.
- **Tests.** The warm-up: no header and no body, and it resolves on a refusal and on a network fault (adapter); the real
  route through the container, which mints nothing (`container-studio.test.ts`); and `studioWarmup`'s steps. The key-leak
  test's step 3f holds that the screen's warm-ups reached the route with no `authorization` at all, and that the key's
  counts are unchanged (`realtimeSecretWarmups()`, a new watch in `leak-guard.ts`). The early mint and the overlap each
  have a test that **failed with its lever removed** (session log). The live spec's "secret" step now times only the
  keyed post, so a warm-up is never read as the mint.
- **Not measured on the deployed site with the levers.** Vercel's previews ask for a login (a `302`), so the branch can
  be measured there only once it is on `main`. *Next, decided* makes that the first step after the merge.

### D191 — the human's live studio session: the examiner answers, and D167's estimate stays
**Date:** 30 September 2026 · **Status:** accepted (human)

- **The session.** On the deployed site, on the human's key, on `cedar`, in studio mode. Reported: "a good test.
  Sometimes there's a pause but you get used to it. I had several follow up questions. Pacing was good for the voice.
  Cost seems accurate."
- **What it settles.**
  - **The examiner answers a real voice.** D189's unended turn did not happen with a person speaking, so it was the
    synthetic microphone, not semantic turn detection. D175's fallback, silence detection, is not needed for it.
  - **The examiner follows the answer** (D176): it asked several follow-up questions.
  - **The pause.** D175's *revisit when* names "`low` makes the examiner feel sluggish". A pause was noticed, and the
    human judged it one "you get used to". That is the evidence appearing in a mild form, and the human accepted it, so
    `realtimeEagerness` stays `low`. Whether the pause was before the first word or after an answer was not said.
- **The cost.** The human judged it accurate and chose to **keep D167's provisional figures** in `pricing.json` rather
  than replace them with a measured minute. Slice 2's *done* asked for the measured figure (principle 8); this is the
  human waiving it, as D130 waived practice mode's. A measured studio minute stays named, not scheduled.

### D192 — the self-hosted escape: a popup opened inside the tap, the key posted only to the ready page's origin, the address in the vault
**Date:** 2 October 2026 · **Status:** accepted (agent, Phase 6 Slice 3). Carries out D165's mechanism; amends
implementation-plan.md §3.3's `KeyVault`. ADR 3 unchanged

- **The mechanism is D165's**, and it worked: Palier opens the user's endpoint in a popup and passes the key by
  `postMessage`. `connect-src` stays `'self' https://api.openai.com` for everyone, and the end-to-end test reads the
  served header and records zero violations through a whole session.
- **Three things D165 did not settle, decided here.**
  1. **The popup must open inside the tap.** A browser opens a popup only from a user's gesture, and the mint waits on
     the vault first. So the container builds `selfHostedRealtimeSecrets` and calls its `open()` synchronously, in the
     call the Start button's handler makes, before anything awaits. The studio controller asks for the endpoint before
     its first `await`, and a test holds that. A run that fails before its mint closes the popup (`cancel()`), and a
     cancelled dial closes it through the signal.
  2. **Where the address lives: the vault, not `SettingsStore`.** Every setting syncs (`collectRecords`), and an address
     such as `palier.jane-doe.workers.dev` can name a person, which architecture.md §12's "nothing that identifies a
     person" forbids on the server. The `KeyVault` port gains `realtimeEndpoint()` and `setRealtimeEndpoint()`, a row in
     Dexie's `keyVault` table (no schema bump: the table is keyed by `id`), and **`clear` forgets it with the key**, so
     the one-tap wipe leaves neither. Removing the key forgets it too, which is said in `selfhost/README.md`. Rejected: a
     sync exclusion list in `records.ts` (a change to the sync core for one key), and a new port (a store for one value).
  3. **The protocol.** Four messages, each with `version: 1`: the page's `ready`, Palier's `mint` (`id`, `key`, `model`,
     `voice`), and the page's `minted` (`value`, `expiresAt`) or `refused` (`error`). Palier posts the key **only after
     `ready` came from the popup it opened, at the endpoint's origin, and only to that origin**, so a popup that
     navigated anywhere else never receives it. The answer is read only from that popup and origin, for the mint's id.
     The page checks Palier's origin and that the sender is its opener. The model and voice are Palier's
     `ai-models.json`'s, sent in the message, so the endpoint needs no configuration but `ALLOWED_ORIGIN`.
- **The endpoint is two one-file deployables in `selfhost/`**, not a workspace: `cloudflare-worker.mjs` and
  `vercel/api/realtime-secret.mjs`, identical between their markers, plus `README.md`. The page mints by posting the key
  to its own origin (D165's "mints the secret on its own origin"), whose server makes ADR 3's one call. Its `POST`
  answers only a same-origin request, reads the key from `Authorization` alone, checks the model and voice as names,
  and answers the route's own codes, so a refusal reads the same in Palier. It has no `console` call and sends no
  `Cross-Origin-Opener-Policy`, which would sever the popup from its opener. The Cloudflare file's default export joins
  the exhaustive exemption list: Cloudflare finds a module Worker by it and offers no named alternative.
- **What it cannot do: a reconnect's popup may be blocked.** A drop mid-session mints again with no gesture. Chromium
  may allow it within its activation window; Safari and Firefox will often block it. Then the transport closes
  `failed` with every turn kept, which exit criterion 2 allows. `selfhost/README.md` says so, and the checklist records
  which happens on each browser (D194).
- **Errors.** `SelfHostedEndpointError { reason: blocked | closed | timeout | refused | malformed }`, named by string as
  every adapter error is (D158). The screen names it `failEndpoint` ("Your own endpoint gave no pass…"), checked by name
  in `oralFailure` before `checkFailure`, so `checkFailure`'s switch gains no case (principle 6).
- **The screen.** The key settings' "one exception" card gains the form (`RealtimeEndpointSettings`). With an endpoint
  set, the picker's callout and the pre-flight name it (`studioModeOwn`, `sendsToStudioOwn`), the route is never woken
  (D190's warm-up is skipped), and `/privacy`'s third-party line says the server does not see the key then either. The
  French is the agent's and goes to Gate O's read.
- **Tests.** The adapter over a simulated popup, with the `RealtimeSecretSource` contract run against it; the container
  through both graphs with `window` stubbed (the popup opened before the call awaits, the route seeing nothing, the
  popup closed when the session cannot start); both deployables through each platform's entry point and the page's
  script in a `vm` sandbox; and `studio-selfhost-production.spec.ts` on the production build. **Proved to bite:** with
  the container ignoring the endpoint, the spec failed (the session never came up). The leak guard learns the endpoint's
  origin (`selfHostedAuthorizations()`), as narrowly as the route's.
- **From the pre-PR review (candid-review, harsh, with a second reviewer on the key path; on this branch):**
  - **The endpoint is read with no fallback.** The oral screen caught a failed read as "no endpoint", which would have
    sent a tab-only key to the route the user had opted out of. A failed read now stops the screen, as any other does.
  - **`cancel()` is final.** A mint still waiting on the vault when its run failed would have opened a second popup with
    no gesture and posted the key for a dead session. Now a cancel abandons a mint in flight and refuses every later one
    without opening anything.
  - **Each popup is a new `_blank` window.** A named window was reused, so a stale popup's end could close a newer
    session's. The test that pinned the name changed with it.
  - **A popup is closed only when seen closed on two polls running**, about 250 ms of grace, because the page closes
    itself right after posting its answer and a popup in another process can read as closed first. The test that
    failed at the first closed poll now expects the second; a new one holds that a late answer still wins.
  - Removing the key re-reads the endpoint form, which had kept showing a forgotten address. The README and the
    checklist name a redirecting address and a `forbidden-origin` refusal. Two tests in `selfhost.test.ts` were named
    for what they did not prove: the markup test now asserts the origin the page embeds, and the 405 case runs on the
    Worker alone, since Vercel answers a method with no export itself. `recordViolations` is one helper in
    `e2e/helpers.ts`, shared with `csp-production.spec.ts`.

### D193 — the route's log exclusion: no per-route switch exists, so nothing Vercel records may carry the key
**Date:** 2 October 2026 · **Status:** accepted (agent, Phase 6 Slice 3). A third reading of ADR 3, beside D165's two; the
deployment check is the human's, at Gate O

- **ADR 3 says "Request logging is disabled for that route."** Vercel offers no switch for one route or function
  (vercel.com/docs/logs/runtime, read 2 October 2026). Its runtime logs record, per request, the method, path, status,
  host, user agent, search parameters, region, function metadata, the URLs of outgoing requests, and every console line.
  Request headers and bodies are not recorded.
- **So "disabled" is read as "nothing it records can carry the key".** The key is in `Authorization`; the route reads no
  body and takes no search parameters; its one outgoing URL holds no key; and it writes nothing. Every failure is
  answered as a code inside `handle`, so none escapes for Next to log with a message an adapter error might carry.
  `realtime-handlers.test.ts` now holds both halves: a spied console stays empty through every answer, the key-bearing
  failures included, and neither file holds a `console` call. **No log drain** is configured; `docs/deploy.md` says to
  read its section before adding one.
- **Not verified on the deployment by this session.** The Vercel CLI here was logged out, and the agent has no dashboard
  access. `docs/deploy.md`'s "The realtime secret route and the logs" gives the four-step check (a keyless `curl` is
  enough, and spends nothing); it is on the checklist for Gate O.
- **If the human reads ADR 3's "disabled" literally**, that is a new ADR superseding it: the route would have to move to
  a host that can switch logging off for it, or the self-hosted escape would become the only path.

### D194 — the manual realtime checklist is written, and the dial was not re-measured on `main`
**Date:** 2 October 2026 · **Status:** accepted (agent, Phase 6 Slice 3)

- **`docs/realtime-checklist.md`** covers architecture.md §14's four headings (microphone permission, phase transitions,
  disconnection recovery, cost accounting) and Phase 6's other criteria: the dial under 2.5 s, the examiner's French and
  listening, "could you repeat", reduced motion, audio without headphones, the recording's places, the 25-minute cap,
  and the self-hosted escape, on the six browser and platform pairs. It ends with a results table for the session log.
  Its pairs are those Gate O names; section 7 runs on one pair per engine plus iOS, whose popups open as tabs.
- **The first step of *Next, decided*, re-measuring the dial on `main` after #58, was not run.** It needs
  `OPENAI_SMOKE_KEY` in `.env.local`, and this machine has none. It touches no code this slice changed (the self-hosted
  path is not the default and is not held to 2.5 s), so the slice went ahead, and the measurement stays first in *Next,
  decided*. The self-hosted dial is slower by the popup's load and the endpoint's mint; it is not measured, and the
  checklist asks the human to write it down.

### D195 — the repo is public, and Phase 7 gains a fifth slice, launch readiness, before Gate O
**Date:** 2 October 2026 · **Status:** accepted (human: the repo is public, and "plan the remaining pieces for the next slice
so that it makes it as ready as possible for launch"; the slice's content and order, agent). Amends D132's four slices

- **The repository is public** (the human, confirmed through the API: `visibility: PUBLIC`). Gate M's first item is done,
  R13 lacks only an outside item submission, and every link that "resolves once the repository is public" now does: the
  key settings' link to the route's source (D186) and the self-hosted guide (D192).
- **What was left between the code and a launch, read across the documents.** One build piece too large for a slice and
  gated on money, the full-volume bank (Gate M, D54). Four pieces the documents already name that need no human decision,
  which become **Slice 5**:
  1. **the realtime route's rate limit**, asked about since Slice 1 (D169) and still open: the one public route with none;
  2. **the band trend over time**, which PRD §8.9 asks of `/progress` and its printout, and which D148 left named;
  3. **`robots.txt`, a sitemap and `hreflang`**: none exists, and the site is now public in two languages;
  4. **a true 404** for an unknown path, named since D141.
- **Decided for the rate limit**, so the slice need not re-derive it: 60 posts an hour per IP hash, counted before the
  key is read, refused as a new `throttled` code (`rate-limited` already means OpenAI's quota and reads as "out of credit");
  no limit with no database or in the hermetic graph; and a failing store lets the mint through, because the spend is the
  user's own key and the limit guards only our function.
- **Decided for the 404:** a rewrite with status 404 in the proxy, which keeps the page inside the layout and under the
  CSP. If Next 16 cannot carry the status on a rewrite, the slice records why and keeps D141's 200 with `noindex`.
  `global-not-found` is ruled out: it renders outside the layout, without the nonce.
- **Why before Gate O.** Slice 5 changes `POST /api/realtime/secret`, which Gate O reads line by line, and adds copy that
  Gate O's French read can take in the same pass. Gate O after it reads the route once, finished.
- **Not in it:** the full-volume bank (Gate M's, funded by the human), Gate J, and the rest of *named, not scheduled*, which
  reads as after 1.0. The human's launch items are unchanged: the outside submission, the domain, the trademark check.
- **The records were brought up to date with the repository** in the same change: Phase 7's merged work items ticked,
  Phase 0's port lines ticked (every deferred port has landed), and the requirement coverage table's stale rows (R1, R2, R5,
  R6, R7, R8, R9, R11, R13) rewritten to what is built and verified.

### D196 — the drill's keys are live before its first item is painted, and a failed E2E test now leaves a trace
**Date:** 3 October 2026 · **Status:** accepted (agent). Corrects D179's reason for leaving the drill as it was

- **Found by CI on PR #60**: `content.spec.ts`'s library-link journey failed once in shard 1 of a pull-request run. The
  push run of the same commit, `9dfcf84`, passed, and the commit changed documents only. "1" and Enter, pressed as soon as
  the drill's count showed, were lost: no feedback appeared.
- **The cause is D179's, in the drill.** D179 left `PracticeSession` alone because "it adds its listener while still
  loading". It does not: the listener is in `Runner`, which `LoadedSession` mounts only once the items have loaded, with
  its first item painted, and the listener was added in a passive `useEffect`, which React may run after that paint. So
  the listener moves to `useLayoutEffect`, as the exam runner's did.
- **Not reproduced locally**, which is said plainly: 41 runs of the journey at 6 workers, and 21 more with the CPU slowed
  eightfold, all passed on a fast Mac. The fix rests on the code. The symptom is D179's, the structure is the exam
  runner's before D179, and like D179's failure it appeared only under a whole shard. Other paths were read and ruled
  out: the reducer resolves keys against current state (D65), the container's context value is stable once set, and the
  session id cannot change under a mounted `Runner`.
- **Why there was nothing to read.** The Playwright config kept traces `on-first-retry`, and `retries` is 0, so no
  trace was ever recorded, and CI uploaded no results. Now traces are `retain-on-failure`, and a failed E2E shard uploads
  `apps/web/test-results/` (traces and error contexts) as an artifact, for 14 days. The hermetic lanes use only sentinel
  keys and stubbed OpenAI answers, so a public artifact holds no secret.
- **Evidence:** the whole E2E suite three times at 4 workers: 101 passed, then 99 with 2 failed, then 101 passed. The two
  failures were not the drill, and are below.
- **A second race, found by that evidence and not fixed here, because the fix is a test change.** `practiseSpeaking` in
  `e2e/helpers.ts` asserts that "The examiner asks" holds focus after Start. The screen focuses that heading, then moves
  focus to the first question as soon as it is waiting (D121, by design). When the stubbed question arrives quickly,
  focus has left the heading before the assertion first looks, so `key-leak.spec.ts` and `oral.spec.ts` failed together
  in one run. The product behaves as D121 intends; the assertion checks a state that can last a few milliseconds. It is
  the same on `main`. The proposed fix asserts where focus *lands*: on the heading, or on the question once it is
  waiting. It waits for the human's yes, since the rule is to name a wrong test rather than change it quietly.
- **Revisit when** the journey fails again: read the uploaded trace before changing anything.

### D197 — CI's two red shards on `a7a8a99`: the examiner's heading checked too late, and journey 3 out of time
**Date:** 3 October 2026 · **Status:** accepted (human: "fix the failing CI actions", the go-ahead D196 waited for on its
test change; the diagnosis, agent)

Read from the traces D196 started uploading, not guessed:

- **Shard 1, `oral.spec.ts`'s D127 journey, in both the push and the pull-request run.** The screenshot at failure shows
  the first question on screen and the answer field focused: a typed session, where D121 sends focus. The heading had it
  first, for a moment. This is the race D196 named. **The test changed**, in `practiseSpeaking`: it now checks where
  focus lands, the question for a spoken answer and the field for a typed one, after the heading is shown. That is
  stricter than before, not looser. **Proved to bite:** with D121's move to the field removed, the journey fails on
  exactly that assertion; restored, it passes.
- **Shard 2, journey 3 (`exam-offline.spec.ts`).** The page was "Submitting your exam…" when the **test's 30 s default
  timeout** ran out. The trace's timings show `waitForOfflineReady`, the service worker's install and precache, took
  **21.4 s** on that runner, which left about 8 s for a 60-item exam, a reload, finishing offline and submitting. The
  product did nothing wrong. Every other long journey sets its own budget (90–240 s), and journey 3 had none. **It gets
  90 s**, and so does journey 9 (`telemetry-offline.spec.ts`), the other full exam after the same wait, which carries the
  same exposure. No assertion changed.
- **Evidence:** the five affected specs three times each at 4 workers, 46 passed; then the whole suite and the fast lane
  (session log).

### D198 — the trend over time: `calculateTrend` at each week's end, on local days, and on paper a row across the page
**Date:** 3 October 2026 · **Status:** accepted (agent, Phase 7 Slice 5, as D195 planned). Refines the plan's signature

- **Each point is `calculateTrend` itself**, over the attempts made on or before that point's day, so a point is exactly
  what `/progress` would have shown that evening: the same window of 100, the same Wilson interval (ADR 7), accuracy per
  band tag and never a band letter. A band short of evidence there is `insufficient`, and the chart draws it as a gap.
  No golden value moved.
- **A cutoff is a local day, not an instant.** The plan wrote `trendHistory(skill, attempts, items, cutoffs)` with week-end
  instants in the device's time zone. Building the instant at which a local day ends needs time-zone arithmetic that
  daylight time makes awkward. A local day needs none: an attempt counts when `localDay(ts, timeZone) <= day`, with the
  engine's existing `localDay`. So the engine takes `cutoffs: LocalDay[]` and the time zone, and `weekEnds(today, weeks)`
  gives the cutoffs, oldest first. `shiftDay` is exported from `engagement.ts` for it.
- `localDay` now keeps one `Intl.DateTimeFormat` per time zone, since the history asks for a local day per attempt and
  building a formatter costs far more than using it. Same answers.
- **`practiceTrendHistory`** reads the whole practice record (`all`, as `progressReport` does), never exam attempts, and
  takes "today" from the `Clock` in the device's time zone (D32).
- **The band drawn** is the study profile's target. Before one is set, it is the highest of `TARGET_BANDS`.
  **Twelve weeks** is `features/trend`'s `TREND_HISTORY_WEEKS`, a display constant, not exam data (ADR 9 covers exam rules).
- **`TrendChart`** in `@palier/ui` is `aria-hidden`; the figures are a table. On screen it sits in a `<details>` under the
  chart. Printed, it is simply there. It is one table either way, never a hidden copy (D148's lesson).
- **The printout stays one page, with full history, in both languages.** A first build added the chart and a twelve-row
  table to each trend card, and the page ran to 1,198 px of the 965 Letter allows. What changed on paper only:
  - each skill's history is its own row across the page;
  - the same table turns its weeks into columns (`tbody` a grid, `tr` a grid). The cell is shorter, "57% (39–73%)", from
    `historyCellPaper`, and the range is a `nowrap` span, so it never breaks at its dash;
  - the chart's own dates are dropped, since the table beside it names every week;
  - the page is tightened: body 9pt (was 9.5), page margin 10 mm (was 12), card gaps and padding 4pt (were 6), the
    sub-skill list's gap 1pt, and the meter's sentence 8.5pt.

  `progress-history-production.spec.ts` seeds twelve weeks in both skills into real IndexedDB and holds the printout to
  one page on Letter and A4 in English and in French. French is the tighter of the two.
- **New copy for Gate O's French read**: `progress.history*` (seven keys) and `oral.failThrottled`.

### D199 — one route list; robots, a sitemap and `hreflang` from it; and a 404 that answers 404
**Date:** 3 October 2026 · **Status:** accepted (agent, Phase 7 Slice 5, as D195 planned). Closes D141's named 404

- **`src/lib/routes.json`** is written by `prepare-public.mjs` from the routes it already derives for the precache (the page
  files, with the library's articles). It is committed and held equal by `lib/routes.test.ts`, as `global-error-copy.json`
  is. `appRoutes` and `routesJsonOf` are exported for the test.
- **`app/robots.ts` and `app/sitemap.ts`** are one-line bindings over `lib/discoverability.ts`:
  - robots allows everything but `/api/` and `/{en,fr}/hermetic/`, and names the sitemap;
  - the sitemap lists every route in both locales, with `hreflang` alternates, `x-default` to English.

  Both are **static, built once**, so their origin is the build's. On Vercel, `VERCEL_PROJECT_PRODUCTION_URL` is set at
  build time. `PALIER_SITE_URL`, if used, must be set for the build too.
- **The public origin** is `siteUrlFrom`: `PALIER_SITE_URL`, else `https://` plus `VERCEL_PROJECT_PRODUCTION_URL`, else
  `http://localhost:3000`. Pointing `palier.dougkeefe.com` at the project moves it with no code change.
- **How the layout knows the page.** Its metadata cannot see the path. So the proxy names a known route in a request
  header, `x-palier-route`, and deletes any the client sent. The layout turns it into `metadataBase`, a canonical, the
  `hreflang` alternates and an Open Graph title and description from `metadata.*`, with no image. Every page renders
  per request already (ADR 22), so reading the header costs nothing.
- **The 404.** The proxy checks a path under a locale against `routes.json`. A `hermetic/<view>` path also counts in the
  hermetic lane only. It rewrites an unknown path to itself with `NextResponse.rewrite(url, { status: 404 })`, and
  **Next 16.3.6 carries the status**, on `next start` and `next dev` alike. next-intl's redirects go first. `[...rest]` still
  renders the page inside the layout, under the nonce and the Trusted Types policy, so the CSP spec's two 404 paths show
  zero violations.
  - **On a 404, Next takes the head from the layout, not the page**, so `[...rest]`'s own title did not apply: the document
    read "Palier". Rendering a `<title>` in the view did not help either, since the layout's came first. So the layout
    titles a request with no `x-palier-route` as the 404, and names no alternates. **Next adds `noindex` to a 404 itself**;
    a second one from the layout was a duplicate, which the specs caught.
  - An unknown library article and, on a production build, the hermetic hook now answer 404 too.
- **A test changed, named here as the working agreement asks.** `errors.spec.ts` asserted `status() === 200`, which was
  D141's deviation. This slice reverses it by plan (D195), so the assertion is now 404. `production.spec.ts` (the hook) and
  `csp-production.spec.ts` (every page 200, the two unknown paths 404) gained status assertions. **Proved to bite:** with
  the proxy's rewrite removed, `csp-production.spec.ts` failed on `/no-such-page`: expected 404, received 200.
- `discoverability-production.spec.ts`: robots, every sitemap URL answering 200, a page's head naming its canonical, its
  twin and `x-default`, and an unknown path naming none.
