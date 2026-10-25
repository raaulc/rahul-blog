// Policy applied around the model. Every decision is reported back with a reason code so it can be logged and audited.
import type { Model } from './model.ts';
import type { PlayerState } from './store.ts';

export interface GuardrailPolicy {
  /** Global blocklist by Steam item id (e.g. withdrawn or restricted titles). */
  blockedItemIds: string[];
  /** In-session intensity: above either limit, stop recommending and suggest a break. */
  maxSessionEvents: number;
  maxSessionMinutes: number;
  /** At most this many items sharing a primary genre in one response. */
  maxPerGenre: number;
}

export const DEFAULT_POLICY: GuardrailPolicy = {
  blockedItemIds: [],
  maxSessionEvents: 20,
  maxSessionMinutes: 180,
  maxPerGenre: 4,
};

export type GuardrailReason =
  | { code: 'cooldown'; sessionEvents: number; sessionMinutes: number }
  | { code: 'excluded'; count: number }
  | { code: 'diversity'; demoted: number }
  | { code: 'cold_start' };

export function cooldown(state: PlayerState | undefined, p: GuardrailPolicy): GuardrailReason | null {
  if (!state) return null;
  const sessionMinutes = state.session.reduce((t, e) => t + e.minutes, 0);
  const sessionEvents = state.session.length;
  return sessionEvents > p.maxSessionEvents || sessionMinutes > p.maxSessionMinutes
    ? { code: 'cooldown', sessionEvents, sessionMinutes }
    : null;
}

/** Items that must never be recommended to this player. */
export function exclusions(m: Model, state: PlayerState | undefined, p: GuardrailPolicy): Set<number> {
  const out = new Set<number>();
  for (const id of p.blockedItemIds) {
    const i = m.indexOf.get(id);
    if (i !== undefined) out.add(i);
  }
  if (state) {
    for (const i of state.prefs.excludedItems) out.add(i);
    const genres = new Set(state.prefs.excludedGenres);
    if (genres.size) m.items.forEach((it, i) => it.genres.some((g) => genres.has(g)) && out.add(i));
  }
  return out;
}

/** Greedy re-rank: walk the ranked list, defer items whose primary genre is already at the cap. */
export function diversify(m: Model, ranked: number[], k: number, maxPerGenre: number) {
  const counts = new Map<string, number>();
  const picked: number[] = [], deferred: number[] = [];
  for (const i of ranked) {
    if (picked.length === k) break;
    const g = m.items[i].genres[0] ?? 'unknown';
    if ((counts.get(g) ?? 0) >= maxPerGenre) {
      deferred.push(i);
      continue;
    }
    counts.set(g, (counts.get(g) ?? 0) + 1);
    picked.push(i);
  }
  // If the cap leaves gaps, fill them in ranked order rather than return fewer items.
  while (picked.length < k && deferred.length) picked.push(deferred.shift()!);
  const demoted = ranked.slice(0, k).filter((i) => !picked.includes(i)).length;
  return { items: picked, demoted };
}
