# Palier: Prompt Library

Copy-pasteable prompts for building this project with an agentic coding tool. Keep this file in `docs/prompts.md`.

Each entry has a goal, the prompt to paste, and what to check before you accept the result. The prompts are written to be self-contained, because every one of them should start a fresh session.

---

## Before you start: one structural note

`create-next-app` gives you a single application at the repo root. The plan calls for a monorepo with six packages and the Next.js app at `apps/web`. Session 1 restructures it. Do not fight this by trying to keep the flat layout; the package boundaries are the thing that makes the rest of the project maintainable, and retrofitting them later is far more work than moving the app now.

Expected starting state for session 1:

```
palier/
├── .git/
├── docs/
│   ├── README.md
│   ├── product-requirements.md
│   ├── architecture.md
│   ├── content-factory.md
│   ├── implementation-plan.md
│   └── adr/            (15 files)
└── (whatever create-next-app produced)
```

---

## Rules that apply to every session

Say these once, in `CLAUDE.md`, not in every prompt. They are here so you know what the prompts assume.

- One task per session. End the session when the task ends.
- Plan before edits on anything non-trivial.
- Contracts land in their own commit before implementation.
- Nothing merges that does not pass `pnpm verify`.
- If the agent thinks a decision in `docs/adr/` is wrong, it says so and stops. It does not work around it.

---

# Phase 0 sessions

## Session 1: Restructure into the monorepo

**Goal:** the six-package skeleton exists, builds, and the Next.js app lives at `apps/web`.

```
This repo contains a fresh create-next-app at the root and a docs/ directory
with the full specification set for a project called Palier.

Read docs/implementation-plan.md section 3 (Module architecture) and
docs/adr/0010-ports-and-adapters-six-packages.md. Do not read the other
documents yet.

Restructure this repo into a pnpm + Turborepo monorepo matching section 3.2:

  apps/web          the existing Next.js app, moved here intact
  apps/factory      empty Node CLI package, placeholder only
  packages/domain
  packages/engine
  packages/app
  packages/adapters
  packages/ui
  packages/testing

Requirements:
- Every package has a package.json with an explicit "exports" map. No default
  exports anywhere in the project.
- TypeScript project references across all packages, with strict,
  noUncheckedIndexedAccess and exactOptionalPropertyTypes enabled.
- Each package builds to its own dist and is consumable by the packages above
  it in the dependency graph.
- packages/* are all empty apart from an index.ts that exports nothing yet.
- The Next.js app still runs after the move.

Constraints:
- Use the official scaffolding commands for pnpm workspaces and Turborepo
  rather than writing config from memory, then show me the versions you
  installed. Do not guess at config shapes.
- Do not add any dependency beyond what pnpm, Turborepo and TypeScript
  project references require.
- Do not write any application code.

Give me the plan and the file list first. Do not make any changes until I
approve it.
```

**Check before accepting:** the version numbers it reports are real and recent. `pnpm build` succeeds. `pnpm --filter web dev` still serves the app. No stray dependencies in the root `package.json`.

---

## Session 2: The agent-facing documentation

**Goal:** the `CLAUDE.md` files that make every later session cheaper. This is the highest-leverage session in phase 0.

```
Read all of docs/: README.md, product-requirements.md, architecture.md,
content-factory.md, implementation-plan.md, and every file in docs/adr/.
Take your time; this is the only session where you will read all of it.

Then write agent-facing documentation for this repo. Two kinds.

1. A root CLAUDE.md. Maximum 120 lines. It is a router, not a summary.
   It must contain, in this order:
   - What this project is, in three sentences.
   - The eight architectural principles from implementation-plan.md section 2,
     compressed to one line each.
   - A table of the six packages: name, what it holds, what it may import.
   - Hard rules, stated as imperatives. At minimum: dependencies point inward
     and dependency-cruiser enforces it; no vendor type crosses a package
     boundary; exam rules live in the profile JSON, never in code; before
     proposing any architectural change, read docs/adr/ and check whether the
     decision is already recorded with a revisit condition; never edit an
     existing ADR, supersede it; no new dependency without stating what it
     replaces; every new branch gets a unit test that names the behaviour.
   - A "where to look" table mapping common tasks to the document and section
     that covers them, so future sessions read 300 words instead of 30,000.
   - The verify command and what it runs.

2. A CLAUDE.md in each of the six packages. Ten to twenty lines each:
   purpose, what it may import, its invariants, and the two or three mistakes
   most likely to be made in it. For packages/engine, state explicitly that it
   is pure, takes Clock and Random as parameters, and never calls Date.now or
   Math.random directly.

Rules for this task:
- Do not restate the specifications. Every line should either constrain
  behaviour or tell me where to look.
- Where a rule exists because of a specific ADR, cite it by number.
- If you find a contradiction between any two documents, list it at the end
  of your response rather than resolving it yourself.

Write the files, then show me the root CLAUDE.md in full in your reply.
```

**Check before accepting:** read the root file properly, this one is worth ten minutes. Is it under 120 lines? Does it say anything that is wrong? Does the "where to look" table actually point at the right sections? Take the contradictions list seriously; there will be some and they are cheaper to fix now.

---

## Session 3: The gates

**Goal:** architecture enforcement that fails the build, verified by deliberately breaking it.

```
Read CLAUDE.md and docs/implementation-plan.md section 4 (Enforcement).

Set up architecture enforcement for this monorepo:

1. dependency-cruiser with the dependency graph from implementation-plan.md
   section 3.1 encoded as rules. Arrows may only point inward:
   ui -> domain only; adapters -> app, domain; app -> engine, domain;
   engine -> domain; domain -> nothing. Also forbid importing openai, dexie,
   next or react anywhere outside the packages permitted to have them.
2. eslint with eslint-plugin-boundaries for intra-package layering, plus a
   rule banning string literals in JSX (i18n parity comes later but the rule
   lands now).
3. A pnpm verify script at the root that runs, in order: typecheck, lint,
   dependency-cruiser, and tests. It must exit non-zero on any failure.
4. A GitHub Actions workflow running verify on every push and pull request.

Then prove the gates work. Create a branch, commit a deliberate violation
(an import of dexie inside packages/engine), show me that verify fails and
what the error says, then delete the branch.

Do not add test tooling in this session; that is the next one.
```

**Check before accepting:** the violation actually failed, and the error message is one you would understand at 11pm. If the message is cryptic, fix it now.

---

## Session 4: Test infrastructure

**Goal:** the test harness exists before there is anything to test, so nothing is ever retrofitted.

```
Read CLAUDE.md and docs/implementation-plan.md section 6 (Testing strategy)
in full.

Set up the test infrastructure described there. Nothing to test yet; this is
the harness.

- Vitest in workspace mode across all packages, with coverage via v8 and the
  per-package thresholds from section 6.3 enforced in config so a drop fails
  the build.
- fast-check for property tests.
- fake-indexeddb, wired so a Dexie adapter can be tested in Node later.
- MSW with a shared handler set usable from both Node and browser tests.
- PGlite harness for the sync integration tests.
- Playwright with a hermetic mode: an environment flag the composition root
  will read later to wire stub adapters.
- @axe-core/playwright.
- The three CI lanes from section 6.5 as separate workflow jobs, with their
  time budgets enforced so a slow test fails rather than creeps.

In packages/testing, create the structure for:
- in-memory implementations of every port (stubs for now, the ports do not
  exist yet)
- the port contract suites as exported functions
- fixture builders
- a seeded Random and a FakeClock

Write one real test to prove the harness works end to end: a property test
using fast-check asserting something trivial. Show me pnpm verify passing.

Do not write the ports or the domain types; that is the next session.
```

**Check before accepting:** `pnpm verify` runs in under 90 seconds on an empty repo. If it does not, fix it now, because that budget only gets harder to hold.

---

## Session 5: Domain types and the exam profile

**Goal:** the types and the profile that everything else is built on.

```
Read CLAUDE.md, docs/architecture.md section 5 (Content model), and
docs/product-requirements.md section 5 (The exam model).

Implement packages/domain:

1. Branded id types: ItemId, PassageId, FormId, ScenarioId, AttemptId. A
   function taking an ItemId must not accept a PassageId.
2. The types from architecture.md section 5: Item, Passage, OralScenario,
   ExamForm, ExamProfile, Attempt, plus the supporting unions (Skill, Band,
   SubSkill, Lang, Topic).
3. Zod schemas for every content artefact, with JSON Schema generated into
   docs/schemas/.
4. The ExamProfile loader and validator.
5. content/profiles/psc-sle.json, transcribed exactly from
   product-requirements.md section 5. All four variants with their real item
   counts, time limits and band cut scores.

Tests, written before or alongside, not after:
- Every schema accepts a valid artefact and rejects each specific way of
  being invalid, one test per rejection reason.
- A property test that band mapping over every variant of the profile is
  total and monotonic: every raw score from 0 to the maximum maps to exactly
  one band, no gaps, no overlaps, and a higher score never yields a lower
  band.
- Round-trip: every domain type survives JSON serialisation unchanged.
- Type-level tests that branded ids are not interchangeable.

The cut scores in the profile are transcribed from published PSC figures.
Check each one against product-requirements.md section 5 and tell me if any
row does not add up or leaves a gap between bands.

100% branch coverage on this package. Show me pnpm verify passing.
```

**Check before accepting:** open `psc-sle.json` and check the cut scores against the requirements document yourself. This is the one file where a transcription error is silent and expensive. The band mapping property test should have caught any gap; confirm it actually runs over all four variants.

---

# Reusable templates

## The contract-first prompt

Use this as the first of two prompts for any substantial piece of work.

```
Read CLAUDE.md and [document, section].

I want to add [thing]. This session is contracts only. Produce:
- the types
- the Zod schema if content or an external payload is involved
- the test fixtures
- the test names, as empty tests with descriptive names and todo bodies

Do not write any implementation. Do not make the tests pass.

The test names are the deliverable I care most about. Each should name a
behaviour, not a function, and I should be able to read the list and know
what this thing does.
```

## The implementation prompt

The second of the pair, in a fresh session.

```
Read CLAUDE.md. The contracts and failing tests for [thing] are already
committed in [paths].

Implement it so the tests pass. Do not change any existing test to make it
pass; if a test is wrong, stop and tell me which one and why.

Definition of done:
- pnpm verify passes
- coverage threshold for this package is met
- no new dependency
- [any specific constraint]

Run pnpm verify and paste the output.
```

## The plan-first prompt

For anything where you are not certain what it will touch.

```
Read CLAUDE.md and [document, section].

I want to [goal]. Before changing anything, give me:
- the approach in a short paragraph
- the exact list of files you will create or modify
- anything in the specs that is ambiguous or that you would need to decide
- anything you think is wrong with the plan as specified

Do not make any changes until I reply.
```

## The ADR challenge prompt

When the agent proposes something the specs rejected, or when you genuinely want it reconsidered.

```
You have proposed [X]. Read docs/adr/ and find whether this decision is
already recorded.

If it is: quote the ADR number, its stated consequence, and its "revisit
when" clause, then tell me honestly whether the evidence named in that clause
has actually appeared. If it has not, drop the proposal and continue with the
original task.

If it is not recorded: make the case in ADR format (context, decision,
consequences, revisit when), including the strongest argument against it.
Do not implement anything.
```

## The review prompt

Run this in a fresh session against a branch, before merging anything substantial.

```
Read CLAUDE.md and docs/adr/.

Review the diff on this branch against main. You did not write this code;
treat it as a submission from someone else.

Look specifically for:
- architectural violations the gates would not catch, particularly vendor
  types leaking across package boundaries and business logic that has drifted
  into an adapter
- tests that assert the implementation rather than the behaviour
- guard clauses and error paths with no test
- anything that contradicts a decision in docs/adr/
- anything in packages/engine that calls Date.now, Math.random or fetch

Rank findings by consequence and give me a concrete failure scenario for
each. If there is nothing serious, say so rather than finding something.
```

## The new item type prompt

The registry makes this a bounded task. Use it verbatim.

```
Read CLAUDE.md and docs/implementation-plan.md section 3.4.

Add a new item type: [name]. Register all five members plus the a11y
contract:
- schema (Zod, used by both CI and the factory)
- render (React component in packages/ui)
- score (pure function)
- validate (deterministic quality checks)
- generatePrompt (used by the content factory)
- a11yContract

Do not modify the session engine. If you find yourself needing to, the
registry is wrong and I want to know about it instead.

Tests: the scorer at every outcome, the validator rejecting each specific
defect, and an axe assertion on the renderer in both its unanswered and
answered states.
```

## The debugging prompt

```
Read CLAUDE.md.

[Describe the symptom precisely, including the exact error text and what you
did to produce it.]

Before proposing a fix: tell me what you think is happening and what evidence
in the code supports that. If you are not sure, say so and tell me what you
would add to find out. Do not change code until we agree on the diagnosis.
```

## The session-end prompt

Two minutes that save an hour later.

```
We are done with this task. Before I commit:

- Summarise what changed, in the form of a commit message.
- Does anything in CLAUDE.md, any package CLAUDE.md, or any doc in docs/ now
  contradict what we just built? If so, list it. Do not fix it yet.
- Is there anything you worked around rather than solved, or anything you are
  uncertain about that I should know?
```

That last question is worth asking every single time. It surfaces the compromises that would otherwise stay buried in a passing build.

---

# Prompts not to use

**"Build the practice session feature."** Too large. You will get a forty-file diff you approve rather than review.

**"Read the docs and get started."** Thirty thousand words of context and no target. You will get a plausible-looking scaffold that matches none of the decisions.

**"Make the tests pass."** Invites editing the tests. Always pair it with "do not change any existing test; if a test is wrong, stop and tell me."

**"Add a quick auth system so I can test multi-device."** This is the exact shape of the thing ADR 5 exists to prevent, and it will feel reasonable at the time.

**"Refactor this to be more maintainable."** Unbounded, and the agent's idea of maintainable is the conventional pattern, which is frequently the thing your ADRs rejected.

---

# A note on what you read

Read the engine tests properly. Read the `psc-sle.json` cut scores yourself. Read every root `CLAUDE.md` change. Skim the adapters and the UI, where bugs are visible and cheap.

Everywhere else, read the test names as a flat list without opening the implementations. If the names do not describe behaviour you recognise and care about, the tests are decorative no matter what coverage says.
