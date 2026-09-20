import type { JSX, ReactNode } from "react";

export type EmptyStateProps = {
  /** Supplied through i18n. */
  readonly heading: string;
  readonly children?: ReactNode;
  readonly action?: ReactNode;
  /** Coco, or another illustration (§10.1). */
  readonly illustration?: ReactNode;
};

/** The empty-queue / first-run surface. Coco lives here, never in exam mode. */
export const EmptyState = ({ heading, children, action, illustration }: EmptyStateProps): JSX.Element => (
  <section className="pl-empty">
    {illustration === undefined ? null : illustration}
    <h2 className="pl-empty__heading">{heading}</h2>
    {children === undefined ? null : <p className="pl-empty__body">{children}</p>}
    {action === undefined ? null : action}
  </section>
);
