# ADR 10: Ports and adapters, six packages

**Status:** Accepted
**Date:** 2026-09-17
**Supersedes:** Supersedes the twelve-package split in the first draft

## Context

The owner asked for modularity that supports long-term maintenance and swapping components, particularly the AI provider. An earlier draft created a package per adapter and a separate package for the port interfaces, producing eleven package manifests to express boundaries a directory and a lint rule already enforce.

## Decision

Six packages: domain, engine, app holding ports and use cases, adapters with subpath exports, ui, and testing. Dependencies point inward, enforced by dependency-cruiser.

## Consequences

Positive: real substitutability at the seams that matter, verified by shared port contract test suites. Negative: the indirection costs something when reading the code for the first time, and the ports layer only pays for itself if the contract tests are actually maintained.

## Revisit when

The project stays small enough that a single package would be honest, or grows enough that adapters need independent versioning.
