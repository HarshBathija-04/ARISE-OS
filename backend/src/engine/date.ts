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

/**
 * UTC instant corresponding to local wall-clock `HH:MM` on the calendar day
 * `dayKey` (YYYY-MM-DD) in `timeZone`. Implemented via offset probing with
 * Intl (no external tz library): guess UTC, measure the zone's rendering of
 * that instant, correct by the difference. Two passes handle DST edges.
 */
export function localTimeToUtcInstant(dayKeyStr: string, hhmm: string, timeZone: string): Date {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  let guess = new Date(`${dayKeyStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`);
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(guess);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    const rendered = Date.parse(
      `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:00.000Z`,
    );
    const target = Date.parse(`${dayKeyStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`);
    const diff = target - rendered;
    if (diff === 0) break;
    guess = new Date(guess.getTime() + diff);
  }
  return guess;
}
