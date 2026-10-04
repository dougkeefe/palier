/** @startingPoint section="Content" subtitle="Feature panel in tint, photo and deep tones" viewport="1000x460" */
export interface FeatureCardProps { tone?: 'tint'|'photo'|'deep'; title: string; chip?: string; image?: string; children?: React.ReactNode }
export function FeatureCard(props: FeatureCardProps): JSX.Element;