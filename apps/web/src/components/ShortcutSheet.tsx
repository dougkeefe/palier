"use client";

import { Button, Dialog } from "@palier/ui";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useState } from "react";

import { shortcutGroups, shouldOpenSheet } from "../features/shortcuts/shortcuts";

/**
 * The shortcut sheet (product-requirements.md §11: "a documented shortcut sheet at `?`"). `?`
 * opens it from anywhere but a text field, and so does the footer's button, for anyone who
 * does not know the key. It is `@palier/ui`'s `Dialog`: the page behind is inert, Escape
 * closes it, and focus goes back to where it was. What it lists is the registry in
 * `features/shortcuts`, so a screen's new key is one row there.
 */
export function ShortcutSheet() {
  const t = useTranslations("shortcuts");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const dialogOpen = document.querySelector("dialog[open]") !== null;
      if (!shouldOpenSheet(event, event.target as HTMLElement | null, dialogOpen)) return;
      event.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button type="button" className="app-link app-link--button pl-focusable" aria-keyshortcuts="?" onClick={() => setOpen(true)}>
        {t("open")}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        heading={t("title")}
        actions={
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {t("close")}
          </Button>
        }
      >
        <p>{t("intro")}</p>
        {shortcutGroups().map((group) => (
          <section key={group.scope} className="app-shortcuts">
            <h3 className="app-step-heading">{t(`scope_${group.scope}`)}</h3>
            <dl className="app-shortcuts__list">
              {group.shortcuts.map((shortcut) => (
                <div key={shortcut.does} className="app-shortcuts__row">
                  <dt>
                    {shortcut.keys.map((key, index) => (
                      <Fragment key={key}>
                        {index > 0 ? ` ${t("keysOr")} ` : null}
                        <kbd className="app-kbd">{t(`key_${key}`)}</kbd>
                      </Fragment>
                    ))}
                  </dt>
                  <dd>{t(shortcut.does)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </Dialog>
    </>
  );
}
