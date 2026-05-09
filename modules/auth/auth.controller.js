// modules/auth/auth.controller.js
import * as authService from "./auth.service.js";

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000
});

export const register = async (req, res) => {
  const data = await authService.register(req.body);
  res.json(data);
};

export const verifyOTP = async (req, res) => {
  const data = await authService.verifyOTP(req.body);
  res.json(data);
};

export const login = async (req, res) => {
  const data = await authService.login(req.body);
  res.cookie("refreshToken", data.refreshToken, getRefreshCookieOptions());

  const response = {
    accessToken: data.accessToken,
    role: data.role,
    roles: data.roles,
    expiresIn: data.expiresIn
  };

  res.json(response);
};

export const adminLogin = async (req, res) => {
  const data = await authService.adminLogin(req.body);
  res.cookie("refreshToken", data.refreshToken, getRefreshCookieOptions());

  const response = {
    accessToken: data.accessToken,
    role: data.role,
    expiresIn: data.expiresIn
  };

  res.json(response);
};

export const refreshToken = async (req, res) => {
  const refreshTokenFromCookie = req.cookies?.refreshToken;
  const refreshTokenFromBody = req.body?.refreshToken;

  const data = await authService.refreshAccessToken({
    refreshToken: refreshTokenFromCookie || refreshTokenFromBody
  });

  res.cookie("refreshToken", data.refreshToken, getRefreshCookieOptions());

  res.json({
    accessToken: data.accessToken,
    expiresIn: data.expiresIn
  });
};

export const logout = async (req, res) => {
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
};