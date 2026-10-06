# ADR 25: The diagnostic runs on the user's key and ends in a written result

**Status:** Accepted
**Date:** 2026-10-06
**Supersedes:** None. It overrides one design note in `product-requirements.md` §8.1, "Diagnostic before key, always".
It stands beside ADR 2 and ADR 7, and changes neither.

## Context

The owner took the 30-item written-expression diagnostic on the deployed app. The result was three rows:
"A-level items: 0 answered. 30 more are needed before a figure is shown", and the same for B and C. Under them was
"Only a full mock exam can give a band". In the owner's words, it "just reads as a waste of time".

That result was not bad luck. As built, a diagnostic could never show a figure:

- The selector drew it uniformly from a bank that holds only B and C items, so a run split about 13 and 17.
- The trend needs 30 answers at a band (`MIN_EVIDENCE`).
- PRD §6.2 says the diagnostic is "sized to clear the minimum evidence threshold for the practice trend in one
  sitting". It never did.
- Nothing in the run reached the daily plan. The plan read only the B/C target set at onboarding.

The owner decided on 6 October 2026:

1. **The result must be practical and tangible.** The diagnostic shows the score plainly, right and wrong, without
   revealing which questions were missed. It drops the caveat that only a mock exam gives a band.
2. **AI interprets the result, and the key is required before the diagnostic begins.** The owner was offered a
   result that is useful without a key, with AI added on top. They chose to require the key, knowing it overrides
   §8.1's design note. §8.1 calls the key step "the highest-risk drop-off in the product".
3. **The result names a starting level**, worded "Your plan starts at B". The owner was offered "You're likely at B"
   and no letter at all, and chose this wording.
4. **The diagnostic prepares the plan.** Today's plan follows the level the diagnostic found, and Today's
   "Where you stand" card restates the result in plain language.

## Decision

- **The diagnostic is an AI feature, gated on the key.** `/diagnostic` shows `NoKeyCard` with no key held. The key
  screen then offers the way back (`?next=diagnostic`, an allow-list). With a key held, the launcher states the cost
  of the written result before the first question, and starting the diagnostic is the consent to pay for it.
- **The run is even across bands.** The profile's new `diagnostic` block sets the run's `size`, its `bandQuota`
  (15 at B, 15 at C), `secureAccuracy` (0.7), `startShare` (0.7), `focusCount` (2) and `retakeDays` (28). These are
  exam-adjacent rules, so they are data (ADR 9).
- **The score and the placement are deterministic and derived** (principle 1, principle 8, ADR 16):
  - The engine's `summariseDiagnostic` reads the latest complete run from the attempt log. A complete run is one
    session with at least `size` distinct items answered.
  - It returns the score by band and by sub-skill as counts, and the weakest sub-skills.
  - It returns a **starting band**: the highest band at or below the target answered at `secureAccuracy`. Failing
    that, the lowest band the run held.
  - Nothing is stored, so a second device that syncs the attempts places the same way.
- **The plan follows the placement.** When the starting band is below the target, the planner draws `startShare` of
  the day's new items at the starting band first, and the rest above it. The run's weakest sub-skills join an oral
  report's fixes as the plan's focus. `studyFocus` derives both, and `startSession` and Today's preview both read it.
- **The model writes the words, not the level.** `AiProvider.interpretDiagnostic`, on the `assess` role, metered
  as `diagnostic-interpretation`:
  - It receives the engine's score and placement and the items missed.
  - It returns a headline, a summary, strengths, one to three priorities on the run's own sub-skills, and a line on
    the plan.
  - It is told never to quote a question and never to name a band. `checkDiagnosticInterpretation` refuses a reply
    that names another skill's sub-skill or quotes a missed stem.
  - The interpretation costs money and cannot be derived again, so it is kept, **device-local**, in a new
    `DiagnosticReportStore`. It is never synced and never exported, and wipe and delete-everywhere clear it.
- **The result never names a band and carries no mock-exam caveat.** It gives a score and the level practice starts
  at, which is what ADR 7 allows. A band still comes only from a mock exam's cut table. The mock exam stays offered
  where it always was, as a next step.

**R4 still holds.** Reading and written-expression practice, mock exams and all progress tracking work with no key
and no network. The diagnostic is a placement, not practice. A user without a key skips it and plans at their target,
as before.

## Consequences

Positive:

- A finished diagnostic now always gives a result.
- The plan the user returns to is visibly shaped by it.
- The written interpretation explains the score in words a learner can act on.
- The placement stays measurable and identical on every synced device, because a model never decides it.

Negative:

- The diagnostic is gated on the key. Every user who will not create an OpenAI key loses the placement, and §8.1's
  drop-off risk now sits before the first question. ADR 2's "every non-AI feature works without a key" still holds,
  but only because the diagnostic is now an AI feature.
- The missed items' text goes to OpenAI with the user's key. That is bank content, not the user's writing.
- An interpretation is kept on the device that paid for it. Another device shows the same score and placement, and
  asks for its own.
- The interpretation's prompt is not yet recorded from the live API, and its price is a placeholder until a funded
  live smoke runs.

## Revisit when

- The pilot, or reports from users, show people abandoning onboarding at the key before they ever place. The smaller
  change to reach for first is the owner's alternative from 6 October 2026: the deterministic score and placement
  without a key, and the written interpretation only on a key.
- Item statistics reach the few hundred responses per item that ADR 7 names. A starting level could then come from
  calibrated difficulty rather than a per-band accuracy threshold.
