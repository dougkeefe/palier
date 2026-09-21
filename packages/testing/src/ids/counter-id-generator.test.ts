import { describe, expect, it } from "vitest";

import { idGeneratorContract } from "../contracts/id-generator.contract.js";
import { counterIdGenerator } from "./counter-id-generator.js";

idGeneratorContract("counter", () => counterIdGenerator());

describe("counterIdGenerator", () => {
  it("is deterministic: two generators from the same seed produce the same stream", () => {
    const a = counterIdGenerator();
    const b = counterIdGenerator();

    expect([a.ulid(), a.ulid(), a.ulid()]).toEqual([b.ulid(), b.ulid(), b.ulid()]);
  });

  it("produces non-overlapping streams from different seeds", () => {
    const a = counterIdGenerator(0);
    const b = counterIdGenerator(1000);

    expect(a.ulid()).not.toBe(b.ulid());
  });
});
