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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});