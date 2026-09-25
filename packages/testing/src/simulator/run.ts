import type { Clock, Random, ScheduleEntry, SyncRecord, SyncTransport } from "@palier/app";
import { PairCodeRejectedError, SyncUnavailableError, stableJson } from "@palier/app";
import type { ExamProfile, ItemId } from "@palier/domain";
import { itemId } from "@palier/domain";

import { fakeClock } from "../clock/fake-clock.js";
import { contractSecret } from "../contracts/index.js";
import { fixtureBankRepository } from "../fixtures/bank.js";
import { memorySyncServer } from "../memory/index.js";
import { seededRandom } from "../random/seeded-random.js";
import { type Answer, type SimulatedDevice, simulatedDevice } from "./device.js";
import { type NetworkFaults, RELIABLE, drive, simulatedNetwork } from "./network.js";
import {
  type DeviceView,
  type Records,
  type Violation,
  differingTrends,
  diverged,
  duplicatedAttempts,
  expectedAfterHeal,
  inventedSchedule,
  lostAttempts,
  unexpected,
} from "./oracle.js";

/**
 * The deterministic sync simulator (implementation-plan.md §6.2 tier 5; progress.md,
 * Phase 2 Slice 3). Two or three virtual devices, one server, a seeded network that
 * delays, reorders, drops and partitions — then, after every phase, the convergence
 * properties in `oracle.ts`. One run is one seed; a failing seed replays exactly.
 *
 * Three phases, each ending in a heal and syncs to quiescence:
 *
 * 1. **Chaos.** Every device runs a random script at once — study, sync (foreground and
 *    in the background, mid-study), change a setting, switch sync off and on, import
 *    another device's export, pair by code, drop off the network and come back — over a
 *    network that drops requests and responses. Devices start with separate histories.
 * 2. **Concurrent edits.** From a converged state, every device is cut off and studies
 *    the same small set of items, so the schedule disagrees everywhere. After the heal
 *    each record must be the `mergeRecord` fold of the concurrent copies (Gate B).
 * 3. **A week offline.** One device is cut off while the others study for a week of
 *    clock time. Nothing it did not touch may overwrite their newer work.
 */

export type SimulatedServer = {
  /** The transport a device presenting `secret` uses. */
  readonly transport: (secret: string) => SyncTransport;
};

export type SimulationOptions = {
  readonly seed: number;
  readonly devices: 2 | 3;
  readonly profile: ExamProfile;
  /** A fresh, empty server for this run, on the simulation's clock. */
  readonly server: (clock: Clock) => SimulatedServer | Promise<SimulatedServer>;
  /** Actions each device takes in the chaos phase. */
  readonly steps?: number;
  readonly faults?: NetworkFaults;
  /**
   * How far apart the devices' ULID counters start (D71's 2^20). Only a test that proves
   * the simulator catches colliding id streams lowers it.
   */
  readonly idSpacing?: number;
};

export type SimulationReport = {
  readonly seed: number;
  readonly violations: readonly Violation[];
  /** What happened, one line per action, for reading a failing seed. */
  readonly trace: readonly string[];
};

/** The in-memory server, paging small so a pull always has to continue. */
export const memorySimulatedServer =
  (pageSize = 7) =>
  (clock: Clock): SimulatedServer => ({ transport: memorySyncServer({ clock, pageSize }).transport });

const DEFAULT_STEPS = 12;
const DEFAULT_FAULTS: NetworkFaults = { dropBefore: 0.1, dropAfter: 0.1 };
const ID_SPACING = 2 ** 20;
const MAX_QUIESCE_ROUNDS = 8;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const START = "2026-03-02T09:00:00.000Z";

/** Items the devices keep coming back to, so their schedules collide; the rest are rare. */
const HOT_ITEMS = 12;
const BANK_ITEMS = 60;
const fixtureItem = (n: number): ItemId => itemId(`fixture-item-${String(n).padStart(2, "0")}`);

/**
 * A failure the app shows the user and carries on from, never a defect: the network, or
 * a pairing code that expired while the clock ran on.
 */
const expected = (error: unknown): boolean =>
  error instanceof SyncUnavailableError || error instanceof PairCodeRejectedError;

type World = {
  readonly clock: ReturnType<typeof fakeClock>;
  readonly network: ReturnType<typeof simulatedNetwork>;
  readonly devices: readonly SimulatedDevice[];
  readonly produced: SyncRecord[];
  readonly written: Set<string>;
  readonly answered: ReadonlyMap<string, Map<string, ScheduleEntry>>;
  readonly trace: string[];
  readonly violations: Violation[];
};

export const runSyncSimulation = async (options: SimulationOptions): Promise<SimulationReport> => {
  const { seed } = options;
  const clock = fakeClock(START);
  const network = simulatedNetwork(seededRandom(seed ^ 0x5eed), options.faults ?? DEFAULT_FAULTS);
  const server = await options.server(clock);
  const items = fixtureBankRepository();
  const setup = seededRandom(seed);
  const written = new Set<string>();
  // Per device, the last schedule entry each item's answers wrote since the phase began.
  const answered = new Map<string, Map<string, ScheduleEntry>>();

  const devices = Array.from({ length: options.devices }, (_, i) => {
    const name = `d${String(i)}`;
    const mine = new Map<string, ScheduleEntry>();
    answered.set(name, mine);
    const skewMs = Math.round((setup.next() * 2 - 1) * 3 * HOUR);
    const skewed: Clock = { now: () => new Date(Date.parse(clock.now()) + skewMs).toISOString() };
    return simulatedDevice({
      name,
      idSeed: (i + 1) * (options.idSpacing ?? ID_SPACING),
      clock: skewed,
      transport: network.wrap(name, server.transport(contractSecret(seed * 8 + i + 1))),
      items,
      profile: options.profile,
      onScheduleWrite: (entry) => {
        written.add(stableJson(entry));
        mine.set(entry.itemId, entry);
      },
    });
  });

  const world: World = { clock, network, devices, produced: [], written, answered, trace: [], violations: [] };

  await chaos(world, options.steps ?? DEFAULT_STEPS, seed);
  await healAndCheck(world, "chaos", null);

  await concurrentEdits(world, seededRandom(seed + 1));
  await studyDuringSync(world, seededRandom(seed + 3));
  await weekOffline(world, seededRandom(seed + 2));

  return { seed, violations: world.violations, trace: world.trace };
};

const pick = <T>(random: Random, xs: readonly T[]): T => xs[Math.floor(random.next() * xs.length)] as T;

const answers = (random: Random, hotOnly: boolean): Answer[] =>
  Array.from({ length: 1 + Math.floor(random.next() * 4) }, () => ({
    itemId: fixtureItem(1 + Math.floor(random.next() * (hotOnly || random.next() < 0.7 ? HOT_ITEMS : BANK_ITEMS))),
    correct: random.next() < 0.6,
    changedAnswer: random.next() < 0.15,
  }));

const study = async (world: World, device: SimulatedDevice, random: Random, hotOnly: boolean): Promise<void> => {
  const complete = random.next() < 0.75;
  const recorded = await device.study(answers(random, hotOnly), complete);
  world.produced.push(...recorded);
  world.trace.push(`${device.name} studied ${String(recorded.length)}${complete ? ", completed" : ""}`);
};

/** Run one action, keeping a failure the app would show and move past as a trace line. */
const attempt = async (world: World, label: string, action: () => Promise<unknown>): Promise<void> => {
  try {
    await action();
    world.trace.push(label);
  } catch (error) {
    if (!expected(error)) throw error;
    world.trace.push(`${label} failed: ${(error as Error).name}`);
  }
};

const chaos = async (world: World, steps: number, seed: number): Promise<void> => {
  const { devices, network, clock } = world;
  const script = async (device: SimulatedDevice, index: number) => {
    const random = seededRandom(seed * 31 + index + 101);
    const others = devices.filter((d) => d !== device);
    for (let step = 0; step < steps; step++) {
      const roll = random.next();
      if (roll < 0.35) await study(world, device, random, false);
      else if (roll < 0.5) {
        device.syncInBackground();
        world.trace.push(`${device.name} sync started`);
      } else if (roll < 0.62) {
        const outcome = await device.sync();
        world.trace.push(`${device.name} sync: ${outcome.status}`);
      } else if (roll < 0.67) {
        const value = Math.floor(random.next() * 3) * 10 + 10;
        await device.setSetting(pick(random, ["dailyGoal", "targetBand"]), value);
        world.trace.push(`${device.name} set a setting to ${String(value)}`);
      } else if (roll < 0.72) {
        const enabled = !(await device.deps.syncState.state()).enabled;
        await device.idle();
        await attempt(world, `${device.name} sync switched ${enabled ? "on" : "off"}`, () => device.setSync(enabled));
      } else if (roll < 0.78) {
        const from = pick(random, others);
        await device.importJson(await from.exportJson());
        world.trace.push(`${device.name} imported ${from.name}'s export`);
      } else if (roll < 0.88) {
        const host = pick(random, others);
        await attempt(world, `${device.name} paired with ${host.name}`, async () => {
          const code = await host.requestCode();
          await device.idle();
          await device.pair(code);
        });
      } else if (roll < 0.92) {
        network.partition(device.name);
        world.trace.push(`${device.name} offline`);
      } else if (roll < 0.96) {
        network.heal(device.name);
        world.trace.push(`${device.name} online`);
      } else {
        clock.advance(Math.floor(random.next() * 6 * HOUR));
        world.trace.push(`clock now ${clock.now()}`);
      }
    }
    await device.idle();
  };
  await drive(network, devices.map((device, index) => script(device, index)));
};

/**
 * Heal everything, join every device to one account and switch sync on, then sync until a
 * whole round changes nothing — and check. With `expectations`, also check each record
 * against the partition oracle.
 */
const healAndCheck = async (
  world: World,
  phase: string,
  expectations: { base: Records; sides: readonly Records[] } | null,
): Promise<void> => {
  const { network, devices } = world;
  network.heal();
  network.setFaults(RELIABLE);
  const [host, ...guests] = devices as [SimulatedDevice, ...SimulatedDevice[]];
  await drive(network, [
    (async () => {
      for (const device of devices) if (!(await device.deps.syncState.state()).enabled) await device.setSync(true);
      // One sync each first: a device with an unconfirmed pairing (D74) learns which account
      // it is really in, so the check below compares accounts the server agrees with.
      for (const device of devices) await device.sync();
      if ((await host.deps.syncState.state()).identity === null) await host.requestCode();
      const account = (await host.deps.syncState.state()).identity?.accountId;
      for (const guest of guests) {
        if ((await guest.deps.syncState.state()).identity?.accountId !== account) await guest.pair(await host.requestCode());
      }
    })(),
  ]);
  if (!(await quiesce(world, devices))) {
    world.violations.push({ check: "no-quiescence", device: "all", detail: `${phase}: still changing after ${String(MAX_QUIESCE_ROUNDS)} rounds` });
  }
  const views = await Promise.all(devices.map(view));
  const found = [
    ...lostAttempts(world.produced, views),
    ...duplicatedAttempts(views),
    ...diverged(views),
    ...differingTrends(views),
    ...inventedSchedule(world.written, views),
    ...(expectations === null ? [] : unexpected(expectedAfterHeal(expectations.base, expectations.sides), views)),
  ];
  world.violations.push(...found.map((v) => ({ ...v, detail: `${phase}: ${v.detail}` })));
};

/** Sync `group` round after round until one round moves nothing anywhere. */
const quiesce = async (world: World, group: readonly SimulatedDevice[]): Promise<boolean> => {
  for (let round = 0; round < MAX_QUIESCE_ROUNDS; round++) {
    let quiet = true;
    await drive(
      world.network,
      group.map(async (device) => {
        await device.idle();
        const outcome = await device.sync();
        if (outcome.status !== "synced" || outcome.pulled + outcome.pushed + outcome.merged > 0) quiet = false;
      }),
    );
    if (quiet) return true;
  }
  return false;
};

const view = async (device: SimulatedDevice): Promise<DeviceView> => ({
  name: device.name,
  records: await device.records(),
  attemptCount: (await device.deps.attempts.all()).length,
  trends: stableJson([await device.trend("reading"), await device.trend("writing")]),
});

/** Record, from now, the schedule entries `devices`' answers write (`sideOf` reads them). */
const startRecording = (world: World, devices: readonly SimulatedDevice[]): void => {
  for (const device of devices) world.answered.get(device.name)?.clear();
};

/**
 * One side of a partition, for a device that edited alone: its records, with every
 * schedule entry its answers wrote since `startRecording` laid over them. The side is
 * what the answers wrote, not what the store holds afterwards, because a sync that
 * overwrote an answer — with a stale snapshot, or with the device's own echo — is
 * exactly what must not pass unnoticed.
 */
const sideOf = async (world: World, device: SimulatedDevice): Promise<Records> => {
  const side = new Map(await device.records());
  for (const entry of (world.answered.get(device.name) as Map<string, ScheduleEntry>).values()) {
    side.set(`schedule:${entry.itemId}`, { type: "schedule", id: entry.itemId, value: entry });
  }
  return side;
};

const concurrentEdits = async (world: World, random: Random): Promise<void> => {
  const { devices, network } = world;
  const base = await (devices[0] as SimulatedDevice).records();
  startRecording(world, devices);
  for (const device of devices) network.partition(device.name);
  for (const device of devices) {
    await study(world, device, random, true);
    if (random.next() < 0.5) await study(world, device, random, true);
    if (random.next() < 0.3) await device.setSetting("dailyGoal", Math.floor(random.next() * 100));
  }
  const sides = await Promise.all(devices.map((d) => sideOf(world, d)));
  await healAndCheck(world, "concurrent", { base, sides });
};

/**
 * One device answers while its own sync is in flight — the app's background runner can
 * fire on focus mid-drill. Another device has just pushed edits to the same items, so
 * the sync's pull brings copies that are concurrent with answers made after the sync
 * read the device's records. Those answers must merge, not be overwritten (D75).
 */
const studyDuringSync = async (world: World, random: Random): Promise<void> => {
  const [first, second] = world.devices as [SimulatedDevice, SimulatedDevice];
  const base = await first.records();
  await study(world, second, random, true);
  await drive(world.network, [second.sync()]);
  const pushed = await second.records();
  startRecording(world, [first]);
  await drive(world.network, [
    (async () => {
      first.syncInBackground();
      await study(world, first, random, true);
      await first.idle();
    })(),
  ]);
  await healAndCheck(world, "study-during-sync", { base, sides: [pushed, await sideOf(world, first)] });
};

/**
 * One device is away for a week while the others study daily and sync once a day — not
 * to quiescence, so a device's own last push is still coming back when it answers the
 * same items again. Nothing the away device did not touch may overwrite their work, and
 * no device may lose its own newer answer to the echo of its older one (D69 #5).
 */
const weekOffline = async (world: World, random: Random): Promise<void> => {
  const { devices, network, clock } = world;
  const away = devices.at(-1) as SimulatedDevice;
  const home = devices.slice(0, -1);
  const base = await away.records();
  startRecording(world, devices);
  network.partition(away.name);
  for (let day = 0; day < 7; day++) {
    clock.advance(DAY);
    for (const device of home) await study(world, device, random, false);
    if (random.next() < 0.3) await study(world, away, random, false);
    await drive(network, home.map((device) => device.sync()));
  }
  const [alone] = home;
  if (home.length > 1 && !(await quiesce(world, home))) {
    world.violations.push({ check: "no-quiescence", device: "home", detail: "week: the devices at home never settled" });
  }
  // Devices at home merge with each other legitimately, so only a lone one's answers are its side.
  const homeSide = home.length === 1 && alone !== undefined ? await sideOf(world, alone) : await (home[0] as SimulatedDevice).records();
  await healAndCheck(world, "week", { base, sides: [homeSide, await sideOf(world, away)] });
};
