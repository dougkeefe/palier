# ADR 7: No item response theory at launch

**Status:** Accepted
**Date:** 2026-09-17
**Supersedes:** None

## Context

An earlier draft specified a 2PL model with expected a posteriori updating. 2PL requires difficulty and discrimination estimated per item from data. At launch every difficulty value is a language model's guess and no discrimination values exist. Calibrating 2PL wants on the order of hundreds of responses per item; a realistic pilot produces tens.

## Decision

Practice progress is reported as accuracy per band tag with a Wilson score interval. The band letter comes only from a full-length mock exam scored against the published PSC cut table, which involves no model at all.

## Consequences

Positive: works on day one with no calibration, is explainable to the user, and fails visibly rather than silently. Removes several hundred lines nobody could debug. Negative: less statistically efficient, so a given confidence takes more items, and between-band resolution is coarser.

## Revisit when

Item statistics accumulate to a few hundred responses per item across a range of abilities, and there is evidence that band accuracy is misleading users.
