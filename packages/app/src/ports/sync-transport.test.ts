import { describe, expect, it } from "vitest";

import {
  PAIR_CODE_ALPHABET,
  PairCodeRejectedError,
  SyncUnauthorizedError,
  SyncUnavailableError,
  normalizePairCode,
} from "./sync-transport.js";

describe("normalizePairCode", () => {
  it("accepts what a person types: any case, with spaces or a dash", () => {
    expect(normalizePairCode("abc def")).toBe("ABCDEF");
    expect(normalizePairCode(" k7m-p2q ")).toBe("K7MP2Q");
  });

  it("refuses the wrong length before a request is spent on it", () => {
    expect(normalizePairCode("ABCDE")).toBeNull();
    expect(normalizePairCode("ABCDEFG")).toBeNull();
  });

  it("refuses the look-alikes the alphabet leaves out: 0, O, 1, I, L", () => {
    for (const c of ["0", "O", "1", "I", "L"]) {
      expect(PAIR_CODE_ALPHABET).not.toContain(c);
      expect(normalizePairCode(`ABCDE${c}`)).toBeNull();
    }
  });
});

describe("the sync errors", () => {
  it("name themselves, so a caller across a bundle boundary can tell them apart", () => {
    expect(new SyncUnavailableError("offline")).toMatchObject({ name: "SyncUnavailableError", reason: "offline" });
    expect(new SyncUnauthorizedError().name).toBe("SyncUnauthorizedError");
    expect(new PairCodeRejectedError().name).toBe("PairCodeRejectedError");
  });
});
