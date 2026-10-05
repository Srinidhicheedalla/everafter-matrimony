const db = require("../database");

// Max characters per field; the free-text sections get more room
const FIELD_LIMITS = {
  aboutMe: 2000,
  familyDetails: 2000,
  partnerPreference: 2000,
  photo: 500,
};
const DEFAULT_FIELD_LIMIT = 100;

const PROFILE_FIELDS = [
  "dob", "gender", "height", "weight", "religion", "caste", "motherTongue",
  "education", "occupation", "annualIncome", "city", "state", "country",
  "aboutMe", "familyDetails", "partnerPreference", "photo",
];

// "motherTongue" -> "Mother Tongue", for messages shown to the user
const label = (field) =>
  field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

// ==========================
// Create or Update Profile
// ==========================
exports.saveProfile = (req, res, next) => {
  const userId = req.user.id;

  for (const field of PROFILE_FIELDS) {
    const value = req.body?.[field];
    if (value == null) continue;

    const limit = FIELD_LIMITS[field] ?? DEFAULT_FIELD_LIMIT;
    if (!["string", "number"].includes(typeof value) || String(value).length > limit) {
      return res.status(400).json({
        success: false,
        message: `${label(field)} must be text of at most ${limit} characters.`,
      });
    }
  }

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
        return next(err);
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
              return next(err);
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
              return next(err);
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
exports.getProfile = (req, res, next) => {
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
        return next(err);
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
exports.getAllProfiles = (req, res, next) => {
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
        return next(err);
      }

      res.json(rows);
    }
  );
};