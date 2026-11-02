import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const notes = (await getCollection('notes')).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  return rss({
    title: 'rahul, notes',
    description: 'Short notes on AI systems and engineering.',
    site: context.site,
    items: notes.map((n) => ({ title: n.data.title, pubDate: n.data.date, link: `/notes/${n.id}/`, categories: [n.data.category, ...n.data.tags] })),
  });
}
