const express = require("express");
const router = express.Router();

const {
  sendInterest,
  getReceivedInterests,
  acceptInterest,
  rejectInterest,
  getMatches,
} = require("../controllers/interestController");

// Send Interest
router.post("/send", sendInterest);

// Received Interests
router.get("/received/:id", getReceivedInterests);

// Accept Interest
router.put("/accept/:id", acceptInterest);

// Reject Interest
router.put("/reject/:id", rejectInterest);

// Matches
router.get("/matches/:id", getMatches);

module.exports = router;