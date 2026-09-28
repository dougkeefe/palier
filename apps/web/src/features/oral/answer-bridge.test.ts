import { describe, expect, it } from "vitest";

import { answerBridge, type Waiting } from "./answer-bridge";

const question = { text: "Parlez-moi de votre poste.", audio: null, phase: 0 };

describe("answerBridge (D119)", () => {
  it("shows the screen each question as it waits, and hands the session the answer the screen gives", async () => {
    const bridge = answerBridge();
    const seen: Waiting[] = [];
    bridge.subscribe((waiting) => seen.push(waiting));

    const answered = bridge.source.answer(question, new AbortController().signal);
    expect(seen).toEqual([question]);
    expect(bridge.submit({ kind: "typed", text: "Je suis analyste." })).toBe(true);

    expect(await answered).toEqual({ kind: "typed", text: "Je suis analyste." });
    expect(seen).toEqual([question, null]);
  });

  it("ignores an answer when no question waits, so a late tap does nothing", () => {
    expect(answerBridge().submit({ kind: "typed", text: "Trop tard." })).toBe(false);
  });

  it("stops waiting, and tells the screen, when the session aborts the wait", async () => {
    const bridge = answerBridge();
    const seen: Waiting[] = [];
    bridge.subscribe((waiting) => seen.push(waiting));
    const controller = new AbortController();
    const answered = bridge.source.answer(question, controller.signal);

    controller.abort();

    await expect(answered).rejects.toThrow(/stopped waiting/);
    expect(seen).toEqual([question, null]);
    expect(bridge.submit({ kind: "typed", text: "Trop tard." })).toBe(false);
  });

  it("leaves a newer question waiting when an older wait is aborted after it was answered", async () => {
    const bridge = answerBridge();
    const seen: Waiting[] = [];
    bridge.subscribe((waiting) => seen.push(waiting));
    const first = new AbortController();
    const one = bridge.source.answer(question, first.signal);
    bridge.submit({ kind: "typed", text: "Un." });
    await one;
    const next = { ...question, text: "Et ensuite ?" };
    void bridge.source.answer(next, new AbortController().signal);

    first.abort();

    expect(seen.at(-1)).toEqual(next);
    expect(bridge.submit({ kind: "typed", text: "Deux." })).toBe(true);
  });

  it("refuses at once, and shows nothing, a wait whose signal is already aborted (D121)", async () => {
    const bridge = answerBridge();
    const seen: Waiting[] = [];
    bridge.subscribe((waiting) => seen.push(waiting));
    const controller = new AbortController();
    controller.abort();

    await expect(bridge.source.answer(question, controller.signal)).rejects.toThrow(/stopped waiting/);
    expect(seen).toEqual([]);
  });

  it("stops telling a listener that unsubscribed", () => {
    const bridge = answerBridge();
    const seen: Waiting[] = [];
    const stop = bridge.subscribe((waiting) => seen.push(waiting));
    stop();
    void bridge.source.answer(question, new AbortController().signal);
    expect(seen).toEqual([]);
  });
});
