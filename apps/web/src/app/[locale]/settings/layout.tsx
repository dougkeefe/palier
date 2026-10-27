import { SettingsNav } from "../../../components/settings/SettingsNav";

// The settings area (progress.md D264): every screen under it carries the same menu above it, which the overview,
// whose cards are the menu, leaves out.
export default function SettingsLayout({ children }: LayoutProps<"/[locale]/settings">) {
  return (
    <>
      <SettingsNav />
      {children}
    </>
  );
}
