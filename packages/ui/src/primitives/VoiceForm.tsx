"use client";

import { type JSX, useEffect, useRef } from "react";

import { type VoiceLevels, easeLevel, voiceFormClass, voiceFormScale } from "./logic.js";

export type VoiceFormProps = {
  /** The two voices' levels now, read once a frame: the examiner's, and the candidate's microphone. */
  readonly levels: () => VoiceLevels;
  /** Drawn at rest and never moved: the caller's reduced-motion preference (§10.5). */
  readonly still: boolean;
};

/**
 * Studio mode's one visual (product-requirements.md §8.6, progress.md D184): a soft form of two layers, the
 * outer answering the examiner's voice and the inner the candidate's own. It is decorative, so it is hidden
 * from assistive technology; the screen says in words what is happening.
 *
 * The levels move it by `transform` alone, written to two custom properties once a frame rather than through
 * React state, so the screen never re-renders for them. A still form runs no loop: the global motion switch
 * turns off transitions and animations, and a frame loop is neither, so the caller says so.
 */
export const VoiceForm = ({ levels, still }: VoiceFormProps): JSX.Element => {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (element === null || still) return;
    let shown: VoiceLevels = { examiner: 0, candidate: 0 };
    let frame = 0;
    const draw = (): void => {
      const heard = levels();
      shown = { examiner: easeLevel(shown.examiner, heard.examiner), candidate: easeLevel(shown.candidate, heard.candidate) };
      element.style.setProperty("--pl-voice-examiner", String(voiceFormScale(shown.examiner)));
      element.style.setProperty("--pl-voice-candidate", String(voiceFormScale(shown.candidate)));
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      element.style.removeProperty("--pl-voice-examiner");
      element.style.removeProperty("--pl-voice-candidate");
    };
  }, [levels, still]);

  return (
    <div ref={root} className={voiceFormClass(still)} aria-hidden="true">
      <span className="pl-voice-form__examiner" />
      <span className="pl-voice-form__candidate" />
    </div>
  );
};
