"use client";

import { Working } from "@palier/ui";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";

import { waitView } from "../../features/key/waiting";

/**
 * A call on the user's key being waited for (progress.md D237): the screen's own message, the
 * dots, and the time waited since this wait appeared, ticking every second so the user can see
 * it is still alive, even with motion off. Past a minute it says OpenAI can be slow. The clock
 * starts when the wait is shown: a request picked up again after leaving the screen counts from
 * the return. `live={false}` where the screen keeps its own status line mounted (the oral report,
 * D127), so the message is only shown here.
 */
export function Waiting({ children, live = true }: { children: ReactNode; live?: boolean }) {
  const t = useTranslations("common");
  const [since] = useState(() => performance.now());
  const [now, setNow] = useState(since);
  useEffect(() => {
    const timer = setInterval(() => setNow(performance.now()), 1_000);
    return () => clearInterval(timer);
  }, []);
  const view = waitView(now - since);
  return (
    <Working
      elapsed={t("waitingElapsed", { time: view.elapsed })}
      announcement={view.minutes === 0 ? "" : t("waitingMinutes", { minutes: view.minutes })}
      live={live}
    >
      <p>{children}</p>
      {view.slow ? <p>{t("waitingSlow")}</p> : null}
    </Working>
  );
}
