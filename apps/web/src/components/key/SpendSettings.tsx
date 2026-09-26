"use client";

import type { SpendSummary } from "@palier/app";
import { Button, Callout, Card, Toast } from "@palier/ui";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";

import { OPENAI_LIMITS } from "../../features/key/openai-links";
import { capNotice, capShare, estimateText, moneyText, parseCap } from "../../features/key/spend-view";
import { useContainer } from "../ContainerProvider";

type CapChange = "none" | "capSaved" | "capRemoved" | "capBlank" | "capNotNumber" | "capNotPositive" | "capFailed";

/**
 * The spend half of `/settings/key` (product-requirements.md §8.10, progress.md D101–D104):
 * - the meter, this session, this week and this month, from the device's own cost ledger;
 * - the soft monthly cap, with its warning at 80 percent and at the cap, and the link to
 *   OpenAI's own limits, which is the real protection;
 * - the per-feature table, a typical use of each priced from `pricing.json`.
 *
 * Shown whether or not a key is held: what was spent stays spent after a key is removed.
 */
export function SpendSettings() {
  const t = useTranslations("key");
  const locale = useLocale();
  const container = useContainer();
  const id = useId();
  const [summary, setSummary] = useState<SpendSummary | null>(null);
  const [typed, setTyped] = useState("");
  const [changed, setChanged] = useState<CapChange>("none");

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    void container.container.useCases.spendSummary().then((s) => live && setSummary(s));
    return () => {
      live = false;
    };
  }, [container]);

  if (container.status !== "ready" || summary === null) return null;
  const { useCases } = container.container;
  // Pure over pricing.json, so it is read at render, not held in state.
  const costs = useCases.featureCosts();

  const money = (usd: number) => {
    const shown = moneyText(usd, locale);
    return shown.underCent ? t("spendUnderCent", { amount: shown.text }) : shown.text;
  };

  const changeCap = async (capUsd: number | null) => {
    try {
      await useCases.setSpendCap({ capUsd });
      setSummary(await useCases.spendSummary());
      setTyped("");
      setChanged(capUsd === null ? "capRemoved" : "capSaved");
    } catch {
      setChanged("capFailed");
    }
  };

  const onSave = () => {
    const input = parseCap(typed);
    if (!input.ok) {
      setChanged(input.error);
      return;
    }
    void changeCap(input.capUsd);
  };

  const notice = capNotice(summary.cap);
  const { totals } = summary;

  return (
    <>
      <Card>
        <h2>{t("spendTitle")}</h2>
        <div className="app-stack">
          <p>{t("spendIntro")}</p>
          <dl className="app-meter">
            <div className="app-meter__figure">
              <dt>{t("spendSession")}</dt>
              <dd>{money(totals.session)}</dd>
            </div>
            <div className="app-meter__figure">
              <dt>{t("spendWeek")}</dt>
              <dd>{money(totals.week)}</dd>
            </div>
            <div className="app-meter__figure">
              <dt>{t("spendMonth")}</dt>
              <dd>{money(totals.month)}</dd>
            </div>
          </dl>
          {totals.unpriced > 0 ? <Callout tone="info">{t("spendUnpriced", { count: totals.unpriced })}</Callout> : null}
          <p className="app-muted">{t("spendWhen")}</p>
          <p className="app-muted">{t("spendDevice")}</p>
        </div>
      </Card>

      <Card>
        <h2>{t("capTitle")}</h2>
        <div className="app-stack">
          <p>{t("capIntro")}</p>
          <p>
            {summary.capUsd === null
              ? t("capNone")
              : t("capSet", {
                  cap: moneyText(summary.capUsd, locale).text,
                  share: String(capShare(totals.month, summary.capUsd)),
                })}
          </p>
          {notice === null ? null : <Callout tone={notice.tone}>{t(notice.key)}</Callout>}
          <form
            className="app-stack"
            onSubmit={(event) => {
              event.preventDefault();
              onSave();
            }}
          >
            <label className="app-field" htmlFor={`${id}-cap`}>
              <span>{t("capLabel")}</span>
              <input
                id={`${id}-cap`}
                className="app-input app-input--amount"
                inputMode="decimal"
                autoComplete="off"
                aria-describedby={`${id}-cap-hint`}
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
              />
              <span id={`${id}-cap-hint`} className="app-muted">
                {t("capHint")}
              </span>
            </label>
            <div className="app-actions">
              <Button type="submit">{t("capSave")}</Button>
              {summary.capUsd === null ? null : (
                <Button variant="secondary" onClick={() => void changeCap(null)}>
                  {t("capRemove")}
                </Button>
              )}
            </div>
            {changed === "none" ? null : (
              <Toast tone={changed === "capSaved" || changed === "capRemoved" ? "info" : "incorrect"}>{t(changed)}</Toast>
            )}
          </form>
          <a href={OPENAI_LIMITS} className="app-link pl-focusable">
            {t("capLimits")}
          </a>
        </div>
      </Card>

      <Card>
        <h2>{t("featuresTitle")}</h2>
        <div className="app-stack">
          <p>{t("featuresIntro")}</p>
          <table className="app-table">
            <caption>{t("featuresCaption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("featuresFeature")}</th>
                <th scope="col">{t("featuresWhat")}</th>
                <th scope="col">{t("featuresCost")}</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((cost) => (
                <tr key={cost.feature}>
                  <th scope="row">{t(`feature_${cost.feature}`)}</th>
                  <td>{t(`featureUse_${cost.feature}`)}</td>
                  <td>{cost.estimateUsd === null ? t("featuresUnpriced") : estimateText(cost.estimateUsd, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="app-muted">{t("featuresComing")}</p>
        </div>
      </Card>
    </>
  );
}
