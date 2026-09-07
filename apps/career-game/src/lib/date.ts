import type { WeekDay } from './types';

export const WEEK_DAYS: WeekDay[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return todayStr(d);
}

/** Monday of the week containing `s` (local). */
export function weekStartStr(s: string = todayStr()): string {
  const d = parseDate(s);
  const mondayOffset = (d.getDay() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0
  d.setDate(d.getDate() - mondayOffset);
  return todayStr(d);
}

export function inSameWeek(a: string, b: string = todayStr()): boolean {
  return weekStartStr(a) === weekStartStr(b);
}

export function inSameMonth(a: string, b: string = todayStr()): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function weekDayIndex(s: string = todayStr()): number {
  return (parseDate(s).getDay() + 6) % 7; // Mon=0 ... Sun=6
}

export function prettyDate(s: string): string {
  return parseDate(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function prettyWeekRange(weekStart: string): string {
  const end = addDays(weekStart, 6);
  return `${prettyDate(weekStart)} – ${prettyDate(end)}`;
}
