// @ts-check
import { defineConfig, devices } from '@playwright/test';

// Set BASE_URL to the deploy preview or production URL. Examples:
//   BASE_URL=https://soloassettracker.netlify.app npx playwright test
//   BASE_URL=https://deploy-preview-N--soloassettracker.netlify.app npx playwright test
// Default targets a local dev server (python3 -m http.server 8000).
const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';

export default defineConfig({
  testDir: './test/e2e',
  // Hellacious mode: 3 parallel browser windows, all hammering the app at once.
  workers: 3,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});
