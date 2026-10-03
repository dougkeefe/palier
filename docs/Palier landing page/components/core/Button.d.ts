/** @startingPoint section="Actions" subtitle="Pill call-to-action with arrow disc" viewport="700x160" */
export interface ButtonProps { href?: string; variant?: 'light'|'dark'|'link'; arrow?: boolean; size?: 'md'|'sm'; children?: React.ReactNode; onClick?: () => void }
export function Button(props: ButtonProps): JSX.Element;