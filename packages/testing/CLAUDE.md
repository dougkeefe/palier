# @palier/testing

In-memory implementations of every port, the port contract suites, fixture builders, a
seeded `Random`, a `FakeClock`, a deterministic `counterIdGenerator` (the `IdGenerator`
counterpart to `seededRandom`/`fakeClock`, so a hermetic run is reproducible — D48), the
canonical 60-item fixture bank (§3.2), and the MSW handlers — including `bankHandlers`, which
serves an `ItemRepositoryBank` as the manifest + content-hashed shards the real bank ships, so the
HTTP bank adapter is held to the same `itemRepositoryContract` the in-memory repo passes (it
re-implements the factory's `buildBank` grouping, since this package may not import the factory).
`openAiHandlers({ mode })` stand in for OpenAI's models endpoint in each state a key check can end in
(ok, 401, 429, 500, malformed, never answers; progress.md D99), with an `onAuthorization` spy, and for
chat completions, answering a scripted `completions` list in turn (the last repeating) with its `usage`
block, so a retry and the ledger can be driven through the real adapter (D101). `memoryCostLedger` and
`costLedgerContract` follow the `CostLedger` port. The
in-memory `KeyVault` keeps D98's two modes apart as the Dexie vault does. The sync pieces are:
- `memorySyncServer`, the whole sync service in memory: revisions, pairing, revocation, and a
  `transport(secret)` per device;
- `memorySyncStateStore`;
- `syncTransportContract` and `syncStateStoreContract`;
- `syncHandlers`, which serves a memory server over the sync wire protocol for the HTTP adapter. It is
  a deliberate second copy of the route handlers' protocol, checked by `apps/web` running the same
  contract against the real handlers (progress.md D69);
- **the sync simulator** (`src/simulator/`, tier 5, progress.md D76): `runSyncSimulation` drives two or
  three `simulatedDevice`s — the real `@palier/app` use cases over the memory stores — through a seeded
  `simulatedNetwork` that holds, reorders, drops and partitions calls, then checks the `oracle.ts`
  properties after every heal. The server is a parameter (`memorySimulatedServer`, or the real handlers
  on PGlite from `apps/web`), and so is the exam profile. `SEEDS_PER_LANE` and `REGRESSION_SEEDS` live in
  `seeds.ts`; the volume run is `simulator.integration.test.ts` in the gated `integration-testing` project.
  **Every phase after chaos draws from its own seeded stream** (`seed + n`), so a new phase goes at the
  end and leaves every earlier script, and so every regression seed, as it was. The last phase sits one
  mock exam on every device across a partition (progress.md D80). Its `unsubmittedRuns` check is judged
  from what the devices did, not from `mergeRecord`. The partition oracle folds by `mergeRecord` itself,
  so it cannot see a wrong merge rule; a rule-independent check can.

Test infrastructure as a package, so a use case test runs in milliseconds with no mocking framework.

**May import** `@palier/app`, `@palier/domain`. `vitest` is a **peer** dependency because
the contract suites call `describe` at module scope; `msw`, `@electric-sql/pglite` and
`fake-indexeddb` are real dependencies because this package *exports* those harnesses.

## Invariants

- **Production code never imports this package; test files may.** The arrow rules are
  generated twice for exactly that reason, and no further (D10) — an adapters *test*
  importing `@palier/ui` still fails.
- **Contract suites are exported functions** taking a name and a factory, so one suite runs
  against the in-memory and the real implementation. That is the whole return on the ports
  layer (ADR 10, §6.2 tier 3).
- **Nothing here reads the system clock or calls `Math.random`** (§6.4).
- **Do not invent a port §3.3 has not specified.** The ports now come from `@palier/app`;
  the in-memory impls and contract suites import them from there (`ports.stub.ts` is gone).
  A store that needs a port §3.3 omits — now only `OralStore` — waits for it to land
  in `@palier/app` rather than being stubbed here. (`ExamRunStore` has landed: `memoryExamRunStore`,
  `examRunStoreContract` and `anExamRun`, progress.md D80. `SessionStore` has landed:
  `memorySessionStore` and `sessionStoreContract` exist, progress.md D45. `IdGenerator`
  likewise: `counterIdGenerator` and `idGeneratorContract`, D48 — the Web Crypto adapter in
  `@palier/adapters/ids` is held to the same contract. `SyncTransport` and `SyncStateStore`
  likewise, D69. The telemetry ports likewise, D92: `memoryTelemetryStore`, `memoryTelemetryCollector`
  (whose `sink` is the memory `TelemetrySink`), `telemetryStoreContract`, `telemetrySinkContract` and
  `telemetryHandlers`. `syntheticTelemetry` is the seeded set behind Phase 3 exit criterion 3: a too-easy
  item and a reversed key among twenty ordinary ones.)

## The five mistakes most likely to be made here

1. **A fixture builder setting an optional key to explicit `undefined`.** Omit it —
   `exactOptionalPropertyTypes` and the JSON round-trip test both object (D14).
2. **A contract suite asserting an implementation detail.** If only the in-memory version
   can pass it, it is the wrong assertion.
3. **An `exports` entry with nothing behind it** (D3). Four exist: the root,
   `./in-memory`, `./msw/browser`, `./setup`.
4. **Importing vitest, msw, PGlite or Node core from anything `./in-memory` reaches.** That
   subpath is what `apps/web`'s composition root bundles into the browser (D59). A test walks
   its module graph and fails on any package but `@palier/app`/`@palier/domain`. The simulator
   uses Node's `setImmediate`, so it is exported from the root entry only.
5. **Snapshotting a simulated device's store to judge its own edits.** A sync that overwrote an
   answer leaves the store looking consistent. A lone device's side of a partition is what its
   answers wrote (`sideOf`), which is why the simulator records answer writes (D76).
