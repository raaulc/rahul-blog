// Live demo endpoint. Stateless: the browser sends the player's history (lifetime hours per game) and the
// current session's plays; the function rebuilds the player state and runs the same recommend() as the
// realtime-recs service.
import type { APIRoute } from 'astro';
import { getModel } from '../../lib/recs/load.ts';
import { recommend } from '../../lib/recs/recommender.ts';
import type { PlayerState } from '../../lib/recs/store.ts';

export const prerender = false;

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

export const POST: APIRoute = async ({ request }) => {
  let body: { history?: unknown; session?: unknown; excludedGenres?: unknown; k?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'invalid JSON' });
  }
  const model = getModel();
  const list = (v: unknown) => (Array.isArray(v) ? v.slice(0, 50) : []) as { itemId?: unknown; minutes?: unknown }[];
  const now = Date.now();
  const state: PlayerState = {
    minutesByItem: new Map(),
    session: [],
    prefs: {
      excludedGenres: Array.isArray(body.excludedGenres) ? body.excludedGenres.filter((g) => typeof g === 'string').slice(0, 30) : [],
      excludedItems: [],
    },
  };
  const add = (p: { itemId?: unknown; minutes?: unknown }, maxMinutes: number) => {
    const item = model.indexOf.get(String(p.itemId));
    const minutes = Number(p.minutes);
    if (item === undefined || !(minutes > 0) || minutes > maxMinutes) return undefined;
    state.minutesByItem.set(item, (state.minutesByItem.get(item) ?? 0) + minutes);
    return { item, minutes };
  };
  for (const p of list(body.history)) add(p, 10_000 * 60);
  for (const p of list(body.session)) {
    const e = add(p, 24 * 60);
    if (e) state.session.push({ ...e, at: now });
  }
  const k = Math.min(Math.max(Number(body.k) || 8, 1), 20);
  const result = recommend(model, state, k);
  const t = result.timings;
  return json(200, result, {
    'server-timing': `retrieval;dur=${t.retrieval}, ranking;dur=${t.ranking}, policy;dur=${t.policy}, total;dur=${t.total}`,
    'cache-control': 'no-store',
  });
};
