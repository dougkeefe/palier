import { describe, expect, it } from "vitest";

import {
  ITEM_TYPE_REGISTRY_KEYS_MATCH,
  assertItemTypeRegistryComplete,
  registryKeysError,
} from "./item-types";

describe("item type registry composition (§4.5, ADR 17)", () => {
  it("confirms at compile time that both maps cover the ItemType union", () => {
    expect(ITEM_TYPE_REGISTRY_KEYS_MATCH).toBe(true);
  });

  it("accepts the real registry, whose definitions and renderers cover the union", () => {
    expect(() => {
      assertItemTypeRegistryComplete();
    }).not.toThrow();
  });

  it("returns null when definitions, renderers and types all agree", () => {
    expect(registryKeysError(["cloze", "error-id"], ["error-id", "cloze"], ["cloze", "error-id"])).toBeNull();
  });

  it("names the drift when a renderer is missing for a registered type", () => {
    const error = registryKeysError(["cloze", "error-id"], ["cloze"], ["cloze", "error-id"]);
    expect(error).toContain("renderers=[cloze]");
  });
});
