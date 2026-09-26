/**
 * The `@palier/adapters/openai` public surface. One factory returning the
 * `AiProvider` port, the config types it takes, and the error types it throws —
 * every one of ours, no `openai`/SDK/HTTP type among them (adapters/CLAUDE.md).
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
export { PROMPT_VERSION } from "./prompts.js";
export {
  InvalidApiKeyError,
  InvalidResponseError,
  OpenAiError,
  ProviderRequestError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  RateLimitError,
} from "./errors.js";
