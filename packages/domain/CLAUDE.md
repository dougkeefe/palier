# @palier/domain

Types, invariants, content schemas and the exam profile. The bottom of the dependency
graph (`implementation-plan.md` §3.1).

**May import** `zod`, and nothing else — no workspace package, no `node:*` core module, no
framework. `.dependency-cruiser.cjs` enforces all three.

## Invariants

- **No I/O and no async.** `parseExamProfile` takes an already-read value; reading the file
  belongs to an adapter or a build step. ESLint bans `async`, `await` and `Promise` in this
  package's source (§3.2).
- **No exam rule in code.** Item counts, time limits, cut scores, level descriptors and the
  taxonomies live in `content/profiles/*.json` (ADR 9); so do the Leitner intervals (ADR 8).
  If you are about to type a number from `product-requirements.md` §5 into a `.ts` file, it
  belongs in the profile.
- **Bands are ordered by `BAND_RANK`, never alphabetically.** E is above C — it is the
  exemption level, not a failure — so a `.sort()` on band letters silently puts E between C
  and X.
- **The hand-written type is the contract.** An `Equals<>` assertion in a `.test-d.ts` holds
  the Zod shape to it so the two cannot drift. Optional fields carry `| undefined` because
  that is what `z.infer` produces under `exactOptionalPropertyTypes`; write them as absent
  keys, never as explicit `undefined`, or the JSON round-trip test will catch you.
- 100% branch (§6.3), with one test per rejection reason — the content suite's error
  messages depend on them being accurate.
- **The AI boundary DTOs live here** (ADR 20). `AiCapabilities`, the `generate*`/`review*`
  request types, `ItemDraft`/`PassageDraft`, `ReviewVerdict` and `UsageRecord` (`ai.ts`), the spend
  vocabulary `AI_FEATURES`/`AiFeature`, `ModelPrice` and `FeatureCall` (progress.md D101, D103), plus
  the structured-output re-validation schemas (`schemas/ai.ts`, architecture.md §8.2). They sit
  in domain, not `@palier/app`, so `apps/factory` can build requests and read verdicts without
  importing the port layer. They are DTOs, not content artefacts, so they are **not** in
  `CONTENT_SCHEMAS` — no JSON Schema is published for them. The `AiProvider` port *interface*
  still lives in `@palier/app` (§3.3); only the data moved down.
- **Writing feedback's DTOs and invariants live here too** (progress.md D105). `WritingRequest`,
  `WritingAssessment` and the model-facing `WritingFeedbackDraft` (`ai.ts`, `schemas/ai.ts`), and in
  `writing.ts` the pure rules every layer shares: `checkErrorOffsets` (every range inside the text, none
  overlapping) and `placeErrors`, which turns a model's excerpts into offsets. **A model reports excerpts,
  never offsets**; the offsets are computed here. The prompt library's `WritingPrompt` is a content artefact,
  so it *is* in `CONTENT_SCHEMAS` (`writing-prompt`), parsed by `parseWritingPrompts` (D107).
- **The oral report's DTOs and its placement rule live here too** (progress.md D122). `OralRequest`,
  `OralAssessment` and the model-facing `OralAssessmentDraft` (`ai.ts`, `schemas/ai.ts`): exactly the five
  `ORAL_CRITERIA` (pronunciation is not one: a transcript cannot show it), **exactly three fixes, each on a
  `ScoredSubSkill`** (reading or writing, never oral, since the bank drills only those), exactly five missing words,
  and errors per turn. `oral-assessment.ts` holds `assembleOralAssessment`, which runs `placeErrors` once per
  candidate turn, and `checkOralAssessment` for a report read back. An error or word naming an examiner's turn is a
  problem. `OralTurn.input` (`"voice" | "typed"`) is optional, because rows stored before it have none. **The filler
  list is a content artefact** (`oral-fillers` in `CONTENT_SCHEMAS`, `parseOralFillers`, D123): language, not an
  exam rule, so not profile data.
- **The adversarial-review gate lives here** (`review-gate.ts`, progress.md D109): `gateReasons`,
  `CONFIDENCE_THRESHOLD` and the key-blind `reviewRequestFor`, pure over an `Item` and a `ReviewVerdict`.
  The factory's stage 4 and the browser's `generatePracticeSet` share it, and domain is the one package both
  can reach. **The reason strings are load-bearing**: the factory's metrics classify a discard by each
  string's opening words, so never reword one without `apps/factory/src/pipeline/metrics.ts`. The threshold
  is a content-quality bar, not profile data (ADR 9). ADR 20's *revisit when* evidence appeared with this
  move, and the DTOs stayed here (D109).
- **The telemetry DTOs live here too, the same way** (progress.md D92–D94): `TelemetryEvent`
  (`telemetry.ts`, `schemas/telemetry.ts`) and the statistics job's `ItemStatisticsReport` and
  `ItemVerdict`. `telemetryEventSchema` is a `strictObject` of exactly five fields, so an event that
  carries an identity is **refused, not stored**: never loosen it. The retirement rules are data, the
  profile's `itemStatistics` block (ADR 9), and `ItemStats.pointBiserial` is `number | null`, because an
  item with no variance has no correlation to report.
- **The item type registry lives here, minus `render`** (ADR 17). `ITEM_TYPE_DEFINITIONS`
  is a `Record<ItemType, ItemTypeDefinition>` (`schema`, `score`, `validate`,
  `generatePrompt`, `a11yContract`), so adding an `ItemType` is a compile error until it has
  an entry. `render` cannot live here — it is a React component — so it is a parallel
  `itemRenderers` map in `@palier/ui`, tied to these definitions in `apps/web`.

## The three mistakes most likely to be made here

1. **An async loader that reads a file.** Lint and dependency-cruiser both refuse it; the
   reading half goes in an adapter.
2. **Hard-coding a cut score or a review interval** instead of reading the profile (ADR 9, ADR 8).
3. **Hand-editing `docs/schemas/*.schema.json`.** Those are generated *and* drift-checked by
   `src/__tests__/json-schema.test.ts`. Change the Zod schema, then `pnpm run test -u`.
