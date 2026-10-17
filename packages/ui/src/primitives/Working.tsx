import type { JSX, ReactNode } from "react";

import { calloutState } from "./logic.js";

export type WorkingProps = {
  /** What is being waited for, such as "Getting feedback." A polite status, announced once. */
  readonly children: ReactNode;
  /**
   * The time waited so far, such as "Waiting 0:23". It changes every second, so it is
   * shown and never announced. Absent where the screen already shows a running clock.
   */
  readonly elapsed?: string;
  /**
   * The polite announcement of the time waited, such as "1 minute". The caller changes it
   * once a minute, as `Timer`'s, so a screen reader is not read every second (§11).
   */
  readonly announcement?: string;
  /**
   * Whether the message is the live status. `false` where the screen keeps its own status line
   * mounted throughout, so the wait is heard as it starts, and the message here is only shown.
   */
  readonly live?: boolean;
};

/**
 * A wait on something slow, such as a call to OpenAI (progress.md D237). The message, three
 * dots that bounce while it lasts and, when given, the time waited. Under reduced motion and
 * in exam mode the dots stand still, and the ticking time is what says the wait is alive
 * (§10.5: no loss of information).
 */
export const Working = ({ children, elapsed, announcement, live = true }: WorkingProps): JSX.Element => (
  <div className={`${calloutState("info").className} pl-working`}>
    <span className="pl-working__dots" aria-hidden="true">
      <span className="pl-working__dot" />
      <span className="pl-working__dot" />
      <span className="pl-working__dot" />
    </span>
    <div className="pl-callout__body">
      {live ? (
        <div role="status" aria-live="polite">
          {children}
        </div>
      ) : (
        <div>{children}</div>
      )}
      {elapsed === undefined ? null : (
        <p className="pl-working__elapsed" aria-hidden="true">
          {elapsed}
        </p>
      )}
      {announcement === undefined ? null : (
        <span className="pl-visually-hidden" aria-live="polite">
          {announcement}
        </span>
      )}
    </div>
  </div>
);
