# ADR 2: Users bring their own OpenAI key

**Status:** Accepted
**Date:** 2026-09-17
**Supersedes:** None

## Context

The project is free and open source with no revenue model. The AI features (generation, written feedback, oral practice) have a real per-use cost that scales with usage. Someone has to pay it.

## Decision

The user supplies an OpenAI API key, held in their browser. Calls go directly from their browser to OpenAI. The project funds no inference.

## Consequences

Positive: the project can be free and stay free, costs scale with the user who incurs them, and the operator never sees user content. Negative: significant onboarding friction, an audience filter since many public servants will not create an API key, and a support burden when OpenAI errors surface. Mitigated by making every non-AI feature work without a key.

## Revisit when

A sponsor or grant makes funded inference possible, or a materially cheaper model changes the economics.
