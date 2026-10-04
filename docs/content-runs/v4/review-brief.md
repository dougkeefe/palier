# Blind review brief: Palier bank v4

You are an **independent adversarial reviewer** for practice items written for the Public Service
Commission of Canada's Second Language Evaluation (SLE) in French: reading comprehension and written
expression, levels B and C. Someone else wrote these items. You see each item **without its intended
answer, without the option rationales and without the explanation**. Your verdict decides whether the item
ships: it ships only if you pick the author's key with confidence ≥ 0.7, name no defensible distractor,
raise no register flag, and estimate a band within one level of the tag. **Disagreement discards the item;
nothing is repaired.** Your job is to protect candidates from flawed items, so be rigorous — but judge
honestly: do not invent problems, and do not wave problems through.

Rules of independence: read ONLY your input file. Do not open anything under `content/`, `apps/`,
`packages/` or `docs/`, and do not search the repository for these items. Do not run git. Write ONLY your
output file.

## Input

A JSON array of requests:

```json
{ "requestHash": "…", "itemId": "…", "request": {
    "itemType": "cloze | best-completion | error-id | comprehension",
    "stem": { "fr": "…", "en": "…" },
    "options": [ { "id": "a", "text": "…" }, … ],
    "passage": { "title": "…", "body": "…" },      // comprehension only
    "subSkill": "…", "targetBand": "B | C", "lang": "fr" } }
```

The candidate reads `stem.fr` (and the passage). `stem.en` is a translation for reference.

Item types: `cloze` (fill the `___`), `best-completion` (choose the continuation that is idiomatic and
correct), `error-id` (the quoted sentence contains exactly one error; choose the correction that fixes it),
`comprehension` (answer from the passage alone).

## For each item, do this

1. **Answer it as a top candidate would**, from the stem (and passage) alone. Decide which option is right.
2. **Then attack it as an examiner.** For every other option, ask: could a careful, educated native
   speaker of Canadian French, or a careful reader of the passage, defend this option as also correct or
   equally good? Consider regional variation, register, optional constructions (ne explétif, optional
   subjunctive after some expressions, alternative agreements both accepted by reference grammars), and
   readings of the passage that the text genuinely supports. If yes, list it in `defensibleDistractors`.
   Do not list an option merely because a weak candidate might pick it — only if it is genuinely
   defensible.
3. **Register and naturalness.** Flag (`registerFlag.flagged: true`, with a short `note`) if the item's own
   French — the stem, the passage, or the key — is unnatural, not idiomatic Canadian federal administrative
   French, uses France-specific usage or an anglicism that GC style guides reject (except where a
   *distractor* deliberately embodies the fault the item tests), contains a factual or typographical error,
   is ambiguous (e.g. the passage does not actually settle the question, two blanks, the stem misdescribes
   the task), or tests something other than its `subSkill`. Wrong distractors are supposed to be wrong; do not
   flag an item because a distractor is wrong.
4. **Band** (`estimatedBand`), from the level descriptors:
   - **A:** short, concrete, high-frequency vocabulary, present and passé composé, one clause.
   - **B:** workplace topics, multi-clause sentences, common connectors, full tense range in a transparent
     context.
   - **C:** abstract or specialised content, subjunctive and conditional, nuanced connectors (bien que, dans
     la mesure où, sous réserve de), register shifts, distractors grammatically valid but wrong in register or
     nuance.
   Estimate the level the item actually discriminates at, not the tag.
5. **Confidence** in your chosen answer, 0 to 1, calibrated: 0.95+ when it is unambiguous; 0.7–0.9 when you
   are fairly sure; below 0.7 when you hesitate between options.

## Output

Write a JSON array, one entry per input item, in the same order:

```json
[
  {
    "requestHash": "<copied from the input>",
    "itemId": "<copied from the input>",
    "verdict": {
      "chosenKey": "c",
      "confidence": 0.93,
      "defensibleDistractors": [],
      "optionCases": {
        "a": "One sentence (English) on why a is wrong or right.",
        "b": "…", "c": "…", "d": "…"
      },
      "registerFlag": { "flagged": false },
      "estimatedBand": "C"
    }
  }
]
```

- `chosenKey` and `defensibleDistractors` use the option ids `a`–`d`; `chosenKey` never appears in
  `defensibleDistractors`.
- `optionCases` must have all four ids, each a non-empty sentence.
- `registerFlag` is `{ "flagged": false }` or `{ "flagged": true, "note": "…" }` (note non-empty).
- Validate your file parses as JSON (e.g. `node -e "JSON.parse(require('fs').readFileSync('<file>','utf8'))"`)
  and has exactly as many entries as the input.

Reply with a short summary: how many items, how many you flagged or found a defensible distractor in, and
the item ids of any you think are seriously flawed with a one-line reason each.
