# ADR 11: Next.js on Vercel

**Status:** Accepted
**Date:** 2026-09-17
**Supersedes:** None

## Context

The owner runs existing side projects on Vercel and wants locale-prefixed bilingual routing, static content delivery and a small number of serverless functions.

## Decision

Next.js App Router with TypeScript strict, hosted on Vercel. The item bank ships as static content-hashed JSON on the CDN.

## Consequences

Positive: familiar, free at this scale, good bilingual routing support. Negative: framework lock-in in the web application, though the engine, domain and app packages are framework-free and portable.

## Revisit when

Vercel pricing changes materially, or a department wants to self-host, in which case only apps/web needs rework.
