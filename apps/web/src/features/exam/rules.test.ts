import pscSleProfile from "@palier/content/profiles/psc-sle.json";
import type { ExamForm } from "@palier/domain";
import { formId, parseExamProfileOrThrow } from "@palier/domain";
import { FIXTURE_BANK } from "@palier/testing/in-memory";
import { describe, expect, it } from "vitest";

import {
  AMBER_MS,
  CHECKPOINT_EVERY_MS,
  EXTRA_TIME,
  RED_MS,
  announcedMinutes,
  checkpointDue,
  clockText,
  clockTone,
  expired,
  limitMs,
  remainingMs,
  variantChoices,
} from "./rules";

const PROFILE = parseExamProfileOrThrow(pscSleProfile);
const [FORM] = FIXTURE_BANK.forms ?? [];
if (FORM === undefined) throw new Error("the fixture bank ships forms");

describe("the time limit", () => {
  it("is the form's minutes, stretched by the extra-time allowance", () => {
    const form: ExamForm = { ...FORM, timeLimitMinutes: 90 };
    expect(limitMs(form)).toBe(90 * 60_000);
    expect(limitMs(form, EXTRA_TIME)).toBe(135 * 60_000);
  });

  it("leaves time remaining that never goes below zero, and has expired only at zero", () => {
    expect(remainingMs(60_000, 15_000)).toBe(45_000);
    expect(remainingMs(60_000, 90_000)).toBe(0);
    expect(expired(1)).toBe(false);
    expect(expired(0)).toBe(true);
  });
});

describe("clockTone", () => {
  it("is normal above ten minutes, amber from ten minutes, red from two (§8.4)", () => {
    expect(clockTone(AMBER_MS + 1)).toBe("normal");
    expect(clockTone(AMBER_MS)).toBe("warning");
    expect(clockTone(RED_MS + 1)).toBe("warning");
    expect(clockTone(RED_MS)).toBe("urgent");
    expect(clockTone(0)).toBe("urgent");
  });

  it("puts the thresholds at ten and two minutes", () => {
    expect(AMBER_MS).toBe(600_000);
    expect(RED_MS).toBe(120_000);
  });
});

describe("clockText", () => {
  it("shows minutes and seconds, minutes past sixty included", () => {
    expect(clockText(90 * 60_000)).toBe("90:00");
    expect(clockText(61_000)).toBe("1:01");
  });

  it("rounds up, so it reads 0:00 only once time has run out", () => {
    expect(clockText(400)).toBe("0:01");
    expect(clockText(0)).toBe("0:00");
    expect(clockText(-5)).toBe("0:00");
  });
});

describe("announcedMinutes", () => {
  it("changes only at whole-minute boundaries, so the live region speaks once a minute (§11)", () => {
    expect(announcedMinutes(10 * 60_000)).toBe(10);
    expect(announcedMinutes(9 * 60_000 + 1)).toBe(10);
    expect(announcedMinutes(9 * 60_000)).toBe(9);
    expect(announcedMinutes(-1)).toBe(0);
  });
});

describe("checkpointDue", () => {
  it("is due once the checkpoint interval of exam time has passed since the last write", () => {
    expect(checkpointDue(0, CHECKPOINT_EVERY_MS - 1)).toBe(false);
    expect(checkpointDue(0, CHECKPOINT_EVERY_MS)).toBe(true);
  });
});

describe("variantChoices", () => {
  const form = (id: string, skill: "reading" | "writing", mode: "supervised" | "unsupervised", version = 1): ExamForm => ({
    ...FORM,
    id: formId(id),
    skill,
    mode,
    version,
  });

  it("lists every profile variant, in the profile's order, each with its form", () => {
    const forms = [
      form("ws", "writing", "supervised"),
      form("rs", "reading", "supervised"),
      form("ru", "reading", "unsupervised"),
      form("wu", "writing", "unsupervised"),
    ];
    const choices = variantChoices(PROFILE, forms, "fr");
    expect(choices.map((c) => c.name)).toEqual(Object.keys(PROFILE.variants));
    expect(choices.map((c) => c.form?.id)).toEqual(["rs", "ru", "ws", "wu"]);
  });

  it("keeps a variant with no form in this bank, as unavailable", () => {
    const choices = variantChoices(PROFILE, [form("ru", "reading", "unsupervised")], "fr");
    expect(choices.find((c) => c.name === "reading-supervised")?.form).toBeNull();
  });

  it("takes the highest version of two forms for one variant, and ignores another language's", () => {
    const forms = [
      form("old", "reading", "unsupervised", 1),
      form("new", "reading", "unsupervised", 2),
      { ...form("en", "reading", "unsupervised", 9), lang: "en" as const },
    ];
    expect(variantChoices(PROFILE, forms, "fr").find((c) => c.name === "reading-unsupervised")?.form?.id).toBe("new");
  });

  it("breaks a version tie by id, so the choice is the same on every load", () => {
    const forms = [form("b", "reading", "unsupervised"), form("c", "reading", "unsupervised"), form("a", "reading", "unsupervised")];
    expect(variantChoices(PROFILE, forms, "fr").find((c) => c.name === "reading-unsupervised")?.form?.id).toBe("a");
  });
});
