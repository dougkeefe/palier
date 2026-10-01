/**
 * The `@palier/adapters/openai` public surface. One factory returning the
 * `AiProvider` port, the config types it takes, and the error types it throws —
 * every one of ours, no `openai`/SDK/HTTP type among them (adapters/CLAUDE.md).
 * Studio mode's realtime pieces (progress.md D165, D169, D170) sit beside it: the two
 * `RealtimeSecretSource`s, the server's and the browser's, and the realtime transport.
 */
// Re-exported so `apps/factory` — which consumes this adapter and `@palier/domain`
// and nothing else — can name the port it wires without depending on `@palier/app`.
export type { AiProvider } from "@palier/app";
export { openAiProvider } from "./openai-provider.js";
export type {
  FetchLike,
  OpenAiModels,
  OpenAiPricing,
  OpenAiProviderConfig,
} from "./openai-provider.js";
export { PROMPT_VERSION, STUDIO_PROMPT_VERSION } from "./prompts.js";
export { REALTIME_SECRET_SECONDS, openAiRealtimeSecrets } from "./realtime-secrets.js";
export type { OpenAiRealtimeSecretsConfig } from "./realtime-secrets.js";
export { routeRealtimeSecrets, warmRealtimeRoute } from "./route-realtime-secrets.js";
export type { RouteRealtimeSecretsConfig } from "./route-realtime-secrets.js";
export { REALTIME_TURN_EAGERNESS, realtimeTransport } from "./realtime-transport.js";
export type {
  RealtimePeer,
  RealtimePeerFactory,
  RealtimePeerState,
  RealtimeTransport,
  RealtimeTransportConfig,
  RealtimeTurnEagerness,
} from "./realtime-transport.js";
export { REALTIME_EVENTS_CHANNEL, browserRealtimePeer } from "./browser-peer.js";
export type { BrowserRealtimePeerMedia } from "./browser-peer.js";
export {
  InvalidApiKeyError,
  InvalidResponseError,
  OpenAiError,
  ProviderRequestError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  RateLimitError,
} from "./errors.js";
