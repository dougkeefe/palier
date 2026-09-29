import { sessionId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { memoryOralLiveness } from "./oral-liveness.js";

const A = sessionId("a");

describe("memoryOralLiveness", () => {
  it("holds a session live until it is released", async () => {
    const liveness = memoryOralLiveness();
    const release = liveness.hold(A);
    expect(await liveness.live()).toEqual(new Set([A]));

    release();
    expect(await liveness.live()).toEqual(new Set());
  });

  it("keeps a session held twice live until both let go, and a second release does nothing", async () => {
    const liveness = memoryOralLiveness();
    const first = liveness.hold(A);
    const second = liveness.hold(A);
    first();
    first();
    expect(await liveness.live()).toEqual(new Set([A]));

    second();
    expect(await liveness.live()).toEqual(new Set());
  });

  it("drops a hold without its release, as a tab closed hard does", async () => {
    const liveness = memoryOralLiveness();
    liveness.hold(A);
    liveness.abandon(A);

    expect(await liveness.live()).toEqual(new Set());
  });
});
