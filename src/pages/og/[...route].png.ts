import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { renderCard, type Card } from '../../lib/og.ts';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = (await getCollection('posts')).filter((p) => p.data.type !== 'page');
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
  const cards: { route: string; card: Card }[] = [
    ...posts.map((p) => ({
      route: `posts/${p.id}`,
      card: { kicker: 'writing', title: p.data.title, footer: `Rahul Rathod · ${fmt(p.data.date)}` },
    })),
    {
      route: 'projects/realtime-recs',
      card: { kicker: 'work', title: 'Real-time game recommender: prototype to production', footer: '+23% NDCG@10 · p99 3.97 ms · live demo' },
    },
    { route: 'projects', card: { kicker: 'work', title: 'Selected work: AI systems with measured results', footer: 'Rahul Rathod · AI engineer' } },
    { route: 'writing', card: { kicker: 'writing', title: 'Writing on AI system design', footer: 'Rahul Rathod · AI engineer' } },
  ];
  return cards.map(({ route, card }) => ({ params: { route }, props: { card } }));
};

export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await renderCard(props.card as Card)), { headers: { 'content-type': 'image/png' } });
