# ADR 5: Device pairing by code, not accounts, for v1

**Status:** Accepted
**Date:** 2026-09-17
**Supersedes:** Narrows ADR 4

## Context

ADR 4 needs some way for a second device to join an account. The first draft specified email magic links and GitHub OAuth, which brings an auth library, an email provider, deliverability, OAuth app registration, session handling and an account recovery flow. A reviewer correctly identified this as the largest unexamined complexity in the design, sitting oddly beside aggressive simplification elsewhere.

## Decision

v1 ships pairing only: device one displays a short-lived code, device two enters it, the server links them. No email, no OAuth, no auth library, no sessions. Recovery through a claimed identity is deferred and reconsidered on evidence.

## Consequences

Positive: removes an entire dependency class from v1 and roughly two weeks of work. The common case of a laptop plus a phone, both in hand, is fully served. Negative: losing the only paired device loses server-side progress, so the settings page must say so plainly and the JSON export must be prominent.

## Revisit when

Users report losing progress, or a claimed identity is needed for another reason.
