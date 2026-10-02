// @ts-check
/**
 * Palier's self-hosted realtime secret endpoint, as a Cloudflare Worker (ADR 3, architecture.md §6.3, progress.md D192).
 *
 * Studio mode needs a short-lived pass that OpenAI mints only for a request made with a standard key. Palier's own
 * server makes that request by default, and this file is the way around it: deploy it on your own account, enter its
 * address in Palier's key settings, and your key goes to your own Worker instead, never to Palier's server.
 *
 * - `GET` serves a small page. Palier opens it in a popup and hands it your key by `postMessage`, to this origin only.
 * - `POST`, from that page only, asks OpenAI for the pass with your key, and answers the pass and nothing else.
 * - It keeps nothing, writes nothing and logs nothing. There is no `console` call in this file.
 *
 * Configuration (Workers → your Worker → Settings → Variables):
 * - `ALLOWED_ORIGIN`, required: the address of the Palier you use, for example `https://palier-virid.vercel.app`.
 *   The page talks to that origin and no other.
 * - `OPENAI_BASE_URL`, optional: defaults to `https://api.openai.com/v1`.
 *
 * Read `selfhost/README.md` before deploying. The same code, word for word between the markers below, is the Vercel
 * function in `selfhost/vercel/api/realtime-secret.mjs`; a test in the repository keeps the two identical.
 */

// ---- palier-selfhost: shared code begins ----
/** The message protocol, as Palier's `@palier/adapters/openai` names it (`SELF_HOSTED_MESSAGES`). */
const MESSAGES = {
  ready: "palier-realtime-secret:ready",
  mint: "palier-realtime-secret:mint",
  minted: "palier-realtime-secret:minted",
  refused: "palier-realtime-secret:refused",
};
const VERSION = 1;
/** How long the pass opens a connection for: Palier dials at once. OpenAI allows 10 s to 2 h. */
const SECRET_SECONDS = 60;
/** Longer than any key OpenAI issues; a header past it is not a key. */
const MAX_KEY_CHARS = 512;
const BEARER = /^Bearer ([\x21-\x7e]+)$/;
/** A model or voice name, as OpenAI writes them. Anything else is refused before it reaches OpenAI. */
const NAME = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const UPSTREAM_TIMEOUT_MS = 10_000;

/** @param {unknown} body @param {number} status @param {Record<string, string>} [headers] */
const jsonResponse = (body, status, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });

/** A refusal is a code, never OpenAI's text, which could echo the key. @param {string} error @param {number} status */
const refuse = (error, status) => jsonResponse({ error }, status);

/** The configured origin, or `null` when it is missing or not a web origin. @param {unknown} raw */
const allowedOriginOf = (raw) => {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  try {
    const { origin, protocol } = new URL(raw.trim());
    return protocol === "https:" || protocol === "http:" ? origin : null;
  } catch {
    return null;
  }
};

/**
 * The popup's script. It talks to `allowed` and no other origin: it says it is ready, takes one key from its
 * opener, mints on this origin, posts back the pass or the code, and closes itself.
 * @param {string | null} allowed
 */
const pageScript = (allowed) => `(() => {
  const MESSAGES = ${JSON.stringify(MESSAGES)};
  const VERSION = ${String(VERSION)};
  const ALLOWED = ${JSON.stringify(allowed).replace(/</g, "\\u003c")};
  const status = document.getElementById("status");
  const say = (en, fr) => {
    status.textContent = "";
    for (const [lang, text] of [["en", en], ["fr", fr]]) {
      const line = document.createElement("p");
      line.lang = lang;
      line.textContent = text;
      status.append(line);
    }
  };
  const opener = window.opener;
  if (ALLOWED === null) {
    say("This endpoint is not configured: set ALLOWED_ORIGIN to your Palier's address.", "Ce point de terminaison n'est pas configuré : réglez ALLOWED_ORIGIN sur l'adresse de votre Palier.");
    return;
  }
  if (opener === null) {
    say("Palier opens this page from studio mode. It does nothing on its own.", "Palier ouvre cette page depuis le mode studio. Elle ne fait rien seule.");
    return;
  }
  let used = false;
  window.addEventListener("message", async (event) => {
    if (event.origin !== ALLOWED || event.source !== opener || used) return;
    const asked = event.data;
    if (typeof asked !== "object" || asked === null || asked.type !== MESSAGES.mint || asked.version !== VERSION) return;
    if (typeof asked.id !== "string" || typeof asked.key !== "string" || typeof asked.model !== "string" || typeof asked.voice !== "string") return;
    used = true;
    say("Asking OpenAI for a short-lived pass…", "Demande d'un laissez-passer de courte durée à OpenAI…");
    let reply;
    try {
      const response = await fetch(location.pathname + location.search, {
        method: "POST",
        headers: { authorization: "Bearer " + asked.key, "content-type": "application/json" },
        body: JSON.stringify({ model: asked.model, voice: asked.voice }),
      });
      const body = await response.json().catch(() => null);
      reply = response.ok && body !== null && typeof body.value === "string" && typeof body.expiresAt === "string"
        ? { type: MESSAGES.minted, version: VERSION, id: asked.id, value: body.value, expiresAt: body.expiresAt }
        : { type: MESSAGES.refused, version: VERSION, id: asked.id, error: body !== null && typeof body.error === "string" ? body.error : "upstream" };
    } catch {
      reply = { type: MESSAGES.refused, version: VERSION, id: asked.id, error: "upstream" };
    }
    opener.postMessage(reply, ALLOWED);
    say("Done. This window closes itself.", "Terminé. Cette fenêtre se ferme d'elle-même.");
    window.close();
  });
  say("Waiting for Palier…", "En attente de Palier…");
  opener.postMessage({ type: MESSAGES.ready, version: VERSION }, ALLOWED);
})();`;

/**
 * The page. Its policy allows its own nonce'd script and style, and fetches to this origin only. It sends no
 * `Cross-Origin-Opener-Policy`, which would cut it off from the Palier window that opened it.
 * @param {string | null} allowed
 */
const pageResponse = (allowed) => {
  const nonce = crypto.randomUUID();
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Palier · studio mode</title>
<style nonce="${nonce}">body{font:16px/1.5 system-ui,sans-serif;margin:2rem;max-width:30rem;color:#1a1a1a}h1{font-size:1.1rem}</style>
</head>
<body>
<h1>Palier · studio mode / mode studio</h1>
<div id="status" role="status" aria-live="polite"></div>
<script nonce="${nonce}">${pageScript(allowed)}</script>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    },
  });
};

/**
 * Mint the pass. Only the page this endpoint serves may ask (a same-origin `fetch` carries this origin), the key is
 * read from `Authorization` alone, and the model and voice are checked as names before anything reaches OpenAI.
 * @param {Request} request
 * @param {string | null} allowed
 * @param {string} openAiBaseUrl
 */
const mint = async (request, allowed, openAiBaseUrl) => {
  if (allowed === null) return refuse("not-configured", 500);
  if (request.headers.get("origin") !== new URL(request.url).origin) return refuse("forbidden-origin", 403);
  const key = BEARER.exec(request.headers.get("authorization") ?? "")?.[1];
  if (key === undefined || key.length > MAX_KEY_CHARS) return refuse("missing-key", 401);
  /** @type {{ model?: unknown, voice?: unknown } | null} */
  const asked = await request.json().catch(() => null);
  const model = asked?.model;
  const voice = asked?.voice;
  if (typeof model !== "string" || !NAME.test(model) || typeof voice !== "string" || !NAME.test(voice)) return refuse("bad-request", 400);
  let upstream;
  try {
    upstream = await fetch(`${openAiBaseUrl}/realtime/client_secrets`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: SECRET_SECONDS },
        session: { type: "realtime", model, audio: { output: { voice } } },
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return refuse("upstream", 502);
  }
  if (upstream.status === 401) return refuse("invalid-key", 401);
  if (upstream.status === 429) return refuse("rate-limited", 429);
  if (!upstream.ok) return refuse("upstream", 502);
  /** @type {{ value?: unknown, expires_at?: unknown } | null} */
  const body = await upstream.json().catch(() => null);
  const value = body?.value;
  const expiresAt = body?.expires_at;
  if (typeof value !== "string" || value === "" || typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) {
    return refuse("upstream", 502);
  }
  return jsonResponse({ value, expiresAt: new Date(expiresAt * 1000).toISOString() }, 200);
};

/**
 * The endpoint: the page on `GET`, the mint on `POST`, nothing else.
 * @param {Request} request
 * @param {{ allowedOrigin?: string | undefined, openAiBaseUrl?: string | undefined }} config
 */
const handle = (request, config) => {
  const allowed = allowedOriginOf(config.allowedOrigin);
  if (request.method === "GET") return Promise.resolve(pageResponse(allowed));
  if (request.method === "POST") return mint(request, allowed, config.openAiBaseUrl || DEFAULT_OPENAI_BASE_URL);
  return Promise.resolve(new Response(null, { status: 405, headers: { allow: "GET, POST" } }));
};
// ---- palier-selfhost: shared code ends ----

/** Cloudflare's module Worker: it finds the handler by this default export, and offers no named alternative. */
export default {
  /**
   * @param {Request} request
   * @param {{ ALLOWED_ORIGIN?: string, OPENAI_BASE_URL?: string }} env
   */
  fetch: (request, env) => handle(request, { allowedOrigin: env.ALLOWED_ORIGIN, openAiBaseUrl: env.OPENAI_BASE_URL }),
};
