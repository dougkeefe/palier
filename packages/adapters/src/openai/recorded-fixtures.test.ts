import {
  RECORDED_RUNS,
  type RecordedCompletion,
  type RecordedSpeech,
  type RecordedTranscribeRequest,
  recordedCompletions,
} from "@palier/testing";
import type {
  DiagnosticInterpretationRequest,
  ExaminerTurnRequest,
  GenerateItemsRequest,
  OralRequest,
  ReviewRequest,
  SpeechRequest,
  WritingRequest,
} from "@palier/domain";
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
 *
 * The turn loop's audio (D117) replays as it arrived too: a transcription's JSON body, and a
 * voice's content type and size, with bytes standing in for audio that was never committed.
 */

/** A network that answers with this one completion, as OpenAI's body wraps it, or as the audio endpoints answer. */
const replaying = (completion: RecordedCompletion): FetchLike => () => {
  if (completion.method === "transcribe") {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(JSON.parse(completion.content) as unknown),
      text: () => Promise.resolve(completion.content),
    });
  }
  if (completion.method === "speak") {
    const speech = JSON.parse(completion.content) as RecordedSpeech;
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? speech.contentType : null) },
      json: () => Promise.reject(new Error("binary")),
      text: () => Promise.resolve(""),
      blob: () => Promise.resolve(new Blob([new Uint8Array(speech.bytes)], { type: speech.contentType })),
    });
  }
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({ choices: [{ message: { content: completion.content } }], usage: completion.usage }),
    text: () => Promise.resolve(""),
  });
};

/** The clip a recorded transcription was made from, rebuilt to its recorded size: its bytes were never kept. */
const clipOf = (request: RecordedTranscribeRequest) => ({
  audio: new Blob([new Uint8Array(request.audio.bytes)], { type: request.audio.type }),
  lang: request.lang,
  durationMs: request.durationMs,
});

/** Make the recorded call again, through the adapter, with no retry: settled means accepted. */
const replay = (completion: RecordedCompletion): Promise<unknown> => {
  const model = completion.model;
  const provider = openAiProvider({
    apiKey: "sk-replay-not-a-key",
    models: { passage: model, draft: model, review: model, assess: model, examiner: model, transcribe: model, speech: model },
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
    case "examinerTurn":
      return provider.examinerTurn(completion.request as ExaminerTurnRequest);
    case "transcribe":
      return provider.transcribe(clipOf(completion.request as RecordedTranscribeRequest));
    case "speak":
      return provider.speak(completion.request as SpeechRequest);
    case "assessOral":
      return provider.assessOral(completion.request as OralRequest);
    // Recorded by the next funded `live-smoke --record` (ADR 25); until then no completion reaches it.
    case "interpretDiagnostic":
      return provider.interpretDiagnostic(completion.request as DiagnosticInterpretationRequest);
  }
};

describe("the recorded completions (D112)", () => {
  it("cover every method runtime generation, the workshop and spoken practice call, from a real run", () => {
    const methods = new Set(recordedCompletions().map((c) => c.method));
    expect(methods).toEqual(
      new Set(["generateItems", "reviewItem", "assessWriting", "examinerTurn", "transcribe", "speak", "assessOral"]),
    );
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
