import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';

const root = path.resolve(__dirname);
const repo = path.resolve(__dirname, '../..');

/**
 * Phaser is shipped as the pre-minified ESM bundle (~1.2 MB) copied verbatim to
 * /vendor/phaser.esm.min.js and marked `external`. Rollup therefore never parses
 * Phaser, which keeps peak build memory < 500 MB (works on 1 GB CI boxes) and
 * makes the game chunk tiny and long-term cacheable.
 */
const PHASER_SRC = path.join(repo, 'node_modules/phaser/dist/phaser.esm.min.js');
const PHASER_URL = '../vendor/phaser.esm.min.js'; // relative to /assets/*.js

export default defineConfig(({ command }) => ({
  root,
  base: process.env.BASE_PATH ?? './',
  publicDir: path.join(root, 'public'),
  resolve: {
    alias: {
      '@emojiverse/core': path.join(repo, 'packages/core/src/index.ts'),
      '@emojiverse/content': path.join(repo, 'packages/content/src/index.ts'),
      '@emojiverse/game': path.join(repo, 'packages/game/src/index.ts'),
      '@emojiverse/ui': path.join(repo, 'packages/ui/src/index.ts'),
      // dev: real module; build: external URL (see rollupOptions)
      ...(command === 'build' ? {} : {}),
    },
  },
  optimizeDeps: { exclude: ['phaser'] },
  server: { host: '0.0.0.0', port: 5173, strictPort: true, fs: { allow: [repo] } },
  preview: { host: '0.0.0.0', port: 4173, strictPort: true },
  build: {
    outDir: path.join(root, 'dist'), emptyOutDir: true, target: 'es2020', sourcemap: false, minify: 'esbuild',
    rollupOptions: {
      external: ['phaser'],
      output: {
        paths: { phaser: PHASER_URL },
        format: 'es',
      },
    },
  },
  plugins: [
    {
      name: 'emojiverse-vendor-phaser',
      apply: 'build',
      generateBundle() {
        const out = path.join(root, 'dist/vendor'); mkdirSync(out, { recursive: true });
        copyFileSync(PHASER_SRC, path.join(out, 'phaser.core.esm.min.js'));
        // Phaser's ESM bundle only has named exports; our code uses `import Phaser from 'phaser'`.
        writeFileSync(path.join(out, 'phaser.esm.min.js'), "import * as P from './phaser.core.esm.min.js';\nexport * from './phaser.core.esm.min.js';\nexport default P;\n");
      },
      // rewrite the bare import in index.html output into an import map so `import 'phaser'` resolves at runtime
      transformIndexHtml(html) {
        return html.replace('<head>', `<head>\n  <script type="importmap">{"imports":{"phaser":"./vendor/phaser.esm.min.js"}}</script>`);
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['atlas/*.png', 'atlas/*.json', 'atlas/*.css', 'vendor/*.js'],
      manifest: {
        name: 'Emojiverse', short_name: 'Emojiverse', description: 'Match, evolve and discover every emoji.',
        theme_color: '#1a1730', background_color: '#1a1730', display: 'standalone', orientation: 'portrait', start_url: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,json,woff2}'], maximumFileSizeToCacheInBytes: 4 * 1024 * 1024 },
    }),
  ],
}));
