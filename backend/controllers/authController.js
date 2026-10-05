const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../database");

// Non-strings must be rejected here: bcrypt throws on them inside the async
// db callback, which Express can't catch, and the whole server crashes.
const isFilled = (v) => typeof v === "string" && v.length > 0;

// Emails are stored and looked up lowercased so "Ravi@x.com" can log in as "ravi@x.com"
const normalizeEmail = (email) => email.trim().toLowerCase();

// Register User
exports.register = async (req, res) => {
  try {
    const { fullName, email: rawEmail, password } = req.body || {};

    if (!isFilled(fullName) || !isFilled(rawEmail) || !isFilled(password)) {
      return res.status(400).json({
        success: false,
        message: "All fields are required."
      });
    }

    const email = normalizeEmail(rawEmail);

    db.get(
      "SELECT * FROM users WHERE email = ?",
      [email],
      async (err, user) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: err.message
          });
        }

        if (user) {
          return res.status(409).json({
            success: false,
            message: "Email already exists."
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.run(
          "INSERT INTO users(fullName,email,password) VALUES(?,?,?)",
          [fullName, email, hashedPassword],
          function (err) {
            if (err) {
              return res.status(500).json({
                success: false,
                message: err.message
              });
            }

            return res.status(201).json({
              success: true,
              message: "Registration Successful",
              userId: this.lastID
            });
          }
        );
      }
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Login User
exports.login = (req, res) => {
  const { email, password } = req.body || {};

  if (!isFilled(email) || !isFilled(password)) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required."
    });
  }

  db.get(
    "SELECT * FROM users WHERE email = ?",
    [normalizeEmail(email)],
    async (err, user) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message
        });
      }

      // Same response for unknown email and wrong password, so login can't be
      // used to check whether someone has an account
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password."
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d"
        }
      );

      res.json({
        success: true,
        message: "Login Successful",
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email
        }
      });
    }
  );
};