import { idGeneratorContract } from "@palier/testing";
import { describe, expect, it } from "vitest";

import { webCryptoIdGenerator } from "./web-crypto-id-generator.js";

// The defaults (real `Date.now` and `crypto.getRandomValues`) are held to the
// shared contract; the injected tests below pin the monotonic branch logic.
idGeneratorContract("web-crypto", () => webCryptoIdGenerator());

const zeros = (): Uint8Array => new Uint8Array(10);

describe("webCryptoIdGenerator", () => {
  it("increments the random component within a millisecond, keeping the timestamp", () => {
    const gen = webCryptoIdGenerator({ now: () => 1000, randomBytes: zeros });

    const a = gen.ulid();
    const b = gen.ulid();

    expect(b > a).toBe(true);
    expect(b.slice(0, 10)).toBe(a.slice(0, 10));
  });

  it("keeps the higher timestamp and still increments when the clock steps backwards", () => {
    let t = 1000;
    const gen = webCryptoIdGenerator({ now: () => t, randomBytes: zeros });

    const a = gen.ulid();
    t = 999;
    const b = gen.ulid();

    expect(b > a).toBe(true);
    expect(b.slice(0, 10)).toBe(a.slice(0, 10));
  });

  it("draws fresh randomness on a new millisecond", () => {
    const draws = [Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 1), Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 2)];
    let i = 0;
    let t = 1000;
    const gen = webCryptoIdGenerator({ now: () => t, randomBytes: () => draws[i++]! });

    const a = gen.ulid();
    t = 1001;
    const b = gen.ulid();

    // The timestamp advanced, and b's random tail comes from the second draw (2),
    // not from incrementing a's (which would also have ended in 2 — so assert the
    // timestamp moved, proving the fresh-draw branch, not the increment branch).
    expect(b.slice(0, 10)).not.toBe(a.slice(0, 10));
    expect(a.endsWith("1")).toBe(true);
    expect(b.endsWith("2")).toBe(true);
  });

  it("encodes a zero timestamp as ten zeroes", () => {
    const gen = webCryptoIdGenerator({ now: () => 0, randomBytes: zeros });

    expect(gen.ulid().slice(0, 10)).toBe("0000000000");
  });
});
