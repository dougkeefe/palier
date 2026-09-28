/**
 * What the examiner asked, as the candidate is shown it: the words, their voice when
 * the provider gave one, and the scenario phase it belongs to (progress.md D117).
 */
export type ExaminerQuestion = {
  readonly text: string;
  readonly audio: Blob | null;
  readonly phase: number;
};

/**
 * The candidate's answer: a recorded clip with its measured length, or typed words
 * when the microphone is refused or absent (product-requirements.md §14, "Mic
 * permission denied"). A clip may carry `pauseMs`, how long the candidate waited after the
 * question had been heard before they pressed Record, which only the screen can measure,
 * because only it knows when the question's voice stopped (progress.md D127).
 */
export type CandidateAnswer =
  | { readonly kind: "audio"; readonly audio: Blob; readonly durationMs: number; readonly pauseMs?: number }
  | { readonly kind: "typed"; readonly text: string };

/**
 * The candidate's side of a turn-based session (progress.md D117), a port §3.3 did not
 * name. The transport hands over each question and waits for the answer, so one port
 * both shows the question (its text and its voice) and collects the reply, and the
 * screen needs no side channel. The browser's adapter records with `MediaRecorder` or
 * takes typed text; a test's is scripted.
 *
 * `answer` rejects when `signal` aborts, which is how a session ended mid-question
 * stops waiting. An answer already given is the transport's to deliver (D116).
 */
export type AnswerSource = {
  answer: (question: ExaminerQuestion, signal: AbortSignal) => Promise<CandidateAnswer>;
};
