# ADR 6: Generated content is the default authoring path, not the only one

**Status:** Accepted
**Date:** 2026-09-17
**Supersedes:** Supersedes the machine-authored-only position in the first draft

## Context

The owner has no time to author items by hand and wants the pipeline to produce the bank. An earlier draft translated that resourcing decision into a project-level prohibition on hand-authored content, which was overreach. The review-gate evaluation set is itself hand-authored, so the prohibition was already inconsistent with the plan that contained it.

## Decision

Generation is the default path and the one sized for. Hand-authored items are a supported first-class input passing through the same validation, review and provenance machinery, distinguished only by an origin field. Contributors may submit them.

## Consequences

Positive: gold-standard exemplars, curated benchmark sets and expert-authored oral scenarios all become possible with no schema change. Negative: two authoring paths to keep working, and a standing temptation to hand-fix items the pipeline should have caught.

## Revisit when

Never. This is a preference about effort allocation, not an architectural constraint.
