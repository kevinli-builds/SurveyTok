import { defineConfig } from 'vitest/config'

// Only run the source tests (pure lib/* logic). Excludes dist/ so compiled copies
// aren't picked up as a second, broken test suite.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    environment: 'node',
  },
})
