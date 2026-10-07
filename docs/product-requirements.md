# Palier: Product Requirements

**Working name:** Palier
**Version:** 0.1 draft
**Date:** 17 September 2026
**Owner:** Doug Keefe
**Companions:** architecture.md (how), content-factory.md (the content subsystem), implementation-plan.md (in what order), adr/ (why)
**Status:** For review

---

## 0. How to read this document

Four kinds of statement appear here and they carry different weight.

| Kind | Marker | Changeable by |
| --- | --- | --- |
| **Requirement** | "must" | A product decision, recorded as an amendment here |
| **Design decision** | "will", plus an ADR citation where one exists | A maintainer who writes a superseding ADR |
| **Assumption** | "we expect", "assumes" | Evidence. Section 18 lists the ones worth tracking |
| **Preference** | "prefer", "should" | Anyone with a reason, without ceremony |

Section 0.1 lists the requirements. Everything else in this document is design work that serves them, and a future maintainer should feel free to change it if the requirement is still met.

### 0.1 Requirements

| # | Requirement |
| --- | --- |
| R1 | The product must practise the three skills the SLE tests: reading comprehension, written expression, oral proficiency. |
| R2 | Practice items must match the format, item types and register of the real tests as published by the PSC. |
| R3 | Mock exams must mirror the published structure of a real variant and score against its published cut table. |
| R4 | Reading and written expression practice, mock exams, and all progress tracking must work with no API key and no network after first load. |
| R5 | The product must never present itself as official, affiliated or endorsed, and must state its independence where a user could be confused. |
| R6 | The product must contain no real test items and no reproduction of PSC material. |
| R7 | Every item must carry a written rationale for each option and an explanation that teaches the underlying rule. |
| R8 | The interface must be fully bilingual with equal prominence for both official languages. |
| R9 | The product must meet WCAG 2.2 Level AA, verified before each release. |
| R10 | The product must never show a proficiency estimate without the evidence and uncertainty behind it. |
| R11 | A user must be able to export all of their data, import it back, and delete it everywhere, each in one action. |
| R12 | The user's API key, session audio, oral transcripts and written submissions must never leave the user's device, except to the AI provider the user configured and, for the key only, the single ephemeral-token mint described in ADR 3.\* |
| R13 | The product must be free to use, and its source publicly available under a non-commercial licence (ADR 23). |
| R14 | Progress must be available across a user's devices, and a user must be able to turn that off. |

\* **Amendment, 19 September 2026.** R12 previously read "except to the AI provider they
configured", which ADR 3 contradicts: minting an ephemeral credential for realtime voice
requires one server-style call, so the user's key transits a stateless edge function that
logs nothing and holds nothing. The requirement had never been reconciled with the decision.
The exception is now stated in the requirement itself rather than only in `architecture.md`
§6.3, because a requirement that is quietly untrue is worse than a narrower one that is
true. The exception is for the key and for that one route only: audio, transcripts and
submissions still go nowhere but the configured provider, and the key-leak test (tier 11)
asserts exactly this boundary rather than the older, broader claim.

Everything below serves these. Where the document says how something looks or behaves in detail, that is design, not requirement.

---

## 1. What this is

A free, source-available web app for practising the Public Service Commission's Second Language Evaluation (SLE). It covers the three tested skills (reading comprehension, written expression, oral proficiency), it targets level C in French as a second language first, and it aims for the production polish of a consumer language app while staying faithful to the actual format and register of the real tests.

Users bring their own OpenAI API key. Everything that costs money runs on their key, in their browser. Progress syncs across a user's devices by default, with no sign-in required and a single switch to turn it off. The project has no server-side AI spend and no revenue model.

### 1.1 Why it should exist

Preparing for the SLE today means paying a private language school, working through a photocopied booklet from 2009, or guessing. The PSC publishes two short self-assessment tests and nothing else. Meanwhile a CBC profile gates most EX positions and a large share of bilingual staffing actions, so the demand is constant and the supply of good free practice is close to zero.

### 1.2 What success looks like

- A public servant with no budget and no class can do 15 focused minutes a day and know, with evidence, whether they are tracking toward B or C.
- The reading and written expression drills feel indistinguishable in format and register from the real thing.
- The oral studio is the reason people tell their colleagues about it. Nothing else free lets you practise a 20 minute French interview at 10pm on a Tuesday.
- Someone can fork the repo, swap the item bank, and ship a version for another exam.

### 1.3 Non-goals

- Not a language course. It does not teach French from zero. It assumes the user has working French and needs to perform under exam conditions.
- Not a predictor. It gives a readiness estimate with visible uncertainty, never a promised result.
- Not affiliated with the PSC, the Canada School of Public Service, or any department, and the design has to make that obvious at a glance.

---

## 2. Legal and ethical posture

This shapes the design, so it comes before the product.

| Constraint | Design consequence |
| --- | --- |
| Real SLE items are secure and protected. Reproducing them, or publishing recalled items, is out of bounds. | Every item in the bank is original. The contribution guide says so in the first paragraph and the PR template asks contributors to attest to it. |
| The PSC's own self-assessment tests are PSC copyright. | Not scraped, not copied, not paraphrased item by item. Linked to as a resource. |
| Federal Identity Program symbols (flag wordmark, Canada wordmark, departmental signatures) are protected. | None appear anywhere in the product, including the favicon and social card. |
| Users must not mistake this for an official tool. | Persistent, unmissable non-affiliation statement in the footer of every page, in the onboarding, and in the results screen next to any band estimate. Visual language is deliberately unofficial (see section 10). |
| Source texts drawn from public GC material carry licence terms that differ by source. | Every source passage records its URL, retrieval date, and licence. Default to Open Government Licence - Canada material; where canada.ca non-commercial reproduction terms apply, keep the project non-commercial and attribute. Anything without a clear licence gets rewritten from scratch rather than quoted. |

Copy for the standing disclaimer, EN:

> Palier is an independent, source-available study tool. It is not affiliated with, endorsed by, or connected to the Public Service Commission of Canada. It contains no real test questions and its results are not official.

---

## 3. Users

### 3.1 Primary: the C-chaser

Mid to senior public servant, 35 to 55, already holds B in the skill or holds C and needs to requalify. Competing for an EX or an EX-minus-one role with a CBC profile. Has an exam date, or is about to book one. Time-poor, motivated, allergic to being condescended to. Studies in stolen 20 minute blocks and on weekends. Cares about one number: will I get C.

Needs: realistic difficulty, honest feedback, targeted practice on the specific things costing them the band, and oral rehearsal with someone who will not be kind.

### 3.2 Secondary: the B-seeker

Officer or analyst applying for bilingual imperative positions at BBB. Lower French confidence, more anxiety, more likely to be defeated by a hard first session. Needs a gentle diagnostic, visible early wins, and vocabulary scaffolding.

### 3.3 Secondary: the francophone taking English

Same shape as the above, mirrored. Ships in a later phase but the data model and UI must not assume French is the target from day one.

### 3.4 Tertiary: the contributor

A public servant, teacher, or developer who wants to add items. Needs a legible content schema, a local preview, and a review checklist.

---

## 4. Product principles

These are tie-breakers for design decisions, not requirements. They express how this product prefers to resolve a trade-off when both options satisfy section 0.1.

1. **Format fidelity beats volume.** One drill that matches the real item type is worth fifty generic French exercises.
2. **No punishment mechanics.** Adults with a career riding on this do not need to lose hearts. Streaks reward showing up; nothing takes progress away.
3. **Always show the evidence.** A band estimate is always accompanied by what it is based on and how confident it is.
4. **Zero-key usable.** The shipped item bank, all drills, all mock exams for reading and written expression, and all progress tracking work with no API key. The key unlocks generation, written feedback, and the oral studio.
5. **Works offline, syncs by default.** The browser is the system of record and the app is fully usable with no network. Progress syncs so a user can start on a laptop and finish on a phone, and one switch in settings stops it. Four things never sync under any setting: the API key, session audio, oral transcripts, and written workshop submissions.
6. **Both languages, equal weight.** The interface is fully bilingual, with no second-class translation.
7. **Accessible because of who this is for.** WCAG 2.2 AA is a build requirement enforced in CI, not a later audit.

---

## 5. The exam model

Everything in the product is anchored to the published structure of the real tests. This table is the single source of truth for mock exam configuration and for how raw scores map to bands.

### 5.1 Reading comprehension

| | Supervised (633 / 634) | Unsupervised |
| --- | --- | --- |
| Items | 60 multiple choice, 50 scored, 10 pilot | 25 |
| Time | 90 minutes | 45 minutes |
| Item types | Best word or phrase to fill a blank in a text; comprehension questions on a passage | Read a workplace text (typically an email) and choose the best answer |
| Text types | Emails, notes and memos, letters, information bulletins, report excerpts, research papers, all work-related | Common workplace formats, work-related topics |
| Bands | X 0-17, A 18-27, B 28-37, C 38-44, E 45-50 | X 0-8, A 9-13, B 14-18, C 19-25 |

### 5.2 Written expression

| | Supervised (654) | Unsupervised |
| --- | --- | --- |
| Items | 65 multiple choice, 55 scored, 10 pilot, not adaptive | 30 |
| Time | 90 minutes | 45 minutes |
| Item types | Fill in the blank; error identification | Choose the best word or phrase to complete sentences or short paragraphs in workplace scenarios |
| Bands | X 0-19, A 20-30, B 31-42, C 43-51, E 52-55 | X 0-10*, A 11-16, B 17-23, C 24-30 |

\* **Amendment, 19 September 2026.** The `X 0-10` row on the unsupervised test is **inferred, not transcribed.** The published figures this document was built from give the unsupervised written expression bands as `A 11-16, B 17-23, C 24-30`, which leaves raw scores 0 to 10 mapping to no band at all. Every other variant in this section covers its full range, and the unsupervised reading test does publish an X band (`X 0-8`), so the omission is far more likely to be a gap in transcription than a fact about the test. The band mapping must be total — `implementation-plan.md` §6.2 makes it a property test and a phase 0 exit criterion — so `content/profiles/psc-sle.json` carries `X: [0, 10]` and this row now matches it.

**This should be checked against the PSC's published table before launch.** It is the one number in this section that nobody has verified against a source, and a wrong band boundary is silent: it produces a plausible result for every user, forever, with nothing to notice. See deviation D12 in `progress.md`.

**Verified 25 September 2026** (`progress.md` D96): the PSC's page for the unsupervised test of written expression states "An 'X' is the result for those below level 'A' who obtain a score of 0 to 10." The row is now transcribed, not inferred, and the other three cut tables match their published pages too.

Worth noting for the product copy: the written expression test is entirely multiple choice. It measures knowledge of grammar, vocabulary and other aspects of written expression, not composition. Many candidates arrive expecting to write an essay. Palier should correct that expectation early, while still offering an optional free-writing workshop because the skill transfers to the oral test.

### 5.3 Oral proficiency

Administered remotely by a PSC-certified assessor over Microsoft Teams, camera on, 20 to 40 minutes including instructions, covering situations related to work, studies or volunteer activities. Results are X, A, B, C or E, valid five years, with a 30 day minimum between attempts.

Published level descriptors, condensed:

- **A:** understands speech on concrete and routine topics; short exchanges, everyday activities, basic vocabulary; pronunciation needs listener attention.
- **B:** understands the main points of clear standard speech on work topics; simple descriptions and explanations; some spontaneity with pauses for grammar; generally clear pronunciation despite accent.
- **C:** understands linguistically complex speech on specialized topics; detailed descriptions, summarises discussions, responds to complex questions; broad vocabulary, natural delivery, rare mispronunciations that do not impede communication.

The PSC does not publish a phase-by-phase breakdown of the interview. Palier's simulated structure is therefore presented as a plausible rehearsal shape, not as the official format, and the UI says so.

### 5.4 Palier's internal difficulty scale

There is no internal difficulty scale beyond the band tag. An item is tagged A, B or C and that is the whole of what the engine knows about its difficulty. Once real response data exists, each item also carries an observed proportion correct and a point-biserial correlation, used to retire bad items rather than to fine-tune selection. The product resists inventing a continuous difficulty scale it cannot measure.

---

## 6. Core loops

### 6.1 The daily loop (the default)

Open app → see today's plan (one card, three items: a warm-up set, a targeted set, a review set) → 12 to 18 minutes → results with one insight → streak increments → tomorrow's plan updates.

The plan is generated locally from the scheduler: due spaced-repetition reviews first, then the weakest sub-skill, then a rotating "keep sharp" set from strengths.

### 6.2 The diagnostic loop (first run and every four weeks)

A short placement, 30 items and about 15 minutes per skill, sampling evenly across bands and sub-skills rather than adapting. It is sized to clear the minimum evidence threshold for the practice trend in one sitting, and it doubles as the first read on which sub-skills are weak. Re-offered monthly and after any mock exam.

As built (ADR 25): the run is split evenly between the bands the bank holds, by the profile's `diagnostic.bandQuota`. It ends in the score, right and wrong, by level and sub-skill, without showing a question; the level the plan starts at; and a written interpretation on the user's key. The plan then draws its new items from that level first, and favours the run's weakest sub-skills. One run still does not clear the practice trend's 30 answers at a band, so the result reads the run's own counts rather than waiting on the trend.

Not adaptive, deliberately. Adaptive placement needs calibrated item difficulties to know what "harder" means, and at launch it would just be guessing in a more complicated way. Even sampling across bands gives a better first picture and takes three minutes longer.

### 6.3 The mock exam loop

Full-length, timed, no feedback until the end, no pausing after the first 60 seconds, one attempt per form. Configurable to supervised or unsupervised format. Produces a band using the real score bands from section 5, plus a per-sub-skill breakdown and a review walkthrough.

### 6.4 The oral loop

Pick a session type → mic and level check → live session with the examiner → transcript and audio saved locally → scored against the criteria rubric → three specific things to fix → those become drill items in tomorrow's plan.

### 6.5 The review loop

Every item answered incorrectly, and every item answered correctly but slowly or with low confidence, enters a spaced repetition queue. Explanations are written to teach the underlying rule, not just to reveal the key.

---

## 7. Information architecture

```
/                       Landing (unauthenticated marketing + non-affiliation)
/start                  Onboarding wizard
/home                   Today's plan and readiness dashboard
/practice
  /reading              Reading drill hub, sub-skill tiles
  /writing              Written expression drill hub
  /writing/workshop     Optional free-writing with AI feedback (key required)
  /oral                 Oral studio hub
  /oral/session/:id     Live session
/exam
  /reading              Mock exam setup and runner
  /writing
  /oral
/review                 Spaced repetition queue and mistake library
/progress               History, band trend, per-sub-skill detail, exports
/library                Grammar and vocabulary reference, register guide
/settings
  /key                  API key management and spend meter
  /sync                 Sync switch, paired devices, and pairing by code (ADR 5)
  /data                 Export, import, delete everything
/about                  What this is, what it is not, who made it, licence
```

---

## 8. Screens

### 8.1 Onboarding (`/start`)

Five steps, skippable after step 2, under 90 seconds.

1. **Which direction.** French as a second language, or English. Large bilingual cards.
2. **What you are aiming for.** B or C, with a plain-language description of what each means at work. Optional: "I have a test booked on [date]", which turns the dashboard into a countdown and back-plans the study schedule.
3. **Where you are now.** Offer the diagnostic (30 items, about 15 minutes per skill, per section 6.2), or self-declare a current profile (for example ECB), or skip. The diagnostic runs on the user's key (ADR 25), so choosing it without a key leads to the key first, and back.
4. **How you want to be pushed.** Daily goal: 10, 20 or 30 minutes. This is the only place a goal is set and it is changeable any time.
5. **Optional key.** Explain in three lines what the key unlocks, what it costs, that it never leaves the browser, and that everything else works without it. Link to a one-page guide with screenshots of creating a key and setting a spend cap on the OpenAI dashboard.

Design note: step 5 is the highest-risk drop-off in the product. It must be explicitly optional, and the app must be visibly fun before the user reaches it. ~~Diagnostic before key, always.~~ Overridden by the owner on 6 October 2026 (ADR 25): the diagnostic ends in a written result on the user's key, so on the diagnostic path the key comes first. Step 5 stays optional on the skip path, and everything but the diagnostic still works without a key.

**Sync in onboarding.** There is no sign-in step. On first run the app creates an anonymous sync identity and starts syncing progress. Step 1 carries a single quiet line, "Your progress syncs across your devices. You can turn that off in settings," linking to a short plain-language explanation of exactly what does and does not leave the device. There is no sign-in later either. A second device joins by pairing code from `/settings/sync`, which is the whole of identity in v1 (ADR 5).

### 8.2 Home (`/home`)

Three zones, stacked on mobile, two-column from 900px.

**Zone A, the readiness card.** The emotional centre of the product, and the place where the product is most tempted to overclaim. It shows two different things and keeps them visually distinct.

*Your last exam result,* if there is one. The band letter, large, with the raw score and the cut points beside it: "C, 39 of 50. C starts at 38." This is the number that came from a full-length form scored against the published cuts, so it is the one that leads.

*Your practice trend,* always. Two accuracy bars, one per band tag, each with its uncertainty range shown as a lighter extension: "B-level items, 84% correct. C-level items, 52% correct." Underneath, one sentence of provenance: "Based on 340 items over the last 21 days." A sparkline shows the direction of travel over four weeks.

Deliberately absent: a single band letter derived from drill data. Drills are not a calibrated instrument and a letter would imply they are. The accuracy figures answer the user's real question ("am I getting the hard ones yet") more directly than a letter would, and they cannot be quietly wrong in the way a modelled estimate can.

If a test date is set, a countdown sits above both, and the advice line is about what to practise rather than a projected result.

**Zone B, today's plan.** One card with three tappable rows, each showing type, item count and estimated minutes. A single primary button, "Start, 14 min". Completing all three flips the card to a done state with the streak animation.

**Zone C, quick actions.** Oral studio, mock exam, review queue (with due count), library.

As built (owner's request, 6 and 7 October 2026; progress.md D214–D218): Today is built around the next step. **The plan leads**, two-thirds of the width from 900px, and opens with that step when it is not the plan itself: the diagnostic first, a retake when it is due, then a mock exam once practice at the target is measurable (the trend has an estimate at the target band) or the test is a few days away. Zone C's quick actions moved inside the plan card as "More ways to practise", and the separate review card is gone, since the plan's first row draws on the same due items. Beside the plan, a **grammar pointer**: one grammar point a day, written in the language practised whatever the interface's, from `@palier/content/pointers`, on what the writing plan favours (D218). Zone A, **where you stand**, sits below the pointer: the diagnostic first, then the practice trend, then the last mock exam once there is one, each saying in a line what it is.

Then laid out as a dashboard (owner's request, 7 October 2026; progress.md D219), in the app's palette and serif. A deep **hero** heads the page: the week's answers, with the test countdown above them when a date is set, beside **the three skills as cards**. Reading, written expression and oral expression each link to their practice and show how much of today's plan is done. Below, the left column holds **statistics** (the streak, the reviews due, the week's minutes of practice with a seven-day line), then the plan, then where you stand. The right column holds a **practice calendar**, marking the streak's days, the days its freeze kept, the test date and today, above the grammar pointer. On mobile the plan still comes first after the hero.

### 8.3 Reading and writing drill session

Full-screen focus mode. No navigation chrome. Elements:

- Progress rail at top: dots for each item, current one enlarged, answered ones filled, no colour given away until the end of the set.
- Timer optional and off by default in drill mode, always on in exam mode.
- The passage or sentence, set in a comfortable reading measure (66 characters), in a serif face for passages to signal "document" rather than "app chrome".
- For blank-completion items: the blank rendered as an underlined gap that fills with the chosen option on selection, so the user reads the completed sentence before confirming.
- Four options as full-width tappable rows with generous hit targets. Keyboard: 1 to 4 to select, Enter to confirm, arrow keys to move.
- Confirm is a separate action from select. Prevents mis-taps and lets us capture hesitation time.

**Feedback state.** On confirm, the chosen row animates to correct or incorrect. Then a panel slides up containing: the correct answer, one sentence on why it is correct, and one sentence on why the chosen distractor is tempting and wrong. Every distractor in the bank carries its own rationale. This is the single highest-value piece of content in the product and the item schema makes it mandatory.

Below the rationale, a "Why this matters at level C" line tying the item to a named sub-skill (for example "connectors of concession", "register shift in formal correspondence").

### 8.4 Mock exam runner

Deliberately colder than drill mode. Muted palette, no mascot, no animation, no per-item feedback. Item navigator drawer so users can flag and return, matching the real online testing experience. A visible clock that turns amber at ten minutes and red at two. On submit, a short deliberate pause and then the results screen, which is where the warmth comes back.

*Amendment, 25 September 2026 (Gate D, `progress.md` D84).* §8.4 and §8.5 are adopted as written, with
twelve rulings recorded in D84. These fill the gaps and settle the conflict between §6.3's "no pausing"
and §14's resume rule: the clock freezes and results say how many times the exam was paused. Among the
rulings: retakes are allowed and labelled, a 1.5× extra-time option exists, selecting is answering,
confidence is inferred from flags and changed answers, sub-skill results are counts, and pilot items are
never revealed.

### 8.5 Exam results

- Big band letter with the raw score and the band boundaries shown so the user can see how close they are ("38 of 50, level C starts at 38").
- Per-sub-skill bar chart, sorted by weakness.
- Near-miss analysis where it is true and useful, for example "three more correct answers would have put you in the next band", computed from the actual cut points rather than asserted.
- Every item, reviewable, with the rationale and a one-tap "add to review queue".
- Confidence calibration: where the user was sure and wrong, and unsure and right. Useful and rarely offered elsewhere.

### 8.6 Oral studio (`/practice/oral`)

The hero feature. Two modes, chosen per session, with cost shown up front. *(Decided 28 September 2026, `progress.md` D131: studio mode is deferred past 1.0, so 1.0 ships practice mode only. Studio mode below is the design for after 1.0.)* *(Reversed 29 September 2026, human, D165: both modes ship in 1.0, and studio mode is built in Phase 6 as written below.)*

**Studio mode (realtime voice).** A live spoken interview. The interface is stripped to a single centred visual: a soft animated form that responds to the examiner's voice and to the user's own input level, a phase indicator, an elapsed timer, and a large end-session control. No transcript during the session, because the real test does not give you one and reading it changes the exercise. An always-available "I did not understand, could you repeat" button that prompts the examiner naturally, because that is a legitimate exam behaviour and users should rehearse it.

**Practice mode (turn-based).** Roughly a tenth of the cost. The examiner's question appears as text and audio, the user records an answer, it is transcribed, the examiner responds. Slower and less realistic, but affordable for daily use and kinder to weaker candidates.

Session types offered:

| Type | Length | Purpose |
| --- | --- | --- |
| Warm-up | 5 min | Introductions, role, department. Low pressure, good first session. |
| Work discussion | 10 min | Describe your job, a project, a problem you solved. The bread and butter of the real test. |
| Opinion and abstract | 12 min | The C-level discriminator. Policy trade-offs, hypotheticals, "what would you have done differently". |
| Situation | 8 min | A scenario to handle: brief a colleague, decline a request, explain a delay to a client. |
| Full simulation | 22 min | All phases, exam conditions. |

**Post-session report.** This is where the value lands.

- A band estimate per criterion: comprehension, fluency, grammatical accuracy, vocabulary range, task achievement, and (opt-in, audio required) pronunciation and intelligibility. Each with the evidence quoted from the transcript.
- The three highest-leverage fixes, ranked by how much they cost the band, each with a drill attached.
- "Your five most useful missing words" from the session, added to the vocabulary queue in context.
- Transcript with the user's own utterances marked up: errors underlined with corrections on hover or tap, hesitations and fillers counted, and a words-per-minute figure.
- Audio playback with the transcript synchronised, stored locally, deletable in one tap.

### 8.7 Writing workshop (`/practice/writing/workshop`)

Optional and clearly marked as supplementary, since the real written test is multiple choice. A prompt in the register of GC work writing (a briefing note paragraph, a reply to a client, a meeting summary), a plain editor with a word target and a timer, then AI feedback structured as: register, structure, grammar and mechanics, vocabulary precision, and a rewritten model answer at the target level with the changes highlighted.

### 8.8 Review queue (`/review`)

A single stack of due items with a count, an estimated time, and a satisfying empty state. Mistakes are also browsable as a "mistake library" grouped by sub-skill, which is where a user goes the night before a test.

### 8.9 Progress (`/progress`)

Band trend over time per skill with the confidence range as a shaded region. Items answered, accuracy by sub-skill, time invested, oral sessions and minutes spoken. An honest "what this does and does not tell you" panel. Export to JSON and to a one-page PDF summary.

### 8.10 Settings: key and spend (`/settings/key`)

- Key field, masked, with a validate button that makes one cheap call and reports the result.
- Plain statement of where the key is stored and what it is used for.
- A running spend meter: estimated cost this session, this week, this month, computed locally from token and audio usage returned by the API.
- A soft self-imposed cap with a warning at 80 percent, plus a link to OpenAI's own hard usage limits, which is the real protection.
- Per-feature cost table so the user can decide what to spend on.

### 8.11 Settings: sync (`/settings/sync`)

- **One switch at the top**, on by default. Turning it off stops all outbound sync immediately, and offers to delete what is already on the server, with a confirmation that says what will be lost (progress on other devices).
- **What syncs**, as a plain two-column list. Left: attempts, review schedule, vocabulary,
  exam results, settings. Right, under the heading "never leaves this device": your API key,
  session audio, oral transcripts, writing workshop submissions. Band estimates appear in
  neither column, because they are not stored or sent at all: each device recomputes them
  from the synced attempts, which is what makes them impossible to disagree about
  (ADR 16, `architecture.md` §9.4). Amended 19 September 2026; the left column previously
  listed band estimates, contradicting the protocol that was already specified.
- **Your devices**, with a friendly label per device, last-seen time, and a remove control.
- **Add a device.** A button that shows a six character code, valid ten minutes. Enter it on the other device and the two are linked. No account, no email, no password (ADR 5). Directly beneath it, one plain sentence: if you lose every device on this list, the copy on our server goes with them, so keep an export.
- **Status line** showing last sync time, or the reason it is not syncing.
- **Danger zone:** download everything as JSON, and delete everything everywhere.

A small sync status indicator lives in the header, showing synced, syncing, offline, or off. It is quiet, and tapping it goes here.

---

## 9. Engagement mechanics

The brief is "progress without pressure" plus an exam-readiness dashboard. That resolves to the following.

**In:**

- **Streak.** Counts days with any completed session. Freezes automatically for up to two missed days per month, applied silently, surfaced afterwards as "we kept your streak". No purchase, no anxiety.
- **XP and levels.** XP for items completed, weighted by difficulty and by whether the item was a review. Levels are cosmetic and named after things a public servant will find funny (working titles: Stagiaire, Agent, Conseiller, Gestionnaire, Directeur, Sous-ministre).
- **Readiness meter.** The real progress mechanic. Moves on evidence, can move down, and says why.
- **Weekly goal ring.** Minutes practised against the chosen daily goal, seven day rolling.
- **Milestones.** First mock exam, first oral session, 1,000 items, first time the estimate crosses into C. Each gets a genuinely nice full-screen moment and a shareable card with no personal data on it.
- **Countdown.** If a test date is set, everything reorients around it, including a back-planned schedule and a taper in the final three days.

**Out:**

- Hearts, lives, or any mechanic that ends a session as punishment.
- Leagues, leaderboards, and comparison to other users.
- Loss-framed streak notifications.
- Any mechanic that would be embarrassing on a work laptop.

**Deferred to later consideration:** cohort or study-group features, which only make sense at volume and add a backend and a moderation burden.

---

## 10. Visual language

The direction is playful and obviously unofficial. Consumer-app polish, distinct from both Duolingo and Canada.ca.

### 10.1 Brand

**Name.** Working name Palier, French for a level or a landing on a staircase, and readable in English. Shortlist to check for domain availability: palier.ca, seuil.ca, niveauc.ca, monpalier.ca. Confirm no trademark conflict and no confusion with existing language schools before committing. *(Decided 25 September 2026, `progress.md` D96: the name stays Palier, and the app will live at `palier.dougkeefe.com`. The trademark and language-school check is still to do before launch.)*

**Mascot.** A parrot named Coco. Reasons: language, repetition, a bit ridiculous, and impossible to mistake for a government symbol. Deliberately avoid beavers, maple leaves, geese, and anything in red and white. Coco appears in onboarding, empty states, milestones and the oral studio idle state, and never in mock exam mode or on the results screen, where the product needs to be taken seriously.

**Tone of voice.** Direct, warm, occasionally dry. Talks to the user as a competent adult who is busy. Never cutesy about the stakes. In French, natural Canadian French, not a translation of the English.

### 10.2 Colour

A dark plum and warm amber scheme. Distinctive, professional enough for a work laptop, and nowhere near GC red or Duolingo green.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#FBF8F4` | `#17131C` | Page background |
| `--surface` | `#FFFFFF` | `#221C29` | Cards |
| `--ink` | `#1E1824` | `#F4EFEA` | Body text |
| `--ink-muted` | `#5B5266` | `#B4A9BE` | Secondary text |
| `--primary` | `#5B2C6F` | `#B388CC` | Primary actions, brand |
| `--accent` | `#E8913A` | `#F2A85B` | Highlights, streak, mascot |
| `--correct` | `#1F7A5C` | `#4FBF95` | Correct states |
| `--incorrect` | `#B23A48` | `#E8788A` | Incorrect states |
| `--info` | `#2B6CB0` | `#7FB3E8` | Information, tips |

Every foreground and background pair must clear 4.5:1 for body text and 3:1 for large text and UI components in both themes, validated in CI. Correct and incorrect are never signalled by colour alone: a check or cross glyph and a text label always accompany them.

### 10.3 Typography

- **UI and headings:** a humanist sans with good French diacritic support and a full weight range. Recommend Figtree or Outfit for headings, Inter for UI.
- **Passages and exam content:** a transitional serif at 19px with 1.65 line height, to make reading passages feel like documents. Recommend Source Serif 4, which has excellent French coverage.
- **Monospace:** only in the developer-facing parts.
- Type scale: 12, 14, 16, 19, 24, 30, 38, 48. Fluid between breakpoints for the display sizes only.
- Self-host all fonts, subset for Latin plus French accented characters, preload the two used above the fold.

### 10.4 Layout and components

- 8px spacing base, 4px allowed for tight typographic adjustments.
- Corner radius 12px on cards, 999px on pills and primary buttons, 8px on inputs.
- Elevation as two soft shadows plus a 1px border, no heavy drop shadows.
- Mobile first. The primary session experience must be excellent one-handed on a phone, because that is where the daily 15 minutes happens. Primary action within thumb reach, bottom-anchored.
- Component set to build: Button (4 variants), OptionRow, ProgressRail, BandMeter, Card, Sheet, Dialog, Toast, Tabs, Timer, StreakFlame, CostMeter, AudioVisualiser, TranscriptView, Callout, EmptyState.

### 10.5 Motion

Motion is the difference between "a quiz" and "an app people like". Keep it fast and purposeful.

- Durations 120ms for state changes, 200ms for panels, 400ms for celebration moments. Standard easing `cubic-bezier(0.2, 0, 0, 1)`.
- Signature moments: the option row settling into correct or incorrect with a small spring, the feedback panel sliding up, the band meter filling on results, the streak flame on completion, and the oral studio's voice form.
- The oral studio visual is the one place to spend real craft. A soft blob or waveform that breathes with the examiner's speech and brightens with the user's own input, rendered on canvas, with a static accessible fallback.
- Every animation respects `prefers-reduced-motion`, degrading to an instant state change with no loss of information.

---

## 11. Accessibility

WCAG 2.2 Level AA is a hard requirement, enforced in CI. Specific commitments beyond the generic checklist:

- Semantic HTML first. The drill option list is a real radio group. The timer is a live region with a polite update at one-minute intervals rather than every second.
- Full keyboard operation of every flow including the oral studio, with a documented shortcut sheet at `?`.
- Focus is never lost when a panel opens or a session advances. Focus moves to the feedback panel heading on answer, and back to the next item's first option on advance. Visible focus indicators meet 2.4.11 focus appearance.
- Target size 2.5.8: all interactive targets at least 24 by 24 CSS pixels, and in practice at least 44 by 44 for anything in a session flow.
- 3.3.7 redundant entry: never ask for the same information twice in onboarding or in a session.
- 3.2.6 consistent help: the help and contact affordance sits in the same place on every page.
- Audio content: transcripts for everything the examiner says, available after the session for studio mode and during the session for practice mode. The oral studio is unavoidably an audio task, so the app states its accessibility limits plainly and offers the text-based writing workshop and reading drills as full-value alternatives.
- Language of parts: French content inside an English interface is marked `lang="fr"` and vice versa, which also fixes screen reader pronunciation. This matters more here than in almost any other product, since the whole app mixes languages on every screen.
- Colour contrast validated by automated test on the token set, and every state has a non-colour indicator.
- Tested with VoiceOver and NVDA on the three core flows before each release.

---

## 12. Bilingual interface

Two independent axes, and conflating them is the classic mistake:

1. **Interface language.** The chrome, navigation, instructions, feedback and reports. Full parity EN and FR.
2. **Target language.** The language being practised, which appears inside items, passages and sessions.

Rules:

- Interface language is chosen at first run, defaults from `Accept-Language`, persists, and is switchable from a control in the header on every page with equal prominence given to both languages.
- Routes are locale-prefixed, `/en/...` and `/fr/...`, with `hreflang` alternates.
- Item content is stored per language and never machine-translated at runtime. A French reading item is authored in French. Its explanation exists in both EN and FR, because a B-level user needs the explanation in their first language.
- Explanations default to the interface language, with a toggle to see them in the target language for stronger users.
- No hardcoded strings. A CI check fails the build on any string literal in a component and on any key present in one locale file and missing from the other.
- Dates, numbers and time formatting use locale-aware formatting. French Canadian conventions, not French from France.
- The language toggle is labelled with the other language's own name, "Français" and "English", never a flag.

---

## 13. Content design

### 13.0 Where items come from

The bank is produced primarily by a generation pipeline rather than written by hand, because the project has generation capacity and no authoring capacity (ADR 6). Hand-authored items are equally welcome and pass through the same gates; the pipeline is the default path, not the only one.

The design consequences follow from most items being machine-drafted, and they hold regardless of the mix:

- **Quality has to be enforceable without an author reading every item.** The content factory specification describes the gates. What matters for the product is that they exist, that they are measured, and that the product is honest about them.
- **Every item carries a provenance badge** visible on request: generated, reviewed by N automated checks, and calibrated or not calibrated against real responses. One tap from any item.
- **Reporting an item is a first-class action**, not buried. A flag control sits on the feedback panel of every item, takes one tap, offers four reasons (the key looks wrong, more than one answer works, the French sounds off, the question is unclear), and files a GitHub issue with the item id. Users who report get told when the item is fixed or retired.
- **The estimate discloses what it rests on**, rather than being quietly adjusted. The
  practice trend is plain accuracy per band tag with a Wilson interval, and the readiness
  card states the item count and the window behind it. Item statistics, once they exist,
  retire bad items; they do not reweight the estimate (ADR 7). Amended 19 September 2026:
  this previously said uncalibrated items are "weighted down in the band estimate", which
  ADR 7 removed along with everything else that needed a per-item parameter nobody can
  measure at launch.
- **The about page says all of this plainly.** A largely machine-written practice bank is a reasonable thing to offer for free. Presenting it as examiner-written would not be.

### 13.1 Register

The single most important content quality. Real SLE texts sound like the federal workplace: an email about a deadline shift, a memo on a new directive, a bulletin about a system outage, an excerpt from an evaluation report. They are neutral, moderately formal, and dense with the specific connective tissue of administrative French.

The content style guide specifies:

- Canadian French, GC administrative usage, and the vocabulary of departmental life (mandat, livrable, échéancier, gouvernance, intervenants, mise en œuvre, reddition de comptes).
- No France-specific usage or slang. No anglicisms that GC style guides reject.
- No real people, real departments in a way that implies a real event, or anything that could be read as a real internal communication.
- Politically neutral, no current partisan content, no content that would age badly.
- Topics drawn from a fixed taxonomy: human resources, finance and budgets, IT and digital, service delivery, policy and legislation, health and safety, procurement, communications, project management, official languages, accessibility, environment.

### 13.2 Sub-skill taxonomy

Every item is tagged with exactly one primary sub-skill. This is what the readiness dashboard reports against and what the adaptive engine targets.

**Reading:** main idea, specific detail, inference, vocabulary in context, cohesion and reference, tone and intent, text structure, numerical and tabular detail.

**Written expression:** verb tense and mood (including subjunctive, a reliable C discriminator), agreement, prepositions and government, pronouns, connectors and discourse markers, register and formality, word choice precision, false friends and anglicisms, punctuation and mechanics, sentence structure.

**Oral:** comprehension of complex speech, fluency and hesitation, grammatical accuracy under pressure, vocabulary range and precision, discourse organisation, task achievement, pronunciation and intelligibility, interaction and repair strategies.

### 13.3 Item quality bar

An item ships only if:

- The stem is unambiguous and exactly one option is defensible.
- All distractors are plausible to a candidate at the item's target level and each has a written rationale.
- It tests the tagged sub-skill and not general knowledge.
- Its difficulty tag has been sanity-checked against the level descriptors.
- It is original.
- It has passed independent adversarial review, with disagreement resolved by discarding rather than repairing. This applies to hand-authored items too.

An item is retired automatically if calibration data shows negative discrimination, if its success rate is above 95 or below 15 percent at its target band, or if it accumulates three user reports on the same reason code.

### 13.4 Difficulty by band

- **A items:** short, concrete, high-frequency vocabulary, present and passé composé, one clause.
- **B items:** workplace topics, multi-clause sentences, common connectors, full tense range but transparent context.
- **C items:** abstract or specialized content, subjunctive and conditional, nuanced connectors (bien que, dans la mesure où, sous réserve de), register shifts, distractors that are grammatically valid but wrong in register or nuance. This is where the bank has to be genuinely good, since it is the target audience.

---

## 14. States

| State | Design |
| --- | --- |
| **No key** | Every key-gated feature shows a compact inline card explaining what it does and what it would cost, with a link to add a key. Never a modal, never a blocked page. |
| **Key invalid or out of credit** | Non-alarming banner with the actual API error in plain language and the exact fix. Session state is preserved so nothing is lost. |
| **Offline** | Drills, mock exams, review and progress all work from the cached bank. A small persistent indicator. Key-gated features are visibly unavailable. |
| **Empty review queue** | A genuine reward state. Coco asleep. "Nothing due. Come back tomorrow, or do a set anyway." |
| **First run, no data** | Readiness card shows an invitation to take the diagnostic rather than an empty chart. As built (D214): the invitation is the plan's first step, "Start here: take the diagnostic", and Where you stand says the result will appear there once it is taken. |
| **Mid-session abandonment** | Session state is checkpointed every item. Returning offers resume or discard, and mock exams resume with the clock as it was. |
| **Mic permission denied** | Clear recovery instructions per browser, and an offer to use practice mode with typed answers instead. |
| **Sync unavailable** | A quiet header indicator only. Study is never interrupted, nothing is lost, and the queue drains when the network returns. No modal, no error toast. |
| **Sync conflict** | Resolved silently. Attempts merge because they are append-only, and estimates are recomputed from the merged set. The user is never asked to choose a version. |
| **New device, pairing** | Enter the code, then a short "restoring your progress" state with the item count as it lands, followed by the readiness card already populated. |

---

## 15. Measurement

No third-party analytics. No cookies that require a banner.

- **The user's own metrics**, computed locally and synced with the rest of their progress: items answered, accuracy, time on task, session completion, streak, estimated band over time. Used by the app to drive the scheduler and shown to the user on `/progress`. This is their data, held for them.
- **Opt-in anonymous item telemetry.** A separate thing from sync, and off by default. Sends
  item id, correct or incorrect, response time, and a coarse bucket for how the rest of that
  session went, detached from any account or device identity. Amended 19 September 2026: this
  previously said "the estimated ability of whoever answered", a value ADR 7 removed. The
  bucket is what makes a point-biserial computable without one (`architecture.md` §9.2). This is what calibrates the item bank, and it matters more here than in most products because the bank is machine-authored and real response data is the main evidence that an item is any good. The case for it is made honestly on the results screen after the first mock exam, not buried in settings.
- **Why they are separate.** Sync exists to serve the user. Telemetry exists to serve the bank. Conflating them, or quietly mining synced progress for calibration, would break the promise made in settings. Synced records are never read for calibration.
- **Product health** from Vercel's own request-level data only.

---

## 16. Out of scope for v1

Spoken comprehension as a standalone tested skill (it is not separately tested), English as a second language content (data model ready, content later), study groups and social features, a mobile app wrapper, offline oral practice, teacher or manager dashboards, and any paid tier. *(Added 28 September 2026, `progress.md` D131: studio mode, the realtime half of §8.6, which follows 1.0.)* *(Removed again 29 September 2026, D165: studio mode is in 1.0.)*

---

## 17. Open questions

1. Name and domain, to be confirmed against availability and trademark.
2. Whether to seed the bank with French only at launch or hold until English mirrors exist, given the official languages optics of an EN-first bilingual tool.
3. How prominently to surface the band estimate, given that an over-confident number is the main way this product could mislead someone about an expensive, career-relevant decision. This gets sharper with a machine-authored bank, since early estimates rest on uncalibrated items.
4. Whether to offer the oral studio in practice mode only at launch, to keep first-session cost under a dollar. *(Decided 28 September 2026, `progress.md` D131: practice mode only at launch, though for the Live API's missing French voice and browser credential rather than cost.)* *(Reversed 29 September 2026, human, D165: both modes at launch. First-session cost is kept down by practice mode being the daily default and by studio mode's pre-flight estimate and 25-minute cap. Its real cost per minute is measured in Phase 6 Slice 2.)*
5. Whether to seek any informal read from the PSC before launch, or simply stay clearly independent and unaffiliated.
6. Whether to run a small closed pilot before public launch purely to calibrate the bank, given that item quality is the product's main risk and real response data is the only thing that proves it.

---

## 18. Assumptions worth tracking

Stated so that they can be checked rather than inherited. Each is a belief this product is built on, not a fact.

| # | Assumption | How it would be falsified |
| --- | --- | --- |
| P1 | Public servants preparing for the SLE will accept a practice bank that is not officially sanctioned | Low uptake, or feedback that people do not trust unofficial material for a high-stakes test |
| P2 | Enough of the audience will create an OpenAI API key to make the AI features worth building | Key setup completion rate in the low single digits |
| P3 | Accuracy per band tag is a figure users find meaningful and motivating | Users asking repeatedly "but what level am I", suggesting the band letter is what they actually want |
| P4 | A generated bank can be good enough that practice feels like the real thing | Register complaints, or item reports concentrated on quality rather than specific errors |
| P5 | Oral practice against a simulated examiner transfers to the real test | Users reporting the simulation felt nothing like the real assessment |
| P6 | People will practise without streak pressure, hearts or leagues | Retention far below comparable tools, traceable to a lack of motivation rather than content |
| P7 | Free with no revenue model is sustainable for this owner over a few years | Maintenance becoming a burden that outweighs the project's value to its owner |

---

## Sources

- [Test of reading comprehension (633 and 634)](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service/second-language-evaluation-reading/the-test.html)
- [Test of written expression (654)](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service/second-language-evaluation-writing/the-test.html)
- [Unsupervised test of written expression](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service/unsupervised-test-written-expression.html)
- [Unsupervised test of reading comprehension](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service/unsupervised-test-reading-comprehension.html)
- [Oral language assessment: about the test](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service/oral-language-assessment-sle/about-the-test.html)
- [Oral language assessment: preparing for the test](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service/oral-language-assessment-sle/preparing-for-the-test.html)
- [Second Language Evaluation: Oral Language Assessment (managers)](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service/managers/oral-language-assessment-sle.html)
- [Self-assessment tests](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service/self-assessment-tests.html)
- [Second language evaluation in the federal public service](https://www.canada.ca/en/public-service-commission/services/second-language-testing-public-service.html)
