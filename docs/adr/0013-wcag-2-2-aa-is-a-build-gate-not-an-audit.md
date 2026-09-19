# ADR 13: WCAG 2.2 AA is a build gate, not an audit

**Status:** Accepted
**Date:** 2026-09-17
**Supersedes:** None

## Context

The audience is federal public servants, a population with both a professional expectation of accessibility and a higher than average likelihood of using assistive technology. Accessibility retrofitted after launch is expensive and usually incomplete.

## Decision

Automated accessibility assertions run in CI against route states, not only initial renders, and fail the build. Manual screen reader passes are a release checklist item.

## Consequences

Positive: accessibility defects are caught at the pull request. Negative: automated checks catch perhaps a third of real issues, so the manual passes remain necessary and the gate must not create false confidence.

## Revisit when

Never. This is a floor.
