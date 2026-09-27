import { describe, expect, it } from "vitest";

import { StorageQuotaError } from "./oral-store.js";

describe("StorageQuotaError", () => {
  it("names itself, so a caller across a bundle boundary can tell it apart", () => {
    const error = new StorageQuotaError();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("StorageQuotaError");
    expect(error.message).toMatch(/no room/);
  });
});
