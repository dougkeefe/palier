import {
  aiProviderContract,
  attemptStoreContract,
  costLedgerContract,
  examRunStoreContract,
  itemRepositoryContract,
  keyVaultContract,
  scheduleStoreContract,
  sessionStoreContract,
  settingsStoreContract,
  syncStateStoreContract,
  syncTransportContract,
  telemetrySinkContract,
  telemetryStoreContract,
  writingStoreContract,
  generatedItemStoreContract,
  oralStoreContract,
  oralTransportContract,
} from "../contracts/index.js";
import {
  fakeAiProvider,
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
  memoryOralStore,
  memoryOralTransport,
} from "./index.js";

/**
 * The in-memory implementations held to the same contract the real adapters
 * will be. Running them here is what stops the suites rotting before phase 2
 * has anything to point them at (implementation-plan.md 6.2, tier 3), and it is
 * the phase 0 exit criterion "the port contract suites exist and pass against
 * the in-memory implementations".
 */
attemptStoreContract("memory", () => Promise.resolve(memoryAttemptStore()));
itemRepositoryContract("memory", (bank) => Promise.resolve(memoryItemRepository(bank)));
scheduleStoreContract("memory", () => Promise.resolve(memoryScheduleStore()));
sessionStoreContract("memory", () => Promise.resolve(memorySessionStore()));
examRunStoreContract("memory", () => Promise.resolve(memoryExamRunStore()));
settingsStoreContract("memory", () => Promise.resolve(memorySettingsStore()));
keyVaultContract("memory", () => Promise.resolve(memoryKeyVault()));
aiProviderContract("fake", () => Promise.resolve(fakeAiProvider()));
syncStateStoreContract("memory", () => Promise.resolve(memorySyncStateStore()));
syncTransportContract("memory", () => Promise.resolve(memorySyncServer().transport));
telemetryStoreContract("memory", () => Promise.resolve(memoryTelemetryStore()));
telemetrySinkContract("memory", () => Promise.resolve(memoryTelemetryCollector()));
costLedgerContract("memory", () => Promise.resolve(memoryCostLedger()));
writingStoreContract("memory", () => Promise.resolve(memoryWritingStore()));
generatedItemStoreContract("memory", () => Promise.resolve(memoryGeneratedItemStore()));
oralStoreContract("memory", () => Promise.resolve(memoryOralStore()));
// Overlapping turns and a flag, as a full-duplex session would give them.
oralTransportContract("memory", () =>
  Promise.resolve(
    memoryOralTransport([
      { atMs: 2_000, kind: "turn", speaker: "examiner", text: "Parlez-moi de votre rôle.", startMs: 0, endMs: 2_000 },
      { atMs: 9_000, kind: "turn", speaker: "candidate", text: "Je suis analyste.", startMs: 1_800, endMs: 9_000 },
      { atMs: 9_500, kind: "difficulty", direction: "escalate" },
      { atMs: 12_000, kind: "turn", speaker: "examiner", text: "Et ensuite ?", startMs: 9_600, endMs: 12_000 },
    ]),
  ),
);
