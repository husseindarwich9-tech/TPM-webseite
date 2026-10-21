// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.tpm-bau.de',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
});
