const db = require("../database");

// ===============================
// Send Interest
// ===============================
exports.sendInterest = (req, res) => {
  const { senderId, receiverId } = req.body;

  if (!senderId || !receiverId) {
    return res.json({
      success: false,
      message: "Sender and Receiver are required",
    });
  }

  if (senderId == receiverId) {
    return res.json({
      success: false,
      message: "You cannot send interest to yourself",
    });
  }

  db.get(
    `SELECT * FROM interests
     WHERE senderId=? AND receiverId=?`,
    [senderId, receiverId],
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
          message: "Interest already sent",
        });
      }

      db.run(
        `INSERT INTO interests(senderId,receiverId,status)
         VALUES(?,?,?)`,
        [senderId, receiverId, "Pending"],
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
    [req.params.id],
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
// Accept Interest
// ===============================
exports.acceptInterest = (req, res) => {
  db.run(
    `UPDATE interests
     SET status='Accepted'
     WHERE id=?`,
    [req.params.id],
    function (err) {
      if (err) {
        return res.json({
          success: false,
          message: err.message,
        });
      }

      res.json({
        success: true,
        message: "Interest Accepted",
      });
    }
  );
};

// ===============================
// Reject Interest
// ===============================
exports.rejectInterest = (req, res) => {
  db.run(
    `UPDATE interests
     SET status='Rejected'
     WHERE id=?`,
    [req.params.id],
    function (err) {
      if (err) {
        return res.json({
          success: false,
          message: err.message,
        });
      }

      res.json({
        success: true,
        message: "Interest Rejected",
      });
    }
  );
};

// ===============================
// Get Matches
// ===============================
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
      ON users.id = interests.senderId

    LEFT JOIN profiles
      ON profiles.userId = users.id

    WHERE interests.receiverId = ?
      AND interests.status = 'Accepted'
    `,
    [req.params.id],
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