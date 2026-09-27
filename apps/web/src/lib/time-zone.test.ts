import { describe, expect, it, vi } from "vitest";

import { deviceTimeZone } from "./time-zone";

describe("deviceTimeZone", () => {
  it("is the runtime's own zone, so a date formats where the user is", () => {
    expect(deviceTimeZone()).toBe(new Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it("follows the device, not a fixed zone: an Ottawa device reads Ottawa time", () => {
    const resolved = vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      ...new Intl.DateTimeFormat().resolvedOptions(),
      timeZone: "America/Toronto",
    });
    expect(deviceTimeZone()).toBe("America/Toronto");
    resolved.mockRestore();
  });
});
