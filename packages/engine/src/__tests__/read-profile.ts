import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { ExamProfile } from "@palier/domain";
import { parseExamProfileOrThrow } from "@palier/domain";

/** Test-only. @palier/engine is pure and does no I/O (implementation-plan.md 3.2). */
export const pscSle = (): ExamProfile =>
  parseExamProfileOrThrow(
    JSON.parse(
      readFileSync(
        fileURLToPath(
          new URL("../../../../content/profiles/psc-sle.json", import.meta.url),
        ),
        "utf8",
      ),
    ),
  );
