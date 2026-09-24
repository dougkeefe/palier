import { describe, expect, it } from "vitest";

import { deviceLabel } from "./device-label";

describe("deviceLabel", () => {
  it("names the browser and the system, joined without words so it reads in either language", () => {
    expect(
      deviceLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15"),
    ).toBe("Safari · macOS");
    expect(deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36 Edg/128.0")).toBe(
      "Edge · Windows",
    );
    expect(deviceLabel("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36")).toBe("Chrome · Android");
    expect(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) FxiOS/128.0 Mobile/15E148")).toBe("Firefox · iOS");
  });

  it("falls back to what it can tell, and to a neutral word when it can tell nothing", () => {
    expect(deviceLabel("Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0")).toBe("Firefox · Linux");
    expect(deviceLabel("Mozilla/5.0 (X11; CrOS x86_64) SomethingNew/1.0")).toBe("ChromeOS");
    expect(deviceLabel("")).toBe("Web");
  });
});
