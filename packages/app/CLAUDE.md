# @palier/app

The port interfaces (`implementation-plan.md` §3.3) and the use cases that consume them.
Knows what the product does, nothing about how anything is stored, fetched or rendered.

**May import** `@palier/domain`, `@palier/engine`. Never an adapter, never React.

## Invariants

- **A port signature contains our types only.** No `openai`, `dexie` or `Response` type
  reaches this layer (§2.4); translating them is the adapter's whole job.
- **Use cases receive their collaborators.** `Clock`, `Random`, stores and providers are
  parameters supplied by the composition root (§3.5); nothing here constructs a concrete one.
- **`KeyVault.withApiKey` hands the key to a callback and never returns it** (§3.3). Do not
  add a `getApiKey` — the shape is the control (ADR 2, ADR 3).
- **Ports are transcribed from §3.3, not invented.** `SessionStore` and `OralStore` have no
  signatures there; deciding them is a decision to record, not a gap to fill quietly.
- Unit-tested against the in-memory ports from `@palier/testing`, every error path and
  guard clause included. 95% branch (§6.3).

## The three mistakes most likely to be made here

1. **Importing an adapter** to "just use Dexie here". Depend on the port.
2. **Calling `Date.now()` in a use case** instead of the injected `Clock`.
3. **Writing an algorithm here** that belongs in `@palier/engine` — a pure function over
   plain data goes one layer down, where it is exhaustively tested.
