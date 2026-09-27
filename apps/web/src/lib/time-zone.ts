/**
 * The device's own time zone, for dates the islands format after hydration. next-intl's server
 * provider hands the client the time zone of wherever the page was rendered, and these pages are
 * static, so without this a history entry reads in the build machine's zone (UTC on Vercel), not
 * the user's.
 */
export const deviceTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;
