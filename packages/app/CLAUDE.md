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
- **Ports are transcribed from §3.3, not invented.** Seven live under `src/ports/`:
  `ItemRepository`, `AttemptStore`, `ScheduleStore`, `SettingsStore`, `KeyVault`, `Clock`,
  `Random`. `SessionStore` and `OralStore` (no §3.3 signature) and the
  `AiProvider`/`SyncTransport`/`TelemetrySink` trio (need net-new domain types) are deferred
  to their own sessions — deciding them is a decision to record, not a gap to fill quietly.
  `ISO`, `ScheduleEntry` and `ItemCriteria` are named-but-unspecified by §3.3 and were
  decided here (progress.md D18–D20); `ScheduleEntry` is minimal until the scheduler lands.
- **Use cases live under `src/use-cases/`**, one file per use case, each a plain async
  function `(request, deps)` where `deps` are the collaborators the composition root supplies.
  They are **pure orchestration**: read the ports, call one or more engine functions, return a
  domain/engine value. The D32 bridge lives here — a use case reads `clock.now()` / `random.next`
  and hands the engine the primitives `now: string` / `() => number`, never the ports. The
  study parameters an engine function needs and no port vends arrive in the `request`, not from
  `SettingsStore` or a deferred store (progress.md D36). `buildUseCases` — the binding of use
  cases to concrete ports — lives in the composition root (`apps/web/src/lib/container.ts`, §3.5),
  not here.
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
