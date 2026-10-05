const express = require("express");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const router = express.Router();

const {
  register,
  login
} = require("../controllers/authController");

const LOGIN_WINDOW_MINUTES = Number(process.env.LOGIN_WINDOW_MINUTES) || 15;

// Stops password guessing: failed logins are counted per IP + email, so one
// account gets locked for that client only (an attacker elsewhere can't lock
// the real user out). Successful logins don't count.
const loginLimiter = rateLimit({
  windowMs: LOGIN_WINDOW_MINUTES * 60 * 1000,
  limit: Number(process.env.LOGIN_MAX_ATTEMPTS) || 5,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip)}|${String(req.body?.email ?? "").trim().toLowerCase()}`,
  message: {
    success: false,
    message: `Too many failed login attempts. Please try again in ${LOGIN_WINDOW_MINUTES} minutes.`
  }
});

router.post("/register", register);
router.post("/login", loginLimiter, login);

module.exports = router;
