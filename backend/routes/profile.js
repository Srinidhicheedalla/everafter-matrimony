const express = require("express");
const router = express.Router();

const {
  saveProfile,
  getProfile,
  getAllProfiles,
} = require("../controllers/profileController");

router.post("/save", saveProfile);

// IMPORTANT: /all must come before /:id
router.get("/all", getAllProfiles);

router.get("/:id", getProfile);

module.exports = router;