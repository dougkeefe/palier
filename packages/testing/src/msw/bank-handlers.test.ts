import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { CONTRACT_BANK } from "../contracts/item-repository.contract.js";
import { bankHandlers } from "./bank-handlers.js";
import { mswServer } from "./node.js";

const BASE = "http://bank.test";

beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  mswServer.resetHandlers();
});
afterAll(() => {
  mswServer.close();
});

const getJson = async (path: string): Promise<unknown> => (await fetch(`${BASE}/${path}`)).json();

describe("bankHandlers", () => {
  it("serves a manifest, one shard per lang+skill, passages, forms and scenarios", async () => {
    mswServer.use(...bankHandlers(CONTRACT_BANK, { baseUrl: BASE, version: 1 }));

    const manifest = (await getJson("bank/v1/manifest.json")) as {
      version: number;
      shards: readonly unknown[];
      passageShards: readonly unknown[];
      forms: readonly unknown[];
    };
    expect(manifest.version).toBe(7);
    expect(manifest.shards).toHaveLength(2); // fr/reading and fr/writing
    expect(manifest.passageShards).toHaveLength(1);
    expect(manifest.forms).toHaveLength(1);

    // The reading shard groups both reading items (exercises the existing-group path).
    expect((await getJson("bank/v1/fr/reading/fr-reading.json")) as unknown[]).toHaveLength(2);
    expect((await getJson("bank/v1/oral/scenarios.json")) as unknown[]).toHaveLength(1);

    const formId = CONTRACT_BANK.forms[0]?.id;
    expect(formId).toBeDefined();
    const form = (await getJson(`bank/v1/forms/${String(formId)}.json`)) as { id: string };
    expect(form.id).toBe(formId);
  });

  it("omits passage and item shards for an empty bank and 404s the scenarios file", async () => {
    mswServer.use(
      ...bankHandlers(
        { items: [], passages: [], forms: [], scenarios: [], bankVersion: 2 },
        { baseUrl: BASE, version: 1 },
      ),
    );

    const manifest = (await getJson("bank/v1/manifest.json")) as {
      shards: readonly unknown[];
      passageShards: readonly unknown[];
    };
    expect(manifest.shards).toHaveLength(0);
    expect(manifest.passageShards).toHaveLength(0);
    expect((await fetch(`${BASE}/bank/v1/oral/scenarios.json`)).status).toBe(404);
  });
});
