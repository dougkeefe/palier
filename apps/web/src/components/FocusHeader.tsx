import { useTranslations } from "next-intl";

import { Link } from "../i18n/navigation";
import { LanguageToggle } from "./LanguageToggle";

/**
 * Onboarding's header (progress.md D269): the wordmark and the language, and nothing else. A first-time user has no
 * destinations yet, nothing synced to show and no settings to change, so the app header's navigation, sync status and
 * gear are left out. The language stays, at the same place as the app header's: the interface is bilingual at equal
 * prominence (§12), and a francophone who lands on `/en` must be able to switch before answering anything.
 */
export function FocusHeader() {
  const t = useTranslations("nav");

  return (
    <header className="app-header app-header--focus">
      <Link href="/" className="app-header__brand pl-focusable">
        {t("brand")}
      </Link>
      <div className="app-header__tools">
        <LanguageToggle />
      </div>
    </header>
  );
}
