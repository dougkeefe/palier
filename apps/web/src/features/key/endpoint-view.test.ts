import { describe, expect, it } from "vitest";

import { endpointNoticeIsError, endpointRefused, endpointSaved } from "./endpoint-view";

const refusal = (problem: unknown) => Object.assign(new Error("x"), { name: "InvalidRealtimeEndpointError", problem });

describe("the own-endpoint form's notices (D192)", () => {
  it("says an address was kept, or that studio mode is back on Palier's server", () => {
    expect(endpointSaved("https://secret.example.org/")).toBe("realtimeOwnSaved");
    expect(endpointSaved(null)).toBe("realtimeOwnCleared");
  });

  it.each([
    ["not-a-url", "realtimeOwnNotUrl"],
    ["not-https", "realtimeOwnNotHttps"],
    ["has-credentials", "realtimeOwnCredentials"],
  ])("names the %s refusal in its own words", (problem, notice) => {
    expect(endpointRefused(refusal(problem))).toBe(notice);
  });

  it("reads any other failure as the device failing to keep it", () => {
    expect(endpointRefused(new Error("IndexedDB is gone"))).toBe("realtimeOwnFailed");
    expect(endpointRefused(refusal("a-problem-from-later"))).toBe("realtimeOwnFailed");
    expect(endpointRefused(refusal(7))).toBe("realtimeOwnFailed");
    expect(endpointRefused(null)).toBe("realtimeOwnFailed");
  });

  it("shows a refusal as an error and a save or a clear as information", () => {
    expect(endpointNoticeIsError("realtimeOwnSaved")).toBe(false);
    expect(endpointNoticeIsError("realtimeOwnCleared")).toBe(false);
    expect(endpointNoticeIsError("realtimeOwnNotHttps")).toBe(true);
    expect(endpointNoticeIsError("realtimeOwnFailed")).toBe(true);
  });
});
