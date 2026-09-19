# Palier: Document Set

A free, open-source web app for practising the Public Service Commission's Second Language Evaluation.

**Working name:** Palier (not final)
**Owner:** Doug Keefe
**Last revised:** 17 September 2026

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

Read them in that order the first time. After that, `adr/` is usually the one you want, because it holds the arguments the other documents deliberately do not.

If you are resuming work rather than reading in, start at `progress.md`. It is the only document that changes weekly, and its deviations log is the part that cannot be reconstructed from the code.

---

## How to tell a requirement from an opinion

This distinction is the point of the split, and it exists because a previous draft blurred it.

- **Requirements** are in `product-requirements.md` section 0.1. Fourteen of them. Changing one is a product decision and it gets recorded in that document.
- **Decisions** are in `adr/`. Each says what was chosen, what it costs, and what evidence would justify changing it. A maintainer who disagrees writes ADR 16 rather than arguing with a specification.
- **Assumptions** are in `product-requirements.md` section 18 and `content-factory.md` section 3. These are beliefs, not facts, and several of them will turn out to be wrong.
- **Preferences** are everything else: the product principles, the visual language, the phase ordering. Change them freely if the requirements are still met.

If a future contributor cannot work out which category a statement belongs to, that is a defect in these documents and worth fixing.

---

## Current shape of the thing

Reading, written expression and oral practice for the SLE, aimed first at French as a second language at level C. Local-first: the browser is the system of record and everything works offline. The item bank ships as static JSON, so drills, mock exams and progress need no API key. The AI features (item generation, written feedback, oral examiner) run on the user's own OpenAI key, from their browser. Progress syncs across a user's devices by default, with pairing by code rather than accounts. Bilingual interface, WCAG 2.2 AA enforced in CI. MIT code, CC BY content.

The band estimate comes from mock exams scored against the published PSC cut tables. Practice shows accuracy per band tag with a confidence interval, and deliberately does not produce a band letter of its own.

---

## The three things most likely to sink this

1. **The generated French does not convince a fluent speaker.** Tested in week one of phase 1 with thirty passages and two readers, before anything is built on top of it.
2. **The adversarial review gate catches fewer defects than assumed.** Measured directly against a hand-seeded set of deliberate defects. Below 80 percent detection on any class, the batch is held.
3. **The time is not there.** This is evening work alongside a full-time job. The phase order is arranged so that stopping after phase 3 still leaves a complete, useful, public tool: reading and written expression practice with mock exams, free, no key required.

---

## Revision history

**0.1, 17 September 2026.** First complete draft, revised twice in the same session. The second revision removed the item response theory, adaptive selection and FSRS scheduling specified in the first draft, on the grounds that all three required item parameters the project has no way to measure (ADR 7, ADR 8). The third revision, following an external architecture review, split this document set apart from what had been two large specifications: the reasoning moved to `adr/`, the content pipeline moved to `content-factory.md`, requirements were separated from design in `product-requirements.md`, accounts and email authentication were cut from v1 in favour of device pairing (ADR 5), and the position that content must be machine-authored was corrected to a preference (ADR 6). The implementation plan was then reconciled to all of it and gained a requirement coverage table, which is the check that the build order actually delivers the product.
