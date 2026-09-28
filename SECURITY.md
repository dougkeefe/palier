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
  error report.
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
- **One exception is designed but not built.** Realtime voice would need one stateless server call
  that sees the key, to mint a short-lived token (ADR 3). That feature is deferred past 1.0, so today
  no server of ours ever receives the key.
- **The Content Security Policy cannot stop one thing:** script that is already running navigating
  the whole page to another origin. The protection there is that no script the app did not ship can
  run. If you find one that can, that is the report we most want.
