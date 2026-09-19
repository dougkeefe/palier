# ADR 9: Exam rules live in a data profile

**Status:** Accepted
**Date:** 2026-09-17
**Supersedes:** None

## Context

Item counts, time limits, band cut scores, level descriptors and the sub-skill taxonomy are all externally defined by the PSC and subject to change without notice. Encoding them in code makes a PSC change a development task.

## Decision

One validated JSON profile holds all of it. The engine reads it. Changing a cut score is a content pull request plus regenerated fixtures.

## Consequences

Positive: external change becomes a data edit, and a fork for a different exam needs no application changes. Negative: one more schema to validate, and a layer of indirection when reading the code.

## Revisit when

Never likely. The cost is a single file.
