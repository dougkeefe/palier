import type { Random, SyncTransport } from "@palier/app";
import { SyncUnavailableError } from "@palier/app";

/**
 * The network between the simulator's devices and its sync server
 * (implementation-plan.md §6.2 tier 5): seeded, so a failing run replays exactly.
 *
 * A call is **held, not made**, until the scheduler delivers it — the in-memory server
 * applies its effect the moment a method is *called*, so holding the promise alone would
 * reorder nothing. `deliverNext` picks one held call at random across every device, which
 * is how one device's push lands between another's pull and push. Two faults, each with a
 * probability:
 *
 * - **drop before** — the request never reaches the server;
 * - **drop after** — the server applies the call and the response is lost, so the device
 *   sees a failure for a write that happened (a pair code spent, a push accepted).
 *
 * Both reach the device as `SyncUnavailableError`, exactly as the HTTP adapter reports a
 * network fault. A **partitioned** device's calls fail at once without being held.
 */

export type NetworkFaults = {
  /** Probability a delivered call never reaches the server. */
  readonly dropBefore: number;
  /** Probability a delivered call reaches the server and its response is lost. */
  readonly dropAfter: number;
};

export const RELIABLE: NetworkFaults = { dropBefore: 0, dropAfter: 0 };

export type SimulatedNetwork = {
  /** The transport `device` uses: every call goes through this network. */
  readonly wrap: (device: string, transport: SyncTransport) => SyncTransport;
  readonly partition: (device: string) => void;
  /** End `device`'s partition, or every partition when no device is named. */
  readonly heal: (device?: string) => void;
  readonly setFaults: (faults: NetworkFaults) => void;
  /** Calls held and not yet delivered. */
  readonly pending: () => number;
  /** Deliver one held call, chosen at random; false when none is held. */
  readonly deliverNext: () => Promise<boolean>;
};

type Held = {
  readonly run: () => Promise<unknown>;
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: unknown) => void;
};

export const simulatedNetwork = (random: Random, faults: NetworkFaults = RELIABLE): SimulatedNetwork => {
  const held: Held[] = [];
  const partitioned = new Set<string>();
  let current = faults;

  const through =
    <A extends unknown[], R>(device: string, call: (...args: A) => Promise<R>) =>
    (...args: A): Promise<R> => {
      if (partitioned.has(device)) return Promise.reject(new SyncUnavailableError("partitioned"));
      return new Promise<R>((resolve, reject) => {
        held.push({ run: () => call(...args), resolve: resolve as (value: unknown) => void, reject });
      });
    };

  return {
    wrap: (device, transport) => ({
      registerDevice: through(device, transport.registerDevice.bind(transport)),
      requestPairCode: through(device, transport.requestPairCode.bind(transport)),
      redeemPairCode: through(device, transport.redeemPairCode.bind(transport)),
      listDevices: through(device, transport.listDevices.bind(transport)),
      revokeDevice: through(device, transport.revokeDevice.bind(transport)),
      deleteAccount: through(device, transport.deleteAccount.bind(transport)),
      pull: through(device, transport.pull.bind(transport)),
      push: through(device, transport.push.bind(transport)),
    }),
    partition: (device) => {
      partitioned.add(device);
    },
    heal: (device) => {
      if (device === undefined) partitioned.clear();
      else partitioned.delete(device);
    },
    setFaults: (next) => {
      current = next;
    },
    pending: () => held.length,
    deliverNext: async () => {
      if (held.length === 0) return false;
      const [call] = held.splice(Math.floor(random.next() * held.length), 1) as [Held];
      if (random.next() < current.dropBefore) {
        call.reject(new SyncUnavailableError("dropped before the server"));
        return true;
      }
      // The server runs to completion before anything else is delivered, so a run is a
      // total order of server calls and replays exactly from its seed.
      let outcome: { ok: true; value: unknown } | { ok: false; error: unknown };
      try {
        outcome = { ok: true, value: await call.run() };
      } catch (error) {
        outcome = { ok: false, error };
      }
      if (random.next() < current.dropAfter) call.reject(new SyncUnavailableError("response lost"));
      else if (outcome.ok) call.resolve(outcome.value);
      else call.reject(outcome.error);
      return true;
    },
  };
};

/** Let every promise chain that can move, move: one macrotask turn drains all microtasks. */
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/**
 * Run `tasks` to completion over `network`: whenever every task is waiting on the
 * network, deliver one held call. A task that waits on nothing the network holds can
 * never finish, so that is reported rather than spun on.
 */
export const drive = async (network: SimulatedNetwork, tasks: readonly Promise<unknown>[]): Promise<void> => {
  let open = tasks.length;
  const failures: unknown[] = [];
  for (const task of tasks) {
    task.then(
      () => open--,
      (error: unknown) => {
        open--;
        failures.push(error);
      },
    );
  }
  for (;;) {
    await settle();
    if (open === 0) break;
    if (!(await network.deliverNext())) throw new Error("simulation stalled: tasks wait on nothing the network holds");
  }
  if (failures.length > 0) throw failures[0];
};
