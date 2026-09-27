/**
 * The browser-safe subset of this package: the in-memory ports, the fixture bank, the
 * fake clock, the seeded `Random`, the counter id generator and the hermetic flag.
 *
 * It exists because `apps/web`'s composition root is now constructed **in the browser**
 * (its production path wires Dexie, which needs IndexedDB), and the root entry point is
 * not bundleable there: it re-exports the contract suites, which call vitest's
 * `describe` at module scope, plus `mswServer` (`msw/node`) and the PGlite harness.
 * Everything re-exported here imports `@palier/app` and `@palier/domain` and nothing
 * else — no vitest, no msw, no PGlite, no Node core — so a bundler can take it
 * (progress.md D59).
 *
 * The root entry point still re-exports all of these, so no existing import moves.
 */
export { fakeClock } from "../clock/fake-clock.js";
export type { Clock, FakeClock, ISO } from "../clock/fake-clock.js";
export { seededRandom } from "../random/seeded-random.js";
export type { Random } from "../random/seeded-random.js";
export { counterIdGenerator } from "../ids/counter-id-generator.js";
export { HERMETIC_ENV_FLAG, isHermetic } from "../hermetic.js";
export { FIXTURE_BANK, fixtureBankRepository } from "../fixtures/bank.js";
export {
  memoryAttemptStore,
  memoryCostLedger,
  memoryExamRunStore,
  memoryItemRepository,
  memoryKeyVault,
  memoryScheduleStore,
  memorySessionStore,
  memorySettingsStore,
  memorySyncServer,
  memorySyncStateStore,
  memoryTelemetryCollector,
  memoryTelemetryStore,
  memoryWritingStore,
  memoryGeneratedItemStore,
} from "../memory/index.js";
export type { MemoryBank, MemorySyncServer, MemoryTelemetryCollector } from "../memory/index.js";
