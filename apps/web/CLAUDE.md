@AGENTS.md

# @palier/web

The Next.js app and the **one composition root** (implementation-plan.md §3.5). May
import every package; holds the concrete-adapter wiring nothing else may name.

## Invariants

- **Locale-prefixed routing.** Every route lives under `src/app/[locale]/`; `/` redirects.
  **Every page renders per request** (ADR 22): the layout reads the CSP's nonce from the request,
  so nothing under `[locale]` is prerendered. Do not add `generateStaticParams`, `force-static` or a
  `revalidate` to a page: a static page has no nonce and cannot run. `src/i18n/{routing,request,navigation}.ts`
  configure next-intl; `src/proxy.ts` negotiates the locale. In Next.js 16 Middleware
  was renamed **Proxy**, so the file is `proxy.ts` (deviation D24).
- **No hardcoded user-visible strings.** Every string goes through next-intl and lives
  in `messages/{en,fr}.json` at full key parity (lint `NO_JSX_LITERALS` + the parity
  test in `src/i18n/messages.test.ts`, R8). Use `Link`/`redirect` from
  `src/i18n/navigation`, never `next/link` directly, so locale prefixes are automatic.
- **Design system only.** The app composes `@palier/ui` (`tokens.css` + `components.css`,
  the `.pl-*` classes) plus `src/app/globals.css` for page layout. No Tailwind (D25); no
  new primitives here — they belong in `@palier/ui`.
- **Composition root** at `src/lib/container.ts` (under `src/` so it is cruised, covered
  and tested — D23), assembling the use-case graph with `buildUseCases`. **Production**
  wires the real adapters — `@palier/adapters/bank` over `BANK_BASE_PATH`/`BANK_VERSION`,
  `@palier/adapters/dexie`, `@palier/adapters/ids`, `systemClock()` and a per-day-seeded
  `seededRandom` (D58) — and is **browser-only** (IndexedDB, origin-relative bank URL): build
  it in a client component, never during server rendering (D59). **Hermetic**
  (`PALIER_HERMETIC=1`) wires the in-memory ports and the fixture bank. Both come through
  `@palier/testing/in-memory`, never the root entry point, which a browser cannot bundle
  (it re-exports vitest-based contract suites, `msw/node` and PGlite — D59).
- **Islands get the container from `ContainerProvider`** (`src/components/`), which builds it once
  in the browser after hydration and imports the container module lazily, so the adapters stay out of
  the shared first-load JS. The layout passes `hermetic` from the environment. Screens are thin RSC
  shells around one client island each (`/start`, `/home`, `/diagnostic`, `/practice/{reading,writing}`,
  `/practice/writing/{workshop,generate}`, `/practice/oral`, `/practice/oral/report`,
  `/exam`, `/exam/run`, `/exam/results`, `/settings/{data,sync,key}`).
  The islands' decisions live in tested `.ts` beside them (`src/features/**`, `src/lib/study.ts`); a
  `.tsx` holds rendering and effects only.
- **`public/content/` and `public/sw.js` are generated, gitignored and never edited.**
  `scripts/prepare-public.mjs` runs before `dev` and `build`: it copies `content/bank/` and
  compiles the service worker from `src/sw/worker.ts` (D60). Every bank version is copied, but the
  worker **precaches only `BANK_VERSION`'s**, which the script reads from `src/lib/bank-version.ts` (D140); a
  `BANK_VERSION` with no committed bank fails the build (D82). It also writes
  `src/components/errors/global-error-copy.json` from the messages' `errors` namespace (D141), committed and held equal
  by a drift test. `worker.ts` may have **no runtime
  imports** (the output is a classic script); a test compiles and runs it. The worker
  registers only in production builds (`src/sw/register.ts`).
- **The exam profile is parsed here, once**, from `@palier/content/profiles/psc-sle.json`
  through `parseExamProfileOrThrow` (ADR 18, D42). Import it by package name, never by a
  relative path out of `apps/web` — `no-relative-escape` in `.dependency-cruiser.cjs`
  rejects that, and `.json` is in the cruiser's resolver extensions, so it is caught.
- **Mock exams** (Phase 3 Slice 3, progress.md D85–D87). The three exam routes take no route parameter, and the run is
  named in `?run=`, which the island reads from `window.location`. Offline, `router.push` falls back to a
  document load, which the worker serves with `ignoreSearch`.
  - The runner's rules are in `src/features/exam/`: `rules.ts` holds the product constants and the clock,
    `runner.ts` the reducer, `results.ts` the results view model, and `readiness.ts` the home card's exam
    half.
  - **Every runner write goes through one promise chain**, because answers and checkpoints are both
    read-modify-write.
  - **Enter is `preventDefault`ed on an option radio**, or its native click answers the next item.
  - The runner's section carries `data-mode="exam"`, which gives it `@palier/ui`'s muted token set and no
    motion.
  - Nothing names or styles a pilot item (D84 ruling 9).
- **The R5 non-affiliation statement** is in the footer of every page, from day one.
- **The error states** (Phase 7 Slice 2, architecture.md §16, ADR 15; D141–D142).
  - `[locale]/error.tsx`, `[locale]/not-found.tsx` and `global-error.tsx` are one-line bindings; the screens are named
    components in `src/components/errors/`, so `NO_JSX_LITERALS` still applies to them.
  - **The diagnostic bundle (`lib/diagnostic.ts`) carries no free text**: an error's name, digest and in-app frame
    locations, the build, the bank, the browser's family and the path without its query. Never the message. The user
    reads it before copying it or opening the prefilled issue (`errorIssueUrl`); nothing sends it.
  - **An unknown path renders the 404 from `[locale]/[...rest]`**, inside the layout, 200 with `noindex`. A `notFound()`
    under this dynamic root layout is served as Next's error shell, which has neither the layout nor its Trusted Types
    policy, so under the strict CSP it renders blank. Do not route a user-facing 404 through `notFound()`.
  - `global-error.tsx` has no provider; it reads `global-error-copy.json`, never the whole message files, which would add
    about 32 KB gzipped to every page.
  - The build is `BUILD_VERSION` (`lib/build-info.ts`), inlined by `next.config.ts` from `VERCEL_GIT_COMMIT_SHA`; the bank
    is `lib/bank-version.ts`, which the server may import, unlike `container.ts`.
  - `[locale]/hermetic/[view]` is the E2E hook: it throws, or shows the global view, in the hermetic lane only, and is the
    404 anywhere else. A dynamic segment, so the worker never precaches it.
- **A spending call outlives its screen** (D127, D143; `lib/in-flight.ts`). A report, a submission's feedback and a
  fresh set still out are joined, never repeated, from module scope in `container.ts`, so a rebuilt container finds
  them; each screen reads the held request on mount and shows it as still being made. **A wipe or delete-everywhere
  forgets them and drops what each would write** (`writesUntilWiped`); the ledger still records the billed call. A new
  spending screen follows the same pattern.
- **A spoken session is held as running by its page** (D144): the practice controller takes a Web Lock for its session
  (`lib/oral/liveness.ts`, the container's `oralLiveness`), and the oral screens call `closeAbandonedSessions` as they
  load, so a session a closed tab left open is listed at once and another tab's is left alone.
- **The sync backend lives in `src/server/` and nowhere else** (ADR 21, progress.md D70).
  - It holds the Drizzle schema, a `SyncRepository` whose every method takes an account id (there
    is no cross-account read path), pure `Request → Response` handlers, and `db.ts`, the server's one
    composition point: PGlite when hermetic, postgres.js on `DATABASE_URL`, and `null` (→ 503) with
    neither.
  - `drizzle-orm`, `drizzle-kit` and `postgres` are banned outside `src/server/`
    (`no-sql-outside-web-server`).
  - Route files under `src/app/api/` are one-line `serve(...)` bindings on the Node runtime (Edge is
    deprecated in Next 16), with no `runtime` export.
  - Device secrets are stored as SHA-256 (D70).
  - A schema change means `pnpm --filter @palier/web exec drizzle-kit generate --dialect=postgresql
    --schema=./src/server/schema.ts --out=./drizzle`, with the generated SQL committed.
  - **Migrations apply at deploy** (`src/server/migrate.ts`, run by `scripts/db-migrate.mjs` from the
    `vercel.json` build command; progress.md D78). They run only for a production deployment or for a
    person running `db:migrate` by hand, never for a preview, and they must stay backward-compatible,
    because the old deployment serves while the new one migrates. `migrate.ts` has no relative imports,
    so Node's type stripping can run it without a bundler. The runbook is `docs/deploy.md`.
  - **Telemetry has its own repository, handler and binding** (progress.md D93):
    `TelemetryRepository`, `createTelemetryApi` and `serveTelemetry`, over the **same** database `db.ts`
    memoises for sync, so the hermetic lane never builds a second PGlite. `telemetry_events` holds no
    account, device, IP or timestamp, only the day received. `http.ts` holds the helpers both
    handlers share.
  - **The item-statistics job** (`item-statistics-job.ts`, D94) is self-contained like `migrate.ts`, so
    `scripts/item-statistics.mjs` runs it under type stripping. It reads events through one query,
    `EVENTS_SQL`, which the Drizzle repository reads through too, and it reads the bank through
    `@palier/adapters/bank`. A monthly workflow opens its report as a pull request.
  - **The retention job** (`retention-job.ts`, D138–D139) is self-contained the same way, run by
    `scripts/retention.mjs` and the daily `retention.yml`. Its rules are raw parameterised SQL, so the script on
    postgres.js and `retention.integration.test.ts` on PGlite run the same text; a boundary is strict (older goes,
    exactly at the cutoff stays). It is the one cross-account path, and it only deletes by age. The plan's storage is
    `PLAN_STORAGE_MB`, never a number in code; the run fails at 60% and 80%.
  - **`GET /api/health`** (D140) is `serveHealth` over `healthResponse` in `handlers.ts`: the build, the bank, and
    whether the database answers, uncached, with no identifier; 503 only when a configured database does not answer.
- **Baseline security headers on every response** (`next.config.ts`, architecture.md §12): HSTS,
  `nosniff`, `Referrer-Policy: no-referrer`, and a `Permissions-Policy` allowing the microphone on
  this origin only. They are asserted on the production server in `e2e/production.spec.ts`.
- **The strict CSP on every page** (Phase 7 Slice 1; ADR 22, progress.md D133–D136).
  - `src/proxy.ts` mints a nonce per request and sets the policy from `lib/csp.ts` on the request, where
    Next reads the nonce, and on the response. **Every path under a locale runs it**, a dot in the path or not
    (`/(en|fr)/:path*`), because the policy is set nowhere else (D141).
  - Production has `script-src 'self' 'nonce-…'`, `connect-src 'self' https://api.openai.com`, and Trusted
    Types enforced. `next dev` gets a relaxed policy.
  - **A new origin the browser must reach is a `csp.ts` change with its test**, never a loosening
    elsewhere.
  - **Nothing may write HTML or script strings to the DOM.** `dangerouslySetInnerHTML`, `innerHTML` and
    `eval` are refused by Trusted Types in production. The one inline script is the Trusted Types policy
    (`lib/trusted-types.ts`), nonced in the layout's `<head>`. It passes a script URL unchanged, because
    Turbopack finds a chunk by its `src` text.
  - `src/instrumentation-client.ts` sets zod's `jitless` before any app code runs, since zod's `new
    Function` is refused.
  - `e2e/csp-production.spec.ts` holds every page, in both locales, to **zero violations** on the built
    output. Its red team proves each way to run script or send the key elsewhere is refused. A new page
    joins its `PAGES` list.
- **Sync in the browser graph** (D71): the container's `sync` port is the real `@palier/adapters/sync`
  transport, same-origin, presenting `vault.deviceSecret()`, in **both** graphs. In hermetic mode each
  page load is its own device, with a random 64-hex secret and a separate id counter, and syncs
  against the dev server's PGlite routes.
- **`SyncRunner`** (`src/components/sync/`) sits in the layout inside `ContainerProvider` and is the
  only thing that calls `syncNow` in the background. The trigger rules are `src/lib/sync-triggers.ts`
  and the display rules are `src/features/sync/sync-view.ts`. Islands report events with
  `useSync().notify(...)`, for example `"session-complete"` after `completeSession` and after
  `submitExam`. **Every trigger also flushes queued telemetry** (D92), single-flight
  (`lib/single-flight.ts`), silently, and whatever `shouldSync` or the sync switch says. A demand made while
  a run is in flight runs once more after it (`runsAgainAfterCurrent`), and the settings status line
  carries `aria-busy` while an exchange is in flight, which is what journey 8 waits on (D82). "Syncing…"
  appears only after 400 ms, so a run with nothing to do never shifts the header (D72).
- **The user's key** (Phase 4 Slice 1, progress.md D98–D100).
  - The container's `aiProvider` is `openAiFor`, the real `@palier/adapters/openai` in **both** graphs,
    over model ids that are data (`src/lib/ai-models.json`). It is only ever called inside the vault's
    callback by `@palier/app`'s key use cases: `withAiProvider`, metered, and `checkApiKey` (D101). The browser calls `api.openai.com` directly; the key never reaches
    `src/server`.
  - `/settings/key` (`components/key/KeySettings.tsx`, with its decisions in `features/key/key-view.ts`)
    saves, checks, removes and keeps a key for a tab. Every check result is a sentence mapped by error
    **name**, never the raw error. `/settings/key/guide` is static.
  - Onboarding's step 5 is the wizard's last step on the skip path, and an offer on the diagnostic readout
    on the diagnostic path ("diagnostic before key, always"). `components/key/KeyOffer.tsx` serves both.
  - **Spend** (Phase 4 Slice 2, progress.md D101–D104). `src/lib/pricing.json` is pricing as data,
    structure-checked by `src/lib/pricing.ts` and held equal to the factory's rates by a test;
    `openAiFor` passes its `models`, so every call is priced. The container's `costLedger` is Dexie's in
    production and memory's when hermetic, and "this session" is since the container was built.
    `components/key/SpendSettings.tsx` (decisions in `features/key/spend-view.ts`) is the meter, the soft
    cap (a synced setting) and the per-feature table, below the key cards, key or no key.
    `container-spend.test.ts` runs a real call through both graphs over MSW; `spend-production.spec.ts`
    seeds `costLedger` rows in real IndexedDB for the warning states. **Gate G's billing check** is `scripts/billing-check.mjs` over `src/lib/billing-check.ts`
    (no relative imports, for type stripping); the runbook is `docs/deploy.md`.
  - **The writing workshop** (Phase 4 Slice 3, progress.md D105–D108) is `/practice/writing/workshop`,
    linked from the writing drill. `components/writing/` renders it; its decisions are in
    `features/writing/` (the reducer, the word diff, the inline error segments). The prompt library is
    `@palier/content/writing/prompts.json`, parsed once in the container by `parseWritingPromptsOrThrow`, like
    the profile. Nothing is saved until feedback is asked for; submissions are the container's `writing` store,
    **never synced and never exported**, cleared by wipe and delete-everywhere. `container-writing.test.ts`
    runs the real adapter over MSW through both graphs.
  - **Fresh practice items** (Phase 4 Slice 4, progress.md D110–D111) are `/practice/writing/generate`, linked
    from the writing drill. It is its own route because a drill listens for §8.3's keys on the whole window.
    `components/generate/GenerateSet.tsx` renders it; its decisions are in `features/generate/generate-view.ts`.
    The set is practised through `PracticeSession`'s `mode: "generated"`, which scores with
    `scoreGeneratedAnswer` and **writes no attempt, no schedule entry and no session**, so it never syncs and
    never reaches the trend. A generated item's feedback carries `GeneratedProvenance` (the §13.0 badge and the
    `contributeIssueUrl` contribution) in place of `ReportItem`. The container's `generated` store is Dexie's v1
    `generated` table in production, **never synced and never exported**, cleared by wipe and
    delete-everywhere. `components/key/NoKeyCard.tsx` is shared with the workshop, by namespace.
    `container-generate.test.ts` runs the real adapter over MSW through both graphs.
  - **Spoken practice** (Phase 5 Slice 2, progress.md D117–D119) is `/practice/oral`, linked from home's actions
    card. `components/oral/OralPractice.tsx` renders it; its decisions are in `features/oral/`: the reducer, the
    microphone rules, the `AnswerSource` bridge, and **`practice-controller.ts`, which owns the microphone, the
    recorders, the run and its end** and is unit-tested over fakes (D121). The `.tsx` holds none of that. The
    controller's `attach` pairs with `dispose`, because Strict Mode remounts the screen in development. The recorder and the level check are `lib/oral/`, over a
    `MediaKit` and a `LevelKit` a test fakes. The session is `startOralPractice`: the app's turn-based transport
    over the real adapter, metered as `oral-practice`. **Only the current question is shown during a session**,
    never a running transcript. The session recording (the candidate's answers only) is kept by `saveOralAudio`,
    **never uploaded in this slice, never synced and never exported**; `/settings/data` shows its size and deletes
    it in one action. The hermetic clock is frozen, so hermetic journeys end a session by its end control.
    `container-oral.test.ts` runs a real session through both graphs over MSW.
  - **The report on a session** (Phase 5 Slice 3, progress.md D126) is `/practice/oral/report?session=…`, reached from a
    session's end and from the picker's list of past sessions. `components/oral/OralReport.tsx` renders it; its decisions
    are `features/oral/report-view.ts`. It offers itself on the key with the workshop's pre-flight, then shows the five
    criteria and pronunciation **not assessed** (Gate J), three fixes each linked to its skill's drill, five words, the
    transcript with **each error a button** that shows its correction, the fluency, the session's measured cost, and the
    recording, played or deleted in one tap. The filler list is `@palier/content/oral/fillers.json`, parsed once in the
    container. The leak guard stubs the report by its prompt (`completionKind`'s `oral-report`) and follows its words
    as `REPORT_SENTINEL`. **A report request still out is joined, never repeated** (`oralReportInFlight`, D127), and
    the screen's pause before each spoken answer is measured by the practice controller from the question's voice.
  - **Tier 11, the key-leak test**, is `e2e/key-leak.spec.ts` (hermetic, with real sync and telemetry)
    and `e2e/key-leak-production.spec.ts` (real Dexie), over `e2e/leak-guard.ts`. A new flow that can
    touch the key belongs in the first. A flow that holds user writing passes it to `assertNoLeak` as
    `deviceOnly` (allowed only on this device's own copy and in requests to OpenAI) or `nowhere` (D106). The guard reads request headers synchronously and response bodies
    on `requestfinished`, because `allHeaders()` never settles for a request a reload aborts.
    Audio is followed by its bytes (D120): `installFakeAudio` synthesises the microphone and numbers each
    recorder's bytes, request bodies are read as bytes, and a `Blob` at rest is dumped as its bytes. Chromium's
    fake capture device never answers on macOS, so never rely on it.

## Gates this app owns

- Fast lane: i18n key parity (`messages.test.ts`), container wiring test — including the
  production graph over `fake-indexeddb` planning a day from the committed bank, and one sync
  round trip through the real routes — and the service worker's behaviour over an in-memory
  `CacheStorage` (`src/sw/`). The sync handlers run over an in-memory `SyncRepository`
  (`src/server/__tests__/`). `syncTransportContract` runs through the HTTP adapter and the real
  route files (`src/app/api/transport.test.ts`), and every `route.ts` holds 95% branch.
- Integration lane (`integration-web`, `PALIER_INTEGRATION=1`): the same repository and transport
  contracts on Drizzle over PGlite, with the committed migrations; and **the sync simulator through the
  real route handlers** (`src/app/api/simulator.integration.test.ts`: 100 seeds, 2,000 nightly; D76),
  with each simulated device presenting its own `x-forwarded-for`.
- Medium lane (`.github/workflows/verify.yml`): Playwright in three projects.
  **`warmup`** compiles every route once, serially, before the parallel hermetic tests. A cold
  Turbopack dev server under parallel first requests can read a build file mid-write (D67);
  keep it the `chromium` project's dependency. **`chromium`** (hermetic, `next dev`) runs the
  smoke tests and journeys 1, 2, 6, the review empty state, the report control and per-page
  titles, **journey 5 and step 5** (`key.spec.ts`), **the hermetic key-leak test** (`key-leak.spec.ts`),
  `errors.spec.ts` (the 404, a thrown route with its bundle and the key-leak sentinel, and the global view, D141–D142),
  and `sync.spec.ts`: journey 8 (two contexts, two devices), journey 7's sync half,
  and the sync settings' states, and `exam.spec.ts` (a fixture exam from the picker to its results), and `oral.spec.ts` (spoken practice's
  states, a refused microphone, a refused call and a French pass).
  **`offline`** (production `next start`, port 3100) runs `offline.spec.ts` (shell,
  unvisited route, every shard, journeys 2 and 7 with the network off [R4]), `exam-offline.spec.ts`
  (**journey 3**: a full exam through a reload and a network drop, scored against an independent oracle) and
  `key-leak-production.spec.ts` (the key at rest, both modes, through a reload, with a ledger row in
  the dump), `oral-production.spec.ts` (a phase crossed by time), `spend-production.spec.ts` (the meter and the cap's warnings over real IndexedDB), and
  `production.spec.ts` (journey 4, via `page.clock.setFixedTime`, **not** `clock.install`,
  whose fake timers stall Dexie and React), and `csp-production.spec.ts` (every page's nonce and zero
  violations, and the red team, D136). Axe on the states, (`e2e/`),
  Lighthouse perf + a11y ≥ 95 (`lighthouserc.json`, on its own port 3200, so a test server left
  behind on 3000 by a killed lane can never answer it, D90), bundle-size < 180 KB gzipped
  (`scripts/check-bundle-size.mjs`, override with `PALIER_BUNDLE_BUDGET_KB` to test it).

## Traps

- Typechecks separately (`next typegen && tsc --noEmit`, D2); the only workspace on
  `moduleResolution: bundler`. Build packages first — imports resolve through `dist` (D6).
- `AGENTS.md` is regenerated by `next dev`; put durable notes here, not there (D15).
- The `offline` Playwright project serves the **existing** production build. Locally, run
  `pnpm --filter @palier/web build` first, or it tests a stale one.
- Under `next dev` there is no service worker by design. Offline behaviour is only real
  under `next build && next start`.
- **Hermetic journeys move by in-app links, never `page.goto`, once they have state:** the
  in-memory container lives for one page load.
- **Every page sets its own title** through `generateMetadata` (the layout's template makes it
  `Page · Palier`, WCAG 2.4.2).
- **An island page's section carries `.app-island`.** It gives `<main>` a full viewport of height, so the
  footer starts below the fold and content arriving after hydration never moves it. Without it CI
  measured a layout shift that cost `/fr/progress` its performance budget (D68). A new island screen
  needs the class too.
