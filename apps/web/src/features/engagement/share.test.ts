import { describe, expect, it, vi } from "vitest";

import { type ShareNavigator, shareCard, shareRoute } from "./share";

const CARD = { text: "I took my first mock exam on Palier.", url: "https://palier.example/en" };

const abort = (): Error => Object.assign(new Error("Share canceled"), { name: "AbortError" });

describe("shareRoute", () => {
  it("uses the Web Share API when the browser can share this card", () => {
    expect(shareRoute({ share: vi.fn(), canShare: () => true }, CARD)).toBe("share");
    expect(shareRoute({ share: vi.fn() }, CARD)).toBe("share");
  });

  it("falls back to the clipboard when the browser cannot share it", () => {
    const clipboard = { writeText: vi.fn() };
    expect(shareRoute({ share: vi.fn(), canShare: () => false, clipboard }, CARD)).toBe("copy");
    expect(shareRoute({ clipboard }, CARD)).toBe("copy");
  });

  it("offers nothing when neither is there", () => {
    expect(shareRoute({}, CARD)).toBe("none");
    expect(shareRoute(undefined, CARD)).toBe("none");
  });
});

describe("shareCard", () => {
  it("shares the text and the address, and nothing else", async () => {
    const share = vi.fn(() => Promise.resolve());
    expect(await shareCard({ share }, CARD)).toBe("shared");
    expect(share).toHaveBeenCalledWith(CARD);
  });

  it("copies the text and the address when it cannot share", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    expect(await shareCard({ clipboard: { writeText } }, CARD)).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(`${CARD.text} ${CARD.url}`);
  });

  it("calls a dismissed share sheet a cancel, not a failure", async () => {
    const nav: ShareNavigator = { share: () => Promise.reject(abort()) };
    expect(await shareCard(nav, CARD)).toBe("cancelled");
  });

  it("reports a refused share or copy as a failure", async () => {
    expect(await shareCard({ share: () => Promise.reject(new Error("NotAllowedError")) }, CARD)).toBe("failed");
    expect(await shareCard({ clipboard: { writeText: () => Promise.reject(new Error("denied")) } }, CARD)).toBe("failed");
    expect(await shareCard({ share: () => Promise.reject("not an error") }, CARD)).toBe("failed");
  });

  it("fails rather than pretending, when there is no route at all", async () => {
    expect(await shareCard({}, CARD)).toBe("failed");
  });
});
