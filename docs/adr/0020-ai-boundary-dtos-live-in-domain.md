# ADR 20: The AI boundary DTOs live in `@palier/domain`, not `@palier/app`

**Status:** Accepted
**Date:** 2026-09-23
**Supersedes:** Nothing. It extends ADR 10's description of what `@palier/domain` holds, and is the "net-new domain types" the `@palier/app` `CLAUDE.md` anticipated for the `AiProvider` port.

## Context

Phase 1 needs the `AiProvider` port and its request/response types. `implementation-plan.md` §3.3 puts the port *interface* (`AiProvider`) in `@palier/app`. But the port references types that did not exist: `AiCapabilities`, `GenerateItemsRequest`, `ReviewRequest`, `ReviewVerdict`, `UsageRecord`, and — added for the factory (§4.2) — a passage-generation request and the draft payloads the model returns.

Where those DTOs live is an architectural choice, because `apps/factory` is constrained to reach `@palier/domain` and the openai adapter and *nothing else* (`.dependency-cruiser.cjs` `factory-depends-on-domain-and-adapters-only`; the rule's comment names domain + the adapter). The factory has to build `GenerateItemsRequest`/`GeneratePassageRequest` values and read `ReviewVerdict`s. If those types lived in `@palier/app`, the factory would have to depend on `@palier/app`, contradicting that boundary's stated intent.

ADR 10 describes `@palier/domain` as holding "Types, branded ids, invariants, Zod schemas for every content artefact." AI request/verdict DTOs are not content artefacts, so placing them in domain stretches that description — hence this record.

## Decision

The AI boundary DTOs live in `@palier/domain` (`ai.ts` for the types, `schemas/ai.ts` for the structured-output re-validation schemas). The `AiProvider` port *interface* stays in `@palier/app` (§3.3), referencing those domain types. The openai adapter implements the port and Zod-parses every response at the edge with the domain schemas (architecture.md §8.2).

Consequences of the split:

- `apps/factory` depends only on `@palier/domain` and `@palier/adapters/openai`, as its boundary intends. The openai adapter re-exports the `AiProvider` *type* so the factory can name the port it wires without importing `@palier/app`.
- The DTOs are **not** added to `CONTENT_SCHEMAS`: they are DTOs, not content artefacts, so no JSON Schema is published for them and the `docs/schemas/` drift test is untouched.
- Two amendments to §3.3 travel with this (recorded in `progress.md` D52, not here, because they are port-shape decisions rather than package-placement ones): `generatePassage` is added, and `generateItems`/`generatePassage` return drafts rather than assembled `Item[]`/`Passage[]`.

## Alternatives considered

- **DTOs in `@palier/app`, factory depends on `@palier/app`.** The dependency-cruiser rule as written forbids only `engine`/`ui`/`testing`/`web` for the factory, so this would *pass* the gate — but it contradicts the rule's documented intent ("domain + the openai adapter") and couples the CLI to the use-case layer for no gain. Rejected.
- **DTOs in a new package.** A seventh code package for a handful of types violates YAGNI and the six-package structure (ADR 10). Rejected.

## Revisit when

A second consumer of these DTOs appears that is naturally an `@palier/app` concern (for example a runtime browser-generation use case in Phase 4) and would read more naturally with the types beside the port. At that point, re-evaluate whether the port and its DTOs should reunite in `@palier/app` and the factory take an `@palier/app` dependency after all.
