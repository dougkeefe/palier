# Palier documentation

These are the design documents for Palier, a free, source-available web app for practising the Public Service
Commission's Second Language Evaluation. To find out what Palier is, try it or run it locally, start with the
[repository README](../README.md). This page explains how the documents here fit together, and which one wins when
two disagree.

---

## Where to start

| You want to | Read |
| --- | --- |
| Understand what the product does and why | `product-requirements.md` §0 and §1, then the [ADR index](adr/README.md) |
| Write practice items or passages | [`CONTRIBUTING.md`](../CONTRIBUTING.md), then `product-requirements.md` §13 and `schemas/` |
| Change the code | [`CONTRIBUTING.md`](../CONTRIBUTING.md), `implementation-plan.md` §3 and §10, then `adr/` before any architectural change |
| Pick up where the build is | `progress.md`: the status table, the deviations log, then *Next, decided* |
| Deploy your own copy | `deploy.md`, and [`selfhost/`](../selfhost/README.md) for studio mode's secret endpoint |
| Work in the repository as an agent | The root [`CLAUDE.md`](../CLAUDE.md), which routes into everything here |

---

## The documents

| Document | Answers | Authoritative for |
| --- | --- | --- |
| [`product-requirements.md`](product-requirements.md) | What the product must do, and what it should look and feel like | The requirement list in §0.1, the exam model, the screens, the content standards |
| [`architecture.md`](architecture.md) | How the application works | Components, data model, ports, protocols, security posture, performance and testing gates |
| [`content-factory.md`](content-factory.md) | How the item bank gets made | The production pipeline, its assumptions, its metrics, its descoping options |
| [`implementation-plan.md`](implementation-plan.md) | In what order, and with what boundaries | Module structure, testing strategy, phases, requirement coverage, definition of done |
| [`adr/`](adr/README.md) | Why each significant choice was made, and what would reverse it | The reasoning, the alternatives, the *revisit when* conditions |
| [`progress.md`](progress.md) | Where the build actually is | What is done, what is in flight, deviations from the plan, the session log, the next slice |
| [`progress-archive/`](progress-archive/README.md) | What `progress.md` used to hold | Older deviations and session entries, moved verbatim and found through `progress.md`'s deviation index |
| [`deploy.md`](deploy.md) | How to deploy Palier, check it and roll it back | Provisioning, environment variables, migrations, smoke checks |
| [`realtime-checklist.md`](realtime-checklist.md) | Whether studio mode's live conversation works on real browsers | The manual checks on six browser and platform pairs, and their results |
| [`schemas/`](schemas/) | What a valid content file looks like | JSON Schemas for items, passages, forms, scenarios and the exam profile, generated from `@palier/domain` |
| [`content-runs/`](content-runs/) | How a published bank was actually made | The briefs and the reviewer evaluation behind each bank version (`v4/` for the current bank) |
| [`prompts.md`](prompts.md) | How to start a build or review session with an agentic coding tool | Nothing. It is a working aid |
| [`Palier landing page/`](<Palier landing page/readme.md>) | What the site looks like | The source design and design-system notes the landing page and app were built from |

The first five are the design. Read them in that order the first time. After that, `adr/` is usually the one you want,
because it holds the arguments the other documents leave out on purpose.

**When two documents disagree, the table above decides.** Each document names what it is authoritative for. A
statement outside that column is orientation, not law. Don't reconcile a conflict in passing. Fix the document that
is not authoritative for the statement, and say in the edit which decision you brought it in line with.

---

## Requirement, decision, assumption or preference?

Every statement in these documents belongs to one of four kinds. Knowing which kind you are reading tells you what it
takes to change it.

- **Requirements** are in `product-requirements.md` §0.1. There are fourteen. Changing one is a product decision, and
  it is recorded in that document.
- **Decisions** are in `adr/`. Each says what was chosen, what it costs, and what evidence would justify changing it.
  To disagree with one, write a new ADR that supersedes it, taking the next free number. Accepted ADRs are never
  edited.
- **Assumptions** are in `product-requirements.md` §18 and `content-factory.md` §3. They are beliefs, not facts, and
  some will turn out to be wrong. Evidence that one is wrong is a useful contribution.
- **Preferences** are everything else: the product principles, the visual language, the phase ordering. Change them
  freely as long as the requirements are still met.

If you can't tell which kind a statement is, treat that as a defect in these documents. An issue or a pull request
that fixes it is welcome.

---

## Licence

Palier is source-available, not open source: free for any non-commercial use. The code is under the PolyForm
Noncommercial License 1.0.0 ([`LICENSE`](../LICENSE)) and the content under CC BY-NC-SA 4.0
([`LICENSE-CONTENT`](../LICENSE-CONTENT)). [ADR 23](adr/0023-polyform-noncommercial-for-code-cc-by-nc-sa-4-0-for-content.md)
records why.
