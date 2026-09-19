import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Test-only. `@palier/domain` does no I/O (implementation-plan.md 3.2), so
 * reading the profile off disk lives here, in `__tests__`, and never in `src`
 * proper. Production reads it through an adapter and hands the value to
 * `parseExamProfile`.
 */
export const PROFILE_PATH = fileURLToPath(
  new URL("../../../../content/profiles/psc-sle.json", import.meta.url),
);

export const readProfile = (): unknown =>
  JSON.parse(readFileSync(PROFILE_PATH, "utf8"));
