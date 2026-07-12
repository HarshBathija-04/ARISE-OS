/** SOLO OS — date/time helpers (local timezone aware, ISO storage). */

export function nowIso(): string {
  return new Date().toISOString();
}

/** Local calendar date as YYYY-MM-DD. */
export function todayIso(): string {
  const d = new Date();
  return toLocalDateKey(d);
}

export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isSameDay(iso: string, dateKey: string): boolean {
  return toLocalDateKey(new Date(iso)) === dateKey;
}

export function daysAgoKey(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateKey(d);
}

/** Human date like "FRI 11 JUL 2026" (upper, terminal style). */
export function systemDateLabel(d: Date = new Date()): string {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** mm:ss from seconds. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** "2h 15m" style short duration from minutes. */
export function formatDurationMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
