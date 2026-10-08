import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Database Testing (QA stage #5)
//
// The app's SQLite file is backend/everafter.db (database.js opens
// "./everafter.db" and the backend is started from the backend folder).
// Tables: users, profiles, interests.
//
// SAFETY: this file is READ-ONLY.
//   - The database is opened with SQLITE_OPEN_READONLY.
//   - Every query goes through query(), which only allows SELECT / PRAGMA.
//   - The last test proves the database file was not changed by this run.
//
// No new packages: the "sqlite3" package already installed in /backend is
// reused, so nothing is added to the frontend project.
// ---------------------------------------------------------------------------

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(THIS_DIR, '..', '..', 'backend');
const DB_PATH =
  process.env.EVERAFTER_DB_PATH || path.join(BACKEND_DIR, 'everafter.db');

const VALID_INTEREST_STATUSES = ['Pending', 'Accepted', 'Rejected'];

const USER_COLUMNS = ['id', 'fullName', 'email', 'password'];

const PROFILE_COLUMNS = [
  'id', 'userId', 'dob', 'gender', 'height', 'weight', 'religion', 'caste',
  'motherTongue', 'education', 'occupation', 'annualIncome', 'city', 'state',
  'country', 'aboutMe', 'familyDetails', 'partnerPreference', 'photo',
];

const INTEREST_COLUMNS = [
  'id', 'senderId', 'receiverId', 'status', 'createdAt',
];

let sqlite3;
let db;
let fileHashAtStart;

// --------------------------- helpers ---------------------------------------

function loadSqlite3() {
  try {
    const requireFromBackend = createRequire(
      path.join(BACKEND_DIR, 'package.json')
    );

    return requireFromBackend('sqlite3');
  } catch (error) {
    throw new Error(
      'Could not load the "sqlite3" package from ' + BACKEND_DIR +
      '. Run "npm install" inside the backend folder first.\n' +
      error.message
    );
  }
}

function fileHash(filePath) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(filePath))
    .digest('hex');
}

function openReadOnly() {
  return new Promise(function (resolve, reject) {
    const connection = new sqlite3.Database(
      DB_PATH,
      sqlite3.OPEN_READONLY,
      function (error) {
        if (error) {
          reject(error);
        } else {
          resolve(connection);
        }
      }
    );
  });
}

// Only SELECT / PRAGMA / WITH queries are allowed. Anything else throws.
function query(sql, params) {
  if (!/^\s*(select|pragma|with)\b/i.test(sql)) {
    return Promise.reject(
      new Error('Read-only test: only SELECT/PRAGMA allowed, got: ' + sql)
    );
  }

  return new Promise(function (resolve, reject) {
    db.all(sql, params || [], function (error, rows) {
      if (error) {
        reject(error);
      } else {
        resolve(rows);
      }
    });
  });
}

async function count(sql) {
  const rows = await query(sql);
  return rows[0].total;
}

async function getColumns(table) {
  const rows = await query('PRAGMA table_info(' + table + ')');
  const columns = {};

  rows.forEach(function (row) {
    columns[row.name] = {
      type: row.type,
      notNull: row.notnull === 1,
      primaryKey: row.pk === 1,
    };
  });

  return columns;
}

async function hasUniqueIndexOn(table, column) {
  const indexes = await query('PRAGMA index_list(' + table + ')');

  for (const index of indexes) {
    if (index.unique !== 1) continue;

    const info = await query('PRAGMA index_info(' + index.name + ')');

    if (
      info.length === 1 &&
      info[0].name === column
    ) {
      return true;
    }
  }

  return false;
}

async function expectNoRows(sql, message) {
  const rows = await query(sql);

  expect(
    rows,
    message + '\nOffending rows (first 20): ' +
      JSON.stringify(rows.slice(0, 20))
  ).toEqual([]);
}

// --------------------------- setup / teardown -------------------------------

test.beforeAll(async function () {
  sqlite3 = loadSqlite3();

  expect(
    fs.existsSync(DB_PATH),
    'Database file not found: ' + DB_PATH
  ).toBe(true);

  fileHashAtStart = fileHash(DB_PATH);
  db = await openReadOnly();

  // If the backend is writing at the same moment, wait instead of failing.
  db.configure('busyTimeout', 5000);
});

test.afterAll(async function () {
  if (db) {
    await new Promise(function (resolve) {
      db.close(function () {
        resolve();
      });
    });
  }
});

// --------------------------- 1. Connectivity --------------------------------

test('DB-01 Database file opens and answers a query', async function () {
  const stats = fs.statSync(DB_PATH);

  expect(stats.size, 'Database file is empty').toBeGreaterThan(0);

  const rows = await query('SELECT 1 AS ok');

  expect(rows).toEqual([{ ok: 1 }]);
});

test('DB-02 SQLite integrity check reports ok', async function () {
  const rows = await query('PRAGMA integrity_check');

  expect(rows).toEqual([{ integrity_check: 'ok' }]);
});

// --------------------------- 2. Tables --------------------------------------

test('DB-03 Expected tables exist', async function () {
  const rows = await query(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
  );

  const tables = rows.map(function (row) {
    return row.name;
  });

  for (const table of ['users', 'profiles', 'interests']) {
    expect(tables, 'Missing table: ' + table).toContain(table);
  }
});

test('DB-04 users table has the expected columns and constraints', async function () {
  const columns = await getColumns('users');

  expect(Object.keys(columns)).toEqual(expect.arrayContaining(USER_COLUMNS));

  expect(columns.id.primaryKey).toBe(true);
  expect(columns.id.type).toBe('INTEGER');

  for (const name of ['fullName', 'email', 'password']) {
    expect(columns[name].type, name + ' type').toBe('TEXT');
    expect(columns[name].notNull, name + ' should be NOT NULL').toBe(true);
  }

  expect(
    await hasUniqueIndexOn('users', 'email'),
    'users.email should have a UNIQUE constraint'
  ).toBe(true);
});

test('DB-05 profiles table has the expected columns and constraints', async function () {
  const columns = await getColumns('profiles');

  expect(Object.keys(columns)).toEqual(expect.arrayContaining(PROFILE_COLUMNS));

  expect(columns.id.primaryKey).toBe(true);
  expect(columns.userId.type).toBe('INTEGER');

  expect(
    await hasUniqueIndexOn('profiles', 'userId'),
    'profiles.userId should have a UNIQUE constraint'
  ).toBe(true);
});

test('DB-06 interests table has the expected columns and constraints', async function () {
  const columns = await getColumns('interests');

  expect(Object.keys(columns)).toEqual(expect.arrayContaining(INTEREST_COLUMNS));

  expect(columns.id.primaryKey).toBe(true);
  expect(columns.senderId.notNull, 'senderId should be NOT NULL').toBe(true);
  expect(columns.receiverId.notNull, 'receiverId should be NOT NULL').toBe(true);
  expect(columns.senderId.type).toBe('INTEGER');
  expect(columns.receiverId.type).toBe('INTEGER');
});

test('DB-07 Foreign keys are declared from profiles and interests to users', async function () {
  const profileKeys = await query('PRAGMA foreign_key_list(profiles)');
  const interestKeys = await query('PRAGMA foreign_key_list(interests)');

  function pointsToUsers(keys, fromColumn) {
    return keys.some(function (key) {
      return key.table === 'users' && key.from === fromColumn && key.to === 'id';
    });
  }

  expect(pointsToUsers(profileKeys, 'userId'), 'profiles.userId -> users.id').toBe(true);
  expect(pointsToUsers(interestKeys, 'senderId'), 'interests.senderId -> users.id').toBe(true);
  expect(pointsToUsers(interestKeys, 'receiverId'), 'interests.receiverId -> users.id').toBe(true);
});

// --------------------------- 3. Users ---------------------------------------

test('DB-08 Users can be queried and ids are integers', async function () {
  const total = await count('SELECT COUNT(*) AS total FROM users');

  expect(total, 'users table is empty').toBeGreaterThan(0);

  await expectNoRows(
    "SELECT id FROM users WHERE typeof(id) <> 'integer'",
    'users.id must always be an integer.'
  );
});

test('DB-09 Users have no NULL or blank required fields', async function () {
  await expectNoRows(
    `SELECT id FROM users
     WHERE fullName IS NULL OR trim(fullName) = ''
        OR email IS NULL OR trim(email) = ''
        OR password IS NULL OR trim(password) = ''`,
    'Every user needs fullName, email and password.'
  );
});

test('DB-10 User emails are well-formed and unique (ignoring case)', async function () {
  await expectNoRows(
    "SELECT id, email FROM users WHERE email NOT LIKE '%_@_%._%' OR email LIKE '% %'",
    'Malformed email addresses found.'
  );

  await expectNoRows(
    `SELECT lower(email) AS email, COUNT(*) AS total
     FROM users GROUP BY lower(email) HAVING COUNT(*) > 1`,
    'The same email exists more than once (different letter case).'
  );
});

test('DB-11 Passwords are stored as bcrypt hashes, not plain text', async function () {
  await expectNoRows(
    "SELECT id FROM users WHERE password NOT LIKE '$2_$%' OR length(password) <> 60",
    'These users do not have a valid bcrypt hash (ids shown, hashes are not printed).'
  );
});

// --------------------------- 4. Profiles ------------------------------------

test('DB-12 Every profile references an existing user (no orphan profiles)', async function () {
  await expectNoRows(
    "SELECT id FROM profiles WHERE userId IS NULL OR typeof(userId) <> 'integer'",
    'Profiles with NULL or non-integer userId.'
  );

  await expectNoRows(
    `SELECT p.id AS profileId, p.userId
     FROM profiles p
     LEFT JOIN users u ON u.id = p.userId
     WHERE u.id IS NULL`,
    'Orphan profiles: userId does not exist in users.'
  );
});

test('DB-13 Each user has at most one profile', async function () {
  await expectNoRows(
    `SELECT userId, COUNT(*) AS total
     FROM profiles GROUP BY userId HAVING COUNT(*) > 1`,
    'These users have more than one profile.'
  );
});

test('DB-14 Profile values are valid (gender options and date of birth format)', async function () {
  await expectNoRows(
    `SELECT id, gender FROM profiles
     WHERE gender IS NOT NULL AND gender NOT IN ('', 'Male', 'Female')`,
    "Gender must be '', 'Male' or 'Female' (the options in the Profile form)."
  );

  await expectNoRows(
    `SELECT id, dob FROM profiles
     WHERE dob IS NOT NULL AND dob <> ''
       AND (length(dob) <> 10
            OR dob NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
            OR date(dob) IS NULL)`,
    'dob must be a real date in YYYY-MM-DD format.'
  );
});

// --------------------------- 5. Interests -----------------------------------

test('DB-15 Every interest has an existing sender (no orphan senders)', async function () {
  await expectNoRows(
    `SELECT i.id AS interestId, i.senderId
     FROM interests i
     LEFT JOIN users u ON u.id = i.senderId
     WHERE u.id IS NULL`,
    'Interests whose senderId does not exist in users.'
  );
});

test('DB-16 Every interest has an existing receiver (no orphan receivers)', async function () {
  await expectNoRows(
    `SELECT i.id AS interestId, i.receiverId
     FROM interests i
     LEFT JOIN users u ON u.id = i.receiverId
     WHERE u.id IS NULL`,
    'Interests whose receiverId does not exist in users.'
  );
});

test('DB-17 Interest status is always Pending, Accepted or Rejected', async function () {
  const allowed = VALID_INTEREST_STATUSES.map(function (status) {
    return "'" + status + "'";
  }).join(', ');

  await expectNoRows(
    'SELECT id, status FROM interests WHERE status IS NULL OR status NOT IN (' +
      allowed + ')',
    'Interests with a missing or unknown status.'
  );
});

test('DB-18 No self-interests and no duplicate sender/receiver pairs', async function () {
  await expectNoRows(
    'SELECT id, senderId FROM interests WHERE senderId = receiverId',
    'A user sent an interest to themselves.'
  );

  await expectNoRows(
    `SELECT senderId, receiverId, COUNT(*) AS total
     FROM interests GROUP BY senderId, receiverId HAVING COUNT(*) > 1`,
    'The same interest was stored more than once.'
  );
});

test('DB-19 Interest createdAt timestamps are valid', async function () {
  await expectNoRows(
    `SELECT id, createdAt FROM interests
     WHERE createdAt IS NULL
        OR createdAt NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] [0-9][0-9]:[0-9][0-9]:[0-9][0-9]'
        OR datetime(createdAt) IS NULL`,
    'createdAt must be a valid "YYYY-MM-DD HH:MM:SS" timestamp.'
  );
});

// --------------------------- 6. Integrity -----------------------------------

test('DB-20 SQLite foreign_key_check finds no violations', async function () {
  const rows = await query('PRAGMA foreign_key_check');

  expect(
    rows,
    'Foreign key violations: ' + JSON.stringify(rows.slice(0, 20))
  ).toEqual([]);
});

test('DB-21 The joins used by the API return every interest row', async function () {
  const totalInterests = await count('SELECT COUNT(*) AS total FROM interests');

  // Same joins as /interest/received and /interest/matches.
  const joined = await count(
    `SELECT COUNT(*) AS total
     FROM interests i
     INNER JOIN users sender ON sender.id = i.senderId
     INNER JOIN users receiver ON receiver.id = i.receiverId`
  );

  expect(
    joined,
    'Some interests would be hidden by the API joins (orphan users).'
  ).toBe(totalInterests);
});

// --------------------------- 7. Summary + read-only proof -------------------

test('DB-22 Summary of database contents (informational)', async function () {
  const users = await count('SELECT COUNT(*) AS total FROM users');
  const profiles = await count('SELECT COUNT(*) AS total FROM profiles');
  const interests = await count('SELECT COUNT(*) AS total FROM interests');

  const withoutProfile = await count(
    `SELECT COUNT(*) AS total FROM users u
     LEFT JOIN profiles p ON p.userId = u.id
     WHERE p.id IS NULL`
  );

  const byStatus = await query(
    'SELECT status, COUNT(*) AS total FROM interests GROUP BY status ORDER BY status'
  );

  const foreignKeys = await query('PRAGMA foreign_keys');

  const lines = [
    '========== DATABASE SUMMARY ==========',
    'Database file:        ' + DB_PATH,
    'users rows:           ' + users,
    'profiles rows:        ' + profiles,
    'interests rows:       ' + interests,
    'Users without profile:' + ' ' + withoutProfile + ' (allowed: profile is optional)',
    'Interests by status:  ' +
      byStatus
        .map(function (row) {
          return row.status + '=' + row.total;
        })
        .join(', '),
    'PRAGMA foreign_keys:  ' + foreignKeys[0].foreign_keys +
      ' (0 = SQLite does not enforce FKs unless the app turns it on)',
  ];

  console.log(lines.join('\n'));

  await test.info().attach('database-summary', {
    body: lines.join('\n'),
    contentType: 'text/plain',
  });

  expect(users).toBeGreaterThan(0);
});

test('DB-23 This test run did not change the database file', async function () {
  expect(
    fileHash(DB_PATH),
    'The database file changed while the read-only tests were running.'
  ).toBe(fileHashAtStart);
});