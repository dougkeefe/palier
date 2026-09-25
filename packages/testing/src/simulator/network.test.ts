import { PairCodeRejectedError, SyncUnavailableError } from "@palier/app";
import { describe, expect, it } from "vitest";

import { fakeClock } from "../clock/fake-clock.js";
import { memorySyncServer } from "../memory/index.js";
import { seededRandom } from "../random/seeded-random.js";
import { RELIABLE, drive, simulatedNetwork } from "./network.js";

const aServer = () => memorySyncServer({ clock: fakeClock() });

/** A random source that returns the given values in turn, then 0. */
const scripted = (...values: number[]) => ({ next: () => values.shift() ?? 0 });

describe("simulatedNetwork", () => {
  it("holds a call until it is delivered, so the server sees nothing before then", async () => {
    const server = aServer();
    const network = simulatedNetwork(seededRandom(1));
    const laptop = network.wrap("laptop", server.transport("a"));

    const registering = laptop.registerDevice("Laptop");

    expect(network.pending()).toBe(1);
    expect(() => server.service.devices("a")).toThrow();
    await network.deliverNext();
    await expect(registering).resolves.toMatchObject({ accountId: expect.any(String) });
  });

  it("delivers the held call the random source picks, not the oldest", async () => {
    const server = aServer();
    const network = simulatedNetwork(scripted(0.99));
    const first = network.wrap("laptop", server.transport("a")).registerDevice("First");
    const second = network.wrap("phone", server.transport("b")).registerDevice("Second");

    await network.deliverNext();

    await expect(second).resolves.toMatchObject({ accountId: expect.any(String) });
    expect(network.pending()).toBe(1);
    void first;
  });

  it("reports false when there is nothing to deliver", async () => {
    expect(await simulatedNetwork(seededRandom(1)).deliverNext()).toBe(false);
  });

  it("drops a call before the server sees it", async () => {
    const server = aServer();
    const network = simulatedNetwork(scripted(0, 0), { dropBefore: 1, dropAfter: 0 });

    const registering = network.wrap("laptop", server.transport("a")).registerDevice("Laptop");
    await network.deliverNext();

    await expect(registering).rejects.toThrow(SyncUnavailableError);
    expect(() => server.service.devices("a")).toThrow();
  });

  it("applies a call and loses its response, so the device fails a write that happened", async () => {
    const server = aServer();
    const network = simulatedNetwork(scripted(0, 0.5, 0), { dropBefore: 0.1, dropAfter: 1 });

    const registering = network.wrap("laptop", server.transport("a")).registerDevice("Laptop");
    await network.deliverNext();

    await expect(registering).rejects.toThrow(SyncUnavailableError);
    expect(server.service.devices("a")).toHaveLength(1);
  });

  it("passes the server's own refusal through unchanged", async () => {
    const network = simulatedNetwork(seededRandom(1));

    const redeeming = network.wrap("phone", aServer().transport("b")).redeemPairCode("NOCODE", "Phone");
    await network.deliverNext();

    await expect(redeeming).rejects.toThrow(PairCodeRejectedError);
  });

  it("fails a partitioned device's calls at once, without holding them", async () => {
    const network = simulatedNetwork(seededRandom(1));
    network.partition("laptop");

    await expect(network.wrap("laptop", aServer().transport("a")).pull(0)).rejects.toThrow(SyncUnavailableError);
    expect(network.pending()).toBe(0);
  });

  it("reconnects one device, leaving the others cut off", async () => {
    const server = aServer();
    const network = simulatedNetwork(seededRandom(1));
    network.partition("laptop");
    network.partition("phone");

    network.heal("laptop");

    void network.wrap("laptop", server.transport("a")).registerDevice("Laptop");
    expect(network.pending()).toBe(1);
    await expect(network.wrap("phone", server.transport("b")).registerDevice("Phone")).rejects.toThrow(SyncUnavailableError);
  });

  it("ends every partition when healed without a device", () => {
    const network = simulatedNetwork(seededRandom(1));
    network.partition("laptop");
    network.partition("phone");

    network.heal();

    void network.wrap("laptop", aServer().transport("a")).registerDevice("Laptop");
    void network.wrap("phone", aServer().transport("b")).registerDevice("Phone");
    expect(network.pending()).toBe(2);
  });

  it("stops dropping once the faults are set back to reliable", async () => {
    const network = simulatedNetwork(seededRandom(1), { dropBefore: 1, dropAfter: 1 });
    network.setFaults(RELIABLE);

    const registering = network.wrap("laptop", aServer().transport("a")).registerDevice("Laptop");
    await network.deliverNext();

    await expect(registering).resolves.toMatchObject({ accountId: expect.any(String) });
  });
});

describe("drive", () => {
  it("delivers held calls until every task has finished", async () => {
    const server = aServer();
    const network = simulatedNetwork(seededRandom(1));
    const laptop = network.wrap("laptop", server.transport("a"));
    const phone = network.wrap("phone", server.transport("b"));

    await drive(network, [laptop.registerDevice("Laptop").then(() => laptop.pull(0)), phone.registerDevice("Phone")]);

    expect(network.pending()).toBe(0);
    expect(server.service.devices("a")).toHaveLength(1);
    expect(server.service.devices("b")).toHaveLength(1);
  });

  it("reports a task that waits on nothing the network holds, rather than spinning", async () => {
    const network = simulatedNetwork(seededRandom(1));

    await expect(drive(network, [new Promise(() => undefined)])).rejects.toThrow(/stalled/);
  });

  it("raises a task's own failure once the others have finished", async () => {
    const network = simulatedNetwork(seededRandom(1));

    await expect(drive(network, [Promise.reject(new Error("defect")), Promise.resolve()])).rejects.toThrow("defect");
  });
});
