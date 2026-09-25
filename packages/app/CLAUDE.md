# @palier/app

The port interfaces (`implementation-plan.md` §3.3) and the use cases that consume them.
Knows what the product does, nothing about how anything is stored, fetched or rendered.

**May import** `@palier/domain`, `@palier/engine`. Never an adapter, never React.

## Invariants

- **A port signature contains our types only.** No `openai`, `dexie` or `Response` type
  reaches this layer (§2.4); translating them is the adapter's whole job.
- **Use cases receive their collaborators.** `Clock`, `Random`, stores and providers are
  parameters supplied by the composition root (§3.5); nothing here constructs a concrete one.
- **`KeyVault.withApiKey` hands the key to a callback and never returns it** (§3.3). Do not
  add a `getApiKey` — the shape is the control (ADR 2, ADR 3).
- **Ports are transcribed from §3.3, not invented.** Eight live under `src/ports/`:
  `ItemRepository`, `AttemptStore`, `ScheduleStore`, `SessionStore`, `SettingsStore`,
  `KeyVault`, `Clock`, `Random`. `OralStore` (no §3.3 signature) and the
  `AiProvider`/`SyncTransport`/`TelemetrySink` trio (need net-new domain types) are deferred
  to their own sessions — deciding them is a decision to record, not a gap to fill quietly.
  **`AiProvider` has now partly landed** (`ports/ai-provider.ts`, Phase 1): the factory-facing
  subset `capabilities`/`generatePassage`/`generateItems`/`reviewItem`/`lastUsage`. §3.3 is
  amended in place with two D-log decisions — `generatePassage` is added (content-factory.md
  §4.2 needs it) and `generateItems`/`generatePassage` return **drafts**, not assembled
  `Item[]`/`Passage[]`, so id-minting and provenance stay the factory's job, not the adapter's.
  Its DTOs live in `@palier/domain`, not here (ADR 20). `assessWriting`/`assessOral`/
  `transcribe`/`openVoiceSession` and `TelemetrySink`/`OralStore` are still deferred to their
  phases (`SyncTransport` has since landed, below).
  `IdGenerator` is a *ninth* port §3.3 does not name at all, decided here (progress.md D48):
  `{ ulid(): string }`, content-agnostic — it mints the id, the caller brands it
  (`attemptId(gen.ulid())`). It exists because nothing in the app may mint an id (`ids.ts`,
  and the `Random` port is seeded, not entropy — see below); `@palier/adapters/ids` backs it
  with Web Crypto, `@palier/testing` with a deterministic counter.
  `ISO`, `ScheduleEntry` and `ItemCriteria` are named-but-unspecified by §3.3 and were
  decided here (progress.md D18–D20). `SessionStore` was the same kind of decision
  (progress.md D45): `Session = { id, mode, startedAt, completedAt }` and the port is
  `{ create, complete, latest }` — the minimum `StartSession`/`CompleteSession` need. Like
  `ScheduleEntry`, `Session` lives here, not in `@palier/domain`: the engine never consumes
  it and it has no content-artefact/Zod role. §3.3 is amended in place. `ScheduleEntry` is now complete —
  `{ itemId, due: ISO | null, skill, box }` — and `ScheduleStore` gained a `get`, because
  the Leitner rule needs the item's *current* box and `due`/`put` cannot supply it; §3.3 is
  amended in place and progress.md D38 records it, closing D19. `AttemptStore.append` was
  likewise amended from `Promise<void>` to `Promise<boolean>` — it returns whether the attempt
  was newly stored — so `answerItem` can keep its Leitner reschedule idempotent on a retry
  (progress.md D44), the same "a use case needs a signal the port could not give" move as D38.
  The four store ports (`AttemptStore`, `ScheduleStore`, `SessionStore`, `SettingsStore`) each
  gained **`all()` and `clear()`** for the data-rights use cases (progress.md D61) — the same
  move again: export must read every record and wipe must delete them. `all()` promises no
  order; `ScheduleStore.all()` includes retired entries.
  **`SyncTransport` has landed** (`ports/sync-transport.ts`, Slice 2), amended from §3.3 in place
  (progress.md D69): `push(items)` carries a `baseRevision` per document, `pull(watermark: number)`
  pages by the account's revision counter, and registration is idempotent per device secret. A
  **tenth** port §3.3 does not name, **`SyncStateStore`** (`ports/sync-state-store.ts`), holds the
  device-local sync bookkeeping: identity, watermark, the on/off switch and the per-document ledger.
  It is decided here like `IdGenerator` was.
- **Sync merges on the device, and only concurrent edits merge** (progress.md D69, Gate B). `syncNow`
  finds dirty records by hashing each one against the ledger, pulls first, then pushes with base
  revisions. A stale base comes back as a conflict. `mergeRecord` (`src/sync/merge.ts`) is the one
  merge rule, used by sync and import alike:
  - schedule: **the lower Leitner box wins**;
  - session: the completed copy wins;
  - setting: the local value wins;
  - attempt: immutable.

  **A pulled document at or below the ledger's revision is skipped**: it is the device's own echo,
  and merging it would let an older copy win. **`settle` judges a pulled copy against the device's
  live record, not the snapshot the sync read before its network call** (`readRecord`), so an
  answer made mid-sync merges instead of vanishing (progress.md D75). **A pair redeem that fails in
  transit sets `accountUnconfirmed` and nothing else**, because the server may or may not have moved
  the device. The next sync asks, through idempotent registration, and resets the ledger only if the
  account really changed (D74). Never reset on a failure that might not have reached the server: every
  record would merge as concurrent, and other devices' newer work would roll back. Both were found by the sync simulator in
  `@palier/testing` (D76). `AttemptStore.recent` returns the highest ids, oldest first, compared by
  code unit, in every implementation (D73). Sync failure is an outcome (`unavailable`, `removed`),
  never a throw into study (§11). Registration waits for the first completed session (§9.3).
- **The export document carries no key-vault content** — no API key, no device secret
  (`use-cases/export-document.ts`). An export is a file users share; the key stays in the
  browser [R12] and the secret is a sync credential. **`importData` merges by `mergeRecord`**,
  treating every record already present as a concurrent edit, since a file has no causal history
  (progress.md D69, superseding D62's keep-local rule). **`wipeData` keeps the device secret** (D50).
  `deleteEverywhere` deletes the server copy *first*, and wipes nothing local if that fails.
- **Two trend readouts, each named for its evidence.** `diagnosticReadout` reads diagnostic
  attempts only (D47); `practiceTrend` reads drill, review and diagnostic attempts and **never exam
  attempts**, because the readiness card keeps the exam result and the practice trend visually
  distinct (§8.2, progress.md D64). Do not merge them behind a flag. `progressReport` holds the
  same line over the **whole** practice record (`AttemptStore.all()`), and `reviewQueue` resolves
  what is due now across both skills (D66).
- **Use cases live under `src/use-cases/`**, one file per use case, each a plain async
  function `(request, deps)` where `deps` are the collaborators the composition root supplies.
  They are **pure orchestration**: read the ports, call one or more engine functions, return a
  domain/engine value. The D32 bridge lives here — a use case reads `clock.now()` / `random.next`
  and hands the engine the primitives `now: string` / `() => number`, never the ports. The
  study parameters an engine function needs and no port vends arrive in the `request`, not from
  `SettingsStore` or a deferred store (progress.md D36). `buildUseCases` — the binding of use
  cases to concrete ports — lives in the composition root (`apps/web/src/lib/container.ts`, §3.5),
  not here.
- **Configuration is a dep; study parameters are a request field** (progress.md D42). An
  `ExamProfile` is configuration the composition root owns and every use case sees the same
  one, so it is in `deps`. A skill, a target band or a session size differs per call, so it is
  in the `request`. The line matters because both are "not a port", and D36 only settled half
  of it.
- **A use case never mints an id.** `@palier/domain`'s `ids.ts` says it plainly: "the adapters
  mint; domain only names." An `attemptId` arrives in the request (D39). The `Random` port is
  specifically *not* an entropy source — it is a seeded mulberry32 wired in production (§3.5),
  so minting from it would give two devices one id stream, and an `AttemptStore` treats a
  duplicate id as a silent no-op. That would be attempt loss, not an error, and it would break
  the claim sync rests on (ADR 16, `architecture.md` §9.4). `append` returns whether the id was
  new precisely so that no-op stays *silent to the store but visible to the use case*, which is
  what lets `answerItem` guard its non-idempotent follow-on writes (D44).
- **Unit-tested with local port stubs, not `@palier/testing`** (progress.md D37). The sync tests'
  stateful stubs, including a small revisioned server, live in `src/use-cases/__tests__/sync-fakes.ts`,
  outside the build and coverage. `@palier/testing`
  depends on `@palier/app`, so importing it here would make Turborepo's build graph cyclic — the
  same cycle `@palier/engine` sidesteps. A use-case test builds small inline stubs (a fixed clock,
  a seeded random, stores returning set arrays, items built from `@palier/domain`) and asserts the
  orchestration; the "graph from `@palier/testing`" happens at the composition root, in `apps/web`.
  Every error path and guard clause covered. 95% branch (§6.3).

## The three mistakes most likely to be made here

1. **Importing an adapter** to "just use Dexie here". Depend on the port.
2. **Calling `Date.now()` in a use case** instead of the injected `Clock`.
3. **Writing an algorithm here** that belongs in `@palier/engine` — a pure function over
   plain data goes one layer down, where it is exhaustively tested.
