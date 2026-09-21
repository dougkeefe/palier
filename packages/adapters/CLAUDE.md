# @palier/adapters

Every concrete adapter, one directory and one subpath export each: `/dexie`, `/bank`,
`/openai`, `/sync`, `/vault` (§3.2) — plus `/ids`, the id generator, which §3.2 does not name
(progress.md D48). A subpath lands with its adapter, not before — an entry resolving to an
empty module asserts a boundary with nothing behind it (D3). **`/ids` is the first, and is
live:** `./ids` → `webCryptoIdGenerator` (a monotonic Crockford-base32 ULID over Web Crypto,
no npm dependency). The remaining five stay unexported until they land.

**May import** `@palier/app`, `@palier/domain`. **Never another adapter directory** — that
ban is the boundary §3.2 actually wanted, enforced by path in `.dependency-cruiser.cjs`
(`no-cross-adapter-imports`). `openai` lives in `src/openai` and `dexie` in `src/dexie`,
nowhere else. Each directory is its own `eslint-plugin-boundaries` element (D5 split began
with `adapters-ids`), so `no-unknown-files` keeps classifying files as the package fills.

## Invariants

- **Translate at the edge.** Vendor payloads, types and errors stop here and leave as ours
  (§2.4). Every AI response is Zod-parsed before return, even when the provider promises
  structured output (`architecture.md` §8.2).
- **No use case logic.** An adapter deciding *what should happen* belongs in `@palier/app`.
- **Every adapter passes its port's contract suite** from `@palier/testing` (§6.2 tier 3,
  ADR 10) — and that is not sufficient. 90% branch (§6.3).

## The three mistakes most likely to be made here

1. **Letting an SDK type escape** through a return value or a thrown error. No gate catches
   this; the reviewer has to.
2. **Treating the contract suite as enough.** It proves substitutability only. Retry,
   backoff, watermarks, error translation and every migration need their own tests (§10).
3. **Importing a sibling adapter** for a shared helper. Lift it to `app` or duplicate it.
