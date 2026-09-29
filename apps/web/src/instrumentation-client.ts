/**
 * Runs before any of the app's own client code (Next's `instrumentation-client` file
 * convention), which is the only point early enough for what it does.
 *
 * **zod's code generation is turned off in the browser** (progress.md D134). zod compiles
 * object schemas with `new Function` unless its config says `jitless`, and the strict CSP
 * refuses that: Trusted Types allow no script string, and `script-src` has no
 * `'unsafe-eval'`. zod catches the refusal and falls back, but the refusal is still a
 * reported violation, and the E2E gate holds every page to none. Some modules parse as
 * they load, so a `z.config` call anywhere in the app's graph would come too late.
 *
 * zod reads its config from `globalThis.__zod_globalConfig` when it loads, and this sets
 * it without importing zod, so zod stays out of the shared first-load JS. The server's
 * handlers never run this file, so their parsing keeps the fast path.
 */
export const ZOD_CONFIG_GLOBAL = "__zod_globalConfig";

export function turnOffZodCodeGeneration(scope: Record<string, unknown> = globalThis as Record<string, unknown>): void {
  const existing = scope[ZOD_CONFIG_GLOBAL];
  const config = typeof existing === "object" && existing !== null ? existing : {};
  scope[ZOD_CONFIG_GLOBAL] = Object.assign(config, { jitless: true });
}

turnOffZodCodeGeneration();
