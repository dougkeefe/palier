import { describe, expect, it } from "vitest";

describe("scratch: the fast lane fails on a failing test (D177)", () => {
  it("fails", () => {
    expect(1).toBe(2);
  });
});
