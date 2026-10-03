# Security policy

Palier holds one thing worth stealing: the OpenAI API key a user brings. It is kept in their
browser, encrypted at rest, and sent nowhere but OpenAI (ADR 2). This page says how to report a
problem and what we will do about it.

## Reporting a vulnerability

**Report it privately through GitHub:** on this repository, open the **Security** tab and choose
**Report a vulnerability**. That opens a private advisory that only the maintainer can read. Please
do not open a public issue, pull request or discussion for a vulnerability.

A useful report says what an attacker can do, and to whom. It gives the steps, the browser, and the
page or route. You do not need a fix.

## What happens next

- **Within 7 days:** we acknowledge the report and tell you whether we can reproduce it.
- **Within 90 days of the report:** a fix is released. We then publish the advisory, crediting you
  unless you ask us not to. This is coordinated disclosure: please keep the details private until
  then, or until 90 days have passed, whichever is sooner.
- If a fix needs longer, we say why before the 90 days are up and agree a date with you.

This is a free, personal project maintained in spare time, with no bug bounty.

## In scope

- **The user's key:** anything that lets it reach an origin other than `api.openai.com`, a server
  of ours, storage outside the browser's encrypted vault, a synced document, an export, a log or an
  error report. With a self-hosted endpoint set, also anything that lets it reach another origin than
  that endpoint's.
- **Script injection:** anything that runs script the app did not ship, whatever the Content Security
  Policy and Trusted Types say (`apps/web/src/lib/csp.ts`).
- **Other device-local data:** audio, transcripts and writing submissions leaving the device other
  than as documented (requirement R12).
- **Sync:** reading or changing another account's progress, taking over a device, or getting around
  the pairing code or the rate limits (ADR 5, ADR 21).
- **The telemetry endpoint** tying an event to a person, an account or a device.

## Out of scope

- Losing a key the user pasted into another site, a shared machine or a compromised browser, or
  exposing it through a malicious browser extension. The app cannot defend against those. Its advice
  is a dedicated key with a hard monthly usage limit.
- Denial of service against the hosting provider, and volumetric attacks.
- A missing header or setting with no demonstrated impact.
- Findings in dependencies that the app does not ship to the browser or run on its server. Report
  those upstream. Dependabot and the CI audit follow the rest.

## How the key is protected, stated honestly

- It is stored in IndexedDB as AES-GCM ciphertext, under a non-extractable key. Or, if the user
  chooses, it is not stored at all and lasts only for the tab.
- Every page is served with a strict Content Security Policy. No inline script runs without that
  response's nonce. `connect-src` allows only this origin and `api.openai.com`. Trusted Types are
  enforced, and no third-party script is loaded (ADR 22).
- **One exception, and only one.** Studio mode's live voice conversation needs a short-lived client
  secret, which OpenAI mints only for a request made with a standard key (ADR 3). So when a user starts
  a studio conversation, the browser sends the key in the `Authorization` header of one request,
  `POST /api/realtime/secret`, and the server uses it once to call `POST /v1/realtime/client_secrets`.
  It returns `{ value, expiresAt }` and nothing else. The route never reads a body, never logs, stores
  or echoes the key, and holds it no longer than the request. A refusal is a code, never OpenAI's
  text. The handler is `apps/web/src/server/realtime-handlers.ts`, short enough to read in full, and
  every branch has a test. The key settings and the privacy notice say this to users. No other
  request ever carries the key to a server of ours, and the key-leak test holds that.
- **The way around the exception.** A user who will not accept it can deploy `selfhost/` (a one-file
  Cloudflare Worker or Vercel function) on their own account and enter its address in the key settings.
  Palier then opens that endpoint in a popup and passes the key by `postMessage`, only after the page
  there says it is ready, only to that endpoint's origin, and reads the answer only from that popup. The
  endpoint's page mints on its own origin and closes itself. The address is kept on that device only,
  never synced or exported. Anything that gets the key delivered to a window or origin other than the
  configured endpoint's is in scope.
- **The Content Security Policy cannot stop one thing:** script that is already running navigating
  the whole page to another origin. The protection there is that no script the app did not ship can
  run. If you find one that can, that is the report we most want.
