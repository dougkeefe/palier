import type { IdGenerator } from "@palier/app";

/**
 * The first concrete adapter (§3.2, progress.md D39/D48): a ULID generator over
 * Web Crypto. It mints the identifiers nothing else in the system may — not the
 * seeded `Random`, which is a reproducible selection source, never entropy
 * (`architecture.md` §9.4, ADR 16).
 *
 * A ULID is a 48-bit millisecond timestamp followed by 80 bits of randomness,
 * Crockford base32, 26 characters, lexicographically sortable by creation time.
 * This implementation is **monotonic within a millisecond**: when two calls land
 * in the same millisecond (or the clock steps backwards), it reuses the high
 * timestamp and increments the random component by one, so the strings a burst of
 * calls produces are strictly increasing. Attempt ordering depends on that
 * (`AttemptStore` returns in insertion order, and `calculateTrend` sorts by id/ts).
 *
 * No npm dependency: `crypto.getRandomValues` is present in Node 20+ and every
 * browser. `now`/`randomBytes` are injectable so the monotonic path is
 * deterministically testable; production takes the defaults.
 */

/** Crockford base32: the ULID alphabet, with I, L, O and U removed. */
const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TIME_LEN = 10;
const RANDOM_LEN = 16;

const defaultRandomBytes = (n: number): Uint8Array => {
  const bytes = new Uint8Array(n);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
};

/** Big-endian Crockford base32 of a non-negative integer, fixed to `len` chars. */
const encodeTime = (time: number): string => {
  let value = time;
  let out = "";
  for (let i = 0; i < TIME_LEN; i += 1) {
    out = ENCODING[value % 32] + out;
    value = Math.floor(value / 32);
  }
  return out;
};

/**
 * Big-endian Crockford base32 of an 80-bit value, fixed to `RANDOM_LEN` chars.
 * Taking exactly 16 chars means an incremented value wraps in the encoding rather
 * than growing a 17th character — the only way past it is 2^80 ids in one
 * millisecond, which is unreachable, so there is no overflow branch to test.
 */
const encodeRandom = (random: bigint): string => {
  let value = random;
  let out = "";
  for (let i = 0; i < RANDOM_LEN; i += 1) {
    out = ENCODING[Number(value % 32n)] + out;
    value /= 32n;
  }
  return out;
};

const randomEightyBits = (randomBytes: (n: number) => Uint8Array): bigint => {
  let value = 0n;
  for (const byte of randomBytes(10)) value = (value << 8n) | BigInt(byte);
  return value;
};

export type WebCryptoIdGeneratorOptions = {
  readonly now?: () => number;
  readonly randomBytes?: (n: number) => Uint8Array;
};

export const webCryptoIdGenerator = (options: WebCryptoIdGeneratorOptions = {}): IdGenerator => {
  const now = options.now ?? (() => Date.now());
  const randomBytes = options.randomBytes ?? defaultRandomBytes;

  let lastTime = -1;
  let lastRandom = 0n;

  return {
    ulid: () => {
      const time = now();
      let stamp: number;
      if (time <= lastTime) {
        // Same millisecond or a backward step: keep the high timestamp and
        // increment the random component, so the id strictly increases.
        stamp = lastTime;
        lastRandom += 1n;
      } else {
        stamp = time;
        lastTime = time;
        lastRandom = randomEightyBits(randomBytes);
      }
      return encodeTime(stamp) + encodeRandom(lastRandom);
    },
  };
};
