# ADR 15: No third-party analytics or error reporting

**Status:** Accepted
**Date:** 2026-09-17
**Supersedes:** None

## Context

The product promises that practice content, audio and transcripts never leave the device. An error reporting service receives arbitrary payloads including, eventually, user content. An analytics SDK is a third-party script with access to everything on the page, which also undermines the content security policy protecting the user's API key.

## Decision

No analytics SDK, no error reporting service, no third-party scripts of any kind. Client errors produce a diagnostic bundle the user can inspect and submit deliberately. Product health comes from the host's own request logs.

## Consequences

Positive: the privacy claim is true without qualification, and the CSP can be strict. Negative: no passive visibility into production errors, so problems surface only when a user reports them.

## Revisit when

Volume grows to where blind operation is untenable, at which point a self-hosted reporter that scrubs payloads is the option to evaluate.
