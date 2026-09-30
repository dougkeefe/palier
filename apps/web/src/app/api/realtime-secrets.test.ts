import { routeRealtimeSecrets } from "@palier/adapters/openai";
import { CONTRACT_REALTIME_KEYS, realtimeSecretSourceContract } from "@palier/testing";
import { vi } from "vitest";

import { createRealtimeSecretApi } from "../../server/realtime-handlers";
import { routeFetch } from "./__tests__/route-fetch";

/**
 * The browser's realtime secret source held to `realtimeSecretSourceContract` **through the real
 * route file and handler** (progress.md D169), over the memory source the hermetic server uses.
 * This ties the route client's reading of the route's answers and refusals to the route itself.
 */
vi.mock("../../server/realtime", async () => {
  const { memoryRealtimeSecretSource } = await import("@palier/testing/in-memory");
  const api = createRealtimeSecretApi({ secrets: memoryRealtimeSecretSource({ refuses: [CONTRACT_REALTIME_KEYS.refused] }) });
  return { realtimeSecretApi: () => api };
});

realtimeSecretSourceContract("route, through the route handler", async () => {
  const fetchImpl = await routeFetch();
  return routeRealtimeSecrets({ path: "http://palier.test/api/realtime/secret", fetchImpl: fetchImpl as never });
});
