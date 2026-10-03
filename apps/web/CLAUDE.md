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
  **A link that changes the locale must be a document load, never a soft navigation** (progress.md
  D163): the locale is the root layout's segment, so a client-side switch remounts the layout, and
  React's client-built `<script>` hits the `innerHTML` sink that Trusted Types refuses, which renders
  `global-error`. `LanguageToggle` keeps next-intl's `Link`, which writes the locale cookie, and
  cancels the router in `onNavigate` for `location.assign`.
- **Design system only.** The app composes `@palier/ui` (`tokens.css` + `components.css`,
  the `.pl-*` classes) plus `src/app/globals.css` for page layout. No Tailwind (D25); no
  new primitives here — they belong in `@palier/ui`. **The one exception is the landing page** (D201), below.
- **The app as designed** (D202, `docs/Palier landing page/Palier App.dc.html`): the landing page's teal on warm paper
  and Source Serif 4, light only. The header is the wordmark, the destinations on a quiet pill track (`HeaderNav`, a
  client component that marks the current page `aria-current="page"` from `features/nav/nav.ts`), then sync and the
  language. The footer is deep teal with the giant wordmark, drawn by `::before` from a `data-` attribute. `.app-main`
  is 760px, and a page whose section carries `.app-wide` (today) takes 1160px. Every colour in `globals.css` is a token.
  A screen the design does not draw takes its header, ground, buttons and panels and keeps its function.
- **The landing page brings its own chrome and palette** (`/[locale]`, D201, as designed in `docs/Palier landing page` v4).
  - The layout wraps every page in `components/Shell.tsx`. It renders the app's header, `main#main` and footer everywhere
    except `/` (`features/landing/landing.ts`'s `showsAppChrome`, on next-intl's pathname). There the page renders its own
    `LandingHeader`, `main#main` and `LandingFooter`.
  - The landing footer must keep what the app's promises: `NonAffiliation`, the data, sync and key links, about,
    privacy, the library and `ShortcutSheet`.
  - **`components/landing/landing.css` holds the only palette outside `@palier/ui`'s tokens**: the `--landing-*` custom
    properties on `.landing`, held to the contrast gate by `landing-contrast.test.ts`, which reads them from the file.
    Next keeps a page's stylesheet after a soft navigation, so **every rule there is scoped under a `landing` class**.
    `motion.test.ts` reads it too.
  - Its serif is the app's `--font-serif`, preloaded on every page since D202. Without the preload, the swap rewrapped the
    French hero and cost `/fr` its Lighthouse budget on CI's Linux runner, which has no Times New Roman for `next/font`'s
    fallback; `globals.css`'s "Serif Fallback" face is the metric-matched stand-in.
  - Its photographs live in `components/landing/images/` and are CSS backgrounds. They are bundled under
    `/_next/static/media/`, so the CSP needs no new origin and the worker precaches them through the stylesheet. Never
    hotlink an image.
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
  by a drift test, and **`src/lib/routes.json`, the app's one route list** (D199): the page files, with the library's
  articles, as the precache derives them, committed and held equal by `lib/routes.test.ts`. A new page is a new line
  there, or the proxy answers it 404. `worker.ts` may have **no runtime
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
- **The R5 non-affiliation statement** is in the footer of every page, from day one, and **beside every band
  estimate and at the head of onboarding** (Gate K, progress.md D145): the exam result and home's exam half, the
  diagnostic readout, the oral report, workshop feedback, `/progress` and `/start`. Every surface renders
  `components/NonAffiliation.tsx`, never the key, so the wording cannot drift; a new screen that shows a band adds it.
- **The about page and the privacy notice** (`/about`, `/privacy`, D145) are static pages the agent drafted and the
  human reads at Gate L. **A change to what the server holds, never holds or deletes changes `/privacy` in the same
  pull request.** Its never-synced list reads the sync settings' own keys (architecture.md §9.4, "verbatim").
- **`/progress` is also the one-page PDF** (PRD §8.9, D145): a print stylesheet at the end of `globals.css`, no PDF
  library. `app-print-only` / `app-screen-only` pick what paper shows, and the skill the switch does not show is
  **mounted only while printing** (`usePrinting`: `beforeprint`/`afterprint` and the print media query), since a
  hidden duplicate would still be in the document. `content.spec.ts` holds it to one page on Letter and A4.
- **Keyboard** (PRD §11, D145). Every page-wide key handler asks `lib/keyboard.ts`'s `isPageKey` first (no chord,
  no field, and not Enter on a real button). The shortcut sheet at `?` (`components/ShortcutSheet.tsx`, in the footer)
  lists `features/shortcuts/shortcuts.ts`'s registry: **a screen that gains a key registers a row there**, with its
  messages in the `shortcuts` namespace, which a test checks exist.
- **The streak and the milestones** (Phase 7 Slice 4, PRD §9, D159). `components/engagement/Engagement.tsx` reads both
  once when home mounts, on the device's time zone, with the product rules in `features/engagement/rules.ts` (two freezes a
  month, 1,000 items), never the exam profile (ADR 9). "We kept your streak" and each milestone are said once through synced
  settings. **A milestone's moment is shown on home only**, full screen through `Dialog`'s `full` placement with Coco
  cheering, so never in exam mode or on a results screen (§10.1). Its share is text and the app's address
  (`features/engagement/share.ts`: Web Share, else the clipboard, else no button), never an image or personal data.
- **Motion** (D160): every duration is one of `@palier/ui`'s three tokens, and one switch in `components.css` turns all
  motion off under `prefers-reduced-motion` and inside `[data-mode="exam"]`. `src/app/motion.test.ts` fails a literal
  duration or a fading keyframe in either stylesheet; `e2e/motion.spec.ts` reads the computed styles.
- **Fonts are self-hosted** (D161): `src/fonts/fonts.ts` loads the one committed woff2, Source Serif 4, through
  `next/font/local` (its arguments must be literals), as `--font-serif` on `<html>`, **preloaded**: it sets every page
  (D202; Inter and Figtree were removed). `SOURCES.md` records the file's origin and hash, and `fonts.test.ts` holds it
  to it. **The service worker follows each precached stylesheet to the fonts it loads** (`staticAssetsInCss`).
- **The library** (D162) is `/library` and `/library/[subSkill]`, server components over `lib/library.ts`, which parses
  `@palier/content/library/*.json` once. **Never import `lib/library.ts` into a client component**: it would put every
  article in the JavaScript; a link needs only `features/library/links.ts`. Every written-expression item's explanation
  links its article (`components/library/ArticleLink.tsx`), in a new tab from a drill so the session is never left. Cited
  French in the prose renders through `Cited` with the article's `lang`. `prepare-public.mjs` expands the article route
  from the content's file names, so every article is precached.
- **The error states** (Phase 7 Slice 2, architecture.md §16, ADR 15; D141–D142).
  - `[locale]/error.tsx`, `[locale]/not-found.tsx` and `global-error.tsx` are one-line bindings; the screens are named
    components in `src/components/errors/`, so `NO_JSX_LITERALS` still applies to them.
  - **The diagnostic bundle (`lib/diagnostic.ts`) carries no free text**: an error's name, digest and in-app frame
    locations, the build, the bank, the browser's family and the path without its query. Never the message. The user
    reads it before copying it or opening the prefilled issue (`errorIssueUrl`); nothing sends it.
  - **An unknown path renders the 404 from `[locale]/[...rest]`**, inside the layout, and **answers 404** (D199): the
    proxy checks the path against `src/lib/routes.json` and rewrites an unknown one to itself with the status. On a 404
    Next takes the head from the layout, not the page, so the layout titles it (it has no `x-palier-route`) and Next adds
    `noindex`. A `notFound()` under this dynamic root layout is served as Next's error shell, which has neither the
    layout nor its Trusted Types policy, so under the strict CSP it renders blank. Do not route a user-facing 404 through
    `notFound()`.
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
  - **`POST /api/realtime/secret` is the one route that sees the user's key** (ADR 3, Phase 6 Slice 1, D169). The
    handler is `realtime-handlers.ts`, small enough to read line by line:
    - the key is read from `Authorization` and nowhere else; the body is never read;
    - it is used once, through a `RealtimeSecretSource`, and never logged, stored or echoed;
    - the answer is `{ value, expiresAt }`, uncached, and a refusal is a code.
    - posts are limited to 60 an hour per IP hash (D195, D200), counted **before** the key is read and refused as
      `throttled`, never `rate-limited`, which is OpenAI's quota. No limit in the hermetic lane or with no database
      (`db.ts`'s `realtimeRateLimitStore`). A store that fails, or is silent for `RATE_LIMIT_WAIT_MS`, lets the post through.

    `realtime.ts` composes it: the memory source when hermetic, otherwise OpenAI's for `ai-models.json`'s `realtime`
    and `realtimeVoice` (`cedar` since Gate N, D174). `ai-models.json`'s `realtimeEagerness` is not the route's: the
    composition root hands it to `realtimeTransport` through `pricing.ts`'s `REALTIME_EAGERNESS`, checked at load (D175). It needs no database. **Never add a `console` call, a store or a body read to it**; every
    branch has a test in `realtime-handlers.test.ts`, which also holds that the route writes nothing to the console,
    its log exclusion's half in code (D193; `docs/deploy.md` has the half on Vercel).
- **Found by search engines** (Phase 7 Slice 5, D199). `app/robots.ts` and `app/sitemap.ts` are one-line bindings over
  `lib/discoverability.ts`, reading `routes.json` and the public origin, `siteUrlFrom` in `lib/build-info.ts`
  (`PALIER_SITE_URL`, else `VERCEL_PROJECT_PRODUCTION_URL`, else localhost). The proxy names a known page's route to the
  layout in `x-palier-route` (and deletes any the client sent); the layout's metadata turns it into the canonical and
  `hreflang` links, with `metadataBase` and an Open Graph title and description. Both files are outside the proxy's
  matcher, so they carry no CSP and need none.
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
    callback by `@palier/app`'s key use cases: `withAiProvider`, metered, and `checkApiKey` (D101). The browser calls `api.openai.com` directly; the key reaches
    `src/server` at one route only, `POST /api/realtime/secret` (ADR 3, D169).
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
  - **Studio mode** (Phase 6 Slice 1, D165–D171) is `startOralStudio(request, peer)`. It runs the openai adapter's
    `realtimeTransport` over the caller's `RealtimePeerFactory`, since Slice 2's screen owns the microphone. It is fed
    secrets by `routeRealtimeSecrets` at `REALTIME_SECRET_PATH` in both graphs, capped at `STUDIO_MAX_MINUTES`
    (`pricing.json`'s `studioMaxMinutes`), and metered as `oral-studio`.
    `container-studio.test.ts` runs it through the real route file over a fake peer: the key reaches this origin only
    in `Authorization`, `/v1/realtime/calls` sees only `ek_` secrets, and a drop reconnects once, then fails cleanly
    with every turn kept.
  - **The studio screen** (Phase 6 Slice 2, progress.md D180–D189) is the same `/practice/oral` island: a **mode
    choice** on the picker, each mode's cost a minute from `featureCosts`, and studio's pre-flight as `oral-studio` at
    the session's minutes. Studio mode needs the microphone; without it the screen offers practice by typing.
    - **`features/oral/studio-controller.ts`** owns the conversation, tested over fakes: the microphone is **handed
      over** by the practice controller's check (`handOver`), the examiner's voice plays in an `Audio` element outside
      the layout, and the peer is the container's `realtimePeer`, so `@palier/adapters/openai` stays in the lazily loaded
      container chunk. It holds the Web Lock, records the microphone **whole** from the tap (`recordWhole`, D183), ticks
      the run for its `phase()` and reads `oralSessionCost` for the running meter. A failure is named only when the
      connection failed, since the transport keeps a server error without ending.
    - **The route is woken before the tap** (D190): on the microphone check and the pre-flight of a studio session
      (`practice-view.ts`'s `studioWarmup`), the screen calls the container's `warmRealtime`, a post with **no key**. The
      key still reaches the route only after the tap. The leak guard counts these as `realtimeSecretWarmups()`.
    - **`components/oral/OralStudio.tsx`** renders the conversation: `@palier/ui`'s `VoiceForm` (still under reduced
      motion), the phase, the timer, the meter, "could you repeat" and a large end control. **Never a transcript during
      the session.** It ends on the practice screen's end card, where `time-cap` has its own sentence.
    - **The report plays a studio recording from each spoken answer** (`playbackMarks`, D187); a practice recording
      is paused between answers, so it has no such places.
    - **The key copy states the exception** (D173, D186): the onboarding offer, the key settings (with a card linking
      the route's source, `lib/report.ts`'s `REALTIME_ROUTE_SOURCE_URL`, held to an existing file by a test) and
      `/privacy`, in both languages. A change to what that route does changes this copy in the same pull request.
    - **The way around it, the user's own endpoint** (Phase 6 Slice 3, D192). `components/key/RealtimeEndpointSettings.tsx`
      (decisions in `features/key/endpoint-view.ts`) sits in that card and keeps the address in the vault through the
      container's `realtimeEndpoint`/`setRealtimeEndpoint`. The oral screen reads it with its setup and passes it to
      `studioController.start` → `startOralStudio({ …, endpoint })`, where the container builds
      `selfHostedRealtimeSecrets` and **opens its popup synchronously, inside the tap** (a browser opens a popup only from
      a gesture), and cancels it if the run fails before its mint. With an endpoint the route is never woken, and the
      picker's and the pre-flight's copy name the endpoint (`studioModeNote`, `sendsTo`); its failure is `failEndpoint`.
      **`connect-src` is unchanged**: the popup and `postMessage` are not connections.
    - **`selfhost/`** at the repository root is not a workspace: the one-file Cloudflare Worker and Vercel function
      users deploy, and their README (linked as `SELFHOST_GUIDE_URL`). `src/server/selfhost.test.ts` loads both by file
      URL (a relative import would break `no-relative-escape`), runs every behaviour against each platform's entry
      point, runs the page's own script in a sandbox, and holds their shared code identical between its markers.
    - **Tests.** `e2e/oral.spec.ts` runs every studio state axe-clean over `installFakeRealtime`, an init script that
      stubs `RTCPeerConnection` with a scripted examiner on the data channel, so the real transport, route and dial run
      with no test code in the bundle (D188). `e2e/studio-live.spec.ts` is the **opt-in live measurement** (the `live`
      project, only with `PALIER_LIVE=1`, in no lane, D189). `PALIER_LIVE_BASE_URL` points it at a deployed site and starts
      no local server; `PALIER_LIVE_DIALS_ONLY=1` measures the three dials and skips the conversation (D190).
  - **Tier 11, the key-leak test**, is `e2e/key-leak.spec.ts` (hermetic, with real sync and telemetry)
    and `e2e/key-leak-production.spec.ts` (real Dexie), over `e2e/leak-guard.ts`. A new flow that can
    touch the key belongs in the first. A flow that holds user writing passes it to `assertNoLeak` as
    `deviceOnly` (allowed only on this device's own copy and in requests to OpenAI) or `nowhere` (D106). The guard reads request headers synchronously and response bodies
    on `requestfinished`, because `allHeaders()` never settles for a request a reload aborts.
    Audio is followed by its bytes (D120): `installFakeAudio` synthesises the microphone and numbers each
    recorder's bytes, request bodies are read as bytes, and a `Blob` at rest is dumped as its bytes. Chromium's
    fake capture device never answers on macOS, so never rely on it. **The sentinel may reach this origin in one place
    only: the `authorization` header of `POST /api/realtime/secret`** (D171). The guard records that header as
    `realtimeSecretAuthorizations()`, and still searches the request's URL, its other headers, its body and its answer.
    **The studio screen's dial to `/v1/realtime/calls` is recorded apart** as `realtimeCallAuthorizations()` (D188),
    and step 3f holds every one to an `ek_memory_` secret. **A spec that points studio mode at its own endpoint**
    passes `watchForLeaks(context, { selfHostedOrigin })`: a `POST` there may carry the key in `authorization` too, as
    `selfHostedAuthorizations()`, and nowhere else (D192).

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
  `content.spec.ts` (the about page and privacy notice, onboarding's statement, the shortcut sheet, `/progress`
  printed to one page, D145, and the library with a drill's link into it, D162), `motion.spec.ts` (D160),
  and `sync.spec.ts`: journey 8 (two contexts, two devices), journey 7's sync half,
  and the sync settings' states, and `exam.spec.ts` (a fixture exam from the picker to its results), and `oral.spec.ts` (spoken practice's
  states, a refused microphone, a refused call and a French pass).
  **`offline`** (production `next start`, port 3100) runs `offline.spec.ts` (shell,
  unvisited route, every shard, journeys 2 and 7 with the network off [R4]), `exam-offline.spec.ts`
  (**journey 3**: a full exam through a reload and a network drop, scored against an independent oracle) and
  `key-leak-production.spec.ts` (the key at rest, both modes, through a reload, with a ledger row in
  the dump), `oral-production.spec.ts` (a phase crossed by time), `spend-production.spec.ts` (the meter and the cap's warnings over real IndexedDB),
  `key-states-production.spec.ts` (each key-check result on the minified build, D158),
  `engagement-production.spec.ts` (a milestone and a kept streak, each said once through a reload, D159),
  `studio-selfhost-production.spec.ts` (ADR 3's self-hosted escape under the real CSP, against the repository's Worker
  run by `e2e/selfhost-server.mjs` on port 3300, which the config starts as a third server, D192), and
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
