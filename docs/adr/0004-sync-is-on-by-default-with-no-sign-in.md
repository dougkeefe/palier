# ADR 4: Sync is on by default, with no sign-in

**Status:** Accepted
**Date:** 2026-09-17
**Supersedes:** None

## Context

The product owner wants progress to follow a user across devices without an account wall. Requiring sign-in before the product is useful is the single largest drop-off in this kind of tool, and an account is not needed to identify one person's practice history.

## Decision

A device-generated secret establishes an anonymous account on first completed session. Sync runs from then on. A settings switch turns it off and offers server-side deletion.

## Consequences

Positive: multi-device works with zero friction. Negative: the project now holds a progress replica for most users who never asked for one, which changes the privacy posture materially and obliges the deletion, retention and disclosure controls documented in the architecture spec. An unclaimed account on a lost device is unrecoverable.

## Revisit when

Storage cost becomes material, or evidence emerges that users object to default sync.
