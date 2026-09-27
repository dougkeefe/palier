import type { WritingStore, WritingSubmission } from "@palier/app";
import type { WritingAssessment } from "@palier/domain";
import { checkErrorOffsets, writingAssessmentSchema } from "@palier/domain";

import type { PalierDb, WritingSubmissionRow } from "./db.js";

const isText = (value: unknown): value is string => typeof value === "string" && value.length > 0;

/**
 * An assessment is usable only if its shape is whole and its offsets fit the text they
 * point into (progress.md D105); anything else would draw corrections over the wrong words.
 */
const assessmentOf = (text: string, raw: unknown): WritingAssessment | null => {
  const parsed = writingAssessmentSchema.safeParse(raw);
  if (!parsed.success) return null;
  const assessment = parsed.data as WritingAssessment;
  return checkErrorOffsets(text, assessment.errors) === null ? assessment : null;
};

/**
 * The structure check at the edge (D55's approach). A row without a whole id, prompt, text
 * and instant reads as nothing. A row whose assessment is broken keeps its text and reads as
 * unassessed, because the writing is the user's and the feedback can be asked for again.
 */
const submissionOf = (row: WritingSubmissionRow | undefined): WritingSubmission | null => {
  if (row === undefined) return null;
  const { id, promptId, text, writtenAt, assessment } = row as Partial<Record<keyof WritingSubmission, unknown>>;
  if (!isText(id) || !isText(promptId) || typeof text !== "string" || typeof writtenAt !== "string") return null;
  if (Number.isNaN(Date.parse(writtenAt))) return null;
  return {
    id,
    promptId,
    text,
    writtenAt,
    assessment: assessment === null ? null : assessmentOf(text, assessment),
  };
};

const rowOf = ({ id, promptId, text, writtenAt, assessment }: WritingSubmission): WritingSubmissionRow => ({
  id,
  promptId,
  text,
  writtenAt,
  assessment,
});

/**
 * The writing workshop's submissions over v3's `writingSubmissions` table (progress.md
 * D106). Device-local: no sync collector reads this table, and no export carries it [R12].
 * `all` walks the `writtenAt` index backwards, so the newest comes first; every `writtenAt`
 * is a UTC `toISOString()` from the clock, so string order is time order.
 */
export const dexieWritingStore = (db: PalierDb): WritingStore => ({
  put: async (submission) => {
    await db.writingSubmissions.put(rowOf(submission));
  },
  get: async (id) => submissionOf(await db.writingSubmissions.get(id)),
  all: async () =>
    (await db.writingSubmissions.orderBy("writtenAt").reverse().toArray())
      .map(submissionOf)
      .filter((s): s is WritingSubmission => s !== null),
  clear: () => db.writingSubmissions.clear(),
});
