import { http, HttpResponse } from "msw";

/**
 * One handler set used from both Node unit tests and browser E2E
 * (implementation-plan.md 6.1), so a stub cannot drift between the two.
 *
 * Kept deliberately thin: the routes in architecture.md 10 get handlers as the
 * adapters that call them are written, not before.
 */
export const handlers = [
  http.get("/api/health", () =>
    HttpResponse.json({ build: "test", bankVersion: 0 }),
  ),
];
