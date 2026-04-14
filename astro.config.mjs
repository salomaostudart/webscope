// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://webscope.sal.dev.br',
  output: 'static',
  prefetch: {
    defaultStrategy: 'hover',
    prefetchAll: false,
  },
});
