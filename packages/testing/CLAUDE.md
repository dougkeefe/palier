# @palier/testing

In-memory implementations of every port, the port contract suites, fixture builders, a
seeded `Random`, a `FakeClock`, and the canonical 60-item fixture bank (§3.2). Test
infrastructure as a package, so a use case test runs in milliseconds with no mocking
framework.

**May import** `@palier/app`, `@palier/domain`. `vitest` is a **peer** dependency because
the contract suites call `describe` at module scope; `msw`, `@electric-sql/pglite` and
`fake-indexeddb` are real dependencies because this package *exports* those harnesses.

## Invariants

- **Production code never imports this package; test files may.** The arrow rules are
  generated twice for exactly that reason, and no further (D10) — an adapters *test*
  importing `@palier/ui` still fails.
- **Contract suites are exported functions** taking a name and a factory, so one suite runs
  against the in-memory and the real implementation. That is the whole return on the ports
  layer (ADR 10, §6.2 tier 3).
- **Nothing here reads the system clock or calls `Math.random`** (§6.4).
- **Do not invent a port §3.3 has not specified.** The ports now come from `@palier/app`;
  the in-memory impls and contract suites import them from there (`ports.stub.ts` is gone).
  A store that needs a port §3.3 omits — now only `OralStore` — waits for it to land
  in `@palier/app` rather than being stubbed here. (`SessionStore` has landed:
  `memorySessionStore` and `sessionStoreContract` exist, progress.md D45.)

## The three mistakes most likely to be made here

1. **A fixture builder setting an optional key to explicit `undefined`.** Omit it —
   `exactOptionalPropertyTypes` and the JSON round-trip test both object (D14).
2. **A contract suite asserting an implementation detail.** If only the in-memory version
   can pass it, it is the wrong assertion.
3. **An `exports` entry with nothing behind it** (D3). Three exist: the root,
   `./msw/browser`, `./setup`.
