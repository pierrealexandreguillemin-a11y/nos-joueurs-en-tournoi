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
    setupFiles: ['./vitest.setup.ts'],
    // Pool settings are left at their defaults on purpose. Vitest 4.0.x gave
    // each worker 5 s to boot (WORKER_START_TIMEOUT, a hardcoded constant with
    // no config knob) and on Windows under CPU contention a cold worker missed
    // that window: the run aborted with "Timeout starting forks runner" after
    // silently collecting only part of the suite. Vitest 4.1 raised the same
    // constant to 90 s, which fixes it upstream — measured on 12 saturated
    // cores, forks in parallel now collects 28/28 files with 0 timeouts.
    // Before changing anything here, replay: node scripts/bench-vitest-pool.mjs
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
});
