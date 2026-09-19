# @palier/domain

Types, invariants, content schemas and the exam profile. The bottom of the
dependency graph (`implementation-plan.md` §3.1).

## May import

`zod`, and nothing else. No workspace package, no `node:*` core module, no
framework. `.dependency-cruiser.cjs` enforces all three.

## Invariants

- **No I/O and no async.** `parseExamProfile` takes an already-read value;
  reading the file belongs to an adapter or a build step. ESLint bans `async`,
  `await` and `Promise` in this package's source (§3.2).
- **No exam rule in code.** Item counts, time limits, cut scores, level
  descriptors and the taxonomies live in `content/profiles/*.json` (ADR 9); the
  Leitner intervals live there too (ADR 8). If you are about to type a number
  from `product-requirements.md` §5 into a `.ts` file, it belongs in the profile.
- **Bands are ordered by `BAND_RANK`, never alphabetically.** E is above C — it
  is the exemption level, not a failure. A `.sort()` on band letters silently
  puts E between C and X.
- **The hand-written type is the contract.** The Zod shape is checked against it
  by a `Equals<>` assertion in a `.test-d.ts`, so the two cannot drift. Optional
  fields carry `| undefined` because that is what `z.infer` produces under
  `exactOptionalPropertyTypes`; write them as absent keys, never as explicit
  `undefined`, or the JSON round-trip test will catch you.

## The three mistakes most likely to be made here

1. **Writing an async loader that reads a file.** It will fail lint and
   dependency-cruiser. The reading half goes in an adapter.
2. **Hard-coding a cut score or a review interval** instead of reading the
   profile (ADR 9, ADR 8).
3. **Hand-editing `docs/schemas/*.schema.json`.** Those files are generated
   *and* drift-checked by `src/__tests__/json-schema.test.ts`. Change the Zod
   schema, then run `pnpm run test -u`.

## Coverage

100% branch, enforced in `vitest.config.mts` (§6.3). Every rejection reason gets
its own test, because the content suite's error messages depend on them being
accurate.
