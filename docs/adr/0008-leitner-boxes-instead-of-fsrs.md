# ADR 8: Leitner boxes instead of FSRS

**Status:** Accepted
**Date:** 2026-09-17
**Supersedes:** None

## Context

FSRS is a well-regarded scheduling algorithm whose parameters were fitted against self-reported grades on flashcards. This product derives grades from response time on multiple-choice exam items, which is a different signal in a different task. Fitted parameters used outside their fitting conditions are borrowed constants, not a validated algorithm.

## Decision

Five Leitner boxes with fixed intervals, held in the exam profile as four numbers.

## Consequences

Positive: understandable, explainable on screen, no library, no parameters to justify. Negative: theoretically less efficient scheduling, and no per-user adaptation.

## Revisit when

Enough review data accumulates to fit intervals from this product's own usage, which would still be four numbers rather than an algorithm.
