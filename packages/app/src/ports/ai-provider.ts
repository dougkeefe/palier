import type {
  AiCapabilities,
  GenerateItemsRequest,
  GeneratePassageRequest,
  ItemDraft,
  PassageDraft,
  ReviewRequest,
  ReviewVerdict,
  UsageRecord,
} from "@palier/domain";

/**
 * The one seam every AI call passes through (implementation-plan.md §3.3,
 * architecture.md §8). A concrete provider (`@palier/adapters/openai`) selects
 * the model, enforces the structured-output contract, retries, translates every
 * vendor error and payload into our types at the edge (§8.2), and accounts for
 * cost. Nothing above this port knows OpenAI exists.
 *
 * **This is the Phase-1 subset.** §3.3 lists `assessWriting`, `assessOral`,
 * `transcribe` and `openVoiceSession` as well; those and their net-new domain
 * types land with their phases (4–5), the same "the minimum the consumer needs"
 * discipline the store ports already use (progress.md D45). Two §3.3 amendments
 * are recorded in the D-log: `generatePassage` is added (the factory's stage 2
 * needs AI passage construction, content-factory.md §4.2), and `generateItems`/
 * `generatePassage` return **drafts** rather than assembled `Item[]`/`Passage[]`
 * — the factory assembles the full artefact (id, provenance, status, metrics),
 * keeping id-minting and provenance policy out of the adapter (adapters/CLAUDE.md).
 *
 * The DTOs (`GenerateItemsRequest`, `ReviewVerdict`, …) live in `@palier/domain`,
 * not here, so `apps/factory` can build them without importing this layer (ADR 20).
 */
export type AiProvider = {
  /** Which methods this provider supports, so a caller can degrade gracefully. */
  capabilities: () => AiCapabilities;
  /** Draft original passages at a target band (content-factory.md §4.2). */
  generatePassage: (req: GeneratePassageRequest) => Promise<readonly PassageDraft[]>;
  /** Draft candidate items through the registry's prompt spec (§4.3). */
  generateItems: (req: GenerateItemsRequest) => Promise<readonly ItemDraft[]>;
  /** Review one item blind to its key (§4.4). */
  reviewItem: (req: ReviewRequest) => Promise<ReviewVerdict>;
  /** Token/cost usage from the last call, for the ledger (§8.6). */
  lastUsage: () => UsageRecord | null;
};
