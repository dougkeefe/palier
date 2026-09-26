import { delay, http, HttpResponse } from "msw";

/**
 * MSW handlers that stand in for OpenAI's models endpoint, the one call a key check makes
 * (`AiProvider.verifyKey`, progress.md D99), in each state it can end in. They let the
 * browser graph's key check run through the real `@palier/adapters/openai` over a real
 * `fetch`, as `telemetryHandlers` does for the telemetry sink.
 *
 * | Mode | Answer |
 * | --- | --- |
 * | `ok` | 200, a model list |
 * | `invalid-key` | 401, OpenAI's error shape |
 * | `rate-limited` | 429, the same for quota or rate |
 * | `server-error` | 500 |
 * | `malformed` | 200, but not a model list |
 * | `slow` | never answers, so the caller's timeout decides |
 *
 * `onAuthorization` sees each request's `authorization` header, so a test can prove the
 * key reached this origin, and only this one.
 */
export type OpenAiMode = "ok" | "invalid-key" | "rate-limited" | "server-error" | "malformed" | "slow";

export type OpenAiHandlerOptions = {
  readonly mode: OpenAiMode;
  readonly baseUrl?: string;
  readonly onAuthorization?: (authorization: string | null) => void;
};

const error = (status: number, code: string) =>
  HttpResponse.json({ error: { message: `stubbed ${code}`, type: code, code } }, { status });

export const openAiHandlers = ({ mode, baseUrl = "https://api.openai.com/v1", onAuthorization }: OpenAiHandlerOptions) => [
  http.get(`${baseUrl}/models`, async ({ request }) => {
    onAuthorization?.(request.headers.get("authorization"));
    switch (mode) {
      case "ok":
        return HttpResponse.json({ object: "list", data: [{ id: "gpt-stub", object: "model" }] });
      case "invalid-key":
        return error(401, "invalid_api_key");
      case "rate-limited":
        return error(429, "insufficient_quota");
      case "server-error":
        return error(500, "server_error");
      case "malformed":
        return HttpResponse.json({ object: "list" });
      case "slow":
        await delay("infinite");
        return HttpResponse.json({});
    }
  }),
];
