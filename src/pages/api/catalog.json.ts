// Static list of the most-played games for the demo's picker, generated at build time.
import type { APIRoute } from 'astro';
import { getModel } from '../../lib/recs/load.ts';

export const GET: APIRoute = () => {
  const m = getModel();
  const games = [...m.popularOrder.slice(0, 1500)].map((i) => {
    const it = m.items[i];
    return { id: it.item_id, t: it.title, g: it.genres };
  });
  const genres = [...new Set(m.items.flatMap((it) => it.genres))].sort();
  return new Response(JSON.stringify({ games, genres }), { headers: { 'content-type': 'application/json' } });
};
