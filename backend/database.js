const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./everafter.db", (err) => {
  if (err) {
    console.log(err.message);
  } else {
    console.log("✅ SQLite Connected");
  }
});

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

module.exports = db;