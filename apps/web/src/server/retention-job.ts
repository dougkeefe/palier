/**
 * The daily retention job (architecture.md §9.4 and §12, progress.md D78 and D138): delete
 * what the privacy notice says is deleted, when it says so, and read the database's size
 * against the plan's storage.
 *
 * - **Inactive accounts**: no activity for 180 days. The account row goes, and the foreign
 *   keys' cascade takes its devices, documents and pair codes with it. "Activity" is a
 *   push, which stamps `accounts.last_active_at`, **or any authenticated request**, which
 *   stamps the device's `last_seen_at`. A device that only pulls is still in use, so an
 *   account with an unrevoked device seen since the cutoff is kept (D138).
 * - **Tombstones**: a deleted document is hard-deleted 90 days after it was written. Nothing
 *   writes a tombstone yet (D69), so today this rule removes nothing; it is here so the
 *   first feature that deletes a single record inherits the purge (D138).
 * - **Housekeeping**: expired pair codes, and rate-limit rows from windows over a day old.
 *   Neither means anything once past, and without the purge the storage alert would one
 *   day fire on rows that mean nothing (D139).
 * - **Storage**: the database's size against the plan's. At 60% the runbook's aggregation
 *   step is due, and at 80% the move to a paid tier (§9.4). The plan's size is the
 *   workflow's input, never a number in code (D139).
 *
 * The boundary is strict: a row older than its cutoff goes, and a row exactly at it stays.
 *
 * **Self-contained on purpose**, like `item-statistics-job.ts`: no relative import, and
 * `postgres` imported dynamically, so `scripts/retention.mjs` runs it under Node's type
 * stripping with no build. The statements are raw, parameterised SQL, so the script on
 * postgres.js and the integration test on PGlite run exactly the same text.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** architecture.md §9.4: "accounts with no activity for 180 days are deleted". */
export const INACTIVE_ACCOUNT_DAYS = 180;
/** architecture.md §9.4: "Deletions: tombstone for 90 days, then hard delete". */
export const TOMBSTONE_DAYS = 90;
/** architecture.md §9.4's capacity triggers, as fractions of the plan's storage. */
export const STORAGE_AGGREGATE_AT = 0.6;
export const STORAGE_UPGRADE_AT = 0.8;
/** The plan's storage is given in MiB, as hosting plans state it (Neon's free tier is 512). */
const MIB = 1024 * 1024;

export type RetentionCutoffs = {
  readonly inactiveBefore: string;
  readonly tombstonesBefore: string;
  readonly pairCodesBefore: string;
  readonly rateLimitsBefore: string;
};

/** Each rule's cutoff, as of one instant. Pure. */
export const retentionCutoffs = (now: Date): RetentionCutoffs => {
  const before = (days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();
  return {
    inactiveBefore: before(INACTIVE_ACCOUNT_DAYS),
    tombstonesBefore: before(TOMBSTONE_DAYS),
    pairCodesBefore: now.toISOString(),
    // Every rate-limit window is an hour or shorter (handlers.ts), so a day is ample.
    rateLimitsBefore: before(1),
  };
};

export type StorageVerdict = "ok" | "aggregate" | "upgrade";

/** The size against the plan: `aggregate` from 60%, `upgrade` from 80%. Pure. */
export const storageVerdict = (usedBytes: number, planBytes: number): StorageVerdict => {
  const used = usedBytes / planBytes;
  if (used >= STORAGE_UPGRADE_AT) return "upgrade";
  if (used >= STORAGE_AGGREGATE_AT) return "aggregate";
  return "ok";
};

/**
 * `PLAN_STORAGE_MB` as bytes: `null` when it is not given, so the run skips the verdict and
 * says so. Anything else that is not a positive number throws, since a typo silently
 * disabling the alert is worse than a failed run.
 */
export const planBytesFrom = (value: string | undefined): number | null => {
  if (value === undefined || value.trim() === "") return null;
  const mib = Number(value);
  if (!Number.isFinite(mib) || mib <= 0) throw new Error(`PLAN_STORAGE_MB must be a positive number of MiB, not "${value}".`);
  return mib * MIB;
};

export type RetentionRule = "inactive-accounts" | "tombstones" | "expired-pair-codes" | "stale-rate-limits";

export type RuleSpec = {
  readonly rule: RetentionRule;
  readonly from: string;
  readonly where: string;
  readonly cutoff: keyof RetentionCutoffs;
};

/** The rules, in the order they run. `$1` is the rule's cutoff, cast once so both drivers read it alike. */
export const RETENTION_RULES: readonly RuleSpec[] = [
  {
    rule: "inactive-accounts",
    from: "accounts a",
    where:
      "a.last_active_at < $1::timestamptz and not exists (select 1 from devices d where d.account_id = a.id and d.revoked_at is null and d.last_seen_at >= $1::timestamptz)",
    cutoff: "inactiveBefore",
  },
  { rule: "tombstones", from: "sync_documents", where: "deleted and updated_at < $1::timestamptz", cutoff: "tombstonesBefore" },
  { rule: "expired-pair-codes", from: "pair_codes", where: "expires_at < $1::timestamptz", cutoff: "pairCodesBefore" },
  { rule: "stale-rate-limits", from: "rate_limits", where: "window_start < $1::timestamptz", cutoff: "rateLimitsBefore" },
];

/** A rule's statement: a count in a dry run, the delete otherwise. Each answers one row, `n`. */
export const ruleStatement = (spec: RuleSpec, dryRun: boolean): string =>
  dryRun
    ? `select count(*)::int as n from ${spec.from} where ${spec.where}`
    : `with gone as (delete from ${spec.from} where ${spec.where} returning 1) select count(*)::int as n from gone`;

export const DATABASE_SIZE_SQL = "select pg_database_size(current_database()) as bytes";

/** One parameterised query, as either driver runs it, answering its rows. */
export type Query = (text: string, params: readonly string[]) => Promise<readonly Record<string, unknown>[]>;

export type RetentionReport = {
  readonly at: string;
  readonly dryRun: boolean;
  readonly cutoffs: RetentionCutoffs;
  /** Rows deleted per rule, or, in a dry run, the rows that would be. */
  readonly removed: Readonly<Record<RetentionRule, number>>;
  readonly databaseBytes: number;
  readonly planBytes: number | null;
  /** `null` when no plan size was given. */
  readonly verdict: StorageVerdict | null;
};

export type RetentionInput = {
  readonly query: Query;
  readonly now: Date;
  readonly planBytes: number | null;
  readonly dryRun: boolean;
};

/** Run every rule in order, then read the size. The size is read last, so it is what remains. */
export const runRetention = async (input: RetentionInput): Promise<RetentionReport> => {
  const cutoffs = retentionCutoffs(input.now);
  const removed = {} as Record<RetentionRule, number>;
  for (const spec of RETENTION_RULES) {
    const [row] = await input.query(ruleStatement(spec, input.dryRun), [cutoffs[spec.cutoff]]);
    removed[spec.rule] = Number(row?.n ?? 0);
  }
  const [size] = await input.query(DATABASE_SIZE_SQL, []);
  const databaseBytes = Number(size?.bytes ?? 0);
  return {
    at: input.now.toISOString(),
    dryRun: input.dryRun,
    cutoffs,
    removed,
    databaseBytes,
    planBytes: input.planBytes,
    verdict: input.planBytes === null ? null : storageVerdict(databaseBytes, input.planBytes),
  };
};

/** Whether the run should fail, which is how it notifies: at 60% of the plan's storage or over. */
export const alertOf = (report: RetentionReport): boolean => report.verdict === "aggregate" || report.verdict === "upgrade";

const VERDICT_TEXT: Readonly<Record<StorageVerdict, string>> = {
  ok: "within the plan",
  aggregate: "at or over 60% of the plan: run the aggregation step (docs/deploy.md)",
  upgrade: "at or over 80% of the plan: move to a paid tier (docs/deploy.md)",
};

const mib = (bytes: number): string => `${(bytes / MIB).toFixed(1)} MiB`;

/** The run, in plain lines for the workflow's log. */
export const reportText = (report: RetentionReport): string => {
  const verb = report.dryRun ? "would remove" : "removed";
  const lines = [
    `retention${report.dryRun ? " (dry run)" : ""} as of ${report.at}:`,
    ...RETENTION_RULES.map((spec) => `  ${spec.rule}: ${verb} ${String(report.removed[spec.rule])} (before ${report.cutoffs[spec.cutoff]})`),
  ];
  if (report.planBytes === null || report.verdict === null) {
    lines.push(`  storage: ${mib(report.databaseBytes)}; no plan size given (PLAN_STORAGE_MB), so no alert was checked`);
  } else {
    const percent = ((report.databaseBytes / report.planBytes) * 100).toFixed(1);
    lines.push(`  storage: ${mib(report.databaseBytes)} of ${mib(report.planBytes)} (${percent}%), ${VERDICT_TEXT[report.verdict]}`);
  }
  return lines.join("\n");
};

/** The script's query, over postgres.js. The caller ends it. */
export const queryWithPostgres = async (url: string): Promise<{ readonly query: Query; readonly end: () => Promise<void> }> => {
  const { default: postgres } = await import("postgres");
  // A statement stuck behind a lock gives up after two minutes rather than hold the run.
  const sql = postgres(url, { max: 1, prepare: false, connection: { statement_timeout: 120_000 } });
  return {
    query: async (text, params) => (await sql.unsafe(text, [...params])) as unknown as Record<string, unknown>[],
    end: () => sql.end(),
  };
};
