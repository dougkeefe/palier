# Palier: the manual realtime checklist

Studio mode's live conversation cannot be meaningfully mocked end to end (architecture.md §14). The hermetic journey
runs the real transport over a stubbed `RTCPeerConnection` (`progress.md` D188), and `studio-selfhost-production.spec.ts`
runs the self-hosted popup on the production build (D192). Neither proves that real WebRTC, a real microphone and a real
speaker behave on a real browser. This checklist does. It is run **before each release that touches studio mode**, and
first at **Gate O**, on the six pairs below. It is Phase 6's exit criterion 3.

Written 2 October 2026, Phase 6 Slice 3 (D194). It covers architecture.md §14's four headings (microphone permission,
phase transitions, disconnection recovery and cost accounting) and the rest of Phase 6's exit criteria.

## Before you start

- **The deployment.** Run it on production (`https://palier-virid.vercel.app`) after the release is promoted, or on a
  preview you have logged in to. `curl -s https://palier-virid.vercel.app/api/health` names the build you are testing.
- **A key with a hard monthly limit**, as onboarding recommends. A full run of this list is about 20 conversation
  minutes over six pairs, so about US$1.10 at D167's estimate of about US$0.055 a minute.
- **A quiet room and headphones** for the first pass on each pair; one pass on the laptop's own speakers (step 4).
- **For the self-hosted pass (section 7):** an endpoint deployed from `selfhost/` on your own Cloudflare or Vercel
  account, with `ALLOWED_ORIGIN` set to the deployment you are testing (`selfhost/README.md`).
- Write each result in the table at the end, then copy it into a `progress.md` session-log entry.

## The six pairs

| Pair | Browser | Platform |
| --- | --- | --- |
| 1 | Chrome, current | macOS or Windows desktop |
| 2 | Safari, current | macOS desktop |
| 3 | Firefox, current | macOS or Windows desktop |
| 4 | Chrome, current | Android phone |
| 5 | Safari | iPhone (iOS current) |
| 6 | Firefox, current | Android phone |

Every pair runs sections 1 to 6. Section 7, the self-hosted escape, runs on pairs 1, 2, 3 and 5 at least: one per engine,
plus iOS, whose popups open as tabs.

## 1. Microphone permission

Settings → **Your key**: a key is saved. Spoken practice → **Studio mode** → any session → **Choose**.

- [ ] **First ask.** **Check my microphone** brings up the browser's own prompt. Allow it. The level meter moves when you
      speak, and "Palier can hear you." appears.
- [ ] **Refused.** In the site's settings, block the microphone, reload, and check again. The screen says why in plain
      words, names this browser's way to allow it again, and offers **Practise by typing instead**. Choosing it prices and
      runs a practice session, never a studio one.
- [ ] **Allowed again** in the site's settings, reload: the check passes without leaving the page.
- [ ] **No microphone** (desktop only: unplug or disable the input device). The screen says there is none and offers typing.

## 2. Establishing the call (exit criterion 1)

Allowed microphone → **Continue** → the pre-flight shows the estimate for the session's minutes and says where the key
goes ("Starting sends your key once to Palier's server…").

- [ ] **Start the session.** Time it by ear from the tap to the examiner's first word: under 2.5 s. (D190 measured a
      median of about 2.12 s on the deployed site, over a home connection.) Write down the figure.
- [ ] The heading reads "The conversation", the status line says the conversation is on, and the voice form moves with
      the examiner's voice and, separately, with yours.
- [ ] **iOS and Safari:** the examiner's voice plays without a second tap (the tap on Start is the gesture).
- [ ] **No live transcript** is shown at any point during the session (PRD §8.6).

## 3. The conversation, and phase transitions

- [ ] **The examiner speaks French at C level**, in `cedar`'s voice (Gate N, D174), and greets you in the first phase.
- [ ] **It waits for you.** Pause mid-sentence for two or three seconds, as a candidate searching for a word does. It
      does not cut in (D175). A pause before it answers is noticeable and acceptable (D191).
- [ ] **It listens.** Contradict a question's premise ("Je n'ai jamais géré de projet"). The next question follows from
      what you said, not from its list (D176).
- [ ] **"I did not understand, could you repeat"** repeats or rephrases the last question once, without comment. Pressed
      while the examiner is speaking, it waits for the examiner to finish (D180). It is disabled until the call is open.
- [ ] **The phase moves on by time.** The phase indicator and the timer advance at the scenario's phase boundaries, and
      the examiner makes a natural transition into the next part. Stay for at least one boundary (a warm-up's first
      phase is three minutes).
- [ ] **Reduced motion.** With the system's reduce-motion setting on, the voice form is still and the status line still
      says what is happening (D184).
- [ ] **End the session** (the large control). The end card appears, its heading takes focus, the transcript is complete,
      and "See the report on this session" opens the report.

## 4. Audio quality

- [ ] **On the device's own speakers**, without headphones, the examiner does not hear itself and answer its own voice
      (echo cancellation). Hold at least two exchanges this way.
- [ ] **The recording.** On the report, the recording plays your microphone only, for the whole conversation, and each
      **Play from here** starts at your answer, not a moment into it (D183, D187).

## 5. Disconnection recovery (exit criterion 2)

Start a new studio session and hold one exchange.

- [ ] **One drop recovers.** Turn the network off (Wi-Fi off, or airplane mode on a phone) for about ten seconds, then on.
      The call reconnects: the examiner picks up from where the conversation was, without repeating its greeting, and the
      timer carries on. (The redial asks for a fresh pass, so the key goes to the route once more, or to your own endpoint.)
- [ ] **A second drop fails cleanly.** Do it again in the same session. The session ends on the end card with a sentence
      that the connection failed, and **every turn said before the drop is in the transcript**. The report can still be
      asked for.
- [ ] **Leaving mid-dial.** Start a session and press **End the session**, or go back, before the examiner's first word.
      The dial is cancelled, the microphone indicator goes off, and no failure is named (D185).
- [ ] **Closing the tab mid-session**, then opening Spoken practice again: the session is listed as over and can be
      reported on (D144).

## 6. Cost accounting

- [ ] **The meter** reads "Nothing counted yet" before the first response, then "About US$… so far", rising as the
      conversation goes on. "At least" appears only if a call could not be priced (D182).
- [ ] **The report's cost** shows the conversation as its own line, and the report's own call separately.
- [ ] **Settings → Your key → spend:** the month's total moved by about what the report says.
- [ ] **OpenAI's usage page**, the next day: the day's realtime spend is within a few cents of what Palier showed for the
      sessions (D167's estimate stays until a measured minute replaces it, D191).
- [ ] **The 25-minute cap** (`pricing.json`'s `studioMaxMinutes`) is run once per release on one pair only: a session left
      running ends at 25 minutes with its own sentence (`time-cap`, D166).

## 7. The self-hosted escape (exit criterion 5)

Settings → **Your key** → **The one exception: studio mode** → enter your endpoint's address → **Use this endpoint**. The
line above the field names it.

- [ ] **The copy changes with it.** The picker's studio callout and the pre-flight say the key goes to your own endpoint
      and never reaches Palier's server.
- [ ] **Start the session.** A small window (a new tab on iOS) opens at your endpoint, says it is waiting for Palier, then
      closes itself, and the conversation starts. If the browser asked whether to allow a popup, allow it for Palier's
      address and start again; that ask is expected the first time.
- [ ] **The route saw nothing.** In Vercel's logs for the deployment, filter **Request Path** to `/api/realtime/secret`
      (`docs/deploy.md`): no request from this session. Your endpoint's own logs show one `GET` and one `POST`.
- [ ] **Blocked popup.** Block popups for Palier's address and start again: the session ends at once with "Your own
      endpoint gave no pass", and nothing is dialled.
- [ ] **Wrong origin.** Set your endpoint's `ALLOWED_ORIGIN` to another address and start again: after at most 30 seconds
      the same sentence. Opening the endpoint's address directly shows its page and nothing else happens.
- [ ] **On each platform you deployed**, the mint is accepted: a `forbidden-origin` refusal there means the platform's
      `request.url` does not carry its public address, and the endpoint must be fixed before Gate O passes. An address
      that redirects to another origin is expected to fail; the README says to enter the final one.
- [ ] **Back to Palier's server.** **Use Palier's server again** forgets the address; the copy returns to naming the route.
- [ ] **A drop on the self-hosted path** (section 5's first step) either reconnects or, if the browser blocks the redial's
      popup, ends cleanly with every turn kept. Write down which.

## 8. The reads Gate O also asks for

- [ ] **The route, line by line**: `apps/web/src/server/realtime-handlers.ts` and `realtime.ts`, and the adapter it calls,
      `packages/adapters/src/openai/realtime-secrets.ts`. Nothing reads the body, logs, stores or echoes the key.
- [ ] **The self-hosted files, line by line**: `selfhost/cloudflare-worker.mjs` (the Vercel function's shared code is
      identical, by test).
- [ ] **The French of the new copy**: the `oral` namespace's studio keys (`studioMode`, `studioModeOwn`, `sendsToStudio`,
      `sendsToStudioOwn`, `failEndpoint`, the studio view's), the `key` namespace's `realtime*` keys, `privacy.third`, and
      the endpoint page's two lines in `selfhost/`.
- [ ] **The log check** in `docs/deploy.md`'s "The realtime secret route and the logs", on the deployment.

## Results

Copy this table into the session log, one row per pair. Write the dial in seconds, and a note for anything not a plain pass.

| Pair | Build | 1 Mic | 2 Dial (s) | 3 Conversation | 4 Audio | 5 Drops | 6 Cost | 7 Self-hosted | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 Chrome desktop | | | | | | | | | |
| 2 Safari desktop | | | | | | | | | |
| 3 Firefox desktop | | | | | | | | | |
| 4 Chrome Android | | | | | | | | — | |
| 5 Safari iPhone | | | | | | | | | |
| 6 Firefox Android | | | | | | | | — | |

A failure on any pair is a defect to fix before Gate O passes, or a limitation the human accepts in writing, recorded as a
deviation with its *revisit when*.
