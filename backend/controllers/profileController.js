const db = require("../database");

// ==========================
// Create or Update Profile
// ==========================
exports.saveProfile = (req, res) => {
  const {
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
  } = req.body;

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
exports.getProfile = (req, res) => {
  db.get(
    "SELECT * FROM profiles WHERE userId = ?",
    [req.params.id],
    (err, profile) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

      res.json(profile || {});
    }
  );
};

// ==========================
// Get All Profiles
// ==========================
exports.getAllProfiles = (req, res) => {
  db.all(
    `
    SELECT
      profiles.*,
      users.fullName AS userName,
      users.email
    FROM profiles
    INNER JOIN users
    ON profiles.userId = users.id
    `,
    [],
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