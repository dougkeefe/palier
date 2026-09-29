# Palier: Document Set

A free, source-available web app for practising the Public Service Commission's Second Language Evaluation.

**Working name:** Palier (not final)
**Owner:** Doug Keefe
**Last revised:** 19 September 2026

---

## The documents

| Document | Answers | Authoritative for | Changes when |
| --- | --- | --- | --- |
| `product-requirements.md` | What the product must do, and what it should look and feel like | The requirement list in section 0.1, the exam model, the screens, the content standards | A product decision changes |
| `architecture.md` | How the application works | Components, data model, ports, protocols, security posture, performance and testing gates | A maintainer writes a superseding ADR |
| `content-factory.md` | How the item bank gets made | The production pipeline, its assumptions, its metrics, its descoping options | The pipeline changes, independently of the app |
| `implementation-plan.md` | In what order, with what boundaries | Module structure, testing strategy, phases, requirement coverage, definition of done | The plan meets reality, which it will first |
| `adr/` | Why each significant choice was made, and what would reverse it | The reasoning, the alternatives, the revisit conditions | Never edited. Superseded by a new ADR |
| `progress.md` | Where the build actually is | What is done, what is in flight, deviations from the plan, the session log | Every session that changes something |
| `deploy.md` | How to deploy it, check it and roll it back | The provisioning steps, the environment variables, the smoke checks | The hosting or the migration step changes |

Read them in that order the first time. After that, `adr/` is usually the one you want, because it holds the arguments the other documents deliberately do not.

If you are resuming work rather than reading in, start at `progress.md`. It is the only document that changes weekly, and its deviations log is the part that cannot be reconstructed from the code. The repository's `CLAUDE.md` is the router into all of it and is the right first read for an agent session.

**When two documents disagree, the table above decides.** Each document names what it is authoritative for, and a statement outside that column is orientation rather than law: the plan owns module structure and testing, this set's `adr/` owns reasoning, `product-requirements.md` §0.1 owns the requirements, `content-factory.md` owns the pipeline. Rather than reconcile a conflict in passing, fix the document that is not authoritative for the statement, and say in the edit which decision it was brought in line with.

---

## How to tell a requirement from an opinion

This distinction is the point of the split, and it exists because a previous draft blurred it.

- **Requirements** are in `product-requirements.md` section 0.1. Fourteen of them. Changing one is a product decision and it gets recorded in that document.
- **Decisions** are in `adr/`. Each says what was chosen, what it costs, and what evidence would justify changing it. A maintainer who disagrees writes a new ADR rather than arguing with a specification — taking the next free number when it is accepted, never reserving one in prose (`progress.md` D16; this sentence named ADR 16 until the estimate-store decision took that number first, which is exactly the failure D16 records).
- **Assumptions** are in `product-requirements.md` section 18 and `content-factory.md` section 3. These are beliefs, not facts, and several of them will turn out to be wrong.
- **Preferences** are everything else: the product principles, the visual language, the phase ordering. Change them freely if the requirements are still met.

If a future contributor cannot work out which category a statement belongs to, that is a defect in these documents and worth fixing.

---

## Current shape of the thing

Reading, written expression and oral practice for the SLE, aimed first at French as a second language at level C. Local-first: the browser is the system of record and everything works offline. The item bank ships as static JSON, so drills, mock exams and progress need no API key. The AI features (item generation, written feedback, oral examiner) run on the user's own OpenAI key, from their browser. Progress syncs across a user's devices by default, with pairing by code rather than accounts. Bilingual interface, WCAG 2.2 AA enforced in CI. PolyForm Noncommercial code, CC BY-NC-SA content (ADR 23): free for any non-commercial use.

The band estimate comes from mock exams scored against the published PSC cut tables. Practice shows accuracy per band tag with a confidence interval, and deliberately does not produce a band letter of its own.

---

## The three things most likely to sink this

1. **The generated French does not convince a fluent speaker.** Tested in week one of phase 1 with thirty passages and two readers, before anything is built on top of it.
2. **The adversarial review gate catches fewer defects than assumed.** Measured directly against a hand-seeded set of deliberate defects. Below 80 percent detection on any class, the batch is held.
3. **The time is not there.** This is evening work alongside a full-time job. The phase order is arranged so that stopping after phase 3 still leaves a complete, useful, public tool: reading and written expression practice with mock exams, free, no key required.

---

## Revision history

**0.3, 20 September 2026.** Amendments from building the `AnswerItem` use case, which completed
the review-schedule record. `implementation-plan.md` §3.3 gained a dated in-place amendment to
the `ScheduleStore` signature (`ScheduleEntry` is now `{ itemId, due: ISO | null, skill, box }`
and the port has a `get`), because §3.3 is authoritative for port signatures. `architecture.md`
§9.1 gained the `ScheduleEntry` shape beside the `Attempt` one, with the note that IndexedDB
will not index a null `due` — which the design relies on — and §9.4 now admits that its
last-write-wins rule does not cover a record with no `updatedAt`. **ADR 18** records that
content ships as a workspace package, `@palier/content`, so the app can import the profile
through an exports map rather than a relative path the boundary gate rejects. This sentence's
own instruction to "write ADR 16" was corrected to "write a new ADR", which is what
`progress.md` D16 settled. Reasoning for all of it in deviations D38 to D43.

**0.2, 19 September 2026.** Reconciliation pass, no new positions. Ten contradictions found while writing the repository's agent documentation were resolved in favour of whichever document the table above makes authoritative: `architecture.md` §4, §17 and §19 had fallen behind ADR 10 and the plan's build order, §1 and §18 behind ADR 6, and §9.1 declared an estimate store the plan had ruled out — which is now ADR 16, the one conflict that was a genuine open question rather than a stale sentence. `product-requirements.md` gained dated amendments to R12 (which had never admitted the ADR 3 exception), §8.11, §13.0 and §15. Full list and reasoning in deviation D17 of `progress.md`.

**0.1, 17 September 2026.** First complete draft, revised twice in the same session. The second revision removed the item response theory, adaptive selection and FSRS scheduling specified in the first draft, on the grounds that all three required item parameters the project has no way to measure (ADR 7, ADR 8). The third revision, following an external architecture review, split this document set apart from what had been two large specifications: the reasoning moved to `adr/`, the content pipeline moved to `content-factory.md`, requirements were separated from design in `product-requirements.md`, accounts and email authentication were cut from v1 in favour of device pairing (ADR 5), and the position that content must be machine-authored was corrected to a preference (ADR 6). The implementation plan was then reconciled to all of it and gained a requirement coverage table, which is the check that the build order actually delivers the product.
