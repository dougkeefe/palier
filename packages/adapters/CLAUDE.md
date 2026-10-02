# @palier/adapters

Every concrete adapter, one directory and one subpath export each: `/dexie`, `/bank`,
`/openai`, `/sync`, `/vault` (§3.2) — plus `/ids`, the id generator, which §3.2 does not name
(progress.md D48). A subpath lands with its adapter, not before — an entry resolving to an
empty module asserts a boundary with nothing behind it (D3). **Six are live.** `./ids` →
`webCryptoIdGenerator` (a monotonic Crockford-base32 ULID over Web Crypto, no npm dependency).
`./dexie` → `dexieStores` (the twelve local store ports — `AttemptStore`, `ScheduleStore`,
`SessionStore`, `ExamRunStore`, `SettingsStore`, `KeyVault`, `SyncStateStore`, `TelemetryStore`,
`CostLedger`, `WritingStore`, `GeneratedItemStore`, `OralStore` — over IndexedDB via `dexie`; progress.md D49/D50, D69, D80 and D101, the last three on the
`syncMeta`, `examRuns` and `costLedger` tables v1 already declared). The cost ledger reads a row that is
not a whole entry as nothing, v1's `{ ts, feature: "none" }` placeholder included. **Schema version 2** adds `telemetryQueue` and `telemetryMeta`
(D92), and **version 3** adds `writingSubmissions` (D106). The generated-item store is over v1's own `generated` table, one row per
item with `setId` and `position` beside v1's `skill` and `createdAt` indexes, and reads a row whose item is not a whole `Item` of
the row's id and skill as nothing (D110). The oral store is over v1's own `oralSessions` and `oralAudio` tables
(D115): a session reads only whole, with an end and a reason both set or both null and every turn a whole
`OralTurn`, and a `mode` that is not one of `ORAL_MODES` reads as none, which is practice (D181); a recording row keeps its blob's size and its session's start beside it; and a write refused as
`QuotaExceededError` (by name, or as a wrapper's `inner`) becomes the port's `StorageQuotaError`. The writing store reads a row without a whole id, prompt,
text and instant as nothing, and a row whose assessment is broken, or whose offsets no longer fit its text, as the
text unassessed: the writing is the user's. Every version's `stores()` block is an exported constant, and `migration.test.ts` opens a real
database at the previous version with rows in it and proves they survive: **a new version needs a
case there**. `./openai` → `openAiProvider` (the `AiProvider` port, Phase 1; `assessWriting` since Phase 4
Slice 3, on the optional `models.assess`. **The model quotes each error's words and `@palier/domain`'s
`assembleAssessment` places them**; an excerpt not in the text, or two on the same words, is a malformed answer,
retried once, then `InvalidResponseError`; D105). **`PROMPT_VERSION` is 5** since both examiners were told to follow
from the last answer, never down the phase's lists (D176); it was 4 when the review prompt named the band scale (D112). **`recorded-fixtures.test.ts` replays every completion the live API really sent** (`@palier/testing`'s
`RECORDED_RUNS`) with no retry and requires the verdict it got when recorded, so a schema or parser change that would
refuse real output, or accept what was refused, fails the fast lane. **The turn loop's audio** (Phase 5 Slice 2,
D117): `transcribe` posts one clip as multipart to `/audio/transcriptions` and is **never retried**, since a retry
uploads the clip twice; `speak` reads `/audio/speech`'s binary body as a `Blob`; `examinerTurn` goes through
`callValidated`. Each is on its own optional role (`transcribe`, `speech`, `examiner`). Pricing is `@palier/domain`'s
`costOf` in each model's unit: a transcription bills the response's own `usage.seconds` when it reports duration,
otherwise the recorder's `durationMs`, and a voice bills the characters sent. `FetchLike` takes a `FormData` body and
may answer with `headers` and `blob()`. **`assessOral`** (Phase 5 Slice 3, D122) shares writing feedback's `assess`
role: the model names a candidate's turn and quotes its words, and `@palier/domain`'s `assembleOralAssessment` places
them per turn, so an excerpt not in its turn, an examiner's turn named, or a fix on an oral sub-skill is a malformed
answer, retried once. The prompt numbers the turns, marks a typed one, and quotes the profile's descriptors from the
request, each turn's words **as a JSON string**, so a typed answer cannot fake a turn (D127). **The Dexie oral store re-validates a stored report** against its turns (`checkOralAssessment`), and a
broken one, or none at all on a pre-Slice-3 row, reads as unassessed with the transcript kept; **the Dexie ledger
keeps an entry's `sessionId`** when it is an id, unindexed, so no version bump (D125). `./bank` →
`httpBankRepository` (the `ItemRepository` over the committed bank shards; progress.md D55).
`./sync` → `httpSyncTransport` (the `SyncTransport` port over the sync routes; progress.md D69–D71).
`./telemetry` → `httpTelemetrySink` (the `TelemetrySink` port over `POST /api/telemetry`; D92). It sends
no credential and `credentials: "omit"`, so no cookie either. A network fault, 429 or 5xx is
`TelemetryUnavailableError` (the batch waits); any other refusal is `TelemetryRejectedError` (the batch is
dropped). No retry, since the queue is persisted and the next trigger flushes again.
**`/vault` will not land** (D71): the device secret it was to hold already lives in `dexieKeyVault`
(D50), and pairing's hashing is server-side. An empty subpath would assert a boundary with nothing
behind it.

**The sync adapter is written over `fetch` too, with no vendor at all.** The credential is the device
secret, handed in by the composition root as `credentials: () => Promise<string>`, so it never imports
`/dexie`. Every status becomes a port error:
- a network fault, 429 or 5xx → `SyncUnavailableError`, which `syncNow` turns into a quiet
  "not syncing";
- 401 → `SyncUnauthorizedError`;
- a 404 on redeeming → `PairCodeRejectedError`;
- a 404 on revoke → the no-op the port promises;
- any other 4xx → `SyncProtocolError`, a bug.

It retries once, after a pause, on a network fault or a 502/503/504, **except when redeeming a code**,
which works once. Responses are structure-checked (D55's approach), so a captive portal's HTML reads
as "unavailable". It is held to `syncTransportContract` over MSW `syncHandlers`, and `apps/web`
runs the same contract against the real route handlers.

**The bank adapter is written over `fetch`, and has no vendor at all** — `fetch` is the platform.
It fetches the manifest once, then lazily fetches only the shards a query's `skill` needs and caches
each by its content-hashed path (immutable forever — the "service worker cache keyed by content hash"
of §7 at the data layer; the service-worker registration itself is `apps/web`). Its public surface
is the port plus `BankUnavailableError`/`BankContentError`; the manifest type and the GET-only
`FetchLike` stay internal, so no HTTP/fetch type crosses the boundary. Unlike the OpenAI adapter it
**structure-checks** the delivery rather than re-running the domain Zod schemas (array/record shape,
valid JSON, the manifest's control fields → `BankContentError`): the bank is our own
build-validated content, and full re-validation would reject the deliberately schema-incomplete
`itemRepositoryContract` fixtures (progress.md D55). The package therefore stays zod-free.

**The OpenAI adapter is written over `fetch`, not the `openai` SDK** (progress.md D-log). It
adds no dependency (the "no new dependency" rule), makes an SDK type impossible to leak, and
lets tests inject a `fetch` the way `webCryptoIdGenerator` injects its clock. Model ids are
config, never hardcoded (§8.1). It uses `response_format: { type: "json_object" }` and
**re-validates every response with the domain Zod schema, retrying once** (§8.2) — that
re-validation is the contract, not the model's promise. Every HTTP status / network fault /
malformed body becomes one of our error types (`errors.ts`); no `openai` module is imported at
all, so the `no-openai-outside-adapters-and-factory` ban is simply never exercised here.
**Every call races a time limit** (`timeoutMs`, 120 s; `verifyTimeoutMs`, 10 s; progress.md D99), so a
`fetch` that ignores the abort still ends, as `ProviderTimeoutError`, never retried. A 2xx body that is
not JSON is `InvalidResponseError`, and **the key is cut out of an echoed error body** before an error
carries it [R12]. `verifyKey` is `GET /models`, structure-checked for a `data` array.
**`lastUsage()` is the whole of the last method call** (D102): each method starts from `null` and every
completion adds to it, a retry included, and a 2xx answer is billed before its content is checked. So a
failed-but-billed call still reports its tokens, and no call inherits an earlier one's. With `pricing`, the
summed tokens are priced into `costUsd`.

**Studio mode's realtime pieces live in `src/openai/` too** (Phase 6 Slice 1, progress.md D169–D172), under the same
`./openai` subpath:
- **Two `RealtimeSecretSource`s.** `openAiRealtimeSecrets` is the server's: one `POST /realtime/client_secrets` for a
  60-second `ek_` secret, for the configured model and voice, never the request's. It never reads a refusal's body,
  so nothing OpenAI echoes reaches a message. `routeRealtimeSecrets` is the browser's: it posts the key in
  `Authorization`, and nowhere else, to this origin's route, and maps the route's refusal codes back to this
  adapter's named errors. **`warmRealtimeRoute`** beside it (D190) posts to the same route with **no key, no header and
  no body**, so a cold function wakes before the tap, and never rejects.
- **The third source, `selfHostedRealtimeSecrets`** (Phase 6 Slice 3, D192), is the user's own endpoint, reached by a
  popup and `postMessage`, never a `fetch`, so the CSP's `connect-src` is unchanged. It runs over an `EndpointWindows`
  seam (`browserEndpointWindows` is `window.open` without `noopener`, and the page's `message` events, each compared with
  the popup by identity), so no `Window` crosses it. **`open()` must run inside the tap's gesture**, before anything
  awaits; `mint` then uses that popup, and a later mint opens its own, each a new `_blank` window, never a named one a
  stale popup could share. **`cancel()` is final**: it closes the prepared popup, abandons a mint in flight, and every
  later mint rejects without opening anything. A popup counts as closed only when seen closed on two polls running,
  since the page closes itself right after its answer. The key is posted **only after the page's
  `ready`, from that popup, at the endpoint's origin, and only to that origin**; the answer is read only from there, for
  the mint's id. Blocked, closed, silent (30 s) or a refusal of the page's own is `SelfHostedEndpointError` by `reason`;
  the route's codes map through `realtimeRefusal` to the same errors as the route's. `SELF_HOSTED_MESSAGES` and
  `SELF_HOSTED_VERSION` are the protocol the repository's `selfhost/` files speak; a web test holds both sides to them.
- **`realtimeTransport`** is studio mode's `OralTransport`, over a `RealtimePeer` seam that no `RTCPeerConnection` type
  crosses.
  - It asks for the secret and makes the peer's offer **at once** (D190), so a peer exists before the secret is back;
    one whose secret never comes is hung up and nothing is dialled.
  - It sends the SDP offer to `/realtime/calls` with the `ek_` secret, then `session.update` with
    `studioInstructions` and `STUDIO_TOOLS` (data in `prompts.ts`, versioned apart as `STUDIO_PROMPT_VERSION`, 2 since
    D176), then `response.create`. The update asks for semantic turn detection at the configured `turnEagerness`
    (`ai-models.json`'s `realtimeEagerness`, D175), and without one leaves the API's default.
  - A new phase is `session.update` plus `response.create`; a register change is `session.update` alone. **One response
    at a time**: a cue asked for between `response.created` and `response.done` waits for the end, and a run of tool-only
    responses gets one follow-up, never a chain. A server `error` is kept for `lastError`, never fatal.
  - Server events are read through a table by type. Transcripts become whole turns timed by the client's clock, and
    the tools become `difficulty` and `note`, each call answered. A response that only called tools gets a follow-up
    `response.create`.
  - `response.done` is priced at the realtime rates, and each transcription at the transcribe model's, through the
    app's `usage` hook.
  - **One reconnect**, with a fresh secret and the transcript seeded. A second drop is `closed { failed }`, the
    examiner's words in flight delivered first.
  - **`repeat()`** (Phase 6 Slice 2, D180) sends the candidate's "could you repeat" as a user `input_text` message in the
    session's language (`studioRepeatRequest` in `prompts.ts`), then cues through the one-response queue. It is not a
    turn and is never seeded on a reconnect; while the line is down, or once closed, it does nothing. The instructions
    already told the examiner to repeat once when asked, so `STUDIO_PROMPT_VERSION` did not move.
  - It closes itself at `maxMs`.
- **`browserRealtimePeer`** is native `RTCPeerConnection`, no SDK (D170). Its unit test stubs the constructor, and
  whether real WebRTC carries it is the manual realtime checklist's.
- **The timed exchange is shared.** `http.ts` holds the one `fetch` exchange under a time limit, and the structural
  `FetchLike`, which the provider, both sources and the transport use.

**Every error class names itself with a string literal** (`override name = "…"`), never
`new.target.name`: the UI matches errors by name, and a production build minifies class names (D158).

**The Dexie `KeyVault` holds a tab-only key in its closure** (D98): never written, and a put deletes any
stored ciphertext first. The closure is the tab's because the composition root builds one vault per
page load.

**The Dexie subpath exports one Dexie-free thing.** `dexieStores(name?)` returns a `DexieStores`
whose every field is a port type from `@palier/app`; `PalierDb` (a `Dexie` subclass with
`Table<...>` getters) and the per-store factories are **internal**, reached only by relative
import from the package's own tests. Exporting `PalierDb` would put a vendor type in the published
`.d.ts` and, under pnpm's strict isolation, make the composition root's typecheck reach for
`dexie` — which the vendor ban forbids it. The schema is architecture.md 9.1 verbatim, all
thirteen tables at `version(1)` even though only seven have adapters, so the rest land without a
schema bump. **IndexedDB leaves a null key out of an index**, so a nullable indexed column cannot
find its null rows: `schedule.due` relies on that to drop retired entries, and `examRuns.submittedAt`
is why `unsubmitted()` walks `startedAt` instead. `PalierDb` uses lazy getters over `this.table()`, never `field!: Table<...>`
declarations, because `useDefineForClassFields` defaults on at ES2022 and would clobber Dexie's
own property assignment.

**The key vault encrypts at rest (architecture.md 6.2, [R12]).** The API key is AES-GCM
ciphertext under a **non-extractable** `CryptoKey` held in IndexedDB, exactly as §6.2 specifies —
a `CryptoKey` round-trips structured clone (including under `fake-indexeddb`), so nothing is
derived from a persisted secret (an HKDF-from-stored-bytes variant was rejected in review: those
bytes would let a storage-reader decrypt offline, D50). `withApiKey` hands the plaintext to a
callback and never returns it; there is no `getApiKey`. The `device-secret` is a separate value
(the sync identity seed, §9.3), so `clear` wipes the API key but not it; it also wipes the realtime endpoint row (D192). The key-leak test is live
in the contract suite (not deferred to Phase 4), plus a Dexie-specific assertion that what sits at
rest is ciphertext, not the key.

**May import** `@palier/app`, `@palier/domain`. **Never another adapter directory** — that
ban is the boundary §3.2 actually wanted, enforced by path in `.dependency-cruiser.cjs`
(`no-cross-adapter-imports`). `openai` lives in `src/openai` and `dexie` in `src/dexie`,
nowhere else. Each directory is its own `eslint-plugin-boundaries` element (D5 split began
with `adapters-ids`), so `no-unknown-files` keeps classifying files as the package fills.

## Invariants

- **Translate at the edge.** Vendor payloads, types and errors stop here and leave as ours
  (§2.4). Every AI response is Zod-parsed before return, even when the provider promises
  structured output (`architecture.md` §8.2).
- **No use case logic.** An adapter deciding *what should happen* belongs in `@palier/app`.
- **Every adapter passes its port's contract suite** from `@palier/testing` (§6.2 tier 3,
  ADR 10) — and that is not sufficient. 90% branch (§6.3).

## The three mistakes most likely to be made here

1. **Letting an SDK type escape** through a return value or a thrown error. No gate catches
   this; the reviewer has to.
2. **Treating the contract suite as enough.** It proves substitutability only. Retry,
   backoff, watermarks, error translation and every migration need their own tests (§10).
3. **Importing a sibling adapter** for a shared helper. Lift it to `app` or duplicate it.
