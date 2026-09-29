import { describe, expect, it } from "vitest";

import {
  DATABASE_SIZE_SQL,
  alertOf,
  RETENTION_RULES,
  type Query,
  planBytesFrom,
  reportText,
  retentionCutoffs,
  ruleStatement,
  runRetention,
  storageVerdict,
} from "./retention-job";

const NOW = new Date("2026-09-28T06:00:00.000Z");
const MIB = 1024 * 1024;

describe("retentionCutoffs", () => {
  const cutoffs = retentionCutoffs(NOW);

  it("puts inactive accounts at exactly 180 days before now", () => {
    expect(cutoffs.inactiveBefore).toBe("2026-04-01T06:00:00.000Z");
  });

  it("puts tombstones at exactly 90 days before now", () => {
    expect(cutoffs.tombstonesBefore).toBe("2026-06-30T06:00:00.000Z");
  });

  it("purges a pair code as soon as it has expired, and a rate-limit window a day on", () => {
    expect(cutoffs.pairCodesBefore).toBe(NOW.toISOString());
    expect(cutoffs.rateLimitsBefore).toBe("2026-09-27T06:00:00.000Z");
  });
});

describe("storageVerdict", () => {
  const plan = 512 * MIB;

  it("is ok just under 60% of the plan", () => {
    expect(storageVerdict(plan * 0.5999, plan)).toBe("ok");
  });

  it("asks for the aggregation step at exactly 60%, and still just under 80%", () => {
    expect(storageVerdict(plan * 0.6, plan)).toBe("aggregate");
    expect(storageVerdict(plan * 0.7999, plan)).toBe("aggregate");
  });

  it("asks for the paid tier at exactly 80% and over", () => {
    expect(storageVerdict(plan * 0.8, plan)).toBe("upgrade");
    expect(storageVerdict(plan * 1.2, plan)).toBe("upgrade");
  });
});

describe("planBytesFrom", () => {
  it("reads no plan size as null, so the alert is skipped and said to be", () => {
    expect(planBytesFrom(undefined)).toBeNull();
    expect(planBytesFrom("  ")).toBeNull();
  });

  it("reads a size in MiB", () => {
    expect(planBytesFrom("512")).toBe(512 * MIB);
    expect(planBytesFrom("0.5")).toBe(0.5 * MIB);
  });

  it("refuses a size that is not a positive number, rather than silently disable the alert", () => {
    expect(() => planBytesFrom("half a gig")).toThrow(/positive number of MiB/);
    expect(() => planBytesFrom("0")).toThrow(/positive number/);
    expect(() => planBytesFrom("-5")).toThrow(/positive number/);
  });
});

describe("ruleStatement", () => {
  const inactive = RETENTION_RULES[0];

  it("deletes and counts in one statement", () => {
    expect(inactive && ruleStatement(inactive, false)).toMatch(/^with gone as \(delete from accounts a where .+ returning 1\) select count/);
  });

  it("only counts in a dry run, and never deletes", () => {
    const statement = inactive && ruleStatement(inactive, true);
    expect(statement).toMatch(/^select count\(\*\)::int as n from accounts a where /);
    expect(statement).not.toMatch(/delete from/);
  });

  it("keeps an account that has an unrevoked device seen since the cutoff", () => {
    expect(inactive?.where).toContain("d.revoked_at is null and d.last_seen_at >= $1::timestamptz");
  });

  it("purges only documents marked deleted", () => {
    expect(RETENTION_RULES.find((rule) => rule.rule === "tombstones")?.where).toBe("deleted and updated_at < $1::timestamptz");
  });
});

/** A query double that answers each rule with its count and the size query with `bytes`. */
const recording = (counts: readonly number[], bytes: unknown) => {
  const calls: { text: string; params: readonly string[] }[] = [];
  const query: Query = (text, params) => {
    calls.push({ text, params });
    if (text === DATABASE_SIZE_SQL) return Promise.resolve([{ bytes }]);
    return Promise.resolve([{ n: counts[calls.length - 1] }]);
  };
  return { calls, query };
};

describe("runRetention", () => {
  it("runs every rule in order with its own cutoff, then reads the size last", async () => {
    const { calls, query } = recording([2, 0, 5, 40], "1048576");
    await runRetention({ query, now: NOW, planBytes: null, dryRun: false });

    const cutoffs = retentionCutoffs(NOW);
    expect(calls.map((call) => call.params)).toEqual([
      [cutoffs.inactiveBefore],
      [cutoffs.tombstonesBefore],
      [cutoffs.pairCodesBefore],
      [cutoffs.rateLimitsBefore],
      [],
    ]);
    expect(calls.at(-1)?.text).toBe(DATABASE_SIZE_SQL);
  });

  it("reports what each rule removed and the size, reading either driver's numbers", async () => {
    const { query } = recording([2, 0, 5, 40], "1048576");
    const report = await runRetention({ query, now: NOW, planBytes: 512 * MIB, dryRun: false });

    expect(report.removed).toEqual({ "inactive-accounts": 2, tombstones: 0, "expired-pair-codes": 5, "stale-rate-limits": 40 });
    expect(report.databaseBytes).toBe(MIB);
    expect(report.verdict).toBe("ok");
  });

  it("issues no delete in a dry run", async () => {
    const { calls, query } = recording([1, 1, 1, 1], 0);
    const report = await runRetention({ query, now: NOW, planBytes: null, dryRun: true });

    expect(calls.some((call) => /delete from/.test(call.text))).toBe(false);
    expect(report.dryRun).toBe(true);
  });

  it("judges the size only when a plan size was given", async () => {
    const { query } = recording([0, 0, 0, 0], 0.85 * 512 * MIB);
    expect((await runRetention({ query, now: NOW, planBytes: null, dryRun: false })).verdict).toBeNull();
    expect((await runRetention({ query, now: NOW, planBytes: 512 * MIB, dryRun: false })).verdict).toBe("upgrade");
  });

  it("reads a rule that answers no row as nothing removed", async () => {
    const query: Query = () => Promise.resolve([]);
    const report = await runRetention({ query, now: NOW, planBytes: null, dryRun: false });
    expect(Object.values(report.removed)).toEqual([0, 0, 0, 0]);
    expect(report.databaseBytes).toBe(0);
  });
});

describe("reportText", () => {
  it("names each rule's count and cutoff, and the storage against the plan", async () => {
    const { query } = recording([2, 0, 5, 40], 0.65 * 512 * MIB);
    const text = reportText(await runRetention({ query, now: NOW, planBytes: 512 * MIB, dryRun: false }));

    expect(text).toContain("retention as of 2026-09-28T06:00:00.000Z:");
    expect(text).toContain("inactive-accounts: removed 2 (before 2026-04-01T06:00:00.000Z)");
    expect(text).toContain("storage: 332.8 MiB of 512.0 MiB (65.0%), at or over 60% of the plan: run the aggregation step");
  });

  it("says a dry run would remove, and that no alert was checked without a plan size", async () => {
    const { query } = recording([3, 0, 0, 0], MIB);
    const text = reportText(await runRetention({ query, now: NOW, planBytes: null, dryRun: true }));

    expect(text).toContain("retention (dry run)");
    expect(text).toContain("inactive-accounts: would remove 3");
    expect(text).toContain("no plan size given (PLAN_STORAGE_MB), so no alert was checked");
  });

  it("names the paid tier at 80%, and says so plainly when within the plan", async () => {
    const plan = 512 * MIB;
    const high = recording([0, 0, 0, 0], 0.9 * plan);
    const low = recording([0, 0, 0, 0], 0.1 * plan);
    expect(reportText(await runRetention({ query: high.query, now: NOW, planBytes: plan, dryRun: false }))).toContain("move to a paid tier");
    expect(reportText(await runRetention({ query: low.query, now: NOW, planBytes: plan, dryRun: false }))).toContain("within the plan");
  });
});

describe("alertOf", () => {
  it("fails the run at 60% and at 80% of the plan, and not within it or with no plan size", async () => {
    const plan = 512 * MIB;
    const at = async (bytes: number, planBytes: number | null) =>
      alertOf(await runRetention({ query: recording([0, 0, 0, 0], bytes).query, now: NOW, planBytes, dryRun: true }));

    expect(await at(0.1 * plan, plan)).toBe(false);
    expect(await at(0.6 * plan, plan)).toBe(true);
    expect(await at(0.9 * plan, plan)).toBe(true);
    expect(await at(0.9 * plan, null)).toBe(false);
  });
});
