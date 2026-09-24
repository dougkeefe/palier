import { createHash, createHmac } from "node:crypto";

import { PAIR_CODE_ALPHABET, PAIR_CODE_LENGTH } from "@palier/app";

/**
 * The server's handful of cryptographic chores (architecture.md §9.3, §11; ADR 21).
 *
 * **Device secrets are hashed with SHA-256, not Argon2id** (human decision, progress.md
 * D70). A slow, salted hash exists to make *guessing* a low-entropy password expensive.
 * A device secret is 256 bits from `crypto.getRandomValues`, so there is nothing to
 * guess, and a plain SHA-256 is what high-entropy bearer tokens use everywhere (API keys,
 * session tokens). Unsalted, the hash can be indexed, so the bearer alone finds its
 * device, with no per-request CPU cost and no native dependency.
 */

/** A device secret as the vault mints it: 64 hex characters (D50). */
const SECRET_SHAPE = /^[0-9a-f]{64}$/;

export const isDeviceSecret = (value: string): boolean => SECRET_SHAPE.test(value);

export const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

/**
 * A six-character pairing code from `PAIR_CODE_ALPHABET`, drawn by rejection sampling
 * so every character is equally likely. The alphabet has 31 letters, and a byte taken
 * modulo 31 would favour the first few.
 */
export const pairCodeFrom = (randomBytes: (n: number) => Uint8Array): string => {
  const limit = 256 - (256 % PAIR_CODE_ALPHABET.length);
  let code = "";
  while (code.length < PAIR_CODE_LENGTH) {
    for (const byte of randomBytes(PAIR_CODE_LENGTH)) {
      if (byte < limit && code.length < PAIR_CODE_LENGTH) code += PAIR_CODE_ALPHABET[byte % PAIR_CODE_ALPHABET.length];
    }
  }
  return code;
};

/**
 * The rate-limit key for one caller on one route (architecture.md §11: "rate limiting by
 * IP hash"). An HMAC under a server secret, with the UTC day mixed in, so the stored key
 * is neither the IP nor a stable pseudonym for it: tomorrow's key for the same address is
 * unrelated to today's (§12: no IP in any durable store).
 */
export const rateLimitKey = (salt: string, route: string, ip: string, now: Date): string =>
  createHmac("sha256", salt).update(`${now.toISOString().slice(0, 10)}|${route}|${ip}`).digest("hex");
