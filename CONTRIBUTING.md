# Contributing to Palier

**Every item must be your own original work.** Palier contains no real test items and
reproduces no Public Service Commission material, and that holds for every contribution. Do
not submit a question you remember from a real SLE, or one a colleague described to you. Do
not paraphrase or reconstruct a real test item, and do not copy or adapt the PSC's own
self-assessment tests. If an item started from one of those, it cannot come in, however much
it has been changed. Every pull request asks you to confirm this, and a contribution that
breaks the rule is removed.

Thank you for helping. Items written by public servants and language teachers are the
project's best long-term source of quality, and this guide tries to make adding one quick.

## Licences

The code is under the PolyForm Noncommercial License 1.0.0 ([`LICENSE`](LICENSE)). The content
(items, passages, forms and other practice material) is under Creative Commons
Attribution-NonCommercial-ShareAlike 4.0 International ([`LICENSE-CONTENT`](LICENSE-CONTENT)).
Neither permits commercial use. By contributing you agree that your code is released under the
PolyForm Noncommercial License 1.0.0 and your content under CC BY-NC-SA 4.0, the same terms
the project is published under. CC BY-NC-SA asks for attribution, so every item you write
carries your public handle (ADR 23).

## Writing an item

### Where it goes

Put one JSON file per contribution in [`content/authored/`](content/authored/), for example
`content/authored/your-handle-subjunctive.json`. The file holds your items, and any passages
they ask about:

```json
{ "items": [ … ], "passages": [ … ] }
```

`passages` is optional. Each item and passage follows the published schemas in
[`docs/schemas/`](docs/schemas/): `item.schema.json` and `passage.schema.json`.

### A minimal example

```json
{
  "items": [
    {
      "id": "your-handle-bien-que-1",
      "version": 1,
      "skill": "writing",
      "lang": "fr",
      "type": "cloze",
      "stem": {
        "fr": "Bien que le livrable ___ avec deux semaines de retard, le comité a approuvé l'échéancier révisé.",
        "en": "Although the deliverable ___ two weeks late, the committee approved the revised schedule."
      },
      "blankIndex": 0,
      "options": [
        {
          "id": "a",
          "text": "ait été remis",
          "rationale": {
            "fr": "« Bien que » commande le subjonctif, et le subjonctif passé marque une action antérieure à celle de la principale.",
            "en": "“Bien que” takes the subjunctive, and the past subjunctive marks an action earlier than the main clause."
          }
        },
        {
          "id": "b",
          "text": "a été remis",
          "rationale": {
            "fr": "Tentant, car la remise a bien eu lieu, mais l'indicatif ne suit pas « bien que ».",
            "en": "Tempting, since the delivery did happen, but the indicative does not follow “bien que”."
          }
        },
        {
          "id": "c",
          "text": "avait été remis",
          "rationale": {
            "fr": "L'antériorité convient, mais le mode ne convient pas : c'est encore l'indicatif.",
            "en": "The sequence fits, but the mood does not: this is still the indicative."
          }
        },
        {
          "id": "d",
          "text": "sera remis",
          "rationale": {
            "fr": "Ni le mode ni le temps ne conviennent à une remise déjà faite.",
            "en": "Neither the mood nor the tense suits a delivery that has already happened."
          }
        }
      ],
      "key": "a",
      "explanation": {
        "fr": "« Bien que » introduit une concession et commande toujours le subjonctif. Pour une action accomplie avant celle de la principale, on emploie le subjonctif passé : « bien qu'il ait été remis ».",
        "en": "“Bien que” introduces a concession and always takes the subjunctive. For an action completed before the main clause, use the past subjunctive: “bien qu'il ait été remis”."
      },
      "subSkill": "verb-tense-and-mood",
      "targetBand": "C",
      "topic": "project-management",
      "tags": [],
      "provenance": { "origin": "authored", "contributor": "your-handle" },
      "status": "published",
      "createdAt": "2026-09-29T00:00:00.000Z",
      "updatedAt": "2026-09-29T00:00:00.000Z"
    }
  ]
}
```

Some notes on the fields:

- **`id`**: anything unique that no other item or passage uses. Your handle and a short
  slug work well: `your-handle-bien-que-1`. It is stable forever once published.
- **`provenance`**: always `{ "origin": "authored", "contributor": "<your GitHub handle>" }`.
  The contributor is a public handle (letters, digits and single hyphens, 39 at most), never
  your name or your email. An authored item without one fails validation.
- **`stem`, `rationale`, `explanation`**: both `fr` and `en` are required, and neither may be
  empty. The candidate reads the item in its own language (`lang`); the other is a faithful
  translation. Every option has a rationale saying why it is right or why it tempts, and the
  explanation teaches the rule rather than restating the key.
- **`options`**: exactly four, with ids `a`, `b`, `c` and `d`, and one `key`.
- **`type`**: `cloze` (fill the blank, written `___` in the stem, with `blankIndex: 0`),
  `error-id` (find the error), `best-completion` (complete the sentence) or `comprehension`
  (a question about a passage, which needs a `passageId`).
- **`skill`** is `reading` or `writing`, and **`subSkill`** is exactly one from that skill's
  list under `subSkills` in [`content/profiles/psc-sle.json`](content/profiles/psc-sle.json).
  **`topic`** comes from `topics` in the same file.
- **`targetBand`** is `A`, `B` or `C` (product-requirements.md §13.4):
  - A: short and concrete, high-frequency words, present and passé composé, one clause.
  - B: workplace topics, sentences of several clauses, common connectors, the full range of
    tenses in a transparent context.
  - C: abstract or specialised content, the subjunctive and the conditional, nuanced
    connectors (bien que, dans la mesure où, sous réserve de), register shifts, and
    distractors that are grammatical but wrong in register or nuance.
- **`status`**: `published`. **`version`**: `1`. The timestamps are ISO 8601 in UTC.

A **passage** is written from scratch, not copied from a real document, and carries your
handle in its source: `"source": { "kind": "original", "contributor": "your-handle" }`. It needs
at least three sentences and, for band B, 40 to 170 words (C: 50 to 230), with no number of four
or more digits in a row and no all-caps acronym. Leave `wordCount` and `readability` to the
checker below, which computes them from the body.

### Register (product-requirements.md §13.1)

Register matters more than anything else. Real SLE texts sound like the federal workplace: an
email about a deadline shift, a memo on a new directive, a bulletin about an outage, an excerpt
from an evaluation report. Neutral, moderately formal, and dense with administrative French.

- Canadian French in GC administrative usage, with the vocabulary of departmental life:
  mandat, livrable, échéancier, gouvernance, intervenants, mise en œuvre, reddition de comptes.
- No France-specific usage or slang, and no anglicisms that GC style guides reject.
- No real people, and no real department in a way that implies a real event. Nothing that
  could be read as a real internal communication.
- Politically neutral. Nothing partisan or current, nothing that will age badly.

### The quality bar (product-requirements.md §13.3)

An item ships only if:

- [ ] The stem is unambiguous and exactly one option is defensible.
- [ ] Every distractor is plausible to a candidate at the item's target band, and each has a
      written rationale.
- [ ] It tests its tagged sub-skill, not general knowledge.
- [ ] Its band has been checked against the band descriptions above.
- [ ] It is original.
- [ ] It passes independent adversarial review. Disagreement is resolved by discarding the
      item, not by repairing it, and that applies to hand-authored items too.

## Checking your file

You need Node (the version in [`.nvmrc`](.nvmrc)) and pnpm. Then:

```bash
pnpm install && pnpm build && pnpm verify
```

`apps/factory/src/authored.test.ts` checks every file in `content/authored/`: it must parse
with the schemas, pass the same deterministic checks the bank build runs (the domain's
`validate()` among them), credit a contributor on every item and passage, and use no id that
the committed bank or another contribution already holds for something else. Its failure
message names the item and says what is wrong.

To check one file quickly, and to have your passages' `wordCount` and `readability` filled in:

```bash
pnpm --filter @palier/factory build
node apps/factory/dist/index.js check-authored --write-readability content/authored/your-file.json
```

It prints one `ISSUE:` line per problem, including two stems so alike that the bank build would
drop the second.

## What happens next

A maintainer reviews your pull request. Once it is merged, your items enter the content
factory at stage 4 on the next bank build and go through everything a machine-drafted item
does: model review blind to the key, then deterministic validation. An item that fails the
review is discarded, whoever wrote it. Your checks passing does not mean it will survive
review. Items that pass are published in a new bank version, credited to your handle. Once
published, an item is kept and watched: if users' answers show it misbehaving, or it gathers
reports, it is retired automatically.

## Reporting a bad item

Every item has a "Report a problem with this item" control on its feedback panel. Pick a
reason and it opens a prefilled GitHub issue with the item's id. Nothing is sent until you
submit the issue yourself.

## Contributing code

- `pnpm verify` must pass. It runs the type check, lint, dependency boundaries and tests, in
  that order, and nothing merges without it.
- Read the eight principles in [`CLAUDE.md`](CLAUDE.md). The short version: the core is pure,
  dependencies point inward, every external thing sits behind a port, and exam rules live in
  the profile JSON, never in code.
- The decisions behind the architecture are recorded in [`docs/adr/`](docs/adr/), each with a
  *revisit when* clause. Before proposing an architectural change, check whether it has
  already been decided, and whether the evidence its *revisit when* asks for has appeared.
- Never edit an accepted ADR. Supersede it with a new one, taking the next free number.
- [`docs/progress.md`](docs/progress.md) says what is built and what is next, and its
  deviations log says where the work departed from the plan and why.
