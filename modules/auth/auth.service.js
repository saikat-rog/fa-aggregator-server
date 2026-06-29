// modules/auth/auth.service.js
import User from "../../models/user.model.js";
import OTP from "../../models/otp.model.js";
import RefreshToken from "../../models/refreshToken.model.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import env from "../../config/env.js";
import {
  buildOtpEmail,
  buildWelcomeEmail,
  sendTemplatedEmail,
} from "../../common/services/mail.service.js";

const AUTH_ROLES = ["user", "advisor"];
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";
const isDevelopment = env.nodeEnv === "development";
const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 15 * 1000;
const getOtpSentMessage = (otp) =>
  isDevelopment ? `OTP sent to the email. OTP: ${otp}` : "OTP sent to the email";
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const normalizePhone = (phone = "") => phone.replace(/[\s()-]/g, "");
const googleClient = new OAuth2Client(env.googleClientId);

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

const sendOtpEmail = ({ email, otp, purpose }) =>
  sendTemplatedEmail({
    to: email,
    template: buildOtpEmail({ otp, purpose }),
  });

const sendWelcomeMessage = ({ email, name, role }) =>
  sendTemplatedEmail({
    to: email,
    template: buildWelcomeEmail({ name, role }),
  });

const sendWelcomeMessageIfPossible = async (payload) => {
  try {
    await sendWelcomeMessage(payload);
  } catch (error) {
    console.error("Failed to send welcome email:", error.message);
  }
};

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

const ensureValidRole = (role) => {
  if (!AUTH_ROLES.includes(role)) {
    throw createError("Invalid role");
  }
};

const issueUserTokens = async (user, selectedRole) => {
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
    roles: user.roles,
  };
};

const verifyGoogleTokenAndGetProfile = async (idToken) => {
  if (!env.googleClientId) {
    throw createError("GOOGLE_CLIENT_ID is not configured", 500);
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.googleClientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.email || !payload?.sub) {
    throw createError("Invalid Google token", 401);
  }

  return {
    email: payload.email.toLowerCase(),
    googleId: payload.sub,
    name: payload.name?.trim(),
    emailVerified: Boolean(payload.email_verified),
  };
};

export const register = async (data, approxLocation) => {
  const { password, role, name, phone } = data;
  const email = data.email?.trim().toLowerCase();
  const requestedRole = role || "user";
  const phoneNumber = phone ? normalizePhone(phone.trim()) : null;
  const roleToVerify = requestedRole;

  ensureValidRole(requestedRole);

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

  const otp = generateOtp();

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
      purpose: "verify_email",
      expiresAt: Date.now() + OTP_TTL_MS,
    });
    await sendOtpEmail({ email, otp, purpose: "verify_email" });

    return { msg: getOtpSentMessage(otp) };
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
    purpose: "verify_email",
    expiresAt: Date.now() + OTP_TTL_MS,
  });
  await sendOtpEmail({ email, otp, purpose: "verify_email" });

  return { msg: getOtpSentMessage(otp) };
};

export const googleAuth = async (data = {}, approxLocation) => {
  const idToken = data.idToken?.trim();
  const requestedRole = data.role || "user";
  const providedName = data.name?.trim();
  const phoneNumber = data.phone ? normalizePhone(data.phone.trim()) : null;

  ensureValidRole(requestedRole);

  if (!idToken) {
    throw createError("Google idToken is required");
  }

  const googleProfile = await verifyGoogleTokenAndGetProfile(idToken);

  const user = await User.findOne({ email: googleProfile.email }).select("+password +authCredentials");
  const resolvedName = providedName || googleProfile.name;

  if (!user) {
    if (!resolvedName) {
      throw createError("Name is required to complete Google signup", 422);
    }

    const newUser = await User.create({
      email: googleProfile.email,
      name: resolvedName,
      phone: phoneNumber,
      roles: [requestedRole],
      isVerified: true,
      approxLocation,
      googleAuth: {
        googleId: googleProfile.googleId,
        email: googleProfile.email,
        linkedAt: new Date(),
      },
    });

    await sendWelcomeMessageIfPossible({
      email: newUser.email,
      name: newUser.name,
      role: requestedRole,
    });

    return issueUserTokens(newUser, requestedRole);
  }

  if (!resolvedName && !user.name) {
    throw createError("Name is required to complete Google signup", 422);
  }

  user.name = user.name || resolvedName;
  if (phoneNumber) {
    user.phone = phoneNumber;
  }
  if (approxLocation && !user.approxLocation) {
    user.approxLocation = approxLocation;
  }

  user.roles = [...new Set([...(Array.isArray(user.roles) ? user.roles : []), requestedRole])];
  user.isVerified = true;
  user.googleAuth = {
    googleId: googleProfile.googleId,
    email: googleProfile.email,
    linkedAt: user.googleAuth?.linkedAt || new Date(),
  };

  await user.save();

  return issueUserTokens(user, requestedRole);
};

export const verifyOTP = async (data) => {
  const { otp } = data;
  const email = data.email?.trim().toLowerCase();

  const record = await OTP.findOne({ email, otp, purpose: "verify_email" });

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
    await sendWelcomeMessageIfPossible({
      email: user.email,
      name: user.name,
      role: pendingRole,
    });
  } else {
    await User.updateOne({ email }, { isVerified: true });
  }

  await OTP.deleteMany({ email, purpose: "verify_email" });

  return { msg: "Email verified" };
};

export const resendOTP = async (data) => {
  const email = data.email?.trim().toLowerCase();
  const requestedRole = data.role || "user";

  if (!email) {
    throw new Error("Email is required");
  }

  ensureValidRole(requestedRole);

  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("User not found");
  }

  const hasRole = Array.isArray(user.roles) && user.roles.includes(requestedRole);
  if (user.isVerified && hasRole) {
    throw new Error("Email already verified");
  }

  const latestOtpRecord = await OTP.findOne({ email, role: requestedRole, purpose: "verify_email" }).sort({
    expiresAt: -1,
  });

  if (latestOtpRecord?.expiresAt) {
    const remainingValidityMs = new Date(latestOtpRecord.expiresAt).getTime() - Date.now();
    const cooldownThresholdMs = OTP_TTL_MS - RESEND_COOLDOWN_MS;

    if (remainingValidityMs > cooldownThresholdMs) {
      const retryAfterSeconds = Math.ceil(
        (remainingValidityMs - cooldownThresholdMs) / 1000,
      );
      throw createError(
        `Please wait ${retryAfterSeconds}s before requesting a new OTP`,
        429,
      );
    }
  }

  const otp = generateOtp();

  await OTP.deleteMany({ email, role: requestedRole, purpose: "verify_email" });
  await OTP.create({
    email,
    otp,
    role: requestedRole,
    purpose: "verify_email",
    expiresAt: Date.now() + OTP_TTL_MS,
  });

  await sendOtpEmail({ email, otp, purpose: "verify_email" });

  return { msg: getOtpSentMessage(otp) };
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
    if (user.googleAuth?.googleId) {
      throw createError(
        "Google authentication is enabled for this account. Please login with Google first, then set a password.",
        401,
      );
    }

    throw createError(INVALID_CREDENTIALS_MESSAGE, 401);
  }

  const match = await bcrypt.compare(password, selectedRolePassword);
  if (!match) throw createError(INVALID_CREDENTIALS_MESSAGE, 401);

  return issueUserTokens(user, selectedRole);
};

export const createRolePassword = async ({ userId, role, password }) => {
  ensureValidRole(role);

  if (!password || password.length < 8) {
    throw createError("Password must be at least 8 characters long");
  }

  const user = await User.findById(userId).select("+password +authCredentials");
  if (!user) {
    throw createError("User not found", 404);
  }

  if (!Array.isArray(user.roles) || !user.roles.includes(role)) {
    throw createError("User does not have this role", 403);
  }

  const hashed = await bcrypt.hash(password, 10);
  setRoleCredential(user, role, hashed);

  // keep backward compatibility for older user role login behavior
  if (role === "user") {
    user.password = hashed;
  }

  await user.save();
  return { msg: `Password created for ${role}` };
};

export const requestPasswordResetOtp = async ({ email, role }) => {
  const normalizedEmail = email?.trim().toLowerCase();
  const requestedRole = role || "user";

  if (!normalizedEmail) {
    throw createError("Email is required");
  }
  ensureValidRole(requestedRole);

  const user = await User.findOne({ email: normalizedEmail }).select("+password +authCredentials");
  if (!user) {
    throw createError("User not found", 404);
  }

  const rolePassword = getRolePassword(user, requestedRole);
  if (!rolePassword) {
    throw createError(
      "You have another login method. Please use Login with Google",
      400,
    );
  }

  const otp = generateOtp();
  await OTP.deleteMany({ email: normalizedEmail, role: requestedRole, purpose: "reset_password" });
  await OTP.create({
    email: normalizedEmail,
    otp,
    role: requestedRole,
    purpose: "reset_password",
    expiresAt: Date.now() + OTP_TTL_MS,
  });

  await sendOtpEmail({ email: normalizedEmail, otp, purpose: "reset_password" });
  return { msg: getOtpSentMessage(otp) };
};

export const resetPasswordWithOtp = async ({ email, role, otp, newPassword }) => {
  const normalizedEmail = email?.trim().toLowerCase();
  const requestedRole = role || "user";

  if (!normalizedEmail || !otp || !newPassword) {
    throw createError("email, role, otp and newPassword are required");
  }

  ensureValidRole(requestedRole);

  if (newPassword.length < 8) {
    throw createError("Password must be at least 8 characters long");
  }

  const otpRecord = await OTP.findOne({
    email: normalizedEmail,
    role: requestedRole,
    otp,
    purpose: "reset_password",
  });

  if (!otpRecord || otpRecord.expiresAt < Date.now()) {
    throw createError("Invalid or expired OTP", 400);
  }

  const user = await User.findOne({ email: normalizedEmail }).select("+password +authCredentials");
  if (!user) {
    throw createError("User not found", 404);
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  setRoleCredential(user, requestedRole, hashed);
  if (requestedRole === "user") {
    user.password = hashed;
  }

  await user.save();
  await OTP.deleteMany({ email: normalizedEmail, role: requestedRole, purpose: "reset_password" });

  return { msg: "Password reset successful" };
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
