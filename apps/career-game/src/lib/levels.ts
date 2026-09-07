export interface LevelDef {
  level: number;
  min: number; // total XP required to reach this level
  name: string;
}

/*
 * Levels — edit freely. Keep `min` ascending and start the first at 0.
 * Names are intentionally plain, not gamey.
 */
export const LEVELS: LevelDef[] = [
  { level: 1, min: 0, name: 'Getting into position' },
  { level: 2, min: 100, name: 'Building the base' },
  { level: 3, min: 250, name: 'Gaining momentum' },
  { level: 4, min: 500, name: 'Interview-shaped' },
  { level: 5, min: 1000, name: 'In the arena' },
];

export interface LevelProgress {
  current: LevelDef;
  next: LevelDef | null;
  intoLevel: number; // XP earned inside the current band
  span: number; // width of the current band (0 at max level)
  pct: number; // 0..1 toward next level
  toNext: number; // XP remaining to next level (0 at max)
}

export function levelForXp(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) idx = i;
  }
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  const intoLevel = xp - current.min;
  const span = next ? next.min - current.min : 0;
  const pct = next ? Math.min(1, intoLevel / span) : 1;
  const toNext = next ? Math.max(0, next.min - xp) : 0;
  return { current, next, intoLevel, span, pct, toNext };
}
