/**
 * The fixed topic taxonomy from product-requirements.md 13.1 — twelve subjects
 * drawn from departmental life, chosen to be politically neutral and not to age
 * badly.
 */
export const TOPICS = [
  "human-resources",
  "finance-and-budgets",
  "it-and-digital",
  "service-delivery",
  "policy-and-legislation",
  "health-and-safety",
  "procurement",
  "communications",
  "project-management",
  "official-languages",
  "accessibility",
  "environment",
] as const;

export type Topic = (typeof TOPICS)[number];
