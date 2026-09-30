import { ProviderTimeoutError, ProviderUnavailableError } from "./errors.js";

/**
 * The adapter's view of `fetch`, structural so no platform or vendor type crosses its edge, and
 * one exchange under a time limit that the provider, the realtime secret sources and the realtime
 * transport all use (progress.md D99, D169).
 */
export type FetchResponse = {
  readonly ok: boolean;
  readonly status: number;
  readonly headers?: { get: (name: string) => string | null };
  json: () => Promise<unknown>;
  text: () => Promise<string>;
  blob?: () => Promise<Blob>;
};
export type RequestInit = {
  method: string;
  headers: Record<string, string>;
  body?: string | FormData;
};
export type FetchLike = (url: string, init: RequestInit & { signal?: AbortSignal }) => Promise<FetchResponse>;

export const platformFetch: FetchLike = (url, init) => fetch(url, init) as unknown as Promise<FetchResponse>;

/**
 * One HTTP exchange under a time limit: the fetch and the reading of its answer. The
 * limit races the work rather than trusting the fetch to honour the abort, and it is
 * rejected before the abort is signalled, so a timeout always reads as a timeout. A
 * fetch that throws is the network, never an HTTP status: `ProviderUnavailableError`.
 */
export const timedExchange = async <T>(
  doFetch: FetchLike,
  url: string,
  init: RequestInit,
  limitMs: number,
  read: (res: FetchResponse) => Promise<T>,
): Promise<T> => {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ProviderTimeoutError("OpenAI did not answer in time."));
      controller.abort();
    }, limitMs);
  });
  const work = async (): Promise<T> => {
    let res: FetchResponse;
    try {
      res = await doFetch(url, { ...init, signal: controller.signal });
    } catch (cause) {
      throw new ProviderUnavailableError("Could not reach OpenAI.", { cause });
    }
    return read(res);
  };
  try {
    return await Promise.race([work(), timedOut]);
  } finally {
    clearTimeout(timer);
  }
};
