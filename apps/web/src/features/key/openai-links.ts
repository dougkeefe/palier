/**
 * OpenAI's own dashboard pages, which the key guide and the spend section link to. The
 * limits page is "the real protection" (product-requirements.md §8.10): a monthly budget
 * there bounds what a key can spend, which Palier's soft cap cannot (progress.md D104).
 */
export const OPENAI_BILLING = "https://platform.openai.com/settings/organization/billing/overview";
export const OPENAI_KEYS = "https://platform.openai.com/api-keys";
export const OPENAI_LIMITS = "https://platform.openai.com/settings/organization/limits";

/** Where an OpenAI account is signed in to, or made: the key guide's first step (progress.md D220). */
export const OPENAI_PLATFORM = "https://platform.openai.com";
