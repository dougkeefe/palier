export type {
  AnswerItemDeps,
  AnswerItemRequest,
  AnswerItemResult,
} from "./answer-item.js";
export { UnknownItemError, answerItem } from "./answer-item.js";

export type {
  AnswerExamItemRequest,
  CheckpointExamRequest,
  ExamRunDeps,
  FlagExamItemRequest,
  ResumeExamRequest,
  ResumeExamResult,
  StartExamRequest,
  StartExamResult,
} from "./exam-run.js";
export {
  ExamAlreadySubmittedError,
  ExamItemNotOnFormError,
  UnknownExamRunError,
  UnknownFormError,
  answerExamItem,
  checkpointExam,
  examInProgress,
  flagExamItem,
  resumeExam,
  runLimitMs,
  startExam,
} from "./exam-run.js";

export type {
  ExamReport,
  ExamReportDeps,
  ExamReportRequest,
  LatestExamResult,
  QueueForReviewDeps,
  QueueForReviewRequest,
} from "./exam-report.js";
export { examForms, examReport, latestExamResult, queueForReview } from "./exam-report.js";

export type {
  RescoreExamDeps,
  RescoreExamRequest,
  SubmitExamDeps,
  SubmitExamRequest,
  SubmitExamResult,
} from "./submit-exam.js";
export { ExamNotSubmittedError, examAttemptId, rescoreExam, submitExam } from "./submit-exam.js";

export type { PlanDailySessionDeps, PlanDailySessionRequest } from "./plan-daily-session.js";
export { planDailySession } from "./plan-daily-session.js";

export type {
  StartSessionDeps,
  StartSessionRequest,
  StartSessionResult,
} from "./start-session.js";
export { startSession } from "./start-session.js";

export type {
  CompleteSessionDeps,
  CompleteSessionRequest,
  CompleteSessionResult,
} from "./complete-session.js";
export { UnknownSessionError, completeSession } from "./complete-session.js";

export type {
  RunDiagnosticDeps,
  RunDiagnosticRequest,
  RunDiagnosticResult,
} from "./run-diagnostic.js";
export { runDiagnostic } from "./run-diagnostic.js";

export type {
  DiagnosticReadoutDeps,
  DiagnosticReadoutRequest,
} from "./diagnostic-readout.js";
export { diagnosticReadout } from "./diagnostic-readout.js";

export type { ExportDocument } from "./export-document.js";
export {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  InvalidExportError,
  parseExportDocument,
} from "./export-document.js";

export type { ExportDataDeps } from "./export-data.js";
export { exportData } from "./export-data.js";

export type {
  ImportCount,
  ImportDataDeps,
  ImportDataRequest,
  ImportDataResult,
} from "./import-data.js";
export { importData } from "./import-data.js";

export type { WipeDataDeps } from "./wipe-data.js";
export { wipeData } from "./wipe-data.js";

export type { PracticeTrendDeps, PracticeTrendEvidenceDeps, PracticeTrendRequest } from "./practice-trend.js";
export { PRACTICE_MODES, practiceTrend, practiceTrendEvidence } from "./practice-trend.js";

export type { ReviewQueueDeps, ReviewQueueRequest, ReviewQueueResult } from "./review-queue.js";
export { reviewQueue } from "./review-queue.js";

export type {
  OralTotals,
  OralTotalsDeps,
  ProgressReport,
  ProgressReportDeps,
  ProgressReportRequest,
} from "./progress-report.js";
export { oralTotals, progressReport } from "./progress-report.js";

export type { SyncNowDeps, SyncNowRequest, SyncOutcome } from "./sync-now.js";
export { MAX_PUSH_ROUNDS, PUSH_BATCH, syncNow } from "./sync-now.js";

export type { DeleteEverywhereDeps, SyncAccountDeps } from "./sync-account.js";
export {
  deleteEverywhere,
  listDevices,
  pairDevice,
  removeDevice,
  requestPairCode,
  setSyncEnabled,
} from "./sync-account.js";

export type {
  FlushTelemetryDeps,
  FlushTelemetryResult,
  RecordExamTelemetryDeps,
  RecordExamTelemetryRequest,
  SetTelemetryConsentRequest,
  TelemetryDeps,
} from "./telemetry.js";
export { flushTelemetry, recordExamTelemetry, setTelemetryConsent, telemetryConsent } from "./telemetry.js";
export { examTelemetryEvents } from "./exam-telemetry-events.js";

export type { AiDeps, ApiKeyDeps, ApiKeyStatus, MeteredAiDeps, MeterTag, SaveApiKeyRequest } from "./api-key.js";
export {
  EmptyApiKeyError,
  NoApiKeyError,
  apiKeyStatus,
  checkApiKey,
  removeApiKey,
  saveApiKey,
  withAiProvider,
} from "./api-key.js";

export type { FeatureCost, SpendDeps, SpendPricing, SpendSummary } from "./spend.js";
export {
  InvalidSpendCapError,
  SPEND_CAP_KEY,
  featureCosts,
  preflightSpend,
  setSpendCap,
  spendCap,
  spendSummary,
} from "./spend.js";

export type {
  SaveWritingDeps,
  SaveWritingRequest,
  WritingDeps,
  WritingFeedbackDeps,
  WritingFeedbackRequest,
} from "./writing.js";
export {
  EmptyWritingError,
  UnknownWritingPromptError,
  UnknownWritingSubmissionError,
  requestWritingFeedback,
  saveWriting,
  writingHistory,
  writingPrompts,
} from "./writing.js";

export type {
  GeneratePracticeSetDeps,
  GeneratePracticeSetRequest,
  GeneratePracticeSetResult,
  ScoreGeneratedAnswerRequest,
} from "./generate.js";
export {
  GENERATED_ITEM_TYPES,
  GENERATED_SET_SIZE,
  UnknownGeneratedItemError,
  UnsupportedSubSkillError,
  generatePracticeSet,
  latestGeneratedSet,
  scoreGeneratedAnswer,
} from "./generate.js";

export type {
  OralAudioDeps,
  OralSessionRun,
  OralSessionRunDeps,
  OralStorageEstimate,
  SaveOralAudioResult,
  StartOralSessionRequest,
} from "./oral.js";
export {
  AUDIO_KEEP_SESSIONS,
  AUDIO_WARNING_BYTES,
  OralSessionExistsError,
  UnknownScenarioError,
  cleanUpAudio,
  oralStorageEstimate,
  saveOralAudio,
  startOralSessionRun,
  closeAbandonedSessions,
} from "./oral.js";

export type {
  OralPracticeDeps,
  OralPracticeRun,
  OralSessionChoice,
  TurnBasedTransport,
  TurnBasedTransportDeps,
} from "./oral-practice.js";
export { oralSessionChoices, startOralPracticeRun, turnBasedTransport } from "./oral-practice.js";
export type { OralStudioDeps, OralStudioRun, StudioTransport, StudioTransportHooks } from "./oral-studio.js";
export { startOralStudioRun } from "./oral-studio.js";
export type {
  OralCostLine,
  OralHistoryEntry,
  OralReport,
  OralReportBlock,
  OralReportDeps,
  OralReportRequest,
  OralReportViewDeps,
  OralSessionCost,
} from "./oral-report.js";
export {
  NothingToAssessError,
  OralSessionRunningError,
  UnknownOralSessionError,
  hasAnswers,
  oralFocusSubSkills,
  oralHistory,
  oralReport,
  requestOralReport,
} from "./oral-report.js";

export type {
  Milestones,
  MilestonesDeps,
  MilestonesRequest,
  StreakReport,
  StreakReportDeps,
  StreakReportRequest,
} from "./engagement.js";
export {
  MILESTONES_SHOWN_KEY,
  STREAK_FREEZE_NOTICED_KEY,
  markMilestoneShown,
  milestones,
  noteStreakFreeze,
  streakReport,
} from "./engagement.js";
