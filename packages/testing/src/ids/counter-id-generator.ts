import type { IdGenerator } from "@palier/app";

/**
 * A deterministic `IdGenerator`, the counterpart to `seededRandom` and
 * `fakeClock`: "no test reads the system clock or calls `Math.random`"
 * (implementation-plan.md §6.4), and neither may it mint a real ULID, or a
 * hermetic Playwright run would not be reproducible.
 *
 * It satisfies the same `idGeneratorContract` as the Web Crypto adapter — valid
 * 26-character Crockford base32, unique, strictly increasing — by encoding a
 * plain incrementing counter into the low bits of the ULID's random component
 * over a fixed timestamp. The strings therefore rise in lock-step with the call
 * order, which is exactly what a test wants to assert against.
 */

/** Crockford base32: the ULID alphabet, minus I, L, O and U. */
const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TIME_LEN = 10;
const RANDOM_LEN = 16;

/** Big-endian Crockford base32 of a non-negative bigint, fixed to `len` chars. */
const encode = (value: bigint, len: number): string => {
  let remaining = value;
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out = ENCODING[Number(remaining % 32n)] + out;
    remaining /= 32n;
  }
  return out;
};

/** The fixed timestamp component, so only the counter varies (deterministic). */
const FIXED_TIME = encode(0n, TIME_LEN);

/**
 * @param seed the counter's starting value, so two generators can produce
 * distinct, non-overlapping streams when a test needs that. Defaults to 0.
 */
export const counterIdGenerator = (seed = 0): IdGenerator => {
  let counter = BigInt(seed);
  return {
    ulid: () => {
      const id = FIXED_TIME + encode(counter, RANDOM_LEN);
      counter += 1n;
      return id;
    },
  };
};
