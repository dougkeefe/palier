import type {
  AiCapabilities,
  ExaminerTurn,
  ExaminerTurnRequest,
  GenerateItemsRequest,
  GeneratePassageRequest,
  GenerateScenarioRequest,
  ItemDraft,
  OralAssessment,
  OralRequest,
  PassageDraft,
  ReviewRequest,
  ReviewVerdict,
  ScenarioDraft,
  SpeechRequest,
  TranscribeRequest,
  Transcript,
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
 * **Not yet the whole of §3.3.** `openVoiceSession` and its net-new domain types land
 * with Phase 6, the same "the minimum the consumer needs" discipline the store ports
 * already use (progress.md D45). Two §3.3 amendments
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
 * `generateScenario` is a fourth amendment (progress.md D114, Phase 5 Slice 1): the
 * factory's scenario stage plans an oral scenario's phases through it, and it returns
 * a draft, as `generatePassage` does.
 *
 * Phase 5 Slice 2 (progress.md D117) adds the turn loop's three: `transcribe`, §3.3's own
 * method, amended to take a request that carries the clip's measured duration, which is
 * what a per-minute model is priced by; and `speak` and `examinerTurn`, two amendments.
 *
 * `assessOral` is §3.3's own method, landed with Phase 5 Slice 3 (progress.md D122).
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
   * Plan an oral scenario's phases for a session type, band and topic (progress.md
   * D114). The factory assembles the `OralScenario` and checks that the phases' minutes
   * add up to `req.minutes`, discarding the plan if not.
   */
  generateScenario: (req: GenerateScenarioRequest) => Promise<ScenarioDraft>;
  /**
   * The words in one spoken answer (architecture.md §8.5, practice mode; D117). The clip
   * goes to the provider's transcription model and nowhere else [R12]. Usage reports the
   * seconds of audio billed.
   */
  transcribe: (req: TranscribeRequest) => Promise<Transcript>;
  /**
   * The examiner's words voiced in the language practised (D117), as audio the browser
   * can play. Usage reports the characters voiced.
   */
  speak: (req: SpeechRequest) => Promise<Blob>;
  /**
   * The examiner's next short question in practice mode (§8.5: "transcript plus history
   * goes to the text model"; D117), and whether the candidate's last answer showed them
   * coping or struggling, so the client can adapt the phase.
   */
  examinerTurn: (req: ExaminerTurnRequest) => Promise<ExaminerTurn>;
  /**
   * The report on a whole spoken session (architecture.md §8.5, "post-session scoring";
   * progress.md D122): a band and quoted evidence per criterion, three fixes most costly
   * first, five missing words in the candidate's own sentences, and the errors in the
   * candidate's turns as offsets that `checkOralAssessment` accepts over `req.turns`. A
   * provider that cannot place its errors rejects, as `assessWriting` does.
   */
  assessOral: (req: OralRequest) => Promise<OralAssessment>;
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
