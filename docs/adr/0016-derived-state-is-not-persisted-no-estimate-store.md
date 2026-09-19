# ADR 16: Derived state is not persisted, so there is no estimate store

**Status:** Accepted
**Date:** 2026-09-19
**Supersedes:** None. Narrows ADR 1 and follows from ADR 7

## Context

Two documents disagreed. `implementation-plan.md` §3.3 declares "no EstimateStore: the trend is derived from recent attempts on demand, so there is nothing to persist, nothing to invalidate and nothing to reconcile during sync". The Dexie schema in `architecture.md` §9.1 nonetheless declared an `estimates` table, and the §2 diagram listed estimates in the local store. `architecture.md` §9.4 then agreed with the plan rather than with its own §9.1: "Estimates are not synced as values at all; each device recomputes them from the merged attempt set, which removes the hardest conflict case entirely."

The disagreement is not cosmetic. A persisted estimate is a second source of truth for the number the product leads with. It has to be invalidated when attempts arrive, recomputed when the profile changes, and reconciled when two devices sync — and last-write-wins on a derived value is how one device's stale figure overwrites another's correct one.

After ADR 7 the practice trend is accuracy per band tag with a Wilson interval over the last 100 scored attempts. That is a count and a closed-form expression over a bounded window, not a model fit. It costs nothing to recompute on demand.

## Decision

Derived state is not persisted. There is no `EstimateStore` port, no `estimates` table in the Dexie schema, and no estimate document in the synced set. The practice trend is computed from the attempt log when it is needed, on whichever device needs it.

This generalises: anything the engine can recompute from the attempt log is recomputed rather than stored. Attempts are the only record of record, they are append-only and keyed by client-generated ULID, and that is what makes sync conflict-free by construction.

## Consequences

Positive: the hardest sync conflict case disappears rather than being handled; there is no cache to invalidate when a profile cut score changes or a bank version lands; two devices cannot disagree about a number they both derive from the same set; and one fewer port means one fewer contract suite to maintain. It also keeps the engine honest, since a stored estimate is the natural place for an algorithm to hide state.

Negative: the trend is recomputed on every render that needs it, so the computation has to stay cheap — which is a constraint on the engine, and `vitest bench` on the trend calculator (§6.2 tier 12) is what holds it. If a future trend needs history the attempt log cannot reconstruct, such as a value that depended on a superseded algorithm, it cannot be recovered retroactively.

## Revisit when

Recomputation shows up in the performance budget (`architecture.md` §13) on a real device with a real attempt history, or a trend is wanted that genuinely cannot be derived from the attempt log. Persisting a derived value as a *cache*, keyed by a hash of its inputs and never synced, is the smaller change to reach for first.
