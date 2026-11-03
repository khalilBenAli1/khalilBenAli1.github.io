import { defineConfig, devices } from 'playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  outputDir: './qa-shots/playwright-results',
  use: {
    baseURL: 'http://127.0.0.1:4192',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    // Astro documents --ignore-lock for an independent foreground preview.
    // The existing review server on 4188 keeps its own lock and lifecycle.
    command: 'npm run preview -- --host 127.0.0.1 --port 4192 --ignore-lock',
    url: 'http://127.0.0.1:4192',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
