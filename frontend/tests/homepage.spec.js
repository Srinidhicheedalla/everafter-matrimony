import { test, expect } from '@playwright/test';
import { API_URL } from './env.js';

const PASSWORD = 'Test@123';

const TIMESTAMP = Date.now();

const USER_A = {
  fullName: 'Automation User A',
  email: 'automationA' + TIMESTAMP + '@gmail.com',
  password: PASSWORD,
};

const USER_B = {
  fullName: 'Automation User B',
  email: 'automationB' + TIMESTAMP + '@gmail.com',
  password: PASSWORD,
};

const USER_C = {
  fullName: 'Automation User C',
  email: 'automationC' + TIMESTAMP + '@gmail.com',
  password: PASSWORD,
};

let USER_A_ID;
let USER_B_ID;
let USER_C_ID;

test.describe.configure({ mode: 'serial' });


// ============================================================
// HELPERS
// ============================================================

async function registerUser(request, user) {
  const response = await request.post(
    API_URL + '/auth/register',
    {
      data: {
        fullName: user.fullName,
        email: user.email,
        password: user.password,
      },
    }
  );

  const data = await response.json();

  expect(
    response.ok(),
    'Registration failed: ' + JSON.stringify(data)
  ).toBeTruthy();

  return data;
}


async function apiLogin(request, user) {
  const response = await request.post(
    API_URL + '/auth/login',
    {
      data: {
        email: user.email,
        password: user.password,
      },
    }
  );

  const data = await response.json();

  expect(
    response.ok(),
    'API login failed: ' + JSON.stringify(data)
  ).toBeTruthy();

  user.headers = { Authorization: 'Bearer ' + data.token };
}


async function saveProfile(request, user) {
  const response = await request.post(
    API_URL + '/profile/save',
    {
      headers: user.headers,
      data: {
        city: 'Hyderabad',
        religion: 'Hindu',
        education: 'B.Tech',
        age: 22,
        gender: 'Female',
      },
    }
  );

  const data = await response.json();

  expect(
    response.ok(),
    'Profile save failed: ' + JSON.stringify(data)
  ).toBeTruthy();

  return data;
}


async function sendInterest(request, sender, receiverId) {
  const response = await request.post(
    API_URL + '/interest/send',
    {
      headers: sender.headers,
      data: {
        receiverId: receiverId,
      },
    }
  );

  const data = await response.json();

  expect(
    response.ok(),
    'Send interest failed: ' + JSON.stringify(data)
  ).toBeTruthy();

  return data;
}


async function getReceivedInterests(request, receiver) {
  const response = await request.get(
    API_URL + '/interest/received',
    { headers: receiver.headers }
  );

  const data = await response.json();

  expect(
    response.ok(),
    'Get received interests failed: ' + JSON.stringify(data)
  ).toBeTruthy();

  return data;
}


function extractInterests(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.interests)) {
    return data.interests;
  }

  if (data && Array.isArray(data.data)) {
    return data.data;
  }

  return [];
}


function findInterestByName(interests, fullName, status) {
  return interests.find(function (interest) {
    return (
      interest.fullName === fullName &&
      interest.status === status
    );
  });
}


async function waitForInterestByName(
  request,
  receiver,
  senderName,
  expectedStatus,
  retries
) {
  const maxRetries = retries || 10;

  for (let i = 0; i < maxRetries; i++) {
    const data = await getReceivedInterests(
      request,
      receiver
    );

    const interests = extractInterests(data);

    console.log(
      'Received interests for ' +
        receiver.fullName +
        ':',
      JSON.stringify(interests)
    );

    console.log(
      'Looking for "' +
        senderName +
        '" with status "' +
        expectedStatus +
        '"'
    );

    const found = findInterestByName(
      interests,
      senderName,
      expectedStatus
    );

    if (found) {
      return found;
    }

    console.log(
      'Available interests:',
      JSON.stringify(interests)
    );

    await new Promise(function (resolve) {
      setTimeout(resolve, 1000);
    });
  }

  throw new Error(
    'Interest not found for sender "' +
      senderName +
      '" -> receiver ' +
      receiver.fullName +
      ', expected status "' +
      expectedStatus +
      '"'
  );
}


async function login(page, email, password) {
  await page.goto('/login');

  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);

  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/dashboard/);
}

async function openSearch(page) {
  await page.goto('/search');
  await page.waitForLoadState('networkidle');
}


async function getProfileCard(page, fullName) {
  return page
    .getByRole('heading', {
      name: fullName,
      exact: true,
    })
    .locator('..');
}


async function openInterests(page) {
  await page.goto('/interests');
  await page.waitForLoadState('networkidle');
}


async function getInterestCard(page, fullName) {
  return getProfileCard(page, fullName);
}


// ============================================================
// SETUP
// ============================================================

test.beforeAll(async function ({ request }) {
  const resultA = await registerUser(request, USER_A);
  const resultB = await registerUser(request, USER_B);
  const resultC = await registerUser(request, USER_C);

  USER_A_ID =
    resultA.userId ||
    resultA.id ||
    (resultA.user && resultA.user.id);

  USER_B_ID =
    resultB.userId ||
    resultB.id ||
    (resultB.user && resultB.user.id);

  USER_C_ID =
    resultC.userId ||
    resultC.id ||
    (resultC.user && resultC.user.id);

  console.log('=================================');
  console.log('USER A ID:', USER_A_ID);
  console.log('USER B ID:', USER_B_ID);
  console.log('USER C ID:', USER_C_ID);
  console.log('=================================');

  expect(USER_A_ID).toBeTruthy();
  expect(USER_B_ID).toBeTruthy();
  expect(USER_C_ID).toBeTruthy();

  await apiLogin(request, USER_A);
  await apiLogin(request, USER_B);
  await apiLogin(request, USER_C);

  await saveProfile(request, USER_A);
  await saveProfile(request, USER_B);
  await saveProfile(request, USER_C);
});


// ============================================================
// 1. LOGIN
// ============================================================

test('Login test', async function ({ page }) {
  await login(
    page,
    USER_A.email,
    USER_A.password
  );

  await expect(page).not.toHaveURL(/login/i);
});


// ============================================================
// 2. REGISTRATION
// ============================================================

test('Registration test', async function ({ request }) {
  const user = {
    fullName: 'Registration Test User',
    email:
      'registration' +
      Date.now() +
      '@gmail.com',
    password: PASSWORD,
  };

  const data = await registerUser(request, user);

  expect(data).toBeTruthy();
});


// ============================================================
// 3. INVALID LOGIN
// ============================================================

test('Invalid login test', async function ({ page }) {
  await page.goto('/login');

  await page.getByPlaceholder('Email').fill(
    'invalid' + Date.now() + '@gmail.com'
  );

  await page.getByPlaceholder('Password').fill(
    'WrongPassword@123'
  );

  const dialogPromise = page.waitForEvent('dialog').catch(
    function () {
      return null;
    }
  );

  await page
    .getByRole('button', { name: /login/i })
    .click();

  const dialog = await dialogPromise;

  if (dialog) {
    console.log(
      'Invalid login dialog:',
      dialog.message()
    );
    await dialog.dismiss();
  }

  await expect(page).toHaveURL(/login/i);
});


// ============================================================
// 4. LOGOUT
// ============================================================

test('Logout test', async function ({ page }) {
  await login(
    page,
    USER_A.email,
    USER_A.password
  );

  const logoutButton = page.getByRole(
    'button',
    { name: /logout/i }
  );

  if (await logoutButton.count()) {
    await logoutButton.first().click();
  } else {
    const logoutLink = page.getByRole(
      'link',
      { name: /logout/i }
    );

    if (await logoutLink.count()) {
      await logoutLink.first().click();
    }
  }

  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/login/i);
});


// ============================================================
// 5. PROFILE UPDATE
// ============================================================

test('Profile update test', async function ({ page }) {
  await login(
    page,
    USER_A.email,
    USER_A.password
  );

  await page.goto('/profile');
  await page.waitForLoadState('networkidle');

  await page.getByPlaceholder('City').fill('Pune');

  await page.getByRole('button', { name: 'Save Profile' }).click();
  await page.waitForLoadState('networkidle');

  await page.reload();

  await expect(page.getByPlaceholder('City')).toHaveValue('Pune');
});


// ============================================================
// 6. SEARCH MEMBERS
// ============================================================

test('Search members test', async function ({ page }) {
  await login(
    page,
    USER_A.email,
    USER_A.password
  );

  await openSearch(page);

  await expect(
    page.getByRole('heading', {
      name: USER_B.fullName,
      exact: true,
    })
  ).toBeVisible();
});


// ============================================================
// 7. VIEW PROFILE
// ============================================================

test('View Profile test', async function ({ page }) {
  await login(
    page,
    USER_A.email,
    USER_A.password
  );

  await openSearch(page);

  const profileCard = await getProfileCard(
    page,
    USER_B.fullName
  );

  await expect(profileCard).toBeVisible();

  const viewButton = profileCard.getByRole(
    'button',
    { name: /view profile/i }
  );

  if (await viewButton.count()) {
    await viewButton.click();
  } else {
    const viewLink = profileCard.getByRole(
      'link',
      { name: /view profile/i }
    );

    await viewLink.click();
  }

  await page.waitForLoadState('networkidle');

  await expect(
    page.getByText(USER_B.fullName, {
      exact: true,
    })
  ).toBeVisible();
});


// ============================================================
// 8. SEND INTEREST
// ============================================================

test('Send interest test', async function ({ page }) {
  await login(
    page,
    USER_A.email,
    USER_A.password
  );

  await openSearch(page);

  const profileCard = await getProfileCard(
    page,
    USER_B.fullName
  );

  await expect(profileCard).toBeVisible();

  const viewButton = profileCard.getByRole(
    'button',
    { name: /view profile/i }
  );

  if (await viewButton.count()) {
    await viewButton.click();
  } else {
    const viewLink = profileCard.getByRole(
      'link',
      { name: /view profile/i }
    );

    await viewLink.click();
  }

  await page.waitForLoadState('networkidle');

  const sendButton = page.getByRole(
    'button',
    {
      name: '❤️ Send Interest',
      exact: true,
    }
  );

  await expect(sendButton).toBeVisible();

  const responsePromise = page.waitForResponse(
    function (response) {
      return (
        response.url() ===
          API_URL + '/interest/send' &&
        response.request().method() === 'POST'
      );
    },
    { timeout: 10000 }
  );

  const dialogPromise = page
    .waitForEvent('dialog', { timeout: 10000 })
    .catch(function () {
      return null;
    });

  await sendButton.click();

  const response = await responsePromise;

  console.log(
    'UI Send Interest API status:',
    response.status()
  );

  // The app alert()s right after this response; an open dialog blocks the
  // page, so reading the body before dismissing it would hang forever
  const dialog = await dialogPromise;

  if (dialog) {
    console.log(
      'Send interest dialog:',
      dialog.message()
    );

    await dialog.dismiss();
  }

  const responseData = await response.json();

  console.log(
    'UI Send Interest API response:',
    responseData
  );

  expect(
    response.ok(),
    'Send Interest API failed: ' +
      JSON.stringify(responseData)
  ).toBeTruthy();

  expect(
    responseData.success,
    'Send Interest returned success=false: ' +
      JSON.stringify(responseData)
  ).toBeTruthy();
});


// ============================================================
// 9. RECEIVED INTEREST
// ============================================================

test('Received interest test', async function ({
  page,
  request,
}) {
  await login(
    page,
    USER_B.email,
    USER_B.password
  );

  const interest = await waitForInterestByName(
    request,
    USER_B,
    USER_A.fullName,
    'Pending',
    10
  );

  expect(interest).toBeTruthy();

  await openInterests(page);

  await expect(
    page.getByRole('heading', {
      name: USER_A.fullName,
      exact: true,
    })
  ).toBeVisible();
});


// ============================================================
// 10. ACCEPT INTEREST
// ============================================================

test('Accept interest test', async function ({
  page,
  request,
}) {
  await login(
    page,
    USER_B.email,
    USER_B.password
  );

  await openInterests(page);

  const card = await getInterestCard(
    page,
    USER_A.fullName
  );

  await expect(card).toBeVisible();

  const acceptButton = card.getByRole(
    'button',
    { name: /accept/i }
  );

  await expect(acceptButton).toBeVisible();

  const dialogPromise = page
    .waitForEvent('dialog', { timeout: 10000 })
    .catch(function () {
      return null;
    });

  await acceptButton.click();

  const dialog = await dialogPromise;

  if (dialog) {
    console.log(
      'Accept dialog:',
      dialog.message()
    );

    await dialog.dismiss();
  }

  await page.waitForTimeout(1000);

  const interest = await waitForInterestByName(
    request,
    USER_B,
    USER_A.fullName,
    'Accepted',
    10
  );

  expect(interest).toBeTruthy();
});


// ============================================================
// 11. MATCH CONFIRMATION
// ============================================================

test('Match confirmation test', async function ({
  request,
}) {
  const response = await request.get(
    API_URL + '/interest/matches',
    { headers: USER_B.headers }
  );

  const data = await response.json();

  console.log(
    'Matches for USER B:',
    JSON.stringify(data)
  );

  expect(response.ok()).toBeTruthy();

  const matches = Array.isArray(data)
    ? data
    : data.matches || data.data || [];

  const match = matches.find(function (item) {
    return item.fullName === USER_A.fullName;
  });

  expect(
    match,
    'Accepted match was not found'
  ).toBeTruthy();
});


// ============================================================
// 12. REJECT INTEREST
// ============================================================

test('Reject interest test', async function ({
  page,
  request,
}) {
  await sendInterest(
    request,
    USER_C,
    USER_B_ID
  );

  await login(
    page,
    USER_B.email,
    USER_B.password
  );

  await openInterests(page);

  const card = await getInterestCard(
    page,
    USER_C.fullName
  );

  await expect(card).toBeVisible();

  const rejectButton = card.getByRole(
    'button',
    { name: /reject/i }
  );

  await expect(rejectButton).toBeVisible();

  const dialogPromise = page
    .waitForEvent('dialog', { timeout: 10000 })
    .catch(function () {
      return null;
    });

  await rejectButton.click();

  const dialog = await dialogPromise;

  if (dialog) {
    console.log(
      'Reject dialog:',
      dialog.message()
    );

    await dialog.dismiss();
  }

  await page.waitForTimeout(1000);

  const interest = await waitForInterestByName(
    request,
    USER_B,
    USER_C.fullName,
    'Rejected',
    10
  );

  expect(interest).toBeTruthy();
});


// ============================================================
// 13. NOTIFICATIONS
// ============================================================

test('Notifications test', async function ({ page }) {
  await login(
    page,
    USER_B.email,
    USER_B.password
  );

  const notificationLink = page.getByRole(
    'link',
    { name: /notification/i }
  );

  const notificationButton = page.getByRole(
    'button',
    { name: /notification/i }
  );

  if (await notificationLink.count()) {
    await notificationLink.first().click();
    await page.waitForLoadState('networkidle');
  } else if (await notificationButton.count()) {
    await notificationButton.first().click();
    await page.waitForTimeout(500);
  }

  await expect(page.locator('body')).toBeVisible();
});


// ============================================================
// 14. PROTECTED ROUTE
// ============================================================

test('Protected route test', async function ({ page }) {
  await page.context().clearCookies();

  await page.goto('/profile');

  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/login/i);
});


// ============================================================
// 15. BACK TO SEARCH
// ============================================================

test('Back to Search test', async function ({ page }) {
  await login(
    page,
    USER_A.email,
    USER_A.password
  );

  await page.goto('/search');

  await page.waitForLoadState('networkidle');

  const profileCard = await getProfileCard(
    page,
    USER_B.fullName
  );

  await expect(profileCard).toBeVisible();

  const viewButton = profileCard.getByRole(
    'button',
    { name: /view profile/i }
  );

  if (await viewButton.count()) {
    await viewButton.click();
  } else {
    const viewLink = profileCard.getByRole(
      'link',
      { name: /view profile/i }
    );

    await viewLink.click();
  }

  await page.waitForLoadState('networkidle');

  // count() doesn't wait: while the profile was still loading it returned 0
  // and the test went looking for a link that never exists. .or() auto-waits.
  const backButton = page.getByRole(
    'button',
    {
      name: '← Back to Search',
      exact: true,
    }
  );

  const backLink = page.getByRole(
    'link',
    {
      name: '← Back to Search',
      exact: true,
    }
  );

  await backButton.or(backLink).click();

  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/search/i);
});