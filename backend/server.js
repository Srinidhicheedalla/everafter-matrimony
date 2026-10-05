const path = require("path");
const express = require("express");
const cors = require("cors");

// Resolve .env from this folder, not the cwd, so `node backend/server.js` works from anywhere
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Fail at startup, not on the first login (jwt.sign throws without a secret)
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set. Copy backend/.env.example to backend/.env");
}

require("./database");

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const interestRoutes = require("./routes/interest");
const auth = require("./middleware/authMiddleware");

const app = express();

// Comma-separated allowed origins; unset allows any (local dev)
// (explicit "*": cors treats origin: undefined as "send no CORS headers")
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? "*" }));
app.use(express.json());

// ===========================
// API Routes
// ===========================
app.use("/api/auth", authRoutes);
app.use("/api/profile", auth, profileRoutes);
app.use("/api/interest", auth, interestRoutes);

// ===========================
// Health Check
// ===========================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "EverAfter Matrimony Backend Running 🚀",
  });
});

// ===========================
// Errors
// ===========================
// JSON instead of Express's default HTML page, which includes a stack trace
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Not found" });
});

// e.g. malformed JSON body (400) or an oversized one (413)
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);

  res.status(status).json({
    success: false,
    message: status < 500 ? "Invalid request" : "Something went wrong",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});