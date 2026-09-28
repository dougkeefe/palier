import { describe, expect, it } from "vitest";

import { memoryAnswerSource } from "./answer-source.js";

const question = (text: string) => ({ text, audio: null, phase: 0 });
const typed = (text: string) => ({ kind: "typed", text }) as const;

describe("memoryAnswerSource (D118)", () => {
  it("answers each question with the next scripted answer, and keeps the questions", async () => {
    const source = memoryAnswerSource([typed("Un."), typed("Deux.")]);
    const signal = new AbortController().signal;

    expect(await source.answers.answer(question("Q1"), signal)).toEqual(typed("Un."));
    expect(await source.answers.answer(question("Q2"), signal)).toEqual(typed("Deux."));
    expect(source.questions().map((q) => q.text)).toEqual(["Q1", "Q2"]);
  });

  it("holds an answer until it is released, and is idle while it waits with nothing it may give", async () => {
    const source = memoryAnswerSource([typed("Un.")], { released: 0 });
    const answered = source.answers.answer(question("Q1"), new AbortController().signal);
    await source.idle();

    source.release(1);
    expect(await answered).toEqual(typed("Un."));
  });

  it("becomes idle only once a question is waiting, when asked before any is", async () => {
    const source = memoryAnswerSource([], { released: 0 });
    let idle = false;
    const quiet = source.idle().then(() => (idle = true));
    await Promise.resolve();
    expect(idle).toBe(false);
    void source.answers.answer(question("Q1"), new AbortController().signal);
    await quiet;
    expect(idle).toBe(true);
  });

  it("waits, idle, once the script runs out", async () => {
    const source = memoryAnswerSource([]);
    let settled = false;
    void source.answers.answer(question("Q1"), new AbortController().signal).then(() => (settled = true));
    await source.idle();
    source.release(1);
    await Promise.resolve();
    expect(settled).toBe(false);
  });

  it("rejects the wait when the transport aborts it", async () => {
    const source = memoryAnswerSource([], { released: 0 });
    const controller = new AbortController();
    const answered = source.answers.answer(question("Q1"), controller.signal);
    controller.abort();
    await expect(answered).rejects.toThrow(/stopped waiting/);
  });

  it("refuses at once a wait whose signal is already aborted (D121)", async () => {
    const source = memoryAnswerSource([typed("Un.")]);
    const controller = new AbortController();
    controller.abort();
    await expect(source.answers.answer(question("Q1"), controller.signal)).rejects.toThrow(/stopped waiting/);
    expect(source.questions()).toEqual([]);
  });

  it("refuses the answer being waited for, and every later one, once it fails", async () => {
    const source = memoryAnswerSource([typed("Un.")], { released: 0 });
    const signal = new AbortController().signal;
    const waiting = source.answers.answer(question("Q1"), signal);
    source.fail(new Error("gone"));
    await expect(waiting).rejects.toThrow("gone");
    await expect(source.answers.answer(question("Q2"), signal)).rejects.toThrow("gone");
  });

  it("does nothing on a release or a failure while no question waits", () => {
    const source = memoryAnswerSource([typed("Un.")], { released: 0 });
    source.release(1);
    source.fail(new Error("gone"));
    expect(source.questions()).toEqual([]);
  });
});
