import {
  aiProviderContract,
  attemptStoreContract,
  itemRepositoryContract,
  keyVaultContract,
  scheduleStoreContract,
  sessionStoreContract,
  settingsStoreContract,
  syncStateStoreContract,
  syncTransportContract,
} from "../contracts/index.js";
import {
  fakeAiProvider,
  memoryAttemptStore,
  memoryItemRepository,
  memoryKeyVault,
  memoryScheduleStore,
  memorySessionStore,
  memorySettingsStore,
  memorySyncServer,
  memorySyncStateStore,
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
settingsStoreContract("memory", () => Promise.resolve(memorySettingsStore()));
keyVaultContract("memory", () => Promise.resolve(memoryKeyVault()));
aiProviderContract("fake", () => Promise.resolve(fakeAiProvider()));
syncStateStoreContract("memory", () => Promise.resolve(memorySyncStateStore()));
syncTransportContract("memory", () => Promise.resolve(memorySyncServer().transport));
