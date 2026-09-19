# ADR 3: One server call may see the user's key, for realtime voice

**Status:** Accepted
**Date:** 2026-09-17
**Supersedes:** None

## Context

ADR 2 keeps the key out of our infrastructure. OpenAI's Realtime API over WebRTC requires an ephemeral client secret minted by a server-style call to /v1/realtime/client_secrets using a standard key. There is no documented browser-direct path.

## Decision

A single stateless edge function accepts the user's key in a request header, mints the ephemeral token, returns it, and holds nothing. Request logging is disabled for that route. A self-hosted endpoint option ships for users who will not accept this.

## Consequences

Positive: realtime voice becomes possible at all. Negative: the claim that the key never leaves the browser acquires an exception that has to be stated honestly everywhere it appears. Users are trusting the deployment, not only the source code, and the self-hosted option will realistically go unused.

## Revisit when

OpenAI documents a browser-direct realtime auth path, or the feature is dropped.
