# @palier/app

The port interfaces (`implementation-plan.md` §3.3) and the use cases that consume them.
Knows what the product does, nothing about how anything is stored, fetched or rendered.

**May import** `@palier/domain`, `@palier/engine`. Never an adapter, never React.

## Invariants

- **A port signature contains our types only.** No `openai`, `dexie` or `Response` type
  reaches this layer (§2.4); translating them is the adapter's whole job.
- **Use cases receive their collaborators.** `Clock`, `Random`, stores and providers are
  parameters supplied by the composition root (§3.5); nothing here constructs a concrete one.
- **`KeyVault.withApiKey` hands the key to a callback and never returns it** (§3.3). Do not
  add a `getApiKey` — the shape is the control (ADR 2, ADR 3). `putApiKey(key, { remember: false })`
  holds it for this tab only, and `apiKeyStorage()` says where it is held, in a word (progress.md D98).
  **`realtimeEndpoint()` / `setRealtimeEndpoint(url | null)`** keep the user's own realtime secret endpoint (ADR 3's
  self-hosted escape, D192) **in the vault, not `SettingsStore`**, because settings sync and an address can name a
  person: device-local, never synced, never exported. **`clear` forgets it with the key**, so `wipeData` leaves neither.
  `use-cases/realtime-endpoint.ts` holds the rule (`parseRealtimeEndpoint`: https, or http on a loopback host; no
  credentials; the fragment dropped) and the two use cases; a refusal is `InvalidRealtimeEndpointError` with its `problem`.
- **A provider is made from the key inside `withApiKey`, once per call** (`use-cases/api-key.ts`,
  D99). `withAiProvider(deps, feature, fn)` is the one path from the key to a spending `AiProvider`,
  through the `AiProviderFactory` the composition root supplies; every AI use case goes through it, and
  nothing caches the provider. `AiProvider.verifyKey()` is the key screen's one cheap call
  (`checkApiKey`), which shares the private path to the factory and is **never metered**.
- **Every spending call is written to the `CostLedger`** (`ports/cost-ledger.ts`, progress.md D101):
  `withAiProvider` wraps the provider generically, so every method but `capabilities`, `verifyKey` and
  `lastUsage` appends its `lastUsage()` once it settles, a failed-but-billed call included. **The
  methods one callback makes must be sequential**, because `lastUsage` is the last call's, the whole of it,
  retries included (D102). The ledger is **device-local, never synced and never exported**, like
  `TelemetryStore`; `wipeData` and `deleteEverywhere` clear it. The meter, the soft cap (`spendCap`, a
  **synced** setting, D104), the per-feature table and `preflightSpend` are `use-cases/spend.ts`, over the
  engine's `spendTotals`, `capState` and `preflight`, with pricing handed in as data (D103).
- **Writing workshop submissions are device-local too** (`ports/writing-store.ts`, `use-cases/writing.ts`,
  progress.md D105–D106). `WritingStore { put, get, all, clear }` is never synced and never exported; `wipeData`
  and `deleteEverywhere` clear it. **Every save is a new submission**, because an assessment's offsets point
  into the exact text it assessed: `saveWriting` then `requestWritingFeedback`, which goes through
  `withAiProvider(…, "writing-feedback", …)`, keeps the text unassessed on a failure, and returns an existing
  assessment without spending. `AiProvider.assessWriting` has landed; its DTOs are in `@palier/domain`.
- **Runtime-generated items are device-local and never enter the trend** (`ports/generated-item-store.ts`,
  `use-cases/generate.ts`, progress.md D110). `generatePracticeSet` is a compressed factory on the user's key:
  one `generateItems` call of `GENERATED_SET_SIZE`, then one **blind** `reviewItem` per draft, one at a time,
  all inside `withAiProvider(…, "item-generation", …)`. A draft is discarded, never repaired, on the item
  schema, the type's `validate`, a mismatch with what was asked, or `gateReasons` (now in `@palier/domain`,
  D109). A failed call rethrows and keeps nothing. Written expression only (D110). The survivors go to
  `GeneratedItemStore { putSet, latestSet, item, clear }`, never synced or exported, cleared by `wipeData` and
  `deleteEverywhere`. **`scoreGeneratedAnswer` writes nothing**: no `Attempt`, no schedule entry, no session.
  That is the whole of how a generated item stays out of `practiceTrend`; never route one through
  `answerItem`/`recordAttempt`. The item type, topic and key position come from `Random` (selection, never
  an id); the id is `gen-` plus an `IdGenerator` ULID, so it can never collide with a bank id.
- **Spoken sessions (Phase 5 Slice 1, progress.md D115–D116).** `OralStore { put, get, all, putAudio, audio,
  audioIndex, deleteAudio, clear }` over `OralSession = { id, scenarioId, startedAt, endedAt, endReason, turns }`,
  device-local like `WritingStore`: **never synced and never exported**, cleared by `wipeData` and
  `deleteEverywhere`. A recording is a `Blob`; a full device is the port's own `StorageQuotaError`. The
  retention policy is in the use cases, never the store: `saveOralAudio` keeps `AUDIO_KEEP_SESSIONS` (10)
  sessions' recordings and, on a quota error, evicts the oldest and **reports it**; `oralStorageEstimate` warns
  at `AUDIO_WARNING_BYTES` (200 MB of Palier's own audio, not the origin's estimate); `cleanUpAudio` deletes
  every recording and **never a transcript** (architecture.md §9.1). `OralTransport { open(req, sink), direct,
  close }` is **push**, one shape for the turn-based and the full-duplex transports: whole turns with their
  `startMs`/`endMs`, difficulty flags, and exactly one `closed { failed }`, last. `startOralSessionRun` drives the
  engine's machine over it: the session id comes in the request (D39), earlier sessions left running are
  stamped `interrupted` unless a page still runs them (below), one queue serialises events, ticks and the end control, each turn is saved as it
  arrives with the machine's phase, and the end is written only when the transport says `closed`, so an answer
  in flight is kept. Its end-to-end test runs in `@palier/testing` (`memory/oral-session.test.ts`), since an
  app test may not import it (D37).
- **A session left running is closed only when no page holds it** (Phase 7 Slice 2, progress.md D144). The
  `OralLiveness { hold(id) → release, live() }` port says which sessions a page on this device is running now;
  the page running one holds it for the session's life, and the browser's implementation is a Web Lock the
  browser lets go when the tab does. `closeAbandonedSessions` stamps `interrupted`, at the clock's now, every open
  session nobody holds, and answers which; `startOralSessionRun` calls it, and so do the oral screens as they load,
  so a session whose tab was closed is listed and reportable at once, and another tab's live session is never closed.
- **Practice mode is `turnBasedTransport`, here, not in an adapter** (`use-cases/oral-practice.ts`, Phase 5
  Slice 2, progress.md D118), because it is orchestration over two ports and nothing vendor-specific. Each turn is
  one `withAiProvider(…, "oral-practice", …)` that writes the question (`examinerTurn`) and then voices it
  (`speak`), in order, then the **`AnswerSource`** port (`ports/answer-source.ts`), which shows the question and
  waits for a clip or typed words, then a second metered call that transcribes a clip. **`direct` returns at
  once**, because the driver awaits it in its own queue; it only sets the phase and register of the next
  question. `close` aborts the wait, delivers a turn in flight, then `closed`. Any failed call closes it failed
  and `lastError` keeps the error for the screen. `startOralPracticeRun` composes it with `startOralSessionRun`,
  and `oralSessionChoices` offers one scenario per session type at the study band (A practises at B).
- **The oral report** (`use-cases/oral-report.ts`, Phase 5 Slice 3, progress.md D122–D126). `OralSession.assessment`
  is `OralAssessment | null`, as a writing submission's is. `requestOralReport` refuses an unknown or running session,
  one with no answer, or one whose scenario is gone, **before any request**; returns a report already made without
  spending; otherwise makes one `withAiProvider(…, "oral-assessment", …)` call, quoting the profile's descriptors in the
  interface language, and keeps the result on the session. **A call is recorded under the session it is for**:
  `CostEntry.sessionId`, stamped by `withAiProvider`'s optional fourth argument, which the turn-based transport and the
  report both pass (D125), so `oralReport` costs a session from its own rows, never a time window, per line
  (`{ practice, report }`, each `{ usd, calls, unpriced }`, D127). `oralReport` also computes the fluency (the engine's,
  D123), and says in `blocked` why a report cannot be asked for; `oralHistory` lists ended sessions. **`StartSession`
  derives `focusSubSkills`** from the newest assessed session **in the plan's language**, through `oral: Pick<OralStore,
  "all">` and the bank's scenarios, as it derives `lastDayCompleted` (D124, D127). Each candidate's turn says how it
  arrived (`input`) and, for a clip, the pause the screen measured (`CandidateAnswer.pauseMs` → `OralTurn.pauseMs`, D127).
- **Studio mode** (Phase 6 Slice 1, progress.md D165–D172). `OralTransportEvent` gains `note { criterion, evidence,
  severity }`; the driver stamps the phase and keeps it on `OralSession.notes` (optional: a practice session has none),
  and `requestOralReport` passes them as `OralRequest.notes` only when there are some. `startOralSessionRun` takes an
  optional `capMs`, and the machine ends the session `time-cap` at it (D166). **`RealtimeSecretSource { mint(apiKey) }`**
  is the port the one key-seeing route sits behind (ADR 3, D169). **`startOralStudioRun`** composes the driver with a
  studio transport the composition root makes, handing it two hooks and never the adapter's name: `secret`, which
  mints inside `KeyVault.withApiKey` (`NoApiKeyError` with none), **the first time at the start**, beside the session's
  setup, and the transport's first `secret()` takes that one (D190; none when the signal is already aborted), and
  `usage`, which writes each billed usage to the ledger as `oral-studio` under the session. `ended` waits for those writes, and a write that fails is not the
  session's failure (D170). **Slice 2** (D180–D182): `StudioTransport` and `OralStudioRun` gain `repeat()`, **studio
  only**, never on the `OralTransport` port, because a turn-based examiner's question is on screen to be played again.
  Every `OralSessionRun` gains `phase()`, the machine's current phase, for studio mode's indicator. A request's optional
  `mode` is stamped on the stored `OralSession.mode`: `startOralStudioRun` passes `"studio"`, and absent is practice.
  **`oralSessionCost`** reads a session's cost from its own ledger rows, and `OralSessionCost` has a `studio` line beside
  `practice` and `report`, so a studio conversation is never read as free.
- **Ports are transcribed from §3.3, not invented.** Eight live under `src/ports/`:
  `ItemRepository`, `AttemptStore`, `ScheduleStore`, `SessionStore`, `SettingsStore`,
  `KeyVault`, `Clock`, `Random`. `OralStore` (no §3.3 signature) and the
  `AiProvider`/`SyncTransport`/`TelemetrySink` trio (need net-new domain types) are deferred
  to their own sessions — deciding them is a decision to record, not a gap to fill quietly.
  **`AiProvider` has now partly landed** (`ports/ai-provider.ts`, Phase 1): the factory-facing
  subset `capabilities`/`generatePassage`/`generateItems`/`reviewItem`/`lastUsage`. §3.3 is
  amended in place with two D-log decisions — `generatePassage` is added (content-factory.md
  §4.2 needs it) and `generateItems`/`generatePassage` return **drafts**, not assembled
  `Item[]`/`Passage[]`, so id-minting and provenance stay the factory's job, not the adapter's.
  Its DTOs live in `@palier/domain`, not here (ADR 20). `assessOral` and
  `openVoiceSession` are still deferred to their slices (`transcribe`, `speak` and `examinerTurn` landed with
  Phase 5 Slice 2, D117) (`assessWriting`, `SyncTransport`, the
  telemetry ports and `generateScenario` have since landed; **`OralStore` and `OralTransport`
  landed with Phase 5 Slice 1**, below).
  `IdGenerator` is a *ninth* port §3.3 does not name at all, decided here (progress.md D48):
  `{ ulid(): string }`, content-agnostic — it mints the id, the caller brands it
  (`attemptId(gen.ulid())`). It exists because nothing in the app may mint an id (`ids.ts`,
  and the `Random` port is seeded, not entropy — see below); `@palier/adapters/ids` backs it
  with Web Crypto, `@palier/testing` with a deterministic counter.
  `ISO`, `ScheduleEntry` and `ItemCriteria` are named-but-unspecified by §3.3 and were
  decided here (progress.md D18–D20). `SessionStore` was the same kind of decision
  (progress.md D45): `Session = { id, mode, startedAt, completedAt }` and the port is
  `{ create, complete, latest }` — the minimum `StartSession`/`CompleteSession` need. Like
  `ScheduleEntry`, `Session` lives here, not in `@palier/domain`: the engine never consumes
  it and it has no content-artefact/Zod role. §3.3 is amended in place. `ScheduleEntry` is now complete —
  `{ itemId, due: ISO | null, skill, box }` — and `ScheduleStore` gained a `get`, because
  the Leitner rule needs the item's *current* box and `due`/`put` cannot supply it; §3.3 is
  amended in place and progress.md D38 records it, closing D19. `AttemptStore.append` was
  likewise amended from `Promise<void>` to `Promise<boolean>` — it returns whether the attempt
  was newly stored — so `answerItem` can keep its Leitner reschedule idempotent on a retry
  (progress.md D44), the same "a use case needs a signal the port could not give" move as D38.
  The four store ports (`AttemptStore`, `ScheduleStore`, `SessionStore`, `SettingsStore`) each
  gained **`all()` and `clear()`** for the data-rights use cases (progress.md D61) — the same
  move again: export must read every record and wipe must delete them. `all()` promises no
  order; `ScheduleStore.all()` includes retired entries.
  **`SyncTransport` has landed** (`ports/sync-transport.ts`, Slice 2), amended from §3.3 in place
  (progress.md D69): `push(items)` carries a `baseRevision` per document, `pull(watermark: number)`
  pages by the account's revision counter, and registration is idempotent per device secret. A
  **tenth** port §3.3 does not name, **`SyncStateStore`** (`ports/sync-state-store.ts`), holds the
  device-local sync bookkeeping: identity, watermark, the on/off switch and the per-document ledger.
  It is decided here like `IdGenerator` was.
  **`ExamRunStore` has landed** (`ports/exam-run-store.ts`, Phase 3 Slice 1, progress.md D80), added
  to §3.3 in place: `{ put, get, unsubmitted, all, clear }` over `ExamRun`. It is the
  checkpoint/resume state `SessionStore` deferred to the exam runner. Like `Session`, `ExamRun` lives
  here, not in `@palier/domain`. Its id is a `SessionId`, because attempts group by `sessionId`. `put`
  is a plain upsert: the write-once `submittedAt` rule lives in the use cases and in `mergeRecord`.
  The run's optional `timeAllowance` (absent = 1) and `resumes` (absent = 0) are written only when they
  differ from those defaults, and **`parseExamRun` must copy every run field**, since export, import and
  sync all rebuild a run through it (progress.md D85). `ItemRepository` gained `forms()` for the exam
  picker, amended into §3.3 in place.
  **The telemetry ports have landed** (`ports/telemetry.ts`, Phase 3 Slice 4, progress.md D92), as
  **two** where §3.3 wrote one `TelemetrySink { record, flush }`: the queue must survive an offline
  submit (IndexedDB) and the batch goes out over `fetch`, and one adapter directory cannot hold both.
  - **`TelemetrySink { send(batch) }`** is the network half. It rejects with
    `TelemetryUnavailableError` to keep a batch for later.
  - **`TelemetryStore`** is the device-local half: the consent (`"unasked" | "on" | "off"`) and the
    queue. **No sync collector and no export reads it**, like `SyncStateStore`, so consent given in
    one browser never enrols another. `wipeData` and `deleteEverywhere` clear it.
  - `record` and `flush` are use cases (`use-cases/telemetry.ts`). `submitExam` queues only at the
    first stamp and only while consent is `"on"`, and **a telemetry failure never costs a
    submission**. Events come from the stored run and its rescore, never its attempts (D80).
    `TELEMETRY_MAX_BATCH` is the one batch cap, read by the server too.
- **Sync merges on the device, and only concurrent edits merge** (progress.md D69, Gate B). `syncNow`
  finds dirty records by hashing each one against the ledger, pulls first, then pushes with base
  revisions. A stale base comes back as a conflict. `mergeRecord` (`src/sync/merge.ts`) is the one
  merge rule, used by sync and import alike:
  - schedule: **the lower Leitner box wins**;
  - session: the completed copy wins;
  - exam run: a submitted copy wins, then the earlier submission, then more elapsed exam time;
  - setting: the local value wins;
  - attempt: immutable.

  **A pulled document at or below the ledger's revision is skipped**: it is the device's own echo,
  and merging it would let an older copy win. **`settle` judges a pulled copy against the device's
  live record, not the snapshot the sync read before its network call** (`readRecord`), so an
  answer made mid-sync merges instead of vanishing (progress.md D75). **A pair redeem that fails in
  transit sets `accountUnconfirmed` and nothing else**, because the server may or may not have moved
  the device. The next sync asks, through idempotent registration, and resets the ledger only if the
  account really changed (D74). Never reset on a failure that might not have reached the server: every
  record would merge as concurrent, and other devices' newer work would roll back. **An identity is
  never written from a registration answer if the device gained one while that call was in flight**
  (`requestPairCode`): an identity written without its ledger reset hides a lost redeem from D74's
  check. An answer naming another account sets `accountUnconfirmed` instead (D157). All three were
  found by the sync simulator in `@palier/testing` (D76). `AttemptStore.recent` returns the highest ids, oldest first, compared by
  code unit, in every implementation (D73). Sync failure is an outcome (`unavailable`, `removed`),
  never a throw into study (§11). Registration waits for the first completed session or submitted mock
  exam (§9.3).
- **The export document carries no key-vault content** — no API key, no device secret
  (`use-cases/export-document.ts`). An export is a file users share; the key stays in the
  browser [R12] and the secret is a sync credential. **`importData` merges by `mergeRecord`**,
  treating every record already present as a concurrent edit, since a file has no causal history
  (progress.md D69, superseding D62's keep-local rule). **`wipeData` keeps the device secret** (D50).
  `deleteEverywhere` deletes the server copy *first*, and wipes nothing local if that fails.
- **Two trend readouts, each named for its evidence.** `diagnosticReadout` reads diagnostic
  attempts only (D47); `practiceTrend` reads drill, review and diagnostic attempts and **never exam
  attempts**, because the readiness card keeps the exam result and the practice trend visually
  distinct (§8.2, progress.md D64). Do not merge them behind a flag. `progressReport` holds the
  same line over the **whole** practice record (`AttemptStore.all()`), and `reviewQueue` resolves
  what is due now across both skills (D66). `oralTotals` is the summary's oral line: ended sessions and
  the engine's `speakingMs` over them, from the device-local `OralStore`, so this device only (D145).
- **The streak and the milestones** (`use-cases/engagement.ts`, Phase 7 Slice 4, progress.md D159). A streak day is
  any record that means a session was done: a completed drill, a submitted exam (`submittedAt`), an ended spoken
  session (this device only) and **a review or diagnostic answer, since neither writes a `Session`**. A drill's
  bare answer and an exam attempt do not count on their own. The day is the device's (`timeZone` in the request, the
  engine's `localDay`), and the freeze allowance is a request field, since it is a product rule. **"We kept your
  streak" and "shown" are synced settings** (`STREAK_FREEZE_NOTICED_KEY`, a `LocalDay` mark that never moves back;
  `MILESTONES_SHOWN_KEY`, a `MilestoneId[]`), so each is said once across paired devices. The exam-at-C milestone
  rescores every submitted run, counts **C or above** (`compareBands`), and passes over a run the bank can no longer
  score, as `latestExamResult` does.
- **A mock exam's result is never stored** (ADR 16). `rescoreExam` derives it from the stored run, whose
  form and `bandCuts` never change, and `submitExam` returns exactly that, so scoring is idempotent by
  construction and held to it by a property (Phase 3 exit criterion 4). **An exam attempt is a pure
  function of its run and its answer** (D80): the id is `${runId}:${itemId}:${recordHash(answer)}` and
  the `ts` is the answer's `answeredAt`. A retry and a second device therefore derive identical records.
  Never stamp an exam attempt with the submission time, and never key it by run and item alone. Two
  devices would then hold one id with two contents, and append-only attempts can never converge.
  `submitExam` schedules scored items through `answerItem` and **never schedules a pilot**: it
  records the pilot's attempt through `recordAttempt`, `answerItem`'s first half (D41).
  **`resumeExam` writes; `examInProgress` does not.** A resume of a run whose clock has started counts
  as a pause (`resumes + 1`, D84 ruling 1), so anything that only *looks* for a run in progress, such as
  the picker, uses `examInProgress`. `exam-report.ts` holds what the results and readiness card read
  (`examReport`, `latestExamResult`, `examForms`) and `queueForReview`. Every result is rescored.
  **`examReport` says nothing about the review queue**: a submit queues wrong scored answers and never a
  pilot, so anything keyed to the queue would single out the wrong pilots (D84 ruling 9, D89).
- **Use cases live under `src/use-cases/`**, one file per use case, each a plain async
  function `(request, deps)` where `deps` are the collaborators the composition root supplies. A
  family of small use cases over one aggregate may share a file, as `sync-account.ts` does and as
  `exam-run.ts` (start, answer, flag, checkpoint, resume) and `submit-exam.ts` (submit, rescore) do.
  They are **pure orchestration**: read the ports, call one or more engine functions, return a
  domain/engine value. The D32 bridge lives here — a use case reads `clock.now()` / `random.next`
  and hands the engine the primitives `now: string` / `() => number`, never the ports. The
  study parameters an engine function needs and no port vends arrive in the `request`, not from
  `SettingsStore` or a deferred store (progress.md D36). `buildUseCases` — the binding of use
  cases to concrete ports — lives in the composition root (`apps/web/src/lib/container.ts`, §3.5),
  not here.
- **Configuration is a dep; study parameters are a request field** (progress.md D42). An
  `ExamProfile` is configuration the composition root owns and every use case sees the same
  one, so it is in `deps`. A skill, a target band or a session size differs per call, so it is
  in the `request`. The line matters because both are "not a port", and D36 only settled half
  of it.
- **A use case never mints an id.** `@palier/domain`'s `ids.ts` says it plainly: "the adapters
  mint; domain only names." An `attemptId` arrives in the request (D39). The `Random` port is
  specifically *not* an entropy source — it is a seeded mulberry32 wired in production (§3.5),
  so minting from it would give two devices one id stream, and an `AttemptStore` treats a
  duplicate id as a silent no-op. That would be attempt loss, not an error, and it would break
  the claim sync rests on (ADR 16, `architecture.md` §9.4). `append` returns whether the id was
  new precisely so that no-op stays *silent to the store but visible to the use case*, which is
  what lets `answerItem` guard its non-idempotent follow-on writes (D44).
- **Unit-tested with local port stubs, not `@palier/testing`** (progress.md D37). The sync tests'
  stateful stubs, including a small revisioned server, live in `src/use-cases/__tests__/sync-fakes.ts`,
  outside the build and coverage. `@palier/testing`
  depends on `@palier/app`, so importing it here would make Turborepo's build graph cyclic — the
  same cycle `@palier/engine` sidesteps. A use-case test builds small inline stubs (a fixed clock,
  a seeded random, stores returning set arrays, items built from `@palier/domain`) and asserts the
  orchestration; the "graph from `@palier/testing`" happens at the composition root, in `apps/web`.
  Every error path and guard clause covered. 95% branch (§6.3).

## The three mistakes most likely to be made here

1. **Importing an adapter** to "just use Dexie here". Depend on the port.
2. **Calling `Date.now()` in a use case** instead of the injected `Clock`.
3. **Writing an algorithm here** that belongs in `@palier/engine` — a pure function over
   plain data goes one layer down, where it is exhaustively tested.
