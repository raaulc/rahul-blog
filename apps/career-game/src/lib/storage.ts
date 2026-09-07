import type { CareerData } from './types';
import { seedData } from './seed';

const KEY = 'career-game:v1';

/** Merge unknown/partial saved data onto a fresh seed so schema changes are safe. */
function migrate(input: Partial<CareerData> | null | undefined): CareerData {
  const base = seedData();
  if (!input || typeof input !== 'object') return base;

  const inChoose = (input.choose ?? {}) as Partial<CareerData['choose']>;
  return {
    version: 1,
    see: { ...base.see, ...(input.see ?? {}) },
    choose: {
      ...base.choose,
      ...inChoose,
      weekPlan: { ...base.choose.weekPlan, ...(inChoose.weekPlan ?? {}) },
    },
    quests: Array.isArray(input.quests) ? input.quests : base.quests,
    completions: Array.isArray(input.completions) ? input.completions : [],
    focus: input.focus ?? null,
    weeklyReviews: Array.isArray(input.weeklyReviews) ? input.weeklyReviews : [],
    topics: Array.isArray(input.topics) ? input.topics : base.topics,
    settings: { ...base.settings, ...(input.settings ?? {}) },
  };
}

export function loadData(): CareerData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedData();
    return migrate(JSON.parse(raw) as Partial<CareerData>);
  } catch {
    return seedData();
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
export function saveData(data: CareerData): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable / full — non-fatal */
    }
  }, 150);
}

export function clearData(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function exportJson(data: CareerData): string {
  return JSON.stringify(data, null, 2);
}

export function importJson(text: string): CareerData {
  return migrate(JSON.parse(text) as Partial<CareerData>);
}
