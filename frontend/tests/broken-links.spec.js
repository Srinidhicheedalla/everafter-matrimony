import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Broken Link Testing (QA stage #4)
//
// How it works:
//   1. Open each important page of the app.
//   2. Collect every <a href> on the page.
//   3. Ignore #, javascript:, mailto:, tel: and external sites.
//   4. Open each unique internal link once in the browser and check:
//        - the HTTP status is below 400 (4xx / 5xx = broken)
//        - the browser really stays on that page. This app is a React
//          single-page app, so the server answers 200 for ANY path. A link
//          to a page that does not exist is silently redirected to "/" by
//          the app's catch-all route, so we also treat that as broken.
//
// This file is separate from homepage.spec.js and api.spec.js.
// It only reads pages. The one thing it creates is a throwaway user (through
// the normal register API, like the existing tests) so that the pages behind
// login can be scanned.
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:5000/api';

const TIMESTAMP = Date.now();

const LINK_USER = {
  fullName: 'Broken Links User ' + TIMESTAMP,
  email: 'brokenlinks' + TIMESTAMP + '@gmail.com',
  password: 'Test@123',
};

const PUBLIC_PAGES = ['/', '/login', '/register'];

const LOGGED_IN_PAGES = [
  '/dashboard',
  '/profile',
  '/search',
  '/interests',
  '/matches',
  '/notifications',
];

const IGNORED_PREFIXES = ['#', 'javascript:', 'mailto:', 'tel:'];

// url -> result. Shared by all tests so no URL is checked twice.
const checkedLinks = new Map();

// Scanning several pages and opening each link needs more than the default 30s.
const SCAN_TIMEOUT_MS = 120000;

const summaryLines = [];

let authToken;
let authUser;

test.describe.configure({ mode: 'serial' });

function normalizePath(pathname) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

async function collectLinks(page) {
  // Wait until React has rendered the navbar (it is on every page).
  await expect(page.locator('nav')).toBeVisible();

  return page.locator('a[href]').evaluateAll(function (anchors) {
    return anchors.map(function (anchor) {
      return {
        raw: anchor.getAttribute('href'),
        resolved: anchor.href,
      };
    });
  });
}

// Splits raw anchors into: internal URLs to check, and counts of the rest.
function classifyLinks(links) {
  const siteOrigin = new URL(BASE_URL).origin;

  const internal = [];
  let ignored = 0;
  let external = 0;

  for (const link of links) {
    const raw = (link.raw || '').trim().toLowerCase();

    const isIgnored =
      !raw ||
      IGNORED_PREFIXES.some(function (prefix) {
        return raw.startsWith(prefix);
      });

    if (isIgnored) {
      ignored++;
      continue;
    }

    let url;

    try {
      url = new URL(link.resolved);
    } catch (error) {
      ignored++;
      continue;
    }

    if (url.origin !== siteOrigin) {
      external++;
      continue;
    }

    url.hash = '';
    internal.push(url.href);
  }

  return { internal, ignored, external };
}

// Opens one link in the browser and returns { status, finalPath, broken, reason }.
async function checkLink(page, url) {
  const expectedPath = normalizePath(new URL(url).pathname);

  let status = 0;
  let finalPath = '';
  let reason = '';

  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    status = response ? response.status() : 0;

    // Let the React app finish rendering and apply any redirect.
    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState('networkidle').catch(function () {});

    finalPath = normalizePath(new URL(page.url()).pathname);
  } catch (error) {
    reason = 'REQUEST FAILED: ' + error.message.split('\n')[0];
  }

  let broken = false;

  if (reason) {
    broken = true;
  } else if (status === 0 || status >= 400) {
    broken = true;
    reason = 'HTTP ' + status;
  } else if (finalPath !== expectedPath) {
    broken = true;
    reason =
      'Page does not exist: app redirected ' +
      expectedPath +
      ' -> ' +
      finalPath;
  }

  return { url, status, finalPath, broken, reason };
}

// Scans the given pages, then checks every new unique internal link.
async function scanPages(page, pagePaths, label) {
  const found = new Map(); // url -> first page it was found on
  let totalLinks = 0;
  let ignoredLinks = 0;
  let externalLinks = 0;

  const scannedPages = new Map(); // url -> HTTP status of the page we opened

  for (const pagePath of pagePaths) {
    const pageResponse = await page.goto(BASE_URL + pagePath, {
      waitUntil: 'domcontentloaded',
    });

    scannedPages.set(
      BASE_URL + (pagePath === '/' ? '/' : pagePath),
      pageResponse ? pageResponse.status() : 0
    );

    // Make sure we really stayed on this page (e.g. not bounced to /login).
    await expect(page).toHaveURL(
      new RegExp(pagePath === '/' ? '/$' : pagePath + '/?$')
    );

    const links = await collectLinks(page);
    const classified = classifyLinks(links);

    totalLinks += links.length;
    ignoredLinks += classified.ignored;
    externalLinks += classified.external;

    for (const url of classified.internal) {
      if (!found.has(url)) {
        found.set(url, pagePath);
      }
    }
  }

  const newUrls = Array.from(found.keys()).filter(function (url) {
    return !checkedLinks.has(url);
  });

  for (const url of newUrls) {
    let result;

    if (scannedPages.has(url)) {
      // We already opened this page above and confirmed we stayed on it,
      // so there is no need to open it a second time.
      const status = scannedPages.get(url);
      result = {
        url,
        status,
        finalPath: normalizePath(new URL(url).pathname),
        broken: status === 0 || status >= 400,
        reason: status >= 400 ? 'HTTP ' + status : '',
      };
    } else {
      result = await checkLink(page, url);
    }

    result.foundOn = found.get(url);
    checkedLinks.set(url, result);
  }

  const results = Array.from(found.keys()).map(function (url) {
    return checkedLinks.get(url);
  });

  const broken = results.filter(function (result) {
    return result.broken;
  });

  const lines = [];

  lines.push('----- ' + label + ' -----');
  lines.push('Pages scanned:        ' + pagePaths.length + ' (' + pagePaths.join(', ') + ')');
  lines.push('Total <a href> found: ' + totalLinks);
  lines.push('Ignored (#/mailto/..): ' + ignoredLinks);
  lines.push('External skipped:     ' + externalLinks);
  lines.push('Unique links checked: ' + results.length);
  lines.push('Broken links:         ' + broken.length);

  results.forEach(function (result) {
    lines.push(
      '  ' +
        (result.broken ? '[BROKEN] ' : '[ OK ]   ') +
        'HTTP ' + result.status + '  ' + result.url +
        '  (found on ' + result.foundOn + ')' +
        (result.reason ? '  <- ' + result.reason : '')
    );
  });

  console.log(lines.join('\n'));
  summaryLines.push(lines.join('\n'));

  await test.info().attach('broken-links-report', {
    body: lines.join('\n'),
    contentType: 'text/plain',
  });

  return { results, broken };
}

function describeBroken(broken) {
  return (
    'Broken links found:\n' +
    broken
      .map(function (item) {
        return (
          '  HTTP ' + item.status + '  ' + item.url +
          '  (found on ' + item.foundOn + ')  ' + item.reason
        );
      })
      .join('\n')
  );
}

test.beforeAll(async function ({ request }) {
  // Throwaway user so the pages behind login can be scanned.
  const registerResponse = await request.post(API_URL + '/auth/register', {
    data: LINK_USER,
  });

  expect(registerResponse.status()).toBe(201);

  const loginResponse = await request.post(API_URL + '/auth/login', {
    data: { email: LINK_USER.email, password: LINK_USER.password },
  });

  expect(loginResponse.status()).toBe(200);

  const loginBody = await loginResponse.json();

  authToken = loginBody.token;
  authUser = loginBody.user;

  expect(authToken).toBeTruthy();
  expect(authUser.id).toBeTruthy();
});

test('Broken links - public pages (logged out)', async function ({ page }) {
  test.setTimeout(SCAN_TIMEOUT_MS);

  const { results, broken } = await scanPages(
    page,
    PUBLIC_PAGES,
    'PUBLIC PAGES'
  );

  expect(results.length, 'No internal links found on public pages').toBeGreaterThan(0);
  expect(broken, describeBroken(broken)).toEqual([]);
});

test('Broken links - pages after login', async function ({ page }) {
  test.setTimeout(SCAN_TIMEOUT_MS);

  // The app keeps the login in localStorage ("token" and "user"),
  // so set them before any page script runs.
  await page.addInitScript(
    function (session) {
      localStorage.setItem('token', session.token);
      localStorage.setItem('user', JSON.stringify(session.user));
    },
    { token: authToken, user: authUser }
  );

  const { results, broken } = await scanPages(
    page,
    LOGGED_IN_PAGES,
    'PAGES AFTER LOGIN'
  );

  expect(results.length, 'No internal links found after login').toBeGreaterThan(0);
  expect(broken, describeBroken(broken)).toEqual([]);
});

test('Broken links - detector self-check (unknown page is caught)', async function ({
  page,
}) {
  // Proves the checker really works: a page that does not exist must be
  // reported as broken, even though the dev server answers 200 for it.
  const result = await checkLink(
    page,
    BASE_URL + '/this-page-does-not-exist-' + TIMESTAMP
  );

  expect(result.broken).toBe(true);
  expect(result.reason).toContain('Page does not exist');
});