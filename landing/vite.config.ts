/// <reference types="vitest/config" />
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Plugin, defineConfig } from 'vite';

const preloadedFonts = ['figtree-latin-wght-normal.woff2', 'figtree-latin-ext-wght-normal.woff2'];

/** Preloads Figtree so the first paint already uses it and the text never reflows. */
function preloadFonts(files: readonly string[]): Plugin {
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml(_html, context) {
      const assets = Object.values(context.bundle ?? {}).filter(
        (output) => output.type === 'asset',
      );
      return files.flatMap((file) => {
        const built = assets.find((asset) =>
          asset.originalFileNames.some((name) => name.endsWith(`/${file}`)),
        );
        if (!built) return [];
        return [
          {
            tag: 'link',
            attrs: {
              rel: 'preload',
              href: `/${built.fileName}`,
              as: 'font',
              type: 'font/woff2',
              crossorigin: '',
            },
            injectTo: 'head' as const,
          },
        ];
      });
    },
  };
}

/**
 * Static hosts answer an unknown path such as /features with 404.html; a copy of index.html there
 * lets the router show the right page (GitHub Pages and most static hosts).
 */
function spaFallback(): Plugin {
  let outDir = 'dist';
  return {
    name: 'spa-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async writeBundle() {
      await copyFile(path.join(outDir, 'index.html'), path.join(outDir, '404.html'));
    },
  };
}

export default defineConfig({
  // Pages live at real paths (/features), so assets load from the site root.
  base: '/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()], exclude: /[/\\]node_modules[/\\]/ }),
    tailwindcss(),
    preloadFonts(preloadedFonts),
    spaFallback(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
