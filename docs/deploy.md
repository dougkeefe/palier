# Palier: Deploying

How to put Palier on the public internet, and keep it there. It is written for Gate C in `progress.md`:
the one Phase 2 step that needs someone who holds the accounts. The architecture behind it is ADR 11
(Next.js on Vercel) and ADR 21 (the sync backend). The record of what was actually deployed, and when,
is the session log in `progress.md`, not this file.

The app works with no database at all: drills, the diagnostic, progress and export are all local, and
the service worker makes them work offline after one load (ADR 1). The database only adds sync. So a
deployment without one is not broken. Its sync routes answer **503**, and the header quietly shows
sync as unavailable (ADR 21, `architecture.md` §11).

---

## What you need

| Thing | Why | Where it is set |
| --- | --- | --- |
| A Vercel project, root directory `apps/web` | Hosts the app (ADR 11) | Vercel dashboard |
| A serverless Postgres, e.g. Neon | The sync replica (ADR 21, `architecture.md` §9.2) | The provider's dashboard |
| `DATABASE_URL` | The pooled connection string. postgres.js runs with `prepare: false`, so a pooler is fine | Vercel → Settings → Environment Variables, **Production only** |
| `RATE_LIMIT_SALT` | 32 random bytes as hex (`openssl rand -hex 32`). It keys the per-IP rate-limit HMAC. Without it each serverless instance picks its own salt, and the limits stop holding across instances. **A production deployment with `DATABASE_URL` and no salt now fails at its migrate step** (`progress.md` D137), before any migration runs | Vercel, Production (and Preview, if a preview ever gets a database) |
| `TELEMETRY_DATABASE_URL` | A **read-only** connection string to the same database, for the monthly item-statistics job (`progress.md` D94). It only ever runs `select … from telemetry_events`. Without it, the workflow skips with a notice | GitHub → Settings → Secrets and variables → Actions |
| `OPENAI_SMOKE_KEY` | An OpenAI key **of its own**, with a small monthly limit, for the nightly live smoke (`progress.md` D112). Each run spends about US$0.15, so about US$4.50 a month at one run a night. Without it, the job skips with a notice | GitHub → Settings → Secrets and variables → Actions |
| `RETENTION_DATABASE_URL` | A connection string for a role that **can delete** from `accounts`, `sync_documents`, `pair_codes` and `rate_limits`, and can read the database's size, for the daily retention job (`progress.md` D138). Without it, the workflow skips with a notice | GitHub → Settings → Secrets and variables → Actions |
| `PLAN_STORAGE_MB` | The database plan's storage in MiB (Neon's free tier: `512`), which the retention job's storage alert reads (D139). A **variable**, not a secret. Without it, the job still deletes and says it checked no alert | GitHub → Settings → Secrets and variables → Actions → Variables |

**Keep `DATABASE_URL` out of Preview.** A preview then runs exactly like a deployment without a
database: fully usable, with sync answering 503. The build's migration step also refuses to run for
a preview (`src/server/migrate.ts`), so a misconfigured preview still cannot change the production
schema.

---

## What a deployment does

`apps/web/vercel.json` sets the build command:

1. `pnpm turbo run build --filter=@palier/web` builds every workspace package the app needs, copies the
   committed bank into `public/`, compiles the service worker, and runs `next build`.
2. `pnpm --filter @palier/web db:migrate` applies `apps/web/drizzle/` to `DATABASE_URL`, but only when
   `VERCEL_ENV` is `production`. Drizzle records what it has run, so a deploy with no new migration
   does nothing. A failed migration fails the deploy, and the previous deployment stays live.

Migrations run **before the new deployment takes traffic, while the old one still serves**. So a
migration must work for the code already running: add columns and tables, do not rename or drop them
in the same release.

To migrate by hand, for example to check a new database before the first deploy:

```
DATABASE_URL='postgres://…' pnpm --filter @palier/web db:migrate
```

---

## First deploy

1. **Database.** Create the Postgres project (Neon: one project, default branch). Copy its **pooled**
   connection string.
2. **Vercel project.** Import the repository, set the root directory to `apps/web`, and leave the
   framework as Next.js. The build command comes from `vercel.json`.
3. **Environment.** Add `DATABASE_URL` (Production) and `RATE_LIMIT_SALT` (Production), as in the
   table above. Paste them in the dashboard. They never belong in the repository, and never in a
   message to anyone.
4. **Deploy** `main` to production.
5. **Smoke-check it** (next section).

**Things the first deploy taught (24 September 2026):**
- **A project's first deployment is assigned to production**, even from the CLI without `--prod`. So it runs
  with `VERCEL_ENV=production` and applies the migrations. Deploy only reviewed code first.
- **Some Vercel CLI commands write into the working tree.** `vercel link` and `vercel integration add`
  run an env pull into `.env.local` unless given `--no-env-pull`, and in this repository `.env.local` can
  be a symlink to another checkout. `vercel integration add neon` also installs vendor agent skills
  (`.agents/`, `.claude/`, `skills-lock.json`). Remove them; they are not project files.
- **The Neon integration injects about 15 variables** (`DATABASE_URL`, `POSTGRES_*`, `PG*`, `NEON_*`). The app
  reads only `DATABASE_URL`. Turbo's build warns that the others are not in `turbo.json`, which is harmless,
  because nothing reads them at build time.
- `apps/web` pins `"engines": { "node": "22.x" }`. A `>=` range makes Vercel pick the newest major and
  warn that it will auto-upgrade.

## Smoke checks

Run these after every production deploy that touches the server or the schema:

| Check | Expect | If not |
| --- | --- | --- |
| `curl -sI https://<host>/en` | `200`, plus `strict-transport-security`, `x-content-type-options: nosniff`, `referrer-policy: no-referrer` | The build or the headers config (`next.config.ts`) |
| `curl -s -o /dev/null -w '%{http_code}' https://<host>/api/sync` | **`401`**: a database is configured and asked for a bearer | **`503`** means no `DATABASE_URL` in Production; **`500`** means the database is unreachable or unmigrated |
| `curl -s -o /dev/null -w '%{http_code}' -X POST -d '{"events":[]}' https://<host>/api/telemetry` | **`400`**: a database is configured, and an empty batch is refused before it is touched. Do not post a real event: it would enter the item statistics | **`503`** means no `DATABASE_URL`. The table itself (migration `0001`) is proved by the deploy's migration step and by the first scheduled job |
| `curl -sI https://<host>/sw.js` | `200`, `cache-control: no-cache, no-store, must-revalidate` | `next.config.ts` |
| Two browsers: onboard on one, finish a session, then Settings → Sync → add a device, and enter the code on the other | Both show the same progress | The session log's journey-8 notes |
| Delete everything everywhere on the test account (Settings → Sync → danger zone) | Leaves nothing on the server | — |
| `curl -s https://<host>/api/health` | **`200`** with `{"build":"<7 hex>","bank":3,"database":"ok"}`, and `cache-control: no-store` (D140) | **`"not-configured"`** means no `DATABASE_URL`; **`503`** with `"unreachable"` means the database did not answer; a `"build"` of `"local"` means the build did not see `VERCEL_GIT_COMMIT_SHA` |

## The monthly item-statistics job

`.github/workflows/item-statistics.yml` runs at 06:00 UTC on the 1st of each month, and on demand. It reads
every telemetry event over `TELEMETRY_DATABASE_URL`, judges each item against the profile's retirement
rules, writes `content/factory/item-statistics.json`, and opens it as a pull request on
`item-statistics/<yyyy-mm>`. Nothing retires until that pull request is merged and the next bank version
is built.

Two one-time settings, both human steps:
- Add the `TELEMETRY_DATABASE_URL` secret. Neon: create a role with `grant select on telemetry_events`,
  and use its pooled connection string.
- GitHub → Settings → Actions → General → **Allow GitHub Actions to create and approve pull requests**.
  A pull request opened with the workflow's token does not start other workflows, so run the checks on
  it by hand (or push an empty commit) before merging.

To run it by hand: `DATABASE_URL='postgres://…' pnpm --filter @palier/web item-statistics`, after
`pnpm exec turbo run build --filter=@palier/web^...`.

## The retention job

`.github/workflows/retention.yml` runs at 05:00 UTC daily, and on demand (`progress.md` D138, D139). Over
`RETENTION_DATABASE_URL` it deletes, in order:
- accounts with no activity for 180 days. A push stamps activity on the account, and any authenticated request
  stamps it on the device, so an account with an unrevoked device seen since then is kept. The account's
  devices, documents and pair codes go with it, by cascade;
- tombstones (`sync_documents.deleted`) written over 90 days ago. Nothing writes one yet;
- expired pair codes, and rate-limit rows from windows over a day old.

Then it reads `pg_database_size` against `PLAN_STORAGE_MB`. **The run fails at 60% of the plan or over**, and a
failed scheduled run is what notifies. Its log and step summary say which threshold was crossed.

One-time settings, both human steps:
- Add the `RETENTION_DATABASE_URL` secret. Neon: a role with `grant select, delete on accounts, sync_documents,
  pair_codes, rate_limits` and `grant select on devices` (the cascade deletes devices as the table's owner).
  Use its pooled connection string.
- Add the `PLAN_STORAGE_MB` variable.

**Before the first scheduled run, run it by hand as a dry run.** Actions → retention → Run workflow, with *dry
run* ticked, which is the default. It counts what it would remove and deletes nothing. A scheduled run deletes.
By hand from a terminal: `DATABASE_URL='postgres://…' PLAN_STORAGE_MB=512 pnpm --filter @palier/web retention
--dry-run`. No build is needed.

**At 60%: aggregate** (architecture.md §9.4). This is a runbook step, not built, until the alert first fires:
1. Export a backup of the database (Neon: a branch).
2. Keep each account's attempt documents of the last 180 days as they are, and replace older ones with monthly
   aggregates. A device keeps its own full history regardless (§9.4). A device paired afterwards would pull only
   the aggregates, so first decide how the trend reads them. Write the aggregation as a script with a PGlite test,
   and record it as a deviation.
3. Rerun the job and confirm the size fell.

**At 80%: move to a paid tier** (about US$20 a month, §9.4), and raise `PLAN_STORAGE_MB` to match.

## Gate G: the billing check

Phase 4's third exit criterion is that the spend meter matches OpenAI's billing within a few percent on a
test account (`progress.md` D97, D103). It is a human step, because it spends real money on a funded key.

1. On OpenAI, make a test key of its own, on an account with credit and a low monthly limit. Note the time.
2. Build the packages, then run the check:
   ```
   pnpm exec turbo run build --filter=@palier/web^...
   OPENAI_API_KEY='sk-…' pnpm --filter @palier/web billing-check
   ```
   It makes three `reviewItem` calls and two `generateItems` calls through the real adapter, priced from
   `apps/web/src/lib/pricing.json`, into a cost ledger. It prints each call's tokens and cost, the totals,
   **what the meter says**, and the UTC window. It never prints the key. Expect a few cents.
3. Wait for OpenAI's usage page to catch up (it can lag), then read that key's usage for the window: tokens
   and dollars.
4. Compare.
   - **The tokens should match exactly.** A token mismatch is a defect in the adapter's usage capture.
   - **The dollars should match within a few percent.** A dollar mismatch with matching tokens means
     `pricing.json`'s rates are wrong. Correct them from OpenAI's pricing page, together with
     `apps/factory/config/pricing.json`, which a test holds equal. Then run the check again.
5. Record the two figures, the models and the date in a session-log entry. That ticks Phase 4's exit
   criterion 3. Revoke the test key afterwards.

## The nightly live smoke, and re-recording the conformance fixtures

The `live-smoke` job in `.github/workflows/nightly.yml` runs `pnpm --filter @palier/web live-smoke` on the
`OPENAI_SMOKE_KEY` secret (`progress.md` D112). It makes one key check, three set drafts, five reviews,
two writing assessments, the oral turn loop's calls (D117): one question voiced by `tts-1`, that same
audio transcribed by `gpt-transcribe`, and two examiner turns, and one fixed session's report (D122), through the
real adapter. It writes the measured tokens and the `pricing.json`
`features` block to the run's summary. A failed call, or a model in `apps/web/src/lib/ai-models.json` that
OpenAI no longer lists, fails the job and opens an issue. It never prints the key.

1. On OpenAI, make a key of its own with a monthly limit of **US$10**. A month of nightly runs is about US$4.50, and
   the headroom covers runs by hand and a prompt that starts retrying. A limit hit near month end fails every call
   with a 429 and opens a misleading issue each night.
2. Add it as the `OPENAI_SMOKE_KEY` Actions secret, then run the nightly workflow by hand once.

**Re-record the fixtures** when a prompt changes (bump `PROMPT_VERSION` in
`packages/adapters/src/openai/prompts.ts` first), or when a model id changes. From your own terminal, so the
key never lands in a transcript or your shell history:

```
pnpm exec turbo run build --filter=@palier/web^... --filter=@palier/factory
read -rs OPENAI_API_KEY && export OPENAI_API_KEY     # paste the key; nothing is echoed
LIVE_SMOKE_RECORD=1 node apps/web/scripts/live-smoke.mjs
unset OPENAI_API_KEY
node apps/factory/dist/index.js eval                 # the eval report carries the new conformance rate
```

It overwrites `packages/testing/src/recorded/openai/{generateItems,reviewItem,assessWriting,examinerTurn,transcribe,speak,assessOral}.json`.
`assessOral.json` was first recorded on 28 September 2026 and is in `RECORDED_RUNS` and the replay test's method set
(`progress.md` D128).
No audio is ever written: a transcription is recorded with its clip described by type and size, and a voice by
its content type and size (D117). To keep an
old run as a before-and-after, rename it first, as `reviewItem-prompt-v3.json` was, and add it to
`packages/testing/src/recorded/index.ts`. Commit the fixtures with the regenerated
`content/factory/eval-report.json`, which `committed-eval.test.ts` holds equal to a fresh run. If the counts
moved, copy the printed `writing-feedback` and `item-generation` entries into `apps/web/src/lib/pricing.json`.
**Replace only those two**: the block carries neither `oral-practice` nor `oral-assessment`. The smoke prints its
report's tokens on a line of their own, labelled not to copy, because its session is short. Both are priced from a real
10-minute session instead (below).

## The oral scorer's stability, and a measured session's cost

Phase 5's exit criteria 2 and 4 (`progress.md` D125, D126). Both are run by you, on a funded key, from your own
terminal and browser.

**The stability recording** scores one fixed session five times, about five report calls, a few cents. The session is
`STABILITY_SESSION` in `apps/web/src/lib/live-smoke.ts`: about five minutes, eight spoken answers, synthetic
(`progress.md` D127). A report the adapter refuses twice is recorded and counted as a failed run rather than stopping the
recording; any other failure (a refused key, no connection) writes nothing:

```
pnpm exec turbo run build --filter=@palier/web^... --filter=@palier/factory
read -rs OPENAI_API_KEY && export OPENAI_API_KEY     # paste the key; nothing is echoed
pnpm --filter @palier/web oral-stability
unset OPENAI_API_KEY
node apps/factory/dist/index.js eval                 # prints the stability beside the conformance rate
```

It overwrites `packages/testing/src/recorded/openai/assessOral-stability.json`, which is already in `RECORDED_RUNS`
(first recorded 28 September 2026, `progress.md` D128). Commit it with the regenerated
`content/factory/eval-report.json`. The eval passes a criterion whose band moves
at most one level across the five reports, with four in five agreeing (`apps/factory/src/eval/oral-stability.ts`).
A failure is a prompt to fix, not a threshold to move.

**A measured 10-minute session**: on the production site, with the key, run a 10-minute work discussion with
spoken answers, then ask for its report. The report shows the session's cost from its own ledger rows. Compare it
with OpenAI's usage page for the window, as the billing check does above. Then update `pricing.json`: the
`oral-practice` minute is the session's own calls divided by its minutes, per role, and `oral-assessment` is its
report's tokens.

To read the session's figures, paste this into the browser's console **on the production site**, after the report
has arrived. It only reads. It prints counts, no transcript text and no key, so its output is safe to share:

```js
(async () => {
  const db = await new Promise((ok, no) => { const r = indexedDB.open("palier"); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  const all = (t) => new Promise((ok, no) => { const r = db.transaction(t).objectStore(t).getAll(); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  const [sessions, ledger] = await Promise.all([all("oralSessions"), all("costLedger")]);
  db.close();
  const s = sessions.filter((x) => x.endedAt && x.assessment).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  if (!s) return console.log("No ended session with a report on this device yet.");
  const rows = ledger.filter((r) => r.sessionId === s.id);
  const by = {};
  for (const r of rows) {
    const b = (by[`${r.feature} · ${r.model}`] ??= { calls: 0, inputTokens: 0, outputTokens: 0, usd: 0, unpriced: 0 });
    b.calls++; b.inputTokens += r.inputTokens; b.outputTokens += r.outputTokens;
    if (r.costUsd === null) b.unpriced++; else b.usd += r.costUsd;
  }
  const spoken = s.turns.filter((t) => t.speaker === "candidate" && t.input === "voice");
  console.log(JSON.stringify({
    window: { from: rows[0]?.ts, to: rows.at(-1)?.ts },
    minutes: (Date.parse(s.endedAt) - Date.parse(s.startedAt)) / 60000,
    endReason: s.endReason,
    examinerTurns: s.turns.filter((t) => t.speaker === "examiner").length,
    examinerChars: s.turns.filter((t) => t.speaker === "examiner").reduce((n, t) => n + t.text.length, 0),
    spokenAnswers: spoken.length,
    spokenMinutes: spoken.reduce((n, t) => n + (t.endMs - t.startMs), 0) / 60000,
    byFeatureModel: by,
  }, null, 2));
})();
```

The ledger keeps dollars and tokens, not an audio call's characters or seconds (D101), so tts-1's characters are its
cost ÷ US$15 per million, and gpt-transcribe's minutes its cost ÷ US$0.0045. `examinerChars` and `spokenMinutes`
cross-check them.

## Rolling back

Vercel → Deployments → pick the previous production deployment → **Promote**. The schema does not roll
back. That is why migrations have to be backward-compatible, as described above. To take sync offline
without redeploying, remove `DATABASE_URL` from Production and redeploy: the app keeps working
offline-first, and sync answers 503.

## The strict CSP (Phase 7 Slice 1)

Every page carries a `Content-Security-Policy` with a fresh nonce and Trusted Types enforced
(`apps/web/src/lib/csp.ts`, ADR 22, `progress.md` D133–D134). So **every page renders per request**:
it is a function invocation on Vercel, not a static file on the CDN, and it answers
`Cache-Control: private, no-store`. The bank, the chunks and `sw.js` are still static. After a deploy:

1. Open `/en/home` with the browser's console open. There must be no "Content Security Policy" or
   "Trusted Types" message, and the page must work (the plan and the buttons appear).
2. `curl -sI https://palier-virid.vercel.app/en | grep -i content-security-policy` shows the header,
   with `'nonce-…'`, `require-trusted-types-for 'script'` and `connect-src 'self' https://api.openai.com`.
   Two requests show two different nonces.

A console message on a real page means the policy is wrong for the app: roll back (above) and add the
page to `e2e/csp-production.spec.ts`, which holds every page to zero.

## Not yet built

- The 60% aggregation itself, which is a runbook step (above) until the storage alert first fires.
- The maintainer CI job that refreshes `pricing.json` from OpenAI's prices (`architecture.md` §8.6; Phase 7, `progress.md` D103).
