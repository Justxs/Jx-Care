/// <reference types="vitest/config" />
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
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
              href: `./${built.fileName}`,
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

export default defineConfig({
  // Relative asset paths, so the built site works from any folder or GitHub Pages path.
  base: './',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()], exclude: /[/\\]node_modules[/\\]/ }),
    tailwindcss(),
    preloadFonts(preloadedFonts),
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
