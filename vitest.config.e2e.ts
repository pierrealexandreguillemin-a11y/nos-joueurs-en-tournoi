import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    include: ['e2e/**/*.e2e.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // E2E run against deployed URL (override via E2E_BASE_URL env var)
    // E2E tests are separate from unit test pyramid — no coverage
  },
});
