import type { UsageRecord } from "@palier/domain";

import type {
  Clock,
  CostLedger,
  ItemRepository,
  OralLiveness,
  OralStore,
  OralTransport,
  RealtimeSecret,
  RealtimeSecretSource,
} from "../ports/index.js";
import type { ApiKeyDeps } from "./api-key.js";
import { NoApiKeyError } from "./api-key.js";
import type { OralSessionRun, StartOralSessionRequest } from "./oral.js";
import { startOralSessionRun } from "./oral.js";

/**
 * Studio mode's session (Phase 6 Slice 1, progress.md D165, D169): the session driver (D116) over
 * the realtime transport, which the composition root makes from the openai adapter. The app never
 * names the adapter; it hands the transport two hooks.
 *
 * - **`secret`** spends the key once, inside `KeyVault.withApiKey`, for a short-lived browser
 *   secret (ADR 3). The transport calls it to connect, and once more to reconnect; it never sees
 *   the key.
 * - **`usage`** takes what each realtime response billed, priced by the transport, and writes it to
 *   the ledger as `oral-studio`, under the session (D125). The transport is an adapter and cannot
 *   reach the ledger, so this is the hook `withAiProvider` would be for a provider call (D170).
 */
export type StudioTransportHooks = {
  readonly secret: () => Promise<RealtimeSecret>;
  readonly usage: (usage: UsageRecord) => void;
};

/** A studio transport: an `OralTransport` that keeps the error it failed with, as the practice one does. */
export type StudioTransport = OralTransport & { readonly lastError: () => unknown };

export type OralStudioDeps = ApiKeyDeps & {
  readonly secrets: RealtimeSecretSource;
  readonly studioTransport: (hooks: StudioTransportHooks) => StudioTransport;
  readonly ledger: CostLedger;
  readonly clock: Clock;
  readonly items: ItemRepository;
  readonly oral: OralStore;
  readonly liveness: OralLiveness;
  /** Studio mode's hard cap, in ms (`pricing.json`'s `studioMaxMinutes`, D166). */
  readonly capMs: number;
};

/** A studio session running: the driver's run, and why it failed when it did. */
export type OralStudioRun = OralSessionRun & {
  readonly failure: () => unknown;
};

/**
 * Start a studio-mode session (D165). The id is the caller's (D39). `ended` settles once the
 * transport has closed **and** every usage it reported is in the ledger, so the report reads the
 * session's whole cost. A ledger write that fails is not the session's failure: the conversation
 * already happened, and the meter is a record, not a gate.
 */
export const startOralStudioRun = async (
  request: Omit<StartOralSessionRequest, "capMs">,
  deps: OralStudioDeps,
): Promise<OralStudioRun> => {
  let writes: Promise<void> = Promise.resolve();
  const transport = deps.studioTransport({
    secret: async () => {
      if (!(await deps.vault.hasApiKey())) throw new NoApiKeyError();
      return deps.vault.withApiKey((key) => deps.secrets.mint(key));
    },
    usage: (usage) => {
      writes = writes
        .then(() =>
          deps.ledger.append({
            ts: deps.clock.now(),
            feature: "oral-studio",
            model: usage.model,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            costUsd: usage.costUsd ?? null,
            sessionId: request.sessionId,
          }),
        )
        .catch(() => undefined);
    },
  });
  const run = await startOralSessionRun(
    { ...request, capMs: deps.capMs },
    { clock: deps.clock, items: deps.items, oral: deps.oral, transport, liveness: deps.liveness },
  );
  return {
    ...run,
    ended: run.ended.then(async (session) => {
      await writes;
      return session;
    }),
    failure: transport.lastError,
  };
};
