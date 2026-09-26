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
| `RATE_LIMIT_SALT` | 32 random bytes as hex (`openssl rand -hex 32`). It keys the per-IP rate-limit HMAC. Without it each serverless instance picks its own salt, and the limits stop holding across instances | Vercel, Production (and Preview, if a preview ever gets a database) |

| `TELEMETRY_DATABASE_URL` | A **read-only** connection string to the same database, for the monthly item-statistics job (`progress.md` D94). It only ever runs `select … from telemetry_events`. Without it, the workflow skips with a notice | GitHub → Settings → Secrets and variables → Actions |

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

## Rolling back

Vercel → Deployments → pick the previous production deployment → **Promote**. The schema does not roll
back. That is why migrations have to be backward-compatible, as described above. To take sync offline
without redeploying, remove `DATABASE_URL` from Production and redeploy: the app keeps working
offline-first, and sync answers 503.

## Not yet built

- The 90-day tombstone purge and the 180-day inactive-account deletion (`architecture.md` §9.4, §12).
  Nothing creates a tombstone yet, and no account can be 180 days old, so these are Phase 7's
  scheduled jobs (`progress.md` D78).
- A strict Content-Security-Policy with nonces, and the tier-11 check on the built output (Phase 7).
