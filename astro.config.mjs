// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.tpm-bau.de',
  outDir: process.env.ASTRO_OUT_DIR || './dist',
  trailingSlash: 'always',
  // Klassen-Strategie: Scoped-Styles greifen auch, wenn eine Klasse an eine Kind-Komponente übergeben wird
  scopedStyleStrategy: 'class',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
});
