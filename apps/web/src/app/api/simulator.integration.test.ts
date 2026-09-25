import { fileURLToPath } from "node:url";

import { httpSyncTransport } from "@palier/adapters/sync";
import type { Clock } from "@palier/app";
import { runSyncSimulation, simulationSeeds } from "@palier/testing";
import { parseExamProfileOrThrow } from "@palier/domain";
import profileJson from "@palier/content/profiles/psc-sle.json";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { resetDatabase } from "../../server/__tests__/reset";
import { pgliteDatabase } from "../../server/db";
import { drizzleSyncRepository } from "../../server/drizzle-repository";
import { type SyncApi, createSyncApi } from "../../server/handlers";
import { routeFetch } from "./__tests__/route-fetch";

/**
 * The sync simulator (implementation-plan.md §6.2 tier 5: "virtual devices against a
 * PGlite backend") against the real server: every device's calls go through the HTTP
 * adapter, the route files, the handlers and Drizzle to PGlite with the committed
 * migrations. The in-memory server runs the same simulation at far greater volume in
 * `@palier/testing`; this run is what holds that server's semantics to the real one.
 *
 * Each device presents its own address, as separate browsers would, so the per-IP rate
 * limits (ADR 21) apply per device; and the server runs on the simulation's clock.
 */
const state = vi.hoisted(() => ({ api: null as SyncApi | null }));
vi.mock("../../server/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../server/db")>()),
  syncApi: () => Promise.resolve(state.api),
}));

const MIGRATIONS = fileURLToPath(new URL("../../../drizzle", import.meta.url));
const profile = parseExamProfileOrThrow(profileJson);
const PER_LANE = { medium: 100, nightly: 2_000 };
const count = Number(process.env.PALIER_SIM_SEEDS_PGLITE ?? PER_LANE[process.env.CI_LANE === "nightly" ? "nightly" : "medium"]);
let database: Awaited<ReturnType<typeof pgliteDatabase>>;

beforeAll(async () => {
  database = await pgliteDatabase(MIGRATIONS);
});
afterAll(async () => {
  await database.close();
});

const realServer = async (clock: Clock) => {
  await resetDatabase(database.db);
  state.api = createSyncApi({
    repo: drizzleSyncRepository(database.db),
    now: () => new Date(clock.now()),
    randomBytes: (n) => crypto.getRandomValues(new Uint8Array(n)),
    rateLimitSalt: "salt",
  });
  const routes = await routeFetch();
  let devices = 0;
  return {
    transport: (secret: string) => {
      const address = `10.0.0.${String(++devices)}`;
      return httpSyncTransport({
        baseUrl: "http://palier.test",
        credentials: () => Promise.resolve(secret),
        fetchImpl: (url, init) => routes(url, { ...init, headers: { ...init.headers, "x-forwarded-for": address } }),
        retryDelayMs: 0,
      });
    },
  };
};

describe("sync simulator over the real route handlers (Drizzle on PGlite)", () => {
  it(`holds every convergence property on ${String(count)} seeds`, async () => {
    const failing: string[] = [];
    for (const seed of simulationSeeds(count)) {
      const devices = seed % 2 === 0 ? 2 : 3;
      const { violations } = await runSyncSimulation({ seed, devices, profile, server: realServer });
      for (const v of violations) failing.push(`seed ${String(seed)} (${String(devices)} devices): ${v.check} on ${v.device}, ${v.detail}`);
    }

    expect(failing).toEqual([]);
  }, 0);
});
