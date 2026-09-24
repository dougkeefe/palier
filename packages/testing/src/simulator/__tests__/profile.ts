import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { ExamProfile } from "@palier/domain";
import { parseExamProfileOrThrow } from "@palier/domain";

/**
 * The real exam profile, read from disk: the Leitner intervals the simulated devices
 * schedule with are profile data (ADR 8), and `@palier/testing` ships no dependency on
 * `@palier/content`, so the simulator takes the profile as a parameter.
 */
export const psc: ExamProfile = parseExamProfileOrThrow(
  JSON.parse(
    readFileSync(fileURLToPath(new URL("../../../../../content/profiles/psc-sle.json", import.meta.url)), "utf8"),
  ),
);
