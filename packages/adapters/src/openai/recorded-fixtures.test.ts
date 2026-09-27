import { RECORDED_RUNS, type RecordedCompletion, recordedCompletions } from "@palier/testing";
import type { GenerateItemsRequest, ReviewRequest, WritingRequest } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { openAiProvider } from "./openai-provider.js";
import type { FetchLike } from "./openai-provider.js";

/**
 * AI schema conformance against recorded fixtures (Phase 4 CI gate, exit criterion 2's second
 * half; progress.md D112). Every completion the live API really sent, replayed through the real
 * adapter with no retry, must get the verdict it got when it was recorded: accepted, or refused
 * as `InvalidResponseError`. So a schema, a parser or an adapter change that would refuse real
 * model output fails here, and so does one that would start accepting what was refused (the
 * prompt-version-3 reviews that gave a CEFR level for `estimatedBand`).
 */

/** A network that answers with this one completion, as OpenAI's body wraps it. */
const replaying = (completion: RecordedCompletion): FetchLike => () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({ choices: [{ message: { content: completion.content } }], usage: completion.usage }),
    text: () => Promise.resolve(""),
  });

/** Make the recorded call again, through the adapter, with no retry: settled means accepted. */
const replay = (completion: RecordedCompletion): Promise<unknown> => {
  const model = completion.model;
  const provider = openAiProvider({
    apiKey: "sk-replay-not-a-key",
    models: { passage: model, draft: model, review: model, assess: model },
    fetchImpl: replaying(completion),
    maxRetries: 0,
  });
  switch (completion.method) {
    case "generateItems":
      return provider.generateItems(completion.request as GenerateItemsRequest);
    case "reviewItem":
      return provider.reviewItem(completion.request as ReviewRequest);
    case "assessWriting":
      return provider.assessWriting(completion.request as WritingRequest);
  }
};

describe("the recorded completions (D112)", () => {
  it("cover every method runtime generation and the workshop call, from a real run", () => {
    const methods = new Set(recordedCompletions().map((c) => c.method));
    expect(methods).toEqual(new Set(["generateItems", "reviewItem", "assessWriting"]));
    for (const run of RECORDED_RUNS) expect(Number.isNaN(Date.parse(run.recordedAt)), run.file).toBe(false);
  });

  it("carry no key, no bearer token and no response id", () => {
    const text = JSON.stringify(RECORDED_RUNS);
    expect(text).not.toMatch(/sk-[A-Za-z0-9]/);
    expect(text).not.toContain("Bearer");
    expect(text).not.toContain("chatcmpl-");
  });

  it("include refused completions, so the gate holds both ways", () => {
    expect(recordedCompletions().some((c) => !c.conformant)).toBe(true);
    expect(recordedCompletions().some((c) => c.conformant)).toBe(true);
  });
});

describe.each(RECORDED_RUNS.map((run) => [run.file, run] as const))("replaying %s through the adapter", (_, run) => {
  it.each(run.completions.map((c, i) => [i + 1, c.conformant ? "accepts" : "refuses", c] as const))(
    "completion %i: the adapter still %s it",
    async (_i, _verdict, completion) => {
      if (completion.conformant) await expect(replay(completion)).resolves.toBeDefined();
      else await expect(replay(completion)).rejects.toMatchObject({ name: "InvalidResponseError" });
    },
  );
});
