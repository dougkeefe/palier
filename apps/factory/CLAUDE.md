# @palier/factory

The content-factory CLI (`content-factory.md`, ADR 14, ADR 19). The five-stage pipeline —
harvest → passages → draft → adversarial review → deterministic validation — plus the bank
build and the batch report. **It stays a CLI; nothing here runs in a browser.**

**May import** `@palier/domain` and `@palier/adapters/openai`, and nothing else
(`.dependency-cruiser.cjs` `factory-depends-on-domain-and-adapters-only`). It shares the
content *schemas* with the app, never runtime. The `AiProvider` port type is imported from
`@palier/adapters/openai` (which re-exports it) so the factory never has to depend on
`@palier/app` (ADR 20).

## Invariants

- **The stages are pure; only `io.ts` and `index.ts` touch the disk or the clock.** A stage is
  a function over plain data, so the whole pipeline is deterministic given `now`, the batch id
  and the provider — which is what makes the committed sample batch byte-reproducible
  (content-factory.md §4.6). `runPipeline` does no I/O.
- **Assembly is the factory's job, not the adapter's.** The provider returns *drafts*
  (`ItemDraft`/`PassageDraft`); the factory mints the content-derived id, writes provenance and
  status, and computes `wordCount`/`readability` (`lib/assemble.ts`). Ids are a hash of the
  content, so a rebuild is identical and an unchanged item keeps its id forever.
- **Discard, never repair** (content-factory.md §4.4). A drafted item that fails review is
  dropped, not fixed — a repair prompt produces items that satisfy the gate while staying
  subtly wrong.
- **The licence gate and originality rules are non-negotiable** (§4.1, §4.2, R6). Harvest rejects
  any source whose terms are unclear (`other`); passages are written from topic and structure,
  quoting nothing; a `derived` passage records its licence and url or the schema rejects it.
- **Exam rules come from the profile, never from code** (ADR 9). Item counts, cuts and the
  taxonomy are read from `@palier/content/profiles/psc-sle.json`; the only factory constants are
  pipeline knobs (the near-duplicate threshold, the yield band). The review confidence threshold and
  the gate itself, `gateReasons` and `reviewRequestFor`, live in `@palier/domain` since progress.md D109,
  shared with the browser's runtime generation; `pipeline/review.ts` keeps only the loop.
  `committed-eval.test.ts` holds `content/factory/eval-report.json` equal to a fresh `eval`.
- **The eval also reports schema conformance on the live API's recorded completions** (progress.md D112):
  `eval/conformance.ts` replays each recorded first reply through `@palier/adapters/openai` with no retry, and
  the headline is over the runs on the shipping `PROMPT_VERSION` (null when there are none). **The fixtures are
  read by path** (`RECORDED_COMPLETIONS_DIR`, `packages/testing/src/recorded/openai/`), because the factory may
  not import `@palier/testing`. dependency-cruiser cannot see that edge, so moving those files breaks `eval` and
  `committed-eval.test.ts`. A re-recording is committed with its regenerated report. **Beside it, the oral scorer's
  stability** (`eval/oral-stability.ts`, progress.md D126): the reports in `assessOral-stability.json`, replayed through
  the adapter, pass when they were recorded on the shipping `PROMPT_VERSION`, every one of at least five **calls** (an
  `attempt` 1 opens one; a call with no accepted reply is a failed run) gave a report, and every criterion's band moves
  at most one level with agreement at or above 0.8, both eval parameters, not profile data (D127). `oralStability` is
  `null` until that file is recorded; `describeOralStability` is the CLI's line.
- **Forms are assembled, never hand-written** (`pipeline/forms.ts`, progress.md D82). One per profile
  variant, from `Object.entries(profile.variants)`: its item count, `items − scored` pilots at evenly
  spaced positions, its minutes and `orderedCuts(variant)`. The draw is stratified over sub-skills and
  bands and deterministic for a seed. The id is `${lang}-${variant}-v${bankVersion}` and `version` is the
  bank version, so a later bank never reissues an id with different items. A bank that cannot fill a
  variant is a form issue, and **the CLI writes no bank with a form issue** (`checkForms` checks variant,
  counts, pilots, minutes, cuts, item skill/lang and the domain schema).
- **A published bank version is immutable, and the next one carries it forward.** `run` refuses to
  overwrite an existing `content/bank/v{n}` without `--force`, and reads `v{n-1}`'s items, passages,
  **forms and oral scenarios** as `carried` (progress.md D114, which closed D82's residual). Items are
  re-validated with the new drafts, ahead of them, so an id users already hold survives a near-duplicate
  (architecture.md §5.5). **A carried passage keeps its published record** over this batch's copy of the
  same passage, provenance included. **Carried forms sit beside this version's own**, checked by
  `checkForms` like them, because an exam run is rescored from the form it was sat on; the app offers the
  highest version per variant. Carried scenarios go ahead of new ones. The batch report counts them as
  `itemsCarried` and `scenariosCarried`, not as the batch's output.
- **Oral scenarios are a stage too** (`pipeline/scenarios.ts`, D114). `content/factory/oral-sessions.json`
  names each session type and its length (PRD §8.6; Palier's product, not a §5 rule, so not profile data)
  and the bands, B and C. One `generateScenario` call per session and band, on a topic fixed by the pair;
  `assembleScenario` mints a content-derived id. **Discard, never repair**: the schema, phases whose
  minutes do not fill the session, a phase with no harder follow-up or no simpler reframe, a duplicate. It
  runs after the item stages, so the batch report's `provider` stays the item stages' model. The manifest
  lists the file as `scenarios: { path, hash }`, or `null` with none; v1 and v2 predate the key.
- **A retirement takes effect at the next bank build** (progress.md D94). `runInputFor` applies
  `content/factory/item-statistics.json`, which the monthly job in `apps/web` writes, to the carried bank
  (`pipeline/carry.ts`): judged items gain `stats`, and an item with a reason becomes `status: "retired"`.
  It stays in the bank for the ids users hold, and the form stage skips it. A damaged report stops the
  build. The factory never computes a statistic: it may not import the engine (§3.1).
- **The committed bank is byte-reproducible on disk.** `committed-bank.test.ts` reruns the pipeline
  through the CLI's own `runInputFor`, at the committed report's `generatedAt`, and compares every file
  under `content/bank/v{DEFAULT_BANK_VERSION}`. A provider change therefore means a new bank version,
  regenerated and committed in the same PR.
- **Every stage has a unit test that names its behaviour** (§10), and the fast lane holds each
  file to 90% branch coverage. `index.ts` (argv/cwd/stdout wiring) is the one coverage exclusion.

## Phase 1 without a funded key (progress.md D52)

The default provider is `scriptedAiProvider` — a deterministic stand-in that proves the pipeline
end-to-end and makes the sample run reproducible. **It does not claim to write authentic French;
the committed sample's prose is synthetic.** The real quality numbers come from the deferred paid
run: `palier-factory run --provider openai` with `OPENAI_API_KEY` set, and verified model ids in
`config/models.json`. The scripted reviewer implements plausible per-defect-class detection so the
eval set's detection rate is a real computed number, not a hardcoded one.

## Commands

```
palier-factory run            # full pipeline → content/factory/ + content/bank/v3/ (DEFAULT_BANK_VERSION)
--bank-version <n>            # write a new version; v{n-1} is carried forward
--per-source <n>              # passages per source (DEFAULT_PER_SOURCE, sized for form headroom)
--force                       # rebuild a version that already exists (never a published one)
palier-factory eval           # review-gate detection on the defect eval set, plus schema conformance on the recorded completions
PALIER_NOW=<iso> …            # pin the batch timestamp for a reproducible commit (v3: 2026-09-27T00:00:00.000Z)
--provider openai             # use the real adapter (needs OPENAI_API_KEY)
```
