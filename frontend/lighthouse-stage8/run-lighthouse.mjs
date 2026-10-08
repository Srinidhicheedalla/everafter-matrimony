$code = @'
// Stage 9 - Data Validation Testing (frontend/tests/data-validation.spec.js)
// Valid data only is ever written to the DB, so database.spec.js invariants stay true.
// Known backend gaps are documented with test.fail() (expected failure = gap still present).
import { test, expect, request as pwRequest } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:5000';
const API_URL = BACKEND_URL + '/api';
const PASSWORD = 'Test@123';
const STAMP = Date.now();
const JWT_LIFETIME_SECONDS = 7 * 24 * 60 * 60;

const UNICODE_CITY = '\u0C39\u0C48\u0C26\u0C30\u0C3E\u0C2C\u0C3E\u0C26\u0C4D';
const UNICODE_TEXT = 'Telugu ' + UNICODE_CITY + ' emoji \u{1F60A}';

const FULL_PROFILE = {
  dob: '1997-08-15', gender: 'Female', height: '5.6', weight: '58',
  religion: 'Hindu', caste: 'Any', motherTongue: 'Telugu', education: 'M.Sc',
  occupation: 'Analyst', annualIncome: '9 LPA', city: 'Hyderabad',
  state: 'Telangana', country: 'India', aboutMe: 'About me text',
  familyDetails: 'Family details text', partnerPreference: 'Partner preference text',
  photo: '',
};
const PROFILE_FIELDS = Object.keys(FULL_PROFILE);

let api;
let mainUser;
let sequence = 0;

function makeUser(label, overrides = {}) {
  sequence += 1;
  return {
    fullName: `DV ${label} ${STAMP}-${sequence}`,
    email: `dv.${label}.${STAMP}.${sequence}@gmail.com`,
    password: PASSWORD,
    ...overrides,
  };
}

async function call(method, path, data) {
  const options = data === undefined ? {} : { data };
  const response = await api[method](API_URL + path, options);
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch (error) { body = null; }
  return { response, status: response.status(), body, text };
}

const registerUser = (u) =>
  call('post', '/auth/register', { fullName: u.fullName, email: u.email, password: u.password });
const loginUser = (email, password) => call('post', '/auth/login', { email, password });
const saveProfile = (userId, fields) => call('post', '/profile/save', { userId, ...fields });
const getProfile = (id) => call('get', '/profile/' + id);

async function createUser(label, overrides) {
  const user = makeUser(label, overrides);
  const reg = await registerUser(user);
  expect(reg.status, reg.text).toBe(201);
  const login = await loginUser(user.email, user.password);
  expect(login.status, login.text).toBe(200);
  return { ...user, id: reg.body.userId, token: login.body.token };
}

async function registerAndLogin(user) {
  const reg = await registerUser(user);
  expect(reg.status, reg.text).toBe(201);
  const login = await loginUser(user.email, user.password);
  expect(login.status, login.text).toBe(200);
  return login.body;
}

function trackDialogs(page) {
  const messages = [];
  page.on('dialog', async (dialog) => {
    messages.push(dialog.message());
    await dialog.accept();
  });
  return messages;
}

async function uiLogin(page, user) {
  await page.goto(`${FRONTEND_URL}/login`);
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

async function submitForm(page, urlPart, fields) {
  for (const [name, value] of Object.entries(fields)) {
    await page.locator(`input[name="${name}"]`).fill(value);
  }
  const responsePromise = page.waitForResponse(
    (r) => r.url().includes(urlPart) && r.request().method() === 'POST'
  );
  await page.locator('form button[type="submit"]').click();
  return responsePromise;
}

test.beforeAll(async () => {
  api = await pwRequest.newContext();
  mainUser = await createUser('main');
});

test.afterAll(async () => {
  await api.dispose();
});

test.describe('Registration data validation (API)', () => {
  const INVALID = [
    ['an empty body', {}],
    ['a missing fullName', { email: 'x@gmail.com', password: PASSWORD }],
    ['a missing email', { fullName: 'No Email', password: PASSWORD }],
    ['a missing password', { fullName: 'No Pass', email: 'x@gmail.com' }],
    ['an empty fullName', { fullName: '', email: 'x@gmail.com', password: PASSWORD }],
    ['an empty email', { fullName: 'Empty Email', email: '', password: PASSWORD }],
    ['an empty password', { fullName: 'Empty Pass', email: 'x@gmail.com', password: '' }],
    ['a null password', { fullName: 'Null Pass', email: 'x@gmail.com', password: null }],
  ];

  INVALID.forEach(([label, payload], index) => {
    test(`DV-REG-${String(index + 1).padStart(2, '0')}: register rejects ${label} with 400`, async () => {
      const r = await call('post', '/auth/register', payload);
      expect(r.status).toBe(400);
      expect(r.body).toEqual({ success: false, message: 'All fields are required.' });
    });
  });

  test('DV-REG-09: duplicate email is rejected with 409 and no userId', async () => {
    const r = await registerUser(mainUser);
    expect(r.status).toBe(409);
    expect(r.body).toEqual({ success: false, message: 'Email already exists.' });
  });

  test('DV-REG-10: successful register returns exactly success/message/userId', async () => {
    const user = makeUser('shape');
    const r = await registerUser(user);
    expect(r.status).toBe(201);
    expect(Object.keys(r.body).sort()).toEqual(['message', 'success', 'userId']);
    expect(r.body.success).toBe(true);
    expect(r.body.message).toBe('Registration Successful');
    expect(Number.isInteger(r.body.userId) && r.body.userId > 0).toBe(true);
    const login = await loginUser(user.email, user.password);
    expect(login.status).toBe(200);
    expect(login.body.user.id).toBe(r.body.userId);
  });
});

test.describe('Login data validation (API)', () => {
  const INVALID = [
    ['an empty body', () => ({})],
    ['a missing email', () => ({ password: PASSWORD })],
    ['a missing password', () => ({ email: mainUser.email })],
    ['an empty email', () => ({ email: '', password: PASSWORD })],
    ['an empty password', () => ({ email: mainUser.email, password: '' })],
  ];

  INVALID.forEach(([label, build], index) => {
    test(`DV-LOGIN-${String(index + 1).padStart(2, '0')}: login rejects ${label} with 400`, async () => {
      const r = await call('post', '/auth/login', build());
      expect(r.status).toBe(400);
      expect(r.body).toEqual({ success: false, message: 'Email and password are required.' });
    });
  });

  test('DV-LOGIN-06: SQL-injection style email is treated as plain text (404, no token)', async () => {
    const r = await loginUser("' OR '1'='1", PASSWORD);
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ success: false, message: 'User not found.' });
  });

  test('DV-LOGIN-07: SQL-injection style password is rejected (401, no token)', async () => {
    const r = await loginUser(mainUser.email, "' OR '1'='1");
    expect(r.status).toBe(401);
    expect(r.body.message).toBe('Invalid password.');
    expect(r.body.token).toBeUndefined();
  });

  test('DV-LOGIN-08: email lookup is case-sensitive (current behaviour)', async () => {
    test.info().annotations.push({
      type: 'note',
      description: 'Login with the upper-cased email returns 404. Emails differing only by case are distinct accounts.',
    });
    const r = await loginUser(mainUser.email.toUpperCase(), mainUser.password);
    expect(r.status).toBe(404);
    expect(r.body.message).toBe('User not found.');
  });
});

test.describe('Response data validation (API)', () => {
  test('DV-RESP-01: login response has the exact contract and a 7-day JWT', async () => {
    const r = await loginUser(mainUser.email, mainUser.password);
    expect(r.status).toBe(200);
    expect(r.response.headers()['content-type']).toContain('application/json');
    expect(Object.keys(r.body).sort()).toEqual(['message', 'success', 'token', 'user']);
    expect(Object.keys(r.body.user).sort()).toEqual(['email', 'fullName', 'id']);
    expect(Number.isInteger(r.body.user.id)).toBe(true);
    const payload = JSON.parse(Buffer.from(r.body.token.split('.')[1], 'base64url').toString('utf8'));
    expect(payload).toMatchObject({ id: mainUser.id, email: mainUser.email });
    expect(payload.exp - payload.iat).toBe(JWT_LIFETIME_SECONDS);
  });

  test('DV-RESP-02: /profile/all rows expose profile fields + userName/email and never a password', async () => {
    const saved = await saveProfile(mainUser.id, FULL_PROFILE);
    expect(saved.status).toBe(200);
    const r = await call('get', '/profile/all');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    for (const row of r.body) {
      expect('password' in row, 'password key leaked in /profile/all').toBe(false);
    }
    const mine = r.body.find((row) => row.userId === mainUser.id);
    expect(mine).toBeTruthy();
    for (const field of [...PROFILE_FIELDS, 'id', 'userId', 'userName', 'email']) {
      expect(Object.keys(mine), `missing field ${field}`).toContain(field);
    }
    expect(mine.userName).toBe(mainUser.fullName);
    expect(mine.email).toBe(mainUser.email);
  });
});

test.describe('Boundary and special-value validation (API)', () => {
  test('DV-BND-01: 1-character fullName is stored and returned unchanged', async () => {
    const body = await registerAndLogin(makeUser('b1', { fullName: 'A' }));
    expect(body.user.fullName).toBe('A');
  });

  test('DV-BND-02: 255-character fullName round-trips exactly', async () => {
    const name = 'N'.repeat(255);
    const body = await registerAndLogin(makeUser('b2', { fullName: name }));
    expect(body.user.fullName).toHaveLength(255);
    expect(body.user.fullName).toBe(name);
  });

  test('DV-BND-03: unicode and emoji fullName round-trips exactly', async () => {
    const name = 'DV Unicode ' + UNICODE_TEXT;
    const body = await registerAndLogin(makeUser('b3', { fullName: name }));
    expect(body.user.fullName).toBe(name);
  });

  test('DV-BND-04: plus-addressed email is stored exactly and can log in', async () => {
    const email = `dv+tag.${STAMP}.${Math.random().toString(36).slice(2, 8)}@gmail.com`;
    const body = await registerAndLogin(makeUser('b4', { email }));
    expect(body.user.email).toBe(email);
  });

  test('DV-BND-05: a password of exactly 72 characters works', async () => {
    const password = 'Aa1!'.repeat(18);
    expect(password).toHaveLength(72);
    await registerAndLogin(makeUser('b5', { password }));
  });

  test('DV-BND-06: a password with spaces and symbols works', async () => {
    await registerAndLogin(makeUser('b6', { password: 'P@ss w0rd!#$%^&*()_+' }));
  });

  test('DV-BND-07: a request body over the 100kb JSON limit is rejected with 413', async () => {
    const r = await call('post', '/auth/login', { email: 'x@gmail.com', password: 'p'.repeat(200000) });
    expect(r.status).toBe(413);
  });

  test('DV-BND-08: malformed JSON is rejected with 400', async () => {
    const response = await api.post(API_URL + '/auth/login', {
      data: '{"email": ',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
  });

  test('DV-BND-09: KNOWN GAP - a 1-character password should be rejected (backend has no password policy)', async () => {
    test.fail(true, 'Known gap: authController.register only checks that password is non-empty.');
    const r = await registerUser(makeUser('weak', { password: '1' }));
    expect(r.status).toBe(400);
  });
});

test.describe('Profile data validation and persistence (API)', () => {
  test.describe.configure({ mode: 'serial' });
  let owner;

  test.beforeAll(async () => {
    owner = await createUser('profile');
  });

  test('DV-PROF-01: first save creates the profile and every field persists', async () => {
    const save = await saveProfile(owner.id, FULL_PROFILE);
    expect(save.status).toBe(200);
    expect(save.body).toEqual({ success: true, message: 'Profile Saved Successfully' });
    const got = await getProfile(owner.id);
    expect(got.status).toBe(200);
    expect(got.body).toMatchObject({ ...FULL_PROFILE, userId: owner.id, userName: owner.fullName });
    expect(Number.isInteger(got.body.id)).toBe(true);
  });

  test('DV-PROF-02: second save updates only the changed field', async () => {
    const save = await saveProfile(owner.id, { ...FULL_PROFILE, city: 'Warangal' });
    expect(save.body).toEqual({ success: true, message: 'Profile Updated Successfully' });
    const got = await getProfile(owner.id);
    expect(got.body).toMatchObject({ ...FULL_PROFILE, city: 'Warangal' });
  });

  test('DV-PROF-03: repeated saves keep exactly one profile row per user', async () => {
    await saveProfile(owner.id, FULL_PROFILE);
    const all = await call('get', '/profile/all');
    expect(all.body.filter((row) => row.userId === owner.id)).toHaveLength(1);
  });

  test('DV-PROF-04: unicode and emoji profile values persist exactly', async () => {
    const fields = { ...FULL_PROFILE, city: UNICODE_CITY, aboutMe: UNICODE_TEXT };
    expect((await saveProfile(owner.id, fields)).status).toBe(200);
    const got = await getProfile(owner.id);
    expect(got.body.city).toBe(UNICODE_CITY);
    expect(got.body.aboutMe).toBe(UNICODE_TEXT);
  });

  test('DV-PROF-05: quotes, HTML and SQL-like text are stored literally and tables stay intact', async () => {
    const sqlText = "Robert'); DROP TABLE users;--";
    const mixed = '"quoted" & <b>bold</b> back\\slash';
    expect((await saveProfile(owner.id, { ...FULL_PROFILE, aboutMe: sqlText, familyDetails: mixed })).status).toBe(200);
    const got = await getProfile(owner.id);
    expect(got.body.aboutMe).toBe(sqlText);
    expect(got.body.familyDetails).toBe(mixed);
    expect((await loginUser(owner.email, owner.password)).status).toBe(200);
    expect((await call('get', '/profile/all')).status).toBe(200);
  });

  test('DV-PROF-06: a 5000-character aboutMe persists without truncation', async () => {
    const long = 'Lorem ipsum '.repeat(417).slice(0, 5000);
    expect(long).toHaveLength(5000);
    expect((await saveProfile(owner.id, { ...FULL_PROFILE, aboutMe: long })).status).toBe(200);
    const got = await getProfile(owner.id);
    expect(got.body.aboutMe).toHaveLength(5000);
    expect(got.body.aboutMe).toBe(long);
  });

  test('DV-PROF-07: clearing optional fields persists empty strings', async () => {
    await saveProfile(owner.id, { ...FULL_PROFILE, city: '', aboutMe: '' });
    const got = await getProfile(owner.id);
    expect(got.body.city).toBe('');
    expect(got.body.aboutMe).toBe('');
  });

  test('DV-PROF-08: numeric-looking text keeps leading zeros and trailing digits', async () => {
    await saveProfile(owner.id, { ...FULL_PROFILE, weight: '055', height: '5.10', annualIncome: '007' });
    const got = await getProfile(owner.id);
    expect(got.body).toMatchObject({ weight: '055', height: '5.10', annualIncome: '007' });
  });
});

test.describe('Path parameter validation (API)', () => {
  const BAD_IDS = ['abc', '-1', '0', encodeURIComponent('1 OR 1=1'), encodeURIComponent('1; DROP TABLE users')];

  BAD_IDS.forEach((id, index) => {
    test(`DV-ID-0${index + 1}: GET /profile/${id} returns an empty object, not an error`, async () => {
      const r = await call('get', '/profile/' + id);
      expect(r.status).toBe(200);
      expect(r.body).toEqual({});
    });
  });

  test('DV-ID-06: received interests for a non-numeric id is an empty list', async () => {
    const r = await call('get', '/interest/received/abc');
    expect(r.status).toBe(200);
    expect(r.body).toEqual([]);
  });

  test('DV-ID-07: matches for a non-numeric id is an empty list', async () => {
    const r = await call('get', '/interest/matches/abc');
    expect(r.status).toBe(200);
    expect(r.body).toEqual([]);
  });
});

test.describe('Interest data validation (API)', () => {
  let a;
  let b;

  test.beforeAll(async () => {
    a = await createUser('intA');
    b = await createUser('intB');
  });

  const INVALID = [
    ['an empty body', () => ({})],
    ['only senderId', () => ({ senderId: a.id })],
    ['only receiverId', () => ({ receiverId: b.id })],
    ['senderId 0 (falsy)', () => ({ senderId: 0, receiverId: b.id })],
  ];

  INVALID.forEach(([label, build], index) => {
    test(`DV-INT-0${index + 1}: send interest rejects ${label}`, async () => {
      const r = await call('post', '/interest/send', build());
      expect(r.body).toEqual({ success: false, message: 'Sender and Receiver are required' });
    });
  });

  test('DV-INT-05: string senderId equal to numeric receiverId is still a self-interest', async () => {
    const r = await call('post', '/interest/send', { senderId: String(a.id), receiverId: a.id });
    expect(r.body).toEqual({ success: false, message: 'You cannot send interest to yourself' });
  });

  test('DV-INT-06: stored interest has the expected fields, types and timestamp format', async () => {
    const sent = await call('post', '/interest/send', { senderId: a.id, receiverId: b.id });
    expect(sent.status).toBe(200);
    expect(sent.body.success).toBe(true);
    const received = await call('get', '/interest/received/' + b.id);
    expect(received.status).toBe(200);
    const row = received.body.find((item) => item.senderId === a.id);
    expect(row).toBeTruthy();
    expect(Object.keys(row).sort()).toEqual(['createdAt', 'fullName', 'id', 'receiverId', 'senderId', 'status']);
    expect(row.status).toBe('Pending');
    expect(row.fullName).toBe(a.fullName);
    expect(row.receiverId).toBe(b.id);
    expect(Number.isInteger(row.id)).toBe(true);
    expect(row.createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  for (const [number, action] of [['07', 'accept'], ['08', 'reject']]) {
    test(`DV-INT-${number}: KNOWN GAP - ${action} on a non-existent interest should not report success`, async () => {
      test.fail(true, `Known gap: ${action} runs an UPDATE that changes 0 rows but still returns success:true.`);
      const r = await call('put', `/interest/${action}/99999999`);
      expect(r.body.success).toBe(false);
    });
  }
});

test.describe('Data validation (UI <-> API)', () => {
  let uiProfileUser;
  let viewer;
  let owner;
  let xssOwner;
  let receiver;
  let sender;

  test.beforeAll(async () => {
    uiProfileUser = await createUser('uiprofile');
    viewer = await createUser('viewer');
    owner = await createUser('owner');
    xssOwner = await createUser('xss');
    receiver = await createUser('receiver');
    sender = await createUser('sender');
    expect((await saveProfile(owner.id, FULL_PROFILE)).status).toBe(200);
    expect((await saveProfile(xssOwner.id, {
      ...FULL_PROFILE,
      aboutMe: '<img src=x onerror=alert(1)>',
      familyDetails: '<script>alert("xss")</script>',
    })).status).toBe(200);
  });

  test('DV-UI-01: form inputs use the right types (text/email/password)', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/register`);
    await expect(page.locator('input[name="fullName"]')).toHaveAttribute('type', 'text');
    await expect(page.locator('input[name="email"]')).toHaveAttribute('type', 'email');
    await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');
    await page.goto(`${FRONTEND_URL}/login`);
    await expect(page.locator('input[name="email"]')).toHaveAttribute('type', 'email');
    await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');
  });

  test('DV-UI-02: empty register form shows "All fields are required."', async ({ page }) => {
    const messages = trackDialogs(page);
    await page.goto(`${FRONTEND_URL}/register`);
    const res = await submitForm(page, '/api/auth/register', {});
    expect(res.status()).toBe(400);
    await expect.poll(() => messages).toContain('All fields are required.');
    await expect(page).toHaveURL(/\/register/);
  });

  const PARTIAL = [
    ['name missing', { email: `dv.partial.${STAMP}@gmail.com`, password: PASSWORD }],
    ['email missing', { fullName: 'Partial User', password: PASSWORD }],
    ['password missing', { fullName: 'Partial User', email: `dv.partial.${STAMP}@gmail.com` }],
  ];
  PARTIAL.forEach(([label, fields], index) => {
    test(`DV-UI-0${index + 3}: register form with ${label} is rejected by the server`, async ({ page }) => {
      const messages = trackDialogs(page);
      await page.goto(`${FRONTEND_URL}/register`);
      const res = await submitForm(page, '/api/auth/register', fields);
      expect(res.status()).toBe(400);
      await expect.poll(() => messages).toContain('All fields are required.');
    });
  });

  test('DV-UI-06: invalid email formats are blocked by the browser; no request is sent', async ({ page }) => {
    const requests = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/auth/register')) requests.push(r.url());
    });
    await page.goto(`${FRONTEND_URL}/register`);
    const email = page.locator('input[name="email"]');
    for (const value of ['plainaddress', 'missing@', '@missing.com', 'two@@gmail.com', 'user name@gmail.com']) {
      await email.fill(value);
      const state = await email.evaluate((el) => ({ valid: el.validity.valid, mismatch: el.validity.typeMismatch }));
      expect(state.mismatch, `"${value}" should be an invalid email`).toBe(true);
      expect(state.valid).toBe(false);
    }
    await email.fill('user@gmail.com');
    expect(await email.evaluate((el) => el.validity.valid)).toBe(true);

    await page.locator('input[name="fullName"]').fill('Blocked User');
    await email.fill('not-an-email');
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(600);
    expect(requests).toEqual([]);
    await expect(page).toHaveURL(/\/register/);
  });

  test('DV-UI-07: UI registration succeeds and the API returns the same account data', async ({ page }) => {
    const user = makeUser('uireg');
    const messages = trackDialogs(page);
    await page.goto(`${FRONTEND_URL}/register`);
    const res = await submitForm(page, '/api/auth/register', user);
    expect(res.status()).toBe(201);
    await expect.poll(() => messages).toContain('Registration Successful');
    await expect(page).toHaveURL(/\/login/);
    const login = await loginUser(user.email, user.password);
    expect(login.status).toBe(200);
    expect(login.body.user).toMatchObject({ fullName: user.fullName, email: user.email });
  });

  test('DV-UI-08: UI registration with an existing email shows "Email already exists."', async ({ page }) => {
    const messages = trackDialogs(page);
    await page.goto(`${FRONTEND_URL}/register`);
    const res = await submitForm(page, '/api/auth/register', mainUser);
    expect(res.status()).toBe(409);
    await expect.poll(() => messages).toContain('Email already exists.');
    await expect(page).toHaveURL(/\/register/);
  });

  test('DV-UI-09: login with a wrong password / unknown email / empty form shows the right message', async ({ page }) => {
    const messages = trackDialogs(page);
    await page.goto(`${FRONTEND_URL}/login`);

    let res = await submitForm(page, '/api/auth/login', { email: mainUser.email, password: 'Wrong@123' });
    expect(res.status()).toBe(401);
    await expect.poll(() => messages).toContain('Invalid password.');

    res = await submitForm(page, '/api/auth/login', { email: `nobody.${STAMP}@gmail.com`, password: PASSWORD });
    expect(res.status()).toBe(404);
    await expect.poll(() => messages).toContain('User not found.');

    res = await submitForm(page, '/api/auth/login', { email: '', password: '' });
    expect(res.status()).toBe(400);
    await expect.poll(() => messages).toContain('Email and password are required.');

    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });

  test('DV-UI-10: valid login stores a JWT and user data that match the account', async ({ page }) => {
    await uiLogin(page, mainUser);
    const stored = await page.evaluate(() => ({
      token: localStorage.getItem('token'),
      user: JSON.parse(localStorage.getItem('user')),
    }));
    expect(stored.token.split('.')).toHaveLength(3);
    const payload = JSON.parse(Buffer.from(stored.token.split('.')[1], 'base64url').toString('utf8'));
    expect(payload).toMatchObject({ id: mainUser.id, email: mainUser.email });
    expect(stored.user).toMatchObject({ id: mainUser.id, fullName: mainUser.fullName, email: mainUser.email });
    expect(JSON.stringify(stored.user)).not.toContain('password');
  });

  test('DV-UI-11: constrained profile fields only offer the allowed options', async ({ page }) => {
    await uiLogin(page, viewer);
    await page.goto(`${FRONTEND_URL}/profile`);
    const options = (name) =>
      page.locator(`select[name="${name}"]`).evaluate((el) => [...el.options].map((o) => o.textContent.trim()));
    expect(await options('gender')).toEqual(['Select Gender', 'Male', 'Female']);
    expect(await options('religion')).toEqual(['Religion', 'Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain']);
    await expect(page.locator('input[name="dob"]')).toHaveAttribute('type', 'date');
  });

  test('DV-UI-12: profile saved in the UI is sent, stored and re-displayed correctly', async ({ page }) => {
    const UI_PROFILE = {
      dob: '1996-03-21', gender: 'Female', height: '5.5', weight: '57',
      religion: 'Hindu', caste: 'Any', motherTongue: 'Telugu', education: 'B.Com',
      occupation: 'Accountant', annualIncome: '6 LPA', city: 'Vijayawada',
      state: 'Andhra Pradesh', country: 'India', aboutMe: 'UI about text',
      familyDetails: 'UI family text', partnerPreference: 'UI preference text',
    };
    const INPUTS = ['dob', 'height', 'weight', 'caste', 'motherTongue', 'education', 'occupation',
      'annualIncome', 'city', 'state', 'country'];
    const SELECTS = ['gender', 'religion'];
    const AREAS = ['aboutMe', 'familyDetails', 'partnerPreference'];
    const PROFILE_GET = /\/api\/profile\/\d+$/;

    const messages = trackDialogs(page);
    await uiLogin(page, uiProfileUser);

    let gets = 0;
    await page.route(PROFILE_GET, (route) => {
      gets += 1;
      return gets === 1 ? route.continue() : route.abort();
    });
    const settled = page
      .waitForEvent('requestfailed', { predicate: (r) => PROFILE_GET.test(r.url()), timeout: 3000 })
      .catch(() => null);
    await page.goto(`${FRONTEND_URL}/profile`);
    await settled;

    for (const f of INPUTS) await page.locator(`input[name="${f}"]`).fill(UI_PROFILE[f]);
    for (const f of SELECTS) await page.locator(`select[name="${f}"]`).selectOption(UI_PROFILE[f]);
    for (const f of AREAS) await page.locator(`textarea[name="${f}"]`).fill(UI_PROFILE[f]);

    const saveResponse = page.waitForResponse(
      (r) => r.url().endsWith('/api/profile/save') && r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Save Profile' }).click();
    const res = await saveResponse;
    expect(res.status()).toBe(200);
    expect(res.request().postDataJSON()).toMatchObject({ ...UI_PROFILE, userId: uiProfileUser.id });
    expect((await res.json()).message).toBe('Profile Saved Successfully');
    await expect.poll(() => messages).toContain('Profile Saved Successfully');

    const got = await getProfile(uiProfileUser.id);
    expect(got.body).toMatchObject({ ...UI_PROFILE, userId: uiProfileUser.id, userName: uiProfileUser.fullName });

    await page.unroute(PROFILE_GET);
    await page.reload();
    for (const f of [...INPUTS, ...SELECTS]) {
      const tag = SELECTS.includes(f) ? 'select' : 'input';
      await expect(page.locator(`${tag}[name="${f}"]`), `${f} after reload`).toHaveValue(UI_PROFILE[f]);
    }
    for (const f of AREAS) {
      await expect(page.locator(`textarea[name="${f}"]`), `${f} after reload`).toHaveValue(UI_PROFILE[f]);
    }
  });

  test('DV-UI-13: View Profile page shows exactly what the API stored', async ({ page }) => {
    await uiLogin(page, viewer);
    await page.goto(`${FRONTEND_URL}/view-profile/${owner.id}`);
    await expect(page.getByRole('heading', { name: owner.fullName })).toBeVisible();
    const LABELS = [
      ['Gender', 'gender'], ['DOB', 'dob'], ['Height', 'height'], ['Weight', 'weight'],
      ['Religion', 'religion'], ['Caste', 'caste'], ['Mother Tongue', 'motherTongue'],
      ['Education', 'education'], ['Occupation', 'occupation'], ['Income', 'annualIncome'],
      ['City', 'city'], ['State', 'state'], ['Country', 'country'],
    ];
    for (const [label, key] of LABELS) {
      await expect(page.locator('p').filter({ hasText: `${label} :` })).toContainText(`${label} : ${FULL_PROFILE[key]}`);
    }
    await expect(page.getByText(FULL_PROFILE.aboutMe, { exact: true })).toBeVisible();
    await expect(page.getByText(FULL_PROFILE.familyDetails, { exact: true })).toBeVisible();
    await expect(page.getByText(FULL_PROFILE.partnerPreference, { exact: true })).toBeVisible();
  });

  test('DV-UI-14: HTML/script text in a profile is displayed as text and never executed', async ({ page }) => {
    const messages = trackDialogs(page);
    await uiLogin(page, viewer);
    messages.length = 0;
    await page.goto(`${FRONTEND_URL}/view-profile/${xssOwner.id}`);
    await expect(page.getByText('<img src=x onerror=alert(1)>', { exact: true })).toBeVisible();
    await page.waitForTimeout(500);
    expect(await page.locator('img[src="x"]').count()).toBe(0);
    expect(messages).toEqual([]);
  });

  test('DV-UI-15: Interests page status matches the API before and after accepting', async ({ page }) => {
    const sent = await call('post', '/interest/send', { senderId: sender.id, receiverId: receiver.id });
    expect(sent.body.success).toBe(true);
    const received = await call('get', '/interest/received/' + receiver.id);
    const interest = received.body.find((item) => item.senderId === sender.id);
    expect(interest.status).toBe('Pending');

    await uiLogin(page, receiver);
    await page.goto(`${FRONTEND_URL}/interests`);
    await expect(page.getByRole('heading', { name: sender.fullName })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Status :' })).toHaveText(/Status :\s*Pending/);
    await expect(page.getByRole('button', { name: 'Accept', exact: true })).toBeVisible();

    const accept = await call('put', '/interest/accept/' + interest.id);
    expect(accept.body.success).toBe(true);
    await page.reload();
    await expect(page.locator('p').filter({ hasText: 'Status :' })).toHaveText(/Status :\s*Accepted/);
    await expect(page.getByRole('button', { name: 'Accept', exact: true })).toHaveCount(0);
  });
});
'@

[System.IO.File]::WriteAllText("$PWD\tests\data-validation.spec.js", $code, (New-Object System.Text.UTF8Encoding $false))

npx.cmd playwright test tests/data-validation.spec.js --list