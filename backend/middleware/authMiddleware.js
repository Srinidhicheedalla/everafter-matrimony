const jwt = require("jsonwebtoken");

// Verifies "Authorization: Bearer <token>" and sets req.user = { id, email }.
// Controllers must take the acting user from req.user, never from the request body/URL.
module.exports = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer /, "");

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Please login again."
    });
  }
};
