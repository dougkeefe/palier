# Your own realtime secret endpoint

Palier's studio mode talks with OpenAI's Realtime API over WebRTC. To open that connection the browser needs a
short-lived pass, and OpenAI makes one only for a request made with a standard API key, from a server. By default
Palier's own server makes that one request with your key, uses it once, and keeps nothing (ADR 3,
[`apps/web/src/server/realtime-handlers.ts`](../apps/web/src/server/realtime-handlers.ts)). It is the one place your key
reaches Palier's infrastructure.

If you would rather it never did, deploy one of the two files here on your own account and point Palier at it. Your key
then goes to your own endpoint instead.

| File | Platform |
| --- | --- |
| [`cloudflare-worker.mjs`](cloudflare-worker.mjs) | A Cloudflare Worker |
| [`vercel/api/realtime-secret.mjs`](vercel/api/realtime-secret.mjs) | A Vercel function |

Each is one file with no dependencies, short enough to read in full before you deploy it. Read it first. Between their
`palier-selfhost: shared code` markers the two are identical, and a test in this repository keeps them that way.

## How it works

1. You tap **Start the session** in studio mode. Palier opens your endpoint in a small popup window. It has to be a
   popup: Palier's Content Security Policy lets the page connect to Palier and OpenAI only, for every user, so it cannot
   `fetch` an address only your browser knows. A popup and `postMessage` are not connections, so the policy stays as it
   is.
2. The page your endpoint serves tells Palier it is ready, by `postMessage`, to the one Palier address it was deployed
   for (`ALLOWED_ORIGIN`).
3. Palier hears that from the popup it opened, at your endpoint's address, and only then posts your key to it. The
   message goes **to your endpoint's origin only**, so if the popup were sent anywhere else the key would not be
   delivered.
4. The page posts the key to its own origin. Your endpoint asks OpenAI for a 60-second pass, with Palier's model and
   voice, and answers the pass and nothing else. The page posts the pass back to Palier and closes itself.
5. Palier dials OpenAI with the pass, exactly as it does with one from its own server.

Both sides check the other's origin and window. Your endpoint keeps nothing, writes nothing and has no `console` call,
so nothing it handles can reach a log line it writes.

## Deploy on Cloudflare

1. Workers & Pages → **Create** → **Create Worker**. Name it, deploy the starter, then **Edit code**.
2. Replace the starter with the whole of `cloudflare-worker.mjs`, and deploy.
3. Settings → **Variables and Secrets** → add `ALLOWED_ORIGIN` with the address of the Palier you use, for example
   `https://palier-virid.vercel.app`, with no path and no trailing slash. Deploy again.
4. Your endpoint's address is the Worker's, for example `https://palier-secret.<you>.workers.dev/`.

With Wrangler instead: `wrangler deploy cloudflare-worker.mjs --name palier-secret --compatibility-date 2026-10-01`, then
`wrangler secret put ALLOWED_ORIGIN` (a plain variable works too; it is not a secret).

Keep **Workers Logs** off for this Worker if you turned them on for your account. Cloudflare's request logs record the
path and status, not the `Authorization` header, but there is nothing here worth logging.

## Deploy on Vercel

1. Import this repository in Vercel as a new project, and set its **Root Directory** to `selfhost/vercel`. Leave the
   framework as **Other**.
2. Settings → **Environment Variables** → add `ALLOWED_ORIGIN` with the address of the Palier you use, for Production.
3. Deploy. Your endpoint's address is `https://<your-project>.vercel.app/api/realtime-secret`.

Vercel's runtime logs record each request's method, path and status, and anything a function writes to the console.
This function writes nothing, and the key travels in a header, which the logs do not record.

## Point Palier at it

Palier → Settings → **Your key** → **The one exception: studio mode** → enter your endpoint's address and choose **Use
this endpoint**. The address must start with `https://` (plain `http://` is accepted for `localhost` alone). It is kept on
that device only: it is never synced to your other devices and never exported, like the key itself. Set it on each
device you use. **Use Palier's server again** forgets it, and so does removing your key or wiping your data.

The first time you start a studio session, your browser may ask whether to allow the popup. Allow it for Palier's
address.

## If it does not work

Palier says "Your own endpoint gave no pass" when:

- **the browser blocked the popup.** Allow popups for Palier's address and start again;
- **the window was closed** before it answered;
- **it never answered within 30 seconds.** Usually `ALLOWED_ORIGIN` does not match the Palier you opened, exactly:
  scheme, host and port. Open your endpoint's address directly: the page says when it is not configured;
- **the address redirects.** Palier listens for the page at the origin of the address you entered, so a redirect to
  another origin (a `workers.dev` address to your own domain, or `www.` to the bare domain) is never heard, and the
  wait runs out. Enter the final address, the one the browser ends up showing;
- **it refused for a reason of its own.** `forbidden-origin` means the mint did not come from the endpoint's own page.
  On a deployment whose `request.url` does not carry its public address, every mint is refused this way: please report
  it, with the platform.

A rejected key or an exhausted quota is reported in the same words as without your endpoint.

**A reconnect needs another popup.** If the connection drops mid-session, Palier asks for a fresh pass, and your browser
may block a popup that no tap opened. The session then ends, with everything said so far kept, rather than reconnecting.

## Configuration

| Variable | Required | Meaning |
| --- | --- | --- |
| `ALLOWED_ORIGIN` | yes | The Palier your page talks to: `https://palier-virid.vercel.app`, or your own deployment's address |
| `OPENAI_BASE_URL` | no | Defaults to `https://api.openai.com/v1`. The repository's end-to-end test points it at a stand-in |

The protocol, for anyone writing their own endpoint: the page posts `{ type: "palier-realtime-secret:ready", version: 1 }`
to its opener; Palier answers `{ type: "palier-realtime-secret:mint", version: 1, id, key, model, voice }`; the page
answers `{ type: "palier-realtime-secret:minted", version: 1, id, value, expiresAt }` with an ISO instant, or
`{ type: "palier-realtime-secret:refused", version: 1, id, error }` with one of `missing-key`, `invalid-key`,
`rate-limited` or `upstream`, or a code of its own.
