# @palier/adapters

Every concrete adapter, one directory and one subpath export each: `/dexie`, `/bank`,
`/openai`, `/sync`, `/vault` (§3.2). The subpaths land with the first real adapter, not
before — five entries resolving to five empty modules assert a boundary with nothing
behind it (D3).

**May import** `@palier/app`, `@palier/domain`. **Never another adapter directory** — that
ban is the boundary §3.2 actually wanted, enforced by path in `.dependency-cruiser.cjs`.
`openai` lives in `src/openai` and `dexie` in `src/dexie`, nowhere else.

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
