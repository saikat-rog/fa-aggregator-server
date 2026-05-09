// modules/auth/auth.service.js
import User from "../user/user.model.js";
import OTP from "./otp.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../common/services/mail.service.js";
import env from "../../config/env.js";

export const register = async (data) => {
  const { email, password, role, name } = data;
  const requestedRole = role || "user";

  const hashed = await bcrypt.hash(password, 10);

  if (!["user", "advisor"].includes(requestedRole)) {
    throw new Error("Invalid role");
  }
  
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    const existingRoles = Array.isArray(existingUser.roles)
      ? existingUser.roles
      : [];
    const hasSameRole = existingRoles.includes(requestedRole);

    if (hasSameRole) {
      return { msg: "Account already exist" };
    }
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await sendEmail(email, otp);

  if (existingUser) {
    await OTP.create({
      email,
      otp,
      role: requestedRole,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return { msg: `OTP sent to the email. OTP: ${otp}` };
  }

  await User.create({ email, password: hashed, roles: [requestedRole], name });

  await OTP.create({
    email,
    otp,
    role: requestedRole,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  return { msg: "OTP sent to the email" };
};

export const verifyOTP = async (data) => {
  const { email, otp } = data;

  const record = await OTP.findOne({ email, otp });

  if (!record || record.expiresAt < Date.now()) {
    throw new Error("Invalid or expired OTP");
  }

  const user = await User.findOne({ email });

  if (user) {
    const existingRoles = Array.isArray(user.roles) ? user.roles : [];
    const pendingRole = record.role || "user";
    const mergedRoles = [...new Set([...existingRoles, pendingRole])];

    user.roles = mergedRoles;
    user.isVerified = true;
    await user.save();
  } else {
    await User.updateOne({ email }, { isVerified: true });
  }

  await OTP.deleteMany({ email });

  return { msg: "Email verified" };
};

export const login = async (data) => {
  const { email, password } = data;

  const user = await User.findOne({ email });

  if (!user) throw new Error("User not found");
  if (!user.isVerified) throw new Error("Email not verified");

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Wrong password");

  const requestedRole = data.role;

  let selectedRole = null;
  if (requestedRole) {
    if (!Array.isArray(user.roles) || !user.roles.includes(requestedRole)) {
      throw new Error("User does not have the requested role");
    }
    selectedRole = requestedRole;
  } else {
    if (Array.isArray(user.roles) && user.roles.length === 1) {
      selectedRole = user.roles[0];
    } else if (!Array.isArray(user.roles) || user.roles.length === 0) {
      throw new Error("No roles assigned to user");
    } else {
      throw new Error("Multiple roles found. Specify role to login as");
    }
  }

  const accessToken = jwt.sign(
    { id: user._id, role: selectedRole, roles: user.roles, type: "access" },
    env.jwtSecret,
    { expiresIn: env.accessTokenExpiry }
  );

  const refreshToken = jwt.sign(
    { id: user._id, role: selectedRole, type: "refresh" },
    env.jwtSecret,
    { expiresIn: env.refreshTokenExpiry }
  );

  global.refreshTokens = global.refreshTokens || {};
  global.refreshTokens[refreshToken] = { userId: user._id, createdAt: Date.now() };

  return { 
    accessToken, 
    refreshToken,
    role: selectedRole, 
    roles: user.roles,
    expiresIn: "20m"
  };
};

export const adminLogin = async (data) => {
  const { email, password } = data;

  if (email !== env.adminEmail) {
    throw new Error("Invalid admin email");
  }

  if (password !== env.adminPassword) {
    throw new Error("Invalid admin password");
  }

  const accessToken = jwt.sign(
    { role: "admin", type: "access" },
    env.jwtSecret,
    { expiresIn: env.accessTokenExpiry }
  );

  const refreshToken = jwt.sign(
    { role: "admin", type: "refresh" },
    env.jwtSecret,
    { expiresIn: env.refreshTokenExpiry }
  );

  global.refreshTokens = global.refreshTokens || {};
  global.refreshTokens[refreshToken] = { role: "admin", createdAt: Date.now() };

  return {
    accessToken,
    refreshToken,
    role: "admin",
    expiresIn: "20m"
  };
};

export const refreshAccessToken = async (data) => {
  const { refreshToken } = data;

  if (!refreshToken) {
    throw new Error("Refresh token required");
  }

  global.refreshTokens = global.refreshTokens || {};

  if (!global.refreshTokens[refreshToken]) {
    throw new Error("Invalid or expired refresh token");
  }

  try {
    const decoded = jwt.verify(refreshToken, env.jwtSecret);

    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }

    let newAccessToken;
    let newRefreshToken;
    if (decoded.role === "admin") {
      newAccessToken = jwt.sign(
        { role: "admin", type: "access" },
        env.jwtSecret,
        { expiresIn: env.accessTokenExpiry }
      );

      newRefreshToken = jwt.sign(
        { role: "admin", type: "refresh" },
        env.jwtSecret,
        { expiresIn: env.refreshTokenExpiry }
      );
    } else {
      const user = await User.findById(decoded.id);
      if (!user) throw new Error("User not found");

      newAccessToken = jwt.sign(
        { id: user._id, role: decoded.role || user.roles[0], roles: user.roles, type: "access" },
        env.jwtSecret,
        { expiresIn: env.accessTokenExpiry }
      );

      newRefreshToken = jwt.sign(
        { id: user._id, role: decoded.role || user.roles[0], type: "refresh" },
        env.jwtSecret,
        { expiresIn: env.refreshTokenExpiry }
      );
    }

    delete global.refreshTokens[refreshToken];
    global.refreshTokens[newRefreshToken] = {
      userId: decoded.id || null,
      role: decoded.role || null,
      createdAt: Date.now()
    };

    return { 
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: "20m"
    };
  } catch (error) {
    delete global.refreshTokens[refreshToken];
    throw new Error("Refresh token validation failed");
  }
};

export const logout = async (data) => {
  const { refreshToken } = data;

  if (!refreshToken) {
    return { msg: "Logged out" };
  }

  global.refreshTokens = global.refreshTokens || {};
  delete global.refreshTokens[refreshToken];

  return { msg: "Logged out" };
};
