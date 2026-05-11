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

export const login = async (req, res) => {
  try {
    const data = await authService.login(req.body);
    res.cookie("refreshToken", data.refreshToken, getRefreshCookieOptions());

    const response = {
      accessToken: data.accessToken,
      role: data.role,
      roles: data.roles,
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
    const refreshTokenFromBody = req.body?.refreshToken;

    const data = await authService.logout({
      refreshToken: refreshTokenFromCookie || refreshTokenFromBody
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
