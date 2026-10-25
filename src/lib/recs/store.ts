// Per-player state: play history (drives recommendations) and recent session events (drive guardrails).
// The interface is what a DynamoDB-backed store implements in the AWS deployment.
import type { HistoryEntry } from './ranking.ts';

export interface PlayEvent {
  item: number;
  minutes: number;
  at: number; // epoch ms
}

export interface PlayerPrefs {
  excludedGenres: string[];
  excludedItems: number[];
}

export interface PlayerState {
  minutesByItem: Map<number, number>;
  session: PlayEvent[]; // newest last, pruned to the session window
  prefs: PlayerPrefs;
}

export interface UserStore {
  get(userId: string): Promise<PlayerState | undefined>;
  recordPlay(userId: string, e: PlayEvent): Promise<PlayerState>;
  setPrefs(userId: string, prefs: PlayerPrefs): Promise<void>;
}

export const SESSION_WINDOW_MS = 60 * 60 * 1000;

/** Same transform as research/recs/data.py build_matrix. */
export const weightOf = (minutes: number) => Math.fround(Math.log1p(minutes / 60) + 1);
export const minutesOf = (weight: number) => Math.expm1(weight - 1) * 60;

export function historyOf(s: PlayerState): HistoryEntry[] {
  return [...s.minutesByItem].map(([item, minutes]) => ({ item, weight: weightOf(minutes) }));
}

const emptyState = (): PlayerState => ({
  minutesByItem: new Map(),
  session: [],
  prefs: { excludedGenres: [], excludedItems: [] },
});

export class InMemoryStore implements UserStore {
  private players = new Map<string, PlayerState>();

  async get(userId: string) {
    return this.players.get(userId);
  }

  async recordPlay(userId: string, e: PlayEvent) {
    const s = this.players.get(userId) ?? emptyState();
    s.minutesByItem.set(e.item, (s.minutesByItem.get(e.item) ?? 0) + e.minutes);
    s.session.push(e);
    const cutoff = e.at - SESSION_WINDOW_MS;
    while (s.session.length && s.session[0].at < cutoff) s.session.shift();
    this.players.set(userId, s);
    return s;
  }

  async setPrefs(userId: string, prefs: PlayerPrefs) {
    const s = this.players.get(userId) ?? emptyState();
    s.prefs = prefs;
    this.players.set(userId, s);
  }

  /** Load historical play (no session events), e.g. from the exported sample users. */
  seed(userId: string, history: HistoryEntry[]) {
    const s = emptyState();
    for (const h of history) s.minutesByItem.set(h.item, minutesOf(h.weight));
    this.players.set(userId, s);
  }
}
