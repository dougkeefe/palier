import type { ExamRun, SyncRecord } from "@palier/app";
import { examAttemptId, mergeRecord, stableJson } from "@palier/app";

/**
 * What the sync simulator asserts once the network has healed and every device has
 * synced to quiescence (implementation-plan.md §6.2 tier 5): pure functions from what
 * each device holds to a list of violations, so a failing seed names every property it
 * broke rather than the first.
 */

export type Violation = {
  /** The property broken, e.g. `lost-attempt`. */
  readonly check: string;
  readonly device: string;
  readonly detail: string;
};

export type Records = ReadonlyMap<string, SyncRecord>;

/** What one device holds at quiescence. */
export type DeviceView = {
  readonly name: string;
  readonly records: Records;
  /** `AttemptStore.all().length`, which a duplicate would inflate past the unique ids. */
  readonly attemptCount: number;
  /** The practice trend for every scored skill, as stable JSON. */
  readonly trends: string;
  /** The rescored result of every submitted exam run, as stable JSON. */
  readonly examResults: string;
};

const same = (a: SyncRecord | undefined, b: SyncRecord | undefined): boolean =>
  a !== undefined && b !== undefined && stableJson(a.value) === stableJson(b.value);

/** Every attempt answered anywhere is on every device, as it was recorded. */
export const lostAttempts = (produced: readonly SyncRecord[], views: readonly DeviceView[]): Violation[] =>
  views.flatMap((view) => {
    const missing = produced.filter((p) => !same(view.records.get(`attempt:${p.id}`), p));
    return missing.length === 0
      ? []
      : [{ check: "lost-attempt", device: view.name, detail: `${String(missing.length)} missing, e.g. ${missing.slice(0, 3).map((m) => m.id).join(", ")}` }];
  });

/** No device holds an attempt twice. */
export const duplicatedAttempts = (views: readonly DeviceView[]): Violation[] =>
  views.flatMap((view) => {
    const unique = [...view.records.keys()].filter((k) => k.startsWith("attempt:")).length;
    return view.attemptCount === unique
      ? []
      : [{ check: "duplicated-attempt", device: view.name, detail: `${String(view.attemptCount)} stored, ${String(unique)} unique` }];
  });

/** Every device holds exactly what the first one holds: attempts, schedule, sessions, exam runs, settings. */
export const diverged = (views: readonly DeviceView[]): Violation[] => {
  const [first, ...rest] = views;
  if (first === undefined) return [];
  return rest.flatMap((view) => {
    const keys = new Set([...first.records.keys(), ...view.records.keys()]);
    const differing = [...keys].filter((k) => !same(first.records.get(k), view.records.get(k)));
    return differing.length === 0
      ? []
      : [{ check: "diverged", device: view.name, detail: `${String(differing.length)} records differ from ${first.name}, e.g. ${differing.slice(0, 3).join(", ")}` }];
  });
};

/** Every device computes the same practice trend from the same attempts. */
export const differingTrends = (views: readonly DeviceView[]): Violation[] => {
  const [first, ...rest] = views;
  if (first === undefined) return [];
  return rest
    .filter((view) => view.trends !== first.trends)
    .map((view) => ({ check: "trend-differs", device: view.name, detail: `trend differs from ${first.name}` }));
};

/**
 * Every schedule entry is one some device actually wrote. A merge picks between copies
 * and never blends them, so an entry no answer produced means state was invented.
 */
export const inventedSchedule = (written: ReadonlySet<string>, views: readonly DeviceView[]): Violation[] =>
  views.flatMap((view) =>
    [...view.records.values()]
      .filter((r) => r.type === "schedule" && !written.has(stableJson(r.value)))
      .map((r) => ({ check: "invented-schedule", device: view.name, detail: `schedule ${r.id} was never written` })),
  );

/**
 * Every submitted exam run has an attempt for each of its answers, on every device.
 * `submitExam` records the attempts before it stamps the run, so a submitted copy that
 * won the merge always had its attempts written somewhere. If they are missing here,
 * sync lost them (progress.md D80).
 */
export const unrecordedExamAnswers = (views: readonly DeviceView[]): Violation[] =>
  views.flatMap((view) =>
    [...view.records.values()].flatMap((record) => {
      if (record.type !== "examRun" || record.value.submittedAt === null) return [];
      const run: ExamRun = record.value;
      const missing = run.answers.filter((a) => !view.records.has(`attempt:${examAttemptId(run.id, a)}`));
      return missing.length === 0
        ? []
        : [{ check: "unrecorded-exam-answer", device: view.name, detail: `run ${run.id}: ${String(missing.length)} answers have no attempt` }];
    }),
  );

/**
 * A run submitted anywhere is submitted everywhere, with the earliest submission any
 * device made. This is judged from what the devices did (`submitted`, run id to the
 * earliest `submittedAt`), not from `mergeRecord`, so a merge rule that let an
 * in-progress copy win would be caught here even though the partition oracle, which
 * folds by that same rule, would agree with it.
 */
export const unsubmittedRuns = (submitted: ReadonlyMap<string, string>, views: readonly DeviceView[]): Violation[] =>
  views.flatMap((view) =>
    [...submitted].flatMap(([id, at]) => {
      const record = view.records.get(`examRun:${id}`);
      const got = record?.type === "examRun" ? record.value.submittedAt : undefined;
      return got === at
        ? []
        : [{ check: "unsubmitted-run", device: view.name, detail: `run ${id} submitted at ${at}, here ${String(got)}` }];
    }),
  );

/** Every device rescoring its submitted exam runs gets the same results (Phase 3 exit criterion 4). */
export const differingExamResults = (views: readonly DeviceView[]): Violation[] => {
  const [first, ...rest] = views;
  if (first === undefined) return [];
  return rest
    .filter((view) => view.examResults !== first.examResults)
    .map((view) => ({ check: "exam-result-differs", device: view.name, detail: `exam results differ from ${first.name}` }));
};

export type Expectation =
  | { readonly exact: SyncRecord }
  /** A setting changed on more than one side: the last device to push wins, so any of them. */
  | { readonly oneOf: readonly SyncRecord[] };

/**
 * What every device must hold after a partition heals, given the converged state before
 * it (`base`) and what each side of the partition held when it healed (`sides`). Every
 * side's edits are concurrent with every other's, so, per record:
 *
 * - changed on **no** side — the base copy stands;
 * - changed on **one** side — that side's copy wins outright. This is the week-offline
 *   property: a device that did not touch a record never overwrites the newer copy;
 * - changed on **several** — their `mergeRecord` fold (the lower box, the completed
 *   session, the submitted exam run: Gate B, D69, D80), or for a setting, any one of them.
 */
export const expectedAfterHeal = (base: Records, sides: readonly Records[]): Map<string, Expectation> => {
  const expected = new Map<string, Expectation>();
  const keys = new Set([...base.keys(), ...sides.flatMap((side) => [...side.keys()])]);
  for (const key of keys) {
    const was = base.get(key);
    const changed = sides.flatMap((side) => {
      const now = side.get(key);
      return now !== undefined && !same(now, was) ? [now] : [];
    });
    const [firstChange] = changed;
    // Unchanged everywhere means the key came from the base: a key new on a side is a change.
    if (firstChange === undefined) expected.set(key, { exact: was as SyncRecord });
    else if (firstChange.type === "setting" && changed.length > 1) {
      expected.set(key, { oneOf: changed });
    } else {
      expected.set(key, { exact: changed.reduce((a, b) => mergeRecord(a, b)) });
    }
  }
  return expected;
};

/** Every device holds exactly the expected records, and nothing else. */
export const unexpected = (expected: ReadonlyMap<string, Expectation>, views: readonly DeviceView[]): Violation[] =>
  views.flatMap((view) => {
    const wrong = [...expected].filter(([key, want]) => {
      const got = view.records.get(key);
      return "exact" in want ? !same(got, want.exact) : !want.oneOf.some((r) => same(got, r));
    });
    const extra = [...view.records.keys()].filter((key) => !expected.has(key));
    const bad = [...wrong.map(([key]) => key), ...extra];
    return bad.length === 0
      ? []
      : [{ check: "merge-oracle", device: view.name, detail: `${String(bad.length)} records not as expected, e.g. ${bad.slice(0, 3).join(", ")}` }];
  });
