/**
 * Game-day helpers. A "game day" is the player's local calendar day.
 * We represent it as a Date pinned to local midnight (stored in UTC in the DB).
 */

const DEFAULT_TZ = "Asia/Kolkata";

/** Returns { y, m, d } for a given instant in a timezone. */
function ymdInTz(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "01";
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** Game day for `date` in the given timezone, as a Date at 00:00:00 UTC of that y-m-d. */
export function gameDay(date: Date = new Date(), timeZone: string = DEFAULT_TZ): Date {
  const { y, m, d } = ymdInTz(date, timeZone);
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}

/** ISO key "YYYY-MM-DD" for a game day. */
export function dayKey(date: Date = new Date(), timeZone: string = DEFAULT_TZ): string {
  const { y, m, d } = ymdInTz(date, timeZone);
  return `${y}-${m}-${d}`;
}

/** ISO week key "YYYY-Www". */
export function weekKey(date: Date = new Date(), timeZone: string = DEFAULT_TZ): string {
  const { y, m, d } = ymdInTz(date, timeZone);
  const dt = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
  const dayNum = (dt.getUTCDay() + 6) % 7; // Mon=0
  dt.setUTCDate(dt.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((dt.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Whole days between two game days (b - a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
