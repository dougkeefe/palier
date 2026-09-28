import { describe, expect, it } from "vitest";

import { QUIET_LEVEL, browserFamily, levelVerdict, micFailure, recoverySteps } from "./mic";

const named = (name: string) => Object.assign(new Error(name), { name });

describe("micFailure (D119)", () => {
  it.each([
    ["NotAllowedError", "denied"],
    ["SecurityError", "denied"],
    ["NotFoundError", "no-mic"],
    ["OverconstrainedError", "no-mic"],
    ["TypeError", "unsupported"],
    ["NotReadableError", "failed"],
  ] as const)("reads %s as %s", (name, state) => {
    expect(micFailure(named(name))).toBe(state);
  });

  it("reads something that is not an error as a failure", () => {
    expect(micFailure("nope")).toBe("failed");
  });
});

describe("levelVerdict (D119)", () => {
  it("hears a level at the threshold, and next to nothing below it", () => {
    expect(levelVerdict(QUIET_LEVEL)).toBe("ok");
    expect(levelVerdict(0.3)).toBe("ok");
    expect(levelVerdict(QUIET_LEVEL / 2)).toBe("quiet");
  });
});

describe("browserFamily (D119)", () => {
  it.each([
    ["Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 Edg/140.0", "edge"],
    ["Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36", "chrome"],
    ["Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0 Mobile/15E148 Safari/604.1", "chrome"],
    ["Mozilla/5.0 (Macintosh; rv:140.0) Gecko/20100101 Firefox/140.0", "firefox"],
    ["Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15", "safari"],
    ["curl/8.0", "other"],
  ] as const)("reads a user agent as %s's family", (ua, family) => {
    expect(browserFamily(ua)).toBe(family);
  });
});

describe("recoverySteps (D119)", () => {
  it("gives each named browser three steps, in order, and any other browser two", () => {
    expect(recoverySteps("safari")).toEqual(["micSteps_safari_1", "micSteps_safari_2", "micSteps_safari_3"]);
    expect(recoverySteps("other")).toEqual(["micSteps_other_1", "micSteps_other_2"]);
  });
});
