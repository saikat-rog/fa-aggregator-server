// modules/auth/auth.service.js
import User from "../../models/user.model.js";
import OTP from "../../models/otp.model.js";
import RefreshToken from "../../models/refreshToken.model.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../common/services/mail.service.js";
import env from "../../config/env.js";

const AUTH_ROLES = ["user", "advisor"];
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getRefreshTokenExpiryDate = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const createRefreshToken = async ({ userId = null, role }) => {
  const payload = { role, type: "refresh", jti: crypto.randomUUID() };

  if (userId) {
    payload.id = userId;
  }

  const refreshToken = jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.refreshTokenExpiry,
  });

  await RefreshToken.create({
    tokenHash: RefreshToken.hashToken(refreshToken),
    user: userId,
    role,
    expiresAt: getRefreshTokenExpiryDate(),
  });

  return refreshToken;
};

const findStoredRefreshToken = async (refreshToken) =>
  RefreshToken.findOne({ tokenHash: RefreshToken.hashToken(refreshToken) });

const deleteRefreshToken = async (refreshToken) =>
  RefreshToken.deleteOne({ tokenHash: RefreshToken.hashToken(refreshToken) });

const setRoleCredential = (user, role, password) => {
  const credentials = Array.isArray(user.authCredentials) ? user.authCredentials : [];
  const existingCredential = credentials.find((credential) => credential.role === role);

  if (existingCredential) {
    existingCredential.password = password;
  } else {
    credentials.push({ role, password });
  }

  user.authCredentials = credentials;
};

const getRolePassword = (user, role) => {
  const credential = user.authCredentials?.find((item) => item.role === role);
  return credential?.password || user.password;
};

export const register = async (data, approxLocation) => {
  const { password, role, name, phone } = data;
  const email = data.email?.trim().toLowerCase();
  const requestedRole = role || "user";
  const phoneNumber = phone ? phone.trim() : null;
  const roleToVerify = requestedRole;

  if (!AUTH_ROLES.includes(requestedRole)) {
    throw new Error("Invalid role");
  }

  if (!password) {
    throw new Error("Password is required");
  }

  const hashed = await bcrypt.hash(password, 10);
  
  const existingUser = await User.findOne({ email }).select("+password +authCredentials");

  if (existingUser) {
    const existingRoles = Array.isArray(existingUser.roles)
      ? existingUser.roles
      : [];
    const hasRequestedVerifiedRole = existingUser.isVerified && existingRoles.includes(requestedRole);

    if (hasRequestedVerifiedRole) {
      return { msg: "Account already exist" };
    }
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // await sendEmail(email, otp);

  if (existingUser) {
    existingUser.name = name || existingUser.name;
    if (!existingUser.isVerified || !existingUser.password || requestedRole === "user") {
      existingUser.password = hashed;
    }
    existingUser.roles = [...new Set([...(Array.isArray(existingUser.roles) ? existingUser.roles : []), roleToVerify])];
    setRoleCredential(existingUser, requestedRole, hashed);

    if (approxLocation) {
      existingUser.approxLocation = approxLocation;
    }

    existingUser.phone = phoneNumber || existingUser.phone;

    await existingUser.save();

    await OTP.create({
      email,
      otp,
      role: roleToVerify,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return { msg: `OTP sent to the email. OTP: ${otp}` };
  }

  await User.create({
    email,
    password: hashed,
    authCredentials: [{ role: requestedRole, password: hashed }],
    roles: [roleToVerify],
    name,
    phone: phoneNumber,
    approxLocation,
  });

  await OTP.create({
    email,
    otp,
    role: roleToVerify,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  return { msg: `OTP sent to the email. OTP: ${otp}` };
};

export const verifyOTP = async (data) => {
  const { otp } = data;
  const email = data.email?.trim().toLowerCase();

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
  const { password } = data;
  const email = data.email?.trim().toLowerCase();

  const user = await User.findOne({ email }).select("+password +authCredentials");

  if (!user) throw createError(INVALID_CREDENTIALS_MESSAGE, 401);
  if (!user.isVerified) throw new Error("Email not verified");

  const requestedRole = data.role;

  let selectedRole = null;
  if (requestedRole) {
    if (!Array.isArray(user.roles) || !user.roles.includes(requestedRole)) {
      throw createError(INVALID_CREDENTIALS_MESSAGE, 401);
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

  const selectedRolePassword = getRolePassword(user, selectedRole);
  if (!selectedRolePassword) {
    throw createError(INVALID_CREDENTIALS_MESSAGE, 401);
  }

  const match = await bcrypt.compare(password, selectedRolePassword);
  if (!match) throw createError(INVALID_CREDENTIALS_MESSAGE, 401);

  const accessToken = jwt.sign(
    { id: user._id, role: selectedRole, roles: user.roles, type: "access" },
    env.jwtSecret,
    { expiresIn: env.accessTokenExpiry }
  );

  const refreshToken = await createRefreshToken({
    userId: user._id,
    role: selectedRole,
  });

  return { 
    accessToken, 
    refreshToken,
    role: selectedRole,
  };
};

export const refreshAccessToken = async (data) => {
  const { refreshToken } = data;

  if (!refreshToken) {
    throw new Error("Refresh token required");
  }

  const storedToken = await findStoredRefreshToken(refreshToken);

  if (!storedToken) {
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

      newRefreshToken = await createRefreshToken({ role: "admin" });
    } else {
      const user = await User.findById(decoded.id);
      if (!user) throw new Error("User not found");

      newAccessToken = jwt.sign(
        { id: user._id, role: decoded.role || user.roles[0], roles: user.roles, type: "access" },
        env.jwtSecret,
        { expiresIn: env.accessTokenExpiry }
      );

      newRefreshToken = await createRefreshToken({
        userId: user._id,
        role: decoded.role || user.roles[0],
      });
    }

    await RefreshToken.deleteOne({ _id: storedToken._id });

    return { 
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    await deleteRefreshToken(refreshToken);
    throw new Error("Refresh token validation failed");
  }
};

export const logout = async (data) => {
  const { refreshToken } = data;

  if (!refreshToken) {
    return { msg: "Logged out" };
  }

  await deleteRefreshToken(refreshToken);

  return { msg: "Logged out" };
};

export { createRefreshToken };
