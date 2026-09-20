# Architecture Decision Records

This directory holds the project's architecture decision records (ADRs): one file
per significant, hard-to-reverse choice, explaining why it was made and what would
justify changing it. They are the answer to "why is it like this?" that the code
cannot give. `implementation-plan.md` §4 names this directory as the project's
social enforcement mechanism; `docs/README.md`'s authority table says an ADR is
authoritative for *why* a choice was made.

Read the relevant ADR before proposing an architectural change. If a decision is
already recorded, quote its **Revisit when** clause and say honestly whether that
evidence has appeared. If it has not, drop the proposal.

## Format

Each record is a Markdown file named `NNNN-kebab-case-title.md`, where `NNNN` is
the zero-padded number, and carries these sections:

```
# ADR N: Title

**Status:** Accepted | Superseded by ADR M
**Date:** YYYY-MM-DD
**Supersedes:** None | ADR K

## Context
The forces at play — what made a decision necessary.

## Decision
The choice, stated plainly.

## Consequences
What this buys and what it costs, positive and negative.

## Revisit when
The specific evidence that would justify superseding this record. This clause is
what stops a deferred decision from becoming a permanent prohibition, and it is
the first thing to check when something in the architecture feels wrong.
```

## The two rules

1. **An accepted ADR is never edited — it is superseded.** To change a decision,
   write a new ADR that sets the old one's status to `Superseded by ADR M` and
   names it in its own `Supersedes` field. The history of the project's thinking
   stays readable, and a reader always sees how a decision was reached, not just
   where it landed. The same discipline governs `progress.md`: append, never
   rewrite.

2. **Numbers are assigned in order of acceptance, not reserved in advance.** Take
   the next free number when your ADR is accepted. Reserving a number in prose
   ("this will be ADR 17") creates a number two things believe they own — see
   `progress.md` deviation D16, where exactly that happened. The next free number
   is one past the highest file in this directory.

A contributor who disagrees with a decision writes the next ADR rather than
arguing with a specification. That keeps disagreement productive and leaves a
trail.
