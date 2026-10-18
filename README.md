# Palier

Palier is a free, source-available web app for preparing for the Public Service Commission's
**Second Language Evaluation** (SLE). It covers all three tests: reading comprehension, written
expression and oral proficiency. It is in French, for public servants aiming at level B or C. You
get timed drills and mock exams laid out like the real tests, AI feedback on your writing, and
spoken practice with an AI examiner that asks, listens and follows up.

**Try it:** [palier.study](https://www.palier.study). There is no account to make
and nothing to install.

> Palier is an independent, source-available study tool. It is not affiliated with, endorsed by,
> or connected to the Public Service Commission of Canada. It contains no real test questions
> and its results are not official.

## What you can do

| Feature | What it is | Needs a key? |
| --- | --- | --- |
| Reading practice | Timed sets on workplace passages. You can answer from the keyboard alone | No |
| Written expression practice | Drills on the grammar and usage the test checks, with a rationale for every option | No |
| Mock exams | Full timed forms built to a real variant's published structure and scored against its published cut table | No |
| Review | Items you missed come back on a Leitner schedule | No |
| Library | Short articles on each written-expression sub-skill | No |
| Progress | An estimate of your level shown with its uncertainty and what it rests on, a trend over time, and a printable page | No |
| Diagnostic | A placement test that ends in a written result and a starting level | Yes |
| Writing workshop | Write a workplace text and get feedback on it | Yes |
| Generated practice sets | New written-expression items made on demand | Yes |
| Oral, practice mode | Answer out loud one turn at a time, then get a report | Yes |
| Oral, studio mode | A live spoken conversation with an AI examiner | Yes |

The interface is fully bilingual. Every screen is in English and French, given equal prominence.

## What it costs, and where your data goes

**Practising is free.** Drills, review, mock exams and progress need no key and cost nothing. They work offline once the
site has loaded.

The AI features run on **your own OpenAI API key**, sent from your own browser. Each use costs a few cents, and OpenAI
bills your account directly; Palier charges no subscription. Spoken practice is billed by the minute. Each feature
shows its estimated cost before it spends anything, and a meter shows what you have spent.

- **Your browser is the system of record** ([ADR 1](docs/adr/0001-the-browser-is-the-system-of-record.md)). Your
  answers, recordings, transcripts and writing stay on your device.
- **Your key is stored encrypted on your device** and goes only to OpenAI
  ([ADR 2](docs/adr/0002-users-bring-their-own-openai-key.md)). There is one exception. To open a realtime voice
  session for studio mode, the key passes through a single stateless server call that keeps nothing
  ([ADR 3](docs/adr/0003-one-server-call-may-see-the-user-s-key-for-realtime-voice.md)). If you want to avoid that, deploy your own
  one-file endpoint from [`selfhost/`](selfhost/README.md).
- **Sync is on by default and needs no sign-in**
  ([ADR 4](docs/adr/0004-sync-is-on-by-default-with-no-sign-in.md)). Your progress follows a random id with no name or
  email attached, and you link devices with a pairing code. One switch turns sync off. Exporting, importing and
  deleting your data each take one action.
- Palier uses no third-party analytics or error reporting
  ([ADR 15](docs/adr/0015-no-third-party-analytics-or-error-reporting.md)).

To report a vulnerability, see [`SECURITY.md`](SECURITY.md).

## Where the questions come from

Every item is original, and none is copied or adapted from a real SLE or from PSC material. The current bank
(`content/bank/v4`) holds 868 items on 84 passages, 30 oral scenarios and 12 mock-exam forms. Claude wrote the items
in the register of the federal workplace. Separate Claude instances then reviewed each one blind: a reviewer had to
find the intended answer and no second one. Each item then passed a set of deterministic checks. An item that fails
is discarded, not repaired ([ADR 24](docs/adr/0024-bank-v4-is-written-by-claude-and-reviewed-blind-by-claude.md)).
Every item shows where it came from, and reporting a bad one takes one tap.

Items written by people are welcome, and they go through the same checks. See [Contributing](#contributing).

## Status

The app is live and in use. Phases 0 to 7 of the [implementation plan](docs/implementation-plan.md) are built:
practice, mock exams, item statistics, the key-backed features, and both oral modes. The steps left before 1.0 are
manual checks and decisions for the maintainer. The English mirror (Phase 8), which practises English as a second
language, has not started. [`docs/progress.md`](docs/progress.md) is the source of truth for what is done, what is in
flight and what is next.

## Running it locally

You need Node 22 and pnpm 10. Corepack picks up the version from `package.json`.

```bash
pnpm install
pnpm dev          # builds the packages, then runs next dev
```

Open [http://localhost:3000](http://localhost:3000).

No environment variables are needed. Without a database, practice, mock exams, progress and export all work, because
they live in the browser, and only the sync routes answer 503. To try the AI features, paste your own OpenAI key in
Settings. To put Palier on the internet, with Postgres for sync, see [`docs/deploy.md`](docs/deploy.md).

## How it is built

Palier is a pnpm and Turborepo monorepo, written in TypeScript. It is a practice engine for any banded language exam,
and the SLE is its first **profile**. Every exam-specific rule lives in
[`content/profiles/psc-sle.json`](content/profiles/psc-sle.json) rather than in code: item counts, time limits, cut
scores, level descriptors, the sub-skill taxonomy and the review intervals
([ADR 9](docs/adr/0009-exam-rules-live-in-a-data-profile.md)). If you swap the profile and the bank, you have a
practice app for a different exam.

The code is split into six packages behind ports and adapters, and dependencies point strictly inward
([ADR 10](docs/adr/0010-ports-and-adapters-six-packages.md)). The core does scoring, trend, selection and scheduling,
and it is pure: deterministic functions over plain data that know nothing of React, IndexedDB, OpenAI or HTTP.
`dependency-cruiser` fails the build on any import that points the wrong way. The item bank ships as static JSON
([ADR 18](docs/adr/0018-content-ships-as-a-workspace-package.md)). The web app is Next.js on Vercel
([ADR 11](docs/adr/0011-next-js-on-vercel.md)), and Postgres holds only the sync replica
([ADR 21](docs/adr/0021-sync-backend-revisioned-documents-client-merge-sha256-secrets.md)).

| Workspace | Depends on | Contains |
| --- | --- | --- |
| `apps/web` | everything | The Next.js app: routes, API handlers, and the one composition root |
| `apps/factory` | `domain`, `adapters` | The content-pipeline CLI: harvest, draft, adversarial review, deterministic validation, then the bank build |
| `packages/domain` | — | Types, invariants, Zod schemas for every content artefact, and the exam profile loader |
| `packages/engine` | `domain` | The pure core: scorer, band mapper, trend calculator, Leitner scheduler, selector, daily planner, oral session machine |
| `packages/app` | `domain`, `engine` | Port interfaces and the use cases that consume them |
| `packages/adapters` | `app`, `domain` | Concrete adapters: Dexie, bank, OpenAI, sync, telemetry, ids |
| `packages/ui` | `domain` | Design tokens, primitives, and item renderers registered by type |
| `packages/testing` | `app`, `domain` | In-memory ports, port contract suites, fixture builders, and a fixture bank |
| `content` | — | The exam profile, the item bank, the library and authored items. Data, not code |
| `selfhost` | — | Not a workspace: two one-file realtime secret endpoints that users deploy on their own accounts |
| `docs` | — | Requirements, architecture, plan, ADRs, progress, deploy |

## Commands

| Command | Does |
| --- | --- |
| `pnpm dev` | Builds the packages, then runs `next dev` |
| `pnpm build` | Builds every package to its own `dist`, then runs `next build` |
| `pnpm verify` | Runs `check-types`, `lint`, `boundaries` and `test`, in that order. **Nothing merges that does not pass it** |
| `pnpm check-types` | Type-checks every workspace |
| `pnpm lint` | Runs ESLint across the repo with zero warnings allowed |
| `pnpm boundaries` | Runs `dependency-cruiser` on the import graph |
| `pnpm test` | The fast lane: one Vitest process across every project, with coverage thresholds |
| `pnpm test:integration` | The integration projects |
| `pnpm test:e2e` | The Playwright end-to-end suite for `apps/web` |
| `pnpm verify:medium` | Integration, then end-to-end |
| `pnpm mutation` | Mutation testing with Stryker |
| `pnpm clean` | Removes `dist`, `.next` and the build info |

A few conventions apply everywhere. Use named exports only; the root `eslint.config.mjs` lists the framework files
exempt from that rule. Keep `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` on, set repo-wide
from `tsconfig.base.json`. Packages are ESM with `NodeNext`.

## Documentation

| Read | For |
| --- | --- |
| [`docs/product-requirements.md`](docs/product-requirements.md) | What the product must do: the 14 requirements, the exam model, screens and content standards |
| [`docs/architecture.md`](docs/architecture.md) | How it works: data model, ports, sync, the security model, engine algorithms |
| [`docs/implementation-plan.md`](docs/implementation-plan.md) | Module boundaries, testing strategy, phases, definition of done |
| [`docs/content-factory.md`](docs/content-factory.md) | How the item bank is made |
| [`docs/adr/`](docs/adr/README.md) | Why each significant choice was made, and what would reverse it |
| [`docs/progress.md`](docs/progress.md) | Where the build is: status, deviations, the session log, the next slice |
| [`docs/deploy.md`](docs/deploy.md) | Deploying, smoke checks and rollback |

[`docs/README.md`](docs/README.md) explains how the documents fit together and which one wins when two disagree.
An agent working in this repository should start at [`CLAUDE.md`](CLAUDE.md). [`AGENTS.md`](AGENTS.md) points
there too.

## Contributing

Items, passages and code are all welcome. Start with [`CONTRIBUTING.md`](CONTRIBUTING.md). It opens with the rule that
matters most: every item is original, with no real test material. It then shows how to write an item in
`content/authored/`, the quality bar the item must clear, and what happens to it after you open a pull request.

## Licence

Palier is source-available but not open source in the OSI sense. You may read, copy, change and run it for any
**non-commercial** purpose. Commercial use is not permitted.

- The application **code** is under the PolyForm Noncommercial License 1.0.0 ([`LICENSE`](LICENSE)). It expressly
  permits personal study and use by educational institutions, charities and government institutions.
- The **content** is under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0,
  [`LICENSE-CONTENT`](LICENSE-CONTENT)). The content is the item bank, passages, exam forms and other practice material.

See [ADR 23](docs/adr/0023-polyform-noncommercial-for-code-cc-by-nc-sa-4-0-for-content.md).
