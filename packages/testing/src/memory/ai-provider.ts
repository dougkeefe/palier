import type { AiProvider } from "@palier/app";
import { OPTION_IDS } from "@palier/domain";
import type {
  ItemDraft,
  MissingWord,
  OptionId,
  OralAssessment,
  PassageDraft,
  ReviewVerdict,
  UsageRecord,
  WritingAssessment,
} from "@palier/domain";

/**
 * A deterministic in-memory `AiProvider`, the substitutable double the contract
 * suite runs against (the same role `memoryKeyVault` plays for `KeyVault`). It
 * synthesises schema-valid drafts and an approving verdict — enough to prove the
 * port's shape, not to stand in for a model's judgement. The content factory
 * ships its own richer scripted provider (it may not import `@palier/testing`),
 * so this stays minimal on purpose.
 */
export const fakeAiProvider = (): AiProvider => {
  let usage: UsageRecord | null = null;
  const bill = (tokens: number): void => {
    usage = { model: "fake", inputTokens: tokens, outputTokens: tokens };
  };
  const billAudio = (units: { readonly audioSeconds?: number; readonly characters?: number }): void => {
    usage = { model: "fake-audio", inputTokens: 0, outputTokens: 0, ...units };
  };

  return {
    capabilities: () => ({
      generatePassage: true,
      generateItems: true,
      reviewItem: true,
      assessWriting: true,
      generateScenario: true,
      transcribe: true,
      speak: true,
      examinerTurn: true,
      assessOral: true,
    }),

    generatePassage: (req) => {
      bill(10);
      const drafts: readonly PassageDraft[] = Array.from({ length: req.count }, (_, i) => ({
        lang: req.lang,
        docType: req.docType,
        title: `Passage ${String(i + 1)}`,
        body: "Phrase une. Phrase deux. Phrase trois.",
        targetBand: req.targetBand,
        topic: req.topic,
      }));
      return Promise.resolve(drafts);
    },

    generateItems: (req) => {
      bill(10);
      const { promptSpec, topic, count } = req;
      const drafts: readonly ItemDraft[] = Array.from({ length: count }, (_, i) => ({
        type: promptSpec.itemType,
        stem: { en: `Question ${String(i + 1)}`, fr: `Question ${String(i + 1)}` },
        options: OPTION_IDS.map((id) => ({
          id,
          text: `option ${id}`,
          rationale: { en: "why this option", fr: "pourquoi cette option" },
        })),
        key: "a",
        explanation: { en: "the rule taught", fr: "la règle enseignée" },
        subSkill: promptSpec.subSkill,
        targetBand: promptSpec.targetBand,
        topic,
        ...(promptSpec.itemType === "cloze" ? { blankIndex: 0 } : {}),
      }));
      return Promise.resolve(drafts);
    },

    // Two halves of the minutes asked for, so the plan always fills the session exactly.
    generateScenario: (req) => {
      bill(10);
      const half = req.minutes / 2;
      const phases = ["Mise en train", "Approfondissement"].map((name) => ({
        name,
        minutes: half,
        intent: `Sonder le candidat sur ${req.topic}.`,
        seedQuestions: ["Parlez-moi de votre rôle."],
        escalation: ["Qu'auriez-vous fait autrement ?"],
        deescalation: ["Décrivez une journée type."],
      }));
      return Promise.resolve({ phases });
    },

    reviewItem: (req) => {
      bill(5);
      const chosenKey = req.options[0]?.id ?? "a";
      const optionCases = Object.fromEntries(
        req.options.map((o) => [o.id, `case for ${o.id}`]),
      ) as Record<OptionId, string>;
      const verdict: ReviewVerdict = {
        chosenKey,
        confidence: 0.95,
        defensibleDistractors: [],
        optionCases,
        registerFlag: { flagged: false },
        estimatedBand: req.targetBand,
      };
      return Promise.resolve(verdict);
    },

    // Every criterion at the target band, and the first word marked, so the offsets are
    // always inside the text (D105). A text with no word has no error to mark.
    assessWriting: (req) => {
      bill(20);
      const firstWord = /\S+/u.exec(req.text);
      const criterion = { band: req.targetBand, evidence: "evidence quoted from the text" };
      const assessment: WritingAssessment = {
        criteria: {
          register: criterion,
          structure: criterion,
          grammar: criterion,
          vocabulary: criterion,
          task: criterion,
        },
        errors:
          firstWord === null
            ? []
            : [
                {
                  start: firstWord.index,
                  end: firstWord.index + firstWord[0].length,
                  correction: firstWord[0],
                  rule: "the rule the correction applies",
                },
              ],
        modelAnswer: `${req.text.trim()} (model answer)`,
      };
      return Promise.resolve(assessment);
    },

    // The clip's own bytes read as text, so a scripted answer's words come back as its
    // transcript, and the seconds billed are the length the recorder measured (D117).
    transcribe: async (req) => {
      billAudio({ audioSeconds: req.durationMs / 1000 });
      return { text: await req.audio.text() };
    },

    // The words as the "audio", so a test can tell which question a clip voices.
    speak: (req) => {
      billAudio({ characters: req.text.length });
      return Promise.resolve(new Blob([req.text], { type: "audio/mpeg" }));
    },

    // The phase's first question in the register asked for, or its seed question when
    // that list is empty, and never a difficulty flag of its own.
    examinerTurn: (req) => {
      bill(15);
      const lists = { baseline: req.phase.seedQuestions, escalate: req.phase.escalation, deescalate: req.phase.deescalation };
      const text = lists[req.register][0] ?? req.phase.seedQuestions[0] ?? req.phase.intent;
      return Promise.resolve({ text, difficulty: null });
    },

    // Every criterion at the target band, three fixed fixes, and the first word of the
    // candidate's first turn that has one marked and quoted five times, so every offset
    // and excerpt is inside a candidate's turn (D122). A session in which the candidate
    // said nothing has nothing to assess, and is refused, billing nothing.
    assessOral: (req) => {
      const index = req.turns.findIndex((turn) => turn.speaker === "candidate" && /\S/u.test(turn.text));
      const said = index === -1 ? null : /\S+/u.exec((req.turns[index] as { readonly text: string }).text);
      if (said === null) {
        usage = null;
        return Promise.reject(new Error("The candidate said nothing to assess."));
      }
      bill(40);
      const criterion = { band: req.targetBand, evidence: "evidence quoted from the transcript" };
      const word: MissingWord = { word: "néanmoins", turn: index, excerpt: said[0], example: `${said[0]}, néanmoins.` };
      const fix = (subSkill: OralAssessment["fixes"][number]["subSkill"]) => ({
        criterion: "grammar" as const,
        subSkill,
        advice: "the advice the fix gives",
        evidence: said[0],
      });
      const assessment: OralAssessment = {
        criteria: { comprehension: criterion, fluency: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
        fixes: [fix("agreement"), fix("verb-tense-and-mood"), fix("connectors-and-discourse-markers")],
        missingWords: [word, word, word, word, word],
        errors: [
          { turn: index, start: said.index, end: said.index + said[0].length, correction: said[0], rule: "the rule the correction applies" },
        ],
      };
      return Promise.resolve(assessment);
    },

    // Bills nothing, and so leaves no earlier call's usage behind (D102).
    verifyKey: () => {
      usage = null;
      return Promise.resolve();
    },

    lastUsage: () => usage,
  };
};
