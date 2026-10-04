# Authoring brief: Palier bank v4

You are writing practice items for **Palier**, a free practice app for the Public Service Commission of
Canada's Second Language Evaluation (SLE) in French: reading comprehension and written expression, target
level **C**. Your items go into `content/authored/` as one JSON file, and from there through an independent
blind review (another model reads each item **without its key** and must pick your key, find no second
defensible answer, raise no register flag, and land within one band of your tag) and deterministic
validation. **An item that fails review is discarded, never repaired.** Write so that every item survives an
adversarial expert.

Working directory: `/Users/keefe/conductor/workspaces/palier/yaren`. Write ONLY your own output file. Do not
edit any other file. Do not run git.

## The file

```json
{ "items": [ ... ], "passages": [ ... ] }
```

`passages` only if you write reading items. Pretty-print with 2-space indentation.

### An item

```json
{
  "id": "claude-w-agreement-01",
  "version": 1,
  "skill": "writing",
  "lang": "fr",
  "type": "cloze",
  "stem": { "fr": "…", "en": "…" },
  "blankIndex": 0,
  "options": [
    { "id": "a", "text": "…", "rationale": { "fr": "…", "en": "…" } },
    { "id": "b", "text": "…", "rationale": { "fr": "…", "en": "…" } },
    { "id": "c", "text": "…", "rationale": { "fr": "…", "en": "…" } },
    { "id": "d", "text": "…", "rationale": { "fr": "…", "en": "…" } }
  ],
  "key": "a",
  "explanation": { "fr": "…", "en": "…" },
  "subSkill": "agreement",
  "targetBand": "C",
  "topic": "human-resources",
  "tags": [],
  "provenance": { "origin": "authored", "contributor": "claude-opus-5-5" },
  "status": "published",
  "createdAt": "2026-10-04T00:00:00.000Z",
  "updatedAt": "2026-10-04T00:00:00.000Z"
}
```

- `blankIndex: 0` **only** on `cloze` items, never on any other type.
- A `comprehension` item has `"skill": "reading"` and `"passageId": "<the passage's id>"`; every other type
  here is `"skill": "writing"` with no `passageId`.
- Exactly four options, ids `a` `b` `c` `d`, one `key`. Option texts must all differ.
- `stem`, every `rationale` and the `explanation` need both `fr` and `en`, non-empty. `fr` is what the
  candidate reads. `en` is a faithful English translation of it (for a writing item whose point is a French
  form, keep the French sentence in quotation marks inside the English, e.g. `Which correction does this
  sentence need? « … »`).
- Every option's rationale says **why it is right, or why it tempts and fails**. The explanation **teaches
  the rule** (it does not merely restate the key).
- `topic` is one of: `human-resources`, `finance-and-budgets`, `it-and-digital`, `service-delivery`,
  `policy-and-legislation`, `health-and-safety`, `procurement`, `communications`, `project-management`,
  `official-languages`, `accessibility`, `environment`.

### A passage (reading only)

```json
{
  "id": "claude-p-procurement-1",
  "lang": "fr",
  "docType": "memo",
  "title": "…",
  "body": "…",
  "wordCount": 0,
  "targetBand": "C",
  "topic": "procurement",
  "readability": { "sentences": 1, "avgSentenceLength": 1, "rareWordRatio": 0 },
  "source": { "kind": "original", "contributor": "claude-opus-5-5" },
  "status": "published"
}
```

`docType` is one of `email`, `memo`, `letter`, `bulletin`, `report-excerpt`, `research`, `note`. Put
placeholder numbers in `wordCount` and `readability`; the checker fills them in (below).

## Register (the single most important quality)

Real SLE texts sound like the Canadian federal workplace: an email about a deadline shift, a memo on a new
directive, a bulletin about a system outage, an excerpt from an evaluation report. Neutral, moderately
formal, dense with administrative French.

- **Canadian French in Government of Canada administrative usage**: mandat, livrable, échéancier,
  gouvernance, intervenants, mise en œuvre, reddition de comptes, gestionnaire, fonctionnaire, sous-ministre
  adjoint, direction générale, demande de propositions, autorisation de dépenser, courriel, téléphone
  cellulaire, fin de semaine, stationnement, rencontre/réunion, échéance.
- **No France-specific usage** (mail, mél, week-end, parking, portable for a phone, «boulot», etc.) and **no
  anglicisms GC style guides reject** (appliquer sur un poste, céduler, adresser un problème, en charge de,
  prendre action, etc.) — except as a deliberate distractor in a `false-friends-and-anglicisms` or
  `register-and-formality` item, where the rationale names the fault.
- **Fictional and neutral.** No real people. No real department named in a way that implies a real event
  (generic: « la Direction générale des services ministériels », « le Ministère », « l'équipe des
  finances »). Nothing partisan, nothing current, nothing that will age. No real program names.
- Typography: French guillemets « … » with non-breaking-feel spaces as you normally write them, typographic
  apostrophe or straight apostrophe — either, but be consistent within a file.

## Bands (product-requirements.md §13.4)

- **B:** workplace topics, sentences of several clauses, common connectors, the full range of tenses in a
  transparent context.
- **C:** abstract or specialised content, subjunctive and conditional, nuanced connectors (bien que, dans la
  mesure où, sous réserve de, à moins que, quitte à, faute de, nonobstant), register shifts, and **distractors
  that are grammatical but wrong in register or nuance**. This is the target audience: C items must be
  genuinely good, not B items with long words.

## The quality bar (an item ships only if)

- The stem is unambiguous and **exactly one option is defensible**. Before you finish an item, try hard to
  argue for each distractor; if any could be defended by a careful native speaker, change it.
- Every distractor is plausible to a candidate at the target band (no throwaway nonsense options).
- It tests its tagged sub-skill, not general knowledge or arithmetic tricks.
- It is original — nothing copied from a real exam, textbook or real government document.

## Mechanical rules the validator enforces (an item breaking one is rejected)

1. **No distractor rationale may contain** the words `correct`, `bonne réponse`, `la bonne`, `the answer`
   or `is right` (in either language, any case). Say « ne convient pas », « fautif », « est à écarter »,
   "does not fit", "is wrong because" instead. (The KEY's rationale may say anything.)
2. **The key's text must not appear inside the stem** (case-insensitive, punctuation ignored, plain substring
   — so a short key like « en » or « y » can match inside another word). Prefer keys of several words.
3. **Stem length vs band:** a `C` stem needs at least **15%** of its words longer than 7 letters
   (punctuation stripped). A `B` stem has no constraint. If a C stem is short and plain, enrich it with
   administrative vocabulary.
4. **No near-duplicate stems**: two stems sharing 70% or more of their words are a duplicate. Never reuse a
   generic question frame; every stem should name something specific to its passage or situation.
5. Passages: **B 40–170 words, C 50–230 words, at least 3 sentences**, **no run of 4 or more digits**
   (no years like 2026, no « 12500 »: write « 12 500 », « 3,5 millions ») and **no all-caps acronym of 3+
   letters** (no « SCT », « RH » is fine as 2 letters but prefer spelling out).

## Item types

- **cloze** (`writing`): a sentence (or two) with exactly one blank written `___`, four options to fill it.
  `blankIndex: 0`.
- **best-completion** (`writing`): an incomplete sentence or short message ending in `…`; four
  continuations, one idiomatic and correct, three grammatical-looking but weaker (wrong connector, wrong
  register, wrong nuance, wrong construction).
- **error-id** (`writing`): the stem asks which correction a sentence needs, and quotes the sentence, e.g.
  `Quelle correction faut-il apporter à la phrase suivante ? « … »`. The sentence contains **exactly one**
  error. Options are corrections written as `remplacer « X » par « Y »` (or `ajouter …` / `supprimer …`).
  The key fixes the real error; each distractor "corrects" something that was already right (making it
  wrong) or proposes a non-fix. Vary the stem wording across items (rule 4) — e.g. « Repérez l'erreur dans
  ce passage d'un courriel et choisissez la correction appropriée : « … » », « Cette phrase tirée d'un
  rapport contient une faute. Laquelle des corrections suivantes s'impose ? « … » ».
- **comprehension** (`reading`): a question about the passage; four options, one supported by the text,
  three defensible only on a misreading (wrong detail, overgeneralisation, reversal, plausible but not
  stated). The question must be answerable from the passage alone. For a **C** comprehension item, do not
  let the key be lifted word for word from the passage: paraphrase it, and make the question require
  synthesis, inference or attention to nuance, otherwise it reads as B.

## Your workflow

1. Write your whole file.
2. Run the checker on it (it also fills in passage numbers):
   ```
   node apps/factory/dist/index.js check-authored --write-readability content/authored/<your-file>.json
   ```
3. Fix every `ISSUE:` line it prints and rerun until it says `0 issue(s)`.
4. Re-read every item once more as a hostile reviewer: is there a second defensible answer? Is the French
   natural Canadian administrative French? Is the band right? Fix what you find, rerun the checker.
5. Reply with a short summary: counts by type, band, key letter and sub-skill/topic, and anything you were
   unsure about. Do NOT paste the items back.

## Key letters

Spread keys evenly across a, b, c and d in your file (about a quarter each) and avoid patterns
(no a-b-c-d cycles, no runs of the same letter longer than two).
