import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // The concurrency test relies on real overlapping requests hitting a
    // real Postgres connection; running test files in parallel workers adds
    // unrelated interleaving noise for no benefit at this suite's size.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
})
