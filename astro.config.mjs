import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import pagefind from './scripts/pagefind-integration.mjs';

export default defineConfig({
  site: 'https://www.raaulc.com',
  output: 'static',
  // Pages are prerendered; only /api/recommend runs on demand.
  adapter: vercel({
    // Model files the demo function reads at runtime (see scripts/sync-recs.sh).
    includeFiles: ['item_vectors.npy', 'knn_indices.npy', 'knn_values.npy', 'item_ctx.npy', 'item_genres.npy', 'items.json', 'ranker.json', 'metrics.json']
      .map((f) => `./recs-artifacts/${f}`),
  }),
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/og/') && !page.includes('/api/') }), pagefind()],
  markdown: {
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark-dimmed' }, defaultColor: false },
  },
});
