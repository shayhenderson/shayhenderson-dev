// @ts-check
import { execFileSync } from 'node:child_process';
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const site = 'https://shayhenderson.dev';

// Source files behind each sitemap URL. A page's <lastmod> is the date of the
// last commit touching any of them, so it moves only when the content does.
const shared = ['src/data/profile.ts', 'src/layouts/Base.astro'];
const pageSources = {
  '/': ['src/pages/index.astro', ...shared],
  '/cv/': ['src/pages/cv.astro', 'src/data/schema.ts', ...shared],
};

/** @param {string[]} files */
function lastCommitDate(files) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...files], {
      encoding: 'utf8',
    }).trim();
    return out ? new Date(out).toISOString() : undefined;
  } catch {
    return undefined;
  }
}

// https://astro.build/config
export default defineConfig({
  site,
  trailingSlash: 'always',
  integrations: [
    sitemap({
      serialize(item) {
        const path = new URL(item.url).pathname;
        const files = pageSources[/** @type {keyof typeof pageSources} */ (path)];
        const lastmod = files && lastCommitDate(files);
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
