# ADR 1: The browser is the system of record

**Status:** Accepted
**Date:** 2026-09-17
**Supersedes:** None

## Context

The product must work with no network, no account and no API key, on a phone, in a 15 minute session. It has no operating budget, so a server in the read path is both a cost and a failure mode. The data involved is one person's practice history, which is small and needs no cross-user queries.

## Decision

All application reads come from IndexedDB. The server holds a replica for sync, never the source of truth. Ability to function is never contingent on a network call.

## Consequences

Positive: no cold starts, full offline operation, near-zero hosting cost, and a sync outage is invisible to someone studying. Negative: browser storage can be evicted, so data durability depends on either sync or the user exporting. Storage quota becomes a real constraint once audio is involved.

## Revisit when

The product needs cross-user features such as leaderboards or shared cohorts, or a query the client cannot compute.
