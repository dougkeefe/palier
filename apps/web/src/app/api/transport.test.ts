import { httpSyncTransport } from "@palier/adapters/sync";
import { syncTransportContract } from "@palier/testing";
import { vi } from "vitest";

import { memorySyncRepository } from "../../server/__tests__/memory-repository";
import { type SyncApi, createSyncApi } from "../../server/handlers";
import { routeFetch } from "./__tests__/route-fetch";

/**
 * The HTTP adapter held to `syncTransportContract` **through the real route files and
 * handlers**, over the in-memory repository (fast lane). The same run on PGlite is
 * `transport.integration.test.ts`. This is what ties `@palier/testing`'s `syncHandlers`
 * copy of the protocol to the real one (progress.md D69).
 */
const state = vi.hoisted(() => ({ api: null as SyncApi | null }));
vi.mock("../../server/db", () => ({ syncApi: () => Promise.resolve(state.api) }));

syncTransportContract("http through the route handlers (memory repository)", async () => {
  state.api = createSyncApi({
    repo: memorySyncRepository(),
    now: () => new Date(),
    randomBytes: (n) => crypto.getRandomValues(new Uint8Array(n)),
    rateLimitSalt: "salt",
  });
  const fetchImpl = await routeFetch();
  return (secret) =>
    httpSyncTransport({ baseUrl: "http://palier.test", credentials: () => Promise.resolve(secret), fetchImpl, retryDelayMs: 0 });
});
