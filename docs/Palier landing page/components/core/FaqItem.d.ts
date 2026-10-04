export interface FaqItemProps { question: string; open?: boolean; defaultOpen?: boolean; onToggle?: () => void; children?: React.ReactNode }
export function FaqItem(props: FaqItemProps): JSX.Element;