# Palier

pnpm + Turborepo monorepo. The architecture is specified in
`docs/implementation-plan.md` §3 and `docs/adr/0010-ports-and-adapters-six-packages.md`.

## Start here

**Read `docs/progress.md` before doing anything else.** It is the shared state between
agent sessions: what is built, what is in flight, and — the part you cannot reconstruct
from the code — which deviations from the plan were deliberate and why. Its working
agreement section says how to claim work and how to record what you did. Follow it.

## Layout

```
apps/web         Next.js app and composition root
apps/factory     content-pipeline CLI (placeholder)
packages/domain  types, invariants, profiles      — depends on nothing
packages/engine  pure algorithms                  — domain
packages/app     ports + use cases                — domain, engine
packages/adapters concrete adapters               — app, domain
packages/ui      design system                    — domain (types only)
packages/testing in-memory ports, fixtures        — app, domain
```

Dependencies point inward only. A package may not import anything it does not
declare in its own `package.json`; that is currently enforced by pnpm's strict
`node_modules` isolation, and will be enforced structurally by `dependency-cruiser`
in Phase 0 (§4).

## Rules

- **Named exports only.** The sole exception is Next.js file conventions
  (`page.tsx`, `layout.tsx`, `route.ts`, `next.config.ts`, …), which the framework
  resolves by default export. `apps/web/eslint.config.mjs` encodes the exhaustive
  exemption list.
- **`tsconfig.base.json` is the single source of compiler settings.** `strict`,
  `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are on everywhere and
  are not to be relaxed per-package.
- **Packages are ESM with `NodeNext` resolution**, so relative imports inside
  `packages/*` and `apps/factory` must carry the `.js` extension. `apps/web` uses
  `moduleResolution: bundler` because Next.js requires it.
- **Packages are consumed through their built `dist`**, declared in an explicit
  `exports` map. Adding a public entry point means adding an `exports` entry.

## Commands

```
pnpm build         # turbo: builds every package, then next build
pnpm dev           # turbo: builds packages, then next dev
pnpm check-types   # next typegen && tsc --noEmit for apps/web
pnpm lint
pnpm exec tsc -b   # build the TypeScript reference graph directly
```

`apps/web` is not part of the root `tsc -b` solution: its typecheck needs the route
types Next.js generates into `.next/types`, so it runs through its own `check-types`
script. See the comment in `tsconfig.json`.

Next.js-specific rules live in `apps/web/AGENTS.md`, which `next dev` maintains.
Read it before touching anything under `apps/web`.
