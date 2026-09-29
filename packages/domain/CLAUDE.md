# @palier/domain

Types, invariants, content schemas and the exam profile. The bottom of the dependency
graph (`implementation-plan.md` §3.1).

**May import** `zod`, and nothing else — no workspace package, no `node:*` core module, no
framework. `.dependency-cruiser.cjs` enforces all three, and the compiler backs the second: the
build loads no ambient types (`"types": []` from `tsconfig.base.json`), so `process`, `Buffer` or a
`node:` import fails `tsc -b`. Only `tsconfig.vitest.json` adds `node`, because tests read fixtures
from disk (progress.md D154).

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
  and errors per turn; one to three fixes and one to five words, so a short session can have a report (D127).
  `oral-assessment.ts` holds `assembleOralAssessment`, which runs `placeErrors` once per candidate turn, and
  `checkOralAssessment` for a report read back. **Quotations are matched by `findExcerpt`** (`writing.ts`), which takes
  curly and straight apostrophes, and any run of whitespace, as one and returns the text's own offsets; an excerpt must
  quote a letter or a digit (D127). An error or word naming an examiner's turn is a
  problem. `OralTurn.input` (`"voice" | "typed"`) and `OralTurn.pauseMs` (the screen's measured pause, D127) are
  optional, because rows stored before them have none. **The filler list is a content artefact** (`oral-fillers` in
  `CONTENT_SCHEMAS`, `parseOralFillers`, D123): language, not an exam rule, so not profile data. It lists only clear
  hesitations, and `spokenWords` is the one tokeniser the parser and the engine share (D127).
- **The library is a content artefact** (`library-article` in `CONTENT_SCHEMAS`, `library.ts`, progress.md D162): one
  `LibraryArticle` per written-expression sub-skill, prose `Localised`, examples in `lang`. **`parseLibrary` refuses a
  library missing any sub-skill's article, or with two**, since an item's explanation links to its sub-skill's page, and
  an article related to itself. Cited target-language text in the prose is marked `_like this_` (`CITED_MARK`), which the
  page renders with the article's `lang`; an unpaired marker is refused, with its path.
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
- **A hand-authored item names its contributor** (content-factory.md §5). `ItemProvenance.contributor`
  and `PassageSource.contributor` are optional in the schema, so every bank published before them stays
  valid, and are a public handle shaped as a GitHub username (`contributorSchema`: 1 to 39 letters, digits
  and single hyphens), never a name or an email. **The rule is in `validate()`, not the schema**:
  `validateCommon` reports `authored-without-contributor` for an `origin: "authored"` item with none, so
  the factory's stage 5 drops it, and every type inherits the check. A passage has no `origin`, so the
  schema cannot tell an authored one apart; the factory's intake check requires it of every passage under
  `content/authored/`. Anything built with `origin: "authored"` must carry a contributor, the factory's
  eval-set fixtures included (`palier-eval`), or `validate()` flags it for the wrong reason.
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
