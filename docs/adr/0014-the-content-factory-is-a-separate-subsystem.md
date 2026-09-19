# ADR 14: The content factory is a separate subsystem

**Status:** Accepted
**Date:** 2026-09-17
**Supersedes:** None

## Context

A review observed that the content pipeline covering harvest, passage construction, drafting, review, validation, statistics and bank build is a substantial product in its own right, and that embedding it in the application architecture specification understated its complexity, risk and operating cost.

## Decision

The content factory gets its own specification, its own risk register, its own roadmap and its own phase. It shares only the content schemas with the application and communicates through committed data files.

## Consequences

Positive: its complexity is visible and can be scoped, deferred or descoped independently. The application can be built against a small hand-made bank if the factory is late. Negative: two documents to keep consistent, joined at the schema.

## Revisit when

The factory stabilises to the point where it is a build script rather than a system.
