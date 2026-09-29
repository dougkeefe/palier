import { describe, expect, it } from "vitest";

import { beforeClear, inFlight, wipeCount, writesUntilWiped } from "./in-flight";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("inFlight", () => {
  it("joins a request still out rather than starting a second", async () => {
    const held = inFlight<string, string, number>();
    const call = deferred<number>();
    let started = 0;
    const start = () => {
      started += 1;
      return call.promise;
    };

    const first = held.join("a", "request", start);
    const second = held.join("a", "request", start);
    call.resolve(7);

    expect(second).toBe(first);
    expect(await second).toBe(7);
    expect(started).toBe(1);
  });

  it("names the request held under a key, and every request out", () => {
    const held = inFlight<string, { readonly subSkill: string }, number>();
    void held.join("a", { subSkill: "register" }, () => new Promise<number>(() => undefined));

    expect(held.get("a")?.request).toEqual({ subSkill: "register" });
    expect(held.get("b")).toBeNull();
    expect(held.all().map((entry) => entry.request)).toEqual([{ subSkill: "register" }]);
  });

  it("forgets a request once it settles, so the next is asked anew", async () => {
    const held = inFlight<string, null, number>();
    await held.join("a", null, () => Promise.resolve(1));

    expect(held.get("a")).toBeNull();
    expect(await held.join("a", null, () => Promise.resolve(2))).toBe(2);
  });

  it("forgets a request that failed, so trying again asks again", async () => {
    const held = inFlight<string, null, number>();
    await expect(held.join("a", null, () => Promise.reject(new Error("down")))).rejects.toThrow("down");

    expect(held.get("a")).toBeNull();
  });

  it("forgets everything on clear, and an old request settling later leaves a newer one held", async () => {
    const held = inFlight<string, string, number>();
    const old = deferred<number>();
    const oldResult = held.join("a", "old", () => old.promise);
    held.clear();

    expect(held.get("a")).toBeNull();
    const newer = held.join("a", "new", () => new Promise<number>(() => undefined));
    old.resolve(1);
    await oldResult;

    expect(held.get("a")?.request).toBe("new");
    expect(held.get("a")?.result).toBe(newer);
  });
});

describe("writesUntilWiped", () => {
  const store = () => {
    const written: string[] = [];
    return {
      written,
      store: { put: (value: string) => Promise.resolve(void written.push(value)), get: () => Promise.resolve(written.at(-1) ?? null) },
    };
  };

  it("writes while no wipe has happened since the call began", async () => {
    const wipes = wipeCount();
    const { written, store: inner } = store();
    await writesUntilWiped(inner, "put", wipes, wipes.now()).put("kept");

    expect(written).toEqual(["kept"]);
  });

  it("drops the write once a wipe has happened since, so a late answer cannot bring deleted text back", async () => {
    const wipes = wipeCount();
    const { written, store: inner } = store();
    const guarded = writesUntilWiped(inner, "put", wipes, wipes.now());
    wipes.bump();
    await guarded.put("dropped");

    expect(written).toEqual([]);
  });

  it("still reads through", async () => {
    const wipes = wipeCount();
    const { store: inner } = store();
    await inner.put("there");
    const guarded = writesUntilWiped(inner, "put", wipes, wipes.now());
    wipes.bump();

    expect(await guarded.get()).toBe("there");
  });
});

describe("beforeClear", () => {
  it("runs its step just as the store's clear begins, and not before", async () => {
    const order: string[] = [];
    const store = { clear: () => Promise.resolve(void order.push("clear")), get: () => Promise.resolve(1) };
    const wrapped = beforeClear(store, () => order.push("forget"));

    expect(await wrapped.get()).toBe(1);
    expect(order).toEqual([]);
    await wrapped.clear();
    expect(order).toEqual(["forget", "clear"]);
  });
});
