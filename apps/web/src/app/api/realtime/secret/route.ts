import { serveRealtimeSecret } from "../../../../server/serve";

/** Mints a short-lived realtime secret from the user's key, the one call that sees it (ADR 3, progress.md D169). */
export const POST = serveRealtimeSecret;
