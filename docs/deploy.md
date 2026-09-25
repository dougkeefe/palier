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

## Smoke checks

Run these after every production deploy that touches the server or the schema:

| Check | Expect | If not |
| --- | --- | --- |
| `curl -sI https://<host>/en` | `200`, plus `strict-transport-security`, `x-content-type-options: nosniff`, `referrer-policy: no-referrer` | The build or the headers config (`next.config.ts`) |
| `curl -s -o /dev/null -w '%{http_code}' https://<host>/api/sync` | **`401`**: a database is configured and asked for a bearer | **`503`** means no `DATABASE_URL` in Production; **`500`** means the database is unreachable or unmigrated |
| `curl -sI https://<host>/sw.js` | `200`, `cache-control: no-cache, no-store, must-revalidate` | `next.config.ts` |
| Two browsers: onboard on one, finish a session, then Settings → Sync → add a device, and enter the code on the other | Both show the same progress | The session log's journey-8 notes |
| Delete everything everywhere on the test account (Settings → Sync → danger zone) | Leaves nothing on the server | — |

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
