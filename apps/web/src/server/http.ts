import type { z } from "zod";

/**
 * The request/response helpers every server handler shares: the sync API
 * (`handlers.ts`) and the telemetry API (`telemetry-handlers.ts`). Plain
 * `Request → Response`, no framework type, so the handlers stay unit-testable
 * against the in-memory repositories.
 */

export const json = (body: unknown, status = 200): Response => Response.json(body, { status });
export const error = (code: string, status: number): Response => json({ error: code }, status);

/** Thrown inside a handler to answer with a status; caught at the one boundary, `handle`. */
class Refusal extends Error {
  constructor(readonly response: Response) {
    super("refused");
  }
}

export const refuse = (code: string, status: number): never => {
  throw new Refusal(error(code, status));
};

/** The one place a `Refusal` becomes its response; anything else is a real failure (500). */
export const handle =
  <A extends unknown[]>(run: (request: Request, ...args: A) => Promise<Response>) =>
  async (request: Request, ...args: A): Promise<Response> => {
    try {
      return await run(request, ...args);
    } catch (thrown) {
      if (thrown instanceof Refusal) return thrown.response;
      throw thrown;
    }
  };

/**
 * The first address in `x-forwarded-for` (the platform's), or a shared bucket. It is
 * only ever hashed into a rate-limit key, never stored (architecture.md §12).
 */
export const clientIp = (request: Request): string =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

/** The body, parsed and validated: 413 over `maxBytes`, 400 when it is not JSON or not valid. */
export const readJson = async <T>(request: Request, schema: z.ZodType<T>, maxBytes: number): Promise<T> => {
  const text = await request.text();
  if (text.length > maxBytes) refuse("too-large", 413);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return refuse("invalid-body", 400);
  }
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : refuse("invalid-body", 400);
};
