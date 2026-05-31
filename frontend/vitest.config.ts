import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // The package ships only a `module` field, which Vite's resolver
      // can't always find — point it at the file directly.
      '@plausible-analytics/tracker':
        '@plausible-analytics/tracker/plausible.js',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.vitest.ts'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
