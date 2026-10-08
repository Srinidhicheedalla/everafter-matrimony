// =============================================================
// Stage 7 - Notification / Interest Notification Testing (UI)
// File: frontend/tests/notification.spec.js
//
// Honest scope:
//  - Notifications.jsx is a stub (renders "Notifications Page" only).
//  - No email functionality exists in the backend (code search: no matches).
//  - The backend interest API is already covered by api.spec.js, so this
//    file only exercises the UI: route protection, the stub page, and the
//    Send Interest -> Interests -> Accept / Reject UI flow.
// =============================================================
import { test, expect, request as pwRequest } from '@playwright/test';

// ---- Explicit URLs (no baseURL used anywhere) ----
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:5000';
const REGISTER_URL = `${BACKEND_URL}/api/auth/register`;
const LOGIN_URL = `${BACKEND_URL}/api/auth/login`;
const PASSWORD = 'Test@123';

const stamp = Date.now();

function makeUser(label) {
  return {
    fullName: `Notif ${label} ${stamp}`,
    email: `notif.${label.toLowerCase()}.${stamp}@gmail.com`,
    password: PASSWORD,
  };
}

// ---- Helpers ----
async function registerAndLogin(api, user) {
  const reg = await api.post(REGISTER_URL, { data: user });
  if (!reg.ok()) {
    throw new Error(`Register failed (${reg.status()}): ${await reg.text()}`);
  }
  const login = await api.post(LOGIN_URL, {
    data: { email: user.email, password: user.password },
  });
  if (!login.ok()) {
    throw new Error(`Login failed (${login.status()}): ${await login.text()}`);
  }
  const body = await login.json();
  return { ...user, id: body.user.id, token: body.token };
}

async function uiLogin(page, user) {
  await page.goto(`${FRONTEND_URL}/login`);
  await page.locator('input[type="email"]').first().fill(user.email);
  await page.locator('input[type="password"]').first().fill(user.password);
  await page
    .locator('button[type="submit"]')
    .or(page.getByRole('button', { name: /login|sign in/i }))
    .first()
    .click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

async function newLoggedInPage(browser, user) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await uiLogin(page, user);
  return { context, page };
}

function collectErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

// ---- Tests ----
test.describe('Notification / Interest Notification UI', () => {
  let api;
  let userA; // sender (accepted flow)
  let userB; // receiver (accepts)
  let userC; // sender (rejected flow)
  let userD; // receiver (rejects)

  test.beforeAll(async () => {
    api = await pwRequest.newContext();
    userA = await registerAndLogin(api, makeUser('A'));
    userB = await registerAndLogin(api, makeUser('B'));
    userC = await registerAndLogin(api, makeUser('C'));
    userD = await registerAndLogin(api, makeUser('D'));
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('NOTIF-01: unauthenticated user is redirected from /notifications to /login', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/notifications`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('NOTIF-02: authenticated user can open /notifications and sees the stub page', async ({ browser }) => {
    const { context, page } = await newLoggedInPage(browser, userA);
    await page.goto(`${FRONTEND_URL}/notifications`);
    await expect(page).toHaveURL(/\/notifications/);
    await expect(page.getByText('Notifications Page')).toBeVisible();
    await context.close();
  });

  test('NOTIF-03: no console or page errors while opening /notifications', async ({ browser }) => {
    const { context, page } = await newLoggedInPage(browser, userA);
    const errors = collectErrors(page);

    await page.goto(`${FRONTEND_URL}/notifications`);
    await expect(page.getByText('Notifications Page')).toBeVisible();
    expect(errors, `Unexpected errors: ${errors.join(' | ')}`).toEqual([]);
    await context.close();
  });

  test('NOTIF-04: sender sends interest via UI and the receiver sees it on /interests', async ({ browser }) => {
    // Sender: ViewProfile -> Send Interest
    const sender = await newLoggedInPage(browser, userA);
    await sender.page.goto(`${FRONTEND_URL}/view-profile/${userB.id}`);

    const sendResponse = sender.page.waitForResponse(
      (r) => r.url().includes('/api/interest/send') && r.request().method() === 'POST'
    );
    await sender.page.getByRole('button', { name: /send interest/i }).click();
    const res = await sendResponse;
    expect(res.status()).toBe(200);
    expect((await res.json()).success).toBe(true);
    await sender.context.close();

    // Receiver: Interests page shows the sender with Accept / Reject
    const receiver = await newLoggedInPage(browser, userB);
    await receiver.page.goto(`${FRONTEND_URL}/interests`);
    await expect(receiver.page.getByText(userA.fullName)).toBeVisible();
    await expect(receiver.page.getByRole('button', { name: /^accept$/i }).first()).toBeVisible();
    await expect(receiver.page.getByRole('button', { name: /^reject$/i }).first()).toBeVisible();
    await receiver.context.close();
  });

  test('NOTIF-05: receiver accepts the interest through the UI', async ({ browser }) => {
    const receiver = await newLoggedInPage(browser, userB);
    await receiver.page.goto(`${FRONTEND_URL}/interests`);
    await expect(receiver.page.getByText(userA.fullName)).toBeVisible();

    const acceptResponse = receiver.page.waitForResponse(
      (r) => r.url().includes('/api/interest/accept/') && r.request().method() === 'PUT'
    );
    await receiver.page.getByRole('button', { name: /^accept$/i }).first().click();
    const res = await acceptResponse;
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toMatch(/accepted/i);
    await receiver.context.close();
  });

  test('NOTIF-06: second receiver rejects an interest through the UI', async ({ browser }) => {
    // Sender C -> D
    const sender = await newLoggedInPage(browser, userC);
    await sender.page.goto(`${FRONTEND_URL}/view-profile/${userD.id}`);
    const sendResponse = sender.page.waitForResponse(
      (r) => r.url().includes('/api/interest/send') && r.request().method() === 'POST'
    );
    await sender.page.getByRole('button', { name: /send interest/i }).click();
    expect((await sendResponse).status()).toBe(200);
    await sender.context.close();

    // Receiver D rejects
    const receiver = await newLoggedInPage(browser, userD);
    await receiver.page.goto(`${FRONTEND_URL}/interests`);
    await expect(receiver.page.getByText(userC.fullName)).toBeVisible();

    const rejectResponse = receiver.page.waitForResponse(
      (r) => r.url().includes('/api/interest/reject/') && r.request().method() === 'PUT'
    );
    await receiver.page.getByRole('button', { name: /^reject$/i }).first().click();
    const res = await rejectResponse;
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toMatch(/rejected/i);
    await receiver.context.close();
  });

  test('NOTIF-07: no console or page errors during the Interests page flow', async ({ browser }) => {
    const { context, page } = await newLoggedInPage(browser, userB);
    const errors = collectErrors(page);

    await page.goto(`${FRONTEND_URL}/interests`);
    await page.waitForLoadState('networkidle');
    expect(errors, `Unexpected errors: ${errors.join(' | ')}`).toEqual([]);
    await context.close();
  });
});