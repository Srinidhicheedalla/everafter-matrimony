import { test, expect } from '@playwright/test';
import { API_URL as API } from './env.js';

// API-level security and data-rule checks. Independent tests (no shared
// state), kept apart from the serial UI journey in homepage.spec.js.

const PASSWORD = 'Test@123';

async function signup(request, name) {
  const email = `${name}${Date.now()}@gmail.com`;
  await request.post(`${API}/auth/register`, {
    data: { fullName: name, email, password: PASSWORD },
  });
  const { token, user } = await (
    await request.post(`${API}/auth/login`, { data: { email, password: PASSWORD } })
  ).json();
  return { id: user.id, email, headers: { Authorization: `Bearer ${token}` } };
}


test('Login is case-insensitive on email', async ({ request }) => {
  const email = `Case${Date.now()}@Gmail.com`;

  await request.post(`${API}/auth/register`, {
    data: { fullName: 'Case Test', email, password: PASSWORD },
  });

  const res = await request.post(`${API}/auth/login`, {
    data: { email: email.toLowerCase(), password: PASSWORD },
  });
  expect(res.status()).toBe(200);

  const dup = await request.post(`${API}/auth/register`, {
    data: { fullName: 'Dup', email: email.toUpperCase(), password: PASSWORD },
  });
  expect(dup.status()).toBe(409);
});

test('Login does not reveal whether an email exists', async ({ request }) => {
  const existing = await signup(request, 'existing');

  const unknown = await request.post(`${API}/auth/login`, {
    data: { email: `nobody${Date.now()}@gmail.com`, password: 'x' },
  });
  const wrongPassword = await request.post(`${API}/auth/login`, {
    data: { email: existing.email, password: 'wrong-password' },
  });

  expect(unknown.status()).toBe(401);
  expect(wrongPassword.status()).toBe(401);
  expect(await unknown.json()).toEqual(await wrongPassword.json());
});

test('Bad login payloads get 400 and do not crash the server', async ({ request }) => {
  for (const data of [{ email: 'a@gmail.com', password: 123 }, { email: ['a'], password: 'x' }]) {
    expect((await request.post(`${API}/auth/login`, { data })).status()).toBe(400);
  }
  expect((await request.post(`${API}/auth/login`)).status()).toBe(400);
  expect(
    (await request.post(`${API}/auth/register`, {
      data: { fullName: 'X', email: 'x@x.com', password: 123 },
    })).status()
  ).toBe(400);

  expect((await request.get(new URL(API).origin)).ok()).toBeTruthy();
});




test('Protected APIs reject missing or forged tokens', async ({ request }) => {
  for (const headers of [{}, { Authorization: 'Bearer forged.token.here' }]) {
    expect((await request.get(`${API}/profile/all`, { headers })).status()).toBe(401);
    expect((await request.get(`${API}/interest/received`, { headers })).status()).toBe(401);
  }
});

test('Users can only act as themselves', async ({ request }) => {
  const alice = await signup(request, 'alice');
  const bob = await signup(request, 'bob');
  const mallory = await signup(request, 'mallory');

  // Alice sends to Bob while claiming to be Mallory: sender must come from the token
  await request.post(`${API}/interest/send`, {
    headers: alice.headers,
    data: { senderId: mallory.id, receiverId: bob.id },
  });
  const [interest] = await (
    await request.get(`${API}/interest/received`, { headers: bob.headers })
  ).json();
  expect(interest.senderId).toBe(alice.id);

  // Only the receiver can accept
  for (const other of [mallory, alice]) {
    const res = await request.put(`${API}/interest/accept/${interest.id}`, { headers: other.headers });
    expect(res.status()).toBe(404);
  }
  const accepted = await request.put(`${API}/interest/accept/${interest.id}`, { headers: bob.headers });
  expect(accepted.status()).toBe(200);

  // Mallory can't overwrite Bob's profile by putting his userId in the body
  await request.post(`${API}/profile/save`, { headers: bob.headers, data: { city: 'Pune' } });
  await request.post(`${API}/profile/save`, {
    headers: mallory.headers,
    data: { userId: bob.id, city: 'Hacked' },
  });
  const bobProfile = await (
    await request.get(`${API}/profile/${bob.id}`, { headers: bob.headers })
  ).json();
  expect(bobProfile.city).toBe('Pune');

  // Member list must not leak emails
  const all = await (await request.get(`${API}/profile/all`, { headers: bob.headers })).json();
  expect(all.some((p) => 'email' in p)).toBe(false);
});

test('An accepted interest is a match for both people', async ({ request }) => {
  const alice = await signup(request, 'alice');
  const bob = await signup(request, 'bob');

  await request.post(`${API}/interest/send`, {
    headers: alice.headers,
    data: { receiverId: bob.id },
  });

  // Bob can't open a second, reverse interest for the same pair
  const reverse = await (
    await request.post(`${API}/interest/send`, {
      headers: bob.headers,
      data: { receiverId: alice.id },
    })
  ).json();
  expect(reverse.success).toBe(false);

  const [interest] = await (
    await request.get(`${API}/interest/received`, { headers: bob.headers })
  ).json();
  await request.put(`${API}/interest/accept/${interest.id}`, { headers: bob.headers });

  const matchesOf = async (user) =>
    (await (await request.get(`${API}/interest/matches`, { headers: user.headers })).json())
      .map((m) => m.fullName);

  expect(await matchesOf(bob)).toEqual(['alice']);
  expect(await matchesOf(alice)).toEqual(['bob']);
});

test('Profile shows the member name even before they fill a profile', async ({ request }) => {
  const viewer = await signup(request, 'viewer');
  const newbie = await signup(request, 'newbie');

  const res = await request.get(`${API}/profile/${newbie.id}`, { headers: viewer.headers });
  expect(res.status()).toBe(200);
  expect((await res.json()).userName).toBe('newbie');

  const missing = await request.get(`${API}/profile/999999999`, { headers: viewer.headers });
  expect(missing.status()).toBe(404);
});

test('Registration rejects invalid input', async ({ request }) => {
  const cases = [
    { fullName: 'X', email: 'not-an-email', password: PASSWORD },
    { fullName: 'X', email: `short${Date.now()}@gmail.com`, password: 'a1' },
    { fullName: '   ', email: `blank${Date.now()}@gmail.com`, password: PASSWORD },
  ];
  for (const data of cases) {
    const res = await request.post(`${API}/auth/register`, { data });
    expect(res.status(), JSON.stringify(data)).toBe(400);
  }
});

test('Simultaneous sign-ups with one email: one wins, others get 409', async ({ request }) => {
  const data = { fullName: 'Race', email: `race${Date.now()}@gmail.com`, password: PASSWORD };
  const statuses = await Promise.all(
    [1, 2, 3].map(async () => (await request.post(`${API}/auth/register`, { data })).status())
  );
  expect(statuses.sort()).toEqual([201, 409, 409]);
});

test('Malformed JSON and unknown routes answer with JSON, not an HTML stack trace', async ({ request }) => {
  const malformed = await request.post(`${API}/auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    data: '{"email": ',
  });
  expect(malformed.status()).toBe(400);
  expect(await malformed.json()).toEqual({ success: false, message: 'Invalid request' });

  const unknown = await request.get(`${API}/does-not-exist`);
  expect(unknown.status()).toBe(404);
  expect((await unknown.json()).success).toBe(false);
});

test('Interest needs a real, existing receiver', async ({ request }) => {
  const sender = await signup(request, 'sender');
  for (const receiverId of [999999999, 'abc', -1, null]) {
    const body = await (
      await request.post(`${API}/interest/send`, { headers: sender.headers, data: { receiverId } })
    ).json();
    expect(body.success, String(receiverId)).toBe(false);
  }
});

test('Search does not list your own profile', async ({ request }) => {
  const me = await signup(request, 'me');
  await request.post(`${API}/profile/save`, { headers: me.headers, data: { city: 'Pune' } });

  const all = await (await request.get(`${API}/profile/all`, { headers: me.headers })).json();
  expect(all.some((p) => p.userId === me.id)).toBe(false);
});
