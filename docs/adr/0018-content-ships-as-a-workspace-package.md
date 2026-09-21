# ADR 18: Content ships as a workspace package

**Status:** Accepted
**Date:** 2026-09-20
**Supersedes:** None

## Context

Exam rules live in a data profile rather than in code (ADR 9), and that profile is
`content/profiles/psc-sle.json` — outside every package, because content is data the
factory writes and a content pull request changes (ADR 14). Until now nothing in the
application read it at runtime: the engine's tests read it off disk with `node:fs`,
which is fine in Node and impossible in a browser.

The first use case that needs it at runtime is `answerItem`, which cannot apply the
Leitner rule without the profile's four intervals (ADR 8). The composition root is where
it should be loaded and validated. But a relative import out of `apps/web` is exactly
what `.dependency-cruiser.cjs`'s `no-relative-escape` rule forbids — "cross-package
imports go through the package name, so they resolve through the exports map, which is
what declares a package's public surface" — and `.json` is in the cruiser's resolver
extension list, so the gate does see it. Verified by running it, not assumed.

Three options were weighed. A build-time copy into `apps/web/src/` under a drift-guard
test is the idiom `@palier/ui`'s `tokens.css` (D22) and `docs/schemas/` already use, but
it duplicates the one file ADR 9 makes canonical. Loading it through a Node-only
`@palier/testing` subpath leans on test infrastructure for a production-shaped concern.
Shipping it as a subpath of `@palier/domain` would put content inside a code package,
which is the arrangement ADR 14 separated.

## Decision

`content/` is a pnpm workspace, `@palier/content`, private, holding no code. It declares
one `exports` entry per artefact it publishes — today
`./profiles/psc-sle.json`. Consumers declare it as a dependency and import it by package
name, so it resolves through `node_modules` and the exports map like any other package.

## Consequences

Positive: one source of truth, no generated copy and no drift guard to maintain, no build
step, and the import satisfies `no-relative-escape` and `not-in-package-json` without a
rule exemption. It is also where the bank's JSON shards land in Phase 2
(`architecture.md` §5.3), so the mechanism pays forward. A new artefact means a new
`exports` entry, which keeps D3's principle: an entry always has real content behind it.

Negative: a seventh workspace directory, which reads at a glance as a seventh package.
It is not one. **ADR 10's six packages are the six *code* packages and all six are
unchanged**: `@palier/content` appears in no §3.1 arrow, has no `src`, no build, no
tests and no TypeScript project, and nothing may import code from it because it contains
none. The cost is the explanation — this paragraph — rather than any structure.

Also negative, and worth stating plainly: bundling the profile means a profile change
needs a redeploy, which is weaker than ADR 9's "a change is a content pull request rather
than a development task". Phase 2 closes that gap, because the bank adapter fetches
content over HTTP and caches it by content hash (`architecture.md` §5.3); the bundled
copy is the Phase 0/1 arrangement, not the end state.

## Revisit when

The bank adapter lands and content is fetched rather than bundled. At that point the
profile may follow the same path, and this package becomes the build input to the
published bank rather than a runtime import. If it ever needs a build step, tests or a
`src` directory, it has stopped being data and ADR 10 is the record to reopen.
