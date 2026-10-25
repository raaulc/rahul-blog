// Builds the Pagefind search index over the generated HTML after every build.
import { fileURLToPath } from 'node:url';
import * as pagefind from 'pagefind';

export default function pagefindIntegration() {
  return {
    name: 'pagefind',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const site = fileURLToPath(dir);
        const { index } = await pagefind.createIndex({});
        const { page_count } = await index.addDirectory({ path: site });
        await index.writeFiles({ outputPath: `${site}/pagefind` });
        await pagefind.close();
        logger.info(`indexed ${page_count} pages`);
      },
    },
  };
}
