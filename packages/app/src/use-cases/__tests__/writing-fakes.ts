import type { WritingAssessment, WritingPrompt } from "@palier/domain";

import type { WritingStore, WritingSubmission } from "../../ports/index.js";

/**
 * A local writing store for the use-case tests (progress.md D37). `all` keeps the port's
 * rule: newest first by `writtenAt`.
 */
export const writingStore = (
  seed: readonly WritingSubmission[] = [],
): WritingStore & { readonly puts: () => number } => {
  const byId = new Map(seed.map((s) => [s.id, s]));
  let puts = 0;
  return {
    put: (submission) => {
      puts += 1;
      byId.set(submission.id, submission);
      return Promise.resolve();
    },
    get: (id) => Promise.resolve(byId.get(id) ?? null),
    all: () =>
      Promise.resolve([...byId.values()].sort((a, b) => b.writtenAt.localeCompare(a.writtenAt))),
    clear: () => {
      byId.clear();
      return Promise.resolve();
    },
    puts: () => puts,
  };
};

export const aPrompt = (over: Partial<WritingPrompt> = {}): WritingPrompt => ({
  id: "wp-briefing-01",
  lang: "fr",
  register: "briefing-note",
  title: { en: "A briefing note", fr: "Une note d'information" },
  task: "Rédigez un paragraphe de note d'information.",
  wordTarget: 150,
  suggestedMinutes: 20,
  ...over,
});

export const anAssessment = (over: Partial<WritingAssessment> = {}): WritingAssessment => {
  const criterion = { band: "B" as const, evidence: "e" };
  return {
    criteria: { register: criterion, structure: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
    errors: [{ start: 0, end: 2, correction: "Nous", rule: "r" }],
    modelAnswer: "Une réponse modèle.",
    ...over,
  };
};

export const aSubmission = (over: Partial<WritingSubmission> = {}): WritingSubmission => ({
  id: "sub-1",
  promptId: "wp-briefing-01",
  text: "Je souhaite vous informer que le rapport est prêt.",
  writtenAt: "2026-09-26T10:00:00.000Z",
  assessment: null,
  ...over,
});
