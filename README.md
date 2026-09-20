# Palier

Palier is an independent, open-source study tool. It is not affiliated with, endorsed by,
or connected to the Public Service Commission of Canada. It contains no real test questions
and its results are not official.

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

Phase 0 (foundations) is largely complete: `domain` carries the full type set, content
schemas, the exam profile and the item-type registry; `app` holds the port interfaces;
`testing` holds the in-memory ports, contract suites, fixture builders and the canonical
fixture bank; `ui` holds the design tokens and primitives; and `apps/web` is a locale-routed
shell over the composition root. `engine`, `adapters` and `apps/factory` are still mostly
empty, and fill in later phases (`docs/implementation-plan.md` §7).

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

Named exports only — the one exception is framework file conventions, which resolve by
default export; the single root `eslint.config.mjs` holds the exhaustive exemption list and
fails the lint on anything else. `strict`, `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes` are enabled repo-wide from `tsconfig.base.json`.

See [`AGENTS.md`](AGENTS.md) for the full working rules.

## Licence

The application **code** is licensed under the MIT licence ([`LICENSE`](LICENSE)). The
**content** — the item bank, passages, exam forms and other practice material — is licensed
under Creative Commons Attribution 4.0 International (CC BY 4.0,
[`LICENSE-CONTENT`](LICENSE-CONTENT)).
