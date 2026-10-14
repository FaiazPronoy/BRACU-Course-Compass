import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: './tests/globalSetup.ts',
    testTimeout: 20000,
    hookTimeout: 90000,
    fileParallelism: false,
  },
});
