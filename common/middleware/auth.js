// common/middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../../modules/user/user.model.js";
import env from "../../config/env.js";

export const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);

    if (decoded.type === "refresh") {
      return res.status(401).json({ msg: "Invalid token type. Use access token." });
    }

    if (decoded.role === "admin") {
      req.user = { role: "admin" };
      req.selectedRole = "admin";
    } else {
      req.user = await User.findById(decoded.id);
      req.selectedRole = decoded.role || null;
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ msg: "Token expired. Please refresh." });
    }
    return res.status(401).json({ msg: "Invalid token" });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (req.selectedRole) {
      if (!roles.includes(req.selectedRole)) {
        return res.status(403).json({ msg: "Access Forbidden" });
      }
      return next();
    }

    const userRoles = Array.isArray(req.user?.roles) ? req.user.roles : req.user?.role ? [req.user.role] : [];

    if (!userRoles.some((role) => roles.includes(role))) {
      return res.status(403).json({ msg: "Access Forbidden" });
    }
    next();
  };
};``