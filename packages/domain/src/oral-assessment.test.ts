import { describe, expect, it } from "vitest";

import type { OralAssessment, OralAssessmentDraft } from "./ai.js";
import { ORAL_CRITERIA } from "./ai.js";
import { assembleOralAssessment, checkOralAssessment } from "./oral-assessment.js";
import type { OralTurn } from "./oral-session.js";
import { oralAssessmentDraftSchema, oralAssessmentSchema } from "./schemas/ai.js";

const turn = (speaker: OralTurn["speaker"], text: string): OralTurn => ({
  speaker,
  text,
  phase: 0,
  startMs: 0,
  endMs: 0,
});

const TURNS: readonly OralTurn[] = [
  turn("examiner", "Parlez-moi de votre poste."),
  turn("candidate", "Je suis analyste et je travaille sur le budget depuis trois ans."),
  turn("examiner", "Quel est votre plus grand défi ?"),
  turn("candidate", "Le défi est de faire les prévisions quand les données arrive en retard."),
];

const criteria = Object.fromEntries(
  ORAL_CRITERIA.map((criterion) => [criterion, { band: "B", evidence: `evidence for ${criterion}` }]),
) as OralAssessmentDraft["criteria"];

const aFix = (subSkill: OralAssessmentDraft["fixes"][number]["subSkill"]) => ({
  criterion: "grammar" as const,
  subSkill,
  advice: "Accordez le verbe avec son sujet.",
  evidence: "les données arrive",
});

const aWord = (turnIndex: number, excerpt: string) => ({
  word: "échéancier",
  turn: turnIndex,
  excerpt,
  example: "Le défi est de respecter l'échéancier.",
});

const aDraft = (over: Partial<OralAssessmentDraft> = {}): OralAssessmentDraft => ({
  criteria,
  fixes: [aFix("agreement"), aFix("verb-tense-and-mood"), aFix("inference")],
  missingWords: [
    aWord(1, "je travaille sur le budget"),
    aWord(1, "depuis trois ans"),
    aWord(3, "faire les prévisions"),
    aWord(3, "en retard"),
    aWord(3, "Le défi"),
  ],
  errors: [{ turn: 3, excerpt: "arrive", correction: "arrivent", rule: "accord du verbe" }],
  ...over,
});

describe("ORAL_CRITERIA", () => {
  it("names the five transcript criteria of PRD §8.6, in display order, pronunciation apart", () => {
    expect(ORAL_CRITERIA).toEqual(["comprehension", "fluency", "grammar", "vocabulary", "task"]);
  });
});

describe("assembleOralAssessment", () => {
  it("places each error over its own turn's text", () => {
    const result = assembleOralAssessment(TURNS, aDraft());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [error] = result.assessment.errors;
    expect(error).toEqual({ turn: 3, start: 54, end: 60, correction: "arrivent", rule: "accord du verbe" });
    expect((TURNS[3] as OralTurn).text.slice(error?.start, error?.end)).toBe("arrive");
  });

  it("keeps the criteria, the fixes in their rank order, and the words", () => {
    const draft = aDraft();
    const result = assembleOralAssessment(TURNS, draft);
    if (!result.ok) throw new Error(result.problem);
    expect(result.assessment.criteria).toBe(draft.criteria);
    expect(result.assessment.fixes.map((fix) => fix.subSkill)).toEqual(["agreement", "verb-tense-and-mood", "inference"]);
    expect(result.assessment.missingWords).toBe(draft.missingWords);
  });

  it("orders errors by turn, then by where they fall in it, whatever order they arrive in", () => {
    const result = assembleOralAssessment(
      TURNS,
      aDraft({
        errors: [
          { turn: 3, excerpt: "arrive", correction: "arrivent", rule: "accord" },
          { turn: 1, excerpt: "trois ans", correction: "trois années", rule: "style" },
          { turn: 3, excerpt: "faire", correction: "établir", rule: "précision" },
          { turn: 1, excerpt: "analyste", correction: "analyste principal", rule: "précision" },
        ],
      }),
    );
    if (!result.ok) throw new Error(result.problem);
    expect(result.assessment.errors.map((e) => [e.turn, e.correction])).toEqual([
      [1, "analyste principal"],
      [1, "trois années"],
      [3, "établir"],
      [3, "arrivent"],
    ]);
  });

  it("accepts a session with no errors at all", () => {
    const result = assembleOralAssessment(TURNS, aDraft({ errors: [] }));
    expect(result.ok && result.assessment.errors).toEqual([]);
  });

  it("refuses an excerpt that is not in the turn it names, naming the turn", () => {
    const result = assembleOralAssessment(
      TURNS,
      aDraft({ errors: [{ turn: 1, excerpt: "arrive", correction: "arrivent", rule: "accord" }] }),
    );
    expect(result).toEqual({ ok: false, problem: 'turn 1, error 0: "arrive" is not in the text' });
  });

  it("refuses two errors on the same words of one turn", () => {
    const result = assembleOralAssessment(
      TURNS,
      aDraft({
        errors: [
          { turn: 3, excerpt: "données arrive", correction: "données arrivent", rule: "accord" },
          { turn: 3, excerpt: "arrive en", correction: "arrivent en", rule: "accord" },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.problem).toMatch(/^turn 3, errors .* overlap$/u);
  });

  it("refuses an error on the examiner's turn, which is not the candidate's to correct", () => {
    const result = assembleOralAssessment(
      TURNS,
      aDraft({ errors: [{ turn: 0, excerpt: "Parlez", correction: "x", rule: "y" }] }),
    );
    expect(result).toEqual({ ok: false, problem: "error 0: turn 0 is the examiner's, not the candidate's" });
  });

  it("refuses an error naming a turn the session does not have", () => {
    const result = assembleOralAssessment(
      TURNS,
      aDraft({ errors: [{ turn: 9, excerpt: "x", correction: "x", rule: "y" }] }),
    );
    expect(result).toEqual({ ok: false, problem: "error 0: there is no turn 9" });
  });

  it("refuses a missing word quoted from the examiner, or from words the candidate never said", () => {
    const words = aDraft().missingWords;
    expect(assembleOralAssessment(TURNS, aDraft({ missingWords: [...words.slice(0, 4), aWord(2, "défi")] }))).toEqual({
      ok: false,
      problem: "missing word 4: turn 2 is the examiner's, not the candidate's",
    });
    expect(
      assembleOralAssessment(TURNS, aDraft({ missingWords: [aWord(1, "des crédits"), ...words.slice(1)] })),
    ).toEqual({ ok: false, problem: 'missing word 0: "des crédits" is not in turn 1' });
  });
});

describe("checkOralAssessment", () => {
  const placed = (): OralAssessment => {
    const result = assembleOralAssessment(TURNS, aDraft());
    if (!result.ok) throw new Error(result.problem);
    return result.assessment;
  };

  it("accepts a report placed over the same turns", () => {
    expect(checkOralAssessment(TURNS, placed())).toBeNull();
  });

  it("refuses a range that no longer fits its turn", () => {
    const report = { ...placed(), errors: [{ turn: 1, start: 0, end: 500, correction: "x", rule: "y" }] };
    expect(checkOralAssessment(TURNS, report)).toMatch(/^turn 1, error 0: \[0, 500\)/u);
  });

  it("refuses an error on an examiner's turn, or on a turn that is gone", () => {
    const onExaminer = { ...placed(), errors: [{ turn: 2, start: 0, end: 3, correction: "x", rule: "y" }] };
    expect(checkOralAssessment(TURNS, onExaminer)).toBe("error 0: turn 2 is the examiner's, not the candidate's");
    expect(checkOralAssessment(TURNS.slice(0, 2), placed())).toBe("error 0: there is no turn 3");
  });

  it("refuses a missing word whose sentence is not in its turn", () => {
    const report = placed();
    const words = [{ ...(report.missingWords[0] as OralAssessment["missingWords"][number]), turn: 3 }, ...report.missingWords.slice(1)];
    expect(checkOralAssessment(TURNS, { ...report, missingWords: words })).toBe(
      'missing word 0: "je travaille sur le budget" is not in turn 3',
    );
  });
});

describe("oralAssessmentDraftSchema", () => {
  it("accepts a whole draft", () => {
    expect(oralAssessmentDraftSchema.safeParse(aDraft()).success).toBe(true);
  });

  it("refuses a fix on an oral sub-skill, which no item in the bank drills", () => {
    const fixes = [aFix("agreement"), aFix("agreement"), { ...aFix("agreement"), subSkill: "fluency-and-hesitation" }];
    expect(oralAssessmentDraftSchema.safeParse({ ...aDraft(), fixes }).success).toBe(false);
  });

  it("takes fewer fixes and words from a short session, but at least one of each, and no more than three and five (D127)", () => {
    const draft = aDraft();
    expect(oralAssessmentDraftSchema.safeParse({ ...draft, fixes: draft.fixes.slice(0, 1), missingWords: draft.missingWords.slice(0, 1) }).success).toBe(true);
    expect(oralAssessmentDraftSchema.safeParse({ ...draft, fixes: [] }).success).toBe(false);
    expect(oralAssessmentDraftSchema.safeParse({ ...draft, missingWords: [] }).success).toBe(false);
    expect(oralAssessmentDraftSchema.safeParse({ ...draft, fixes: [...draft.fixes, aFix("agreement")] }).success).toBe(false);
    expect(
      oralAssessmentDraftSchema.safeParse({ ...draft, missingWords: [...draft.missingWords, aWord(1, "budget")] }).success,
    ).toBe(false);
  });

  it("refuses an excerpt of only spaces or punctuation, which would mark a comma (D127)", () => {
    const draft = aDraft();
    const error = { turn: 1, excerpt: " , ", correction: "x", rule: "y" };
    expect(oralAssessmentDraftSchema.safeParse({ ...draft, errors: [error] }).success).toBe(false);
    const words = [{ ...aWord(1, "x"), excerpt: "  " }, ...draft.missingWords.slice(1)];
    expect(oralAssessmentDraftSchema.safeParse({ ...draft, missingWords: words }).success).toBe(false);
  });

  it("finds a missing word's sentence though the model straightened its apostrophe (D127)", () => {
    const turns = [...TURNS, turn("candidate", "J’ai vu que l’équipe était prête.")];
    const words = [aWord(4, "J'ai vu"), ...aDraft().missingWords.slice(1)];
    expect(assembleOralAssessment(turns, aDraft({ errors: [], missingWords: words })).ok).toBe(true);
  });

  it("refuses a missing criterion, a pronunciation criterion, and an error given as offsets", () => {
    const { task: _task, ...four } = criteria;
    expect(oralAssessmentDraftSchema.safeParse({ ...aDraft(), criteria: four }).success).toBe(false);
    expect(
      oralAssessmentDraftSchema.safeParse({
        ...aDraft(),
        criteria: { ...criteria, pronunciation: { band: "B", evidence: "x" } },
      }).success,
    ).toBe(false);
    expect(
      oralAssessmentDraftSchema.safeParse({
        ...aDraft(),
        errors: [{ turn: 1, start: 0, end: 2, correction: "x", rule: "y" }],
      }).success,
    ).toBe(false);
  });

  it("refuses a fractional or negative turn, and a blank word", () => {
    const draft = aDraft();
    const error = { turn: 1.5, excerpt: "x", correction: "x", rule: "y" };
    expect(oralAssessmentDraftSchema.safeParse({ ...draft, errors: [error] }).success).toBe(false);
    expect(oralAssessmentDraftSchema.safeParse({ ...draft, errors: [{ ...error, turn: -1 }] }).success).toBe(false);
    const words = [{ ...aWord(1, "x"), word: "  " }, ...draft.missingWords.slice(1)];
    expect(oralAssessmentDraftSchema.safeParse({ ...draft, missingWords: words }).success).toBe(false);
  });
});

describe("oralAssessmentSchema", () => {
  it("accepts a placed report", () => {
    const result = assembleOralAssessment(TURNS, aDraft());
    if (!result.ok) throw new Error(result.problem);
    expect(oralAssessmentSchema.safeParse(result.assessment).success).toBe(true);
  });

  it("refuses an error given as an excerpt rather than offsets", () => {
    expect(oralAssessmentSchema.safeParse(aDraft()).success).toBe(false);
  });
});
