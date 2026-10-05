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

test('Profile save shows why a field was rejected', async ({ page, request }) => {
  const { API_URL } = await import('./env.js');
  const email = `long${Date.now()}@gmail.com`;
  await request.post(`${API_URL}/auth/register`, {
    data: { fullName: 'Long Field', email, password: 'Test@123' },
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Test@123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/dashboard/);

  // Wait for the (empty) profile to load, or it would overwrite what we type
  const loaded = page.waitForResponse(/\/api\/profile\/\d+$/);
  await page.goto('/profile');
  await loaded;

  await page.getByPlaceholder('City').fill('x'.repeat(101));

  const dialog = page.waitForEvent('dialog');
  await page.getByRole('button', { name: 'Save Profile' }).click();

  const alert = await dialog;
  expect(alert.message()).toBe('City must be text of at most 100 characters.');
  await alert.accept();
});
