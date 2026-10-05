import { test, expect } from '@playwright/test';

// Browser-side edge cases, independent of the serial journey in homepage.spec.js

for (const corrupted of ['undefined', 'not-json', '{"id":']) {
  test(`App recovers from a corrupted saved session (${corrupted})`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate((value) => {
      localStorage.setItem('user', value);
      localStorage.setItem('token', 'stale');
    }, corrupted);

    await page.goto('/dashboard');

    // Used to be a blank page on every load; now it starts logged out
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  });
}

test('Double-clicking Register creates one account and shows no error', async ({ page }) => {
  const alerts = [];
  page.on('dialog', (dialog) => {
    alerts.push(dialog.message());
    dialog.accept();
  });

  await page.goto('/register');
  await page.getByLabel('Full Name').fill('Double Click');
  await page.getByLabel('Email').fill(`double${Date.now()}@gmail.com`);
  await page.getByLabel('Password').fill('Test@123');
  await page.getByRole('button', { name: 'Register' }).dblclick();

  await expect(page).toHaveURL(/\/login$/);
  expect(alerts).toEqual(['Registration Successful']);
});
