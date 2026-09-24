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
  pipeline knobs (the review confidence threshold, the near-duplicate threshold, the yield band).
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
palier-factory run            # full pipeline → content/factory/ + content/bank/v1/
palier-factory eval           # review-gate detection on the defect eval set
PALIER_NOW=<iso> …            # pin the batch timestamp for a reproducible commit
--provider openai             # use the real adapter (needs OPENAI_API_KEY)
```
