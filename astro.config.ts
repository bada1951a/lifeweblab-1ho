import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import partytown from '@astrojs/partytown';
import icon from 'astro-icon';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: 'https://lifeweblab.com',
  base: '/',
  trailingSlash: 'never',

  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    mdx(),
    icon(),
    partytown({
      config: { forward: ['dataLayer.push'] },
    }),
  ],

  vite: {
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
      },
    },
  },
});
