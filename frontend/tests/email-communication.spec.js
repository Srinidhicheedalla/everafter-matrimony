// Stage 10 - Email / Communication Testing (frontend/tests/email-communication.spec.js)
// Honest scope: no email system exists. These tests prove the gap (read-only scans + 404 probes)
// and validate the in-app communication that does exist. Gaps appear as annotations in the HTML report.
import { test, expect, request as pwRequest } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:5000/api';
const PASSWORD = 'Test@123';
const STAMP = Date.now();
const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'backend');
const MAIL_WORDS = /nodemailer|createTransport|sendMail|smtp|sendgrid|mailgun|postmark|client-ses|resend|emailjs|mailjet|sendinblue|twilio/i;

let api;
let seq = 0;

function gap(description) {
  test.info().annotations.push({ type: 'implementation-gap', description });
}

async function call(method, route, data) {
  const response = await api[method](API_URL + route, data === undefined ? {} : { data });
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch (error) { body = null; }
  return { status: response.status(), body, text };
}

async function createUser(label) {
  seq += 1;
  const user = { fullName: `Comm ${label} ${STAMP}-${seq}`, email: `comm.${label}.${STAMP}.${seq}@gmail.com`, password: PASSWORD };
  const reg = await call('post', '/auth/register', user);
  expect(reg.status, reg.text).toBe(201);
  const login = await call('post', '/auth/login', { email: user.email, password: user.password });
  expect(login.status, login.text).toBe(200);
  return { ...user, id: reg.body.userId };
}

function backendFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.endsWith('.db')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...backendFiles(full));
    else if (/\.(js|json)$/.test(entry.name) && entry.name !== 'package-lock.json') out.push(full);
  }
  return out;
}

test.beforeAll(async () => { api = await pwRequest.newContext(); });
test.afterAll(async () => { await api.dispose(); });

test('COMM-01: backend declares no email/SMS library', async () => {
  gap('No email provider dependency in backend/package.json.');
  const pkg = JSON.parse(fs.readFileSync(path.join(BACKEND_DIR, 'package.json'), 'utf8'));
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  expect(deps.filter((name) => MAIL_WORDS.test(name))).toEqual([]);
});

test('COMM-02: backend source contains no mail-sending code', async () => {
  gap('No sendMail/createTransport/SMTP code in any backend source file.');
  const hits = backendFiles(BACKEND_DIR).filter((file) => MAIL_WORDS.test(fs.readFileSync(file, 'utf8')));
  expect(hits).toEqual([]);
});

[
  ['post', '/auth/forgot-password'],
  ['post', '/auth/reset-password'],
  ['post', '/auth/verify-email'],
  ['get', '/notifications'],
  ['get', '/notification/1'],
].forEach(([method, route], index) => {
  test(`COMM-0${index + 3}: ${method.toUpperCase()} ${route} does not exist (404)`, async () => {
    gap(`Endpoint ${route} is not implemented.`);
    const r = await call(method, route, method === 'post' ? { email: 'nobody@gmail.com' } : undefined);
    expect(r.status).toBe(404);
  });
});

test('COMM-08: registration sends no verification step; the account works immediately', async () => {
  gap('No email verification: a new account can log in right after registering.');
  seq += 1;
  const user = { fullName: `Comm verify ${STAMP}-${seq}`, email: `comm.verify.${STAMP}.${seq}@gmail.com`, password: PASSWORD };
  const reg = await call('post', '/auth/register', user);
  expect(reg.status).toBe(201);
  expect(Object.keys(reg.body).sort()).toEqual(['message', 'success', 'userId']);
  expect(reg.text).not.toMatch(/verif|otp|confirm|email sent/i);
  const login = await call('post', '/auth/login', { email: user.email, password: user.password });
  expect(login.status).toBe(200);
});

test('COMM-09: /notifications page is a stub and makes no notification API calls', async ({ page }) => {
  gap('Notifications.jsx renders a heading only; there is no in-app notification feed.');
  const user = await createUser('notifpage');
  const apiCalls = [];
  page.on('request', (r) => { if (r.url().includes('/api/')) apiCalls.push(r.url()); });
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto(`${FRONTEND_URL}/login`);
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
  apiCalls.length = 0;
  await page.goto(`${FRONTEND_URL}/notifications`);
  await expect(page.getByText('Notifications Page')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(apiCalls.filter((url) => /notif/i.test(url))).toEqual([]);
});

test('COMM-10: receiver is informed of an interest, but the sender gets no acceptance notice', async () => {
  gap('Accepting an interest notifies nobody: the sender has no endpoint or page that reports it.');
  const sender = await createUser('sender');
  const receiver = await createUser('receiver');
  expect((await call('post', '/interest/send', { senderId: sender.id, receiverId: receiver.id })).body.success).toBe(true);

  const incoming = await call('get', '/interest/received/' + receiver.id);
  const interest = incoming.body.find((item) => item.senderId === sender.id);
  expect(interest).toMatchObject({ status: 'Pending', fullName: sender.fullName });

  expect((await call('put', '/interest/accept/' + interest.id)).body.success).toBe(true);

  const receiverMatches = await call('get', '/interest/matches/' + receiver.id);
  expect(receiverMatches.body.map((m) => m.fullName)).toContain(sender.fullName);
  expect((await call('get', '/interest/received/' + sender.id)).body).toEqual([]);
  expect((await call('get', '/interest/matches/' + sender.id)).body).toEqual([]);
});