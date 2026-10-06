import type { DiagnosticInterpretation, Lang, ScoredSkill, SessionId } from "@palier/domain";

import type { ISO } from "./time.js";

/**
 * A diagnostic run's written interpretation, kept once it is paid for (ADR 25). The run's score
 * and placement are not here: they are derived from the attempt log whenever they are needed
 * (ADR 16). Only the words are stored, because they cost money and cannot be derived again.
 */
export type DiagnosticReport = {
  /** The run's session, which every one of its attempts carries. */
  readonly sessionId: SessionId;
  readonly skill: ScoredSkill;
  /** The language the interpretation is written in. */
  readonly feedbackLang: Lang;
  readonly writtenAt: ISO;
  readonly interpretation: DiagnosticInterpretation;
};

/**
 * Local persistence of diagnostic interpretations (ADR 25), a port §3.3 did not name.
 * **Device-local: never synced and never exported**, like `WritingStore`: a second device
 * shows the same score and placement, from the synced attempts, and can ask for its own
 * interpretation. `wipeData` and `deleteEverywhere` clear it.
 *
 * - `put` is a plain upsert by `sessionId`.
 * - `get` is `null` for a run with no interpretation yet.
 */
export type DiagnosticReportStore = {
  put: (report: DiagnosticReport) => Promise<void>;
  get: (sessionId: SessionId) => Promise<DiagnosticReport | null>;
  clear: () => Promise<void>;
};
