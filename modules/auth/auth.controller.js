// modules/auth/auth.controller.js
import * as authService from "./auth.service.js";
import { inferApproxLocation } from "../../common/services/location.service.js";

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000
});

const sendError = (res, error) => {
  res.status(error.statusCode || 400).json({ msg: error.message || "Something went wrong" });
};

export const register = async (req, res) => {
  try {
    const approxLocation = await inferApproxLocation(req);
    const data = await authService.register(req.body, approxLocation);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const data = await authService.verifyOTP(req.body);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const resendOTP = async (req, res) => {
  try {
    const data = await authService.resendOTP(req.body);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const login = async (req, res) => {
  try {
    const data = await authService.login(req.body);
    res.cookie("refreshToken", data.refreshToken, getRefreshCookieOptions());

    const response = {
      accessToken: data.accessToken,
      role: data.role,
      roles: data.roles,
      hasPhone: data.hasPhone,
    };

    res.json(response);
  } catch (error) {
    sendError(res, error);
  }
};

export const refreshToken = async (req, res) => {
  try {
    const refreshTokenFromCookie = req.cookies?.refreshToken;
    const refreshTokenFromBody = req.body?.refreshToken;

    const data = await authService.refreshAccessToken({
      refreshToken: refreshTokenFromCookie || refreshTokenFromBody
    });

    res.cookie("refreshToken", data.refreshToken, getRefreshCookieOptions());

    res.json({
      accessToken: data.accessToken,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const logout = async (req, res) => {
  try {
    const refreshTokenFromCookie = req.cookies?.refreshToken;

    const data = await authService.logout({
      refreshToken: refreshTokenFromCookie
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });

    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const googleAuth = async (req, res) => {
  try {
    const approxLocation = await inferApproxLocation(req);
    const data = await authService.googleAuth(req.body, approxLocation);
    res.cookie("refreshToken", data.refreshToken, getRefreshCookieOptions());
    res.json({
      accessToken: data.accessToken,
      role: data.role,
      roles: data.roles,
      hasPhone: data.hasPhone,
      phone: data.phone,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const createRolePassword = async (req, res) => {
  try {
    const role = req.body?.role || req.selectedRole;
    const data = await authService.createRolePassword({
      userId: req.user?._id,
      role,
      password: req.body?.password,
    });
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const requestPasswordResetOtp = async (req, res) => {
  try {
    const data = await authService.requestPasswordResetOtp(req.body);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const resetPasswordWithOtp = async (req, res) => {
  try {
    const data = await authService.resetPasswordWithOtp(req.body);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};
