export interface NavPillItem { label: string; href: string; active?: boolean }
export interface NavPillProps { items: NavPillItem[] }
export function NavPill(props: NavPillProps): JSX.Element;