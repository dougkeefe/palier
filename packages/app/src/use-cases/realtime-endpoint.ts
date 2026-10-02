import type { ApiKeyDeps } from "./api-key.js";

/**
 * The user's own realtime secret endpoint (ADR 3's self-hosted escape, architecture.md §6.3, progress.md
 * D192): the page, deployed from the repository's `selfhost/` Worker or function, that mints studio mode's
 * short-lived secret on the user's own origin, so the key never reaches Palier's route. Palier opens it in a
 * popup and hands it the key by `postMessage`, to its origin only.
 *
 * The key goes wherever this URL points, so it is checked before it is kept, here, where the screen and the
 * container read the same rule:
 * - **https only**, since the key travels to it; plain http is allowed for a loopback host alone, which never
 *   leaves the machine (a Worker run locally, the end-to-end test's endpoint);
 * - **no credentials in it**, which a popup's address bar would show;
 * - **the fragment is dropped**: it never reaches a server, so it can only confuse.
 */

/** Why a typed endpoint was refused, as the screen words it. */
export type RealtimeEndpointProblem = "not-a-url" | "not-https" | "has-credentials";

export type ParsedRealtimeEndpoint =
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly problem: RealtimeEndpointProblem };

/** Hosts that never leave the machine, where plain http cannot be overheard. */
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "[::1]"]);

export const parseRealtimeEndpoint = (raw: string): ParsedRealtimeEndpoint => {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, problem: "not-a-url" };
  }
  const secure = url.protocol === "https:" || (url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname));
  if (!secure) return { ok: false, problem: url.protocol === "http:" ? "not-https" : "not-a-url" };
  if (url.username !== "" || url.password !== "") return { ok: false, problem: "has-credentials" };
  url.hash = "";
  return { ok: true, url: url.href };
};

/** A typed endpoint the rule refuses. The screen says why from `problem`; nothing was kept. */
export class InvalidRealtimeEndpointError extends Error {
  constructor(readonly problem: RealtimeEndpointProblem) {
    super(`The realtime endpoint was refused: ${problem}.`);
    this.name = "InvalidRealtimeEndpointError";
  }
}

/** The endpoint this device sends studio mode's key to, or `null` for Palier's own route. */
export const realtimeEndpoint = (deps: ApiKeyDeps): Promise<string | null> => deps.vault.realtimeEndpoint();

/**
 * Keep an endpoint on this device, as the rule normalises it, and answer what was kept; a blank one forgets it.
 * A refused one throws `InvalidRealtimeEndpointError` and leaves what was kept before.
 */
export const setRealtimeEndpoint = async (request: { readonly url: string }, deps: ApiKeyDeps): Promise<string | null> => {
  if (request.url.trim() === "") {
    await deps.vault.setRealtimeEndpoint(null);
    return null;
  }
  const parsed = parseRealtimeEndpoint(request.url);
  if (!parsed.ok) throw new InvalidRealtimeEndpointError(parsed.problem);
  await deps.vault.setRealtimeEndpoint(parsed.url);
  return parsed.url;
};
