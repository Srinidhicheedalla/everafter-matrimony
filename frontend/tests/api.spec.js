import { test, expect } from '@playwright/test';

const BACKEND_URL = 'http://localhost:5000';
const API_URL = BACKEND_URL + '/api';

const PASSWORD = 'Test@123';
const TIMESTAMP = Date.now();

const USER_A = {
  fullName: 'API User A ' + TIMESTAMP,
  email: 'apiA' + TIMESTAMP + '@gmail.com',
  password: PASSWORD,
};

const USER_B = {
  fullName: 'API User B ' + TIMESTAMP,
  email: 'apiB' + TIMESTAMP + '@gmail.com',
  password: PASSWORD,
};

const USER_C = {
  fullName: 'API User C ' + TIMESTAMP,
  email: 'apiC' + TIMESTAMP + '@gmail.com',
  password: PASSWORD,
};

let USER_A_ID;
let USER_B_ID;
let USER_C_ID;
let TOKEN_A;
let INTEREST_A_TO_B_ID;
let INTEREST_C_TO_B_ID;

const PROFILE_DATA = {
  dob: '2000-01-01',
  gender: 'Female',
  height: '5.4',
  weight: '55',
  religion: 'Hindu',
  caste: 'Any',
  motherTongue: 'Telugu',
  education: 'B.Tech',
  occupation: 'Engineer',
  annualIncome: '8 LPA',
  city: 'Hyderabad',
  state: 'Telangana',
  country: 'India',
  aboutMe: 'API automation user',
  familyDetails: 'Family of 4',
  partnerPreference: 'Kind and caring',
  photo: '',
};

async function readJson(response) {
  const rawBody = await response.text();

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    throw new Error(
      'Response is not valid JSON.\n' +
      'URL: ' + response.url() + '\n' +
      'Status: ' + response.status() + '\n' +
      'Body: ' + rawBody
    );
  }
}

async function register(request, user) {
  const response = await request.post(API_URL + '/auth/register', {
    data: {
      fullName: user.fullName,
      email: user.email,
      password: user.password,
    },
  });

  return { response, body: await readJson(response) };
}

async function getReceived(request, userId) {
  const response = await request.get(
    API_URL + '/interest/received/' + userId
  );

  expect(response.status()).toBe(200);

  const body = await readJson(response);

  expect(Array.isArray(body)).toBe(true);

  return body;
}

test.describe('API automation', function () {
  test.describe.configure({ mode: 'serial' });

  // ---------------------------------------------------------------
  // Health
  // ---------------------------------------------------------------
  test('API-01 Health check returns running message', async function ({
    request,
  }) {
    const response = await request.get(BACKEND_URL + '/');

    expect(response.status()).toBe(200);

    const body = await readJson(response);

    expect(body.success).toBe(true);
    expect(body.message).toContain('Backend Running');
  });

  // ---------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------
  test('API-02 Register new users returns 201 and userId', async function ({
    request,
  }) {
    const resultA = await register(request, USER_A);
    const resultB = await register(request, USER_B);
    const resultC = await register(request, USER_C);

    for (const result of [resultA, resultB, resultC]) {
      expect(result.response.status()).toBe(201);
      expect(result.body.success).toBe(true);
      expect(result.body.message).toBe('Registration Successful');
      expect(typeof result.body.userId).toBe('number');
    }

    USER_A_ID = resultA.body.userId;
    USER_B_ID = resultB.body.userId;
    USER_C_ID = resultC.body.userId;

    expect(new Set([USER_A_ID, USER_B_ID, USER_C_ID]).size).toBe(3);
  });

  test('API-03 Register with duplicate email returns 409', async function ({
    request,
  }) {
    const result = await register(request, USER_A);

    expect(result.response.status()).toBe(409);
    expect(result.body.success).toBe(false);
    expect(result.body.message).toBe('Email already exists.');
  });

  test('API-04 Register with missing fields returns 400', async function ({
    request,
  }) {
    const response = await request.post(API_URL + '/auth/register', {
      data: { email: 'missing' + TIMESTAMP + '@gmail.com' },
    });

    expect(response.status()).toBe(400);

    const body = await readJson(response);

    expect(body.success).toBe(false);
    expect(body.message).toBe('All fields are required.');
  });

  test('API-05 Login with valid credentials returns token and user', async function ({
    request,
  }) {
    const response = await request.post(API_URL + '/auth/login', {
      data: { email: USER_A.email, password: USER_A.password },
    });

    expect(response.status()).toBe(200);

    const body = await readJson(response);

    expect(body.success).toBe(true);
    expect(body.message).toBe('Login Successful');
    expect(typeof body.token).toBe('string');
    expect(body.user.id).toBe(USER_A_ID);
    expect(body.user.fullName).toBe(USER_A.fullName);
    expect(body.user.email).toBe(USER_A.email);

    // The password hash must never be sent back.
    expect(JSON.stringify(body)).not.toContain('password');

    TOKEN_A = body.token;
  });

  test('API-06 Login token is a valid JWT for the right user', async function () {
    const parts = TOKEN_A.split('.');

    expect(parts).toHaveLength(3);

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    );

    expect(payload.id).toBe(USER_A_ID);
    expect(payload.email).toBe(USER_A.email);
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  test('API-07 Login with wrong password returns 401', async function ({
    request,
  }) {
    const response = await request.post(API_URL + '/auth/login', {
      data: { email: USER_A.email, password: 'WrongPassword@123' },
    });

    expect(response.status()).toBe(401);

    const body = await readJson(response);

    expect(body.success).toBe(false);
    expect(body.message).toBe('Invalid password.');
    expect(body.token).toBeUndefined();
  });

  test('API-08 Login with unknown email returns 404', async function ({
    request,
  }) {
    const response = await request.post(API_URL + '/auth/login', {
      data: {
        email: 'nobody' + TIMESTAMP + '@gmail.com',
        password: PASSWORD,
      },
    });

    expect(response.status()).toBe(404);

    const body = await readJson(response);

    expect(body.success).toBe(false);
    expect(body.message).toBe('User not found.');
  });

  test('API-09 Login with missing fields returns 400', async function ({
    request,
  }) {
    const response = await request.post(API_URL + '/auth/login', {
      data: { email: USER_A.email },
    });

    expect(response.status()).toBe(400);

    const body = await readJson(response);

    expect(body.success).toBe(false);
    expect(body.message).toBe('Email and password are required.');
  });

  // ---------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------
  test('API-10 Save profile creates a new profile', async function ({
    request,
  }) {
    for (const userId of [USER_A_ID, USER_B_ID, USER_C_ID]) {
      const response = await request.post(API_URL + '/profile/save', {
        data: { userId, ...PROFILE_DATA },
      });

      expect(response.status()).toBe(200);

      const body = await readJson(response);

      expect(body.success).toBe(true);
      expect(body.message).toBe('Profile Saved Successfully');
    }
  });

  test('API-11 Save profile again updates the existing profile', async function ({
    request,
  }) {
    const response = await request.post(API_URL + '/profile/save', {
      data: { userId: USER_A_ID, ...PROFILE_DATA, city: 'Warangal' },
    });

    expect(response.status()).toBe(200);

    const body = await readJson(response);

    expect(body.success).toBe(true);
    expect(body.message).toBe('Profile Updated Successfully');
  });

  test('API-12 Get single profile returns saved data and user name', async function ({
    request,
  }) {
    const response = await request.get(
      API_URL + '/profile/' + USER_A_ID
    );

    expect(response.status()).toBe(200);

    const body = await readJson(response);

    expect(body.userId).toBe(USER_A_ID);
    expect(body.userName).toBe(USER_A.fullName);
    expect(body.city).toBe('Warangal');
    expect(body.religion).toBe('Hindu');
    expect(body.education).toBe('B.Tech');
  });

  test('API-13 Get unknown profile returns an empty object', async function ({
    request,
  }) {
    const response = await request.get(API_URL + '/profile/99999999');

    expect(response.status()).toBe(200);

    const body = await readJson(response);

    expect(body).toEqual({});
  });

  test('API-14 Get all profiles lists the new users safely', async function ({
    request,
  }) {
    const response = await request.get(API_URL + '/profile/all');

    expect(response.status()).toBe(200);

    const body = await readJson(response);

    expect(Array.isArray(body)).toBe(true);

    for (const user of [USER_A, USER_B, USER_C]) {
      const found = body.find(function (profile) {
        return profile.userName === user.fullName;
      });

      expect(found, user.fullName + ' missing from /profile/all').toBeTruthy();
      expect(found.email).toBe(user.email);
    }

    // The password hash must never be exposed in the member list.
    expect(JSON.stringify(body)).not.toContain('"password"');
  });

  // ---------------------------------------------------------------
  // Interest
  // ---------------------------------------------------------------
  test('API-15 Send interest stores a Pending interest', async function ({
    request,
  }) {
    const response = await request.post(API_URL + '/interest/send', {
      data: { senderId: USER_A_ID, receiverId: USER_B_ID },
    });

    expect(response.status()).toBe(200);

    const body = await readJson(response);

    expect(body.success).toBe(true);
    expect(body.message).toBe('Interest Sent Successfully ❤️');

    const received = await getReceived(request, USER_B_ID);

    const interest = received.find(function (item) {
      return item.senderId === USER_A_ID;
    });

    expect(interest).toBeTruthy();
    expect(interest.status).toBe('Pending');
    expect(interest.fullName).toBe(USER_A.fullName);
    expect(interest.receiverId).toBe(USER_B_ID);

    INTEREST_A_TO_B_ID = interest.id;
  });

  test('API-16 Duplicate interest is rejected', async function ({
    request,
  }) {
    const response = await request.post(API_URL + '/interest/send', {
      data: { senderId: USER_A_ID, receiverId: USER_B_ID },
    });

    const body = await readJson(response);

    expect(body.success).toBe(false);
    expect(body.message).toBe('Interest already sent');

    const received = await getReceived(request, USER_B_ID);

    const fromA = received.filter(function (item) {
      return item.senderId === USER_A_ID;
    });

    expect(fromA).toHaveLength(1);
  });

  test('API-17 Interest to yourself is rejected', async function ({
    request,
  }) {
    const response = await request.post(API_URL + '/interest/send', {
      data: { senderId: USER_A_ID, receiverId: USER_A_ID },
    });

    const body = await readJson(response);

    expect(body.success).toBe(false);
    expect(body.message).toBe('You cannot send interest to yourself');
  });

  test('API-18 Interest with missing fields is rejected', async function ({
    request,
  }) {
    const response = await request.post(API_URL + '/interest/send', {
      data: { senderId: USER_A_ID },
    });

    const body = await readJson(response);

    expect(body.success).toBe(false);
    expect(body.message).toBe('Sender and Receiver are required');
  });

  test('API-19 Accept interest updates status and creates a match', async function ({
    request,
  }) {
    const response = await request.put(
      API_URL + '/interest/accept/' + INTEREST_A_TO_B_ID
    );

    expect(response.status()).toBe(200);

    const body = await readJson(response);

    expect(body.success).toBe(true);
    expect(body.message).toBe('Interest Accepted');

    const received = await getReceived(request, USER_B_ID);

    const interest = received.find(function (item) {
      return item.id === INTEREST_A_TO_B_ID;
    });

    expect(interest.status).toBe('Accepted');

    const matchesResponse = await request.get(
      API_URL + '/interest/matches/' + USER_B_ID
    );

    expect(matchesResponse.status()).toBe(200);

    const matches = await readJson(matchesResponse);

    const match = matches.find(function (item) {
      return item.fullName === USER_A.fullName;
    });

    expect(match, 'Accepted match missing').toBeTruthy();
    expect(match.status).toBe('Accepted');
    expect(match.email).toBe(USER_A.email);
    expect(match.city).toBe('Warangal');
  });

  test('API-20 Reject interest updates status and creates no match', async function ({
    request,
  }) {
    const sendResponse = await request.post(
      API_URL + '/interest/send',
      { data: { senderId: USER_C_ID, receiverId: USER_B_ID } }
    );

    const sendBody = await readJson(sendResponse);

    expect(sendBody.success).toBe(true);

    const receivedBefore = await getReceived(request, USER_B_ID);

    const pending = receivedBefore.find(function (item) {
      return item.senderId === USER_C_ID;
    });

    expect(pending.status).toBe('Pending');

    INTEREST_C_TO_B_ID = pending.id;

    const response = await request.put(
      API_URL + '/interest/reject/' + INTEREST_C_TO_B_ID
    );

    expect(response.status()).toBe(200);

    const body = await readJson(response);

    expect(body.success).toBe(true);
    expect(body.message).toBe('Interest Rejected');

    const receivedAfter = await getReceived(request, USER_B_ID);

    const rejected = receivedAfter.find(function (item) {
      return item.id === INTEREST_C_TO_B_ID;
    });

    expect(rejected.status).toBe('Rejected');

    const matchesResponse = await request.get(
      API_URL + '/interest/matches/' + USER_B_ID
    );

    const matches = await readJson(matchesResponse);

    const rejectedMatch = matches.find(function (item) {
      return item.fullName === USER_C.fullName;
    });

    expect(rejectedMatch).toBeUndefined();
  });

  test('API-21 Received interests for a user with none is empty', async function ({
    request,
  }) {
    const received = await getReceived(request, USER_C_ID);

    expect(received).toEqual([]);
  });
});