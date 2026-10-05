const db = require("../database");

// ==========================
// Create or Update Profile
// ==========================
exports.saveProfile = (req, res) => {
  const userId = req.user.id;
  const {
    dob,
    gender,
    height,
    weight,
    religion,
    caste,
    motherTongue,
    education,
    occupation,
    annualIncome,
    city,
    state,
    country,
    aboutMe,
    familyDetails,
    partnerPreference,
    photo,
  } = req.body || {};

  db.get(
    "SELECT * FROM profiles WHERE userId = ?",
    [userId],
    (err, profile) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

      if (profile) {
        db.run(
          `UPDATE profiles SET
            dob=?,
            gender=?,
            height=?,
            weight=?,
            religion=?,
            caste=?,
            motherTongue=?,
            education=?,
            occupation=?,
            annualIncome=?,
            city=?,
            state=?,
            country=?,
            aboutMe=?,
            familyDetails=?,
            partnerPreference=?,
            photo=?
          WHERE userId=?`,
          [
            dob,
            gender,
            height,
            weight,
            religion,
            caste,
            motherTongue,
            education,
            occupation,
            annualIncome,
            city,
            state,
            country,
            aboutMe,
            familyDetails,
            partnerPreference,
            photo,
            userId,
          ],
          function (err) {
            if (err) {
              return res.status(500).json({
                success: false,
                message: err.message,
              });
            }

            res.json({
              success: true,
              message: "Profile Updated Successfully",
            });
          }
        );
      } else {
        db.run(
          `INSERT INTO profiles (
            userId,
            dob,
            gender,
            height,
            weight,
            religion,
            caste,
            motherTongue,
            education,
            occupation,
            annualIncome,
            city,
            state,
            country,
            aboutMe,
            familyDetails,
            partnerPreference,
            photo
          )
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            userId,
            dob,
            gender,
            height,
            weight,
            religion,
            caste,
            motherTongue,
            education,
            occupation,
            annualIncome,
            city,
            state,
            country,
            aboutMe,
            familyDetails,
            partnerPreference,
            photo,
          ],
          function (err) {
            if (err) {
              return res.status(500).json({
                success: false,
                message: err.message,
              });
            }

            res.json({
              success: true,
              message: "Profile Saved Successfully",
            });
          }
        );
      }
    }
  );
};

// ==========================
// Get Single Profile
// ==========================
// From users, so members who haven't filled a profile yet still have a name
exports.getProfile = (req, res) => {
  db.get(
    `
    SELECT
      profiles.*,
      users.fullName AS userName
    FROM users
    LEFT JOIN profiles
    ON profiles.userId = users.id
    WHERE users.id = ?
    `,
    [req.params.id],
    (err, profile) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Profile not found",
        });
      }

      res.json(profile);
    }
  );
};

// ==========================
// Get All Profiles
// ==========================
// Other members only: listing yourself let you "send interest" to yourself
exports.getAllProfiles = (req, res) => {
  db.all(
    `
    SELECT
      profiles.*,
      users.fullName AS userName
    FROM profiles
    INNER JOIN users
    ON profiles.userId = users.id
    WHERE profiles.userId != ?
    `,
    [req.user.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

      res.json(rows);
    }
  );
};