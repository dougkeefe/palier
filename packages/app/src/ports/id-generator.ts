/**
 * Identifier minting, injected (progress.md D39, D48). A port §3.3 does not name:
 * it exists because nothing in the app may mint an id, yet `answerItem`,
 * `startSession` and every write to come need one.
 *
 * **Why this is a port and not `Random`.** `@palier/domain`'s `ids.ts` is plain
 * that "the adapters mint; domain only names", and the `Random` port is
 * emphatically *not* an entropy source — it is a seeded mulberry32 wired in
 * production (§3.5), so two devices would share one id stream. An `AttemptStore`
 * treats a duplicate ULID as a silent no-op, so a collision would be attempt loss,
 * not an error, and it would break the property that makes sync conflict-free
 * (ADR 16, `architecture.md` §9.4). So minting sits behind its own port, backed by
 * Web Crypto in `@palier/adapters/ids` and by a deterministic counter in
 * `@palier/testing`.
 *
 * **The shape is `ulid(): string`, content-agnostic (D48).** A ULID is a ULID
 * regardless of what it identifies, so the port mints the string and the caller
 * brands it with the right domain constructor (`attemptId(gen.ulid())`,
 * `sessionId(gen.ulid())`). That keeps the port from knowing about attempts or
 * sessions and scales to every future id kind without a new method. The returned
 * value is a Crockford base32 ULID — 26 characters, lexicographically sortable by
 * creation time, which is what attempt ordering relies on.
 */
export type IdGenerator = {
  ulid: () => string;
};
