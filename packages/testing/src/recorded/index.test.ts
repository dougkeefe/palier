import { readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { RECORDED_RUNS, runOf } from "./index.js";

const aCompletion = {
  method: "reviewItem",
  model: "m",
  request: { itemType: "cloze" },
  attempt: 1,
  content: "{}",
  usage: { prompt_tokens: 1, completion_tokens: 1 },
  conformant: true,
};
const aRun = { recordedAt: "2026-09-27T10:00:00.000Z", promptVersion: "4", completions: [aCompletion] };

describe("runOf (D112)", () => {
  it("reads a whole recorded run", () => {
    expect(runOf("r.json", aRun)).toEqual({ file: "r.json", ...aRun });
  });

  it.each([
    ["no recorded instant", { ...aRun, recordedAt: undefined }],
    ["no prompt version", { ...aRun, promptVersion: 4 }],
    ["completions that are not a list", { ...aRun, completions: {} }],
  ])("refuses a run with %s", (_, raw) => {
    expect(() => runOf("bad.json", raw)).toThrow(/bad\.json is not a recorded run/);
  });

  it.each([
    ["an unknown method", { method: "chat" }],
    ["content that is not text", { content: 3 }],
    ["a verdict that is not a boolean", { conformant: "yes" }],
    ["no request", { request: null }],
    ["no attempt number", { attempt: "1" }],
    ["no model", { model: undefined }],
  ])("refuses a completion with %s", (_, over) => {
    expect(() => runOf("bad.json", { ...aRun, completions: [{ ...aCompletion, ...over }] })).toThrow(
      /bad\.json: completion 0 is not a recorded completion/,
    );
  });
});

describe("RECORDED_RUNS", () => {
  it("loads exactly the files the recorder wrote, so the eval and the replay gate count the same runs", () => {
    const onDisk = readdirSync(new URL("./openai/", import.meta.url)).filter((f) => f.endsWith(".json")).sort();
    expect(RECORDED_RUNS.map((run) => run.file).sort()).toEqual(onDisk);
  });
});
