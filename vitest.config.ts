import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@emojiverse/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@emojiverse/content': path.resolve(__dirname, 'packages/content/src/index.ts'),
    },
  },
  test: {
    include: ['packages/**/*.test.ts'],
    environment: 'node',
    coverage: { provider: 'v8', include: ['packages/core/src/**'] },
  },
});
