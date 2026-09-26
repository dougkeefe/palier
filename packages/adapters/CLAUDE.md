# @palier/adapters

Every concrete adapter, one directory and one subpath export each: `/dexie`, `/bank`,
`/openai`, `/sync`, `/vault` (§3.2) — plus `/ids`, the id generator, which §3.2 does not name
(progress.md D48). A subpath lands with its adapter, not before — an entry resolving to an
empty module asserts a boundary with nothing behind it (D3). **Six are live.** `./ids` →
`webCryptoIdGenerator` (a monotonic Crockford-base32 ULID over Web Crypto, no npm dependency).
`./dexie` → `dexieStores` (the eight local store ports — `AttemptStore`, `ScheduleStore`,
`SessionStore`, `ExamRunStore`, `SettingsStore`, `KeyVault`, `SyncStateStore`, `TelemetryStore` — over
IndexedDB via `dexie`; progress.md D49/D50, D69 and D80, the last two on the `syncMeta` and
`examRuns` tables v1 already declared). **Schema version 2** adds `telemetryQueue` and `telemetryMeta`
(D92). Every version's `stores()` block is an exported constant, and `migration.test.ts` opens a real
database at the previous version with rows in it and proves they survive: **a new version needs a
case there**. `./openai` → `openAiProvider` (the `AiProvider` port, Phase 1). `./bank` →
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
(the sync identity seed, §9.3), so `clear` wipes the API key but not it. The key-leak test is live
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
