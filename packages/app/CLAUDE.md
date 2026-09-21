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
- **Unit-tested with local port stubs, not `@palier/testing`** (progress.md D37). `@palier/testing`
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
