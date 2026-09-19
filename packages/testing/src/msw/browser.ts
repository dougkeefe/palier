import { setupWorker } from "msw/browser";

import { handlers } from "./handlers.js";

/**
 * Browser-only. This is its own subpath export because importing `msw/browser`
 * from the package root would break every Node consumer.
 */
export const mswWorker = setupWorker(...handlers);
