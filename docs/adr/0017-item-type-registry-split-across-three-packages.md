# ADR 17: The item type registry is split across three packages

**Status:** Accepted
**Date:** 2026-09-19
**Supersedes:** None. Refines the `registerItemType` literal in implementation-plan.md §3.4

## Context

Adding an item type should touch one definition and its renderer and nothing else
(principle 6, `implementation-plan.md` §3.4): "new capability is registration, not
modification. No switch statement gains a case." The plan illustrates this with a single
call carrying six keys:

```ts
registerItemType('cloze', {
  schema, render, score, validate, generatePrompt, a11yContract
})
```

That literal **cannot be built as written**, and the reason is the dependency graph, not an
oversight. `render` is "a React component from `@palier/ui`", and §3.1 forbids every package
below `apps/web` from importing `@palier/ui`; `schema` is a Zod schema, and only
`@palier/domain` may import `zod` (`@palier/engine` takes no npm dependency at all). So no
single package can hold a definition carrying both `render` and `schema`. The registry was
deferred across the whole of Phase 0 for want of this decision (`progress.md` deviations D13
and D17 contradiction 7); this record makes it.

The union already has four members — `cloze`, `comprehension`, `error-id`,
`best-completion` — all single-key multiple-choice today, so their scoring is uniform and
the registry's present value is structural extensibility rather than per-type scoring logic.

## Decision

**The registry is split by the dependency graph, into three homes.**

1. **`@palier/domain` holds the React-free `ItemTypeDefinition`** — the four members that CI
   and the content factory need, plus the a11y contract: `schema`, `score`, `validate`,
   `generatePrompt`, `a11yContract`. It lives here because the schema is Zod and only domain
   may import Zod; `score` and `validate` are pure functions the engine consumes downward via
   `itemTypeDefinition(item.type).score(...)` (engine → domain is a legal arrow).
2. **`@palier/ui` holds the `render` member** as `itemRenderers: Record<ItemType,
   ItemRenderer>`, parallel to the domain definitions. UI imports domain types only, which it
   already may.
3. **`apps/web`, the one composition root, asserts the two maps cover the same union.** It is
   the only place §3.1 permits both packages to be seen at once, so the cross-map
   completeness check can live nowhere else (`src/lib/item-types.ts`).

"Five members plus the a11y contract" (§4.5, §10) is therefore `schema`, `render`, `score`,
`validate`, `generatePrompt` — five — with `render` the one that lives in `@palier/ui`;
`a11yContract` is counted separately because a different suite asserts it.

**The registry is an exhaustive `Record<ItemType, …>`, not the imperative
`registerItemType(…)` the plan's literal illustrates.** Keying a record on the union makes
adding an `ItemType` a **compile error** until every map — the domain definitions, the UI
renderers — has an entry, which serves principle 6 more strongly than a runtime `register`
call would: the failure is at `tsc`, not at the first session that reaches the unregistered
type. The `registerItemType` signature in §3.4 was illustrative of the intent; this record is
its stronger form.

The per-type `schema` is the shared `itemSchema` narrowed to one `type`, so there is one
source of truth for item structure rather than four diverging schemas. `validate` reports
deterministic content-quality issues the schema cannot express (notably that a cloze item
actually carries its `blankIndex`, which the schema forbids off-cloze but never requires on
it) and, unlike a parse, returns every issue so the factory can surface them together.

## Consequences

Positive: adding or removing an item type is a compile error across both maps, so the
registry cannot rot into a partially-implemented type; the session engine calls
`itemTypeDefinition(item.type).score(...)` and knows nothing of any specific type; CI and
`apps/factory` get the React-free half they need without a React dependency; and the a11y
contract is data the renderer honours and the a11y suite asserts, so the two cannot drift
silently.

Negative: the definition for one type is spread across two packages, so a reviewer reads two
files to see it whole, and the composition root carries a small assertion that exists only to
tie them together. The `schema` member is typed as the general `z.ZodType` (as
`CONTENT_SCHEMAS` is) because a schema's inferred output uses plain-string ids — the brand is
a compile-time concern — so a caller parses and then treats the result as structurally valid
rather than as a branded `Item`.

Scope deliberately deferred to Phase 2, when the drill session mounts these renderers: the
feedback panel, passage-body rendering, and a cloze's marked blank. All four types therefore
share one `McqItem` renderer today; each gains its own component when that presentation
diverges. The renderers carry structural a11y assertions (radiogroup, radios, roving
tabindex, a text label beside every colour) in the UI unit tests, following the six
primitives' precedent; the full axe-on-state assertion lands with the Phase-2 route that
first renders them, as it did for the primitives.

## Revisit when

A non-multiple-choice item type is added — that is the moment `ItemResponse` widens from
`OptionId` to a union, `score` stops being uniform, and the shared `McqItem` renderer splits.
Or the content factory (Phase 1) needs a richer `generatePrompt`/`PromptSpec` than the
minimal shape recorded here (`progress.md` D29). Either is an extension of this structure, not
a reversal of it; the split across three packages is forced by §3.1 and does not change.
