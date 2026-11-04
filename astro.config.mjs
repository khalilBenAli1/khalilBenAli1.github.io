// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://khalilbenali1.github.io',
  output: 'static',
  // Each worktree keeps its own optimizer cache even when dependencies are shared.
  vite: { cacheDir: '.astro/vite-cache' },
});
