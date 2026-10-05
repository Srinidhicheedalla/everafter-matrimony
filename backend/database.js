const path = require("path");
const sqlite3 = require("sqlite3").verbose();

// Relative to this folder, not the cwd: starting the server from elsewhere
// used to silently create a new empty DB. ":memory:" (used by tests) is passed through.
const DB_PATH =
  process.env.DB_PATH === ":memory:"
    ? ":memory:"
    : path.resolve(__dirname, process.env.DB_PATH || "everafter.db");

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.log(err.message);
  } else {
    console.log("✅ SQLite Connected");
  }
});

// Serialized so the index below is created after its table
db.serialize(() => {
  // =====================
  // USERS TABLE
  // =====================
  db.run(`
  CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
  )
  `);

  // =====================
  // PROFILES TABLE
  // =====================
  db.run(`
  CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER UNIQUE,

      dob TEXT,
      gender TEXT,
      height TEXT,
      weight TEXT,

      religion TEXT,
      caste TEXT,
      motherTongue TEXT,

      education TEXT,
      occupation TEXT,
      annualIncome TEXT,

      city TEXT,
      state TEXT,
      country TEXT,

      aboutMe TEXT,
      familyDetails TEXT,
      partnerPreference TEXT,

      photo TEXT,

      FOREIGN KEY(userId) REFERENCES users(id)
  )
  `);

  // =====================
  // INTERESTS TABLE
  // =====================
  db.run(`
  CREATE TABLE IF NOT EXISTS interests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      senderId INTEGER NOT NULL,
      receiverId INTEGER NOT NULL,

      status TEXT DEFAULT 'Pending',

      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY(senderId) REFERENCES users(id),
      FOREIGN KEY(receiverId) REFERENCES users(id)
  )
  `);

  // =====================
  // ONE INTEREST PER PAIR
  // =====================
  // Either direction. Backs the check in sendInterest, which simultaneous
  // requests (double clicks) can both pass
  db.run(
    `CREATE UNIQUE INDEX IF NOT EXISTS interests_one_per_pair
     ON interests (MIN(senderId, receiverId), MAX(senderId, receiverId))`,
    (err) => {
      if (err) {
        console.warn("⚠️  One-interest-per-pair rule not active (duplicate interests exist):", err.message);
      }
    }
  );
});

module.exports = db;