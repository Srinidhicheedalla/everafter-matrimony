const db = require("../database");

const STATUS = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

// ===============================
// Send Interest
// ===============================
exports.sendInterest = (req, res) => {
  const senderId = req.user.id;
  const { receiverId } = req.body || {};

  if (!receiverId) {
    return res.json({
      success: false,
      message: "Receiver is required",
    });
  }

  if (senderId == receiverId) {
    return res.json({
      success: false,
      message: "You cannot send interest to yourself",
    });
  }

  // One interest per pair, whichever direction: if B could also send to A,
  // accepting both would list the same match twice
  db.get(
    `SELECT senderId FROM interests
     WHERE (senderId=$a AND receiverId=$b)
        OR (senderId=$b AND receiverId=$a)`,
    { $a: senderId, $b: receiverId },
    (err, row) => {
      if (err) {
        return res.json({
          success: false,
          message: err.message,
        });
      }

      if (row) {
        return res.json({
          success: false,
          message:
            row.senderId == senderId
              ? "Interest already sent"
              : "This member already sent you an interest. Check your Interests page.",
        });
      }

      db.run(
        `INSERT INTO interests(senderId,receiverId,status)
         VALUES(?,?,?)`,
        [senderId, receiverId, STATUS.PENDING],
        function (err) {
          if (err) {
            return res.json({
              success: false,
              message: err.message,
            });
          }

          res.json({
            success: true,
            message: "Interest Sent Successfully ❤️",
          });
        }
      );
    }
  );
};

// ===============================
// Received Interests
// ===============================
exports.getReceivedInterests = (req, res) => {
  db.all(
    `
    SELECT
      interests.*,
      users.fullName
    FROM interests
    INNER JOIN users
    ON interests.senderId = users.id
    WHERE receiverId=?
    `,
    [req.user.id],
    (err, rows) => {
      if (err) {
        return res.json({
          success: false,
          message: err.message,
        });
      }

      res.json(rows);
    }
  );
};

// ===============================
// Accept / Reject Interest
// ===============================
// Only the receiver may respond; anyone else gets 404 so ids can't be probed
const respondToInterest = (status) => (req, res) => {
  db.run(
    `UPDATE interests
     SET status=?
     WHERE id=? AND receiverId=?`,
    [status, req.params.id, req.user.id],
    function (err) {
      if (err) {
        return res.json({
          success: false,
          message: err.message,
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: "Interest not found",
        });
      }

      res.json({
        success: true,
        message: `Interest ${status}`,
      });
    }
  );
};

exports.acceptInterest = respondToInterest(STATUS.ACCEPTED);
exports.rejectInterest = respondToInterest(STATUS.REJECTED);

// ===============================
// Get Matches
// ===============================
// An accepted interest is a match for both people; each sees the other one
exports.getMatches = (req, res) => {
  db.all(
    `
    SELECT
      interests.id,
      interests.status,
      users.fullName,
      users.email,
      profiles.city,
      profiles.religion,
      profiles.education,
      profiles.occupation
    FROM interests

    INNER JOIN users
      ON users.id = CASE
        WHEN interests.senderId = $me THEN interests.receiverId
        ELSE interests.senderId
      END

    LEFT JOIN profiles
      ON profiles.userId = users.id

    WHERE $me IN (interests.senderId, interests.receiverId)
      AND interests.status = $accepted
    `,
    { $me: req.user.id, $accepted: STATUS.ACCEPTED },
    (err, rows) => {
      if (err) {
        return res.json({
          success: false,
          message: err.message,
        });
      }

      res.json(rows);
    }
  );
};