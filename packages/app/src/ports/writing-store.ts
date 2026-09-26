import type { WritingAssessment } from "@palier/domain";

import type { ISO } from "./time.js";

/**
 * One piece of writing from the workshop (product-requirements.md §8.7), with its
 * feedback once there is some (progress.md D106).
 *
 * Like `ExamRun`, this is a persisted aggregate owned by its store and not a
 * `@palier/domain` type: the engine never consumes it.
 *
 * - **`text` is exactly what was assessed.** The assessment's offsets point into it,
 *   so a use case never changes the text of a submission that has an assessment.
 * - **`assessment` is null until feedback arrives**, and stays null if the call
 *   fails, so the text is kept and the request can be made again.
 */
export type WritingSubmission = {
  readonly id: string;
  readonly promptId: string;
  readonly text: string;
  readonly writtenAt: ISO;
  readonly assessment: WritingAssessment | null;
};

/**
 * Local persistence of workshop submissions (progress.md D106), a port §3.3 did not
 * name. **Device-local: never synced and never exported, under any setting**
 * (architecture.md §9.4) [R12], like `CostLedger`: a submission can hold anything the
 * user chose to write. No sync collector takes it and `exportData` does not;
 * `wipeData` and `deleteEverywhere` clear it.
 *
 * - `put` is a plain upsert by id.
 * - `all` is newest first by `writtenAt`, for the workshop's history.
 */
export type WritingStore = {
  put: (submission: WritingSubmission) => Promise<void>;
  get: (id: string) => Promise<WritingSubmission | null>;
  all: () => Promise<readonly WritingSubmission[]>;
  clear: () => Promise<void>;
};
