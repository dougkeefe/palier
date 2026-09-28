import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { mswServer } from "./node.js";
import { type OpenAiMode, openAiHandlers } from "./openai-handlers.js";

beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  mswServer.resetHandlers();
});
afterAll(() => {
  mswServer.close();
});

const models = (signal?: AbortSignal) =>
  fetch("https://api.openai.com/v1/models", {
    headers: { authorization: "Bearer sk-handler-test" },
    ...(signal === undefined ? {} : { signal }),
  });

describe("openAiHandlers — the models endpoint in each state a key check can end in", () => {
  it("answers a model list when the key works, and reports the authorization it saw", async () => {
    const seen: (string | null)[] = [];
    mswServer.use(...openAiHandlers({ mode: "ok", onAuthorization: (a) => seen.push(a) }));

    const response = await models();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ object: "list", data: [{ id: "gpt-stub", object: "model" }] });
    expect(seen).toEqual(["Bearer sk-handler-test"]);
  });

  it.each([
    ["invalid-key", 401],
    ["rate-limited", 429],
    ["server-error", 500],
  ] as const)("answers %s with %i and OpenAI's error shape", async (mode: OpenAiMode, status) => {
    mswServer.use(...openAiHandlers({ mode }));

    const response = await models();

    expect(response.status).toBe(status);
    expect(await response.json()).toHaveProperty("error.code");
  });

  it("answers malformed with a 200 that is not a model list", async () => {
    mswServer.use(...openAiHandlers({ mode: "malformed" }));

    const response = await models();

    expect(response.status).toBe(200);
    expect(await response.json()).not.toHaveProperty("data");
  });

  it("never answers when slow, so only the caller's abort ends the request", async () => {
    mswServer.use(...openAiHandlers({ mode: "slow" }));

    await expect(models(AbortSignal.timeout(20))).rejects.toThrow();
  });

  it("serves a configured base URL", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", baseUrl: "http://openai.test/v1" }));

    expect((await fetch("http://openai.test/v1/models")).status).toBe(200);
  });
});

const complete = () =>
  fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: "Bearer sk-handler-test", "content-type": "application/json" },
    body: JSON.stringify({ model: "m", messages: [] }),
  });

describe("openAiHandlers — chat completions, with the usage the ledger reads (D101)", () => {
  it("answers each scripted completion in turn, the last repeating, with its usage", async () => {
    const seen: (string | null)[] = [];
    mswServer.use(
      ...openAiHandlers({
        mode: "ok",
        completions: [
          { content: { wrong: "shape" }, usage: { prompt_tokens: 10, completion_tokens: 1 } },
          { content: { right: true }, usage: { prompt_tokens: 20, completion_tokens: 2 } },
        ],
        onAuthorization: (a) => seen.push(a),
      }),
    );

    const bodies = [];
    for (let i = 0; i < 3; i++) bodies.push(await (await complete()).json());

    expect(bodies).toEqual([
      { choices: [{ message: { content: '{"wrong":"shape"}' } }], usage: { prompt_tokens: 10, completion_tokens: 1 } },
      { choices: [{ message: { content: '{"right":true}' } }], usage: { prompt_tokens: 20, completion_tokens: 2 } },
      { choices: [{ message: { content: '{"right":true}' } }], usage: { prompt_tokens: 20, completion_tokens: 2 } },
    ]);
    expect(seen).toEqual(["Bearer sk-handler-test", "Bearer sk-handler-test", "Bearer sk-handler-test"]);
  });

  it("answers a completion whose content is a function of the prompt it was sent (D110)", async () => {
    mswServer.use(
      ...openAiHandlers({
        mode: "ok",
        completions: [{ content: (prompt: string) => ({ echoed: prompt }), usage: { prompt_tokens: 3, completion_tokens: 4 } }],
      }),
    );

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "m", messages: [{ role: "system", content: "be brief" }, { role: "user", content: "hello" }] }),
    });

    expect(await response.json()).toEqual({
      choices: [{ message: { content: JSON.stringify({ echoed: "be brief\nhello" }) } }],
      usage: { prompt_tokens: 3, completion_tokens: 4 },
    });
  });

  it("hands a function an empty prompt when the body is not JSON", async () => {
    mswServer.use(
      ...openAiHandlers({ mode: "ok", completions: [{ content: (prompt: string) => ({ echoed: prompt }), usage: { prompt_tokens: 0, completion_tokens: 0 } }] }),
    );

    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", body: "not json" });

    expect(await response.json()).toMatchObject({ choices: [{ message: { content: '{"echoed":""}' } }] });
  });

  it("answers an empty object for no tokens when nothing was scripted", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok" }));

    expect(await (await complete()).json()).toEqual({
      choices: [{ message: { content: "{}" } }],
      usage: { prompt_tokens: 0, completion_tokens: 0 },
    });
  });

  it("answers malformed with a billed completion that has no content", async () => {
    mswServer.use(
      ...openAiHandlers({ mode: "malformed", completions: [{ content: {}, usage: { prompt_tokens: 5, completion_tokens: 0 } }] }),
    );

    expect(await (await complete()).json()).toEqual({ choices: [{ message: {} }], usage: { prompt_tokens: 5, completion_tokens: 0 } });
  });

  it("refuses a completion the way it refuses the model list", async () => {
    mswServer.use(...openAiHandlers({ mode: "rate-limited" }));

    expect((await complete()).status).toBe(429);
  });
});

describe("openAiHandlers — the turn loop's audio endpoints (D117)", () => {
  const transcribe = (clip = "clip-bytes") => {
    const form = new FormData();
    form.append("file", new Blob([clip], { type: "audio/webm" }), "answer.webm");
    form.append("model", "gpt-transcribe");
    return fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { authorization: "Bearer sk-handler-test" },
      body: form,
    });
  };
  const speak = (input: string) =>
    fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { authorization: "Bearer sk-handler-test", "content-type": "application/json" },
      body: JSON.stringify({ model: "tts-1", input, voice: "alloy" }),
    });

  it("transcribes to the scripted text, and shows the test each clip that was uploaded", async () => {
    const uploads: string[] = [];
    const seen: (string | null)[] = [];
    mswServer.use(
      ...openAiHandlers({
        mode: "ok",
        onAuthorization: (a) => seen.push(a),
        onUpload: (clip) => void clip.text().then((t) => uploads.push(t)),
      }),
    );

    const response = await transcribe();

    expect(await response.json()).toEqual({ text: "Je suis analyste des politiques." });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(uploads).toEqual(["clip-bytes"]);
    expect(seen).toEqual(["Bearer sk-handler-test"]);
  });

  it("transcribes as a function of the clip's own bytes, when asked to", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", transcript: (clip) => `heard ${clip}` }));
    expect(await (await transcribe("bonjour")).json()).toEqual({ text: "heard bonjour" });
  });

  it("voices the words as audio bytes that carry them", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok" }));

    const response = await speak("Bonjour.");

    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(await response.text()).toBe("ID3:Bonjour.");
  });

  it("answers malformed with a transcription that has no text, and speech that is not audio", async () => {
    mswServer.use(...openAiHandlers({ mode: "malformed" }));
    expect(await (await transcribe()).json()).toEqual({});
    expect((await speak("Bonjour.")).headers.get("content-type")).toContain("application/json");
  });

  it("refuses both with the mode's status", async () => {
    mswServer.use(...openAiHandlers({ mode: "invalid-key" }));
    expect((await transcribe()).status).toBe(401);
    expect((await speak("Bonjour.")).status).toBe(401);
  });
});
