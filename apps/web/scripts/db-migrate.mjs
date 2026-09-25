// Applies apps/web/drizzle/ to DATABASE_URL at deploy (progress.md D78). The decision —
// production deployments and people only, never a preview — is migrate.ts's, and tested
// there; this file is only the entry point. Node 22's type stripping runs the .ts
// directly, so there is no build step and no new dependency.
import { applyWithPostgres, migrateDatabase } from "../src/server/migrate.ts";

await migrateDatabase({ env: process.env, apply: applyWithPostgres, log: (line) => console.log(line) });
