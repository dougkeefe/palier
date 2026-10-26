"use client";

import { SKILLS } from "@palier/domain";
import { Button, Callout, Card } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { changed, testDateFrom } from "../../features/settings/study-view";
import { Link } from "../../i18n/navigation";
import { DAILY_GOALS, type StudyProfile, readStudyProfile, writeStudyProfile } from "../../lib/study";
import { useContainer } from "../ContainerProvider";
import { NonAffiliation } from "../NonAffiliation";
import { ResultPicker, TargetPicker } from "../study/LevelPickers";

type Loaded =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "none" }
  | { readonly status: "ready"; readonly saved: StudyProfile };

/**
 * Your levels and goals (`/settings/study`, progress.md D259): the study profile onboarding set,
 * editable any time. The results held in each skill, each with its staircase; the target in each;
 * the daily goal (§8.1: "changeable any time"); and the test date. The page edits a copy and saves
 * it whole, and the profile is a setting, so it syncs, exports and wipes with everything else.
 * With no profile yet it offers onboarding instead.
 */
export function StudySettings() {
  const t = useTranslations("studySettings");
  const tStart = useTranslations("start");
  const tCommon = useTranslations("common");
  const container = useContainer();
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const [draft, setDraft] = useState<StudyProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<"saved" | "failed" | null>(null);

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    readStudyProfile(container.container.settings).then(
      (profile) => {
        if (!live) return;
        setLoaded(profile === null ? { status: "none" } : { status: "ready", saved: profile });
        setDraft(profile);
      },
      () => live && setLoaded({ status: "failed" }),
    );
    return () => {
      live = false;
    };
  }, [container]);

  if (container.status === "failed" || loaded.status === "failed") {
    return <Callout tone="incorrect">{tCommon("loadFailed")}</Callout>;
  }
  if (container.status !== "ready" || loaded.status === "loading") return <p role="status">{tCommon("loading")}</p>;
  if (loaded.status === "none" || draft === null) {
    return (
      <Card>
        <p>{t("none")}</p>
        <Link href="/start" className="pl-btn pl-btn--primary pl-focusable">
          {t("setUp")}
        </Link>
      </Card>
    );
  }

  const { bands, exemptBand } = container.container.profile;
  const edit = (over: Partial<StudyProfile>) => {
    setNotice(null);
    setDraft({ ...draft, ...over });
  };
  const save = async () => {
    setSaving(true);
    try {
      await writeStudyProfile(container.container.settings, draft);
      setLoaded({ status: "ready", saved: draft });
      setNotice("saved");
    } catch {
      setNotice("failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="app-stack"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <p>{t("intro")}</p>

      <Card>
        <h2>{t("resultsTitle")}</h2>
        <p className="app-muted">{t("resultsHint")}</p>
        <div className="app-levels">
          {SKILLS.map((skill) => (
            <ResultPicker
              key={skill}
              skill={skill}
              value={draft.current[skill]}
              target={draft.targets[skill]}
              bands={bands}
              exemptBand={exemptBand}
              onChange={(band) => edit({ current: { ...draft.current, [skill]: band } })}
            />
          ))}
        </div>
      </Card>

      <Card>
        <h2>{t("targetsTitle")}</h2>
        <p className="app-muted">{t("targetsHint")}</p>
        <div className="app-stack">
          {SKILLS.map((skill) => (
            <TargetPicker
              key={skill}
              skill={skill}
              value={draft.targets[skill]}
              onChange={(band) => edit({ targets: { ...draft.targets, [skill]: band } })}
            />
          ))}
        </div>
      </Card>

      <Card>
        <h2>{t("goalTitle")}</h2>
        <fieldset className="app-segmented">
          <legend className="app-segmented__legend">{tStart("goalHeading")}</legend>
          {DAILY_GOALS.map((minutes) => (
            <label key={minutes} className="app-segmented__option">
              <input
                type="radio"
                name="goal"
                value={minutes}
                checked={draft.dailyGoalMinutes === minutes}
                onChange={() => edit({ dailyGoalMinutes: minutes })}
              />
              {tStart("goalOption", { minutes })}
            </label>
          ))}
        </fieldset>
        <label className="app-field">
          <span>{tStart("testDateLabel")}</span>
          <input
            type="date"
            className="app-input"
            value={draft.testDate ?? ""}
            onChange={(event) => edit({ testDate: testDateFrom(event.target.value) })}
          />
        </label>
      </Card>

      <div className="app-actions">
        <Button type="submit" disabled={saving || !changed(loaded.saved, draft)}>
          {t("save")}
        </Button>
        <Link href="/home" className="app-link pl-focusable">
          {t("toToday")}
        </Link>
      </div>
      <p role="status" className="app-muted">
        {notice === "saved" ? t("saved") : ""}
      </p>
      {notice === "failed" ? <Callout tone="incorrect">{t("saveFailed")}</Callout> : null}

      <NonAffiliation />
    </form>
  );
}
