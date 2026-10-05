// Set by frontend/playwright.config.js, which also starts the test servers.
// Under any other config every API call would go to "undefined/..." and the
// first test's setup would crash, making Playwright blame the wrong test.
export const API_URL = process.env.API_URL;

if (!API_URL) {
  throw new Error(
    'API_URL is not set. Run `npx playwright test` from the frontend folder so ' +
      'frontend/playwright.config.js is used (it starts the test backend and app).'
  );
}
