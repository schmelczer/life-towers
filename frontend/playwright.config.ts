import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests target the full stack served by docker-compose.dev.yml at
 * http://localhost:8000 (FastAPI serving both the API and the built SPA).
 * Override with PLAYWRIGHT_BASE_URL to point at a different deployment.
 *
 *   docker compose -f docker-compose.dev.yml up --build -d
 *   npm run test:e2e
 *   docker compose -f docker-compose.dev.yml down -v
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
