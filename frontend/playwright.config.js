import { defineConfig, devices } from '@playwright/test';

// Tests run their own backend + frontend on separate ports, with an in-memory DB
// that starts empty every run, so the dev servers and dev data are never touched.
const API_PORT = process.env.TEST_API_PORT ?? 5001;
const APP_PORT = process.env.TEST_APP_PORT ?? 5174;

const API_ORIGIN = `http://localhost:${API_PORT}`;
const APP_URL = `http://localhost:${APP_PORT}`;

// Read by tests/env.js
process.env.API_URL = `${API_ORIGIN}/api`;

export default defineConfig({
  testDir: './tests',

  fullyParallel: false,

  workers: 1,

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: APP_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: [
    {
      command: 'node server.js',
      cwd: '../backend',
      env: { PORT: String(API_PORT), DB_PATH: ':memory:' },
      url: API_ORIGIN,
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      // Real env vars beat frontend/.env.development, so the app talks to the test backend
      command: `npm run dev -- --port ${APP_PORT} --strictPort`,
      env: { VITE_API_URL: process.env.API_URL },
      url: APP_URL,
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
