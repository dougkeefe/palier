import { describe, expect, it } from "vitest";

import {
  attemptId,
  deviceId,
  formId,
  itemId,
  passageId,
  scenarioId,
  sessionId,
} from "./ids.js";

describe("id constructors", () => {
  it("carry the value through unchanged, because the brand is compile-time only", () => {
    expect([
      itemId("a"),
      passageId("b"),
      formId("c"),
      scenarioId("d"),
      attemptId("e"),
    ]).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("survive JSON serialisation as plain strings", () => {
    expect(JSON.parse(JSON.stringify({ id: itemId("01HZZ") }))).toEqual({
      id: "01HZZ",
    });
  });
});

describe("the remaining id constructors", () => {
  it("carry their values through unchanged too", () => {
    expect([sessionId("s"), deviceId("d")]).toEqual(["s", "d"]);
  });
});
