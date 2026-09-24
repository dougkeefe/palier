import { describe, expect, it } from "vitest";

import { BankContentError, BankError, BankUnavailableError, httpBankRepository } from "./index.js";

describe("@palier/adapters/bank surface", () => {
  it("exposes the repository factory with every port method", () => {
    const repo = httpBankRepository({ baseUrl: "http://bank.test" });

    for (const method of ["byIds", "query", "passage", "form", "scenario", "bankVersion"] as const) {
      expect(typeof repo[method]).toBe("function");
    }
  });

  it("exposes our error types, all extending Error via BankError", () => {
    expect(new BankUnavailableError("x")).toBeInstanceOf(BankError);
    expect(new BankContentError("x")).toBeInstanceOf(BankError);
    expect(new BankError("x")).toBeInstanceOf(Error);
    expect(new BankUnavailableError("x").name).toBe("BankUnavailableError");
  });
});
