import type { CareerData, Cadence, Completion } from './types';
import { addDays, inSameMonth, inSameWeek, todayStr, weekStartStr } from './date';

function sum(list: Completion[], keep: (c: Completion) => boolean): number {
  return list.reduce((t, c) => (keep(c) ? t + c.xp : t), 0);
}

export function xpToday(d: CareerData, ref = todayStr()): number {
  return sum(d.completions, (c) => c.date === ref);
}
export function xpThisWeek(d: CareerData, ref = todayStr()): number {
  return sum(d.completions, (c) => inSameWeek(c.date, ref));
}
export function xpThisMonth(d: CareerData, ref = todayStr()): number {
  return sum(d.completions, (c) => inSameMonth(c.date, ref));
}
export function xpTotal(d: CareerData): number {
  return sum(d.completions, () => true);
}

export function completionsOn(d: CareerData, date: string): Completion[] {
  return d.completions.filter((c) => c.date === date);
}

/** Is this quest already satisfied for its current period? */
export function isQuestDone(d: CareerData, questId: string, cadence: Cadence, ref = todayStr()): boolean {
  return d.completions.some((c) => {
    if (c.questId !== questId) return false;
    if (cadence === 'daily') return c.date === ref;
    if (cadence === 'weekly') return inSameWeek(c.date, ref);
    return true; // once
  });
}

/** The completion that satisfies a quest's current period (for undo). */
export function periodCompletion(
  d: CareerData,
  questId: string,
  cadence: Cadence,
  ref = todayStr(),
): Completion | undefined {
  const matches = d.completions.filter((c) => {
    if (c.questId !== questId) return false;
    if (cadence === 'daily') return c.date === ref;
    if (cadence === 'weekly') return inSameWeek(c.date, ref);
    return true;
  });
  return matches.sort((a, b) => b.at.localeCompare(a.at))[0];
}

export type StreakState = 'active-today' | 'pending-today' | 'broken';

export interface StreakInfo {
  count: number;
  state: StreakState;
}

/** Consecutive days with at least one completion, ending today or yesterday. */
export function streak(d: CareerData, ref = todayStr()): StreakInfo {
  const days = new Set(d.completions.map((c) => c.date));
  if (days.size === 0) return { count: 0, state: 'broken' };

  let anchor: string;
  let state: StreakState;
  if (days.has(ref)) {
    anchor = ref;
    state = 'active-today';
  } else if (days.has(addDays(ref, -1))) {
    anchor = addDays(ref, -1);
    state = 'pending-today';
  } else {
    return { count: 0, state: 'broken' };
  }

  let count = 0;
  let cursor = anchor;
  while (days.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return { count, state };
}

export function activeDaysInWeek(d: CareerData, ref = todayStr()): number {
  const target = weekStartStr(ref);
  const set = new Set<string>();
  for (const c of d.completions) {
    if (weekStartStr(c.date) === target) set.add(c.date);
  }
  return set.size;
}

export interface WeeklyStats {
  weekStart: string;
  questsCompleted: number;
  xp: number;
  activeDays: number;
  codingSessions: number;
  systemDesignSessions: number;
  videosRecorded: number; // all-time milestone count
  videosPublished: number; // all-time milestone count
}

export function weeklyStats(d: CareerData, weekStart: string): WeeklyStats {
  const inWeek = d.completions.filter((c) => weekStartStr(c.date) === weekStart);
  const days = new Set(inWeek.map((c) => c.date));
  return {
    weekStart,
    questsCompleted: inWeek.length,
    xp: inWeek.reduce((t, c) => t + c.xp, 0),
    activeDays: days.size,
    codingSessions: inWeek.filter((c) => c.category === 'coding').length,
    systemDesignSessions: inWeek.filter((c) => c.category === 'system-design').length,
    videosRecorded: d.topics.filter((t) => t.recorded).length,
    videosPublished: d.topics.filter((t) => t.published).length,
  };
}
