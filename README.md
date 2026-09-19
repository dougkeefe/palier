# Palier

A pnpm + Turborepo monorepo. The architecture — six library packages behind ports and
adapters, with dependencies pointing strictly inward — is specified in
[`docs/implementation-plan.md`](docs/implementation-plan.md) §3 and
[ADR 10](docs/adr/0010-ports-and-adapters-six-packages.md).

## Repository layout

| Workspace | Depends on | Contains |
| --- | --- | --- |
| `apps/web` | everything | Next.js app, routes, composition root |
| `apps/factory` | `domain`, `adapters` | content pipeline CLI (placeholder) |
| `packages/domain` | — | types, invariants, schemas, exam profiles |
| `packages/engine` | `domain` | pure algorithms |
| `packages/app` | `domain`, `engine` | port interfaces and use cases |
| `packages/adapters` | `app`, `domain` | concrete adapters |
| `packages/ui` | `domain` | design system |
| `packages/testing` | `app`, `domain` | in-memory ports, contract suites, fixtures |

Every package is currently a placeholder: an `index.ts` that exports nothing.

## Getting started

```bash
pnpm install
pnpm dev          # builds the packages, then runs next dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Does |
| --- | --- |
| `pnpm build` | `turbo run build` — every package to its own `dist`, then `next build` |
| `pnpm dev` | `turbo run dev` — builds packages first, then `next dev` |
| `pnpm check-types` | `next typegen && tsc --noEmit` for `apps/web` |
| `pnpm lint` | `turbo run lint` |
| `pnpm exec tsc -b` | build the TypeScript project-reference graph directly |
| `pnpm clean` | remove `dist`, `.next` and build info |

## Conventions

Named exports only — the one exception is Next.js file conventions, which the framework
resolves by default export; `apps/web/eslint.config.mjs` holds the exhaustive exemption
list and fails the lint on anything else. `strict`, `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes` are enabled repo-wide from `tsconfig.base.json`.

See [`AGENTS.md`](AGENTS.md) for the full working rules.
