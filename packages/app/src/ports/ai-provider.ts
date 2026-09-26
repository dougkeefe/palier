import type {
  AiCapabilities,
  GenerateItemsRequest,
  GeneratePassageRequest,
  ItemDraft,
  PassageDraft,
  ReviewRequest,
  ReviewVerdict,
  UsageRecord,
  WritingAssessment,
  WritingRequest,
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
 *
 * `assessWriting` is §3.3's own method, landed with Phase 4 Slice 3 (progress.md D105).
 *
 * `verifyKey` is a third §3.3 amendment (progress.md D99, Phase 4 Slice 1): the one cheap
 * call `/settings/key` makes to report whether the user's key works (PRD §8.10).
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
  /**
   * Feedback on a piece of writing (architecture.md §8.4): a band and evidence per
   * criterion, the errors as offsets into `req.text` that `checkErrorOffsets` accepts,
   * and a model answer at the target band. A provider that cannot place its errors
   * rejects rather than return offsets the screen would draw over the wrong words.
   */
  assessWriting: (req: WritingRequest) => Promise<WritingAssessment>;
  /**
   * One cheap call that proves the key this provider holds is accepted. Resolves when it
   * is; otherwise rejects with the provider's own error for the reason (an invalid key, a
   * rate limit or no credit, a timeout, an unreachable service, a malformed answer). It
   * spends no tokens and records no usage.
   */
  verifyKey: () => Promise<void>;
  /**
   * Token/cost usage of the **whole** of the last method call, for the ledger (§8.6,
   * progress.md D102): every request it made, a retry included, so a retried call is billed
   * twice as OpenAI bills it. `null` when that call made no billed request (it failed first,
   * or it was `verifyKey`); never an earlier call's usage carried over.
   */
  lastUsage: () => UsageRecord | null;
};

/**
 * How the browser gets an `AiProvider`: made from the key **inside**
 * `KeyVault.withApiKey`, once per call, and dropped when the call settles, so the key
 * never sits in a long-lived variable (implementation-plan.md §3.3, ADR 2, progress.md
 * D99). The composition root supplies it; only `use-cases/api-key.ts` calls it, through
 * `withAiProvider` for a spending call and `checkApiKey` for the key check (D101).
 */
export type AiProviderFactory = (apiKey: string) => AiProvider;
