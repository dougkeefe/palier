import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { withAiProvider } from "@palier/app";
import { attemptId, formId, sessionId } from "@palier/domain";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { routeFetch } from "../app/api/__tests__/route-fetch";
import { memorySyncRepository } from "../server/__tests__/memory-repository";
import { type SyncApi, createSyncApi } from "../server/handlers";
import { BANK_BASE_PATH, BANK_VERSION, createContainer, hermeticDevice, readEnv } from "./container";

// The sync routes, served from memory, for the production graph's one sync round trip.
const server = vi.hoisted(() => ({ api: null as SyncApi | null }));
vi.mock("../server/db", () => ({ syncApi: () => Promise.resolve(server.api) }));

describe("readEnv", () => {
  it("is hermetic when PALIER_HERMETIC is exactly '1'", () => {
    expect(readEnv({ PALIER_HERMETIC: "1" })).toEqual({ hermetic: true });
  });

  it("is not hermetic when the flag is absent or any other value", () => {
    expect(readEnv({})).toEqual({ hermetic: false });
    expect(readEnv({ PALIER_HERMETIC: "0" })).toEqual({ hermetic: false });
  });
});

describe("createContainer", () => {
  it("wires every port from the in-memory harness in hermetic mode", () => {
    const c = createContainer({ hermetic: true });

    expect(typeof c.clock.now()).toBe("string");
    const r = c.random.next();
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(1);

    // The store ports are present and callable (their behaviour is proven by the
    // port contract suites in @palier/testing; here we assert wiring only).
    expect(c.items).toBeDefined();
    expect(c.attempts).toBeDefined();
    expect(c.schedule).toBeDefined();
    expect(c.sessions).toBeDefined();
    expect(c.examRuns).toBeDefined();
    expect(c.settings).toBeDefined();
    expect(c.vault).toBeDefined();
    expect(c.costLedger).toBeDefined();
    expect(c.writing).toBeDefined();

    // The IdGenerator mints valid, strictly increasing ULIDs (behaviour proven by
    // the contract suite in @palier/testing; here we assert wiring only).
    const first = c.ids.ulid();
    const second = c.ids.ulid();
    expect(first).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/);
    expect(second > first).toBe(true);
  });

  it("makes each hermetic page load its own sync device: a server-valid secret and a separate id stream", async () => {
    const one = createContainer({ hermetic: true });
    const two = createContainer({ hermetic: true });

    const [a, b] = await Promise.all([one.vault.deviceSecret(), two.vault.deviceSecret()]);

    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(b).not.toBe(a);
    expect(one.ids.ulid()).not.toBe(two.ids.ulid());
    expect(one.sync).toBeDefined();
    expect(await one.useCases.syncState()).toMatchObject({ enabled: true, identity: null });
  });

  it("derives a hermetic device from its random bytes: 32 for the secret, 4 for the id seed", () => {
    const device = hermeticDevice((bytes) => bytes.fill(1));

    expect(device.secret).toBe("01".repeat(32));
    expect(device.idSeed).toBe(0x01010101 * 2 ** 20);
  });

  it("assembles the use-case graph bound to the in-memory ports", () => {
    const c = createContainer({ hermetic: true });
    expect(typeof c.useCases.planDailySession).toBe("function");
    expect(typeof c.useCases.startSession).toBe("function");
    expect(typeof c.useCases.answerItem).toBe("function");
    expect(typeof c.useCases.completeSession).toBe("function");
  });

  it("exposes the parsed exam profile, the same one every use case receives", () => {
    const c = createContainer({ hermetic: true });
    expect(Object.keys(c.profile.variants).sort()).toEqual([
      "reading-supervised",
      "reading-unsupervised",
      "writing-supervised",
      "writing-unsupervised",
    ]);
  });

  it("runs a mock exam end to end on a fixture form: start, answer, flag, pause, submit, report", async () => {
    const c = createContainer({ hermetic: true });
    const [form] = await c.useCases.examForms();
    if (form === undefined) throw new Error("the fixture bank ships forms");
    const runId = sessionId(c.ids.ulid());

    const started = await c.useCases.startExam({ runId, formId: form.id, timeAllowance: 1.5 });
    expect(started.run.timeAllowance).toBe(1.5);
    expect((await c.useCases.examInProgress())?.run.id).toBe(runId);

    const [first, second] = form.itemIds;
    if (first === undefined || second === undefined) throw new Error("a form has items");
    await c.useCases.answerExamItem({
      runId,
      itemId: first,
      response: "a",
      msToFirstSelect: 500,
      msToConfirm: 500,
      changedAnswer: false,
      elapsedMs: 30_000,
    });
    await c.useCases.flagExamItem({ runId, itemId: second, flagged: true, elapsedMs: 40_000 });
    await c.useCases.checkpointExam({ runId, elapsedMs: 50_000 });

    const resumed = await c.useCases.resumeExam({ runId });
    expect(resumed?.run.resumes).toBe(1);
    expect(resumed?.remainingMs).toBe(form.timeLimitMinutes * 60_000 * 1.5 - 50_000);

    const { result } = await c.useCases.submitExam({ runId, elapsedMs: 60_000 });
    expect(await c.useCases.rescoreExam({ runId })).toEqual(result);

    const report = await c.useCases.examReport({ runId });
    expect(report.result).toEqual(result);
    expect(report.retake).toBe(false);
    expect((await c.useCases.latestExamResult())?.run.id).toBe(runId);

    expect(await c.useCases.queueForReview({ itemId: second })).toBe(true);
    expect((await c.schedule.get(second))?.due).not.toBeNull();
  });

  it("discloses what the practice trend rests on: none of the fixture items has statistics yet", async () => {
    const c = createContainer({ hermetic: true });
    expect(await c.useCases.practiceTrendEvidence({ skill: "reading" })).toEqual({ items: 0, trusted: 0 });
  });

  it("plans a non-empty daily session from the fixture bank", async () => {
    const c = createContainer({ hermetic: true });

    const plan = await c.useCases.planDailySession({
      skill: "writing",
      lang: "fr",
      targetBand: "B",
      sessionSize: 8,
    });

    // The fixture bank is wired, so the plan draws real items (proves the wiring,
    // not the planner's behaviour — that is @palier/engine's own suite).
    expect(plan.items.length).toBeGreaterThan(0);
  });

  /**
   * The graph end to end, which is the point of this file: plan a session from the
   * fixture bank, answer the first item of it wrongly, and see the attempt and the
   * Leitner entry land in the in-memory stores. It proves the wiring — the profile
   * reached `answerItem`, the registry scored, both stores were written — not the
   * engine's behaviour, which has its own suite.
   */
  it("answers an item from the planned session and records the attempt and its review", async () => {
    const c = createContainer({ hermetic: true });

    const plan = await c.useCases.planDailySession({
      skill: "writing",
      lang: "fr",
      targetBand: "B",
      sessionSize: 8,
    });
    const item = plan.items[0]!;

    const result = await c.useCases.answerItem({
      attemptId: attemptId("01HATTEMPT000000000000001"),
      itemId: item.id,
      // Deliberately not the key, so the answer is wrong and therefore enters the
      // queue whatever the item's key happens to be (product-requirements.md §6.5).
      response: item.key === "a" ? "b" : "a",
      sessionId: sessionId("01HSESSION000000000000001"),
      mode: "drill",
      msToFirstSelect: 1_000,
      msToConfirm: 2_000,
      changedAnswer: false,
      slow: false,
    });

    expect(result.attempt.correct).toBe(false);
    expect(await c.attempts.forItem(item.id)).toHaveLength(1);

    // Wrong answer: box 1, and due at the profile's first interval.
    expect(result.review?.box).toBe(1);
    expect(await c.schedule.get(item.id)).toMatchObject({ box: 1, skill: "writing" });
  });

  /**
   * The whole practice loop through the assembled graph: start a session, answer
   * every planned item under its id, complete it, then start the next day and see
   * the completed session flow back through `SessionStore` into the plan. It proves
   * the wiring — `startSession` composed the planner, the attempts carried the
   * session id, `completeSession` closed it, and the next `startSession` read it —
   * not the taper magnitude, which is @palier/engine's and @palier/app's own suites.
   */
  it("runs the full session loop: start, answer every item, complete, then start again", async () => {
    const c = createContainer({ hermetic: true });
    const day1 = sessionId("01HSESSION0000000000DAY1");

    const started = await c.useCases.startSession({
      sessionId: day1,
      mode: "drill",
      plan: { skill: "writing", lang: "fr", targetBand: "B", sessionSize: 8 },
    });

    expect(started.session).toMatchObject({ id: day1, completedAt: null });
    expect(started.plan.items.length).toBeGreaterThan(0);

    // Answer every planned item under the session's id.
    let attemptSeq = 0;
    for (const item of started.plan.items) {
      await c.useCases.answerItem({
        attemptId: attemptId(`01HATTEMPT${String(++attemptSeq).padStart(13, "0")}`),
        itemId: item.id,
        response: item.key,
        sessionId: day1,
        mode: "drill",
        msToFirstSelect: 1_000,
        msToConfirm: 2_000,
        changedAnswer: false,
        slow: false,
      });
    }
    expect(await c.attempts.recent("writing", 100)).toHaveLength(started.plan.items.length);

    const completed = await c.useCases.completeSession({ sessionId: day1 });
    expect(completed.session.completedAt).not.toBeNull();
    expect((await c.sessions.latest())?.completedAt).not.toBeNull();

    // The next day starts, reading the completed session back through the store.
    const day2 = await c.useCases.startSession({
      sessionId: sessionId("01HSESSION0000000000DAY2"),
      mode: "drill",
      plan: { skill: "writing", lang: "fr", targetBand: "B", sessionSize: 8 },
    });
    expect(day2.plan.items.length).toBeGreaterThan(0);
  });

  /**
   * The diagnostic path through the assembled graph: select a diagnostic set from
   * the fixture bank, answer every item in `mode: "diagnostic"`, then read the
   * accuracy back. It proves the wiring — `runDiagnostic` sampled the bank,
   * `answerItem` recorded diagnostic-mode attempts, and `diagnosticReadout` joined
   * them to bands through the same stores — not the trend's numbers, which are
   * @palier/engine's own suite.
   */
  it("runs a diagnostic: select a set, answer it, and read accuracy per band back", async () => {
    const c = createContainer({ hermetic: true });

    const { items } = await c.useCases.runDiagnostic({
      skill: "reading",
      lang: "fr",
      targetBand: "C",
      count: 8,
    });
    expect(items.length).toBeGreaterThan(0);

    let attemptSeq = 0;
    for (const item of items) {
      await c.useCases.answerItem({
        attemptId: attemptId(`01HDIAG${String(++attemptSeq).padStart(19, "0")}`),
        itemId: item.id,
        response: item.key,
        sessionId: sessionId("01HSESSIONDIAGNOSTIC00001"),
        mode: "diagnostic",
        msToFirstSelect: 1_000,
        msToConfirm: 2_000,
        changedAnswer: false,
        slow: false,
      });
    }

    const trend = await c.useCases.diagnosticReadout({ skill: "reading" });
    expect(trend.skill).toBe("reading");
    expect(trend.windowSize).toBe(items.length);
    // A readout per target band (the numbers are the engine's own suite).
    expect(Object.keys(trend.byBand).sort()).toEqual(["A", "B", "C"]);
  });

  it("round-trips a device's progress through export, wipe and import [R11]", async () => {
    await roundTripsProgress(createContainer({ hermetic: true }));
  });
});

/**
 * E2E journey 6's claim (implementation-plan.md §6.2), through the assembled graph:
 * make some progress, export it, wipe everything, import the file, and find the same
 * state. "The same" is checked twice over: the re-export is identical, and the
 * review queue the planner reads is the queue it read before.
 *
 * Not "the next plan equals the previous plan": the container holds one seeded
 * `Random` for its lifetime (§3.5), so each plan advances it, and two plans over
 * identical state legitimately differ in order.
 */
const roundTripsProgress = async (c: ReturnType<typeof createContainer>) => {
  const planRequest = { skill: "reading", lang: "fr", targetBand: "C", sessionSize: 8 } as const;
  const started = await c.useCases.startSession({
    sessionId: sessionId("01HSESSIONROUNDTRIP000001"),
    mode: "drill",
    plan: planRequest,
  });
  let seq = 0;
  for (const item of started.plan.items) {
    seq++;
    await c.useCases.answerItem({
      attemptId: attemptId(`01HROUNDTRIP${String(seq).padStart(14, "0")}`),
      itemId: item.id,
      // Alternate right and wrong, so the schedule holds more than one box.
      response: seq % 2 === 0 ? item.key : item.key === "a" ? "b" : "a",
      sessionId: started.session.id,
      mode: "drill",
      msToFirstSelect: 1_000,
      msToConfirm: 2_000,
      changedAnswer: false,
      slow: false,
    });
  }
  await c.useCases.completeSession({ sessionId: started.session.id });
  await c.settings.set("dailyGoalMinutes", 20);
  // The exam use cases are wired with the runner UI (Phase 3 Slice 3); the store is here now.
  await c.examRuns.put({
    id: sessionId("01HEXAMROUNDTRIP00000001"),
    formId: formId("fixture-form-reading"),
    startedAt: "2026-09-24T09:00:00.000Z",
    answers: [],
    flagged: [],
    elapsedMs: 120_000,
    checkpointedAt: "2026-09-24T09:02:00.000Z",
    submittedAt: null,
  });

  const before = await c.useCases.exportData();
  const dueLater = "2099-01-01T00:00:00.000Z";
  const queueBefore = await c.schedule.due(dueLater, 100);
  expect(before.attempts).toHaveLength(started.plan.items.length);
  expect(before.schedule.length).toBeGreaterThan(0);
  expect(before.examRuns).toHaveLength(1);

  await c.useCases.wipeData();
  const emptied = await c.useCases.exportData();
  expect([emptied.attempts, emptied.schedule, emptied.sessions, emptied.examRuns, emptied.settings]).toEqual([
    [],
    [],
    [],
    [],
    [],
  ]);

  await c.useCases.importData({ json: JSON.stringify(before) });

  const after = await c.useCases.exportData();
  expect({ ...after, exportedAt: before.exportedAt }).toEqual(before);
  // `due` orders by due instant and promises nothing within a tie, so compare by item.
  const byItem = (entries: readonly { itemId: string }[]) =>
    [...entries].sort((a, b) => a.itemId.localeCompare(b.itemId));
  expect(queueBefore.length).toBeGreaterThan(0);
  expect(byItem(await c.schedule.due(dueLater, 100))).toEqual(byItem(queueBefore));
};

/**
 * The production graph, run in Node: Dexie over `fake-indexeddb` (the `web` project's
 * setup file), Web Crypto ids (native on Node), the wall clock, and the HTTP bank. The
 * bank's base URL is origin-relative, which Node's `fetch` cannot resolve, so `fetch`
 * is stubbed with a reader that serves the **committed** `content/bank/` tree from disk
 * at the paths the browser would request. That makes this the fast-lane proof that
 * the app plans a day from the real committed bank rather than the fixture bank; the
 * browser-and-service-worker half is the medium lane's offline E2E.
 */
describe("createContainer in production", () => {
  const require = createRequire(import.meta.url);
  // content/profiles/psc-sle.json → content/
  const CONTENT_DIR = dirname(dirname(require.resolve("@palier/content/profiles/psc-sle.json")));
  const requested: string[] = [];

  const serveCommittedBank = async (url: string) => {
    requested.push(url);
    const prefix = `${BANK_BASE_PATH}/`;
    if (!url.startsWith(prefix)) return { ok: false, status: 404, json: async () => null };
    try {
      const body = await readFile(join(CONTENT_DIR, url.slice(prefix.length)), "utf8");
      return { ok: true, status: 200, json: async () => JSON.parse(body) as unknown };
    } catch {
      return { ok: false, status: 404, json: async () => null };
    }
  };

  /** The ids of every item in the committed bank, read straight off disk. */
  const committedItemIds = async (): Promise<Set<string>> => {
    const bankDir = join(CONTENT_DIR, "bank", `v${String(BANK_VERSION)}`);
    const manifest = JSON.parse(await readFile(join(bankDir, "manifest.json"), "utf8")) as {
      shards: { path: string }[];
    };
    const ids = new Set<string>();
    for (const shard of manifest.shards) {
      const items = JSON.parse(await readFile(join(CONTENT_DIR, shard.path), "utf8")) as {
        id: string;
      }[];
      for (const item of items) ids.add(item.id);
    }
    return ids;
  };

  beforeEach(() => {
    requested.length = 0;
    vi.stubGlobal("fetch", serveCommittedBank);
  });
  afterEach(async () => {
    // Every production container shares the one IndexedDB database, so leave it empty.
    await createContainer({ hermetic: false }).useCases.wipeData();
    vi.unstubAllGlobals();
  });

  it("wires every port to a real adapter without touching storage or the network", () => {
    const c = createContainer({ hermetic: false });

    expect(c.items).toBeDefined();
    expect(c.attempts).toBeDefined();
    expect(c.schedule).toBeDefined();
    expect(c.sessions).toBeDefined();
    expect(c.examRuns).toBeDefined();
    expect(c.settings).toBeDefined();
    expect(c.vault).toBeDefined();
    expect(c.sync).toBeDefined();
    expect(c.syncState).toBeDefined();
    expect(c.costLedger).toBeDefined();
    expect(c.writing).toBeDefined();
    expect(Number.isNaN(Date.parse(c.clock.now()))).toBe(false);
    expect(c.ids.ulid()).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/);
    // Construction is lazy: the bank has not fetched its manifest yet.
    expect(requested).toEqual([]);
  });

  it("does not register with the sync service before the first completed session (§9.3)", async () => {
    const c = createContainer({ hermetic: false });

    expect(await c.useCases.syncNow({ label: "Test" })).toEqual({ status: "waiting" });
    expect(requested.filter((url) => url.startsWith("/api/"))).toEqual([]);
  });

  it("syncs over the same-origin routes with the vault's secret once a session is complete", async () => {
    server.api = createSyncApi({
      repo: memorySyncRepository(),
      now: () => new Date(),
      randomBytes: (n) => crypto.getRandomValues(new Uint8Array(n)),
      rateLimitSalt: "salt",
    });
    const routes = await routeFetch();
    vi.stubGlobal("fetch", (url: string, init?: { method: string; headers: Record<string, string>; body?: string }) =>
      url.startsWith("/api/") ? routes(`http://palier.test${url}`, init ?? { method: "GET", headers: {} }) : serveCommittedBank(url),
    );
    const c = createContainer({ hermetic: false });
    const id = sessionId(c.ids.ulid());
    await c.useCases.startSession({
      sessionId: id,
      mode: "drill",
      plan: { skill: "reading", lang: "fr", targetBand: "C", sessionSize: 1 },
    });
    await c.useCases.completeSession({ sessionId: id });

    const outcome = await c.useCases.syncNow({ label: "Test" });

    expect(outcome).toMatchObject({ status: "synced", pushed: 1 });
    expect((await c.useCases.listDevices()).map((d) => d.label)).toEqual(["Test"]);
    await c.useCases.deleteEverywhere();
    expect((await c.useCases.syncState()).identity).toBeNull();
  });

  it("plans a day from the committed bank, fetched from the served base path", async () => {
    const c = createContainer({ hermetic: false });

    const plan = await c.useCases.planDailySession({
      skill: "reading",
      lang: "fr",
      targetBand: "C",
      sessionSize: 8,
    });

    expect(plan.items.length).toBeGreaterThan(0);
    // Every planned item is one the committed bank ships, not a fixture-bank item.
    const committedIds = await committedItemIds();
    expect(plan.items.every((item) => committedIds.has(item.id))).toBe(true);
    expect(requested).toContain(`${BANK_BASE_PATH}/bank/v${String(BANK_VERSION)}/manifest.json`);
    expect(await c.items.bankVersion()).toBe(BANK_VERSION);
  });

  it("starts, runs and scores every profile variant from the committed bank's forms, over real IndexedDB [R3]", async () => {
    const c = createContainer({ hermetic: false });
    const forms = await c.useCases.examForms();

    for (const [name, variant] of Object.entries(c.profile.variants)) {
      const form = forms.find((f) => f.skill === variant.skill && f.mode === variant.mode);
      if (form === undefined) throw new Error(`no committed form for ${name}`);
      expect(form.itemIds).toHaveLength(variant.items);
      expect(form.timeLimitMinutes).toBe(variant.minutes);

      const runId = sessionId(c.ids.ulid());
      await c.useCases.startExam({ runId, formId: form.id });
      const items = await c.items.byIds(form.itemIds);
      for (const item of items) {
        await c.useCases.answerExamItem({
          runId,
          itemId: item.id,
          response: item.key,
          msToFirstSelect: 1_000,
          msToConfirm: 1_000,
          changedAnswer: false,
          elapsedMs: 60_000,
        });
      }
      const { result } = await c.useCases.submitExam({ runId, elapsedMs: 60_000 });

      // Every scored item right, and pilots not counted: the top of the variant's scale.
      expect(result.outcome.raw).toBe(variant.scored);
      expect(result.outcome.scored).toBe(variant.scored);
      expect(await c.useCases.rescoreExam({ runId })).toEqual(result);
    }
  });

  it("seeds today's selection by the day, so rebuilding the container replays the same plan", async () => {
    const request = { skill: "reading", lang: "fr", targetBand: "C", sessionSize: 8 } as const;
    const first = await createContainer({ hermetic: false }).useCases.planDailySession(request);
    const again = await createContainer({ hermetic: false }).useCases.planDailySession(request);

    expect(again.items.map((item) => item.id)).toEqual(first.items.map((item) => item.id));
  });

  it("round-trips a device's progress through export, wipe and import, over real IndexedDB [R11]", async () => {
    await roundTripsProgress(createContainer({ hermetic: false }));
  });

  it("queues a submitted exam's telemetry in IndexedDB, keeps it through a reload offline, and flushes it once the route answers (D92)", async () => {
    const posted: { body: string; credentials: string | undefined }[] = [];
    let online = false;
    vi.stubGlobal("fetch", (url: string, init?: { body?: string; credentials?: string }) => {
      if (url !== "/api/telemetry") return serveCommittedBank(url);
      if (!online) return Promise.reject(new TypeError("Failed to fetch"));
      posted.push({ body: init?.body ?? "", credentials: init?.credentials });
      return Promise.resolve({ ok: true, status: 202 });
    });
    const c = createContainer({ hermetic: false });
    expect(await c.useCases.telemetryConsent()).toBe("unasked");
    await c.useCases.setTelemetryConsent({ consent: "on" });

    const [form] = await c.useCases.examForms();
    if (form === undefined) throw new Error("the committed bank ships forms");
    const runId = sessionId(c.ids.ulid());
    await c.useCases.startExam({ runId, formId: form.id });
    const [first] = await c.items.byIds(form.itemIds.slice(0, 1));
    if (first === undefined) throw new Error("a form has items");
    await c.useCases.answerExamItem({
      runId,
      itemId: first.id,
      response: first.key,
      msToFirstSelect: 800,
      msToConfirm: 1_200,
      changedAnswer: false,
      elapsedMs: 10_000,
    });
    await c.useCases.submitExam({ runId, elapsedMs: 10_000 });

    // A reload with the network still down: the queue is in IndexedDB, not in memory.
    const reloaded = createContainer({ hermetic: false });
    expect(await reloaded.useCases.flushTelemetry()).toEqual({ sent: 0, dropped: 0, pending: true });

    online = true;
    expect(await reloaded.useCases.flushTelemetry()).toEqual({ sent: 1, dropped: 0, pending: false });
    expect(posted).toHaveLength(1);
    expect(posted[0]?.credentials).toBe("omit");
    const { events } = JSON.parse(posted[0]?.body ?? "{}") as { events: Record<string, unknown>[] };
    expect(events).toEqual([
      { itemId: first.id, correct: true, responseMs: 1_200, bankVersion: BANK_VERSION, restBucket: 0 },
    ]);
    expect(await reloaded.useCases.flushTelemetry()).toEqual({ sent: 0, dropped: 0, pending: false });
  });

  it("never pushes the cost ledger to the sync service, and pushes the cap with the settings (D101, D104)", async () => {
    server.api = createSyncApi({
      repo: memorySyncRepository(),
      now: () => new Date(),
      randomBytes: (n) => crypto.getRandomValues(new Uint8Array(n)),
      rateLimitSalt: "salt",
    });
    const routes = await routeFetch();
    const pushed: string[] = [];
    const verdict = {
      chosenKey: "a",
      confidence: 0.9,
      defensibleDistractors: [],
      optionCases: { a: "a", b: "b", c: "c", d: "d" },
      registerFlag: { flagged: false },
      estimatedBand: "B",
    };
    vi.stubGlobal("fetch", (url: string, init?: { method: string; headers: Record<string, string>; body?: string }) => {
      if (url.startsWith("https://api.openai.com/")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: JSON.stringify(verdict) } }],
              usage: { prompt_tokens: 500, completion_tokens: 100 },
            }),
          text: () => Promise.resolve(""),
        });
      }
      if (!url.startsWith("/api/")) return serveCommittedBank(url);
      if (init?.body !== undefined) pushed.push(init.body);
      return routes(`http://palier.test${url}`, init ?? { method: "GET", headers: {} });
    });
    const c = createContainer({ hermetic: false });
    await c.vault.putApiKey("sk-test-not-a-real-key");
    await withAiProvider({ vault: c.vault, aiProvider: c.aiProvider, ledger: c.costLedger, clock: c.clock }, "item-generation", (ai) =>
      ai.reviewItem({
        itemType: "cloze",
        stem: { en: "x", fr: "x" },
        options: [{ id: "a", text: "a" }],
        subSkill: "agreement",
        targetBand: "B",
        lang: "fr",
      }),
    );
    expect(await c.costLedger.since("1970-01-01T00:00:00.000Z")).toHaveLength(1);
    await c.useCases.setSpendCap({ capUsd: 9 });
    const id = sessionId(c.ids.ulid());
    await c.useCases.startSession({ sessionId: id, mode: "drill", plan: { skill: "reading", lang: "fr", targetBand: "C", sessionSize: 1 } });
    await c.useCases.completeSession({ sessionId: id });

    expect(await c.useCases.syncNow({ label: "Test" })).toMatchObject({ status: "synced" });

    const wire = pushed.join("\n");
    expect(wire).toContain("spendCap");
    expect(wire).not.toContain("item-generation");
    expect(wire).not.toContain("inputTokens");
    await c.useCases.deleteEverywhere();
  });

  it("never pushes a writing submission or its feedback to the sync service (D106) [R12]", async () => {
    server.api = createSyncApi({
      repo: memorySyncRepository(),
      now: () => new Date(),
      randomBytes: (n) => crypto.getRandomValues(new Uint8Array(n)),
      rateLimitSalt: "salt",
    });
    const routes = await routeFetch();
    const pushed: string[] = [];
    const written = "Madame, je vous écris au sujet du dossier Fernleaf-7731.";
    const criterion = { band: "B", evidence: "Le registre convient." };
    const feedback = {
      criteria: { register: criterion, structure: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
      errors: [{ excerpt: "Fernleaf-7731", correction: "Fernleaf-7731", rule: "Rule Quillwort-4410" }],
      modelAnswer: "Madame, je vous écris au sujet du dossier Fernleaf-7731. Model Tamarack-2219.",
    };
    vi.stubGlobal("fetch", (url: string, init?: { method: string; headers: Record<string, string>; body?: string }) => {
      if (url.startsWith("https://api.openai.com/")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: JSON.stringify(feedback) } }],
              usage: { prompt_tokens: 900, completion_tokens: 700 },
            }),
          text: () => Promise.resolve(""),
        });
      }
      if (!url.startsWith("/api/")) return serveCommittedBank(url);
      if (init?.body !== undefined) pushed.push(init.body);
      return routes(`http://palier.test${url}`, init ?? { method: "GET", headers: {} });
    });
    const c = createContainer({ hermetic: false });
    await c.vault.putApiKey("sk-test-not-a-real-key");
    const [prompt] = c.useCases.writingPrompts();
    if (prompt === undefined) throw new Error("the library ships prompts");
    const saved = await c.useCases.saveWriting({ promptId: prompt.id, text: written });
    await c.useCases.requestWritingFeedback({ submissionId: saved.id, targetBand: "B", feedbackLang: "en" });
    expect((await c.useCases.writingHistory())[0]?.assessment).not.toBeNull();
    const id = sessionId(c.ids.ulid());
    await c.useCases.startSession({ sessionId: id, mode: "drill", plan: { skill: "reading", lang: "fr", targetBand: "C", sessionSize: 1 } });
    await c.useCases.completeSession({ sessionId: id });

    expect(await c.useCases.syncNow({ label: "Test" })).toMatchObject({ status: "synced" });

    const wire = pushed.join("\n");
    expect(wire.length).toBeGreaterThan(0);
    for (const marker of ["Fernleaf-7731", "Quillwort-4410", "Tamarack-2219", prompt.id]) {
      expect(wire).not.toContain(marker);
    }
    await c.useCases.deleteEverywhere();
    expect(await c.useCases.writingHistory()).toEqual([]);
  });

  it("forgets the telemetry consent and queue on a wipe, back to not asked", async () => {
    const c = createContainer({ hermetic: false });
    await c.useCases.setTelemetryConsent({ consent: "on" });

    await c.useCases.wipeData();

    expect(await c.useCases.telemetryConsent()).toBe("unasked");
  });

  it("keeps the device secret through a wipe, so the device keeps its sync identity (D50)", async () => {
    const c = createContainer({ hermetic: false });
    const secret = await c.vault.deviceSecret();
    await c.vault.putApiKey("sk-test-not-a-real-key");

    await c.useCases.wipeData();

    expect(await c.vault.hasApiKey()).toBe(false);
    expect(await c.vault.deviceSecret()).toBe(secret);
  });
});
