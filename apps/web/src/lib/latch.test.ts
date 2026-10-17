import { describe, expect, it, vi } from "vitest";

import { latch } from "./latch";

const deferred = () => {
  let resolve: () => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

describe("latch (D237)", () => {
  it("drops a second call while the first is out, so a double press pays once", async () => {
    const out = deferred();
    const task = vi.fn((_text: string) => out.promise);
    const press = latch(task);
    const first = press("a");
    await press("b");
    out.resolve();
    await first;
    expect(task).toHaveBeenCalledTimes(1);
    expect(task).toHaveBeenCalledWith("a");
  });

  it("runs again once the run before has settled, even when it failed", async () => {
    const failing = deferred();
    const task = vi.fn().mockReturnValueOnce(failing.promise).mockResolvedValue(undefined);
    const press = latch(task);
    const first = press();
    failing.reject(new Error("saving failed"));
    await expect(first).rejects.toThrow("saving failed");
    await press();
    expect(task).toHaveBeenCalledTimes(2);
  });
});
