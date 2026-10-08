import { defineConfig, devices } from '@playwright/test';

// Separate config for Cross-Browser Testing (QA stage #6).
// The existing playwright.config.js is NOT changed.
//
// Run:
//   npx playwright test cross-browser.spec.js --config=cross-browser.config.js
//
// Reports and results go to their own folders so the output of the other
// automation (playwright-report, test-results) is never overwritten.

export default defineConfig({
  testDir: './tests',

  // Only the cross-browser spec can ever run with this config.
  testMatch: 'cross-browser.spec.js',

  outputDir: './test-results-cross-browser',

  fullyParallel: false,
  workers: 1,

  // Firefox and WebKit can be slower than Chromium.
  timeout: 60000,

  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: 'playwright-report-cross-browser',
        open: 'never',
      },
    ],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Same servers as the existing config. Already running servers are reused.
  webServer: [
    {
      command: 'cd ../backend && npm start',
      url: 'http://localhost:5000',
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});