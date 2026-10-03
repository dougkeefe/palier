import { openAiRealtimeSecrets } from "@palier/adapters/openai";
import { isHermetic, memoryRealtimeSecretSource } from "@palier/testing/in-memory";

import aiModels from "../lib/ai-models.json";
import { type ServerEnv, realtimeRateLimitStore } from "./db";
import { type RealtimeSecretApi, createRealtimeSecretApi } from "./realtime-handlers";

/**
 * The realtime secret route's composition (D169), beside `db.ts`'s for the database. **Hermetic**,
 * the memory source mints `ek_memory_<n>` and calls nobody, so the key-leak test can post the
 * sentinel to the real route. **Otherwise**, OpenAI's, for the model and voice in `ai-models.json`:
 * the route never takes either from the request. It needs no database, so it answers with none.
 *
 * The rate limit (D195) is `db.ts`'s store when a database is configured, and none otherwise.
 *
 * Built once and kept on `globalThis`, as `db.ts` keeps its APIs, so the hermetic source's secrets
 * stay distinct across requests. What is kept is configuration; no key is held past its request.
 */
export const buildRealtimeSecretApi = (env: ServerEnv): RealtimeSecretApi => {
  const store = realtimeRateLimitStore(env);
  return createRealtimeSecretApi({
    secrets: isHermetic(env)
      ? memoryRealtimeSecretSource()
      : openAiRealtimeSecrets({ model: aiModels.realtime, voice: aiModels.realtimeVoice }),
    ...(store === null ? {} : { limit: { ...store, now: () => new Date() } }),
  });
};

const cache = globalThis as { __palierRealtimeSecretApi?: RealtimeSecretApi };

export const realtimeSecretApi = (env: ServerEnv = process.env): RealtimeSecretApi => {
  cache.__palierRealtimeSecretApi ??= buildRealtimeSecretApi(env);
  return cache.__palierRealtimeSecretApi;
};
