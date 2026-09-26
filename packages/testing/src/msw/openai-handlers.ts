import { delay, http, HttpResponse } from "msw";

/**
 * MSW handlers that stand in for OpenAI: the models endpoint, the one call a key check
 * makes (`AiProvider.verifyKey`, progress.md D99), and chat completions with the `usage`
 * block the cost ledger reads (D101). They let the browser graph run through the real
 * `@palier/adapters/openai` over a real `fetch`, as `telemetryHandlers` does for the
 * telemetry sink.
 *
 * | Mode | Answer |
 * | --- | --- |
 * | `ok` | 200, a model list; a completion from `completions` |
 * | `invalid-key` | 401, OpenAI's error shape |
 * | `rate-limited` | 429, the same for quota or rate |
 * | `server-error` | 500 |
 * | `malformed` | 200, but not a model list, or a completion with no content |
 * | `slow` | never answers, so the caller's timeout decides |
 *
 * `completions` answers each completion in turn, the last one repeating, so a test can
 * script a malformed first reply and a good retry. `onAuthorization` sees each request's
 * `authorization` header, so a test can prove the key reached this origin, and only this one.
 */
export type OpenAiMode = "ok" | "invalid-key" | "rate-limited" | "server-error" | "malformed" | "slow";

/** One scripted completion: the JSON the model "replied" with, and what it cost in tokens. */
export type OpenAiCompletion = {
  readonly content: unknown;
  readonly usage: { readonly prompt_tokens: number; readonly completion_tokens: number };
};

export type OpenAiHandlerOptions = {
  readonly mode: OpenAiMode;
  readonly baseUrl?: string;
  readonly completions?: readonly OpenAiCompletion[];
  readonly onAuthorization?: (authorization: string | null) => void;
};

const error = (status: number, code: string) =>
  HttpResponse.json({ error: { message: `stubbed ${code}`, type: code, code } }, { status });

/** The answer every non-`ok` mode gives, whichever endpoint was asked. */
const refusal = async (mode: Exclude<OpenAiMode, "ok" | "malformed">) => {
  switch (mode) {
    case "invalid-key":
      return error(401, "invalid_api_key");
    case "rate-limited":
      return error(429, "insufficient_quota");
    case "server-error":
      return error(500, "server_error");
    case "slow":
      await delay("infinite");
      return HttpResponse.json({});
  }
};

const NO_COMPLETION: OpenAiCompletion = { content: {}, usage: { prompt_tokens: 0, completion_tokens: 0 } };

export const openAiHandlers = ({
  mode,
  baseUrl = "https://api.openai.com/v1",
  completions = [],
  onAuthorization,
}: OpenAiHandlerOptions) => {
  let answered = 0;
  return [
    http.get(`${baseUrl}/models`, ({ request }) => {
      onAuthorization?.(request.headers.get("authorization"));
      if (mode === "ok") return HttpResponse.json({ object: "list", data: [{ id: "gpt-stub", object: "model" }] });
      if (mode === "malformed") return HttpResponse.json({ object: "list" });
      return refusal(mode);
    }),
    http.post(`${baseUrl}/chat/completions`, ({ request }) => {
      onAuthorization?.(request.headers.get("authorization"));
      const next = completions[Math.min(answered, completions.length - 1)] ?? NO_COMPLETION;
      answered += 1;
      if (mode === "ok") {
        return HttpResponse.json({
          choices: [{ message: { content: JSON.stringify(next.content) } }],
          usage: next.usage,
        });
      }
      if (mode === "malformed") return HttpResponse.json({ choices: [{ message: {} }], usage: next.usage });
      return refusal(mode);
    }),
  ];
};
