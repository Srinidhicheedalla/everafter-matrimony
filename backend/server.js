const express = require("express");
const cors = require("cors");
require("dotenv").config();

require("./database");

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const interestRoutes = require("./routes/interest");

const app = express();

app.use(cors());
app.use(express.json());

// ===========================
// API Routes
// ===========================
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/interest", interestRoutes);

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