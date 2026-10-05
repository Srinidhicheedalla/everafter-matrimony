const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../database");

// Register User
exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required."
      });
    }

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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required."
    });
  }

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

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found."
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid password."
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