import { describe, expect, it } from "vitest";

import { calculateTrend } from "./trend-calculator.js";
import { attempts, golden, items } from "./__tests__/practice-record.js";

/**
 * Golden fixtures are the contract (implementation-plan.md §5): "a recorded set of item
 * responses with expected accuracy figures, intervals…". 120 recorded answers, so the
 * 100-attempt window cuts the history; one band short of evidence, two estimated.
 */
describe("calculateTrend golden practice record", () => {
  it("reproduces the recorded accuracy and Wilson interval for every band", () => {
    expect(calculateTrend("reading", attempts, items)).toEqual(golden.expected.trend);
  });
});
