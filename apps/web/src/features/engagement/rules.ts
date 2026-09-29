/**
 * The engagement mechanics' product rules (product-requirements.md §9, progress.md D145, D159).
 * Palier's choices about how the streak and the milestones behave, **not exam rules**, so they
 * live here beside `features/exam/rules.ts` rather than in the exam profile (ADR 9).
 */

/** §9: "Freezes automatically for up to two missed days per month, applied silently." */
export const STREAK_FREEZES_PER_MONTH = 2;

/** §9's "1,000 items" milestone. */
export const MILESTONE_ITEMS = 1000;
