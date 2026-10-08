import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Cross-Browser Testing (QA stage #6)
//
// The same 7 user-facing flows run in Chromium, Firefox and WebKit
// (see cross-browser.config.js, which defines the three projects).
//
// Routes and selectors come from the real app:
//   /, /login, /register, /dashboard, /search, /interests, /matches,
//   /profile, /notifications
//   Login:    placeholders "Email" / "Password", button "Login"
//   Register: placeholders "Full Name" / "Email" / "Password"
//   Login success shows alert("Login Successful") and opens /dashboard
//   Logout:   "Logout" button in the navbar, then the app opens /login
//
// Database safety: nothing is deleted or edited. The tests use ONE fixed QA
// user. It is created the first time (register API) and simply reused on
// every later run and in every browser, so the database only ever gets one
// extra row from this file.
// ---------------------------------------------------------------------------

const API_URL = 'http://localhost:5000/api';

const QA_USER = {
  fullName: 'Cross Browser QA User',
  email: 'crossbrowser.qa@gmail.com',
  password: 'Test@123',
};

// Pages reachable from the dashboard "Quick Actions" links.
const DASHBOARD_PAGES = [
  { href: '/search', heading: /Search Members/ },
  { href: '/interests', heading: /Received Interests/ },
  { href: '/matches', heading: /My Matches/ },
  { href: '/profile', heading: /Complete Your Profile/ },
  { href: '/notifications', heading: /Notifications Page/ },
];

// ------------------------------ helpers ------------------------------------

// Accepts every alert() immediately (so the page never stays blocked) and
// remembers the messages so tests can check them.
function trackDialogs(page) {
  const messages = [];

  page.on('dialog', async function (dialog) {
    messages.push(dialog.message());
    await dialog.accept();
  });

  return messages;
}

// Remembers uncaught JavaScript errors thrown by the page.
function trackPageErrors(page) {
  const errors = [];

  page.on('pageerror', function (error) {
    errors.push(error.message);
  });

  return errors;
}

async function loginThroughUi(page) {
  await page.goto('/login');

  await page.getByPlaceholder('Email').fill(QA_USER.email);
  await page.getByPlaceholder('Password').fill(QA_USER.password);

  await page.getByRole('button', { name: /login/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
}

function navbar(page) {
  return page.locator('nav');
}

// --------------------------- one-time QA user -------------------------------

test.beforeAll(async function ({ request }) {
  const registerResponse = await request.post(API_URL + '/auth/register', {
    data: QA_USER,
  });

  // 201 = created now, 409 = already created by an earlier run.
  expect(
    [201, 409],
    'Could not create/find the QA user. Status: ' + registerResponse.status()
  ).toContain(registerResponse.status());

  const loginResponse = await request.post(API_URL + '/auth/login', {
    data: { email: QA_USER.email, password: QA_USER.password },
  });

  expect(
    loginResponse.status(),
    'QA user exists but its password does not match'
  ).toBe(200);
});

// ------------------------------- tests --------------------------------------

test('CB-01 Application loads successfully', async function ({ page }) {
  const errors = trackPageErrors(page);

  const response = await page.goto('/');

  expect(response.status()).toBeLessThan(400);

  await expect(page).toHaveTitle(/.+/);

  await expect(
    page.getByRole('heading', { level: 1, name: 'EverAfter Matrimony' })
  ).toBeVisible();

  await expect(page.getByText('Find Your Perfect Life Partner')).toBeVisible();

  await expect(
    navbar(page).getByRole('link', { name: 'Login' })
  ).toBeVisible();

  await expect(
    navbar(page).getByRole('link', { name: 'Register' })
  ).toBeVisible();

  expect(errors, 'JavaScript errors on the home page').toEqual([]);
});

test('CB-02 Login page loads', async function ({ page }) {
  const errors = trackPageErrors(page);

  await page.goto('/login');

  await expect(page).toHaveURL(/\/login$/);

  await expect(
    page.getByRole('heading', { name: 'Login', exact: true })
  ).toBeVisible();

  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect(page.getByPlaceholder('Password')).toBeVisible();

  await expect(
    page.getByRole('button', { name: /login/i })
  ).toBeVisible();

  expect(errors, 'JavaScript errors on the login page').toEqual([]);
});

test('CB-03 Registration page loads', async function ({ page }) {
  const errors = trackPageErrors(page);

  await page.goto('/register');

  await expect(page).toHaveURL(/\/register$/);

  await expect(
    page.getByRole('heading', { name: 'Create Account' })
  ).toBeVisible();

  await expect(page.getByPlaceholder('Full Name')).toBeVisible();
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect(page.getByPlaceholder('Password')).toBeVisible();

  // Typing works in every browser (nothing is submitted).
  await page.getByPlaceholder('Full Name').fill('Typing Check');
  await expect(page.getByPlaceholder('Full Name')).toHaveValue('Typing Check');

  expect(errors, 'JavaScript errors on the register page').toEqual([]);
});

test('CB-04 Valid login works and keeps the session', async function ({
  page,
}) {
  const dialogs = trackDialogs(page);

  await loginThroughUi(page);

  expect(dialogs).toContain('Login Successful');

  // The app stores the session in localStorage ("token" and "user").
  const session = await page.evaluate(function () {
    return {
      token: localStorage.getItem('token'),
      user: localStorage.getItem('user'),
    };
  });

  expect(session.token, 'token missing from localStorage').toBeTruthy();

  const savedUser = JSON.parse(session.user);

  expect(savedUser.email).toBe(QA_USER.email);
  expect(savedUser.fullName).toBe(QA_USER.fullName);
});

test('CB-05 Dashboard loads after login', async function ({ page }) {
  const errors = trackPageErrors(page);
  trackDialogs(page);

  await loginThroughUi(page);

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Welcome, ' + QA_USER.fullName + ' 👋',
    })
  ).toBeVisible();

  await expect(page.getByText(QA_USER.email, { exact: true })).toBeVisible();

  await expect(page.getByText('Total Members')).toBeVisible();
  await expect(page.getByText('Pending Interests')).toBeVisible();
  await expect(page.getByText('My Matches')).toBeVisible();
  await expect(page.getByText('Profile Completed')).toBeVisible();

  await expect(
    page.getByRole('heading', { name: 'Quick Actions' })
  ).toBeVisible();

  // Navbar switches to the logged-in version.
  await expect(
    navbar(page).getByRole('link', { name: 'Dashboard' })
  ).toBeVisible();

  await expect(
    navbar(page).getByRole('button', { name: 'Logout' })
  ).toBeVisible();

  expect(errors, 'JavaScript errors on the dashboard').toEqual([]);
});

test('CB-06 Navigation between important pages works', async function ({
  page,
}) {
  trackDialogs(page);

  await loginThroughUi(page);

  for (const target of DASHBOARD_PAGES) {
    await page.locator('a[href="' + target.href + '"]').click();

    await expect(page).toHaveURL(new RegExp(target.href + '$'));

    await expect(
      page.getByRole('heading', { level: 1, name: target.heading })
    ).toBeVisible();

    // Back to the dashboard through the navbar.
    await navbar(page).getByRole('link', { name: 'Dashboard' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(
      page.getByRole('heading', { name: 'Quick Actions' })
    ).toBeVisible();
  }

  // Browser Back / Forward buttons work with the app's routing.
  await page.locator('a[href="/search"]').click();
  await expect(page).toHaveURL(/\/search$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goForward();
  await expect(page).toHaveURL(/\/search$/);

  // Navbar "Home" link.
  await navbar(page).getByRole('link', { name: 'Home' }).click();

  await expect(page).toHaveURL(/\/$/);

  await expect(
    page.getByRole('heading', { level: 1, name: 'EverAfter Matrimony' })
  ).toBeVisible();
});

test('CB-07 Logout works and protects the dashboard', async function ({
  page,
}) {
  trackDialogs(page);

  await loginThroughUi(page);

  await navbar(page).getByRole('button', { name: 'Logout' }).click();

  await expect(page).toHaveURL(/\/login$/);

  const session = await page.evaluate(function () {
    return {
      token: localStorage.getItem('token'),
      user: localStorage.getItem('user'),
    };
  });

  expect(session.token, 'token should be removed on logout').toBeNull();
  expect(session.user, 'user should be removed on logout').toBeNull();

  await expect(
    navbar(page).getByRole('link', { name: 'Login' })
  ).toBeVisible();

  // A logged-out visitor is sent back to the login page.
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login$/);
});