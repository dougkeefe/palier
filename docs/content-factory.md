# Palier: Content Factory Specification

**Subsystem:** Content production pipeline
**Version:** 0.1 draft
**Date:** 17 September 2026
**Owner:** Doug Keefe
**Related:** product-requirements.md, architecture.md, implementation-plan.md, ADR 6, ADR 14
**Status:** For review

---

## 1. Why this is a separate document

The application is a conventional piece of software: present items, record responses, compute progress, run a timed exam. The thing that fills it with content is not. Harvesting source material under uncertain licences, producing original passages in a specific professional register, drafting assessment items, judging whether those items are any good without a human reading them, and doing all of it reproducibly at a cost that makes sense, is a system with its own failure modes, its own operating cost and its own reasons to be abandoned.

An earlier draft carried this as one section inside the architecture specification. That understated it. Treating it separately makes three things possible: its complexity can be argued about on its own terms, it can be descoped or deferred without touching the application, and the application can be built against a small hand-made bank if the factory turns out to be harder than expected.

**The relationship to the application is deliberately thin.** The factory shares the content schemas from `@palier/domain` and produces committed data files. It has no runtime relationship with the application, no shared database and no API between them. Either side can be rewritten without the other noticing.

---

## 2. What it has to produce

| Artefact | Volume for v1 | Notes |
| --- | --- | --- |
| Passages | 150 to 250 | Original, band-tagged, workplace register, with provenance |
| Reading items | 250 to 350 | Cloze and comprehension, tied to passages |
| Written expression items | 250 to 350 | Cloze and error identification, mostly standalone |
| Exam forms | 8 to 12 | Fixed, immutable, one per variant per language, matching profile counts exactly |
| Oral scenarios | 15 to 25 | Five session types, phased, with escalation paths |
| Library articles | 10 to 20 | Deferred past v1 |

Quality bar, per the product requirements: one defensible key, plausible distractors each carrying a written rationale, an explanation that teaches the rule, correct sub-skill tag, plausible band tag, original text, both locales populated.

---

## 3. Assumptions

Stated explicitly because most of the risk in this subsystem lives here rather than in the code.

| # | Assumption | If false |
| --- | --- | --- |
| A1 | A language model can produce Canadian federal workplace French that reads as authentic to a fluent speaker in that register | The whole approach fails. This is the assumption to test first, in week one, with thirty passages and two readers |
| A2 | A model reviewing an item blind to its key can detect most items with two defensible answers | Item quality is unguarded. Falls back to hand review, which changes the resourcing premise |
| A3 | Register and naturalness failures are detectable by a model when asked directly | Needs a human in the register loop, at least as a sampling gate |
| A4 | Enough public GC source material is available under terms that permit derivative use | Passages are written from scratch on invented workplace scenarios, which is viable but loses authenticity |
| A5 | Cost per accepted item is low enough that regenerating a batch is not a significant decision | The pipeline becomes precious and slow to iterate on |
| A6 | Model behaviour is stable enough that a prompt tuned this month still works in three months | Every model change becomes a re-validation exercise. Partly mitigated by pinning versions |

A1 and A2 are the load-bearing ones. Everything else is recoverable.

**Amendment, 21 September 2026 (ADR 19).** Phase 1 no longer tests A1, A2 and A3 with a human
reader. They are judged by the automated gate — cross-family adversarial review (§4.4) plus
deterministic validation (§4.5) — with no human in the register loop at this stage. A3's hedge
("needs a human in the register loop, at least as a sampling gate") is knowingly set aside for
Phase 1: the trade-off, and the risk that a shared model blind spot on register passes unchecked,
is recorded in ADR 19. The human read does not vanish from the project — it is the Phase 7 pre-1.0
gate "both languages reviewed by a human" ([R8]). A4 (public GC source material under terms that
permit derivative use) is **unchanged and still load-bearing**: §4.1 rejects unclear licences and
§4.2 produces original passages that quote nothing.

---

## 4. Pipeline

Five stages. An earlier draft had six; corpus-based register scoring has been folded into stage 4, because a separate statistical register metric was specified without a defined measure, which is the kind of thing that sounds rigorous and turns out to be a week of work producing a number nobody trusts.

```
  sources ──► [1 harvest] ──► source queue (url, date, licence, topic)
                   │
                   ▼
              [2 passages] ──► original passages, band-tagged
                   │
                   ▼
              [3 draft] ──────► candidate items
                   │
                   ▼
              [4 review] ─────► pass / discard   (cross-family, blind to key)
                   │
                   ▼
              [5 validate] ───► deterministic checks, bank-wide
                   │
                   ▼
            content/ (committed) ──► [build] ──► /bank/v{n}/ static shards
                   │
                   └──► 5% sample tap (human spot check) — retained but OFF in Phase 1 (ADR 19)
```

### 4.1 Harvest

Discovers candidate source documents from public GC material: departmental news and bulletins, published reports and evaluations, open datasets and their documentation, Canada.ca service and policy pages, Treasury Board instruments.

Records per source: URL, retrieval date, document type, topic, and a licence determination. Anything whose terms are unclear is rejected rather than used cautiously, because the cost of rejection is one more search and the cost of being wrong is a takedown.

Output is a queue, committed, reviewable.

### 4.2 Passage construction

Rewrites a source into an original passage at a target band. Topic, document structure and register come from the source; the sentences are new. Nothing is quoted.

Deterministic checks at this stage: length within range for the band, sentence count and mean sentence length within range, no proper nouns that name a real official or imply a real event, no numbers that could be mistaken for real departmental figures.

Provenance is written here and never removed.

### 4.3 Item drafting

For each passage and sub-skill, drafts items using the item type registry's prompt specification, so adding an item type extends the factory without editing it.

Batches stay small, on the order of twenty items, so that a bad prompt revision spoils a batch rather than a release.

### 4.4 Adversarial review

The gate that stands in for a human editor, and the part of this system that most deserves scrutiny.

Each drafted item goes to a model from a different family than the one that drafted it, ideally a different provider, and is asked to do four things **without being shown the intended key**:

1. Answer the item, and state confidence.
2. Argue the strongest case for each option being correct.
3. Judge whether the French reads as natural Canadian federal workplace register, flagging anything that reads as translated, France-specific, or textbook.
4. Estimate the band the item actually tests.

An item passes only on all four: the reviewer picks the intended key with high confidence, finds no defensible case for a distractor, raises no register flag, and lands within one band of the tag.

**Failures are discarded, never repaired.** Repair prompts produce items that satisfy the gate while remaining subtly wrong, which is worse than a smaller bank.

**On independence.** Cross-family review reduces correlated error; it does not eliminate it. Models share training data and share blind spots, particularly on register nuance in a second language. The honest claim is that this gate catches a measurable proportion of a measurable set of defects, which is why section 6 makes that proportion a tracked metric rather than an assumption. It is not equivalent to expert review and the product does not say that it is.

**Amendment, 4 October 2026 (ADR 24, progress.md D203–D204).** Bank v4 was not drafted by the pipeline: Claude wrote it
through the hand-authored path (§5), and **separate Claude instances reviewed it blind**, by the human's decision. Writer and
reviewer therefore share a family, which this section's independence argument does not cover. The four judgements, the
blindness and discard-not-repair are unchanged. The verdicts are committed (`content/factory/reviews/`) and replayed by
`--provider recorded`, so the bank rebuilds without a model. The reviewer was measured on a real-French defect set rather
than §6's placeholder one (`docs/content-runs/v4/eval/`). ADR 24 says what would bring a cross-family re-review.

**On the obvious objection.** If the reviewer can detect a subtly broken item, why can it not draft a correct one? Because verification is an easier problem than generation, because the reviewer works blind to the intended key and so cannot rationalise toward it, and because discard-rather-than-repair means the reviewer never has to produce a fix. This is the same reason code review works.

### 4.5 Deterministic validation

No model involved. Schema conformance, exactly four options, no duplicate options, rationale present on every distractor in both locales, explanation present in both locales, sub-skill exists in the profile taxonomy, answer not leaked in the stem, near-duplicate detection across the whole bank by normalised stem hash and embedding similarity, key position distribution across the bank tested against uniform, reading level consistent with the band tag, every exam form resolving all its item ids at the exact counts its variant requires.

### 4.6 Bank build

Compiles `content/` into immutable, content-hashed shards with a manifest. Reproducible: the same input produces byte-identical output, asserted in CI, because a bank build that is not reproducible cannot be audited.

**Amendment, 23 September 2026 (progress.md D54).** The pipeline (§4.1–§4.6), the `AiProvider` adapter, the gate wiring and the metrics are **built** (`apps/factory`, `adapters/openai`), and a small sample batch was run end-to-end and committed under `content/factory/` and `content/bank/v1/`. Because this environment had no funded OpenAI key, the sample run used a **deterministic scripted provider**, not a real model — the plan pre-authorised exactly this. Consequences, stated plainly: the committed sample's French is synthetic, and the yield / detection / cost figures are the harness measuring itself on controlled input, not a judgement of a real model. Bank-build reproducibility is real and CI-asserted (byte-identical rebuild). The figures become meaningful only at the **deferred full-volume paid run** on a funded key, which is the run that actually tests A1/A2/A3.

---

## 5. Hand-authored content

Generation is the default path and the one the pipeline is sized for. It is not the only path (ADR 6).

Hand-authored items enter at stage 4 and go through review, validation and the bank build unchanged. They carry `provenance.origin: 'authored'` and a contributor attribution. They are not exempt from the gates, and an item that fails review is discarded whoever wrote it.

This path exists because several things are better written by a person and some are only possible that way:

- The review-gate evaluation set in section 6, which is hand-authored by definition since it consists of deliberate defects.
- Gold-standard exemplars used as style anchors for stage 3.
- Curated benchmark sets for measuring whether generated items are getting better or worse over time.
- Oral scenarios written by someone who has actually sat the test.
- Contributions from public servants and language teachers, which are the project's best long-term source of quality.

**Amendment, 4 October 2026 (progress.md D203).** The path now also takes **oral scenarios**, written without an id, which
is minted from the content as the scenario stage mints one, and held to the scenario stage's checks. Authored **passages**
are now held to stage 2's checks too. `palier-factory run --authored-only` builds a bank from the carried version and the
contributions alone, drafting nothing, and `palier-factory check-authored` runs the intake's checks on a file. Bank v4's
630 items, 60 passages and 20 scenarios came in this way, written by Claude (ADR 24).

---

## 6. Measuring the factory

The factory's output cannot be verified by reading it, so it has to be measured. Six tracked metrics, committed per batch as JSON so the trend lives in version history.

| Metric | What it tells you | Action threshold |
| --- | --- | --- |
| Stage 4 yield | Whether drafting or the gate has drifted | Outside 45 to 75 percent, investigate before publishing |
| Review gate detection rate, per defect class | Whether the gate that replaces an editor works | Below 80 percent on any class, hold the batch |
| Sample defect rate | Whether the gate's verdict matches a human's | Above 5 percent, hold the batch |
| Cost per accepted item | Whether regenerating is cheap enough to stay iterative | Rising trend, investigate |
| Post-publication retirement rate | Whether items that passed every gate survive contact with users | Above 5 percent of a batch, treat as a gate failure |
| User report rate per thousand items served | The signal that arrives before the statistics do | Any spike, investigate that batch |

**The review-gate evaluation set** deserves emphasis because it is the only direct measurement of the gate. Forty to sixty items carrying deliberate defects across five classes: two defensible keys, a rationale that contradicts its option, France-specific register, a mis-tagged band, and the answer leaked in the stem. Run through stage 4 on every prompt or model change. An unmeasured gate is an unguarded bank.

**Amendment, 21 September 2026 (ADR 19).** In Phase 1 the **Sample defect rate** metric is deferred:
it compares the gate's verdict to a *human's*, and Phase 1 has no human in the loop. The gate is
measured instead by review-gate detection on the evaluation set (the row above it). The eval set is
authored *programmatically* as a set of test fixtures — deliberately-broken items are a fixture, not
expert bank content, so authoring them is compatible with an automated Phase 1. Post-publication
retirement rate and user report rate resume once there are users. The sample-defect metric returns
when a human read resumes (ADR 19's revisit trigger, and the Phase 7 [R8] gate).

---

## 7. Operating cost

Not just build cost. This is the part an embedded section was hiding.

**Per batch:** drafting and review inference, plus the maintainer time to read the batch report, run the 5 percent sample, and decide whether to publish. Realistically an hour of attention per batch even when everything passes.

**Per model change:** re-run the evaluation set, re-validate a sample, potentially re-tune prompts. Models change on someone else's schedule, several times a year. This is the recurring cost most likely to be underestimated, and it is the reason model versions are pinned in the factory config rather than tracking latest.

**Per PSC change:** if the real test changes format, affected items may need regeneration rather than editing.

**Ongoing:** triaging user reports, running the monthly statistics job and reviewing its retirement pull request.

**The honest summary:** this is not a script that runs once. It is a small system with a maintenance obligation, and the project should be willing to let the bank go stale for months at a time without that being a crisis. The application is designed so that a stale bank is still a working product.

---

## 8. Risks

| Risk | Likelihood | Impact | Response |
| --- | --- | --- | --- |
| Generated French is grammatical but reads as translated or European | High without mitigation | High. This is the failure that makes the product feel fake | Register veto in stage 4 and exemplar anchoring in stage 3. The week-one human read is dropped in Phase 1 (ADR 19); the human register check is deferred to the Phase 7 [R8] gate, so this risk is carried more heavily through the alpha |
| Review gate detects fewer defects than assumed | Medium | High | Measured directly by the evaluation set. If detection is below 80 percent, either the gate improves or hand review returns to the plan |
| Correlated blind spots between drafter and reviewer | Medium | Medium | Cross-provider rather than cross-model, and the evaluation set would show it as a defect class with persistently low detection |
| Licence determination is wrong on a source | Low | Medium | Nothing is quoted, so exposure is limited to structural similarity. Rejection on ambiguity, and provenance recorded so a takedown is a targeted removal |
| Model deprecation breaks the pipeline mid-project | High over a year | Medium | Pinned versions, a configuration file rather than code, and the evaluation set as the re-validation harness |
| Cost per item makes iteration expensive | Low | Medium | Tracked per batch. Small batches keep the blast radius small |
| The factory is never finished and the application waits on it | Medium | High | The application is built against a canonical fixture bank and can ship with a small hand-made bank. The two tracks are independent by design |

---

## 9. Descoping options

Recorded now so that they are choices rather than emergencies. In order of preference:

1. **Reading only.** Drop written expression items from v1. Roughly halves the content problem.
2. **Band B only.** C-level French is where register nuance is hardest and where generated text is most likely to disappoint. B is a large audience on its own.
3. **Standalone items only.** Drop passage-bound comprehension items, keeping cloze and error identification. Removes stage 2 entirely.
4. **Hand-authored seed bank.** 150 items written by a person or a small group, no factory at v1, with the factory built later against a known-good reference set. Changes the resourcing premise but does not change the application.
5. **Abandon the factory, keep the application.** The app plus a small curated bank is still a useful free tool.

Option 5 is not a failure state. It is the floor, and the architecture keeps it available.

---

## 10. Roadmap

**Week 1, the assumption test.** Before building anything: harvest twenty sources by hand, draft thirty passages, have two fluent GC French speakers read them cold and say whether they read as real departmental writing. This tests A1, the assumption everything else rests on, at a cost of a few hours and two favours. If it fails, stop and go to a descoping option.

**Weeks 2 to 3, the spine.** Harvest, passage construction, drafting, and the deterministic validation suite. Output: a hundred items that pass schema but have not been quality-gated.

**Week 4, the gate.** The evaluation set, then stage 4, then measure detection. This is the go or no-go.

**Weeks 5 to 6, volume and build.** Run to target volume, build the bank, generate exam forms, produce the first batch reports.

**After the application ships.** Oral scenarios, the English mirror, the statistics job, the sample review interface, and contributor tooling.

---

## 11. Open questions

1. Which two model families for drafting and review? Cross-provider is meaningfully stronger than cross-model within one provider.
2. Who are the two French readers for the week 1 test, and does asking them create any workplace complication worth avoiding?
3. Is the 5 percent sample reviewed by the owner or genuinely unattended? The product's about page should say which, honestly.
4. Does the project accept contributed items before or after public launch? Accepting early is better for quality and worse for review burden.
