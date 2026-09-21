# Palier: Architecture Specification

**Working name:** Palier
**Version:** 0.1 draft
**Date:** 17 September 2026
**Owner:** Doug Keefe
**Companion documents:** product-requirements.md (what), content-factory.md (the content subsystem), implementation-plan.md (in what order), adr/ (why)

> **How to read this document.** It describes how the system works and the constraints it operates under. It does not argue for its choices; the reasoning and the alternatives considered live in the numbered decision records under `adr/`, cited inline as ADR n. Anything here is changeable by a future maintainer who writes a superseding ADR.
**Status:** For review

> **Reconciled 19 September 2026.** Sections 1, 2, 4, 9.1, 17, 18 and 19 had fallen behind
> decisions recorded after they were written. Corrected against ADR 6 (hand-authored content
> is a supported path), ADR 10 (six packages, `@palier/domain`), ADR 16 (no estimate store)
> and `implementation-plan.md` §7 (the build order). No new position is taken here; each
> edit brings this document in line with a decision already recorded elsewhere. See
> deviation D17 in `progress.md`.

---

## 1. Constraints that drive the architecture

| Constraint | Consequence |
| --- | --- |
| Free and open source, no operating budget | No server-side AI spend, no managed database in the critical path, everything possible runs on Vercel's free tier and in the browser |
| Users bring their own OpenAI key | The key lives in the browser. The server never stores it and, with one narrow exception, never sees it |
| Local-first, sync on by default, no sign-in required | The browser is the system of record and the cloud is a replica. Sync runs against an anonymous device-generated identity from first run, upgradeable to an email or GitHub identity later, and disableable in settings |
| Works with no key and no sign-in | The item bank ships as static, cacheable assets and the whole drill and exam experience is client-side |
| The item bank is machine-drafted by default, with hand-authored items passing the same gates (ADR 6) | The content factory is a first-class subsystem with adversarial review gates, not a maintainer script. Item quality is a build problem, not an editorial one |
| Bilingual and WCAG 2.2 AA | Server-rendered localised routes, no string literals in components, automated a11y gates in CI |
| Realtime voice | WebRTC to OpenAI from the browser, which needs an ephemeral credential, which needs one server call |

---

## 2. Architecture

```
┌──────────────────────────────── Browser ────────────────────────────────┐
│                                                                          │
│  Next.js App Router (React Server Components + client islands)           │
│                                                                          │
│  ┌── Session engine ──┐  ┌── Scheduler ──┐  ┌── Trend calc ──┐           │
│  │ item presentation  │  │ Leitner boxes │  │ band accuracy │            │
│  │ timing, checkpoint │  │ daily plan    │  │ w/ confidence │            │
│  └────────────────────┘  └───────────────┘  └───────────────┘            │
│                                                                          │
│  ┌── Local store (Dexie / IndexedDB) ──────────────────────────────┐     │
│  │ attempts · schedule · sessions · transcripts · audio             │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  ┌── Key vault (Web Crypto + IndexedDB, non-extractable where possible) ─┐│
│  └───────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌── AI client (runs on the user's key, in the browser) ────────────┐    │
│  │  generation · writing feedback · oral scoring · transcription     │    │
│  └───────────────────────────────────────────────────────────────────┘    │
└───────┬──────────────────────┬─────────────────────────┬─────────────────┘
        │ static fetch          │ 1 call, key in header   │ WebRTC (ek_…)
        ▼                       ▼                         ▼
┌───────────────┐   ┌──────────────────────────┐   ┌──────────────────┐
│ Item bank CDN │   │ Vercel Edge Function     │   │ OpenAI Realtime  │
│ (immutable    │   │ /api/realtime/secret     │   │ api.openai.com   │
│  versioned    │   │ stateless, no logging,   │   └──────────────────┘
│  JSON)        │   │ mints ephemeral token    │
└───────────────┘   └──────────────────────────┘
                                │
                    ┌───────────┴────────────┐
                    │ Sync backend (default) │
                    │ anonymous device ids,  │
                    │ pairing by code,       │
                    │ Postgres replica of    │
                    │ progress records only  │
                    └────────────────────────┘
```

Three things to notice. First, the item bank is a static asset, so the core product is a CDN-served experience with no backend dependency and no cold starts. Second, the only server code in the paid path is a stateless token minter small enough to review in one sitting, which is also the only place the user's key touches our infrastructure. Third, sync is on the side of the architecture, never in front of it: every read the session engine makes comes from IndexedDB, so a sync outage is invisible to someone studying.

---

## 3. Stack

| Layer | Choice | Rationale |
| --- | --- | --- |
| Framework | Next.js 15+, App Router, TypeScript strict | Matches your existing Vercel projects, gives localised routing and RSC for the static content shell |
| Hosting | Vercel | Free tier is sufficient, edge functions for the token minter |
| Styling | Tailwind CSS with a token layer as CSS custom properties | Token layer exists so themes and contrast tests operate on the tokens, not on Tailwind classes |
| Components | Radix UI primitives, custom-styled | Accessibility primitives that are hard to get right by hand, especially dialogs, radio groups and focus management |
| Local persistence | Dexie over IndexedDB | Structured queries over attempts, robust, handles blobs for audio |
| State | Zustand for session state, TanStack Query only for the optional sync layer | Session state is local and synchronous. Do not over-architect |
| i18n | next-intl | Locale-prefixed routes, typed message keys, ICU plurals |
| Charts | Visx or hand-rolled SVG | The charts are few and specific. Avoid a heavy library |
| Audio | Native WebRTC and MediaRecorder | No wrapper needed. `@openai/agents-realtime` is an option for studio mode if it reduces the state machine work |
| Testing | Vitest, Playwright, axe-core, Zod for runtime validation | See section 14 |
| Content authoring | MDX for library articles, JSON for items, validated by Zod schemas in CI | Items are data, not code |
| Sync backend | Serverless Postgres (Neon or equivalent), Drizzle ORM. No auth library in v1 | Scale-to-zero matters because sync is on for everyone. See section 9.4 for the capacity model and ADR 5 for why there is no auth library |

Deliberately not used: a CMS, a state management framework beyond Zustand, a component library with its own design language, server-side rendering of session content, and any analytics SDK.

---

## 4. Repository layout

```
palier/
├── apps/
│   ├── web/                   Next.js application and the one composition root
│   │   ├── app/[locale]/      Localised routes
│   │   ├── components/
│   │   ├── lib/container.ts   The only file that names concrete adapters (§3.5 of the plan)
│   │   └── messages/          en.json, fr.json
│   └── factory/               The content factory as a CLI (see section 8.3)
├── packages/
│   ├── domain/                Types, branded ids, invariants, Zod schemas, the profile loader
│   ├── engine/                Pure, dependency-free scoring, selection and scheduling
│   ├── app/                   Port interfaces and use cases
│   ├── adapters/              dexie · bank · openai · sync · vault, one subpath export each
│   ├── ui/                    Design tokens, primitives, item renderers
│   └── testing/               In-memory ports, contract suites, fixtures, seeded Random, FakeClock
├── content/
│   ├── profiles/              Exam profiles. psc-sle.json holds every SLE-specific number (ADR 9)
│   ├── items/fr/              The item bank, sharded by skill and sub-skill
│   ├── items/en/
│   ├── passages/              Source passages with provenance metadata
│   ├── forms/                 Fixed mock exam forms
│   └── library/               MDX reference articles
└── docs/                      These specs, the contribution guide, ADRs
```

The package set and the arrows between them are specified by `implementation-plan.md` §3
and decided by ADR 10, which supersedes an earlier twelve-package split. That document is
authoritative for module structure; this tree is here for orientation. The factory lives at
`apps/factory` rather than under `tools/`, and the pipeline stages listed in section 8.3
are directories within it.

`@palier/engine` being pure and dependency-free matters: it is the part that must be unit-testable and deterministic, and it is what a fork would reuse. It takes `Clock` and `Random` as parameters and calls neither `Date.now` nor `Math.random`, which a lint rule enforces.

---

## 5. Content model

### 5.1 Item schema

```ts
type Item = {
  id: string                    // ULID, stable forever
  version: number
  skill: 'reading' | 'writing'
  lang: 'fr' | 'en'             // language of the item content
  type:
    | 'cloze'                   // best word/phrase to fill a blank
    | 'comprehension'           // question about a passage
    | 'error-id'                // identify the error
    | 'best-completion'         // complete a sentence or short paragraph
  passageId?: string            // for comprehension and passage-bound cloze
  stem: LocalisedRich           // the sentence, question or paragraph
  blankIndex?: number           // position of the blank within the stem
  options: Array<{
    id: 'a' | 'b' | 'c' | 'd'
    text: string                // in the item language
    rationale: Localised        // why right or why tempting-and-wrong. REQUIRED
  }>
  key: 'a' | 'b' | 'c' | 'd'
  explanation: Localised        // the rule, taught. REQUIRED, both locales
  subSkill: SubSkill            // exactly one, from the fixed taxonomy
  targetBand: 'A' | 'B' | 'C'   // the only difficulty signal the engine uses
  stats?: {                     // observed, never authored. Absent until telemetry exists
    responses: number
    proportionCorrect: number   // simple difficulty
    pointBiserial: number       // simple discrimination
    updatedAt: string
  }
  topic: Topic
  tags: string[]
  provenance: {
    origin: 'authored' | 'generated' | 'adapted'
    sourcePassageId?: string
    generator?: { model: string; promptVersion: string; date: string }
    reviewedBy?: string
    reviewedAt?: string
  }
  status: 'draft' | 'review' | 'published' | 'retired'
  createdAt: string
  updatedAt: string
}
```

`Localised` is `{ en: string; fr: string }`. Rationales and explanations must exist in both. The CI validator fails on a missing rationale, a missing locale, four options where two are defensible, or an explanation that merely restates the key.

### 5.2 Passage schema

```ts
type Passage = {
  id: string
  lang: 'fr' | 'en'
  docType: 'email' | 'memo' | 'letter' | 'bulletin' | 'report-excerpt' | 'research' | 'note'
  title: string
  body: string                  // markdown, light formatting only
  wordCount: number
  targetBand: 'A' | 'B' | 'C'
  topic: Topic
  readability: { sentences: number; avgSentenceLength: number; rareWordRatio: number }
  source: {
    kind: 'original' | 'derived'
    url?: string
    retrievedAt?: string
    licence?: 'OGL-Canada-2.0' | 'canada.ca-non-commercial' | 'public-domain' | 'other'
    licenceNote?: string
    transformation?: string     // how far it was rewritten
  }
  status: 'draft' | 'review' | 'published' | 'retired'
}
```

Provenance is not optional. Every passage records where it came from and under what terms, because the licensing posture in the requirements document only holds if this data exists and is checked.

### 5.3 Oral scenario schema

```ts
type OralScenario = {
  id: string
  lang: 'fr' | 'en'
  sessionType: 'warmup' | 'work' | 'opinion' | 'situation' | 'full'
  targetBand: 'B' | 'C'
  phases: Array<{
    name: string
    minutes: number
    intent: string              // what this phase is probing
    seedQuestions: string[]     // examiner starting points
    escalation: string[]        // harder follow-ups if the candidate is coping
    deescalation: string[]      // simpler reframes if they are struggling
  }>
  topic: Topic
}
```

### 5.4 Exam forms

A form is a fixed, ordered list of item ids plus a configuration matching one of the real test shapes from the requirements document. Forms are versioned and immutable once published, so that band mappings stay comparable over time.

```ts
type ExamForm = {
  id: string
  skill: 'reading' | 'writing'
  lang: 'fr' | 'en'
  mode: 'supervised' | 'unsupervised'
  itemIds: string[]             // 60 or 65 supervised, 25 or 30 unsupervised
  pilotItemIds: string[]        // 10 for supervised forms, excluded from score
  timeLimitMinutes: number      // 90 or 45
  bandCuts: Array<{ band: 'X'|'A'|'B'|'C'|'E'; min: number; max: number }>
  version: number
}
```

### 5.5 Bank build and delivery

`tools/build-bank` compiles `content/` into immutable, content-hashed bundles:

```
/bank/v{n}/manifest.json          index, counts, hashes, per-shard metadata
/bank/v{n}/fr/reading/{shard}.json
/bank/v{n}/fr/writing/{shard}.json
/bank/v{n}/passages/{shard}.json
/bank/v{n}/forms/{formId}.json
/bank/v{n}/oral/scenarios.json
```

Shards are roughly 100 items, around 40 to 80 KB gzipped. The client fetches the manifest on load, then lazily fetches only the shards the scheduler needs, and caches them in a service worker cache keyed by content hash. Bank updates are additive: a new version is a new path, the old one stays valid, and the client migrates when it next fetches the manifest. Attempts reference item ids, which are stable across versions, so history survives bank updates.

Target: full offline capability for a user's active shards after the first session, total initial download under 400 KB.

---

## 6. Bring your own key: design and threat model

### 6.1 What we are protecting

The user's OpenAI API key. Compromise means someone else spends their money. It is not our key and not our billing relationship, which changes the risk calculus but does not remove our responsibility to handle it carefully and to tell the truth about what we do with it.

### 6.2 Storage

- Entered once in settings, never rendered in full after entry (masked, last four characters shown).
- Stored in IndexedDB, encrypted at rest with AES-GCM using a key derived from a device-bound secret held as a non-extractable `CryptoKey` in IndexedDB. This defends against casual inspection and against extensions reading storage in plaintext. It does not defend against a full XSS compromise of our own origin, and the documentation says so rather than implying otherwise.
- Optional "do not remember" mode, where the key is held in memory for the session only.
- Cleared on sign-out and by the one-tap data wipe.

### 6.3 Direct calls, and the one exception

For text generation, writing feedback, oral scoring and transcription, the browser calls `api.openai.com` directly with the user's key. The request does not pass through Vercel. This is the correct design for BYOK: our infrastructure is never in the data path, we cannot log the key, and we cannot see the user's content.

The exception is realtime voice. OpenAI's Realtime API over WebRTC requires an ephemeral client secret, minted by `POST /v1/realtime/client_secrets` using a standard API key, and OpenAI's guidance is explicit that standard keys belong on a server and not in the browser. Since the key here belongs to the user and is already in their browser, that guidance is aimed at a different threat, but the endpoint still expects a server-style call.

Design:

- `POST /api/realtime/secret` on a Vercel Edge Function.
- The user's key arrives in an `Authorization` header, is used once to call OpenAI, and the ephemeral token is returned. The key is never written to disk, never placed in a log line, never attached to an error report, and never held past the request.
- The function sets `export const runtime = 'edge'`, disables request logging for that route, and returns only the ephemeral token, its expiry, and the session id.
- A prominent note in settings states plainly that this single call is the one time the key transits our infrastructure, why it is necessary, and that the route's source is short enough for anyone to read in full.
- Escape hatch for the paranoid: a `selfHostedTokenEndpoint` setting lets a user point this call at their own deployment. The repo ships a one-file Cloudflare Worker and a Vercel function for that purpose.

Rejected alternatives, recorded so the decision is not relitigated: WebSocket from the browser with the key in a subprotocol string works but puts the raw key in a URL-adjacent position and is fragile across proxies. Turn-based practice mode with no realtime avoids the problem entirely, which is why it exists, but it is not the product people want for exam rehearsal.

### 6.4 Additional controls

- Strict CSP with no inline script, `connect-src` limited to self, `api.openai.com` and the bank origin, and Trusted Types where supported. XSS is the real threat to a browser-held key, so this is the main mitigation.
- No third-party scripts at all. No analytics SDK, no tag manager, no font CDN.
- Subresource integrity on anything not same-origin.
- Dependabot plus a lockfile audit gate in CI, since a supply chain compromise of a client dependency is the other realistic path to the key.
- Onboarding recommends the user create a dedicated key with a hard monthly usage limit on their OpenAI account, with screenshots. That is the only control that actually bounds the loss.

---

## 7. Engine

The engine package is pure TypeScript, no I/O, fully unit-tested.

**Design constraint:** the engine stays small enough that one person can hold all of it in their head, and every calculation it performs can be explained to a user in one sentence. Any change that breaks either property needs an ADR. See ADR 7 and ADR 8 for why the calculations are as simple as they are.

### 7.1 Where the band estimate comes from

Two different numbers, and keeping them apart is what makes this honest.

**The exam band is the real one.** A mock exam is a fixed form matching a published PSC variant, scored as raw correct over scored items, mapped through the published cut table. There is no model in this path at all. It is the same arithmetic the PSC uses, and it is the number the product leads with.

**The practice trend is the rough one.** Between exams, the app shows accuracy per band tag, which is the simplest thing that answers the user's actual question:

```
For each skill, over the last 100 scored attempts:
  accuracyAtB = correct on B-tagged items / B-tagged items attempted
  accuracyAtC = correct on C-tagged items / C-tagged items attempted
  interval    = Wilson score interval at 95% on each proportion
```

Displayed as "You are getting 84% of B-level items right and 52% of C-level items right," with the interval shown as a range. Not a band letter, because a band letter from drill data would imply a precision that is not there.

The Wilson interval is a closed-form expression requiring no fitting and no parameters. See ADR 7.

**Minimum evidence:** 30 scored items at a band tag before showing a figure for that band. Below that, show progress toward the threshold.

### 7.2 Item selection

A filter and a weighted shuffle. No information functions, no exposure control mechanism.

```
candidates = published items
  where lang and skill match
  and targetBand is in the user's working set (their target band, plus one below)
  and not attempted in the last 14 days

weight(item) = 3 if item.subSkill is in the user's three weakest
               1 otherwise

pick n by weighted random sample without replacement,
then order so that no two consecutive items share a sub-skill
```

Weakest sub-skill is accuracy over the last 50 attempts in that sub-skill, minimum 8 attempts to qualify.

Diagnostic mode samples evenly across bands and sub-skills rather than weighting, because its job is coverage rather than targeting.

### 7.3 Review scheduling

Leitner boxes with fixed intervals. Five boxes, one rule.

| Box | Next review |
| --- | --- |
| 1 | tomorrow |
| 2 | 3 days |
| 3 | 7 days |
| 4 | 21 days |
| 5 | retired from the queue |

Correct moves the item up one box. Incorrect sends it back to box 1, always. An item answered correctly but slowly, or where the user changed their answer, holds its box rather than advancing.

The four intervals are values in the exam profile, not constants in code, so they can be retuned from usage data without a release. See ADR 8.

### 7.4 Daily plan generation

```
plan(now) =
  [ due reviews, capped at 40% of the daily minute goal ]
  + [ new items targeting the weakest sub-skill, ~40% ]
  + [ mixed maintenance from strengths, ~20% ]
  adjusted by: test date proximity (shift toward mock exam and weak areas),
               recent oral session findings (inject targeted items),
               yesterday's completion (shorten after a miss, never lengthen)
```

In the final three days before a declared test date, the plan tapers: review only, no new items, one short confidence-building set, and no mock exams in the last 24 hours.

### 7.5 Scoring

- Drill: per-item, immediate.
- Mock exam: raw score over scored items only, pilot items excluded and marked as such in the review, then mapped through the form's `bandCuts`, which mirror the published PSC cuts.
- The results screen shows the raw score alongside the band and the cut points, so the mapping is transparent and the user can see the distance to the next band.

### 7.6 Item quality statistics

The only statistics the system computes, and both are one-liners over telemetry.

- **Difficulty:** proportion of users who got the item right. Compared against its band tag. An item tagged C that 90 percent of people get right is mis-tagged.
- **Discrimination:** the point-biserial correlation between getting this item right and the user's total score on the rest of the set. Negative means the item is punishing the people who know the most, which is the signature of a broken key or two defensible answers. This single number is the most useful quality signal available and it is one line of arithmetic.

Auto-retirement triggers, unchanged from the requirements document: negative point-biserial, proportion correct above 0.95 or below 0.15 at the tagged band, or three user reports on the same reason code.

Note on sample size, because it constrains what these numbers mean. A proportion correct is usable from around 30 responses. A point-biserial is noisy below about 100. With a pilot of 30 people the early figures are indicative only, and the retirement rules apply a minimum response count before firing. This is stated here so that nobody later mistakes these for calibrated parameters.

### 7.7 Non-goals

The engine does not implement, and is not intended to implement:

- Item response theory in any form (ADR 7)
- Adaptive item selection driven by information functions (ADR 7)
- Dedicated exposure control machinery beyond random sampling (ADR 7)
- A fitted spaced repetition algorithm (ADR 8)
- A single band letter derived from practice data rather than an exam (ADR 7)
- Time decay weighting on historical attempts

Each ADR states what evidence would justify revisiting. These are current decisions with recorded conditions for change, not permanent prohibitions.

---

## 8. AI subsystem

All AI calls are client-side on the user's key, except the ephemeral token mint. Every call goes through a single `AiClient` that handles model selection, schema validation, retry, and cost accounting.

### 8.1 Model configuration

Model names change often. The client reads a `models.json` config shipped with the app, overridable by the user in settings:

```json
{
  "text":       { "id": "<current general model>", "fallback": "<cheaper model>" },
  "reasoning":  { "id": "<current reasoning model>" },
  "realtime":   { "id": "gpt-realtime-2.1" },
  "transcribe": { "id": "gpt-4o-transcribe", "fallback": "gpt-4o-mini-transcribe" },
  "tts":        { "id": "<current tts model>", "voice": "..." }
}
```

Verify current model identifiers against OpenAI's models documentation at build time. A CI job pings the models endpoint with a maintainer key and opens an issue when a configured model is no longer listed. Never hardcode a model id in application code.

### 8.2 Structured output contract

Every non-realtime call uses strict structured outputs with a JSON Schema derived from a Zod schema, and the response is re-validated client-side with the same Zod schema before use. A validation failure retries once with the errors appended, then fails gracefully with a message that does not blame the user.

Prompts live in `lib/ai/prompts/` as versioned files. Each carries a `promptVersion` that is recorded in item provenance and in oral session records, so output quality can be traced back to a prompt revision.

### 8.3 Content generation

The content production pipeline is a separate subsystem with its own specification, risk register and roadmap. See `content-factory.md` and ADR 14. It shares only the content schemas with this application and communicates through committed data files; there is no runtime coupling.

What this application needs to know about it:

- The bank arrives as versioned static shards (section 5.5). The application does not care how they were produced.
- Items carry a `provenance` record, which the UI surfaces on request.
- The `AiProvider` port's `generateItems` and `reviewItem` methods are shared with the factory, which is the only code-level coupling between the two.

**Runtime generation** is the one piece that lives in the application. The "generate a fresh set" button runs a compressed version of the factory's draft and review steps in the browser on the user's key: draft, single adversarial review, discard on failure. Runtime items are stored locally only, are excluded from the user's practice trend, and carry a visible marker saying they were generated just now and not reviewed. One tap submits one to the project, which opens a pre-filled issue.

### 8.4 Writing feedback (`assessWriting`)

Input: the prompt, the user's text, the target band.
Output: per-criterion band and evidence (register, structure, grammar and mechanics, vocabulary precision, task achievement), an inline error list with offsets, corrections and rule references, and a model answer at the target band.

Offsets rather than a rewritten string, so the UI can render corrections inline over the user's own text.

### 8.5 Oral studio

**Studio mode (realtime).**

1. Client checks mic permission and runs a 3 second level check.
2. Client requests an ephemeral token from `/api/realtime/secret`, sending the user's key.
3. Client establishes WebRTC with the realtime model, attaching the local audio track and a data channel.
4. Session instructions configure the examiner persona: a PSC-style assessor, speaks only the target language, never coaches, never corrects during the session, keeps its own turns short so the candidate does most of the talking, follows the scenario's phase plan, escalates when the candidate copes and reframes when they struggle, and manages time.
5. Phase transitions are driven by the client, not left to the model. The client sends a data channel event at each phase boundary with the next phase's intent and seed questions. This keeps sessions predictable and reproducible, which matters for a practice tool.
6. The model is given two tools: `note_observation(criterion, evidence, severity)` so it records assessment notes during the session, and `flag_difficulty(direction)` so the client can adapt. Notes never surface during the session.
7. Input transcription is enabled on the session so a transcript accrues without a separate pass.
8. The client records the local audio track with MediaRecorder in parallel, stored as a blob in IndexedDB.

**Practice mode (turn-based).**

Examiner question rendered as text plus TTS. User records an answer. Audio goes to the transcription model. Transcript plus history goes to the text model, which produces the next question and a note. Roughly a tenth of the cost of studio mode and fully usable on a weak connection.

**Post-session scoring (`assessOral`).**

A single structured call over the full transcript, the in-session notes, the scenario definition, and the published level descriptors quoted in the prompt. Output: per-criterion band with quoted evidence, three ranked fixes each mapped to a sub-skill so the scheduler can act on them, a missing-vocabulary list with in-context examples, a marked-up transcript, and fluency metrics (words per minute, filler count, mean pause length) computed client-side from timings rather than asked of the model.

Pronunciation is not assessable from a transcript. It is reported as not assessed by default. If the user opts in, the recorded audio is sent to an audio-capable model for a pronunciation and intelligibility judgement only, with a clear statement that the audio is being uploaded to OpenAI on their key.

### 8.6 Cost accounting

Every call records token and audio usage from the API response into a local ledger, priced from a `pricing.json` that ships with the app and is refreshed by a maintainer CI job. The UI shows per-feature estimates before the user commits and a running total in settings.

Order of magnitude, to be replaced with measured figures before launch: realtime voice is the dominant cost by a wide margin and a full 22 minute simulation is likely to be the most expensive single action in the product. Practice mode, writing feedback and item generation are all small by comparison. The design consequence, already reflected in the requirements document, is that practice mode is the daily default and studio mode is positioned as the weekly dress rehearsal.

Guards: a pre-flight cost estimate on any action expected to exceed a user-set threshold, a hard client-side session length cap in studio mode, and an automatic disconnect on 25 minutes.

---

## 9. Data model

### 9.1 Local (IndexedDB via Dexie)

```ts
db.version(1).stores({
  profile:      'id',                              // singleton
  attempts:     'id, itemId, skill, ts, sessionId',
  schedule:     'itemId, due, skill',
  sessions:     'id, type, startedAt',
  examRuns:     'id, formId, startedAt, submittedAt',
  oralSessions: 'id, scenarioId, startedAt',
  oralAudio:    'sessionId',                       // Blob
  vocab:        'id, term, lang, due',
  generated:    'id, skill, createdAt',            // runtime-generated items
  costLedger:   '++id, ts, feature',
  settings:     'key',
  keyVault:     'id',                              // encrypted
  syncMeta:     'id'
})
```

There is deliberately no `estimates` table. The practice trend is derived from the attempt
log on demand, so there is nothing to persist, nothing to invalidate and nothing to
reconcile during sync (ADR 16, `implementation-plan.md` §3.3, and section 9.4 below).

Attempt record:

```ts
type Attempt = {
  id: string
  itemId: string
  bankVersion: number
  skill: Skill
  sessionId: string
  chosen: 'a'|'b'|'c'|'d'
  correct: boolean
  msToFirstSelect: number
  msToConfirm: number
  changedAnswer: boolean
  mode: 'drill' | 'diagnostic' | 'exam' | 'review'
  ts: string
}
```

Schedule entry (added 20 September 2026, with the `AnswerItem` use case; `implementation-plan.md` §3.3 and `progress.md` D38):

```ts
type ScheduleEntry = {
  itemId: string
  due: string | null      // null once the item retires from the queue
  skill: Skill
  box: number             // 1 to the retirement box, indexing the profile's intervals
}
```

Three notes for whoever writes the Dexie adapter.

The `stores()` string above is unchanged and still correct: it declares the primary key and the indexes, and `box` is neither — nothing queries on it. Adding it would index a value that is only ever read by id.

`due` is nullable **and that is load-bearing**. IndexedDB does not index a record whose key path is null, so a retired entry drops out of the `due` index while remaining addressable by `itemId` — which is exactly the wanted behaviour, and is why `ScheduleStore` has a `get`. It is asserted in the port contract suite ("never returns a retired entry from due, but still returns it from get") rather than left to each implementation to rediscover.

The schedule is replicated (section 12, "a replica of progress records"), and section 9.4 resolves conflicts by last write wins on `updatedAt` — **which this record does not carry**. That is an open Phase 2 question, not an oversight to fix here: a bare last-write-wins on `box` can regress an item's progress when two devices drill the same item offline, so the sync work has to decide between adding `updatedAt`, merging by taking the lower box (the conservative reading of Leitner), or treating the schedule as device-local. Recorded so that decision is made deliberately rather than inherited from the default.

Session record (added 21 September 2026, with the `StartSession`/`CompleteSession` use cases; `implementation-plan.md` §3.3 and `progress.md` D45):

```ts
type Session = {
  id: string
  mode: AttemptMode       // 9.1's `type` column: drill | diagnostic | exam | review
  startedAt: string
  completedAt: string | null   // null while the session is in progress
}
```

Two notes for whoever writes the Dexie adapter.

The `stores()` string `sessions: 'id, type, startedAt'` is unchanged and still correct — `completedAt` is a field, not an index, and nothing queries on it. Read `type` as `mode`: it is `AttemptMode` (the kind of session), deliberately not the oral `sessionType`, which is a field of `OralScenario` and belongs to `oralSessions` / the deferred `OralStore`.

Like `ScheduleEntry`, a synced `Session` carries no `updatedAt`, so the section 9.4 rule does not cover it either. Unlike `ScheduleEntry`, this needs no Phase 2 decision: `completedAt` is write-once (keep-first at the store), so the only merge that can happen — an in-progress record on one device, its completed counterpart on another — resolves correctly whichever way it goes, because `completedAt` never moves from a set instant back to null. Recorded so the sync author does not re-open D43's question for this record.

Storage budget: attempts are about 200 bytes each, so a heavy user generating 20,000 attempts over a year uses roughly 4 MB. Oral audio is the constraint at roughly 1 MB per minute of Opus. Policy: keep the last 10 oral sessions' audio, keep transcripts forever, warn at 200 MB, and offer a one-tap cleanup. Handle `QuotaExceededError` by evicting oldest audio first and telling the user.

### 9.2 Cloud (Postgres via Drizzle)

```
accounts(
  id uuid pk,                    -- server-assigned
  created_at, last_active_at,
  locale, target_lang, target_band
)                                -- no email, no identity, no claim state in v1
devices(
  id uuid pk, account_id fk, label text,
  secret_hash text,              -- Argon2id hash of the device secret
  created_at, last_seen_at, revoked_at
)
sync_documents(
  account_id fk, doc_type text, doc_id text,
  payload jsonb, updated_at timestamptz, device_id uuid, deleted bool,
  primary key (account_id, doc_type, doc_id)
)
telemetry_events(               -- opt-in, deliberately has no account_id
  id bigserial, item_id text, correct bool,
  response_ms int, session_accuracy_bucket smallint, bank_version int, created_at
)
```

`sync_documents` is a generic per-record envelope rather than a normalised mirror, so client schema changes do not require a server migration. Payloads are the client's own record shapes, opaque to the server.

Every query filters by the request's account id through a repository layer, never by ad hoc query construction. There is no cross-account read path in the codebase at all, which is easier to audit than row-level security policies.

### 9.3 Identity

Sync is on by default with no sign-in (ADR 4), so identity comes from the device. v1 has no accounts, no email, no OAuth and no session handling (ADR 5).

**First run.** The client generates a 256-bit device secret with `crypto.getRandomValues`, stores it in the key vault, and calls `POST /api/account/device`. The server creates an `accounts` row and a `devices` row holding an Argon2id hash of the secret, and returns the account id. The secret is the bearer credential for every subsequent sync request. The server never holds it in reversible form.

**Deferred creation.** The account row is created on completion of the first practice session, not on first page load. A visitor who lands and leaves creates nothing.

**Adding a second device.** Device one requests a pairing code: six characters, valid ten minutes, single use, rate limited. The user types it into device two, which calls `POST /api/account/pair` and receives its own device record and secret, then pulls the document set. No email, no third-party identity, no account to remember.

**Recovery.** There is none in v1, and the settings page says so in one plain sentence: if you lose every paired device, server-side progress is gone. The JSON export sits directly beneath that sentence. Adding a recoverable identity is deferred until there is evidence it is needed (ADR 5).

**Revocation.** Removing a device from settings sets `revoked_at` and its secret stops working on the next request.

**Threat model.** The device secret is a bearer token for one person's practice progress. It is not a password, it protects nothing financial, and what sits behind it is attempts and accuracy figures. It is stored like the API key (section 6.2), sent only over TLS to our own origin, and rate limited. Compromise exposes someone's French practice history, which is a real but bounded harm; the mitigation that matters is that nothing sensitive is in the synced set at all.

**Deferred past v1:** claimed identities by email or GitHub, cross-device recovery, a device management interface richer than a list and a remove button, and account merging. Each is a real feature with real cost and none is required for the product to deliver "my progress follows me from laptop to phone".

### 9.4 Sync protocol

- **Trigger:** on app focus if more than 5 minutes have elapsed, debounced 30 seconds after a session completes, on demand from settings, and on reconnect after offline.
- **Protocol:** push local records with `updatedAt` greater than the last watermark, pull server records newer than the same watermark, resolve per record, advance the watermark. Batched, gzipped, capped at 500 records per request with continuation.
- **Conflict resolution:** last write wins by `updatedAt`, with two cases that never conflict by construction. Attempts are append-only and keyed by client-generated ULID. Estimates are not synced as values at all; each device recomputes them from the merged attempt set, which removes the hardest conflict case entirely. **One record does not fit this rule yet:** `ScheduleEntry` carries no `updatedAt`, and last write wins on its `box` can regress an item's progress. Section 9.1 states the three options; choosing between them is Phase 2 work (`progress.md` D43).
- **Never synced, under any setting:** the API key, session audio, oral transcripts, writing workshop submissions, and the cost ledger. Transcripts and submissions can contain anything the user chose to say or write, so they stay on the device. This list appears verbatim in the settings UI.
- **Disabling sync:** stops outbound requests immediately, and offers server-side deletion. Turning it back on pushes the full local set.
- **Deletions:** tombstone for 90 days, then hard delete.
- **Retention:** accounts with no activity for 180 days are deleted, with the rule stated in the privacy notice.

**Capacity model.** A heavy user generates roughly 20,000 attempts a year at about 250 bytes of JSONB each, so about 5 MB. A free tier in the half-gigabyte range therefore supports on the order of 1,500 heavy users or many more typical ones, and scale-to-zero keeps compute inside the free allowance at low concurrency. Confirm the current free tier limits when you pick the provider, since they move. Triggers: at 60 percent of storage, compress older attempts into monthly aggregates server-side, keeping only the last 180 days of individual attempt rows (the client keeps its own full history regardless). At 80 percent, move to a paid tier, which is the first real cost this project would incur and is on the order of twenty dollars a month. The design choice that makes this cheap is that nothing large syncs: no audio, no transcripts, no generated content.

---

## 10. API surface

Small by design.

| Route | Runtime | Auth | Purpose |
| --- | --- | --- | --- |
| `POST /api/realtime/secret` | Edge | none, user key in header | Mint an ephemeral realtime token. Stateless, no logging |
| `POST /api/telemetry` | Edge | none | Opt-in anonymous item outcomes, batched, rate limited by IP hash |
| `GET /api/health` | Edge | none | Build version, bank version |
| `POST /api/account/device` | Edge | none, creates identity | Register a device, create an anonymous account on first call, return the account id |
| `POST /api/account/pair-code` | Edge | device secret | Issue a single-use pairing code, ten minute expiry |
| `POST /api/account/pair` | Edge | pairing code | Join an existing account, return a new device secret |
| `GET/POST /api/sync` | Node | device secret bearer | Push and pull sync documents |
| `DELETE /api/account/device/:id` | Node | device secret | Revoke a device |
| `DELETE /api/account` | Node | device secret | Hard delete everything server-side, returns a confirmation |

Everything else is static: the app shell, the bank bundles, and the library content.

---

## 11. Auth

There is no auth system in v1. There is a bearer credential.

The device secret described in section 9.3 authorises sync for one account. There is no login, no password, no email, no OAuth provider, no session cookie and no auth library. Pairing extends an account to a second device. That is the whole of it (ADR 5).

Two controls on the one unauthenticated route, `POST /api/account/device`, which creates a row for anyone who asks: rate limiting by IP hash, and deferred creation so a row only exists after a completed practice session. A proof-of-work challenge is available if abuse appears, and is not built until it does.

If the sync service is unavailable the application works fully offline behind a quiet indicator. Sync failure is never an error state that interrupts study.

---

## 12. Privacy and security posture

Sync being on by default is a real change to this posture and the specification should say so plainly rather than bury it. We now hold a replica of most users' practice progress, attached to an anonymous identity, without them having asked. That is defensible because of what is and is not in the set, and because turning it off is one switch that is easy to find. It would not be defensible if any of the following slipped.

- **Data we hold by default:** a random account id, a hashed device secret, locale and target settings, and a replica of progress records (attempts, schedule, vocabulary, exam results). No name, no email, no department, no free text, nothing that identifies a person.
- **Data we never hold:** their API key, their audio, their oral transcripts, their written workshop submissions, their IP address in any durable store, and any link between a telemetry event and an account.
- **Data we delete on a schedule:** accounts inactive for 180 days.
- **The switch:** `/settings/sync`, top of the page, on by default, off in one tap, with server-side deletion offered at the same moment.
- **Third parties:** OpenAI, on the user's own account and under their own agreement with OpenAI, which the onboarding states plainly. Vercel as host. Nothing else.
- **Security headers:** strict CSP as in 6.4, HSTS, `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `Permissions-Policy` allowing microphone on the app origin only.
- **Dependency hygiene:** lockfile committed, `npm audit` gate in CI, Dependabot, no dependency added without an entry in `docs/adr/`.
- **Disclosure:** a `SECURITY.md` with a contact address and a 90 day coordinated disclosure commitment.
- **Data rights:** export everything to JSON in one tap, import it back, delete everything locally and server-side in one tap with a confirmation.

Note on the Privacy Act: this is a personal, non-governmental project holding no government information, so the Act does not apply to it. Keep it that way. Do not accept departmental data, do not add SSO against a GC identity provider, and do not add any feature where a manager can see an employee's results.

---

## 13. Performance

| Metric | Budget |
| --- | --- |
| LCP on `/home`, mobile, 4G | under 2.0s |
| INP on option selection | under 100ms |
| CLS | under 0.05 |
| Initial JS, gzipped | under 180 KB |
| First bank fetch | under 400 KB |
| Time from tapping Start to first item rendered | under 300ms, from cache |
| Realtime session establishment | under 2.5s from tap to examiner's first word |
| Lighthouse performance and accessibility | 95 or above, gated in CI |

Techniques: RSC for everything outside the session, session engine as a single client island, aggressive service worker caching of bank shards, font subsetting and preload, no route-level data fetching in the session flow.

---

## 14. Testing

Summary table. The full strategy, including the tier model, tooling, coverage targets, CI lanes and what is deliberately not tested, is section 6 of the implementation plan.

| Layer | Approach | Gate |
| --- | --- | --- |
| Engine | Exhaustive Vitest unit tests with worked examples at every boundary, plus properties for band mapping totality, selector invariants and Leitner monotonicity | 100% branch coverage on `packages/engine` |
| Content | Zod validation of every item and passage; duplicate detection by normalised stem hash and by embedding similarity; rationale presence; locale parity; licence field presence on derived passages | Fails the build |
| Scoring regression | A golden set of 200 items with known keys and 20 recorded mock exam runs with expected bands, replayed on every change to the engine | Fails the build on any band change |
| AI output | Schema conformance tests against recorded fixtures; a small live smoke suite run nightly with a maintainer key against the real API, asserting schema validity and latency, not content quality | Nightly, opens an issue on failure |
| Item quality | The stage 4 adversarial review gate and stage 5 deterministic checks run on every batch, with yield and defect rate reported per batch. A 5% human sample is a confidence measure, not an authoring step | Batch held if the sample defect rate exceeds 5% |
| Sync | Round-trip integration tests against a test Postgres: push, pull, watermark advance, conflict resolution, tombstones, device revocation, and a simulated two-device divergence that must converge to the same estimate on both | Fails the build |
| Accessibility | axe-core in Playwright on every route and on each session state; keyboard-only traversal tests of the three core flows; contrast validation computed from the token set | Fails the build |
| i18n | Key parity between `en.json` and `fr.json`; a lint rule banning string literals in JSX; a pseudo-locale render to catch truncation | Fails the build |
| E2E | Playwright: onboarding to first drill, full mock exam including resume after reload, review queue, key entry and validation, data export and import, oral practice mode with a mocked API | Fails the build |
| Realtime | Cannot be meaningfully mocked end to end. A manual pre-release checklist covering mic permission, phase transitions, disconnection recovery and cost accounting | Manual, per release |

---

## 15. CI/CD

GitHub Actions on every PR: typecheck, lint, unit, content validation, build, Playwright including axe, Lighthouse CI against a preview deployment, bundle size check, licence check on dependencies.

Vercel preview per PR. Main deploys to production. Bank builds are content-hashed and versioned independently of the app, so publishing new items does not require an app release.

Scheduled jobs: nightly AI smoke suite, weekly model and pricing config check, monthly calibration run against accumulated telemetry that opens a PR with updated difficulty parameters for review rather than committing directly.

---

## 16. Observability

Deliberately minimal, since there is almost no server.

- Vercel's built-in request and function logs, with the realtime secret route excluded from logging.
- Client errors are shown to the user with a copy-to-clipboard diagnostic bundle and a one-tap "open a GitHub issue" that pre-fills build version, bank version, browser, and the sanitised error. No automatic error reporting service, because an error payload could contain user content and we have promised it never leaves the device.
- A public status note in the repo for bank or API incidents.

---

## 17. Open source

- **Code licence:** MIT. Maximises reuse, including by a department that wants to fork it.
- **Content licence:** CC BY 4.0 for the item bank and library, so items can be reused with attribution. Note in the licence file that derived passages carry their source's terms and are marked as such.
- **Contribution:** `CONTRIBUTING.md` with the content style guide, the item quality bar, and a mandatory originality attestation in the PR template. A `content/` PR runs the same validators as CI and posts a rendered preview of the new items.
- **Governance:** benevolent dictator to start, with a documented path to adding maintainers. An `docs/adr/` directory for architecture decisions, which also serves as the record of why the BYOK and licensing choices were made.
- **Reusability:** `@palier/engine` and `@palier/domain` are the two packages worth publishing to npm, so the engine can be reused for another exam. An external consumer noticing a leak is what keeps their boundaries honest.

---

## 18. Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Item bank quality is mediocre and the product feels fake. This is the top risk, because the default path has no human author in it (ADR 6 keeps hand-authored items available, but the volume is machine-drafted) | Medium to high | High | The six-stage factory in section 8.3, cross-family adversarial review with discard rather than repair, register scoring against a real GC corpus, deterministic balance checks, a 5% sample gate, post-launch auto-retirement on telemetry, an in-app report control, and a deliberate choice to launch with the 500 to 700 items that survived the gates (`content-factory.md` §2) rather than several thousand that did not |
| A subtly wrong item teaches someone the wrong thing before it is caught | Medium | Medium | Items are provisional until calibrated and say so. Three reports on the same reason code auto-retire. A wrong item in a practice tool is recoverable; the harm is bounded and the honesty about it is what keeps trust |
| The French is grammatical but reads as translated or European rather than Canadian GC register | High without mitigation | High | Stage 2 register scoring against a harvested corpus of real GC administrative French, an explicit register veto in stage 4 review, and a pre-launch read by two or three fluent GC French speakers on a sample, which is a review favour rather than an authoring commitment |
| Item statistics never accumulate because nobody opts into telemetry | High | Medium, reduced by the engine simplification. Nothing the user sees depends on calibration, so the cost is slower retirement of bad items rather than a broken estimate | Make the telemetry case after a mock exam, where the user can see why it matters. Use the pilot to seed it. Until then, the item report control is the main signal and it needs to be prominent |
| Realtime cost shocks a user | Medium | High | Cost shown before every session, running meter, hard session cap, practice mode as the default, and onboarding that insists on a hard usage limit on their OpenAI account |
| BYOK friction kills adoption | High | Medium | Everything except generation, writing feedback and oral works with no key. A user can get real value and a real band estimate having never seen an API key |
| Someone reads the band estimate as a prediction and skips preparation | Medium | High | Confidence ranges everywhere, a minimum item count before any band is shown, and explicit language on the results screen |
| Perceived as an official or semi-official tool | Low | High | The visual and legal posture in the requirements document, plus a standing disclaimer |
| Conflict of interest questions, given your day job and your move to CRA | Low | Medium | Keep it personal, unfunded, free, unaffiliated, developed on personal time and equipment, with no GC data and no departmental promotion. Disclose it the same way other side projects are disclosed |
| OpenAI changes model names or the realtime auth flow | High | Low | Model configuration is data, not code. A CI job watches for drift. The turn-based fallback does not depend on realtime at all |
| Maintenance burden after launch | High | Medium | Static bank, no backend in the critical path, a factory that can be re-run rather than re-authored, and a contribution path that lets other people add content |
| Sync on by default means holding progress data for people who never asked for an account | Certain by design | Medium | Nothing identifying in the synced set, deferred account creation until after the first session, 180 day deletion of inactive accounts, one-tap off with server-side deletion, and a settings page that states the whole list of what does and does not sync |
| Anonymous account creation is abused to fill the database | Low | Medium | Deferred creation, IP-hash rate limiting and proof of work on the device registration route, storage alerts at 60 and 80 percent, and a documented path to monthly aggregation of old attempt rows |

---

## 19. Roadmap

**The build order lives in `implementation-plan.md` §7, with the timeline in §9.** It is
not repeated here. An earlier draft carried a second roadmap in this section; it drifted,
and by 19 September 2026 it described seven phases against the plan's nine and scheduled
an "email and GitHub claim flow" that ADR 5 had already removed from v1. Two copies of a
build order diverge, and the plan is the one that is authoritative for sequencing.

What this document is authoritative for does not change with the schedule: the components,
the data model, the ports, the protocols, the security posture and the performance and
testing gates. Read §7 of the plan for what gets built when, and `progress.md` for what
actually has been.

Two consequences of the ordering are worth knowing while reading this document, because
they explain shapes that would otherwise look odd. The content factory is built before the
application (phase 1) because with no hand-authoring it is the critical path and its output
being good is the project's largest risk. And realtime voice is deferred to the last
feature phase behind turn-based practice mode, because practice mode delivers most of the
learning value at roughly a tenth of the cost, which is why section 8.5 describes both.

## 20. Open questions for you

1. Should studio mode ship at all in v1, or is practice mode plus a very good post-session report the better first bet, given cost and complexity?
2. Do you want a pre-launch pilot with a small group for calibration? With a machine-authored bank this moves from nice to have to close to necessary, since telemetry is the only real evidence the items work. It does raise the question of whether recruiting colleagues creates workplace optics you would rather avoid while the CRA move is in progress.
3. Will you do the 5 percent sample review yourself, or is the pipeline expected to be fully unattended? If unattended, say so explicitly in the about page and lean harder on the report control and auto-retirement.
4. Which second model family do you want for the stage 4 review gate? Cross-provider is meaningfully stronger than cross-model within one provider, and it is the difference between a real gate and a model marking its own homework.
5. Is `palier.ca` the name, or should this go through a proper naming pass before the repo is public?

---

## Sources

- [Test of reading comprehension (633 and 634)](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service/second-language-evaluation-reading/the-test.html)
- [Test of written expression (654)](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service/second-language-evaluation-writing/the-test.html)
- [Unsupervised test of written expression](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service/unsupervised-test-written-expression.html)
- [Unsupervised test of reading comprehension](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service/unsupervised-test-reading-comprehension.html)
- [Oral language assessment: about the test](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service/oral-language-assessment-sle/about-the-test.html)
- [OpenAI Realtime API: getting started](https://developers.openai.com/api/docs/guides/realtime)
- [OpenAI Realtime API over WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc)
- [GPT-4o Transcribe model](https://developers.openai.com/api/docs/models/gpt-4o-transcribe)
